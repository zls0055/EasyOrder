
'use server';
import { db } from '@/lib/firebase';
import { AppSettings, AppSettingsSchema, Dish, DishSchema, Restaurant, RestaurantSchema, PointLog, PointLogSchema, PointCardSchema, PointCard, RechargeLogSchema, RechargeLog } from '@/types';
import { initialDishes } from '@/lib/data';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, query, orderBy, deleteDoc, updateDoc, Timestamp, increment, runTransaction, limit, where } from 'firebase/firestore';
import { unstable_cache as cache, revalidateTag } from 'next/cache';


const RESTAURANTS_COLLECTION = 'restaurants';
const SETTINGS_COLLECTION = 'settings';
const CONFIG_DOC_ID = 'app-config';
const DISHES_COLLECTION = 'dishes';
const ORDERS_COLLECTION = 'orders';
const POINT_LOGS_COLLECTION = 'pointLogs';
const POINT_CARDS_COLLECTION = 'pointCards';
const RECHARGE_LOGS_COLLECTION = 'rechargeLogs';


export async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
    if (!restaurantId) return null;
    try {
        const restaurantDocRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
        const docSnap = await getDoc(restaurantDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
             if (data.createdAt instanceof Timestamp) {
                data.createdAt = data.createdAt.toDate().toISOString();
            }
            const parsed = RestaurantSchema.safeParse(data);
            if (parsed.success) {
                return parsed.data;
            }
            console.warn(`Restaurant data for ${restaurantId} is invalid:`, parsed.error);
            return null;
        }
        console.warn(`Restaurant with ID ${restaurantId} not found.`);
        return null;
    } catch (error) {
        console.error(`Error fetching restaurant ${restaurantId}:`, error);
        return null;
    }
}

export async function getRestaurants(): Promise<Restaurant[]> {
    const restaurantsRef = collection(db, RESTAURANTS_COLLECTION);
    const q = query(restaurantsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        return [];
    }
    
    const restaurants = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.createdAt instanceof Timestamp) {
            data.createdAt = data.createdAt.toDate().toISOString();
        }
        const parsed = RestaurantSchema.safeParse(data);
        if (parsed.success) {
            return parsed.data;
        }
        console.warn(`Skipping invalid restaurant document (ID: ${doc.id}):`, parsed.error);
        return null;
    }).filter((r): r is Restaurant => r !== null);


    return restaurants;
}

export async function addRestaurant(name: string): Promise<Restaurant> {
    const newDocRef = doc(collection(db, RESTAURANTS_COLLECTION));
    
    const newRestaurant: Restaurant = {
        id: newDocRef.id,
        name: name,
        createdAt: new Date().toISOString(),
        points: 1000,
    };
    
    const batch = writeBatch(db);

    batch.set(newDocRef, { ...newRestaurant, createdAt: Timestamp.fromDate(new Date(newRestaurant.createdAt!)) });

    const settingsRef = doc(db, RESTAURANTS_COLLECTION, newRestaurant.id, SETTINGS_COLLECTION, CONFIG_DOC_ID);
    const defaultSettings = AppSettingsSchema.parse({});
    batch.set(settingsRef, defaultSettings);
    
    const placeholderData = { initialized: true, at: Timestamp.now() };
    batch.set(doc(newDocRef, DISHES_COLLECTION, '.placeholder'), placeholderData);
    batch.set(doc(newDocRef, ORDERS_COLLECTION, '.placeholder'), placeholderData);
    batch.set(doc(newDocRef, POINT_LOGS_COLLECTION, '.placeholder'), placeholderData);
    batch.set(doc(newDocRef, RECHARGE_LOGS_COLLECTION, '.placeholder'), placeholderData);

    await batch.commit();

    revalidateTag('restaurants');
    return newRestaurant;
}


async function deleteSubcollection(collectionRef: any) {
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size === 0) {
        return;
    }
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

export async function deleteRestaurant(restaurantId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const restaurantDocRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);

        await deleteSubcollection(collection(restaurantDocRef, DISHES_COLLECTION));
        await deleteSubcollection(collection(restaurantDocRef, SETTINGS_COLLECTION));
        await deleteSubcollection(collection(restaurantDocRef, ORDERS_COLLECTION));
        await deleteSubcollection(collection(restaurantDocRef, POINT_LOGS_COLLECTION));
        await deleteSubcollection(collection(restaurantDocRef, RECHARGE_LOGS_COLLECTION));

        await deleteDoc(restaurantDocRef);

        revalidateTag('restaurants');
        revalidateTag(`settings-${restaurantId}`);
        revalidateTag(`dishes-${restaurantId}`);
        revalidateTag(`restaurant-${restaurantId}`);
        revalidateTag(`pointLogs-${restaurantId}`);
        revalidateTag(`rechargeLogs-${restaurantId}`);
        return { success: true };
    } catch (e) {
        console.error(`Failed to delete restaurant ${restaurantId}:`, e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function updateRestaurantName(restaurantId: string, newName: string): Promise<{ success: boolean; error?: string }> {
    if (!newName.trim()) {
        return { success: false, error: "餐馆名称不能为空。" };
    }
    try {
        const restaurantDocRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
        await updateDoc(restaurantDocRef, { name: newName });

        revalidateTag('restaurants');
        revalidateTag(`restaurant-${restaurantId}`);
        return { success: true };
    } catch (e) {
        console.error(`Failed to update restaurant name for ${restaurantId}:`, e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function rechargePoints(restaurantId: string, amount: number): Promise<{ success: boolean; error?: string, updatedRestaurant?: Restaurant }> {
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: "充值点数必须是一个正数。" };
  }
  try {
    const restaurantRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
    await updateDoc(restaurantRef, {
      points: increment(amount),
    });
    revalidateTag('restaurants');
    revalidateTag(`restaurant-${restaurantId}`);
    
    const updatedDoc = await getDoc(restaurantRef);
    if (!updatedDoc.exists()) {
        return { success: false, error: "充值后无法找到该餐馆信息。" };
    }
    
    const updatedData = updatedDoc.data();
    if (updatedData.createdAt instanceof Timestamp) {
        updatedData.createdAt = updatedData.createdAt.toDate().toISOString();
    }
    const updatedRestaurant = RestaurantSchema.parse(updatedData);

    return { success: true, updatedRestaurant };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return { success: false, error: `充值失败: ${errorMessage}` };
  }
}

export async function clearRestaurantData(restaurantId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const restaurantDocRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
        const batch = writeBatch(db);

        await deleteSubcollection(collection(restaurantDocRef, DISHES_COLLECTION));
        await deleteSubcollection(collection(restaurantDocRef, ORDERS_COLLECTION));
        await deleteSubcollection(collection(restaurantDocRef, POINT_LOGS_COLLECTION));
        await deleteSubcollection(collection(restaurantDocRef, RECHARGE_LOGS_COLLECTION));

        const settingsRef = doc(restaurantDocRef, SETTINGS_COLLECTION, CONFIG_DOC_ID);
        const defaultSettings = AppSettingsSchema.parse({});
        batch.set(settingsRef, defaultSettings);

        const placeholderData = { initialized: true, at: Timestamp.now() };
        batch.set(doc(restaurantDocRef, DISHES_COLLECTION, '.placeholder'), placeholderData);
        batch.set(doc(restaurantDocRef, ORDERS_COLLECTION, '.placeholder'), placeholderData);
        batch.set(doc(restaurantDocRef, POINT_LOGS_COLLECTION, '.placeholder'), placeholderData);
        batch.set(doc(restaurantDocRef, RECHARGE_LOGS_COLLECTION, '.placeholder'), placeholderData);
        
        await batch.commit();

        revalidateTag(`settings-${restaurantId}`);
        revalidateTag(`dishes-${restaurantId}`);
        revalidateTag(`pointLogs-${restaurantId}`);
        revalidateTag(`rechargeLogs-${restaurantId}`);
        return { success: true };
    } catch (e) {
        console.error(`Failed to clear data for restaurant ${restaurantId}:`, e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}


export async function getSettings(restaurantId: string): Promise<AppSettings> {
  if (!restaurantId) return AppSettingsSchema.parse({});
  try {
    const settingsRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, SETTINGS_COLLECTION, CONFIG_DOC_ID);
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      const settingsData = docSnap.data();
      const parsedSettings = AppSettingsSchema.safeParse(settingsData);
      if (parsedSettings.success) {
        return parsedSettings.data;
      } else {
        console.warn("Firestore settings are invalid, merging with defaults:", parsedSettings.error);
        const defaultSettings = AppSettingsSchema.parse({});
        const mergedSettings = { ...defaultSettings, ...settingsData };
        return AppSettingsSchema.parse(mergedSettings);
      }
    } else {
      console.log(`Settings for restaurant ${restaurantId} not found, returning defaults.`);
      return AppSettingsSchema.parse({});
    }
  } catch(error) {
      console.error(`[getSettings] Error fetching settings for ${restaurantId}, returning defaults. Error: ${error}`);
      return AppSettingsSchema.parse({});
  }
}

export async function getDishes(restaurantId: string): Promise<Dish[]> {
    if (!restaurantId) return [];
    try {
        const dishesRef = collection(db, RESTAURANTS_COLLECTION, restaurantId, DISHES_COLLECTION);
        const dishesSnapshot = await getDocs(dishesRef);

        if (dishesSnapshot.empty) {
            return [];
        }

        const dishes = dishesSnapshot.docs
            .map(doc => {
                const parsed = DishSchema.safeParse(doc.data());
                if (parsed.success) return parsed.data;
                console.warn(`Skipping invalid dish document (ID: ${doc.id}):`, parsed.error);
                return null;
            })
            .filter((d): d is Dish => d !== null);
        
        return dishes.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.name.localeCompare(b.name, 'zh-Hans-CN');
        });

    } catch(error) {
        console.error(`[getDishes] Error fetching or seeding dishes for ${restaurantId}, returning empty array. Error: ${error}`);
        return [];
    }
}

export async function getPointLogs(restaurantId: string): Promise<PointLog[]> {
    if (!restaurantId) return [];
    try {
        const logsRef = collection(db, RESTAURANTS_COLLECTION, restaurantId, POINT_LOGS_COLLECTION);
        const q = query(logsRef, orderBy('__name__', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return [];
        }

        const logs = snapshot.docs
            .map(doc => {
                if (doc.id === '.placeholder') return null;
                
                const data = doc.data();
                const dataToParse = {
                    date: doc.id,
                    count: data.count,
                };

                const parsed = PointLogSchema.safeParse(dataToParse);
                if(parsed.success) return parsed.data;
                
                console.warn(`[getPointLogs][${restaurantId}]   -> Skipping invalid point log document. Zod error:`, parsed.error);
                return null;
            })
            .filter((log): log is PointLog => log !== null);
        
        return logs;

    } catch (error) {
        console.error(`[getPointLogs][${restaurantId}] Error fetching point logs:`, error);
        return [];
    }
}

export async function createPointCards(amount: number, points: number): Promise<void> {
    const batch = writeBatch(db);
    const cardsCollectionRef = collection(db, POINT_CARDS_COLLECTION);

    for (let i = 0; i < amount; i++) {
        const newCardRef = doc(cardsCollectionRef);
        const cardData: PointCard = {
            id: newCardRef.id,
            points,
            createdAt: new Date().toISOString(),
            status: 'new',
            usedBy: null,
            usedAt: null,
        };
        batch.set(newCardRef, cardData);
    }
    await batch.commit();
    revalidateTag('pointCards');
}

export async function getPointCards(): Promise<PointCard[]> {
    const cardsRef = collection(db, POINT_CARDS_COLLECTION);
    const q = query(cardsRef, where('status', '==', 'new'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => PointCardSchema.parse(doc.data()));
}

export async function getUsedPointCards(): Promise<PointCard[]> {
    const cardsRef = collection(db, POINT_CARDS_COLLECTION);
    const q = query(cardsRef, where('status', '==', 'used'), orderBy('usedAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    
    const cards = snapshot.docs.map(doc => {
        const parsed = PointCardSchema.safeParse(doc.data());
        if (parsed.success) {
            return parsed.data;
        }
        console.warn(`Skipping invalid used point card document (ID: ${doc.id}):`, parsed.error);
        return null;
    }).filter((c): c is PointCard => c !== null);

    return cards;
}

export async function deletePointCard(cardId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const cardRef = doc(db, POINT_CARDS_COLLECTION, cardId);
        const cardDoc = await getDoc(cardRef);

        if (!cardDoc.exists()) {
            return { success: false, error: "点卡不存在。" };
        }

        const card = PointCardSchema.parse(cardDoc.data());
        if (card.status === 'used') {
            return { success: false, error: "不能删除已使用的点卡。" };
        }

        await deleteDoc(cardRef);
        revalidateTag('pointCards');
        return { success: true };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        console.error(`Failed to delete point card ${cardId}:`, e);
        return { success: false, error: errorMessage };
    }
}

export async function redeemPointCard(cardId: string, restaurantId: string): Promise<void> {
    const cardRef = doc(db, POINT_CARDS_COLLECTION, cardId);
    const restaurantRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
    const rechargeLogRef = doc(collection(restaurantRef, RECHARGE_LOGS_COLLECTION));

    try {
        await runTransaction(db, async (transaction) => {
            const cardDoc = await transaction.get(cardRef);

            if (!cardDoc.exists()) {
                throw new Error("点卡代码无效或不存在。");
            }
            const card = PointCardSchema.parse(cardDoc.data());
            if (card.status === 'used') {
                throw new Error(`此点卡已被餐馆 ${card.usedBy} 于 ${new Date(card.usedAt!).toLocaleString()} 使用。`);
            }
            
            // 1. Update restaurant points
            transaction.update(restaurantRef, { points: increment(card.points) });

            // 2. Mark card as used
            transaction.update(cardRef, {
                status: 'used',
                usedBy: restaurantId,
                usedAt: new Date().toISOString(),
            });

            // 3. Create a recharge log
            const logData: RechargeLog = {
                id: rechargeLogRef.id,
                cardId: card.id,
                pointsAdded: card.points,
                rechargedAt: new Date().toISOString(),
                restaurantId: restaurantId,
            };
            transaction.set(rechargeLogRef, logData);
        });
    } catch (error) {
        console.error(`Failed to redeem point card ${cardId} for restaurant ${restaurantId}:`, error);
        // Re-throw the original error to be caught by the server action
        throw error;
    }
}

export async function getRechargeLogs(restaurantId: string): Promise<RechargeLog[]> {
    if (!restaurantId) return [];
    const logsRef = collection(db, RESTAURANTS_COLLECTION, restaurantId, RECHARGE_LOGS_COLLECTION);
    const q = query(logsRef, orderBy('rechargedAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => RechargeLogSchema.parse(doc.data()));
}

export const getCachedSettings = async (restaurantId: string) => cache(
  async () => getSettings(restaurantId),
  ['settings', restaurantId],
  {
    tags: [`settings-${restaurantId}`],
    revalidate: 3600
  }
)();

export const getCachedDishes = async (restaurantId: string) => cache(
  async () => getDishes(restaurantId),
  ['dishes', restaurantId],
  {
    tags: [`dishes-${restaurantId}`],
    revalidate: 3600
  }
)();

export const getCachedRestaurants = async () => cache(
  async () => getRestaurants(),
  ['restaurants'],
  { tags: ['restaurants'], revalidate: 3600 }
)();

export const getCachedRestaurant = async (restaurantId: string) => cache(
  async () => getRestaurant(restaurantId),
  ['restaurant', restaurantId],
  {
    tags: [`restaurant-${restaurantId}`],
    revalidate: 3600
  }
)();

export const getCachedPointLogs = async (restaurantId: string) => cache(
  async () => getPointLogs(restaurantId),
  ['pointLogs', restaurantId],
  {
    tags: [`pointLogs-${restaurantId}`],
    revalidate: 3600
  }
)();
    


'use server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { AppSettings, AppSettingsSchema, Dish, DishSchema, Restaurant, RestaurantSchema, PointLog, PointLogSchema, PointCardSchema, PointCard, RechargeLogSchema, RechargeLog, DishOrderLog, DishOrderLogSchema } from '@/types';
import { unstable_cache as cache, revalidateTag } from 'next/cache';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';


const RESTAURANTS_COLLECTION = 'restaurants';
const SETTINGS_COLLECTION = 'settings';
const CONFIG_DOC_ID = 'app-config';
const DISHES_COLLECTION = 'dishes';
const ORDERS_COLLECTION = 'orders';
const POINT_LOGS_COLLECTION = 'pointLogs';
const DISH_ORDER_LOGS_COLLECTION = 'dishOrderLogs';
const POINT_CARDS_COLLECTION = 'pointCards';
const RECHARGE_LOGS_COLLECTION = 'rechargeLogs';


export async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
    if (!restaurantId) return null;
    try {
        const { db: adminDb } = getFirebaseAdmin();
        const restaurantDocRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId);
        const docSnap = await restaurantDocRef.get();
        if (docSnap.exists) {
            const data = docSnap.data()!;
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
    const { db: adminDb } = getFirebaseAdmin();
    const restaurantsRef = adminDb.collection(RESTAURANTS_COLLECTION);
    const q = restaurantsRef.orderBy('createdAt', 'desc');
    const snapshot = await q.get();
    
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
    const { db: adminDb } = getFirebaseAdmin();
    const newDocRef = adminDb.collection(RESTAURANTS_COLLECTION).doc();
    
    const newRestaurant: Restaurant = {
        id: newDocRef.id,
        name: name,
        createdAt: new Date().toISOString(),
        points: 1000,
    };
    
    const batch = adminDb.batch();

    batch.set(newDocRef, { ...newRestaurant, createdAt: Timestamp.fromDate(new Date(newRestaurant.createdAt!)) });

    const settingsRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(newRestaurant.id).collection(SETTINGS_COLLECTION).doc(CONFIG_DOC_ID);
    const defaultSettings = AppSettingsSchema.parse({});
    batch.set(settingsRef, defaultSettings);
    
    const placeholderData = { initialized: true, at: Timestamp.now() };
    batch.set(newDocRef.collection(DISHES_COLLECTION).doc('.placeholder'), placeholderData);
    batch.set(newDocRef.collection(ORDERS_COLLECTION).doc('.placeholder'), placeholderData);
    batch.set(newDocRef.collection(POINT_LOGS_COLLECTION).doc('.placeholder'), placeholderData);
    batch.set(newDocRef.collection(RECHARGE_LOGS_COLLECTION).doc('.placeholder'), placeholderData);
    batch.set(newDocRef.collection(DISH_ORDER_LOGS_COLLECTION).doc('.placeholder'), placeholderData);


    await batch.commit();

    revalidateTag('restaurants');
    return newRestaurant;
}


async function deleteSubcollection(collectionRef: FirebaseFirestore.CollectionReference) {
    const { db: adminDb } = getFirebaseAdmin();
    const snapshot = await collectionRef.limit(100).get();
    if (snapshot.size === 0) {
        return;
    }
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Recurse until the collection is empty
    if (snapshot.size > 0) {
      await deleteSubcollection(collectionRef);
    }
}

export async function deleteRestaurant(restaurantId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { db: adminDb } = getFirebaseAdmin();
        const restaurantDocRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId);

        await deleteSubcollection(restaurantDocRef.collection(DISHES_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(SETTINGS_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(ORDERS_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(POINT_LOGS_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(RECHARGE_LOGS_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(DISH_ORDER_LOGS_COLLECTION));


        await restaurantDocRef.delete();

        revalidateTag('restaurants');
        revalidateTag(`settings-${restaurantId}`);
        revalidateTag(`dishes-${restaurantId}`);
        revalidateTag(`restaurant-${restaurantId}`);
        revalidateTag(`pointLogs-${restaurantId}`);
        revalidateTag(`rechargeLogs-${restaurantId}`);
        revalidateTag(`dishOrderLogs-${restaurantId}`);
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
        const { db: adminDb } = getFirebaseAdmin();
        const restaurantDocRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId);
        await restaurantDocRef.update({ name: newName });

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
    const { db: adminDb } = getFirebaseAdmin();
    const restaurantRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId);
    await restaurantRef.update({
      points: FieldValue.increment(amount),
    });
    revalidateTag('restaurants');
    revalidateTag(`restaurant-${restaurantId}`);
    
    const updatedDoc = await restaurantRef.get();
    if (!updatedDoc.exists) {
        return { success: false, error: "充值后无法找到该餐馆信息。" };
    }
    
    const updatedData = updatedDoc.data()!;
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
        const { db: adminDb } = getFirebaseAdmin();
        const restaurantDocRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId);
        const batch = adminDb.batch();

        await deleteSubcollection(restaurantDocRef.collection(DISHES_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(ORDERS_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(POINT_LOGS_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(RECHARGE_LOGS_COLLECTION));
        await deleteSubcollection(restaurantDocRef.collection(DISH_ORDER_LOGS_COLLECTION));


        const settingsRef = restaurantDocRef.collection(SETTINGS_COLLECTION).doc(CONFIG_DOC_ID);
        const defaultSettings = AppSettingsSchema.parse({});
        batch.set(settingsRef, defaultSettings);

        const placeholderData = { initialized: true, at: Timestamp.now() };
        batch.set(restaurantDocRef.collection(DISHES_COLLECTION).doc('.placeholder'), placeholderData);
        batch.set(restaurantDocRef.collection(ORDERS_COLLECTION).doc('.placeholder'), placeholderData);
        batch.set(restaurantDocRef.collection(POINT_LOGS_COLLECTION).doc('.placeholder'), placeholderData);
        batch.set(restaurantDocRef.collection(RECHARGE_LOGS_COLLECTION).doc('.placeholder'), placeholderData);
        batch.set(restaurantDocRef.collection(DISH_ORDER_LOGS_COLLECTION).doc('.placeholder'), placeholderData);
        
        await batch.commit();

        revalidateTag(`settings-${restaurantId}`);
        revalidateTag(`dishes-${restaurantId}`);
        revalidateTag(`pointLogs-${restaurantId}`);
        revalidateTag(`rechargeLogs-${restaurantId}`);
        revalidateTag(`dishOrderLogs-${restaurantId}`);
        return { success: true };
    } catch (e) {
        console.error(`Failed to clear data for restaurant ${restaurantId}:`, e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}


export async function getSettings(restaurantId: string): Promise<AppSettings> {
  console.log(`[getSettings] Attempting to fetch settings for restaurant: ${restaurantId}`);
  if (!restaurantId) {
    console.warn("[getSettings] No restaurantId provided. Returning default settings.");
    return AppSettingsSchema.parse({});
  }
  try {
    const { db: adminDb } = getFirebaseAdmin();
    const settingsRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(SETTINGS_COLLECTION).doc(CONFIG_DOC_ID);
    const docSnap = await settingsRef.get();

    if (docSnap.exists) {
      const settingsData = docSnap.data();
      const parsedSettings = AppSettingsSchema.safeParse(settingsData);
      if (parsedSettings.success) {
        console.log(`[getSettings] Successfully fetched and parsed settings for ${restaurantId}.`);
        return parsedSettings.data;
      } else {
        console.warn(`[getSettings] Firestore settings for ${restaurantId} are invalid, merging with defaults. Error:`, parsedSettings.error);
        const defaultSettings = AppSettingsSchema.parse({});
        const mergedSettings = { ...defaultSettings, ...settingsData };
        return AppSettingsSchema.parse(mergedSettings);
      }
    } else {
      console.log(`[getSettings] Settings for restaurant ${restaurantId} not found, returning defaults.`);
      return AppSettingsSchema.parse({});
    }
  } catch(error) {
      console.error(`[getSettings] Error fetching settings for ${restaurantId}, returning defaults. Error:`, error);
      return AppSettingsSchema.parse({});
  }
}

export async function getDishes(restaurantId: string): Promise<Dish[]> {
    console.log(`[getDishes] Attempting to fetch dishes for restaurant: ${restaurantId}`);
    if (!restaurantId) {
        console.warn("[getDishes] No restaurantId provided. Returning empty array.");
        return [];
    }
    try {
        const { db: adminDb } = getFirebaseAdmin();
        const dishesRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(DISHES_COLLECTION);
        const dishesSnapshot = await dishesRef.get();

        if (dishesSnapshot.empty) {
            console.log(`[getDishes] No dishes found for ${restaurantId}. Returning empty array.`);
            return [];
        }

        const dishes = dishesSnapshot.docs
            .map(doc => {
                const parsed = DishSchema.safeParse(doc.data());
                if (parsed.success) return parsed.data;
                console.warn(`[getDishes] Skipping invalid dish document (ID: ${doc.id}):`, parsed.error);
                return null;
            })
            .filter((d): d is Dish => d !== null);
        
        console.log(`[getDishes] Successfully fetched and parsed ${dishes.length} dishes for ${restaurantId}.`);
        return dishes.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.name.localeCompare(b.name, 'zh-Hans-CN');
        });

    } catch(error) {
        console.error(`[getDishes] Error fetching dishes for ${restaurantId}, returning empty array. Error:`, error);
        return [];
    }
}

export async function getPointLogs(restaurantId: string): Promise<PointLog[]> {
    if (!restaurantId) return [];
    try {
        const { db: adminDb } = getFirebaseAdmin();
        const logsRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(POINT_LOGS_COLLECTION);
        const q = logsRef.orderBy('__name__', 'desc');
        const snapshot = await q.get();

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

export async function getDishOrderLogs(restaurantId: string): Promise<DishOrderLog[]> {
    if (!restaurantId) return [];
    console.log(`[getDishOrderLogs] Fetching for restaurant: ${restaurantId}`);
    try {
        const { db: adminDb } = getFirebaseAdmin();
        const logsRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(DISH_ORDER_LOGS_COLLECTION);
        const q = logsRef.orderBy('__name__', 'desc');
        const snapshot = await q.get();

        if (snapshot.empty) {
            console.log(`[getDishOrderLogs][${restaurantId}] No logs found (collection is empty).`);
            return [];
        }
        console.log(`[getDishOrderLogs][${restaurantId}] Found ${snapshot.docs.length} documents.`);

        const logs = snapshot.docs
            .map(doc => {
                if (doc.id === '.placeholder') return null;
                const data = doc.data();
                const dataToParse = { date: doc.id, counts: data.counts || {} };
                // console.log(`[getDishOrderLogs][${restaurantId}] Parsing doc ${doc.id}:`, dataToParse);
                const parsed = DishOrderLogSchema.safeParse(dataToParse);
                if (parsed.success) {
                    console.log(`[getDishOrderLogs][${restaurantId}] Successfully parsed doc ${doc.id}`);
                    return parsed.data;
                }
                console.warn(`[getDishOrderLogs][${restaurantId}] -> Skipping invalid log document. Zod error:`, parsed.error);
                return null;
            })
            .filter((log): log is DishOrderLog => log !== null);
        
        console.log(`[getDishOrderLogs][${restaurantId}] Returning ${logs.length} parsed logs.`);
        return logs;

    } catch (error) {
        console.error(`[getDishOrderLogs][${restaurantId}] Error fetching dish order logs:`, error);
        return [];
    }
}

export async function createPointCards(amount: number, points: number): Promise<void> {
    const { db: adminDb } = getFirebaseAdmin();
    const batch = adminDb.batch();
    const cardsCollectionRef = adminDb.collection(POINT_CARDS_COLLECTION);

    for (let i = 0; i < amount; i++) {
        const newCardRef = cardsCollectionRef.doc();
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
    const { db: adminDb } = getFirebaseAdmin();
    const cardsRef = adminDb.collection(POINT_CARDS_COLLECTION);
    const q = cardsRef.where('status', '==', 'new').orderBy('createdAt', 'desc');
    const snapshot = await q.get();
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => PointCardSchema.parse(doc.data()));
}

export async function getUsedPointCards(): Promise<PointCard[]> {
    const { db: adminDb } = getFirebaseAdmin();
    const cardsRef = adminDb.collection(POINT_CARDS_COLLECTION);
    const q = cardsRef.where('status', '==', 'used').orderBy('usedAt', 'desc').limit(50);
    const snapshot = await q.get();
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
        const { db: adminDb } = getFirebaseAdmin();
        const cardRef = adminDb.collection(POINT_CARDS_COLLECTION).doc(cardId);
        const cardDoc = await cardRef.get();

        if (!cardDoc.exists) {
            return { success: false, error: "点卡不存在。" };
        }

        const card = PointCardSchema.parse(cardDoc.data());
        if (card.status === 'used') {
            return { success: false, error: "不能删除已使用的点卡。" };
        }

        await cardRef.delete();
        revalidateTag('pointCards');
        return { success: true };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        console.error(`Failed to delete point card ${cardId}:`, e);
        return { success: false, error: errorMessage };
    }
}

export async function redeemPointCard(cardId: string, restaurantId: string): Promise<void> {
    const { db: adminDb } = getFirebaseAdmin();
    const cardRef = adminDb.collection(POINT_CARDS_COLLECTION).doc(cardId);
    const restaurantRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId);
    const rechargeLogRef = restaurantRef.collection(RECHARGE_LOGS_COLLECTION).doc();

    try {
        await adminDb.runTransaction(async (transaction) => {
            const cardDoc = await transaction.get(cardRef);

            if (!cardDoc.exists) {
                throw new Error("点卡代码无效或不存在。");
            }
            const card = PointCardSchema.parse(cardDoc.data());
            if (card.status === 'used') {
                throw new Error(`此点卡已被餐馆 ${card.usedBy} 于 ${new Date(card.usedAt!).toLocaleString()} 使用。`);
            }
            
            // 1. Update restaurant points
            transaction.update(restaurantRef, { points: FieldValue.increment(card.points) });

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
    const { db: adminDb } = getFirebaseAdmin();
    const logsRef = adminDb.collection(RESTAURANTS_COLLECTION).doc(restaurantId).collection(RECHARGE_LOGS_COLLECTION);
    const q = logsRef.orderBy('rechargedAt', 'desc').limit(50);
    const snapshot = await q.get();
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

export const getCachedDishOrderLogs = async (restaurantId: string) => cache(
  async () => getDishOrderLogs(restaurantId),
  ['dishOrderLogs', restaurantId],
  {
    tags: [`dishOrderLogs-${restaurantId}`],
    revalidate: 3600
  }
)();
    

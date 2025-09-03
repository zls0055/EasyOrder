
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { revalidatePath, revalidateTag } from 'next/cache';
import { AppSettings, AppSettingsSchema, Dish, DishSchema } from '@/types';
import { getSettings, redeemPointCard as redeemCardService, addRestaurant as addRestaurantService } from '@/lib/settings';
import { logout } from '@/lib/session';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDoc, runTransaction } from 'firebase/firestore';


const RESTAURANTS_COLLECTION = 'restaurants';
const DISHES_COLLECTION = 'dishes';
const SETTINGS_COLLECTION = 'settings';
const CONFIG_DOC_ID = 'app-config';
const RECHARGE_LOGS_COLLECTION = 'rechargeLogs';

const formWithRestaurantId = z.object({
  restaurantId: z.string().min(1),
});

const dishFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '菜品名称不能为空'),
  price: z.coerce.number({invalid_type_error: "价格必须是数字"}).min(0.01, '价格必须大于0'),
  category: z.string().min(1, '菜品分类不能为空'),
  sortOrder: z.coerce.number({invalid_type_error: "排序值必须是数字"}).default(0),
}).merge(formWithRestaurantId);

const passwordSchema = z.object({
    currentPassword: z.string().min(1, '请输入当前密码。'),
    newPassword: z.string().min(6, '新密码长度不能少于6位。'),
    confirmPassword: z.string(),
    adminUsername: z.string().optional(),
}).merge(formWithRestaurantId).refine(data => data.newPassword === data.confirmPassword, {
    message: "两次输入的新密码不匹配。",
    path: ["confirmPassword"],
});


const settingsUpdateSchema = AppSettingsSchema.partial().omit({ 
    id: true, 
    adminPassword: true, 
    categoryOrder: true, 
    orderFetchMode: true, 
    orderPullIntervalSeconds: true,
    syncOrderCount: true,
    showKitchenLayoutSwitch: true,
    featureVisibility: true, // This will be handled by the sync settings action
}).merge(formWithRestaurantId).extend({
    kitchenDisplayPassword: z.string().optional() // Allow it to be optional or empty
});

const categoryOrderSchema = z.object({
  categoryOrder: z.string().transform(str => str ? str.split(',') : [])
}).merge(formWithRestaurantId);


type ActionState = {
  success?: string | null;
  error?: string | null;
  updatedSettings?: AppSettings | null;
} | null;

export async function addRestaurantAction(prevState: any, formData: FormData): Promise<ActionState> {
    const name = formData.get('name') as string;
    if (name && name.trim()) {
        try {
            await addRestaurantService(name.trim());
            revalidateTag('restaurants');
            return { success: `餐馆 "${name.trim()}" 已成功创建。`, error: null };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            return { error: `创建餐馆失败: ${errorMessage}`, success: null };
        }
    } else {
        return { error: "餐馆名称不能为空。", success: null };
    }
}


export async function addDishAction(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = dishFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const errorSummary = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ');
        return { success: null, error: `表单验证失败: ${errorSummary}` };
    }

    const { restaurantId, name, price, category, sortOrder } = validatedFields.data;
    try {
        const newDocRef = doc(collection(db, RESTAURANTS_COLLECTION, restaurantId, DISHES_COLLECTION));
        const newDish: Dish = { id: newDocRef.id, name, price, category, sortOrder };
        
        await setDoc(newDocRef, newDish);
        revalidateTag(`dishes-${restaurantId}`);
        revalidatePath(`/${restaurantId}/management/dashboard`);
        revalidatePath(`/${restaurantId}`);
        return { success: "新菜品已成功添加。", error: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: null, error: `添加菜品时发生错误: ${errorMessage}` };
    }
}

export async function updateDishAction(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = dishFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const errorSummary = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ');
        return { success: null, error: `表单验证失败: ${errorSummary}` };
    }
    
    const { restaurantId, id, ...dishData } = validatedFields.data;
    if (!id) {
        return { success: null, error: '更新失败：缺少菜品ID。' };
    }

    try {
        const docRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, DISHES_COLLECTION, id);
        await updateDoc(docRef, dishData);
        revalidateTag(`dishes-${restaurantId}`);
        revalidatePath(`/${restaurantId}/management/dashboard`);
        revalidatePath(`/${restaurantId}`);
        return { success: "菜品信息已成功更新。", error: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: null, error: `更新菜品时发生错误: ${errorMessage}` };
    }
}
    
export async function deleteDishAction(prevState: any, formData: FormData): Promise<ActionState> {
    const restaurantId = formData.get('restaurantId') as string;
    const id = formData.get('id') as string;
    if (!id || !restaurantId) {
        return { success: null, error: '删除失败：缺少菜品ID或餐馆ID。' };
    }
    try {
        const docRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, DISHES_COLLECTION, id);
        await deleteDoc(docRef);
        revalidateTag(`dishes-${restaurantId}`);
        revalidatePath(`/${restaurantId}/management/dashboard`);
        revalidatePath(`/${restaurantId}`);
        return { success: "菜品已删除。", error: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: null, error: `删除菜品时发生错误: ${errorMessage}` };
    }
}

export async function updateSettings(prevState: any, formData: FormData): Promise<ActionState> {
    const rawData = Object.fromEntries(formData.entries());
    
    const dataToValidate = {
      ...rawData,
      isRestaurantClosed: rawData.isRestaurantClosed === 'on',
      isOnlineOrderingDisabled: rawData.isOnlineOrderingDisabled === 'on',
    };
    
    const validatedFields = settingsUpdateSchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
        const errorSummary = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ');
        return { success: null, error: `表单验证失败: ${errorSummary}` };
    }

    try {
        const { restaurantId, ...settingsToUpdate } = validatedFields.data;
        const docRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, SETTINGS_COLLECTION, CONFIG_DOC_ID);
        await updateDoc(docRef, settingsToUpdate);
        revalidateTag(`settings-${restaurantId}`);
        revalidatePath(`/${restaurantId}/management/dashboard`);
        revalidatePath(`/${restaurantId}`);
        return { success: "设置已成功更新。", error: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: null, error: `更新设置时发生错误: ${errorMessage}` };
    }
}

const syncSettingsSchema = z.object({
  restaurantId: z.string().min(1),
  orderFetchMode: z.enum(['push', 'pull']),
  orderPullIntervalSeconds: z.coerce.number().int().min(2, "拉取间隔不能少于2秒"),
  syncOrderCount: z.coerce.number().int().min(1, "数量必须大于0"),
  kitchenDisplayPassword: z.string().optional(),
  showKitchenLayoutSwitch: z.boolean(),
  // Feature Visibility
  'featureVisibility.menuManagement': z.boolean(),
  'featureVisibility.categorySort': z.boolean(),
  'featureVisibility.generalSettings': z.boolean(),
  'featureVisibility.pointCardRecharge': z.boolean(),
  'featureVisibility.securitySettings': z.boolean(),
});

export async function updateSyncSettingsAction(prevState: any, formData: FormData): Promise<ActionState> {
    const rawData = Object.fromEntries(formData.entries());
    const dataToValidate = {
        ...rawData,
        showKitchenLayoutSwitch: rawData.showKitchenLayoutSwitch === 'on',
        'featureVisibility.menuManagement': rawData['featureVisibility.menuManagement'] === 'on',
        'featureVisibility.categorySort': rawData['featureVisibility.categorySort'] === 'on',
        'featureVisibility.generalSettings': rawData['featureVisibility.generalSettings'] === 'on',
        'featureVisibility.pointCardRecharge': rawData['featureVisibility.pointCardRecharge'] === 'on',
        'featureVisibility.securitySettings': rawData['featureVisibility.securitySettings'] === 'on',
    };

    const validatedFields = syncSettingsSchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
        const errorSummary = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ');
        return { success: null, error: `表单验证失败: ${errorSummary}` };
    }
    
    const { restaurantId, ...data } = validatedFields.data;
    const settingsToUpdate: Record<string, any> = {
        orderFetchMode: data.orderFetchMode,
        orderPullIntervalSeconds: data.orderPullIntervalSeconds,
        syncOrderCount: data.syncOrderCount,
        showKitchenLayoutSwitch: data.showKitchenLayoutSwitch,
        featureVisibility: {
            menuManagement: data['featureVisibility.menuManagement'],
            categorySort: data['featureVisibility.categorySort'],
            generalSettings: data['featureVisibility.generalSettings'],
            pointCardRecharge: data['featureVisibility.pointCardRecharge'],
            securitySettings: data['featureVisibility.securitySettings'],
        }
    };
    
    if (data.kitchenDisplayPassword !== undefined) {
        settingsToUpdate.kitchenDisplayPassword = data.kitchenDisplayPassword;
    }

    try {
        const docRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, SETTINGS_COLLECTION, CONFIG_DOC_ID);
        await updateDoc(docRef, settingsToUpdate);
        revalidateTag(`settings-${restaurantId}`);
        const updatedSettings = await getSettings(restaurantId);
        return { success: "高级设置已更新。", error: null, updatedSettings };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: null, error: `更新设置时发生错误: ${errorMessage}` };
    }
}

export async function updateCategoryOrderAction(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = categoryOrderSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: null, error: "无效的分类排序数据" };
    }
    
    try {
        const { restaurantId, categoryOrder } = validatedFields.data;
        const docRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, SETTINGS_COLLECTION, CONFIG_DOC_ID);
        await updateDoc(docRef, { categoryOrder: categoryOrder });
        revalidateTag(`settings-${restaurantId}`);
        revalidatePath(`/${restaurantId}/management/dashboard`);
        revalidatePath(`/${restaurantId}`);
        return { success: "分类排序已保存。", error: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: null, error: `更新分类排序时发生错误: ${errorMessage}` };
    }
}

export async function updatePassword(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = passwordSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const errorSummary = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ');
        return { success: null, error: `表单验证失败: ${errorSummary}` };
    }
    
    const { restaurantId, currentPassword, newPassword, adminUsername } = validatedFields.data;

    try {
        const settings = await getSettings(restaurantId);
        if (settings.adminPassword !== currentPassword) {
            return { success: null, error: '当前密码不正确。' };
        }
        
        const settingsToUpdate: Record<string, any> = { adminPassword: newPassword };
        if(adminUsername) {
            settingsToUpdate.adminUsername = adminUsername;
        }

        const docRef = doc(db, RESTAURANTS_COLLECTION, restaurantId, SETTINGS_COLLECTION, CONFIG_DOC_ID);
        await updateDoc(docRef, settingsToUpdate);
        revalidateTag(`settings-${restaurantId}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: null, error: `更新密码时发生错误: ${errorMessage}` };
    }
    
    await logout(restaurantId);
    return { success: "密码已更新", error: null };
}

const dishImportSchema = DishSchema.omit({id: true}).extend({
  id: z.string().optional(),
  new_id: z.string().optional(),
});
const dishesUpdateSchema = z.array(dishImportSchema);
type DishImportData = z.infer<typeof dishImportSchema>;

export async function batchUpdateDishesAction(restaurantId: string, dishes: DishImportData[]): Promise<ActionState> {
  const validatedDishes = dishesUpdateSchema.safeParse(dishes);
  if (!validatedDishes.success) {
    return { success: null, error: `上传的数据格式有误: ${validatedDishes.error.message}` };
  }

  const batch = writeBatch(db);
  const dishesCollectionRef = collection(db, RESTAURANTS_COLLECTION, restaurantId, DISHES_COLLECTION);
  
  for (const dish of validatedDishes.data) {
    const { id, new_id, ...dishData } = dish;

    if (id && new_id) {
      // Logic to rename/remap a dish ID
      const oldDocRef = doc(dishesCollectionRef, id);
      try {
        const oldDocSnap = await getDoc(oldDocRef);
        if (oldDocSnap.exists()) {
          const oldData = oldDocSnap.data();
          const newData = { ...oldData, ...dishData, id: new_id };
          const newDocRef = doc(dishesCollectionRef, new_id);
          batch.set(newDocRef, newData);
          batch.delete(oldDocRef);
        } else {
          // If the old doc doesn't exist, just create the new one
          const newDocRef = doc(dishesCollectionRef, new_id);
          batch.set(newDocRef, { ...dishData, id: new_id });
        }
      } catch (e) {
          return { success: null, error: `读取旧菜品(ID: ${id})时出错: ${e instanceof Error ? e.message : '未知错误'}` };
      }
    } else if (id && !new_id) {
      // Logic to update or create a dish with a specific ID
      const docRef = doc(dishesCollectionRef, id);
      // Use set with merge to create if it doesn't exist, or update if it does.
      batch.set(docRef, { ...dishData, id }, { merge: true });
    } else if (!id && new_id) {
      // Logic to create a new dish with a specific new_id
      const newDocRef = doc(dishesCollectionRef, new_id);
      batch.set(newDocRef, { ...dishData, id: new_id });
    }
  }

  try {
    await batch.commit();
    revalidateTag(`dishes-${restaurantId}`);
    revalidatePath(`/${restaurantId}/management/dashboard`);
    revalidatePath(`/${restaurantId}`);
    return { success: `${validatedDishes.data.length}个菜品已成功处理。`, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: null, error: `批量更新菜品时发生错误: ${errorMessage}` };
  }
}

const redeemPointCardSchema = z.object({
  cardId: z.string().min(1, '点卡代码不能为空。'),
  restaurantId: z.string().min(1),
});

export async function redeemPointCardAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const validatedFields = redeemPointCardSchema.safeParse({
        cardId: formData.get('cardId'),
        restaurantId: formData.get('restaurantId'),
    });

    if (!validatedFields.success) {
        const errorSummary = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ');
        return { success: null, error: `表单验证失败: ${errorSummary}` };
    }

    const { cardId, restaurantId } = validatedFields.data;

    try {
        await redeemCardService(cardId, restaurantId);

        revalidateTag(`restaurant-${restaurantId}`);
        revalidateTag('restaurants');
        revalidateTag(`rechargeLogs-${restaurantId}`);
        revalidateTag('pointCards');

        return { success: "点数已成功添加到您的账户。", error: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: null, error: errorMessage };
    }
}

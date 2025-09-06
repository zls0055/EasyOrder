
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import type { Restaurant, AppSettings } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Input } from './ui/input';
import { Loader2, Save, X } from 'lucide-react';
import { updateSyncSettingsAction } from '@/lib/actions';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { getSettings } from '@/lib/settings';

interface SyncSettingsSheetProps {
  restaurant: Restaurant;
  initialSettings: AppSettings | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsUpdated: () => void;
}

export default function SyncSettingsSheet({
  restaurant,
  initialSettings,
  open,
  onOpenChange,
  onSettingsUpdated,
}: SyncSettingsSheetProps) {
  const [settings, setSettings] = useState<AppSettings | null>(initialSettings);
  const [isDataLoading, setIsDataLoading] = useState(!initialSettings);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && !settings) {
      setIsDataLoading(true);
      getSettings(restaurant.id)
        .then((fetchedSettings) => {
          setSettings(fetchedSettings);
        })
        .catch((error) => {
          console.error("Failed to fetch settings:", error);
          toast.error("获取高级设置失败");
          onOpenChange(false);
        })
        .finally(() => {
          setIsDataLoading(false);
        });
    }
    if (!open) {
        setSettings(null);
    }
  }, [open, restaurant.id, settings, onOpenChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    startTransition(async () => {
      const result = await updateSyncSettingsAction(null, formData);
      if (result?.success) {
        toast.success(`"${restaurant.name}" 的设置已更新。`);
        onSettingsUpdated();
        onOpenChange(false);
      } else if (result?.error) {
        toast.error('更新失败', { description: result.error });
      }
    });
  };

  const featureLabels: Record<keyof AppSettings['featureVisibility'], string> = {
    menuManagement: "菜单管理",
    categorySort: "分类排序",
    dishSalesReport: "菜品销量",
    generalSettings: "通用设置",
    pointCardRecharge: "点卡充值",
    securitySettings: "安全设置",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
         <SheetHeader>
            <SheetTitle>高级设置</SheetTitle>
            <SheetDescription>
                为餐馆 “{restaurant.name}” 配置厨房同步及后台功能模块。
            </SheetDescription>
        </SheetHeader>
        {isDataLoading || !settings ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100%-50px)]">
            <input type="hidden" name="restaurantId" value={restaurant.id} />
            <div className="py-6 space-y-8 flex-1 overflow-y-auto">
                <div className="space-y-4">
                     <Label className="text-base font-semibold">厨房看板设置</Label>
                    <div className="space-y-4 rounded-lg border p-4">
                       <div className="space-y-2">
                          <Label htmlFor="kitchenDisplayPassword">访问密码</Label>
                          <Input
                              id="kitchenDisplayPassword"
                              name="kitchenDisplayPassword"
                              type="text"
                              defaultValue={settings.kitchenDisplayPassword}
                              placeholder="留空则无需密码"
                              disabled={isPending}
                          />
                           <p className="text-xs text-muted-foreground">访问厨房看板页面需要输入的密码。</p>
                      </div>
                      <div className="flex items-center justify-between">
                          <Label htmlFor="showKitchenLayoutSwitch">显示布局切换按钮</Label>
                          <Switch
                              id="showKitchenLayoutSwitch"
                              name="showKitchenLayoutSwitch"
                              defaultChecked={settings.showKitchenLayoutSwitch}
                              disabled={isPending}
                          />
                      </div>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                     <Label className="text-base font-semibold">订单同步模式</Label>
                    <RadioGroup name="orderFetchMode" defaultValue={settings.orderFetchMode} className="space-y-2">
                        <div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="push" id="mode-push" />
                                <Label htmlFor="mode-push" className="font-bold">实时推送 (Push)</Label>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                                订单会实时推送到厨房看板，延迟最低，但可能会消耗更多资源。推荐在网络状况良好的情况下使用。
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pull" id="mode-pull" />
                                <Label htmlFor="mode-pull" className="font-bold">周期性拉取 (Pull)</Label>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                                厨房看板会按固定间隔从服务器拉取最新订单。资源消耗较低，但会有轻微延迟。
                            </p>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-2 pl-6 animate-in fade-in duration-300">
                    <Label htmlFor="interval">拉取间隔 (秒)</Label>
                    <Input
                        id="interval"
                        name="orderPullIntervalSeconds"
                        type="number"
                        defaultValue={settings.orderPullIntervalSeconds}
                        min="2"
                        step="1"
                        disabled={isPending}
                    />
                    <p className="text-xs text-muted-foreground">建议设置为 5-10 秒。设置过低会增加服务器压力。</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="syncOrderCount">同步订单数量</Label>
                     <Input
                        id="syncOrderCount"
                        name="syncOrderCount"
                        type="number"
                        defaultValue={settings.syncOrderCount}
                        min="1"
                        step="1"
                        disabled={isPending}
                    />
                    <p className="text-xs text-muted-foreground">厨房看板一次性加载的最新订单数量。建议设置为 10-50。</p>
                </div>

                <Separator />

                <div className="space-y-4">
                    <Label className="text-base font-semibold">后台功能模块可见性</Label>
                    <p className="text-sm text-muted-foreground">控制此餐馆后台管理界面中可见的功能模块。</p>
                    <div className="space-y-4 rounded-lg border p-4">
                        {(Object.keys(featureLabels) as Array<keyof AppSettings['featureVisibility']>).map((key) => (
                            <div key={key} className="flex items-center justify-between">
                                <Label htmlFor={`feature-${key}`}>{featureLabels[key]}</Label>
                                <Switch
                                    id={`feature-${key}`}
                                    name={`featureVisibility.${key}`}
                                    defaultChecked={settings.featureVisibility[key]}
                                    disabled={isPending}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="ghost" disabled={isPending}>取消</Button>
                </SheetClose>
                <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    保存设置
                </Button>
            </SheetFooter>
          </form>
        )}
         <SheetClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
                <span className="sr-only">关闭</span>
            </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}

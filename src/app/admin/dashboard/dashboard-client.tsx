
'use client';

import React, { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Menu as MenuIcon, University, CreditCard, X as XIcon, Loader2, KeyRound, Save } from 'lucide-react';
import { logoutSuperAdmin, updateSuperAdminPassword } from '@/lib/session';
import RestaurantList from "@/components/restaurant-list";
import PointCardList from "@/components/point-card-list";
import { PointCard, Restaurant } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { getPointCards, getRestaurants, getUsedPointCards } from '@/lib/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function SuperAdminSecurityCard() {
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
            const result = await updateSuperAdminPassword(null, formData);
            if (result?.success) {
                toast.success('密码已更新', { description: '您将登出，请使用新密码重新登录。' });
                // The action handles the logout and redirect
            } else if (result?.error) {
                toast.error('错误', { description: result.error, duration: 3000 });
            }
        });
    };

    return (
        // <Card>
        //     <CardHeader>
        //         <CardTitle>修改超级管理员密码</CardTitle>
        //     </CardHeader>
            <form ref={formRef} onSubmit={handleFormSubmit}>
                {/* <CardContent className="space-y-4"> */}
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">当前密码</Label>
                        <Input id="currentPassword" name="currentPassword" type="password" placeholder="输入当前使用的密码" required disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">新密码</Label>
                        <Input id="newPassword" name="newPassword" type="password" placeholder="输入新密码 (至少6位)" required disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">确认新密码</Label>
                        <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="再次输入新密码" required disabled={isPending} />
                    </div>
                {/* </CardContent> */}
                {/* <CardFooter> */}
                    <div className="space-y-2 pt-2">
                    <Button type="submit" variant="destructive" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        更新密码并登出
                    </Button>
                    </div>
                {/* </CardFooter> */}
            </form>
        // </Card>
    );
}

type ActiveView = 'restaurants' | 'point-cards' | 'security';

const viewConfig: Record<ActiveView, { title: string; component: React.FC<any>; icon: React.ElementType }> = {
  'restaurants': { title: '餐馆管理', component: RestaurantList, icon: University },
  'point-cards': { title: '点卡管理', component: PointCardList, icon: CreditCard },
  'security': { title: '安全设置', component: SuperAdminSecurityCard, icon: KeyRound },
};

function LoadingSkeleton() {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Skeleton className="h-14 mb-6" />
        <div className="grid md:grid-cols-[160px_1fr] gap-6">
          <Skeleton className="h-24 hidden md:block" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
}

export default function DashboardClient() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<ActiveView>('restaurants');
    const [isLogoutPending, startLogoutTransition] = useTransition();

    // Hoisted state for point cards
    const [newCards, setNewCards] = useState<PointCard[]>([]);
    const [usedCards, setUsedCards] = useState<PointCard[]>([]);
    const [isNewCardsLoading, startNewCardsTransition] = useTransition();
    const [isUsedCardsLoading, startUsedCardsTransition] = useTransition();

    const fetchRestaurants = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedRestaurants = await getRestaurants();
            setRestaurants(fetchedRestaurants);
        } catch (error) {
            console.error("Failed to fetch restaurants", error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const fetchNewCards = useCallback(() => {
        startNewCardsTransition(async () => {
            try {
              const newCardsData = await getPointCards();
              setNewCards(newCardsData);
            } catch (error) {
              toast.error('获取新点卡失败', { description: error instanceof Error ? error.message : '未知错误' });
            }
        });
    }, []);

    const fetchUsedCards = useCallback(() => {
        startUsedCardsTransition(async () => {
            try {
              const usedCardsData = await getUsedPointCards();
              setUsedCards(usedCardsData);
            } catch (error) {
              toast.error('获取已用点卡失败', { description: error instanceof Error ? error.message : '未知错误' });
            }
        });
    }, []);

    useEffect(() => {
        fetchRestaurants();
        fetchNewCards();
    }, [fetchRestaurants, fetchNewCards]);


    const handleLogoutSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        startLogoutTransition(async () => {
            await logoutSuperAdmin();
        });
    };

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    const ActiveComponent = viewConfig[activeView].component;

    const componentProps: any = {
        'restaurants': { restaurants: restaurants, onRestaurantAdded: fetchRestaurants },
        'point-cards': { 
            restaurants: restaurants,
            newCards,
            usedCards,
            isNewCardsLoading,
            isUsedCardsLoading,
            fetchNewCards,
            fetchUsedCards,
            onCardsCreated: fetchNewCards
        },
        'security': {}
    };

    return (
        <div className="flex flex-col min-h-screen bg-muted/40 p-4 sm:p-6 md:p-8">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 mb-6 -mx-4 -mt-4 sm:-mx-6 md:-mx-8 sm:-mt-6 md:-mt-8">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden"><MenuIcon className="h-5 w-5" /><span className="sr-only">打开导航菜单</span></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {(Object.keys(viewConfig) as ActiveView[]).map(key => {
                            const { title, icon: Icon } = viewConfig[key];
                            return (<DropdownMenuItem key={key} onSelect={() => setActiveView(key)} className={cn(activeView === key && "bg-muted")}><Icon className="mr-2 h-4 w-4" /><span>{title}</span></DropdownMenuItem>)
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                <h1 className="text-2xl font-bold">{viewConfig[activeView].title}</h1>
                <div className="ml-auto">
                    <form onSubmit={handleLogoutSubmit}>
                    <Button variant="outline" size="sm" type="submit" disabled={isLogoutPending}>
                        {isLogoutPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                        登出
                    </Button>
                    </form>
                </div>
            </header>
            <main className="grid md:grid-cols-[140px_1fr] lg:grid-cols-[160px_1fr] gap-6">
                 <nav className="hidden md:flex flex-col gap-2 text-sm text-muted-foreground">
                    {(Object.keys(viewConfig) as ActiveView[]).map(key => {
                        const { title, icon: Icon } = viewConfig[key];
                        return (
                            <button key={key} onClick={() => setActiveView(key)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary", activeView === key ? "bg-muted text-primary" : "text-muted-foreground")}>
                                <Icon className="h-4 w-4" />{title}
                            </button>
                        )
                    })}
                </nav>
                 <div className="grid gap-6">
                    <fieldset disabled={isLogoutPending} className={cn(isLogoutPending && "opacity-50")}>
                        <div className="grid gap-4">
                           <ActiveComponent {...componentProps[activeView]} />
                        </div>
                    </fieldset>
                </div>
            </main>
        </div>
    );
}

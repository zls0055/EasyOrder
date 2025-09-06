
'use client';

import React, { useState, useMemo, useEffect, useCallback, useTransition, useRef } from 'react';
import type { AppSettings, Dish, RechargeLog, Restaurant, FeatureVisibility } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { KeyRound, Pencil, PlusCircle, Save, Trash2, Loader2, Utensils, ChevronLeft, ChevronRight, Search, LogOut, PanelsTopLeft, Settings, DoorClosed, GripVertical, MoreVertical, ArrowUp, ArrowDown, Menu as MenuIcon, X as XIcon, Check, Upload, Download, ChevronDown, CreditCard, History, DatabaseZap, FileText, BarChartHorizontal, Star } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { addDishAction, updateDishAction, deleteDishAction, updateSettings, updatePassword, updateCategoryOrderAction, redeemPointCardAction } from '@/lib/actions';
import { logout } from '@/lib/session';
import Link from 'next/link';
import { toast as sonnerToast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Papa from 'papaparse';
import { getRechargeLogs } from '@/lib/settings';
import PointLogsSheet from '@/components/point-logs-sheet';
import DishSalesReport from '@/components/dish-sales-report';


interface DashboardClientProps {
  initialRestaurant: Restaurant;
  initialSettings: AppSettings;
  initialDishes: Dish[];
  restaurantId: string;
}

function SubmitButton({ isPending, children, ...props }: { isPending: boolean; children: React.ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Button type="submit" disabled={isPending} {...props}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
    </Button>
  );
}

function AddDishForm({ onActionSuccess, restaurantId }: { onActionSuccess: () => void; restaurantId: string }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('restaurantId', restaurantId);
    
    startTransition(async () => {
      const result = await addDishAction(null, formData);
      if (result?.success) {
        sonnerToast.success("操作成功", { description: "新菜品已成功添加。" });
        onActionSuccess();
        formRef.current?.reset();
      } else if (result?.error) {
        sonnerToast.error("添加失败", { description: result.error, duration: 3000 });
      }
    });
  };
  
  return (
    <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>添加新菜品</SheetTitle>
          <SheetDescription>填写以下信息以创建新菜品。</SheetDescription>
        </SheetHeader>
      <form ref={formRef} onSubmit={handleFormSubmit} className="flex flex-col overflow-hidden">
        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">菜品名称</Label>
            <Input id="name" name="name" placeholder="例如：麻婆豆腐" required disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">价格 (元)</Label>
            <Input id="price" name="price" type="number" step="0.01" placeholder="例如: 25.50" required disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Input id="category" name="category" placeholder="例如：精美小炒" required disabled={isPending} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="sortOrder">排序 (数字越小越靠前)</Label>
            <Input id="sortOrder" name="sortOrder" type="number" defaultValue="0" required disabled={isPending} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                  <Label htmlFor="isRecommendedAdd" className="text-sm font-medium">设为推荐菜品</Label>
                  <p className="text-xs text-muted-foreground">推荐菜品将在菜单中突出显示。</p>
              </div>
              <Switch id="isRecommendedAdd" name="isRecommended" />
          </div>
        </div>
        <SheetFooter className="mt-auto">
          <SheetClose asChild>
            <Button type="button" variant="ghost" disabled={isPending}>取消</Button>
          </SheetClose>
          <SubmitButton isPending={isPending}>
            <Save className="mr-2 h-4 w-4" />保存
          </SubmitButton>
        </SheetFooter>
      </form>
       <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
    </SheetContent>
  );
}

function EditDishForm({ dish, onActionSuccess, restaurantId }: { dish: Dish; onActionSuccess: () => void; restaurantId: string; }) {
  const [isPending, startTransition] = useTransition();

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('restaurantId', restaurantId);

    startTransition(async () => {
      const result = await updateDishAction(null, formData);
      if (result?.success) {
        sonnerToast.success("成功", { description: "菜品信息已成功更新。" });
        onActionSuccess();
      } else if (result?.error) {
        sonnerToast.error("错误", { description: result.error, duration: 3000 });
      }
    });
  };

  return (
    <SheetContent className="w-full sm:max-w-md flex flex-col">
       <SheetHeader>
          <SheetTitle>编辑菜品</SheetTitle>
          <SheetDescription>更新菜品 “{dish?.name}” 的信息。</SheetDescription>
        </SheetHeader>
      <form onSubmit={handleFormSubmit} className="flex flex-col overflow-hidden">
        <input type="hidden" name="id" value={dish.id} />
        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name-edit">菜品名称</Label>
            <Input id="name-edit" name="name" defaultValue={dish.name} required disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price-edit">价格 (元)</Label>
            <Input id="price-edit" name="price" type="number" step="0.01" defaultValue={dish.price} required disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-edit">分类</Label>
            <Input id="category-edit" name="category" defaultValue={dish.category} required disabled={isPending} />
          </div>
          <div className="space_y-2">
            <Label htmlFor="sortOrder-edit">排序 (数字越小越靠前)</Label>
            <Input id="sortOrder-edit" name="sortOrder" type="number" defaultValue={dish.sortOrder} required disabled={isPending} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                  <Label htmlFor="isRecommendedEdit" className="text-sm font-medium">设为推荐菜品</Label>
                  <p className="text-xs text-muted-foreground">推荐菜品将在菜单中突出显示。</p>
              </div>
              <Switch id="isRecommendedEdit" name="isRecommended" defaultChecked={dish.isRecommended} />
          </div>
        </div>
        <SheetFooter className="mt-auto">
          <SheetClose asChild>
            <Button type="button" variant="ghost" disabled={isPending}>取消</Button>
          </SheetClose>
          <SubmitButton isPending={isPending}>
            <Save className="mr-2 h-4 w-4" />保存更改
          </SubmitButton>
        </SheetFooter>
      </form>
      <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <XIcon className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetClose>
    </SheetContent>
  );
}

type DishImportData = {
  id?: string;
  new_id?: string;
  name: string;
  price: number;
  category: string;
  sortOrder: number;
};

function DishesSection({ dishes, settings, onActionSuccess, restaurantId }: { dishes: Dish[], settings: AppSettings, onActionSuccess: () => void, restaurantId: string }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | undefined>();
  const [deletingDish, setDeletingDish] = useState<Dish | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeletePending, startDeleteTransition] = useTransition();
  
  const categoryListRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const [isCategoryListVisible, setIsCategoryListVisible] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState('全部分类');

  const categoriesWithCount = useMemo(() => {
    const savedOrder = settings.categoryOrder || [];
    const categoryCounts = dishes.reduce((acc, dish) => {
        acc[dish.category] = (acc[dish.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const allCatsFromDishes = Array.from(new Set(dishes.map(d => d.category)));
    const allKnownCats = [...new Set([...savedOrder, ...allCatsFromDishes])];
    
    const sortedCats = allKnownCats.sort((a, b) => {
      const aIndex = savedOrder.indexOf(a);
      const bIndex = savedOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b, 'zh-Hans-CN');
    });

    const categoryList = sortedCats
      .filter(cat => categoryCounts[cat])
      .map(cat => ({
        name: cat,
        count: categoryCounts[cat] || 0
      }));

    return [{ name: '全部分类', count: dishes.length }, ...categoryList];
  }, [dishes, settings.categoryOrder]);

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategoryName(categoryName);
    setSearchQuery('');
    setIsCategoryListVisible(false);
    setCurrentPage(1);
  };
  
  useEffect(() => {
    if (searchQuery) {
        setSelectedCategoryName('全部分类');
    }
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryListRef.current &&
        !categoryListRef.current.contains(event.target as Node) &&
        categoryButtonRef.current &&
        !categoryButtonRef.current.contains(event.target as Node)
      ) {
        setIsCategoryListVisible(false);
      }
    }

    if (isCategoryListVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryListVisible]);

  const handleDeleteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('restaurantId', restaurantId);
    startDeleteTransition(async () => {
        const result = await deleteDishAction(null, formData);
        if (result?.success) {
            sonnerToast.success('成功', { description: '菜品已删除。' });
            setDeletingDish(undefined);
            onActionSuccess();
        } else if (result?.error) {
            sonnerToast.error('删除失败', { description: result.error, duration: 3000 });
        }
    });
  };

  const filteredDishes = useMemo(() => {
    const categoryOrder = settings.categoryOrder || [];
    const categoryIndexMap = new Map(categoryOrder.map((cat, index) => [cat, index]));

    const filtered = dishes.filter(dish => {
        const matchesCategory = selectedCategoryName === '全部分类' || dish.category === selectedCategoryName;
        const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase()) || dish.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return filtered.sort((a, b) => {
        const catIndexA = categoryIndexMap.get(a.category) ?? Infinity;
        const catIndexB = categoryIndexMap.get(b.category) ?? Infinity;

        if (catIndexA !== catIndexB) return catIndexA - catIndexB;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
  }, [dishes, searchQuery, selectedCategoryName, settings.categoryOrder]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategoryName]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredDishes.length / ITEMS_PER_PAGE);
  const paginatedDishes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDishes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDishes, currentPage]);

  const handleAddSuccess = () => {
    onActionSuccess();
    setIsAddOpen(false);
  }

  const handleEditSuccess = () => {
    onActionSuccess();
    setEditingDish(undefined);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button ref={categoryButtonRef} variant="outline">
                  <span>{selectedCategoryName}</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent ref={categoryListRef}>
                {categoriesWithCount.map((category) => (
                  <DropdownMenuItem key={category.name} onSelect={() => handleCategorySelect(category.name)}>
                    {category.name} ({category.count})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center border rounded-md shadow-sm bg-background h-9">
            <div className="relative flex items-center h-full">
              <Search className="h-4 w-4 text-muted-foreground mx-2" />
              <Input type="search" placeholder="搜索..." className="h-auto bg-transparent border-0 shadow-none px-0 focus-visible:ring-0 w-32 sm:w-40" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <Button onClick={() => setIsAddOpen(true)} size="icon" aria-label="添加新菜品">
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-2">
          <div className="hidden sm:block border rounded-lg overflow-x-auto">
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead className="text-right">价格</TableHead>
                      <TableHead className="text-right w-[80px]">排序</TableHead>
                      <TableHead className="w-[80px] text-right">操作</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {paginatedDishes.map((dish) => (
                      <TableRow key={dish.id}>
                      <TableCell className="py-2 font-medium flex items-center">{dish.name} {dish.isRecommended && <Star className="ml-2 h-4 w-4 text-yellow-500 fill-yellow-400" />}</TableCell>
                      <TableCell className="py-2 text-muted-foreground">{dish.category}</TableCell>
                      <TableCell className="text-right py-2">￥{dish.price.toFixed(1)}</TableCell>
                      <TableCell className="text-right py-2">{dish.sortOrder}</TableCell>
                      <TableCell className="text-right py-2">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => setEditingDish(dish)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      <span>编辑</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setDeletingDish(dish)} className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>删除</span>
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                      </TableRow>
                  ))}
                  </TableBody>
              </Table>
          </div>

          <div className="block sm:hidden space-y-2">
              {paginatedDishes.map((dish) => (
                  <Card key={dish.id} className="p-4">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="font-medium flex items-center">{dish.name} {dish.isRecommended && <Star className="ml-2 h-4 w-4 text-yellow-500 fill-yellow-400" />}</p>
                              <p className="text-sm text-muted-foreground">{dish.category}</p>
                          </div>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => setEditingDish(dish)}><Pencil className="mr-2 h-4 w-4" /><span>编辑</span></DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeletingDish(dish)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>删除</span></DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                      <div className="flex justify-between items-baseline mt-2">
                          <span className="text-lg font-bold text-accent">￥{dish.price.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground">排序: {dish.sortOrder}</span>
                      </div>
                  </Card>
              ))}
          </div>

          {dishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8"><Utensils className="h-12 w-12 mb-4" /><p className="font-semibold">菜单还是空的</p><p className="text-sm">点击“添加新菜品”按钮来开始吧！</p></div>
          ) : paginatedDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8"><Search className="h-12 w-12 mb-4" /><p className="font-semibold">未找到匹配的菜品</p><p className="text-sm">请尝试其他筛选条件。</p></div>
          ) : null}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">总共 {filteredDishes.length} 个菜品. 第 {currentPage} 页 / {totalPages} 页</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="mr-2 h-4 w-4" />上一页</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>下一页<ChevronRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>
      )}
      
      
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <AddDishForm onActionSuccess={handleAddSuccess} restaurantId={restaurantId} />
      </Sheet>
      
      <Sheet open={!!editingDish} onOpenChange={(open) => !open && setEditingDish(undefined)}>
        {editingDish && <EditDishForm dish={editingDish} onActionSuccess={handleEditSuccess} restaurantId={restaurantId} />}
      </Sheet>
      
      <AlertDialog open={!!deletingDish} onOpenChange={(open) => !open && setDeletingDish(undefined)}>
        <AlertDialogContent>
          <form onSubmit={handleDeleteSubmit}>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除？</AlertDialogTitle>
              <AlertDialogDescription>您确定要删除菜品 “{deletingDish?.name}” 吗？此操作无法撤销。</AlertDialogDescription>
            </AlertDialogHeader>
            <input type="hidden" name="id" value={deletingDish?.id || ''} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletePending} onClick={() => setDeletingDish(undefined)}>取消</AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={isDeletePending}>
                {isDeletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                确认删除
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CategorySortCard({ settings, dishes, onActionSuccess, restaurantId }: { settings: AppSettings, dishes: Dish[], onActionSuccess: () => void, restaurantId: string }) {
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const savedOrder = settings.categoryOrder || [];
    const allUniqueCategories = Array.from(new Set(dishes.map(d => d.category)));
    const savedOrderSet = new Set(savedOrder);
    const remainingCategories = allUniqueCategories.filter(c => !savedOrderSet.has(c)).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
    setOrderedCategories([...savedOrder, ...remainingCategories]);
  }, [settings.categoryOrder, dishes]);

  const handleDragStart = (category: string) => setDraggedCategory(category);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleDrop = (targetCategory: string) => {
    if (!draggedCategory || draggedCategory === targetCategory) return;
    const newOrder = [...orderedCategories];
    const draggedIndex = newOrder.indexOf(draggedCategory);
    const targetIndex = newOrder.indexOf(targetCategory);
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedCategory);
    setOrderedCategories(newOrder);
    setDraggedCategory(null);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedCategories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const [movedItem] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, movedItem);
    setOrderedCategories(newOrder);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('categoryOrder', orderedCategories.join(','));
    formData.append('restaurantId', restaurantId);
    
    startTransition(async () => {
      const result = await updateCategoryOrderAction(null, formData);
      if (result?.success) {
        sonnerToast.success("成功", { description: "分类排序已保存。" });
        onActionSuccess();
      } else {
        sonnerToast.error("错误", { description: result?.error || "保存失败" });
      }
    });
  };

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={handleFormSubmit}>
        <div className="space-y-2">
          {orderedCategories.length > 0 ? orderedCategories.map((category, index) => (
            <div key={category} draggable onDragStart={() => handleDragStart(category)} onDragOver={handleDragOver} onDrop={() => handleDrop(category)} className={cn("flex items-center p-3 rounded-md bg-background cursor-grab active:cursor-grabbing border justify-between", draggedCategory === category && "opacity-50")}>
              <div className="flex items-center">
                <GripVertical className="h-5 w-5 text-muted-foreground mr-2 hidden sm:block" />
                <span>{category}</span>
              </div>
              <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleMoveCategory(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                   <Button type="button" variant="ghost" size="icon" onClick={() => handleMoveCategory(index, 'down')} disabled={index === orderedCategories.length - 1}><ArrowDown className="h-4 w-4" /></Button>
              </div>
            </div>
          )) : (<div className="text-center text-muted-foreground p-4">没有需要排序的分类。</div>)}
        </div>
        <input type="hidden" name="categoryOrder" value={orderedCategories.join(',')} />
        <div className="pt-4">
          <SubmitButton isPending={isPending}><Save className="mr-2 h-4 w-4" />保存排序</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function SettingsCard({ settings, onActionSuccess, restaurantId }: { settings: AppSettings; onActionSuccess: () => void; restaurantId: string; }) {
  const [isPending, startTransition] = useTransition();

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('restaurantId', restaurantId);
    startTransition(async () => {
      const result = await updateSettings(null, formData);
      if (result?.success) {
        sonnerToast.success('成功', { description: '设置已成功更新。' });
        onActionSuccess();
      } else if (result?.error) {
        sonnerToast.error('错误', { description: result.error, duration: 3000 });
      }
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleFormSubmit}>
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isRestaurantClosed" className="text-base">手动打烊</Label>
              <p className="text-sm text-muted-foreground">开启后，所有点餐页面将无法下单。此设置优先级最高。</p>
            </div>
            <Switch id="isRestaurantClosed" name="isRestaurantClosed" defaultChecked={settings.isRestaurantClosed} disabled={isPending} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isOnlineOrderingDisabled" className="text-base">关闭线上点单</Label>
              <p className="text-sm text-muted-foreground">开启后，所有点餐页面将无法下单，但会提示顾客可到店消费。</p>
            </div>
            <Switch id="isOnlineOrderingDisabled" name="isOnlineOrderingDisabled" defaultChecked={settings.isOnlineOrderingDisabled} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tableCount">可用桌子数量</Label>
            <Input id="tableCount" name="tableCount" type="number" defaultValue={settings.tableCount} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="placeOrderOpCode">下单操作码</Label>
            <Input id="placeOrderOpCode" name="placeOrderOpCode" defaultValue={settings.placeOrderOpCode} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kitchenDisplayPassword">厨房看板访问密码</Label>
            <Input id="kitchenDisplayPassword" name="kitchenDisplayPassword" defaultValue={settings.kitchenDisplayPassword} disabled={isPending} placeholder="留空则无需密码"/>
          </div>
          <div className="space-y-2">
            <Label>自动打烊时间段</Label>
            <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                    <Label htmlFor="autoCloseStartTime" className="text-xs text-muted-foreground">开始时间</Label>
                    <Input id="autoCloseStartTime" name="autoCloseStartTime" type="time" defaultValue={settings.autoCloseStartTime} disabled={isPending} />
                </div>
                <div className="flex-1 space-y-1">
                    <Label htmlFor="autoCloseEndTime" className="text-xs text-muted-foreground">结束时间</Label>
                    <Input id="autoCloseEndTime" name="autoCloseEndTime" type="time" defaultValue={settings.autoCloseEndTime} disabled={isPending} />
                </div>
            </div>
          </div>
        </div>
        <div className="pt-2">
          <SubmitButton isPending={isPending}><Save className="mr-2 h-4 w-4" />保存设置</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function SecuritySettingsCard({ settings, restaurantId }: { settings: AppSettings; restaurantId: string; }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('restaurantId', restaurantId);
    startTransition(async () => {
      const result = await updatePassword(null, formData);
      if (result?.success) {
        sonnerToast.success('密码已更新', { description: '您将登出，请使用新密码重新登录。' });
        await logout(restaurantId); 
        router.push(`/${restaurantId}/management`);
      } else if (result?.error) {
        sonnerToast.error('错误', { description: result.error, duration: 3000 });
      }
    });
  };

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={handleFormSubmit}>
        <div className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="adminUsername">管理员用户名</Label>
            <Input id="adminUsername" name="adminUsername" defaultValue={settings.adminUsername} disabled={isPending} />
          </div>
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
        </div>
        <div className="pt-2">
          <SubmitButton isPending={isPending} variant="destructive"><Save className="mr-2 h-4 w-4" />更新密码并登出</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function RechargeCard({ restaurantId, onActionSuccess }: { restaurantId: string; onActionSuccess: () => void; }) {
  const [isRedeemPending, startRedeemTransition] = useTransition();
  const [isFetchPending, startFetchTransition] = useTransition();
  const [logs, setLogs] = useState<RechargeLog[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const fetchLogs = useCallback(() => {
    startFetchTransition(async () => {
      const fetchedLogs = await getRechargeLogs(restaurantId);
      setLogs(fetchedLogs);
    });
  }, [restaurantId, startFetchTransition]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRedeemSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('restaurantId', restaurantId);

    startRedeemTransition(async () => {
      const result = await redeemPointCardAction(null, formData);
      if (result?.success) {
        sonnerToast.success('充值成功', { description: '点数已成功添加到您的账户。' });
        onActionSuccess(); // Refreshes all dashboard data
        fetchLogs(); // Specifically refetches logs for this component
        formRef.current?.reset();
      } else {
        sonnerToast.error('充值失败', { description: result?.error || '发生未知错误。' });
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>使用点卡充值</CardTitle>
          <CardDescription>在此输入由管理员提供的点卡代码进行充值。</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleRedeemSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardId">点卡代码</Label>
              <Input id="cardId" name="cardId" placeholder="粘贴点卡代码" required disabled={isRedeemPending} />
            </div>
            <SubmitButton isPending={isRedeemPending}><CreditCard className="mr-2 h-4 w-4" />确认充值</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>充值记录</CardTitle>
          <CardDescription>最近的充值历史记录。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg max-h-72 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>卡密</TableHead>
                  <TableHead className="text-right">充值点数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetchPending ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : logs.length > 0 ? (
                  logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.rechargedAt).toLocaleString('zh-CN')}</TableCell>
                      <TableCell className="font-mono text-xs">{log.cardId}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">+{log.pointsAdded}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">没有充值记录</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


type ActiveView = 'menu' | 'category-sort' | 'sales-report' | 'settings' | 'recharge' | 'security';

const viewConfig: Record<ActiveView, { title: string; component: React.FC<any>; icon: React.ElementType, key: keyof FeatureVisibility }> = {
  'menu': { title: '菜单管理', component: DishesSection, icon: Utensils, key: 'menuManagement' },
  'category-sort': { title: '分类排序', component: CategorySortCard, icon: GripVertical, key: 'categorySort' },
  'sales-report': { title: '菜品销量', component: DishSalesReport, icon: BarChartHorizontal, key: 'dishSalesReport' },
  'settings': { title: '通用设置', component: SettingsCard, icon: Settings, key: 'generalSettings' },
  'recharge': { title: '点卡充值', component: RechargeCard, icon: CreditCard, key: 'pointCardRecharge' },
  'security': { title: '安全设置', component: SecuritySettingsCard, icon: KeyRound, key: 'securitySettings' },
};

export default function DashboardClient({ initialRestaurant, initialSettings, initialDishes, restaurantId }: DashboardClientProps) {
  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [dishes, setDishes] = useState<Dish[]>(initialDishes);
  
  const router = useRouter();
  const [isLogoutPending, startLogoutTransition] = useTransition();
  const [isViewingLogs, setIsViewingLogs] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  
  const visibleViews = useMemo(() => 
    (Object.keys(viewConfig) as ActiveView[]).filter(key => 
        settings.featureVisibility[viewConfig[key].key]
    ), [settings.featureVisibility]);

  const [activeView, setActiveView] = useState<ActiveView>(visibleViews[0] || 'menu');

  useEffect(() => {
    setRestaurant(initialRestaurant);
    setSettings(initialSettings);
    setDishes(initialDishes);
  }, [initialRestaurant, initialSettings, initialDishes]);
  
  useEffect(() => {
      // If the current active view is no longer visible, switch to the first available one.
      if (!visibleViews.includes(activeView)) {
          setActiveView(visibleViews[0] || 'menu');
      }
  }, [visibleViews, activeView]);

  const refreshData = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleLogoutSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startLogoutTransition(async () => {
      await logout(restaurantId);
    });
  };
  
  const ActiveComponent = viewConfig[activeView].component;

  const componentProps: any = {
    'menu': { dishes, settings, onActionSuccess: refreshData, restaurantId },
    'category-sort': { dishes, settings, onActionSuccess: refreshData, restaurantId },
    'sales-report': { dishes, restaurantId },
    'settings': { settings, onActionSuccess: refreshData, restaurantId },
    'recharge': { onActionSuccess: refreshData, restaurantId },
    'security': { settings, onActionSuccess: refreshData, restaurantId },
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/40 p-2 sm:p-6 md:p-8">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-2 mb-4 -mx-2 -mt-2 sm:-mx-6 md:-mx-8 sm:-mt-6 md:-mt-8">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><MenuIcon className="h-5 w-5" /><span className="sr-only">打开导航菜单</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {visibleViews.map(key => {
                    const { title, icon: Icon } = viewConfig[key];
                    return (<DropdownMenuItem key={key} onSelect={() => setActiveView(key)} className={cn(activeView === key && "bg-muted")}><Icon className="mr-2 h-4 w-4" /><span>{title}</span></DropdownMenuItem>)
                })}
            </DropdownMenuContent>
        </DropdownMenu>

        <h1 className="text-xl font-bold">{viewConfig[activeView].title}</h1>
        <Button variant="ghost" className="flex items-center gap-2 border-l pl-4 ml-4 h-auto py-1 text-left" onClick={() => setIsViewingLogs(true)}>
            <DatabaseZap className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-bold">{restaurant.points}</span>
              <span className="text-xs text-muted-foreground">剩余点数</span>
            </div>
        </Button>

        <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="outline" size="sm" disabled={isLogoutPending}><Link href={`/${restaurantId}`}><PanelsTopLeft className="mr-2 h-4 w-4" />点餐页</Link></Button>
              <Button asChild variant="outline" size="sm" disabled={isLogoutPending}><Link href={`/${restaurantId}/orders`} target="_blank"><Utensils className="mr-2 h-4 w-4" />厨房看板</Link></Button>
              <form onSubmit={handleLogoutSubmit}>
                <Button variant="outline" size="sm" type="submit" disabled={isLogoutPending}>
                  {isLogoutPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  登出
                </Button>
              </form>
            </div>
             <div className="block sm:hidden">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem asChild><Link href={`/${restaurantId}`}><PanelsTopLeft className="mr-2 h-4 w-4" />点餐页</Link></DropdownMenuItem>
                         <DropdownMenuItem asChild><Link href={`/${restaurantId}/orders`} target="_blank"><Utensils className="mr-2 h-4 w-4" />厨房看板</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => logoutFormRef.current?.requestSubmit()} className="text-destructive focus:text-destructive">
                             <form ref={logoutFormRef} onSubmit={handleLogoutSubmit} className="flex items-center w-full">
                                {isLogoutPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                                <span>登出</span>
                            </form>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </header>
      <main className="grid md:grid-cols-[140px_1fr] lg:grid-cols-[160px_1fr] gap-6">
        <nav className="hidden md:flex flex-col gap-2 text-sm text-muted-foreground">
             {visibleViews.map(key => {
                const { title, icon: Icon } = viewConfig[key];
                return (
                    <button key={key} onClick={() => setActiveView(key)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary", activeView === key ? "bg-muted text-primary" : "text-muted-foreground")}>
                        <Icon className="h-4 w-4" />{title}
                    </button>
                )
            })}
        </nav>
        <div className="grid gap-2">
            <fieldset disabled={isLogoutPending} className={cn(isLogoutPending && "opacity-50")}>
                <div className="grid gap-2">
                    <ActiveComponent {...componentProps[activeView]} />
                </div>
            </fieldset>
        </div>
      </main>
      <PointLogsSheet 
        restaurant={restaurant}
        open={isViewingLogs}
        onOpenChange={setIsViewingLogs}
      />
    </div>
  );
}

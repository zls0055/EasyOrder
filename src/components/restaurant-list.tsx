

'use client';

import React, { useState, useTransition, useMemo, useEffect, useRef, useActionState } from 'react';
import type { Restaurant, AppSettings, Dish } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Trash2, MoreVertical, Edit, RotateCcw, Save, Search, DollarSign, ChevronLeft, ChevronRight, PanelsTopLeft, KeyRound, Utensils, Settings as SettingsIcon, Upload, Download, Database, Link as LinkIcon, Wrench, Clipboard, ClipboardCheck, FileText, X, PlusCircle, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { deleteRestaurant, clearRestaurantData, updateRestaurantName, rechargePoints, getRestaurant, getSettings, getDishes } from '@/lib/settings';
import { toast as sonnerToast } from 'sonner';
import { Input } from './ui/input';
import { Label } from './ui/label';
import PointLogsSheet from './point-logs-sheet';
import AddRestaurantButton from './add-restaurant-button';
import { addRestaurantAction, batchUpdateDishesAction } from '@/lib/actions';
import SyncSettingsSheet from './sync-settings-sheet';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

type DishImportData = {
  id?: string;
  new_id?: string;
  name: string;
  price: number;
  category: string;
  sortOrder: number;
  isRecommended?: boolean;
  isAvailable?: boolean;
};

interface RestaurantListProps {
  restaurants: Restaurant[];
  onRestaurantAdded: () => void;
  isLoading: boolean;
  onRefresh: () => void;
}

type DialogState = 
    | { type: 'delete'; restaurant: Restaurant }
    | { type: 'clear'; restaurant: Restaurant }
    | { type: 'edit'; restaurant: Restaurant }
    | { type: 'recharge'; restaurant: Restaurant }
    | { type: 'sync-settings', restaurant: Restaurant, settings: AppSettings | null }
    | { type: 'import-csv', restaurant: Restaurant }
    | { type: 'view-dishes', restaurant: Restaurant }
    | null;

const initialState = {
  error: null,
  success: null,
};

const ITEMS_PER_PAGE = 10;

const RestaurantRow = ({ restaurant, onAction, onRefresh, onImport, onExport, onViewLogs, index, refreshingId, copiedId, onCopy }: { 
    restaurant: Restaurant, 
    onAction: (state: DialogState) => void,
    onRefresh: (restaurantId: string) => void,
    onImport: (restaurant: Restaurant) => void,
    onExport: (restaurant: Restaurant) => void,
    onViewLogs: (restaurant: Restaurant) => void,
    index: number,
    refreshingId: string | null,
    copiedId: string | null,
    onCopy: (id: string) => void,
}) => {
    const isRefreshingThisRow = refreshingId === restaurant.id;
    const isCopied = copiedId === restaurant.id;

    return (
        <TableRow className={cn(index % 2 !== 0 && 'bg-muted/50')}>
            <TableCell className="font-medium py-2 px-2">
                <div className="flex items-center gap-2">
                    <span>{restaurant.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onCopy(restaurant.id)}>
                        {isCopied ? <ClipboardCheck className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                    </Button>
                </div>
            </TableCell>
            <TableCell className="py-2 px-2">
                <div className="flex items-center gap-2">
                    <Button variant="link" onClick={() => onViewLogs(restaurant)} className="p-0 h-auto font-semibold">
                        {restaurant.points}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRefresh(restaurant.id)} disabled={isRefreshingThisRow}>
                       {isRefreshingThisRow ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    </Button>
                </div>
            </TableCell>
            <TableCell className="text-right py-2 px-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuSub>
                             <DropdownMenuSubTrigger><LinkIcon className="mr-2 h-4 w-4" /><span>页面链接</span></DropdownMenuSubTrigger>
                             <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem asChild><Link href={`/${restaurant.id}`} target="_blank" className="flex items-center"><PanelsTopLeft className="mr-2 h-4 w-4" /><span>点餐页</span></Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href={`/${restaurant.id}/management`} target="_blank" className="flex items-center"><KeyRound className="mr-2 h-4 w-4" /><span>管理后台</span></Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href={`/${restaurant.id}/orders`} target="_blank" className="flex items-center"><Utensils className="mr-2 h-4 w-4" /><span>厨房看板</span></Link></DropdownMenuItem>
                                </DropdownMenuSubContent>
                             </DropdownMenuPortal>
                        </DropdownMenuSub>
                         <DropdownMenuSeparator />
                         <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Database className="mr-2 h-4 w-4" /><span>数据管理</span></DropdownMenuSubTrigger>
                             <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onSelect={() => onAction({ type: 'view-dishes', restaurant })}><FileText className="mr-2 h-4 w-4" /><span>查看菜品</span></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => onImport(restaurant)}><Upload className="mr-2 h-4 w-4" /><span>导入菜品 (CSV)</span></DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onExport(restaurant)}><Download className="mr-2 h-4 w-4" /><span>导出菜品 (CSV)</span></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                     <DropdownMenuItem onSelect={() => onAction({ type: 'clear', restaurant })} className="text-amber-600 focus:text-amber-600">
                                        <RotateCcw className="mr-2 h-4 w-4" /><span>清空数据</span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                         </DropdownMenuSub>
                        <DropdownMenuSub>
                             <DropdownMenuSubTrigger><Wrench className="mr-2 h-4 w-4" /><span>餐馆设置</span></DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                     <DropdownMenuItem onSelect={() => onAction({ type: 'edit', restaurant })}>
                                        <Edit className="mr-2 h-4 w-4" /><span>修改名称</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onAction({ type: 'recharge', restaurant })}>
                                        <DollarSign className="mr-2 h-4 w-4" /><span>充值点数</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onAction({ type: 'sync-settings', restaurant, settings: null })}>
                                        <SettingsIcon className="mr-2 h-4 w-4" />
                                        <span>高级设置</span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onAction({ type: 'delete', restaurant })} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /><span>删除餐馆</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
}

function ViewDishesSheet({ restaurant, open, onOpenChange }: { restaurant: Restaurant; open: boolean; onOpenChange: (open: boolean) => void; }) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      const fetchData = async () => {
        try {
          const [fetchedDishes, fetchedSettings] = await Promise.all([
            getDishes(restaurant.id),
            getSettings(restaurant.id)
          ]);
          setDishes(fetchedDishes);
          setSettings(fetchedSettings);
        } catch (error) {
          console.error("Failed to fetch dishes or settings:", error);
          sonnerToast.error("获取菜品数据失败");
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [open, restaurant.id]);

  const groupedDishes = useMemo(() => {
    if (!dishes.length || !settings) return {};
    const categoryOrder = settings.categoryOrder || [];
    
    const sortedDishes = [...dishes].sort((a, b) => {
        const catIndexA = categoryOrder.indexOf(a.category);
        const catIndexB = categoryOrder.indexOf(b.category);

        if (catIndexA !== -1 && catIndexB !== -1) {
            if (catIndexA !== catIndexB) return catIndexA - catIndexB;
        } else if (catIndexA !== -1) {
            return -1;
        } else if (catIndexB !== -1) {
            return 1;
        } else {
             const catCompare = a.category.localeCompare(b.category, 'zh-Hans-CN');
             if (catCompare !== 0) return catCompare;
        }

        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });

    return sortedDishes.reduce((acc, dish) => {
      (acc[dish.category] = acc[dish.category] || []).push(dish);
      return acc;
    }, {} as Record<string, Dish[]>);
  }, [dishes, settings]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>菜品列表: {restaurant.name}</SheetTitle>
          <SheetDescription>
            共 {dishes.length} 道菜品。
          </SheetDescription>
           <SheetClose asChild>
                <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 rounded-full z-50">
                  <X className="h-4 w-4" />
                  <span className="sr-only">关闭</span>
                </Button>
            </SheetClose>
        </SheetHeader>
        <ScrollArea className="flex-1">
            <div className="p-4">
            {isLoading ? (
                <div className="flex items-center justify-center h-full pt-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : Object.keys(groupedDishes).length > 0 ? (
                <div className="space-y-4">
                {Object.entries(groupedDishes).map(([category, dishesInCategory]) => (
                    <div key={category}>
                    <h3 className="text-lg font-semibold sticky top-0 bg-secondary text-secondary-foreground py-2 px-3 rounded-md my-2 z-10">{category}</h3>
                    <div className="border rounded-md">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-[40%]">名称</TableHead>
                            <TableHead>价格</TableHead>
                            <TableHead className="text-right">排序值</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dishesInCategory.map((dish) => (
                            <TableRow key={dish.id}>
                                <TableCell className="font-medium">{dish.name}</TableCell>
                                <TableCell>￥{dish.price.toFixed(1)}</TableCell>
                                <TableCell className="text-right">{dish.sortOrder}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-10">这家餐馆没有菜品。</p>
            )}
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}


export default function RestaurantList({ restaurants: initialRestaurants, onRestaurantAdded, isLoading, onRefresh }: RestaurantListProps) {
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [newName, setNewName] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [viewingLogsFor, setViewingLogsFor] = useState<Restaurant | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [importingDishes, setImportingDishes] = useState<DishImportData[] | null>(null);
  const [isImportPending, startImportTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);


  const [formState, formAction] = useActionState(addRestaurantAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);


  useEffect(() => {
    if (formState) {
      if (formState.success) {
        sonnerToast.success('操作成功', { description: formState.success });
        formRef.current?.reset();
        onRestaurantAdded();
        setIsAddSheetOpen(false);
      }
      if (formState.error) {
        sonnerToast.error('操作失败', { description: formState.error });
      }
    }
  }, [formState, onRestaurantAdded]);
  
  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);
  
  const filteredRestaurants = useMemo(() => {
    const sortedRestaurants = [...restaurants].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    if (!searchQuery) {
      return sortedRestaurants;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return sortedRestaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(lowercasedQuery) ||
        r.id.toLowerCase().includes(lowercasedQuery)
    );
  }, [restaurants, searchQuery]);

  const totalPages = Math.ceil(filteredRestaurants.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paginatedRestaurants = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRestaurants.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRestaurants, currentPage]);

  const handleDelete = () => {
    if (dialogState?.type !== 'delete') return;
    
    startTransition(async () => {
      const result = await deleteRestaurant(dialogState.restaurant.id);
      if (result.success) {
        sonnerToast.success(`餐馆 "${dialogState.restaurant.name}" 已成功删除。`);
        onRestaurantAdded();
      } else {
        sonnerToast.error(`删除失败: ${result.error}`);
      }
      setDialogState(null);
    });
  };

  const handleClearData = () => {
    if (dialogState?.type !== 'clear') return;
    
    startTransition(async () => {
      const result = await clearRestaurantData(dialogState.restaurant.id);
      if (result.success) {
        sonnerToast.success(`餐馆 "${dialogState.restaurant.name}" 的数据已清空。`);
        onRestaurantAdded();
      } else {
        sonnerToast.error(`清空失败: ${result.error}`);
      }
      setDialogState(null);
    });
  };
  
  const handleEditName = (e: React.FormEvent) => {
    e.preventDefault();
    if (dialogState?.type !== 'edit' || !newName.trim()) return;

    startTransition(async () => {
      const result = await updateRestaurantName(dialogState.restaurant.id, newName.trim());
       if (result.success) {
        sonnerToast.success(`餐馆名称已更新为 "${newName.trim()}"。`);
        onRestaurantAdded();
      } else {
        sonnerToast.error(`更新失败: ${result.error}`);
      }
      setDialogState(null);
    });
  };

  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (dialogState?.type !== 'recharge') return;
    const amount = parseInt(rechargeAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      sonnerToast.error('请输入一个有效的正数点数。');
      return;
    }
    startTransition(async () => {
      const result = await rechargePoints(dialogState.restaurant.id, amount);
      if (result.success && result.updatedRestaurant) {
        setRestaurants(prev => prev.map(r => r.id === result.updatedRestaurant!.id ? result.updatedRestaurant! : r));
        sonnerToast.success(`成功为 "${dialogState.restaurant.name}" 充值 ${amount} 点。`);
        onRestaurantAdded();
      } else {
        sonnerToast.error(`充值失败: ${result.error}`);
      }
      setDialogState(null);
    });
  };

  const handleRefreshPoints = async (restaurantId: string) => {
    setRefreshingId(restaurantId);
    startRefreshTransition(async () => {
      const updatedRestaurant = await getRestaurant(restaurantId);
      if (updatedRestaurant) {
        setRestaurants(prev => prev.map(r => r.id === restaurantId ? updatedRestaurant : r));
      } else {
        sonnerToast.error('刷新点数失败，未找到该餐馆。');
      }
      setRefreshingId(null);
    });
  };

  const handleExportCSV = async (restaurant: Restaurant) => {
      const dishes = await getDishes(restaurant.id);
      const settings = await getSettings(restaurant.id);

      const sortedDishesForExport = [...dishes].sort((a, b) => {
          const categoryOrder = settings.categoryOrder || [];
          const categoryIndexMap = new Map(categoryOrder.map((cat, index) => [cat, index]));

          const catIndexA = categoryIndexMap.get(a.category) ?? Infinity;
          const catIndexB = categoryIndexMap.get(b.category) ?? Infinity;
          if (catIndexA !== catIndexB) {
              if (catIndexA === Infinity) return 1;
              if (catIndexB === Infinity) return -1;
              return catIndexA - catIndexB;
          }

          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          
          return a.name.localeCompare(b.name, 'zh-Hans-CN');
      });
      
      const dataToExport = sortedDishesForExport.map(dish => ({ ...dish, new_id: '' }));
      const csv = Papa.unparse(dataToExport, { columns: ['id', 'new_id', 'name', 'price', 'category', 'sortOrder', 'isRecommended', 'isAvailable'] });
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `dishes-${restaurant.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      sonnerToast.success(`"${restaurant.name}" 的菜品已导出`);
  };

  const handleImportClick = (restaurant: Restaurant) => {
    setDialogState({ type: 'import-csv', restaurant });
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (dialogState?.type !== 'import-csv') return;
    const file = event.target.files?.[0];
    if (!file) {
      setDialogState(null);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedDishes: DishImportData[] = results.data.map((row: any) => ({
          id: row.id || undefined,
          new_id: row.new_id || undefined,
          name: row.name,
          price: parseFloat(row.price),
          category: row.category,
          sortOrder: parseInt(row.sortOrder, 10) || 0,
          isRecommended: row.isRecommended === 'TRUE' || row.isRecommended === '1' || row.isRecommended === true,
          isAvailable: !(row.isAvailable === 'FALSE' || row.isAvailable === '0' || row.isAvailable === false), // Default to true
        })).filter(d => (d.id || d.new_id) && d.name && !isNaN(d.price) && d.category);
        
        if (parsedDishes.length === 0) {
            sonnerToast.error("导入失败", { description: "CSV文件为空或格式不正确。" });
            setDialogState(null);
            return;
        }
        setImportingDishes(parsedDishes);
      },
      error: (error: any) => {
        sonnerToast.error('文件解析失败', { description: error.message });
        setDialogState(null);
      }
    });
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (!importingDishes || dialogState?.type !== 'import-csv') return;
    
    startImportTransition(async () => {
      const result = await batchUpdateDishesAction(dialogState.restaurant.id, importingDishes);
      if (result?.success) {
        sonnerToast.success('导入成功', { description: `${importingDishes.length}个菜品已成功处理。` });
        onRestaurantAdded();
      } else {
        sonnerToast.error('导入失败', { description: result?.error || '发生未知错误。' });
      }
      setDialogState(null);
      setImportingDishes(null);
    });
  };

  const openEditDialog = (restaurant: Restaurant) => {
    setNewName(restaurant.name);
    setDialogState({ type: 'edit', restaurant });
  };
  
  const handleAction = (state: DialogState) => {
    if (state?.type === 'edit') {
      openEditDialog(state.restaurant);
    } else if (state?.type === 'recharge') {
        setRechargeAmount('');
    }
    setDialogState(state);
  };
  
  const handleCopyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      sonnerToast.success(`ID 已复制: ${id}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }, () => {
      sonnerToast.error('复制失败');
    });
  };
  
  const renderAlertDialogs = () => {
    if (!dialogState || ['edit', 'recharge', 'sync-settings', 'import-csv', 'view-dishes'].includes(dialogState.type)) return null;

    const isDeleting = dialogState.type === 'delete';
    const title = isDeleting ? "确认删除餐馆?" : "确认清空数据?";
    const description = isDeleting ? (
      <>
        您确定要删除餐馆 <span className="font-bold text-primary">"{dialogState.restaurant.name}"</span> 吗?
        <br />
        此操作将永久删除该餐馆的所有数据，包括菜单、设置和订单记录。
        <strong className="text-destructive">此操作无法撤销。</strong>
      </>
    ) : (
      <>
        您确定要清空餐馆 <span className="font-bold text-primary">"{dialogState.restaurant.name}"</span> 的所有数据吗?
        <br />
        此操作将删除所有菜品和订单，并将所有设置重置为默认值。
        <strong className="text-destructive">此操作无法撤销。</strong>
      </>
    );
    const actionText = isPending ? (isDeleting ? '删除中...' : '清空中...') : (isDeleting ? '确认删除' : '确认清空');
    const Icon = isDeleting ? Trash2 : RotateCcw;
    
    const onConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault(); 
        if (isDeleting) {
            handleDelete();
        } else {
            handleClearData();
        }
    };

    return (
        <AlertDialog open={!!dialogState} onOpenChange={(open) => !open && setDialogState(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>取消</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
                {actionText}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
  };
  
  const renderEditDialog = () => {
      if(dialogState?.type !== 'edit') return null;
      return (
        <Dialog open={true} onOpenChange={(open) => !open && setDialogState(null)}>
            <DialogContent>
                <form onSubmit={handleEditName}>
                    <DialogHeader>
                        <DialogTitle>修改餐馆名称</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="restaurant-name">新名称</Label>
                        <Input
                            id="restaurant-name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            required
                            disabled={isPending}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost" disabled={isPending}>取消</Button></DialogClose>
                        <Button type="submit" disabled={isPending || !newName.trim()}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            保存
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      )
  }

  const renderRechargeDialog = () => {
      if(dialogState?.type !== 'recharge') return null;
      return (
        <Dialog open={true} onOpenChange={(open) => !open && setDialogState(null)}>
            <DialogContent>
                <form onSubmit={handleRecharge}>
                    <DialogHeader>
                        <DialogTitle>充值点数 - {dialogState.restaurant.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="recharge-amount">充值点数</Label>
                        <Input
                            id="recharge-amount"
                            type="number"
                            value={rechargeAmount}
                            onChange={(e) => setRechargeAmount(e.target.value)}
                            placeholder="输入要增加的点数"
                            required
                            min="1"
                            disabled={isPending}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost" disabled={isPending}>取消</Button></DialogClose>
                        <Button type="submit" disabled={isPending || !rechargeAmount.trim()}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                            确认充值
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      )
  }

  const renderSyncSettingsSheet = () => {
    if (dialogState?.type !== 'sync-settings') return null;
    return (
        <SyncSettingsSheet
            open={true}
            onOpenChange={(open) => !open && setDialogState(null)}
            restaurant={dialogState.restaurant}
            initialSettings={dialogState.settings}
            onSettingsUpdated={() => {
                setDialogState(null);
                onRestaurantAdded();
            }}
        />
    )
  }
  
  const renderImportDialog = () => {
      if (!importingDishes || dialogState?.type !== 'import-csv') return null;
      return (
          <AlertDialog open={!!importingDishes} onOpenChange={(open) => !open && (setDialogState(null), setImportingDishes(null))}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>为 "{dialogState.restaurant.name}" 确认导入？</AlertDialogTitle>
                <AlertDialogDescription>
                    您即将从CSV文件批量处理 <span className="font-bold text-primary">{importingDishes?.length || 0}</span> 个菜品。
                    此操作将根据CSV文件中的ID和new_id来创建、更新或重命名菜品数据。此操作无法撤销。
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isImportPending} onClick={() => (setDialogState(null), setImportingDishes(null))}>取消</AlertDialogCancel>
                <Button variant="destructive" onClick={handleConfirmImport} disabled={isImportPending}>
                    {isImportPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    确认导入
                </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )
  }

  const renderViewDishesSheet = () => {
    if (dialogState?.type !== 'view-dishes') return null;
    return (
        <ViewDishesSheet
            restaurant={dialogState.restaurant}
            open={true}
            onOpenChange={(open) => !open && setDialogState(null)}
        />
    );
  };


  return (
    <div className="grid gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
        
        <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="按名称或ID搜索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-full"
                />
            </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
                    <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
                <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
                <SheetTrigger asChild>
                    <Button size="icon" aria-label="添加新餐馆"><PlusCircle className="h-4 w-4" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-sm">
                    <SheetHeader>
                    <SheetTitle>添加新餐馆</SheetTitle>
                    <SheetDescription>
                        输入新餐馆的名称，点击添加即可创建。
                    </SheetDescription>
                    </SheetHeader>
                    <form ref={formRef} action={formAction} className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">餐馆名称</Label>
                        <Input id="name" name="name" placeholder="例如：小四川总店" required />
                    </div>
                    <SheetFooter>
                        <SheetClose asChild>
                        <Button type="button" variant="secondary">取消</Button>
                        </SheetClose>
                        <AddRestaurantButton />
                    </SheetFooter>
                    </form>
                    <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                    </SheetClose>
                </SheetContent>
                </Sheet>
            </div>
        </div>
        
        <div className="border overflow-hidden rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="py-3 px-2">名称</TableHead>
                <TableHead className="py-3 px-2">剩余点数</TableHead>
                <TableHead className="text-right py-3 px-2">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                ) : paginatedRestaurants.length > 0 ? paginatedRestaurants.map((r, index) => (
                    <RestaurantRow 
                        key={r.id} 
                        restaurant={r} 
                        onAction={handleAction} 
                        onRefresh={(id) => handleRefreshPoints(id)}
                        onImport={handleImportClick}
                        onExport={handleExportCSV}
                        onViewLogs={setViewingLogsFor}
                        index={index}
                        refreshingId={refreshingId}
                        copiedId={copiedId}
                        onCopy={handleCopyToClipboard}
                    />
                )) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    {searchQuery ? "未找到匹配的餐馆" : "还没有餐馆，请先添加一个。"}
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
        {totalPages > 1 && (
            <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">总共 {filteredRestaurants.length} 个餐馆. 第 {currentPage} 页 / {totalPages} 页</div>
                <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="mr-2 h-4 w-4" />上一页</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>下一页<ChevronRight className="ml-2 h-4 w-4" /></Button>
                </div>
            </div>
        )}
      
      {renderAlertDialogs()}
      {renderEditDialog()}
      {renderRechargeDialog()}
      {renderSyncSettingsSheet()}
      {renderImportDialog()}
      {renderViewDishesSheet()}

      <PointLogsSheet 
        restaurant={viewingLogsFor}
        open={!!viewingLogsFor}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setViewingLogsFor(null);
          }
        }}
      />
    </div>
  );
}

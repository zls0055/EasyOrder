
'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import type { PointCard, Restaurant } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Clipboard, ClipboardCheck, History, X, RotateCcw, ChevronLeft, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { createPointCards, deletePointCard } from '@/lib/settings';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';


interface PointCardListProps {
    restaurants: Restaurant[];
    newCards: PointCard[];
    usedCards: PointCard[];
    isNewCardsLoading: boolean;
    isUsedCardsLoading: boolean;
    fetchNewCards: () => void;
    fetchUsedCards: () => void;
    onCardsCreated: () => void;
}

function CreatePointCardSheet({ onCardsCreated }: { onCardsCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isCreating, startCreateTransition] = useTransition();
  const [createAmount, setCreateAmount] = useState('1');
  const [createPoints, setCreatePoints] = useState('1000');

  const handleCreateCards = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(createAmount, 10);
    const points = parseInt(createPoints, 10);

    if (isNaN(amount) || amount <= 0 || isNaN(points) || points <= 0) {
      toast.error('请输入有效的数量和点数');
      return;
    }

    startCreateTransition(async () => {
      try {
        await createPointCards(amount, points);
        toast.success(`成功创建 ${amount} 张面值为 ${points} 的点卡。`);
        onCardsCreated();
        setOpen(false);
      } catch (error) {
        toast.error('创建点卡失败', { description: error instanceof Error ? error.message : '未知错误' });
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
            <Button size="icon" aria-label="添加新点卡"><PlusCircle className="h-4 w-4" /></Button>
        </SheetTrigger>
        <SheetContent>
            <form onSubmit={handleCreateCards} className="flex flex-col h-full">
            <SheetHeader>
                <SheetTitle>生成新点卡</SheetTitle>
                <SheetDescription>
                输入需要生成的点卡数量和每张卡的面值。
                </SheetDescription>
            </SheetHeader>
            <div className="py-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-2">
                <Label htmlFor="create-amount">生成数量</Label>
                <Input id="create-amount" type="number" value={createAmount} onChange={(e) => setCreateAmount(e.target.value)} required min="1" disabled={isCreating} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="create-points">单张面值 (点)</Label>
                <Input id="create-points" type="number" value={createPoints} onChange={(e) => setCreatePoints(e.target.value)} required min="1" disabled={isCreating} />
                </div>
            </div>
            <SheetFooter>
                <SheetClose asChild>
                <Button type="button" variant="ghost" disabled={isCreating}>取消</Button>
                </SheetClose>
                <Button type="submit" disabled={isCreating}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {isCreating ? '生成中...' : '确认生成'}
                </Button>
            </SheetFooter>
            </form>
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

const ITEMS_PER_PAGE = 10;

export default function PointCardList({ 
    restaurants, 
    newCards,
    usedCards,
    isNewCardsLoading,
    isUsedCardsLoading,
    fetchNewCards,
    fetchUsedCards,
    onCardsCreated,
}: PointCardListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('new');
  const [deletingCard, setDeletingCard] = useState<PointCard | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  
  const [newCardsPage, setNewCardsPage] = useState(1);
  const [usedCardsPage, setUsedCardsPage] = useState(1);
  
  const totalNewPages = Math.ceil(newCards.length / ITEMS_PER_PAGE);
  const totalUsedPages = Math.ceil(usedCards.length / ITEMS_PER_PAGE);

  const paginatedNewCards = useMemo(() => {
    const startIndex = (newCardsPage - 1) * ITEMS_PER_PAGE;
    return newCards.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [newCards, newCardsPage]);

  const paginatedUsedCards = useMemo(() => {
    const startIndex = (usedCardsPage - 1) * ITEMS_PER_PAGE;
    return usedCards.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [usedCards, usedCardsPage]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'used' && usedCards.length === 0) {
      fetchUsedCards();
    }
  };

  const handleCopyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      toast.success('卡密已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 1500);
    }, () => {
      toast.error('复制失败');
    });
  };
  
  const handleDeleteCard = () => {
    if (!deletingCard) return;

    startDeleteTransition(async () => {
      const result = await deletePointCard(deletingCard.id);
      if (result.success) {
        toast.success(`点卡 ${deletingCard.id} 已删除。`);
        fetchNewCards(); // Refresh the list
      } else {
        toast.error('删除失败', { description: result.error });
      }
      setDeletingCard(null);
    });
  };

  const getRestaurantNameById = (id: string | null) => {
    if (!id) return 'N/A';
    const restaurant = restaurants.find(r => r.id === id);
    return restaurant?.name || id;
  };

  const isRefreshing = isNewCardsLoading || isUsedCardsLoading;

  return (
     <>
        <div className="flex flex-row items-center justify-between ">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="new">未使用 ({newCards.length})</TabsTrigger>
                    <TabsTrigger value="used">已使用</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={activeTab === 'new' ? fetchNewCards : fetchUsedCards} disabled={isRefreshing}>
                <RotateCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <CreatePointCardSheet onCardsCreated={onCardsCreated} />
            </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="new" className="mt-0">
                <div className="border rounded-lg overflow-hidden">
                    <div className="hidden sm:block overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>卡密</TableHead>
                            <TableHead>创建时间</TableHead>
                            <TableHead className="text-right">面值</TableHead>
                            <TableHead className="text-right w-[100px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isNewCardsLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : paginatedNewCards.length > 0 ? (
                            paginatedNewCards.map((card) => (
                                <TableRow key={card.id}>
                                <TableCell className="font-mono text-xs">
                                    {card.id}
                                </TableCell>
                                <TableCell>{new Date(card.createdAt).toLocaleString('zh-CN')}</TableCell>
                                <TableCell className="text-right">{card.points}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyToClipboard(card.id)}>
                                        {copiedId === card.id ? <ClipboardCheck className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingCard(card)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))
                            ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                没有可用的新点卡。
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                    <div className="block sm:hidden space-y-4 p-4">
                        {isNewCardsLoading ? (
                            <div className="text-center h-24 flex items-center justify-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : paginatedNewCards.length > 0 ? (
                            paginatedNewCards.map((card) => (
                                <Card key={card.id} className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-lg text-primary">{card.points} 点</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                创建于: {new Date(card.createdAt).toLocaleString('zh-CN')}
                                            </p>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleCopyToClipboard(card.id)}>
                                                    {copiedId === card.id ? <ClipboardCheck className="mr-2 h-4 w-4 text-green-500" /> : <Clipboard className="mr-2 h-4 w-4" />}
                                                    <span>{copiedId === card.id ? '已复制' : '复制卡密'}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setDeletingCard(card)} className="text-destructive">
                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                  <span>删除</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-2">
                                        <div className="flex items-center">
                                            <span className="shrink-0">卡密:</span>
                                            <p className="font-mono text-xs ml-2 truncate">{card.id}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <p className="h-24 text-center text-muted-foreground flex items-center justify-center">没有可用的新点卡。</p>
                        )}
                    </div>
                </div>
                 {totalNewPages > 1 && (
                    <div className="flex items-center justify-between py-4 px-4 border-t">
                        <div className="text-xs text-muted-foreground">总共 {newCards.length} 条. 第 {newCardsPage} 页 / {totalNewPages} 页</div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setNewCardsPage(p => Math.max(1, p - 1))} disabled={newCardsPage === 1}><ChevronLeft className="mr-2 h-4 w-4" />上一页</Button>
                            <Button variant="outline" size="sm" onClick={() => setNewCardsPage(p => Math.min(totalNewPages, p + 1))} disabled={newCardsPage === totalNewPages}>下一页<ChevronRight className="ml-2 h-4 w-4" /></Button>
                        </div>
                    </div>
                )}
            </TabsContent>
            <TabsContent value="used" className="mt-0">
                 <div className="border rounded-lg overflow-hidden">
                    <div className="hidden sm:block overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>使用时间</TableHead>
                            <TableHead>卡密</TableHead>
                            <TableHead>使用餐馆</TableHead>
                            <TableHead className="text-right">面值</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isUsedCardsLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : paginatedUsedCards.length > 0 ? (
                            paginatedUsedCards.map((card) => (
                                <TableRow key={card.id}>
                                <TableCell>{card.usedAt ? new Date(card.usedAt).toLocaleString('zh-CN') : '-'}</TableCell>
                                <TableCell className="font-mono text-xs">{card.id}</TableCell>
                                <TableCell>{getRestaurantNameById(card.usedBy)}</TableCell>
                                <TableCell className="text-right">{card.points}</TableCell>
                                </TableRow>
                            ))
                            ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                没有已使用的点卡记录。
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                    <div className="block sm:hidden space-y-4 p-4">
                         {isUsedCardsLoading ? (
                            <div className="text-center h-24 flex items-center justify-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : paginatedUsedCards.length > 0 ? (
                            paginatedUsedCards.map((card) => (
                                <Card key={card.id} className="p-4">
                                     <div className="flex justify-between items-start">
                                        <p className="font-medium text-lg text-primary">{card.points} 点</p>
                                        <Badge variant="secondary">已使用</Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                        <p><span className="w-20 inline-block">使用者:</span> <span className="font-medium text-foreground">{getRestaurantNameById(card.usedBy)}</span></p>
                                        <p><span className="w-20 inline-block">使用于:</span> {card.usedAt ? new Date(card.usedAt).toLocaleString('zh-CN') : '-'}</p>
                                        <p><span className="w-20 inline-block">卡密:</span> <span className="font-mono text-xs">{card.id}</span></p>
                                    </div>
                                </Card>
                            ))
                        ) : (
                             <p className="h-24 text-center text-muted-foreground flex items-center justify-center">没有已使用的点卡记录。</p>
                        )}
                    </div>
                 </div>
                 {totalUsedPages > 1 && (
                    <div className="flex items-center justify-between py-4 px-4 border-t">
                        <div className="text-xs text-muted-foreground">总共 {usedCards.length} 条. 第 {usedCardsPage} 页 / {totalUsedPages} 页</div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setUsedCardsPage(p => Math.max(1, p - 1))} disabled={usedCardsPage === 1}><ChevronLeft className="mr-2 h-4 w-4" />上一页</Button>
                            <Button variant="outline" size="sm" onClick={() => setUsedCardsPage(p => Math.min(totalUsedPages, p + 1))} disabled={usedCardsPage === totalUsedPages}>下一页<ChevronRight className="ml-2 h-4 w-4" /></Button>
                        </div>
                    </div>
                )}
            </TabsContent>
        </Tabs>

        <AlertDialog open={!!deletingCard} onOpenChange={(open) => !open && setDeletingCard(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确认删除点卡？</AlertDialogTitle>
                    <AlertDialogDescription>
                        您确定要删除点卡 <span className="font-mono text-sm bg-muted px-1 py-0.5 rounded">{deletingCard?.id}</span> 吗？
                        此操作无法撤销。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletePending}>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCard} disabled={isDeletePending} className="bg-destructive hover:bg-destructive/90">
                       {isDeletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        确认删除
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}


'use client';

import React, { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { verifyKitchenPassword } from '@/lib/session';
import { useRouter } from 'next/navigation';

function VerifyButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" className="w-full" disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
      进入
    </Button>
  );
}

interface VerifyKitchenFormProps {
    restaurantId: string;
}

export default function VerifyKitchenForm({ restaurantId }: VerifyKitchenFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;

    startTransition(async () => {
      const result = await verifyKitchenPassword(restaurantId, password);
      if (result.success) {
        toast.success('验证成功！');
        router.push(`/${restaurantId}/orders`);
      } else {
        toast.error('验证失败', { description: result.error });
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <KeyRound className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl font-bold">厨房看板访问</CardTitle>
          <CardDescription>请输入访问密码以查看最新订单</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">访问密码</Label>
              <Input id="password" name="password" type="password" required disabled={isPending} />
            </div>
            <VerifyButton isPending={isPending} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

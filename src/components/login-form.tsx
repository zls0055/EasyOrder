
'use client';

import React, { useTransition } from 'react';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, LogIn } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

function LoginButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" className="w-full" disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
      登录
    </Button>
  );
}

interface LoginFormProps {
    restaurantId: string;
}

export default function LoginForm({ restaurantId }: LoginFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      // Pass restaurantId explicitly to the login action
      const state = await login(restaurantId, undefined, formData);
      if (state?.error) {
        sonnerToast.error('登录失败', {
          description: state.error,
        });
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <KeyRound className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl font-bold">管理后台登录</CardTitle>
          <CardDescription>请输入您的管理员凭据以继续</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" name="username" type="text" placeholder="admin" required defaultValue="admin" disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" required disabled={isPending} />
            </div>
            <LoginButton isPending={isPending} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

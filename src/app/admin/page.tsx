
'use client';

import { useTransition } from 'react';
import { loginSuperAdmin } from '@/lib/session';
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

export default function SuperAdminLoginPage() {
  const [isPending, startTransition] = useTransition();

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;

    startTransition(async () => {
      const result = await loginSuperAdmin(password);
      if (result?.error) {
        sonnerToast.error('登录失败', {
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <KeyRound className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl font-bold">超级管理员登录</CardTitle>
          <CardDescription>请输入密码以管理所有餐馆</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
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

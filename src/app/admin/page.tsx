
import { getSuperAdminSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import SuperAdminLoginForm from '@/components/super-admin-login-form';

export default async function SuperAdminLoginPage() {
  const session = await getSuperAdminSession();
  if (session) {
    redirect('/admin/dashboard');
  }

  return <SuperAdminLoginForm />;
}

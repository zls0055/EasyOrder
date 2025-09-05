
import { getSuperAdminSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';

export default async function SuperAdminDashboard() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/admin');
  }

  // The client component will now fetch its own data.
  return <DashboardClient />;
}

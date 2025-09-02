import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Toaster as OldToaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EasyOrder - 在线点餐系统',
  description: '一个简单易用的在线点餐系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow relative">
            {children}
          </main>
        </div>
        <Toaster />
        <OldToaster />
      </body>
    </html>
  );
}

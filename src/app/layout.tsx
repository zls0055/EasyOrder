import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google'; // Using Geist as a clean sans-serif font
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is globally available if needed, or in page.

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EasyOrder - Restaurant Ordering System',
  description: 'A simple and easy-to-use restaurant ordering system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        {children}
        {/* Toaster can also be placed here if preferred over page-specific placement */}
      </body>
    </html>
  );
}

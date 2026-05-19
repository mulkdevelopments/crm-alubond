import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MobileNav } from '@/components/shell/MobileNav';

export const metadata: Metadata = {
  title: 'Alubond CRM — Sales Intelligence',
  description:
    'A modern, mobile-first sales war room for façade systems and ACP — built for Alubond.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0B' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 pb-24 lg:pb-12">{children}</main>
            <MobileNav />
          </div>
        </div>
      </body>
    </html>
  );
}

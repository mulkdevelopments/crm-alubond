import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ProtectedApp } from '@/components/auth/ProtectedApp';

export const metadata: Metadata = {
  title: 'Alubond CRM — Sales Intelligence',
  applicationName: 'Alubond CRM',
  description:
    'A modern, mobile-first sales war room for façade systems and ACP — built for Alubond.',
  appleWebApp: {
    capable: true,
    title: 'Alubond CRM',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='alubond-theme';var s=localStorage.getItem(k);var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <ProtectedApp>{children}</ProtectedApp>
      </body>
    </html>
  );
}

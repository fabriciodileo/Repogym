import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';

import '@/app/globals.css';
import { cn } from '@/lib/utils';

const headingFont = Manrope({
  subsets: ['latin'],
  variable: '--font-heading',
});

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className={cn('min-h-screen bg-dashboard text-ink-900 antialiased', headingFont.variable, monoFont.variable)}>
        {children}
      </body>
    </html>
  );
}

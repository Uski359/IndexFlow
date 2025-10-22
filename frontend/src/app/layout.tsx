import './globals.css';

import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Inter } from 'next/font/google';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Providers } from '@/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'IndexFlow | Decentralized Data Indexing Protocol',
  description:
    'IndexFlow is a decentralized data indexing and search engine combining Proof of Indexing, Proof of SQL, and tokenized incentives.',
  icons: {
    icon: '/favicon.svg'
  },
  metadataBase: new URL('https://indexflow.app')
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="bg-gradient-to-b from-[#0f0f1a] via-[#0a0a13] to-black text-white antialiased">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl px-6 py-12">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}

import type { ReactNode } from 'react';
import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { Toaster } from "react-hot-toast";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "IndexFlow Protocol",
  description: "Decentralized indexing and proof-of-SQL data layer for Web3 applications"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sora.className} bg-indexflow-bg text-indexflow-text`}>
        <AppProviders>
          {children}
          <Toaster position="bottom-right" />
        </AppProviders>
      </body>
    </html>
  );
}


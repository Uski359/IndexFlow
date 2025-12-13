"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiConfig } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

interface AppProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient();

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WagmiConfig config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="bottom-right" />
        </QueryClientProvider>
      </WagmiConfig>
    </ThemeProvider>
  );
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { WagmiConfig, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { injected } from '@wagmi/connectors';

import { CHAIN_ID } from '@/lib/contracts';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.sepolia.org';
const chain = (() => {
  switch (CHAIN_ID) {
    case sepolia.id:
    default:
      return sepolia;
  }
})();

const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: {
    [chain.id]: http(rpcUrl)
  }
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </WagmiConfig>
  );
}

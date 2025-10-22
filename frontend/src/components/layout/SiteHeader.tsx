'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

import { Button } from '@/components/ui/Button';
import { ProtocolStatusBadge } from '@/components/layout/ProtocolStatusBadge';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Submit Data', href: '/submit' },
  { label: 'Stake', href: '/stake' },
  { label: 'Curate', href: '/curate' },
  { label: 'Tokenomics', href: '/tokenomics' },
  { label: 'API Docs', href: '/api-docs' },
  { label: 'Profile', href: '/profile' },
  { label: 'Admin', href: '/admin' }
];

export function SiteHeader() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const showConnected = mounted && isConnected;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0f1ad9] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center space-x-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-semibold text-white shadow-glass">
            IF
          </span>
          <div>
            <p className="text-base font-semibold">IndexFlow</p>
            <p className="text-xs text-white/60">Decentralized Data Graph</p>
          </div>
        </Link>

        <nav className="hidden items-center space-x-4 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-3">
          <ProtocolStatusBadge />
          {showConnected ? (
            <>
              <span className="hidden text-sm font-medium text-white/70 sm:inline-block">
                {shortAddress}
              </span>
              <Button variant="secondary" size="sm" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                if (!mounted) return;
                const connector = connectors[0];
                if (!connector) {
                  toast.error('No wallet connector available.');
                  return;
                }
                connect({ connector });
              }}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

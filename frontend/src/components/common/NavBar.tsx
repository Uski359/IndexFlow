"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { WalletButton } from "@/components/common/WalletButton";

const links = [
  { href: "#features", label: "Features" },
  { href: "#proofs", label: "Proof Model" },
  { href: "#tokenomics", label: "Tokenomics" },
  { href: "/dashboard", label: "Dashboard" }
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-indexflow-bg/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-white">
          <Image src="/logo.svg" alt="IndexFlow logo" width={40} height={40} priority className="h-10 w-10" />
          <span className="leading-tight">IndexFlow</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden md:block">
            <WalletButton />
          </div>
        </div>
      </div>
      <div className="px-6 pb-4 md:hidden">
        <WalletButton />
      </div>
    </header>
  );
}

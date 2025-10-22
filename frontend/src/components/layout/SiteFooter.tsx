import Link from 'next/link';

const footerLinks = [
  { label: 'Docs', href: '/api-docs' },
  { label: 'Tokenomics', href: '/tokenomics' },
  { label: 'GitHub', href: 'https://github.com/indexflow' },
  { label: 'Discord', href: '#' }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">
            IndexFlow &mdash; Decentralized Data Indexing Protocol
          </p>
          <p className="text-xs text-white/50">
            (c) {new Date().getFullYear()} IndexFlow DAO. All rights reserved.
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-4 text-sm text-white/60">
          {footerLinks.map((link) => (
            <li key={link.label}>
              <Link
                className="hover:text-white transition-colors"
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

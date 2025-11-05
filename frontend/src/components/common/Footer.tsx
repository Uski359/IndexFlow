import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-black/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
        <p>&copy; {year} IndexFlow Labs. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="https://docs.example.com" className="hover:text-white" target="_blank" rel="noreferrer">
            Docs
          </Link>
          <Link href="https://github.com/indexflow" className="hover:text-white" target="_blank" rel="noreferrer">
            GitHub
          </Link>
          <Link href="mailto:hello@indexflow.io" className="hover:text-white">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}

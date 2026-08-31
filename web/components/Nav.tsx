"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const links = [
  { href: "/", label: "Home" },
  { href: "/mint", label: "Mint" },
  { href: "/dashboard", label: "Broker Desk" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-acid text-lg font-black text-ink shadow-glow">
            S
          </span>
          <span className="text-lg font-black tracking-tight acid-text">
            STONK<span className="text-gold">INU</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-sm px-3 py-1.5 text-sm uppercase tracking-wide transition ${
                  active
                    ? "bg-line text-acid"
                    : "text-acidDim hover:text-acid"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <ConnectButton showBalance={false} chainStatus="icon" />
      </div>
    </header>
  );
}

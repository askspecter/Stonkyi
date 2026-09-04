"use client";

import Link from "next/link";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { short } from "@/lib/format";

const links = [
  { href: "/", label: "Home" },
  { href: "/mint", label: "Mint" },
  { href: "/swap", label: "Swap Desk" },
  { href: "/dashboard", label: "Broker Desk" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-line bg-coal/70 px-4 py-2.5 backdrop-blur-xl sm:px-5">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="StonkInu" className="pixel h-7 w-7 rounded-lg" />
          <span className="display text-xl leading-none">StonkInu</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="label hover:text-acid transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-mist md:hidden"
          >
            <span className="text-lg leading-none">≡</span>
          </button>
          <ConnectPill />
        </div>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-6xl rounded-2xl border border-line bg-coal/90 p-2 backdrop-blur-xl md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="label block rounded-xl px-4 py-3 hover:bg-panel hover:text-acid"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

function ConnectPill() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <button
            onClick={connected ? openAccountModal : openConnectModal}
            className="btn-acid rounded-full px-5 py-2 text-xs"
          >
            {connected ? short(account.address) : "Connect"}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

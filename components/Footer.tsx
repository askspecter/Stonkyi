import Link from "next/link";
import { Leaf, XIcon } from "./Icons";

export function Footer() {
  return (
    <footer className="border-t border-line px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-acid" />
          <span className="display text-2xl">StonkInu</span>
        </div>
        <p className="mt-3 max-w-md text-lg text-mist">
          Your broker buys you stocks. You own your broker.
        </p>

        <div className="mt-6 flex items-center gap-3 text-mist">
          <a href="#" aria-label="X" className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-acid/50 hover:text-acid transition-colors">
            <XIcon className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-10 grid gap-8 border-t border-line pt-8 sm:grid-cols-3">
          <div>
            <div className="label">Venue</div>
            <ul className="mt-3 space-y-2 text-sm text-mist">
              <li><Link href="/mint" className="hover:text-acid">Mint a broker</Link></li>
              <li><Link href="/dashboard" className="hover:text-acid">Broker desk</Link></li>
            </ul>
          </div>
          <div>
            <div className="label">Protocol</div>
            <ul className="mt-3 space-y-2 text-sm text-mist">
              <li>$STONKINU · ERC-20</li>
              <li>999 brokers · ERC-6551</li>
              <li>Auto stock distribution</li>
            </ul>
          </div>
          <div>
            <div className="label">Disclaimer</div>
            <p className="mt-3 text-sm text-mist">
              Experimental, unaudited protocol. Nothing here is financial advice.
              Do your own research.
            </p>
          </div>
        </div>

        <div className="label mt-10 opacity-60">© StonkInu · the desk is open</div>
      </div>
    </footer>
  );
}

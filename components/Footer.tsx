import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2">
          <span className="serif text-3xl">StonkInu</span>
          <span className="text-acid">🌿</span>
        </div>
        <p className="serif mt-3 max-w-md text-xl italic text-mist">
          Your broker buys you stocks. You own your broker.
        </p>

        <div className="mt-6 flex items-center gap-4 text-mist">
          <a href="#" aria-label="X" className="hover:text-acid transition-colors">𝕏</a>
          <a href="#" aria-label="Discord" className="hover:text-acid transition-colors">◈</a>
          <a href="#" aria-label="Telegram" className="hover:text-acid transition-colors">✈</a>
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

        <div className="label mt-10 opacity-60">© StonkInu — the desk is open</div>
      </div>
    </footer>
  );
}

import { Reveal } from "./Reveal";

export function DeskTerminal() {
  return (
    <section className="relative px-5 py-24 sm:py-28">
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <div>
            <div className="label">Not hired bots</div>
            <h2 className="display mt-4 text-4xl sm:text-5xl">
              Each broker is <em className="text-acid">the desk</em> itself.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-mist">
              Its own ERC-6551 wallet. Its own book of tokenized stock. Stock is bought on-chain and
              settled straight to the broker — hold it, and the book is yours.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="glass rounded-2xl p-4 font-mono text-sm">
            {/* header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="label !text-[10px] normal-case tracking-[0.14em]">
                Broker #0412 · The desk
              </span>
              <span className="rounded-full border border-acid/30 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-acid">
                Simulation
              </span>
            </div>

            {/* order confirm */}
            <div className="mt-4 rounded-xl border border-line p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-acid">Confirm the order</div>
              <div className="mt-2 leading-snug text-[#e9efe9]">
                Buy $20.00 of AAPL if it
                <br />
                falls to $300.00
                <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-acid" />
              </div>
              <div className="mt-3 text-xs leading-relaxed text-mist">
                Held by the order book until the price is met. Escrow returns to Broker #0412 either
                way.
              </div>
              <div className="mt-4 flex gap-3 text-xs">
                <span className="rounded-lg border border-line px-4 py-2 text-mist">Working…</span>
                <span className="rounded-lg px-4 py-2 text-mist">Cancel</span>
              </div>
            </div>

            {/* filled */}
            <div className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-mist">
              Filled · one signature
            </div>
            <div className="mt-3 rounded-xl border border-line bg-coal/40 p-4 leading-snug text-[#e9efe9]">
              Filled: bought $20.00 of AAPL. The stock is in the broker&apos;s wallet.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

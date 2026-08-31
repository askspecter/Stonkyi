const steps = [
  {
    n: "01",
    title: "Burn 50,000 $STONKINU",
    body: "Every broker hired permanently destroys 50k $STONKINU. Supply only ever goes down — the collection is deflationary by design.",
  },
  {
    n: "02",
    title: "Pay the 0.002 ETH desk fee",
    body: "A flat mint fee splits automatically, on-chain, in the same transaction. No manual steps, no admin keys pulling levers.",
  },
  {
    n: "03",
    title: "Get your ERC-6551 wallet",
    body: "Your broker mints with its own token-bound account — a real on-chain wallet that holds stock, airdrops and rewards, and moves with the NFT.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mt-16">
      <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
        How the <span className="acid-text">desk</span> works
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="panel rounded-lg p-5">
            <div className="text-4xl font-black text-line">{s.n}</div>
            <div className="mt-2 text-lg font-bold text-acid">{s.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-acidDim">{s.body}</p>
          </div>
        ))}
      </div>

      {/* Fee split diagram */}
      <div className="mt-8 panel rounded-lg p-6">
        <div className="text-[11px] uppercase tracking-widest text-acidDim">
          Automatic split of the 0.002 ETH mint fee
        </div>
        <div className="mt-5 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_1fr]">
          <div className="grid place-items-center rounded-md border border-acid/40 bg-ink/60 p-5 text-center">
            <div className="text-3xl font-black acid-text">0.002 ETH</div>
            <div className="mt-1 text-xs uppercase tracking-widest text-acidDim">
              Mint fee
            </div>
          </div>

          <div className="hidden place-items-center text-2xl text-acid md:grid">→</div>

          <div className="rounded-md border border-line bg-ink/60 p-5">
            <div className="text-2xl font-black text-gold">0.001 ETH</div>
            <div className="mt-1 text-sm font-semibold text-acid">Buy stock → holders</div>
            <p className="mt-2 text-xs leading-relaxed text-acidDim">
              Swapped into tokenized stock and airdropped pro-rata to every
              existing broker holder. You earn on every mint after yours.
            </p>
          </div>

          <div className="rounded-md border border-line bg-ink/60 p-5">
            <div className="text-2xl font-black text-gold">0.001 ETH</div>
            <div className="mt-1 text-sm font-semibold text-acid">Protocol treasury</div>
            <p className="mt-2 text-xs leading-relaxed text-acidDim">
              Funds operations, liquidity and future desk features — Marketplace,
              Stonk Launcher, Broker Box and more.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

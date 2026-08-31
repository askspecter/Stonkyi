const features = [
  { icon: "🏦", title: "Marketplace / Swap Desk", body: "Trade brokers and stock certificates with $STONKINU + a small ETH fee.", soon: true },
  { icon: "🚀", title: "Stonk Launcher", body: "Launchpad for new stock tokens — bonding curve or fixed price.", soon: true },
  { icon: "🔒", title: "Safety Deposit Box", body: "Lock Uniswap V3/V4 LP positions with time-locked custody.", soon: true },
  { icon: "🎰", title: "Broker Box", body: "Gacha crates that pay out stock-token certificates.", soon: true },
  { icon: "💸", title: "Loan Vault", body: "Borrow against your brokers and their accrued stock.", soon: true },
  { icon: "📈", title: "Staking & Covered Calls", body: "Stake for tiers, write covered calls on your stock stack.", soon: true },
];

export function Features() {
  return (
    <section id="features" className="mt-16">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
          The <span className="acid-text">trading floor</span>
        </h2>
        <span className="text-[11px] uppercase tracking-widest text-acidDim">
          Roadmap
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="panel group relative rounded-lg p-5 transition hover:border-acid/40"
          >
            <div className="text-3xl">{f.icon}</div>
            <div className="mt-3 flex items-center gap-2">
              <h3 className="text-base font-bold text-acid">{f.title}</h3>
              {f.soon && (
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold">
                  Soon
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-acidDim">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

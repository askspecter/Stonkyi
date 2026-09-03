import { Reveal } from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Burn to hire",
    body: "Mint a broker by burning 50,000 $STONKINU and paying a 0.002 ETH desk fee. Every hire destroys supply for good — the collection is deflationary by design.",
  },
  {
    n: "02",
    title: "The fee splits itself",
    body: "In the same transaction, the desk fee is split on-chain — no admin, no manual step.",
    split: true,
  },
  {
    n: "03",
    title: "Claim your stock",
    body: "Stock accrues to every broker you hold. Pull it any time from the Broker Desk — and since rewards follow the NFT, selling the broker sells the yield with it.",
  },
];

export function Steps() {
  return (
    <section id="how" className="px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="label">How the desk works</div>
          <h2 className="display mt-4 max-w-2xl text-4xl sm:text-5xl">
            One transaction. <span className="text-acid">The whole loop.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="flex h-full flex-col rounded-2xl border border-line bg-panel/50 p-7">
                <div className="display text-5xl text-line">{s.n}</div>
                <h3 className="mt-4 text-xl font-semibold text-[#eef3ea]">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mist">{s.body}</p>

                {s.split && (
                  <div className="mt-5 space-y-2.5">
                    <SplitRow amount="0.001 ETH" label="Buys stock → airdropped to holders" />
                    <SplitRow amount="0.001 ETH" label="Funds the protocol" muted />
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SplitRow({ amount, label, muted }: { amount: string; label: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-coal/50 px-3.5 py-2.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${muted ? "bg-mist" : "bg-acid"}`} />
      <span className="font-mono text-sm text-[#e9efe9]">{amount}</span>
      <span className="text-xs text-mist">{label}</span>
    </div>
  );
}

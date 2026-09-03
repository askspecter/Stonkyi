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
    body: "In the same transaction the desk fee is split on-chain — no admin, no manual step.",
    split: true,
  },
  {
    n: "03",
    title: "Claim your stock",
    body: "Stock accrues to every broker you hold. Pull it any time from the Broker Desk — and since rewards follow the NFT, selling the broker sells the book with it.",
  },
];

export function Steps() {
  return (
    <section id="how" className="relative px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="label">How the desk works</div>
          <h2 className="display mt-4 max-w-2xl text-4xl sm:text-5xl">
            One transaction. <em className="text-acid">The whole loop.</em>
          </h2>
        </Reveal>

        <div className="mt-14 divide-y divide-line border-y border-line">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="grid gap-4 py-8 sm:grid-cols-[auto_1fr] sm:gap-10">
                <div className="label !text-sm text-acid sm:pt-1">{s.n}</div>
                <div>
                  <h3 className="display text-2xl sm:text-[1.7rem]">{s.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist sm:text-base">
                    {s.body}
                  </p>

                  {s.split && (
                    <div className="mt-5 grid max-w-xl gap-2.5 sm:grid-cols-2">
                      <SplitRow amount="0.001 ETH" label="Buys stock → airdropped to holders" />
                      <SplitRow amount="0.001 ETH" label="Funds the protocol" muted />
                    </div>
                  )}
                </div>
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
    <div className="rounded-xl border border-line bg-coal/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${muted ? "bg-mist" : "bg-acid"}`} />
        <span className="font-mono text-sm text-[#e9efe9]">{amount}</span>
      </div>
      <div className="mt-1.5 text-xs text-mist">{label}</div>
    </div>
  );
}

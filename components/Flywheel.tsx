import { Reveal } from "./Reveal";

type Node = { key: string; label: string; sub: string; pos: string };

const NODES: Node[] = [
  { key: "hire", label: "Hire", sub: "Burn 50K", pos: "left-1/2 top-0 -translate-x-1/2" },
  { key: "buy", label: "Buys", sub: "0.001 → stock", pos: "right-0 top-1/2 -translate-y-1/2" },
  { key: "airdrop", label: "Airdrop", sub: "To holders", pos: "left-1/2 bottom-0 -translate-x-1/2" },
  { key: "floor", label: "Floor", sub: "Protocol book", pos: "left-0 top-1/2 -translate-y-1/2" },
];

function Gem({ active }: { active?: boolean }) {
  return (
    <span className="relative grid h-14 w-14 place-items-center">
      <span
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(145deg,#e6ff7a,#8fae3a)",
          transform: "rotate(45deg)",
          boxShadow: active
            ? "0 0 34px rgba(200,242,78,0.7)"
            : "0 0 18px rgba(200,242,78,0.28)",
        }}
      />
      <span
        className="absolute rounded-lg"
        style={{
          inset: 9,
          transform: "rotate(45deg)",
          background: "linear-gradient(145deg,rgba(255,255,255,0.5),transparent)",
        }}
      />
    </span>
  );
}

export function Flywheel() {
  return (
    <section className="relative overflow-hidden px-5 py-24 sm:py-32">
      <div
        className="glow"
        style={{ width: 520, height: 520, top: "20%", left: "50%", marginLeft: -260, background: "#1f6b3a", opacity: 0.22 }}
      />
      <div className="relative z-[2] mx-auto max-w-5xl">
        <Reveal>
          <div className="label">The flywheel</div>
          <h2 className="display mt-4 max-w-2xl text-4xl sm:text-5xl">
            Every mint feeds the loop that makes <em>holding</em> worth it.
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mx-auto mt-16 aspect-square w-full max-w-[440px]">
            {/* rotating dotted ring */}
            <div className="absolute inset-8 animate-spinSlow">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="rgba(200,242,78,0.28)"
                  strokeWidth="0.5"
                  strokeDasharray="0.5 3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* center */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="label text-center leading-relaxed">
                Repeats
                <br />
                every
                <br />
                mint
              </div>
            </div>

            {/* nodes */}
            {NODES.map((n, i) => (
              <div key={n.key} className={`absolute ${n.pos} flex flex-col items-center gap-2`}>
                <Gem active={i === 0} />
                <div className="text-center">
                  <div className="label !tracking-[0.2em] text-acid">{n.label}</div>
                  <div className="mt-1 text-[11px] text-mist">{n.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Reveal } from "./Reveal";

const IDS = [23, 7, 168, 412, 88, 555, 314, 777, 42, 900, 250, 631];
const IDS_B = [111, 480, 66, 302, 719, 199, 850, 27, 540, 393, 621, 158];

function Marquee({ ids, reverse }: { ids: number[]; reverse?: boolean }) {
  const row = [...ids, ...ids];
  return (
    <div
      className="flex w-max gap-4"
      style={{
        animation: `marquee 46s linear infinite${reverse ? " reverse" : ""}`,
      }}
    >
      {row.map((id, i) => (
        <div
          key={i}
          className="lift group shrink-0 overflow-hidden rounded-2xl border border-line bg-panel"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/nft/images/${id}.png`}
            alt={`Broker #${id}`}
            className="pixel h-32 w-32 sm:h-40 sm:w-40"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

export function Collection() {
  return (
    <section className="overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="label">The collection</div>
              <h2 className="display mt-4 max-w-xl text-4xl sm:text-5xl">
                999 brokers, each <span className="text-acid">rolled on-chain.</span>
              </h2>
            </div>
            <Link href="/mint" className="btn-ghost rounded-full px-6 py-3 text-xs">
              See the roster
            </Link>
          </div>
        </Reveal>
      </div>

      <div className="relative mt-12 space-y-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#07090a] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#07090a] to-transparent" />
        <Marquee ids={IDS} />
        <Marquee ids={IDS_B} reverse />
      </div>
    </section>
  );
}

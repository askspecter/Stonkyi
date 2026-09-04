"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useReadContracts } from "wagmi";
import { STOCKS, STOCK_ADDRESSES, type Stock } from "@/lib/stocks";
import { abis, useDeployment } from "@/lib/useBroker";
import { fmtUnits } from "@/lib/format";
import { Reveal } from "./Reveal";

type Quote = { price: number; changePct: number; dir: 1 | -1 | 0 };
type Market = Record<string, Quote>;

const MarketCtx = createContext<Market>({});

/** Live-feeling price feed: a small random walk seeded near each stock's base. */
export function MarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState<Market>(() => {
    const m: Market = {};
    for (const s of STOCKS) m[s.symbol] = { price: s.base, changePct: 0, dir: 0 };
    return m;
  });
  const openRef = useRef<Record<string, number>>(
    Object.fromEntries(STOCKS.map((s) => [s.symbol, s.base]))
  );

  useEffect(() => {
    const tick = () => {
      setMarket((prev) => {
        const next: Market = {};
        for (const s of STOCKS) {
          const cur = prev[s.symbol]?.price ?? s.base;
          // gentle mean-reverting random walk
          const drift = (s.base - cur) * 0.02;
          const noise = (Math.random() - 0.5) * s.base * 0.004;
          const price = Math.max(0.01, cur + drift + noise);
          const open = openRef.current[s.symbol] ?? s.base;
          const changePct = ((price - open) / open) * 100;
          const dir: 1 | -1 | 0 = price > cur ? 1 : price < cur ? -1 : 0;
          next[s.symbol] = { price, changePct, dir };
        }
        return next;
      });
    };
    const id = setInterval(tick, 1600);
    return () => clearInterval(id);
  }, []);

  return <MarketCtx.Provider value={market}>{children}</MarketCtx.Provider>;
}

function useMarket() {
  return useContext(MarketCtx);
}

/** Real brand logo with a clean colored-monogram fallback.
 *  Tries a symbol logo source first, then the company domain, then a monogram. */
function StockLogo({ stock, size = 26 }: { stock: Stock; size?: number }) {
  const sources = useMemo(
    () => [
      `https://financialmodelingprep.com/image-stock/${stock.symbol}.png`,
      `https://logo.clearbit.com/${stock.domain}`,
    ],
    [stock.symbol, stock.domain]
  );
  const [idx, setIdx] = useState(0);
  const dim = { width: size, height: size };

  if (idx >= sources.length) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-full font-mono font-bold text-black"
        style={{ ...dim, background: stock.color, fontSize: size * 0.34 }}
      >
        {stock.symbol.slice(0, 2)}
      </span>
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white"
      style={dim}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources[idx]}
        alt={stock.symbol}
        width={size}
        height={size}
        className="h-full w-full object-contain p-0.5"
        onError={() => setIdx((v) => v + 1)}
        loading="lazy"
      />
    </span>
  );
}

function fmtPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TickerItem({ stock }: { stock: Stock }) {
  const q = useMarket()[stock.symbol];
  const up = (q?.changePct ?? 0) >= 0;
  return (
    <span className="mx-6 inline-flex items-center gap-2.5 whitespace-nowrap align-middle">
      <StockLogo stock={stock} size={22} />
      <span className="font-mono text-xs tracking-wide text-mist">{stock.symbol}</span>
      <span className="font-mono text-sm text-[#e9efe9]">${fmtPrice(q?.price ?? stock.base)}</span>
      <span className={`font-mono text-xs ${up ? "text-[#7dff4d]" : "text-[#ff5b5b]"}`}>
        {up ? "▲" : "▼"} {Math.abs(q?.changePct ?? 0).toFixed(2)}%
      </span>
      <span className="px-1 text-[#2a322c]">◆</span>
    </span>
  );
}

/** Scrolling live ticker of the 10 basket stocks. */
export function StockTicker() {
  const row = [...STOCKS, ...STOCKS];
  return (
    <div className="relative border-y border-line bg-[#080b0a] py-2.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#080b0a] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#080b0a] to-transparent" />
      <div className="flex w-max" style={{ animation: "marquee 38s linear infinite" }}>
        {row.map((s, i) => (
          <TickerItem key={`${s.symbol}-${i}`} stock={s} />
        ))}
      </div>
    </div>
  );
}

/** The 10 stocks with live price and how much of each has been paired to holders. */
export function PairedStock() {
  const { deployment } = useDeployment();
  const broker = deployment?.StonkInuBroker;

  const distributedQ = useReadContracts({
    contracts: STOCK_ADDRESSES.map((addr) => ({
      address: broker,
      abi: abis.broker,
      functionName: "totalStockDistributed" as const,
      args: [addr] as const,
    })),
    query: { enabled: !!broker, refetchInterval: 15_000 },
  });

  const distributed = useMemo(() => {
    const m: Record<string, bigint> = {};
    STOCKS.forEach((s, i) => {
      const r = distributedQ.data?.[i];
      m[s.symbol] = r?.status === "success" ? (r.result as bigint) : 0n;
    });
    return m;
  }, [distributedQ.data]);

  return (
    <section className="relative px-5 py-24 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="label">Paired to holders · live</div>
          <h2 className="display mt-4 max-w-2xl text-4xl sm:text-5xl">
            Every mint buys a <em className="text-acid">real stock</em>. Holders keep the book.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-mist">
            Ten tokenized equities on Robinhood Chain. Each mint buys one at random and airdrops it
            to every broker holder — pro-rata, automatically.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {STOCKS.map((s) => (
              <StockRow key={s.symbol} stock={s} paired={distributed[s.symbol] ?? 0n} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StockRow({ stock, paired }: { stock: Stock; paired: bigint }) {
  const q = useMarket()[stock.symbol];
  const up = (q?.changePct ?? 0) >= 0;
  return (
    <div className="lift flex items-center gap-4 rounded-2xl border border-line bg-panel/50 px-4 py-3.5">
      <StockLogo stock={stock} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-[#e9efe9]">{stock.symbol}</span>
          <span className="truncate text-xs text-mist">{stock.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-mono text-sm text-[#e9efe9]">${fmtPrice(q?.price ?? stock.base)}</span>
          <span className={`font-mono text-[11px] ${up ? "text-[#7dff4d]" : "text-[#ff5b5b]"}`}>
            {up ? "▲" : "▼"} {Math.abs(q?.changePct ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="label !tracking-[0.16em]">Paired</div>
        <div className="mt-0.5 font-mono text-sm text-acid">{fmtUnits(paired)}</div>
      </div>
    </div>
  );
}

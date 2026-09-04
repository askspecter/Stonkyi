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
import {
  STOCKS,
  STOCK_ADDRESSES,
  AGGREGATOR_ABI,
  ROBINHOOD_CHAIN_ID,
  type Stock,
} from "@/lib/stocks";
import { abis, useDeployment } from "@/lib/useBroker";
import { fmtUnits } from "@/lib/format";
import { Reveal } from "./Reveal";

type Quote = { price: number; changePct: number; dir: 1 | -1 | 0; live: boolean };
type Market = Record<string, Quote>;

const MarketCtx = createContext<Market>({});

const FEED_STOCKS = STOCKS.filter((s) => s.feed);
const SIM_STOCKS = STOCKS.filter((s) => !s.feed);

/**
 * Real on-chain prices: each stock's Chainlink USD feed on Robinhood Chain,
 * read via `latestRoundData()` (8 decimals). Stocks without a feed fall back to
 * a gentle simulated walk so the row still moves.
 */
export function MarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState<Market>(() => {
    const m: Market = {};
    for (const s of STOCKS) m[s.symbol] = { price: s.base, changePct: 0, dir: 0, live: false };
    return m;
  });
  const openRef = useRef<Record<string, number>>({});
  const prevRef = useRef<Record<string, number>>({});

  // On-chain Chainlink feeds (USD, 1e8) on Robinhood Chain.
  const feedsQ = useReadContracts({
    contracts: FEED_STOCKS.map((s) => ({
      address: s.feed,
      abi: AGGREGATOR_ABI,
      functionName: "latestRoundData" as const,
      chainId: ROBINHOOD_CHAIN_ID,
    })),
    query: { refetchInterval: 12_000 },
  });

  useEffect(() => {
    if (!feedsQ.data) return;
    setMarket((prev) => {
      const next: Market = { ...prev };
      FEED_STOCKS.forEach((s, i) => {
        const r = feedsQ.data![i];
        if (r?.status !== "success") return;
        const answer = (r.result as readonly bigint[])[1]; // int256 answer
        const price = Number(answer) / 1e8;
        if (!(price > 0)) return;
        if (openRef.current[s.symbol] === undefined) openRef.current[s.symbol] = price;
        const open = openRef.current[s.symbol];
        const before = prevRef.current[s.symbol] ?? price;
        prevRef.current[s.symbol] = price;
        next[s.symbol] = {
          price,
          changePct: ((price - open) / open) * 100,
          dir: price > before ? 1 : price < before ? -1 : 0,
          live: true,
        };
      });
      return next;
    });
  }, [feedsQ.data]);

  // Simulated walk for feed-less stocks only.
  useEffect(() => {
    if (SIM_STOCKS.length === 0) return;
    const id = setInterval(() => {
      setMarket((prev) => {
        const next: Market = { ...prev };
        for (const s of SIM_STOCKS) {
          const cur = prev[s.symbol]?.price ?? s.base;
          const drift = (s.base - cur) * 0.02;
          const noise = (Math.random() - 0.5) * s.base * 0.004;
          const price = Math.max(0.01, cur + drift + noise);
          if (openRef.current[s.symbol] === undefined) openRef.current[s.symbol] = s.base;
          const open = openRef.current[s.symbol];
          next[s.symbol] = {
            price,
            changePct: ((price - open) / open) * 100,
            dir: price > cur ? 1 : price < cur ? -1 : 0,
            live: false,
          };
        }
        return next;
      });
    }, 1800);
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
    <div className="relative overflow-hidden border-y border-line bg-[#080b0a] py-2.5">
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
    <section className="relative px-5 py-14 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="label">Paired to holders · live</div>
          <h2 className="display mt-4 max-w-2xl text-4xl sm:text-5xl">
            Every mint buys a <em className="text-acid">real stock</em>. Holders keep the book.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-mist">
            Ten tokenized equities on Robinhood Chain. Each mint buys one at random and airdrops it
            to every broker holder, pro-rata and automatic. Prices are read live from{" "}
            <span className="text-[#e9efe9]">Chainlink</span> on-chain.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2">
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

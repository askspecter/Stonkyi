const TICKS = [
  ["AAPL", "218.77", "+2.20%", true],
  ["NVDA", "1218.04", "+1.10%", true],
  ["GOOGL", "332.21", "-0.70%", false],
  ["TSLA", "402.13", "+3.40%", true],
  ["MSFT", "512.90", "+0.44%", true],
  ["AMZN", "223.51", "-1.02%", false],
  ["META", "612.30", "+1.88%", true],
  ["COIN", "301.77", "+5.10%", true],
  ["HOOD", "44.20", "-0.30%", false],
] as const;

export function StockTicker() {
  const row = [...TICKS, ...TICKS];
  return (
    <div className="overflow-hidden border-y border-line bg-coal/40 py-3">
      <div className="flex w-[200%] animate-marquee whitespace-nowrap">
        {row.map(([sym, price, chg, up], i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-2 font-mono text-sm">
            <span className="text-mist">{sym}</span>
            <span className="text-[#e7ece7]">${price}</span>
            <span className={up ? "text-acid" : "text-red-400"}>
              {up ? "▲" : "▼"} {chg}
            </span>
            <span className="ml-4 text-line">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

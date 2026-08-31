"use client";

const ITEMS = [
  "$STONKINU +420.69%",
  "BROKERS MINTED",
  "CLOCK IN ▸ EARN STOCK",
  "999 SUPPLY",
  "BURN 50K TO MINT",
  "0.001 ETH → HOLDERS",
  "ERC-6551 WALLETS",
  "OVERTIME PAYS",
  "TOKENIZED STOCK AIRDROPS",
];

export function Ticker() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-b border-line bg-ticker py-1.5 text-[11px] uppercase tracking-widest text-acidDim">
      <div className="flex w-[200%] animate-marquee whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="mx-6 flex items-center gap-2">
            <span className="text-acid">▸</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

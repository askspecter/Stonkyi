export type Stock = {
  symbol: string;
  name: string;
  domain: string; // for the real logo (clearbit)
  address: `0x${string}`;
  base: number; // reference price for the live ticker
  color: string; // brand-ish accent for the fallback monogram
};

/** The 10 tokenized stocks the broker basket buys from, on Robinhood Chain. */
export const STOCKS: Stock[] = [
  { symbol: "AAPL", name: "Apple", domain: "apple.com", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", base: 231.4, color: "#a2aaad" },
  { symbol: "TSLA", name: "Tesla", domain: "tesla.com", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", base: 248.2, color: "#e82127" },
  { symbol: "NVDA", name: "NVIDIA", domain: "nvidia.com", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", base: 142.6, color: "#76b900" },
  { symbol: "AMZN", name: "Amazon", domain: "amazon.com", address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", base: 186.9, color: "#ff9900" },
  { symbol: "MSFT", name: "Microsoft", domain: "microsoft.com", address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", base: 421.3, color: "#f25022" },
  { symbol: "GOOGL", name: "Alphabet", domain: "google.com", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", base: 165.1, color: "#4285f4" },
  { symbol: "META", name: "Meta", domain: "meta.com", address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", base: 561.7, color: "#0866ff" },
  { symbol: "MSTR", name: "Strategy", domain: "microstrategy.com", address: "0xec262a75e413fAfD0dF80480274532C79D42da09", base: 179.8, color: "#e8562b" },
  { symbol: "SPY", name: "S&P 500 ETF", domain: "ssga.com", address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", base: 565.4, color: "#c8a24e" },
  { symbol: "QCOM", name: "Qualcomm", domain: "qualcomm.com", address: "0x0f17206447090e464C277571124dD2688E48AEA9", base: 171.9, color: "#3253dc" },
];

export const STOCK_ADDRESSES = STOCKS.map((s) => s.address);

export function logoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}

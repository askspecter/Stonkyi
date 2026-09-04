export type Stock = {
  symbol: string;
  name: string;
  domain: string; // for the real logo (clearbit)
  address: `0x${string}`; // the tokenized-stock ERC-20 on Robinhood Chain
  feed?: `0x${string}`; // Chainlink price feed (AggregatorV3, USD, 8 decimals) - omit if none
  base: number; // fallback reference price used until a feed reads / when there is none
  color: string; // brand-ish accent for the fallback monogram
};

/** The 10 tokenized stocks the broker basket buys from, on Robinhood Chain.
 *  `feed` is the Chainlink price-feed proxy on Robinhood Chain (chain id 4663). */
export const STOCKS: Stock[] = [
  { symbol: "AAPL", name: "Apple", domain: "apple.com", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", feed: "0x6B22A786bAa607d76728168703a39Ea9C99f2cD0", base: 231.4, color: "#a2aaad" },
  { symbol: "TSLA", name: "Tesla", domain: "tesla.com", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", feed: "0x4A1166a659A55625345e9515b32adECea5547C38", base: 248.2, color: "#e82127" },
  { symbol: "NVDA", name: "NVIDIA", domain: "nvidia.com", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", feed: "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15", base: 142.6, color: "#76b900" },
  { symbol: "AMZN", name: "Amazon", domain: "amazon.com", address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", feed: "0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C", base: 186.9, color: "#ff9900" },
  { symbol: "MSFT", name: "Microsoft", domain: "microsoft.com", address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", feed: "0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E", base: 421.3, color: "#f25022" },
  { symbol: "GOOGL", name: "Alphabet", domain: "google.com", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", feed: "0xF6f373a037c30F0e5010d854385cA89185AE638b", base: 165.1, color: "#4285f4" },
  { symbol: "META", name: "Meta", domain: "meta.com", address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", feed: "0x7C38C00C30BEe9378381E7B6135d7283356D71b1", base: 561.7, color: "#0866ff" },
  { symbol: "MSTR", name: "Strategy", domain: "microstrategy.com", address: "0xec262a75e413fAfD0dF80480274532C79D42da09", feed: "0x396118bdFB181e6240E74D243F266B061c0edc3D", base: 179.8, color: "#e8562b" },
  { symbol: "SPY", name: "S&P 500 ETF", domain: "ssga.com", address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", feed: "0x319724394D3A0e3669269846abE664Cd621f9f6A", base: 565.4, color: "#c8a24e" },
  { symbol: "QCOM", name: "Qualcomm", domain: "qualcomm.com", address: "0x0f17206447090e464C277571124dD2688E48AEA9", base: 171.9, color: "#3253dc" },
];

/** Chainlink AggregatorV3 minimal ABI - read latest USD price. */
export const AGGREGATOR_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ROBINHOOD_CHAIN_ID = 4663;

export const STOCK_ADDRESSES = STOCKS.map((s) => s.address);

export function logoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}

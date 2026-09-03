# StonkInu 🐕📈

**999 broker NFTs, each with its own ERC-6551 wallet. Burn `$STONKINU`, mint a broker, and earn tokenized stock on every mint — automatically.**

StonkInu is a self-contained web3 protocol inspired by projects like
`stonkbrokers.cash`. Every broker NFT is a *token-bound account* (ERC-6551): a
real on-chain wallet that can hold tokenized stock, airdrops and rewards. A slice
of every mint fee is automatically swapped into stock and distributed pro-rata to
existing holders.

```
Repo layout
├── app/ components/ config/ lib/ public/ data/   Next.js frontend (at repo root,
│                                                  so Vercel auto-detects it)
├── contracts/   Hardhat project — Solidity contracts, tests, deploy script
└── art/         999 broker PFP generator (pixel art + metadata)
```

---

## The mechanics

Minting one broker, in a single transaction, requires:

| Requirement | Amount |
| --- | --- |
| Burn `$STONKINU` | **50,000** (destroyed forever — deflationary) |
| Pay ETH mint fee | **0.002 ETH** |

The **0.002 ETH fee is split automatically, on-chain**:

| Slice | Amount | Where it goes |
| --- | --- | --- |
| Buy stock → holders | **0.001 ETH** | Swapped into `StockToken` and distributed pro-rata to *existing* broker holders |
| Protocol | **0.001 ETH** | Protocol treasury |

- **Fixed supply:** 999 brokers, ever.
- **Passive yield:** every mint after yours buys stock and airdrops it to holders.
- **Yield follows the NFT:** transfer a broker and its future (unclaimed) stock
  entitlement goes with it, via cumulative dividend accounting.
- **Pull-based claims:** holders call `claim()` whenever they like.
- **The first mint** has no prior holders, so its stock goes to the treasury.

### Contracts

| Contract | Role |
| --- | --- |
| `StonkInu.sol` | `$STONKINU` — ERC-20 (burnable, permit). Fixed genesis supply, burn-only thereafter. |
| `StockToken.sol` | The tokenized stock distributed to holders. |
| `IStockBuyer` | Pluggable ETH → stock adapter interface — the broker doesn't care how stock is sourced. |
| `UniswapV3StockBuyer.sol` | **Production adapter.** Wraps ETH → WETH and swaps WETH → stock through a Uniswap V3 pool (`exactInputSingle`), with a configurable `minStockPerEth` slippage floor. |
| `MockStockBuyer.sol` | Self-contained adapter for local dev / testnets — mints stock at a fixed rate so no live pool is required. |
| `StonkInuBroker.sol` | The 999-supply ERC-721 collection. Mint logic, automatic fee split, dividend distribution, pull-based `claim()`, and ERC-6551 account creation. |
| `erc6551/ERC6551Registry.sol` | Deterministic token-bound account registry (canonical bytecode layout, plain-Solidity implementation). |
| `erc6551/ERC6551Account.sol` | The token-bound account: owned by the current NFT owner, can execute calls, hold assets, and validate signatures (ERC-1271). |

---

## Quick start

### 1. Contracts

```bash
cd contracts
npm install
npm run compile
npm test          # 12 passing — mint, fee split, distribution, claim, ERC-6551
```

Run a local chain and deploy (writes addresses to `config/deployments/31337.json`):

```bash
npx hardhat node          # terminal 1
npm run deploy:local      # terminal 2
```

The local deploy uses deterministic Hardhat addresses, so the committed
`31337.json` already matches a fresh node.

Deploy to Sepolia:

```bash
export SEPOLIA_RPC_URL=... PRIVATE_KEY=... TREASURY=...
npm run deploy:sepolia
```

**Using the real Uniswap V3 buyer.** By default the deploy script uses
`MockStockBuyer`. Provide a router + WETH (and optionally a pool fee tier and
slippage floor) to deploy `UniswapV3StockBuyer` against a live WETH/stock pool
instead:

```bash
export UNISWAP_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564  # V3 SwapRouter
export WETH=0x...            # WETH9 for the target chain
export POOL_FEE=3000         # 0.3% tier (optional, default 3000)
export MIN_STOCK_PER_ETH=0   # slippage floor, stock per ETH (optional)
npm run deploy:sepolia
```

### 2. Frontend

The Next.js app lives at the repo root. From the repo root:

```bash
npm install
cp .env.example .env.local   # add a WalletConnect id from https://cloud.reown.com
npm run dev                  # http://localhost:3000
```

Set `NEXT_PUBLIC_CHAIN_ID` to `31337` for local Hardhat or `11155111` for Sepolia.

The frontend reads contract addresses from `config/deployments/<chainId>.json`,
which the deploy script generates.

#### Building & deploying (fully static)

The site is a **static export** (`output: "export"` in `next.config.mjs`): a
plain `out/` folder of HTML/CSS/JS with no server needed. Build it:

```bash
npm install
npm run build       # writes ./out
```

Deploy the `out/` folder to any host:

- **Vercel** — import the repo (Framework: **Next.js**, Root Directory: default
  `./`). Vercel builds and serves the static output automatically. Or drag the
  local `out/` folder onto https://vercel.com/new for a zero-config deploy.
- **Netlify / Cloudflare Pages / GitHub Pages** — publish directory `out`.
- **Any static host** — upload the contents of `out/`.

Token metadata is served as static files at `/nft/metadata/<id>`
(`public/nft/metadata/<id>`), and images at `/nft/images/<id>.png`. The
contract's `baseTokenURI` points at `<site>/nft/metadata/`, so
`tokenURI(<id>)` = `<site>/nft/metadata/<id>`.

The site has three pages:

- **Home** — the pitch, the automatic fee-split diagram, live supply, and the roadmap.
- **Mint** — approve `$STONKINU`, then burn-and-mint a broker.
- **Broker Desk** — your brokers, their ERC-6551 wallet addresses, and claimable stock.

---

## How the ERC-6551 accounts work

On mint, `StonkInuBroker` calls the registry to deploy a deterministic account
for the new `tokenId`. The account is an ERC-1167 minimal proxy of
`ERC6551Account` with `(salt, chainId, tokenContract, tokenId)` appended to its
bytecode. The account reads that footer to resolve its bound NFT, and the NFT's
current owner is its sole signer — so control of the wallet transfers with the
NFT. `accountOf(tokenId)` returns the address whether or not it's been deployed.

---

## Art — 999 broker PFPs

The collection art is generated deterministically by `art/broker.js` (flat pixel-art
brokers: head + suit + hanging tie + briefcase, in the classic NFT-broker style).

```bash
cd art
npm install
node broker.js            # 15 sample previews -> art/samples/_sheet.png
node broker.js --all      # all 999 -> public/nft/images/<id>.png
                          #          + metadata -> public/nft/metadata/<id>
                          #          + art/rarity.json
```

- **Images**: `public/nft/images/<id>.png` (served statically).
- **Metadata**: static JSON files at `public/nft/metadata/<id>`, served at
  `/nft/metadata/<id>`. The contract's `baseTokenURI` points here, so
  `tokenURI(<id>)` = `<site>/nft/metadata/<id>`.
- **Traits**: Background, Fur, Eyes, Suit, Tie, Hat, Briefcase — each token is
  deterministic (seeded by id) and de-duplicated so all 999 are unique.

### Swapping in higher-fidelity art (enhance pipeline)

The base images are a clean starting point. To use polished/AI-enhanced art,
keep the **same filenames** (`1.png … 999.png`) and drop them into
`public/nft/images/`, overwriting the base renders. Nothing else changes —
the metadata, `tokenURI`, website, and on-chain wiring all stay identical, so
the upgrade is a pure drop-in replacement.

## Roadmap (the trading floor)

Marketplace / Swap Desk · Stonk Launcher (bonding curve / fixed price) · Safety
Deposit Box (lock Uniswap V3/V4 LP) · Broker Box (gacha stock certificates) ·
Loan Vault · Staking tiers · Covered calls.

---

## ⚠️ Disclaimer

StonkInu is an experimental, **unaudited** protocol provided as-is for
educational and demonstration purposes. Nothing here is financial advice. The
`MockStockBuyer` mints stock from thin air and is **not** production-ready —
replace it with a real DEX-backed adapter before any live deployment. Do your
own research.

## License

MIT

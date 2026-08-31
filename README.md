# StonkInu 🐕📈

**999 broker NFTs, each with its own ERC-6551 wallet. Burn `$STONKINU`, mint a broker, and earn tokenized stock on every mint — automatically.**

StonkInu is a self-contained web3 protocol inspired by projects like
`stonkbrokers.cash`. Every broker NFT is a *token-bound account* (ERC-6551): a
real on-chain wallet that can hold tokenized stock, airdrops and rewards. A slice
of every mint fee is automatically swapped into stock and distributed pro-rata to
existing holders.

```
Repo layout
├── contracts/   Hardhat project — Solidity contracts, tests, deploy script
└── web/         Next.js + wagmi + RainbowKit frontend (landing, mint, dashboard)
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
| `IStockBuyer` / `MockStockBuyer.sol` | Pluggable ETH → stock adapter. The mock mints stock at a fixed rate (self-contained for dev/testnets); swap for a Uniswap-router-backed buyer on mainnet. |
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

Run a local chain and deploy (writes addresses to `web/config/deployments/31337.json`):

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

### 2. Frontend

```bash
cd web
npm install
cp .env.example .env.local   # add a WalletConnect id from https://cloud.reown.com
npm run dev                  # http://localhost:3000
```

Set `NEXT_PUBLIC_CHAIN_ID` to `31337` for local Hardhat or `11155111` for Sepolia.
The frontend reads contract addresses from `web/config/deployments/<chainId>.json`,
which the deploy script generates.

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

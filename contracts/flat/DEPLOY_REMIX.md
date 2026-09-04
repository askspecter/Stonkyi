# Deploy StonkInu di Remix — Robinhood Chain (beli saham asli)

Proyek seperti StonkBrokers/StonkCats jalan di **Robinhood Chain** — L2 publik EVM tempat
token saham asli (TSLA, NVDA, AMZN, …) hidup sebagai ERC-20 yang bisa diperdagangkan,
dan Uniswap V3/V4 sudah ada. Di sinilah "mint → otomatis beli saham → bagi ke holder"
benar-benar bisa jalan.

File flattened (satu file, semua import digabung) ada di folder ini — tinggal copy-paste ke Remix.

---

## 0. Tambah Robinhood Chain ke MetaMask

| Field | Nilai |
|-------|-------|
| Network name | Robinhood Chain |
| RPC URL | `https://rpc.mainnet.chain.robinhood.com` (atau RPC Alchemy-mu) |
| Chain ID | `4663` |
| Currency | `ETH` |
| Block explorer | `https://robinhoodchain.blockscout.com` |

Isi wallet dengan **ETH di Robinhood Chain** (untuk gas + fee mint).

## 0b. Alamat kontrak penting di Robinhood Chain (4663)

| Kontrak | Alamat |
|---------|--------|
| **WETH9** | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| **Uniswap V3 SwapRouter02** | `0xcaf681a66d020601342297493863e78c959e5cb2` |
| Uniswap V3 Factory | `0x1f7d7550b1b028f7571e69a784071f0205fd2efa` |
| Uniswap V3 QuoterV2 | `0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7` |
| Contoh token saham **TSLA** | `0x322F0929c4625eD5bAd873c95208D54E1c003b2d` |

> Pilih token saham incaranmu (TSLA/NVDA/AMZN/SPY/…). Pastikan ada **pool WETH/<saham>** dan
> catat **fee tier**-nya (500 = 0.05%, 3000 = 0.3%, 10000 = 1%). Cek di Blockscout / Uniswap.

---

## 1. Setelan compiler Remix (sama untuk semua file)

Tab **Solidity Compiler**: Compiler `0.8.28`, EVM Version default (`cancun`), optimization ON (runs `200`).
Tab **Deploy & Run**: Environment `Injected Provider - MetaMask`, jaringan **Robinhood Chain**.

Catatan: beberapa baris `pragma solidity` (dari OpenZeppelin) itu normal — tinggal compile.

---

## 2. Deploy `StonkInu` (token $STONKINU)

- File `StonkInu.flat.sol` → kontrak **StonkInu**.
- Constructor `initialHolder` = **alamat wallet kamu** (dapat 1.000.000.000 STONKINU).
- Deploy → catat → `STONKINU`.

## 3. Deploy `UniswapV3StockBuyer` (adapter beli-saham asli, 10 saham acak)

Tiap mint, buyer memilih **1 dari 10 saham secara acak**, lalu swap ETH → saham itu, lalu dibagikan ke holder.

- File `UniswapV3StockBuyer.flat.sol` → kontrak **UniswapV3StockBuyer**.
- Constructor (urut):
  - `stocks_` = **array 10 alamat token saham** (format Remix: `["0x...","0x...", … 10 alamat]`).
    Pilih 10 saham incaranmu (TSLA/NVDA/AMZN/AAPL/MSFT/GOOGL/META/SPY/…) yang punya pool WETH.
  - `defaultPoolFee_` = fee tier default pool WETH/saham (mis. `3000`). Bisa di-override per token nanti.
  - `weth_` = `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`
  - `swapRouter_` = `0xcaf681a66d020601342297493863e78c959e5cb2`
  - `owner_` = alamat wallet kamu
- Deploy → catat → `BUYER`.

### 3b. (Disarankan) set lantai slippage per token

Default lantai = 0 (tanpa proteksi). Karena tiap saham harganya beda, lantainya **per token**.
Untuk tiap saham panggil `setMinStockPerEth(stock, minStockPerEth_)`:
- `stock` = alamat token saham
- `minStockPerEth_` = jumlah minimum token saham per 1 ETH (18 desimal), ambil ~90% dari kurs pasar.
  Contoh: kalau 1 ETH ≈ 20 token saham itu, set `18000000000000000000` (18).

> Nilai per-buy cuma 0.001 ETH, jadi risiko sandwich kecil — tapi tetap disarankan set lantai.
> Kalau pool suatu saham pakai fee tier beda, set `setPoolFee(stock, fee)`.

## 4. Deploy `ERC6551Registry` (tanpa argumen) → catat `REGISTRY`

## 5. Deploy `ERC6551Account` (tanpa argumen) → catat `ACCOUNT_IMPL`

## 6. Deploy `StonkInuBroker` (kontrak utama)

- File `StonkInuBroker.flat.sol` → kontrak **StonkInuBroker**.
- Constructor (urut):
  - `stonkInu_` = `STONKINU`
  - `stockBuyer_` = `BUYER`
  - `registry_` = `REGISTRY`
  - `accountImplementation_` = `ACCOUNT_IMPL`
  - `treasury_` = alamat wallet kamu (penerima 0.001 ETH/mint)
  - `owner_` = alamat wallet kamu
  - `baseTokenURI_` = `https://DOMAIN-KAMU/nft/metadata/` (domain website live-mu, dengan `/` di akhir)
- Deploy → catat → `BROKER`.

---

## 7. Uji mint 1 broker

1. Kontrak **StonkInu** → `approve(BROKER, 50000000000000000000000)`  *(50.000 × 10^18)*
2. Kontrak **StonkInuBroker** → isi **VALUE** = `0.002` **Ether**, lalu panggil `mint()`.
3. Saat mint, kontrak otomatis: swap 0.001 ETH → token saham (via Uniswap) → mulai bagi ke holder,
   dan 0.001 ETH → treasury. Broker #1 + wallet ERC-6551-nya ter-deploy.
   - Mint **pertama**: sahamnya ke treasury (belum ada holder lain). Mulai mint **ke-2** baru mengalir ke holder.

> Kalau `mint()` gagal saat swap: biasanya pool WETH/saham tipis, `poolFee_` salah tier, atau
> `minStockPerEth_` ketinggian. Sesuaikan `setPoolFee` / `setMinStockPerEth`.

---

## 8. Sambungkan ke website

Kirim ke saya semua alamat (`STONKINU`, **10 alamat token saham**, `BUYER`, `REGISTRY`,
`ACCOUNT_IMPL`, `BROKER`, `treasury`) — saya isikan ke `config/deployments/4663.json` dan push,
lalu tombol Mint / Broker Desk langsung nyambung on-chain (Broker Desk otomatis menampilkan
campuran saham yang diperoleh tiap holder). Frontend sudah default ke Robinhood Chain / 4663.

---

## (Opsional) Hanya untuk uji tanpa saham asli

`MockStockBuyer.flat.sol` mencetak "stock" bikinan sendiri (bukan saham asli). Berguna kalau mau uji
alur tanpa pool. Constructor: `(stocks_[], stockPerEth_, treasury_, owner_)` — `stocks_` array alamat
StockToken; setelah deploy panggil `StockToken.setMinter(BUYER, true)` di tiap token. Untuk peluncuran
sungguhan pakai `UniswapV3StockBuyer` di atas.

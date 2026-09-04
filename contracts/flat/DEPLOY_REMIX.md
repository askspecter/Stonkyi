# Deploy StonkInu di Remix — panduan langkah demi langkah

File flattened (satu file, semua import sudah digabung) ada di folder ini:

| File | Kontrak | Untuk |
|------|---------|-------|
| `StonkInu.flat.sol` | `StonkInu` | Token $STONKINU (fixed 1B supply) |
| `StockToken.flat.sol` | `StockToken` | Token "saham" yang dibagikan ke holder |
| `MockStockBuyer.flat.sol` | `MockStockBuyer` | Adapter beli-stock untuk **testnet** (mint stock sendiri) |
| `UniswapV3StockBuyer.flat.sol` | `UniswapV3StockBuyer` | Adapter beli-stock **mainnet** (swap lewat Uniswap V3) |
| `ERC6551Registry.flat.sol` | `ERC6551Registry` | Registry token-bound account |
| `ERC6551Account.flat.sol` | `ERC6551Account` | Implementasi wallet per-NFT |
| `StonkInuBroker.flat.sol` | `StonkInuBroker` | Koleksi 999 broker NFT |

> Rekomendasi: coba dulu di **Sepolia (testnet, gratis)** pakai `MockStockBuyer`. Kalau sudah oke baru mainnet.

---

## 0. Setelan compiler Remix (WAJIB sama untuk semua file)

Di tab **Solidity Compiler**:
- **Compiler**: `0.8.28` (atau 0.8.24+)
- **EVM Version**: biarkan default (`cancun`) — cocok untuk mainnet/Sepolia/Base/Arbitrum sekarang.
- **Enable optimization**: ON, runs `200`.

Di tab **Deploy & Run**:
- **Environment**: `Injected Provider - MetaMask` (dan pilih jaringan Sepolia di MetaMask).
- Pastikan wallet punya ETH testnet (faucet Sepolia).

Catatan: setiap file flat menampilkan beberapa `pragma solidity` (dari OpenZeppelin) — itu normal, tinggal compile.

---

## 1. Deploy `StonkInu` (token)

- Buka `StonkInu.flat.sol`, compile, pilih kontrak **StonkInu**.
- Constructor:
  - `initialHolder` = **alamat wallet kamu** (penerima seluruh 1.000.000.000 STONKINU).
- Deploy → **catat alamatnya** → sebut `STONKINU`.

## 2. Deploy `StockToken`

- Compile `StockToken.flat.sol`, pilih **StockToken**.
- Constructor:
  - `name_` = `StonkInu Tokenized Stock`
  - `symbol_` = `sSTOCK`
  - `owner_` = alamat wallet kamu
- Deploy → catat → sebut `STOCK`.

## 3. Deploy `MockStockBuyer` (jalur testnet)

- Compile `MockStockBuyer.flat.sol`, pilih **MockStockBuyer**.
- Constructor:
  - `stock_` = `STOCK` (alamat dari langkah 2)
  - `stockPerEth_` = `1000000000000000000000`  *(= 1000 × 10^18, artinya 1 ETH → 1000 sSTOCK)*
  - `treasury_` = alamat wallet kamu
  - `owner_` = alamat wallet kamu
- Deploy → catat → sebut `BUYER`.

## 4. Beri hak mint ke buyer

- Di kontrak **StockToken** (langkah 2) yang muncul di "Deployed Contracts":
  - panggil `setMinter` dengan:
    - `minter` = `BUYER`
    - `allowed` = `true`
- Kirim transaksi. *(Tanpa ini, mint broker akan gagal saat beli stock.)*

## 5. Deploy `ERC6551Registry`

- Compile `ERC6551Registry.flat.sol`, pilih **ERC6551Registry**.
- **Tanpa argumen** → Deploy → catat → sebut `REGISTRY`.

## 6. Deploy `ERC6551Account`

- Compile `ERC6551Account.flat.sol`, pilih **ERC6551Account**.
- **Tanpa argumen** → Deploy → catat → sebut `ACCOUNT_IMPL`.

## 7. Deploy `StonkInuBroker` (kontrak utama)

- Compile `StonkInuBroker.flat.sol`, pilih **StonkInuBroker**.
- Constructor (urut):
  - `stonkInu_` = `STONKINU`
  - `stockBuyer_` = `BUYER`
  - `registry_` = `REGISTRY`
  - `accountImplementation_` = `ACCOUNT_IMPL`
  - `treasury_` = alamat wallet kamu
  - `owner_` = alamat wallet kamu
  - `baseTokenURI_` = `https://DOMAIN-KAMU.vercel.app/nft/metadata/`  *(pakai domain website live kamu, jangan lupa garis miring di akhir)*
- Deploy → catat → sebut `BROKER`.

---

## 8. Uji mint 1 broker (dari Remix)

1. Di kontrak **StonkInu**, panggil `approve`:
   - `spender` = `BROKER`
   - `value` = `50000000000000000000000`  *(= 50.000 × 10^18)*
2. Di kontrak **StonkInuBroker**, isi field **VALUE** di atas tombol tulis: `0.002` lalu pilih satuan **Ether** (atau isi `2000000000000000` wei).
3. Panggil `mint()`.
4. Berhasil → kamu dapat broker #1, dan token-bound account-nya ter-deploy otomatis.
   - Cek: `balanceOf(alamatKamu)` = 1, `totalSupply()` = 1.
   - Stock reward baru mengalir mulai mint **ke-2** dan seterusnya (mint pertama stock-nya ke treasury, sesuai desain).

---

## 9. Sambungkan ke website

Masukkan semua alamat ke `config/deployments/11155111.json` (Sepolia) atau `1.json` (mainnet):

```json
{
  "chainId": 11155111,
  "StonkInu": "STONKINU",
  "StockToken": "STOCK",
  "StockBuyer": "BUYER",
  "stockBuyerKind": "MockStockBuyer",
  "ERC6551Registry": "REGISTRY",
  "ERC6551Account": "ACCOUNT_IMPL",
  "StonkInuBroker": "BROKER",
  "treasury": "ALAMAT_TREASURY"
}
```

Lalu commit → Vercel rebuild → tombol Mint/Broker Desk langsung nyambung on-chain. (Kirim alamat-alamatnya ke saya, saya isikan file JSON-nya.)

---

## Untuk MAINNET (baca dulu)

Kalau pakai `UniswapV3StockBuyer` (bukan mock), constructor-nya:
`(stock_, weth_, swapRouter_, poolFee_, minStockPerEth_, owner_)`

⚠️ **Penting**: `minStockPerEth_` **jangan 0**. Kalau 0, tidak ada proteksi slippage dan setiap pembelian stock 0.001 ETH bisa di-*sandwich* MEV sampai hampir nol. Isi dengan nilai wajar sesuai harga pool (mis. 90% dari kurs pasar). Dan kamu butuh token tokenized-stock asli + pool Uniswap V3 yang ada likuiditasnya. Diskusikan dulu bagian ini sebelum mainnet.

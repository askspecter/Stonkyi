/* eslint-disable no-console */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploys the full StonkInu stack and writes the addresses to
 * ../web/config/deployments/<chainId>.json so the frontend can pick them up.
 */
async function main() {
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);

  // The treasury receives the protocol's cut. Defaults to the deployer.
  const treasury = process.env.TREASURY || deployer.address;
  // Mock DEX: stock tokens minted per 1 ETH of "buy stock" input.
  const STOCK_PER_ETH = ethers.parseEther("1000");
  const baseURI = process.env.BASE_URI || "https://stonkinu.cash/nft/metadata/";

  console.log(`Deploying StonkInu to chainId ${chainId} as ${deployer.address}`);
  console.log(`Treasury: ${treasury}`);

  const StonkInu = await ethers.getContractFactory("StonkInu");
  const stonkInu = await StonkInu.deploy(deployer.address);
  await stonkInu.waitForDeployment();

  const StockToken = await ethers.getContractFactory("StockToken");
  const stock = await StockToken.deploy("StonkInu Tokenized Stock", "sSTOCK", deployer.address);
  await stock.waitForDeployment();

  // Known Uniswap V3 (SwapRouter02) + WETH addresses per chain, used as defaults
  // when the corresponding env vars are not set.
  const CHAIN_DEFAULTS = {
    // Robinhood Chain (4663): Uniswap V3 SwapRouter02 + WETH9.
    4663: {
      router: "0xcaf681a66d020601342297493863e78c959e5cb2",
      weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    },
  };
  const defaults = CHAIN_DEFAULTS[chainId] || {};

  // Choose the ETH -> stock adapter. If a real Uniswap V3 router + WETH are
  // available (via env or per-chain defaults), use the production
  // UniswapV3StockBuyer against a live WETH/stock pool; otherwise fall back to
  // the self-contained mock. Set STOCK_TOKEN to the tokenized-stock address to
  // buy (e.g. a Robinhood Chain NVDA/TSLA token); otherwise our StockToken is used.
  const UNISWAP_ROUTER = process.env.UNISWAP_ROUTER || defaults.router || "";
  const WETH = process.env.WETH || defaults.weth || "";
  const POOL_FEE = Number(process.env.POOL_FEE || "3000"); // 0.3% tier
  const MIN_STOCK_PER_ETH = process.env.MIN_STOCK_PER_ETH
    ? ethers.parseEther(process.env.MIN_STOCK_PER_ETH)
    : 0n;

  // The basket of tokenized stocks the buyer picks from (one at random per mint).
  // On a real chain set STOCK_TOKENS to a comma-separated list of existing
  // tokenized-equity tokens (e.g. Robinhood Chain TSLA,NVDA,AMZN,…) that each
  // have a WETH pool; otherwise the buyer targets our single dev StockToken.
  const STOCK_TOKENS = (process.env.STOCK_TOKENS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const basket = STOCK_TOKENS.length > 0 ? STOCK_TOKENS : [await stock.getAddress()];

  let buyer;
  let buyerKind;
  if (UNISWAP_ROUTER && WETH) {
    const Buyer = await ethers.getContractFactory("UniswapV3StockBuyer");
    buyer = await Buyer.deploy(basket, POOL_FEE, WETH, UNISWAP_ROUTER, deployer.address);
    await buyer.waitForDeployment();
    // Set a per-token slippage floor when provided (same value for all tokens here).
    if (MIN_STOCK_PER_ETH > 0n) {
      for (const t of basket) {
        await (await buyer.setMinStockPerEth(t, MIN_STOCK_PER_ETH)).wait();
      }
    } else {
      console.warn(
        "\n⚠️  MIN_STOCK_PER_ETH is 0 — NO slippage protection. Set MIN_STOCK_PER_ETH (per-token) before mainnet.\n"
      );
    }
    buyerKind = "UniswapV3StockBuyer";
    console.log(
      `Using UniswapV3StockBuyer (basket ${basket.length}, router ${UNISWAP_ROUTER}, WETH ${WETH}, fee ${POOL_FEE})`
    );
  } else {
    const MockStockBuyer = await ethers.getContractFactory("MockStockBuyer");
    buyer = await MockStockBuyer.deploy(basket, STOCK_PER_ETH, treasury, deployer.address);
    await buyer.waitForDeployment();
    // The mock mints the stock it delivers, so grant it minter rights on each token.
    for (const t of basket) {
      const tok = await ethers.getContractAt("StockToken", t);
      await (await tok.setMinter(await buyer.getAddress(), true)).wait();
    }
    buyerKind = "MockStockBuyer";
    console.log("Using MockStockBuyer (set UNISWAP_ROUTER + WETH env for the real buyer)");
  }

  const Registry = await ethers.getContractFactory("ERC6551Registry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const Account = await ethers.getContractFactory("ERC6551Account");
  const accountImpl = await Account.deploy();
  await accountImpl.waitForDeployment();

  const Broker = await ethers.getContractFactory("StonkInuBroker");
  const broker = await Broker.deploy(
    await stonkInu.getAddress(),
    await buyer.getAddress(),
    await registry.getAddress(),
    await accountImpl.getAddress(),
    treasury,
    deployer.address,
    baseURI
  );
  await broker.waitForDeployment();

  const addresses = {
    chainId,
    StonkInu: await stonkInu.getAddress(),
    // The basket of stock tokens holders can accrue (real tokenized-equity tokens
    // when configured, otherwise our single dev StockToken).
    StockTokens: basket,
    StockToken: basket[0], // representative (back-compat)
    StockBuyer: await buyer.getAddress(),
    stockBuyerKind: buyerKind,
    ERC6551Registry: await registry.getAddress(),
    ERC6551Account: await accountImpl.getAddress(),
    StonkInuBroker: await broker.getAddress(),
    treasury,
  };

  console.log("\nDeployed addresses:");
  console.table({ ...addresses, StockTokens: basket.join(",") });

  const outDir = path.join(__dirname, "..", "..", "config", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${chainId}.json`), JSON.stringify(addresses, null, 2));
  console.log(`\nWrote ${path.join(outDir, `${chainId}.json`)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

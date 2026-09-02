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

  // Choose the ETH -> stock adapter. If a real Uniswap V3 router + WETH are
  // provided via env, use the production UniswapV3StockBuyer against a live
  // WETH/stock pool; otherwise fall back to the self-contained mock.
  const UNISWAP_ROUTER = process.env.UNISWAP_ROUTER || "";
  const WETH = process.env.WETH || "";
  const POOL_FEE = Number(process.env.POOL_FEE || "3000"); // 0.3% tier
  const MIN_STOCK_PER_ETH = process.env.MIN_STOCK_PER_ETH
    ? ethers.parseEther(process.env.MIN_STOCK_PER_ETH)
    : 0n;

  let buyer;
  let buyerKind;
  if (UNISWAP_ROUTER && WETH) {
    const Buyer = await ethers.getContractFactory("UniswapV3StockBuyer");
    buyer = await Buyer.deploy(
      await stock.getAddress(),
      WETH,
      UNISWAP_ROUTER,
      POOL_FEE,
      MIN_STOCK_PER_ETH,
      deployer.address
    );
    await buyer.waitForDeployment();
    buyerKind = "UniswapV3StockBuyer";
    console.log(`Using UniswapV3StockBuyer (router ${UNISWAP_ROUTER}, WETH ${WETH}, fee ${POOL_FEE})`);
  } else {
    const MockStockBuyer = await ethers.getContractFactory("MockStockBuyer");
    buyer = await MockStockBuyer.deploy(
      await stock.getAddress(),
      STOCK_PER_ETH,
      treasury,
      deployer.address
    );
    await buyer.waitForDeployment();
    // The mock mints the stock it delivers, so grant it minter rights.
    await (await stock.setMinter(await buyer.getAddress(), true)).wait();
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
    StockToken: await stock.getAddress(),
    StockBuyer: await buyer.getAddress(),
    stockBuyerKind: buyerKind,
    ERC6551Registry: await registry.getAddress(),
    ERC6551Account: await accountImpl.getAddress(),
    StonkInuBroker: await broker.getAddress(),
    treasury,
  };

  console.log("\nDeployed addresses:");
  console.table(addresses);

  const outDir = path.join(__dirname, "..", "..", "config", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${chainId}.json`), JSON.stringify(addresses, null, 2));
  console.log(`\nWrote ${path.join(outDir, `${chainId}.json`)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

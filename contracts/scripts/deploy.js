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
  const baseURI = process.env.BASE_URI || "https://stonkinu.cash/api/broker/";

  console.log(`Deploying StonkInu to chainId ${chainId} as ${deployer.address}`);
  console.log(`Treasury: ${treasury}`);

  const StonkInu = await ethers.getContractFactory("StonkInu");
  const stonkInu = await StonkInu.deploy(deployer.address);
  await stonkInu.waitForDeployment();

  const StockToken = await ethers.getContractFactory("StockToken");
  const stock = await StockToken.deploy("StonkInu Tokenized Stock", "sSTOCK", deployer.address);
  await stock.waitForDeployment();

  const MockStockBuyer = await ethers.getContractFactory("MockStockBuyer");
  const buyer = await MockStockBuyer.deploy(
    await stock.getAddress(),
    STOCK_PER_ETH,
    treasury,
    deployer.address
  );
  await buyer.waitForDeployment();
  await (await stock.setMinter(await buyer.getAddress(), true)).wait();

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
    MockStockBuyer: await buyer.getAddress(),
    ERC6551Registry: await registry.getAddress(),
    ERC6551Account: await accountImpl.getAddress(),
    StonkInuBroker: await broker.getAddress(),
    treasury,
  };

  console.log("\nDeployed addresses:");
  console.table(addresses);

  const outDir = path.join(__dirname, "..", "..", "web", "config", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${chainId}.json`), JSON.stringify(addresses, null, 2));
  console.log(`\nWrote ${path.join(outDir, `${chainId}.json`)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

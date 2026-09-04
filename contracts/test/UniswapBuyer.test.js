const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const MINT_PRICE = ethers.parseEther("0.002");
const RATE = ethers.parseEther("1000"); // 1000 stock per WETH -> 0.001 ETH buys 1 stock
const STOCK_PER_MINT = ethers.parseEther("1");

describe("UniswapV3StockBuyer (with mock router)", function () {
  async function deployFixture() {
    const [deployer, treasury, alice, bob] = await ethers.getSigners();

    const StonkInu = await ethers.getContractFactory("StonkInu");
    const stonkInu = await StonkInu.deploy(deployer.address);

    const StockToken = await ethers.getContractFactory("StockToken");
    const stock = await StockToken.deploy("Stock", "STK", deployer.address);

    const MockWETH9 = await ethers.getContractFactory("MockWETH9");
    const weth = await MockWETH9.deploy();

    const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
    const router = await MockSwapRouter.deploy(RATE);
    await stock.setMinter(await router.getAddress(), true); // router mints the stock it "delivers"

    const Buyer = await ethers.getContractFactory("UniswapV3StockBuyer");
    const buyer = await Buyer.deploy(
      [await stock.getAddress()], // single-stock basket
      3000, // default 0.3% pool fee
      await weth.getAddress(),
      await router.getAddress(),
      deployer.address
    );

    const Registry = await ethers.getContractFactory("ERC6551Registry");
    const registry = await Registry.deploy();
    const Account = await ethers.getContractFactory("ERC6551Account");
    const accountImpl = await Account.deploy();

    const Broker = await ethers.getContractFactory("StonkInuBroker");
    const broker = await Broker.deploy(
      await stonkInu.getAddress(),
      await buyer.getAddress(),
      await registry.getAddress(),
      await accountImpl.getAddress(),
      treasury.address,
      deployer.address,
      ""
    );

    for (const user of [alice, bob]) {
      await stonkInu.transfer(user.address, ethers.parseEther("200000"));
      await stonkInu.connect(user).approve(await broker.getAddress(), ethers.MaxUint256);
    }

    return { deployer, treasury, alice, bob, stonkInu, stock, weth, router, buyer, broker };
  }

  it("wires the real buyer into the broker: mint swaps ETH->stock via the router", async function () {
    const { broker, stock, buyer, treasury, alice, bob } = await loadFixture(deployFixture);

    // First mint: no holders yet -> stock routed to treasury.
    await broker.connect(alice).mint({ value: MINT_PRICE });
    expect(await stock.balanceOf(treasury.address)).to.equal(STOCK_PER_MINT);

    // Second mint: alice (sole holder) accrues 1 stock, claimable.
    await broker.connect(bob).mint({ value: MINT_PRICE });
    expect(await broker.withdrawableStockOf(alice.address, await stock.getAddress())).to.equal(
      STOCK_PER_MINT
    );

    await broker.connect(alice).claim();
    expect(await stock.balanceOf(alice.address)).to.equal(STOCK_PER_MINT);

    // The buyer holds no leftover WETH — it all swapped through.
    expect(await ethers.provider.getBalance(await buyer.getAddress())).to.equal(0n);
  });

  it("exposes the stock basket and swaps ETH directly", async function () {
    const { buyer, stock, alice } = await loadFixture(deployFixture);
    expect(await buyer.stockTokens()).to.deep.equal([await stock.getAddress()]);

    // Anyone can call buyStock; stock is delivered to the chosen recipient.
    await buyer.connect(alice).buyStock(alice.address, { value: ethers.parseEther("0.001") });
    expect(await stock.balanceOf(alice.address)).to.equal(STOCK_PER_MINT);
  });

  it("enforces the per-token minStockPerEth slippage floor", async function () {
    const { buyer, stock, alice } = await loadFixture(deployFixture);
    // Demand 2000 stock/ETH while the pool only gives 1000 -> revert.
    await buyer.setMinStockPerEth(await stock.getAddress(), ethers.parseEther("2000"));
    await expect(
      buyer.connect(alice).buyStock(alice.address, { value: ethers.parseEther("0.001") })
    ).to.be.revertedWith("Too little received");
  });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const BURN_AMOUNT = ethers.parseEther("50000");
const MINT_PRICE = ethers.parseEther("0.002");
const STOCK_SHARE = ethers.parseEther("0.001");
const PROTOCOL_SHARE = ethers.parseEther("0.001");
const STOCK_PER_ETH = ethers.parseEther("1000"); // 0.001 ETH -> 1 stock
const STOCK_PER_MINT = ethers.parseEther("1"); // stock bought each mint

describe("StonkInu protocol", function () {
  async function deployFixture() {
    const [deployer, treasury, dex, alice, bob, carol] = await ethers.getSigners();

    const StonkInu = await ethers.getContractFactory("StonkInu");
    const stonkInu = await StonkInu.deploy(deployer.address);

    const StockToken = await ethers.getContractFactory("StockToken");
    const stock = await StockToken.deploy("Stock", "STK", deployer.address);

    const MockStockBuyer = await ethers.getContractFactory("MockStockBuyer");
    // Buyer forwards the "buy stock" ETH to `dex` so treasury only reflects the protocol cut.
    const buyer = await MockStockBuyer.deploy(
      await stock.getAddress(),
      STOCK_PER_ETH,
      dex.address,
      deployer.address
    );
    await stock.setMinter(await buyer.getAddress(), true);

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
      "https://stonkinu.cash/api/broker/"
    );

    // Fund minters with $STONKINU and approve the broker.
    for (const user of [alice, bob, carol]) {
      await stonkInu.transfer(user.address, ethers.parseEther("500000"));
      await stonkInu.connect(user).approve(await broker.getAddress(), ethers.MaxUint256);
    }

    return { deployer, treasury, dex, alice, bob, carol, stonkInu, stock, buyer, registry, accountImpl, broker };
  }

  async function mintBy(broker, user) {
    return broker.connect(user).mint({ value: MINT_PRICE });
  }

  describe("token & mint mechanics", function () {
    it("mints a broker, burning 50k STONKINU and taking 0.002 ETH", async function () {
      const { broker, stonkInu, alice } = await loadFixture(deployFixture);
      const supplyBefore = await stonkInu.totalSupply();
      const balBefore = await stonkInu.balanceOf(alice.address);

      await expect(mintBy(broker, alice))
        .to.emit(broker, "BrokerMinted");

      expect(await broker.ownerOf(1)).to.equal(alice.address);
      expect(await broker.totalSupply()).to.equal(1n);
      expect(await stonkInu.balanceOf(alice.address)).to.equal(balBefore - BURN_AMOUNT);
      expect(await stonkInu.totalSupply()).to.equal(supplyBefore - BURN_AMOUNT);
    });

    it("reverts on wrong ETH fee", async function () {
      const { broker, alice } = await loadFixture(deployFixture);
      await expect(broker.connect(alice).mint({ value: ethers.parseEther("0.001") }))
        .to.be.revertedWith("wrong ETH fee");
    });

    it("reverts without STONKINU approval", async function () {
      const { broker, stonkInu, deployer, treasury } = await loadFixture(deployFixture);
      // deployer has tokens but has not approved
      await expect(broker.connect(deployer).mint({ value: MINT_PRICE })).to.be.reverted;
    });

    it("splits the fee: 0.001 ETH to protocol treasury, 0.001 ETH to buy stock", async function () {
      const { broker, alice, bob, treasury, dex } = await loadFixture(deployFixture);

      const tBefore = await ethers.provider.getBalance(treasury.address);
      const dBefore = await ethers.provider.getBalance(dex.address);

      await mintBy(broker, alice);

      expect(await ethers.provider.getBalance(treasury.address)).to.equal(tBefore + PROTOCOL_SHARE);
      expect(await ethers.provider.getBalance(dex.address)).to.equal(dBefore + STOCK_SHARE);
      // Broker holds no ETH — everything is forwarded.
      expect(await ethers.provider.getBalance(await broker.getAddress())).to.equal(0n);
    });
  });

  describe("stock distribution to holders", function () {
    it("sends the first mint's stock to the treasury (no holders yet)", async function () {
      const { broker, stock, alice, treasury } = await loadFixture(deployFixture);
      await mintBy(broker, alice);
      expect(await stock.balanceOf(treasury.address)).to.equal(STOCK_PER_MINT);
      expect(await broker.withdrawableStockOf(alice.address)).to.equal(0n);
      expect(await broker.totalStockDistributed()).to.equal(0n);
    });

    it("distributes later mints' stock to existing holders, claimable via claim()", async function () {
      const { broker, stock, alice, bob } = await loadFixture(deployFixture);

      await mintBy(broker, alice); // #1 -> treasury
      await mintBy(broker, bob); // #2 -> alice (sole holder) gets 1 stock

      expect(await broker.totalStockDistributed()).to.equal(STOCK_PER_MINT);
      expect(await broker.withdrawableStockOf(alice.address)).to.equal(STOCK_PER_MINT);
      expect(await broker.withdrawableStockOf(bob.address)).to.equal(0n);

      await expect(broker.connect(alice).claim())
        .to.emit(broker, "StockClaimed")
        .withArgs(alice.address, STOCK_PER_MINT);
      expect(await stock.balanceOf(alice.address)).to.equal(STOCK_PER_MINT);
      expect(await broker.withdrawableStockOf(alice.address)).to.equal(0n);
    });

    it("splits a distribution across multiple holders pro-rata", async function () {
      const { broker, alice, bob, carol } = await loadFixture(deployFixture);

      await mintBy(broker, alice); // #1 -> treasury
      await mintBy(broker, bob); // #2 -> alice gets 1 stock
      await mintBy(broker, carol); // #3 -> alice & bob split 1 stock (0.5 each)

      const half = STOCK_PER_MINT / 2n;
      expect(await broker.withdrawableStockOf(alice.address)).to.equal(STOCK_PER_MINT + half);
      expect(await broker.withdrawableStockOf(bob.address)).to.equal(half);
      expect(await broker.withdrawableStockOf(carol.address)).to.equal(0n);
    });

    it("moves unclaimed entitlement with the NFT on transfer", async function () {
      const { broker, alice, bob, carol } = await loadFixture(deployFixture);

      await mintBy(broker, alice); // #1
      await mintBy(broker, bob); // #2 -> alice accrues 1 stock

      // Alice transfers broker #1 to carol before claiming.
      await broker.connect(alice).transferFrom(alice.address, carol.address, 1);

      // Accrued-so-far stays with alice; future rewards go to carol.
      expect(await broker.withdrawableStockOf(alice.address)).to.equal(STOCK_PER_MINT);
      expect(await broker.withdrawableStockOf(carol.address)).to.equal(0n);

      await mintBy(broker, alice); // #3 -> holders are carol(#1) and bob(#2)
      const half = STOCK_PER_MINT / 2n;
      expect(await broker.withdrawableStockOf(carol.address)).to.equal(half);
      expect(await broker.withdrawableStockOf(bob.address)).to.equal(half);
      expect(await broker.withdrawableStockOf(alice.address)).to.equal(STOCK_PER_MINT);
    });

    it("reverts claim when nothing is owed", async function () {
      const { broker, carol } = await loadFixture(deployFixture);
      await expect(broker.connect(carol).claim()).to.be.revertedWith("nothing to claim");
    });
  });

  describe("ERC-6551 token-bound account", function () {
    it("creates a TBA on mint that resolves its binding and owner", async function () {
      const { broker, alice } = await loadFixture(deployFixture);
      const tx = await mintBy(broker, alice);
      const receipt = await tx.wait();

      const predicted = await broker.accountOf(1);
      const account = await ethers.getContractAt("ERC6551Account", predicted);

      const [chainId, tokenContract, tokenId] = await account.token();
      expect(tokenContract).to.equal(await broker.getAddress());
      expect(tokenId).to.equal(1n);
      expect(chainId).to.equal((await ethers.provider.getNetwork()).chainId);
      expect(await account.owner()).to.equal(alice.address);
    });

    it("lets the NFT owner execute calls from the TBA and blocks others", async function () {
      const { broker, alice, bob } = await loadFixture(deployFixture);
      await mintBy(broker, alice);
      const account = await ethers.getContractAt("ERC6551Account", await broker.accountOf(1));

      // Fund the TBA, then have the owner send ETH out of it.
      await alice.sendTransaction({ to: await account.getAddress(), value: ethers.parseEther("1") });

      await expect(
        account.connect(bob).execute(bob.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.be.revertedWith("ERC6551: invalid signer");

      const before = await ethers.provider.getBalance(bob.address);
      await account.connect(alice).execute(bob.address, ethers.parseEther("0.5"), "0x", 0);
      expect(await ethers.provider.getBalance(bob.address)).to.equal(before + ethers.parseEther("0.5"));
      expect(await account.state()).to.equal(1n);
    });

    it("follows the NFT owner: TBA control transfers with the broker", async function () {
      const { broker, alice, bob } = await loadFixture(deployFixture);
      await mintBy(broker, alice);
      const account = await ethers.getContractAt("ERC6551Account", await broker.accountOf(1));
      await broker.connect(alice).transferFrom(alice.address, bob.address, 1);
      expect(await account.owner()).to.equal(bob.address);
    });
  });
});

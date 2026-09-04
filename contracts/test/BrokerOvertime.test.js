const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const E = (n) => ethers.parseEther(String(n));

describe("BrokerOvertime (Clock In)", function () {
  async function deployFixture() {
    const [deployer, alice, bob, feeder] = await ethers.getSigners();

    // Two plain ERC-20s stand in for basket stock tokens.
    const Stock = await ethers.getContractFactory("StonkInu");
    const stockA = await Stock.deploy(deployer.address);
    const stockB = await Stock.deploy(deployer.address);

    const NFT = await ethers.getContractFactory("MockERC721");
    const nft = await NFT.deploy();

    const Overtime = await ethers.getContractFactory("BrokerOvertime");
    const overtime = await Overtime.deploy(
      await nft.getAddress(),
      [await stockA.getAddress(), await stockB.getAddress()],
      deployer.address
    );
    const ovAddr = await overtime.getAddress();

    // Alice gets brokers 1,2,3; Bob gets 4. Both approve the overtime desk.
    for (const id of [1, 2, 3]) await nft.mint(alice.address, id);
    await nft.mint(bob.address, 4);
    await nft.connect(alice).setApprovalForAll(ovAddr, true);
    await nft.connect(bob).setApprovalForAll(ovAddr, true);

    // Feeder holds stock to distribute.
    await stockA.transfer(feeder.address, E(1_000_000));
    await stockA.connect(feeder).approve(ovAddr, ethers.MaxUint256);

    return { deployer, alice, bob, feeder, stockA, stockB, nft, overtime, ovAddr };
  }

  it("clocks a broker in (custodial) and out again", async function () {
    const { alice, nft, overtime, ovAddr } = await loadFixture(deployFixture);
    await overtime.connect(alice).clockIn([1n, 2n]);
    expect(await overtime.totalActive()).to.equal(2n);
    expect(await overtime.activeShares(alice.address)).to.equal(2n);
    expect(await overtime.isClockedIn(1n)).to.equal(true);
    expect(await nft.ownerOf(1n)).to.equal(ovAddr); // held by the desk
    expect((await overtime.stakedOf(alice.address)).map(String)).to.deep.equal(["1", "2"]);

    await overtime.connect(alice).clockOut([1n]);
    expect(await overtime.totalActive()).to.equal(1n);
    expect(await nft.ownerOf(1n)).to.equal(alice.address);
    expect(await overtime.isClockedIn(1n)).to.equal(false);
  });

  it("splits a distribution pro-rata across active shares", async function () {
    const { alice, bob, feeder, stockA, overtime } = await loadFixture(deployFixture);
    await overtime.connect(alice).clockIn([1n, 2n, 3n]); // 3 shares
    await overtime.connect(bob).clockIn([4n]); // 1 share → 4 total

    await overtime.connect(feeder).distribute(await stockA.getAddress(), E(400));

    const a = await overtime.withdrawableStockOf(alice.address, await stockA.getAddress());
    const b = await overtime.withdrawableStockOf(bob.address, await stockA.getAddress());
    expect(a).to.equal(E(300)); // 3/4
    expect(b).to.equal(E(100)); // 1/4
  });

  it("does not back-pay a broker that clocks in after a distribution", async function () {
    const { alice, bob, feeder, stockA, overtime } = await loadFixture(deployFixture);
    await overtime.connect(alice).clockIn([1n]); // only Alice active
    await overtime.connect(feeder).distribute(await stockA.getAddress(), E(100));
    await overtime.connect(bob).clockIn([4n]); // joins after

    expect(await overtime.withdrawableStockOf(alice.address, await stockA.getAddress())).to.equal(E(100));
    expect(await overtime.withdrawableStockOf(bob.address, await stockA.getAddress())).to.equal(0n);

    // A second distribution is now split across both.
    await overtime.connect(feeder).distribute(await stockA.getAddress(), E(100));
    expect(await overtime.withdrawableStockOf(alice.address, await stockA.getAddress())).to.equal(E(150));
    expect(await overtime.withdrawableStockOf(bob.address, await stockA.getAddress())).to.equal(E(50));
  });

  it("keeps accrued stock claimable after clocking out", async function () {
    const { alice, feeder, stockA, overtime } = await loadFixture(deployFixture);
    await overtime.connect(alice).clockIn([1n]);
    await overtime.connect(feeder).distribute(await stockA.getAddress(), E(100));
    await overtime.connect(alice).clockOut([1n]);
    // Still owed after clocking out.
    expect(await overtime.withdrawableStockOf(alice.address, await stockA.getAddress())).to.equal(E(100));

    const before = await stockA.balanceOf(alice.address);
    await overtime.connect(alice).claimStock(await stockA.getAddress());
    expect((await stockA.balanceOf(alice.address)) - before).to.equal(E(100));
    expect(await overtime.withdrawableStockOf(alice.address, await stockA.getAddress())).to.equal(0n);
  });

  it("claim() sweeps the whole basket", async function () {
    const { deployer, alice, feeder, stockA, stockB, overtime, ovAddr } = await loadFixture(deployFixture);
    await overtime.connect(alice).clockIn([1n]);
    await stockB.transfer(feeder.address, E(500));
    await stockB.connect(feeder).approve(ovAddr, ethers.MaxUint256);
    await overtime.connect(feeder).distribute(await stockA.getAddress(), E(200));
    await overtime.connect(feeder).distribute(await stockB.getAddress(), E(500));

    const a0 = await stockA.balanceOf(alice.address);
    const b0 = await stockB.balanceOf(alice.address);
    await overtime.connect(alice).claim();
    expect((await stockA.balanceOf(alice.address)) - a0).to.equal(E(200));
    expect((await stockB.balanceOf(alice.address)) - b0).to.equal(E(500));
  });

  it("reverts distribute with no active shares and for unknown stock", async function () {
    const { alice, feeder, stockA, stockB, overtime, ovAddr, deployer } = await loadFixture(deployFixture);
    await expect(overtime.connect(feeder).distribute(await stockA.getAddress(), E(1))).to.be.revertedWith("no active shares");

    await overtime.connect(alice).clockIn([1n]);
    const Rogue = await ethers.getContractFactory("StonkInu");
    const rogue = await Rogue.deploy(deployer.address);
    await rogue.approve(ovAddr, ethers.MaxUint256);
    await expect(overtime.distribute(await rogue.getAddress(), E(1))).to.be.revertedWith("unknown stock");
  });

  it("cannot clock out a broker you didn't clock in", async function () {
    const { alice, bob, overtime } = await loadFixture(deployFixture);
    await overtime.connect(alice).clockIn([1n]);
    await expect(overtime.connect(bob).clockOut([1n])).to.be.reverted;
  });

  it("harvests the brokers' own mint rewards into the pool", async function () {
    const [deployer, alice] = await ethers.getSigners();
    const Stock = await ethers.getContractFactory("StonkInu");
    const stock = await Stock.deploy(deployer.address);

    const Broker = await ethers.getContractFactory("MockOvertimeBroker");
    const broker = await Broker.deploy();
    const Overtime = await ethers.getContractFactory("BrokerOvertime");
    const overtime = await Overtime.deploy(await broker.getAddress(), [await stock.getAddress()], deployer.address);
    const ovAddr = await overtime.getAddress();

    await broker.mint(alice.address, 1);
    await broker.connect(alice).setApprovalForAll(ovAddr, true);
    await overtime.connect(alice).clockIn([1n]);

    // Fund the mock broker and set the reward it pays on claim().
    await stock.transfer(await broker.getAddress(), E(1000));
    await broker.setReward(await stock.getAddress(), E(1000));

    await overtime.harvest();
    expect(await overtime.withdrawableStockOf(alice.address, await stock.getAddress())).to.equal(E(1000));
  });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const SWAP_FEE_BPS = 200n; // 2%
const SNIPE_PREMIUM_BPS = 500n; // 5%
const ETH_FEE = ethers.parseEther("0.0005");
const BPS = 10_000n;

// Mirror of the on-chain buy quote for cross-checking.
function quoteBuy(R, n, count, snipe) {
  const base = (R * count) / (n - count);
  let tokenIn = (base * BPS) / (BPS - SWAP_FEE_BPS);
  if (snipe) tokenIn += (tokenIn * SNIPE_PREMIUM_BPS) / BPS;
  return tokenIn;
}
function quoteSell(R, n, count) {
  const gross = (R * count) / (n + count);
  return gross - (gross * SWAP_FEE_BPS) / BPS;
}

describe("BrokerAMM", function () {
  async function deployFixture() {
    const [deployer, treasury, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("StonkBroker");
    const token = await Token.deploy(deployer.address);

    const NFT = await ethers.getContractFactory("MockERC721");
    const nft = await NFT.deploy();

    const AMM = await ethers.getContractFactory("BrokerAMM");
    const amm = await AMM.deploy(
      await nft.getAddress(),
      await token.getAddress(),
      treasury.address,
      SWAP_FEE_BPS,
      SNIPE_PREMIUM_BPS,
      ETH_FEE,
      deployer.address
    );
    const ammAddr = await amm.getAddress();

    // Seed the pool: deployer mints ids 1..10 and 100k token reserve.
    const ids = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n];
    for (const id of ids) await nft.mint(deployer.address, id);
    await nft.setApprovalForAll(ammAddr, true);
    const reserve = ethers.parseEther("100000");
    await token.approve(ammAddr, ethers.MaxUint256);
    await amm.addLiquidity(ids, reserve);

    // Give alice tokens + approval to buy; bob NFTs to sell.
    await token.transfer(alice.address, ethers.parseEther("500000"));
    await token.connect(alice).approve(ammAddr, ethers.MaxUint256);

    return { deployer, treasury, alice, bob, token, nft, amm, ammAddr, ids, reserve };
  }

  it("seeds inventory and reserve", async function () {
    const { amm, reserve } = await loadFixture(deployFixture);
    expect(await amm.nftCount()).to.equal(10n);
    expect(await amm.tokenReserve()).to.equal(reserve);
    expect(await amm.isHeld(5n)).to.equal(true);
    expect(await amm.isHeld(99n)).to.equal(false);
  });

  it("prices a buy on the constant-product curve and moves the NFT + reserve", async function () {
    const { amm, token, nft, alice, ammAddr, reserve } = await loadFixture(deployFixture);
    const expected = quoteBuy(reserve, 10n, 1n, false);
    expect(await amm.quoteBuy(1n)).to.equal(expected);

    const before = await token.balanceOf(alice.address);
    await amm.connect(alice).buy(1n, ethers.MaxUint256, alice.address, { value: ETH_FEE });

    expect(await amm.nftCount()).to.equal(9n);
    expect(await amm.tokenReserve()).to.equal(reserve + expected);
    expect(await token.balanceOf(alice.address)).to.equal(before - expected);
    // Pool hands out newest first (id 10).
    expect(await nft.ownerOf(10n)).to.equal(alice.address);
    expect(await token.balanceOf(ammAddr)).to.equal(reserve + expected);
  });

  it("forwards the flat ETH fee to the treasury and refunds the excess", async function () {
    const { amm, alice, treasury } = await loadFixture(deployFixture);
    const tBefore = await ethers.provider.getBalance(treasury.address);
    // Overpay by 1 ETH — only ETH_FEE should reach the treasury.
    await amm.connect(alice).buy(1n, ethers.MaxUint256, alice.address, {
      value: ETH_FEE + ethers.parseEther("1"),
    });
    expect((await ethers.provider.getBalance(treasury.address)) - tBefore).to.equal(ETH_FEE);
  });

  it("reverts a buy when the cost exceeds maxTokenIn (slippage)", async function () {
    const { amm, alice, reserve } = await loadFixture(deployFixture);
    const cost = quoteBuy(reserve, 10n, 1n, false);
    await expect(
      amm.connect(alice).buy(1n, cost - 1n, alice.address, { value: ETH_FEE })
    ).to.be.revertedWith("slippage");
  });

  it("reverts a buy with insufficient ETH fee", async function () {
    const { amm, alice } = await loadFixture(deployFixture);
    await expect(
      amm.connect(alice).buy(1n, ethers.MaxUint256, alice.address, { value: ETH_FEE - 1n })
    ).to.be.revertedWith("insufficient eth fee");
  });

  it("cannot buy the entire inventory (must keep >= 1)", async function () {
    const { amm, alice } = await loadFixture(deployFixture);
    await expect(
      amm.connect(alice).buy(10n, ethers.MaxUint256, alice.address, { value: ETH_FEE * 10n })
    ).to.be.reverted;
  });

  it("snipes a specific id at a premium", async function () {
    const { amm, nft, alice, reserve } = await loadFixture(deployFixture);
    const expected = quoteBuy(reserve, 10n, 1n, true);
    expect(await amm.quoteSnipe(1n)).to.equal(expected);
    // Premium makes a snipe strictly pricier than an ordinary buy.
    expect(expected).to.be.greaterThan(await amm.quoteBuy(1n));

    await amm.connect(alice).snipe([3n], ethers.MaxUint256, alice.address, { value: ETH_FEE });
    expect(await nft.ownerOf(3n)).to.equal(alice.address);
    expect(await amm.isHeld(3n)).to.equal(false);
    expect(await amm.nftCount()).to.equal(9n);
  });

  it("reverts a snipe for an id the pool does not hold", async function () {
    const { amm, alice } = await loadFixture(deployFixture);
    await expect(
      amm.connect(alice).snipe([999n], ethers.MaxUint256, alice.address, { value: ETH_FEE })
    ).to.be.revertedWith("not held");
  });

  it("sells an NFT into the pool for tokens, net of fee", async function () {
    const { amm, token, nft, alice, ammAddr, reserve } = await loadFixture(deployFixture);
    // Alice first buys id 10, then sells it back.
    await amm.connect(alice).buy(1n, ethers.MaxUint256, alice.address, { value: ETH_FEE });
    const R2 = await amm.tokenReserve();
    const n2 = await amm.nftCount(); // 9

    const expectedOut = quoteSell(R2, n2, 1n);
    expect(await amm.quoteSell(1n)).to.equal(expectedOut);

    await nft.connect(alice).approve(ammAddr, 10n);
    const before = await token.balanceOf(alice.address);
    await amm.connect(alice).sell([10n], 0n, alice.address, { value: ETH_FEE });

    expect(await token.balanceOf(alice.address)).to.equal(before + expectedOut);
    expect(await amm.nftCount()).to.equal(10n);
    expect(await amm.isHeld(10n)).to.equal(true);
    expect(await amm.tokenReserve()).to.equal(R2 - expectedOut);
  });

  it("reverts a sell below minTokenOut (slippage)", async function () {
    const { amm, nft, alice, ammAddr } = await loadFixture(deployFixture);
    await amm.connect(alice).buy(1n, ethers.MaxUint256, alice.address, { value: ETH_FEE });
    await nft.connect(alice).approve(ammAddr, 10n);
    const out = await amm.quoteSell(1n);
    await expect(
      amm.connect(alice).sell([10n], out + 1n, alice.address, { value: ETH_FEE })
    ).to.be.revertedWith("slippage");
  });

  it("only the owner can add or remove liquidity, and fees are bounded", async function () {
    const { amm, alice } = await loadFixture(deployFixture);
    await expect(amm.connect(alice).addLiquidity([], 0n)).to.be.reverted;
    await expect(amm.connect(alice).removeLiquidity([], 0n, alice.address)).to.be.reverted;
    await expect(amm.setFees(1_001n, 0n, 0n)).to.be.revertedWith("swap fee too high");
    await expect(amm.setFees(0n, 2_001n, 0n)).to.be.revertedWith("premium too high");
  });

  it("owner can withdraw inventory and reserve", async function () {
    const { amm, token, nft, deployer, reserve } = await loadFixture(deployFixture);
    await amm.removeLiquidity([10n], ethers.parseEther("1000"), deployer.address);
    expect(await nft.ownerOf(10n)).to.equal(deployer.address);
    expect(await amm.nftCount()).to.equal(9n);
    expect(await amm.tokenReserve()).to.equal(reserve - ethers.parseEther("1000"));
  });

  it("rejects stray safe transfers (only booked deposits allowed)", async function () {
    const { amm, nft, deployer, ammAddr } = await loadFixture(deployFixture);
    await nft.mint(deployer.address, 50n);
    await expect(
      nft["safeTransferFrom(address,address,uint256)"](deployer.address, ammAddr, 50n)
    ).to.be.revertedWith("direct transfer");
  });
});

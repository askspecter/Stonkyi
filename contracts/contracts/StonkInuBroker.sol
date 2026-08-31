// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {IERC6551Registry} from "./erc6551/interfaces/IERC6551.sol";
import {IStockBuyer} from "./interfaces/IStockBuyer.sol";

/**
 * @title StonkInuBroker
 * @notice The StonkInu broker collection: 999 ERC-721 "broker" NFTs, each paired
 *         with its own ERC-6551 token-bound account (an on-chain wallet).
 *
 * ── Minting ────────────────────────────────────────────────────────────────
 * To mint one broker a caller must, in a single transaction:
 *   1. Burn 50,000 $STONKINU   (deflationary — supply is destroyed forever)
 *   2. Pay 0.002 ETH mint fee
 *
 * ── Automatic fee split (0.002 ETH) ─────────────────────────────────────────
 *   • 0.001 ETH → buy StockToken via the {IStockBuyer} adapter, then distribute
 *                 that stock pro-rata to *existing* broker holders (a dividend).
 *   • 0.001 ETH → the protocol treasury.
 *
 * Holders accrue stock automatically and pull it whenever they like via {claim}.
 * Stock rewards follow the NFT: transferring a broker transfers its future
 * (unclaimed) stock entitlement, using cumulative dividend accounting.
 *
 * On mint the broker's token-bound account is created through the ERC-6551
 * registry, so airdrops and rewards can be sent to the broker itself.
 */
contract StonkInuBroker is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    // ─── Mint economics ──────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY = 999;
    uint256 public constant BURN_AMOUNT = 50_000 ether; // $STONKINU burned per mint
    uint256 public constant MINT_PRICE = 0.002 ether; // ETH fee per mint
    uint256 public constant STOCK_SHARE = 0.001 ether; // → buy stock for holders
    uint256 public constant PROTOCOL_SHARE = 0.001 ether; // → protocol treasury

    // ─── Immutable protocol wiring ───────────────────────────────────────────
    ERC20Burnable public immutable stonkInu; // token burned on mint
    IStockBuyer public immutable stockBuyer; // ETH → stock adapter
    IERC20 public immutable stock; // stock token distributed to holders
    IERC6551Registry public immutable registry; // ERC-6551 registry
    address public immutable accountImplementation; // ERC-6551 account impl
    bytes32 public constant ACCOUNT_SALT = bytes32(0);

    // ─── Mutable config ──────────────────────────────────────────────────────
    address public treasury; // receives PROTOCOL_SHARE (and first-mint stock)
    string public baseTokenURI;

    // ─── Supply ──────────────────────────────────────────────────────────────
    uint256 private _nextId; // last minted id (ids are 1-indexed, never reused)

    // ─── Dividend accounting (stock rewards) ─────────────────────────────────
    uint256 internal constant MAGNITUDE = 2 ** 128;
    uint256 public magnifiedStockPerShare;
    uint256 public totalStockDistributed;
    mapping(address => int256) internal magnifiedCorrections;
    mapping(address => uint256) public withdrawnStock;

    // ─── Events ──────────────────────────────────────────────────────────────
    event BrokerMinted(address indexed to, uint256 indexed tokenId, address account);
    event StockDistributed(uint256 stockAmount, uint256 holderSupply);
    event StockClaimed(address indexed holder, uint256 amount);
    event TreasuryUpdated(address treasury);
    event BaseURIUpdated(string baseURI);

    constructor(
        address stonkInu_,
        address stockBuyer_,
        address registry_,
        address accountImplementation_,
        address treasury_,
        address owner_,
        string memory baseTokenURI_
    ) ERC721("StonkInu Broker", "BROKER") Ownable(owner_) {
        require(
            stonkInu_ != address(0) &&
                stockBuyer_ != address(0) &&
                registry_ != address(0) &&
                accountImplementation_ != address(0) &&
                treasury_ != address(0),
            "zero address"
        );
        stonkInu = ERC20Burnable(stonkInu_);
        stockBuyer = IStockBuyer(stockBuyer_);
        stock = IERC20(IStockBuyer(stockBuyer_).stockToken());
        registry = IERC6551Registry(registry_);
        accountImplementation = accountImplementation_;
        treasury = treasury_;
        baseTokenURI = baseTokenURI_;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Minting
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Mint one broker NFT to the caller.
     * @dev Caller must have approved this contract for {BURN_AMOUNT} $STONKINU and
     *      must send exactly {MINT_PRICE} ETH. Fees are split automatically.
     * @return tokenId the newly minted broker id
     * @return account the broker's ERC-6551 token-bound account
     */
    function mint() external payable nonReentrant returns (uint256 tokenId, address account) {
        require(totalSupply() < MAX_SUPPLY, "sold out");
        require(msg.value == MINT_PRICE, "wrong ETH fee");

        // 1. Burn $STONKINU from the minter (requires prior approval).
        stonkInu.burnFrom(msg.sender, BURN_AMOUNT);

        // 2. Buy stock with STOCK_SHARE and distribute it to existing holders.
        _buyAndDistributeStock();

        // 3. Forward PROTOCOL_SHARE to the treasury.
        (bool ok, ) = treasury.call{value: PROTOCOL_SHARE}("");
        require(ok, "treasury transfer failed");

        // 4. Mint the broker (ids start at 1).
        tokenId = ++_nextId;
        _safeMint(msg.sender, tokenId);

        // 5. Deploy its ERC-6551 token-bound account.
        account = registry.createAccount(
            accountImplementation,
            ACCOUNT_SALT,
            block.chainid,
            address(this),
            tokenId
        );

        emit BrokerMinted(msg.sender, tokenId, account);
    }

    function _buyAndDistributeStock() internal {
        uint256 holderSupply = totalSupply(); // holders *before* this mint
        uint256 stockBought = stockBuyer.buyStock{value: STOCK_SHARE}(address(this));

        if (holderSupply == 0) {
            // No holders yet — the very first mint's stock goes to the treasury.
            if (stockBought > 0) {
                stock.safeTransfer(treasury, stockBought);
            }
            return;
        }

        magnifiedStockPerShare += (stockBought * MAGNITUDE) / holderSupply;
        totalStockDistributed += stockBought;
        emit StockDistributed(stockBought, holderSupply);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stock rewards (pull-based)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Claim all stock rewards accrued to the caller's brokers.
    function claim() external nonReentrant returns (uint256 amount) {
        amount = withdrawableStockOf(msg.sender);
        require(amount > 0, "nothing to claim");
        withdrawnStock[msg.sender] += amount;
        stock.safeTransfer(msg.sender, amount);
        emit StockClaimed(msg.sender, amount);
    }

    /// @notice Stock currently claimable by `holder`.
    function withdrawableStockOf(address holder) public view returns (uint256) {
        return cumulativeStockOf(holder) - withdrawnStock[holder];
    }

    /// @notice Lifetime stock (claimed + unclaimed) attributable to `holder`.
    function cumulativeStockOf(address holder) public view returns (uint256) {
        int256 cumulative = (magnifiedStockPerShare * balanceOf(holder)).toInt256() +
            magnifiedCorrections[holder];
        return uint256(cumulative) / MAGNITUDE;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-6551 helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice The token-bound account address for `tokenId` (whether or not deployed yet).
    function accountOf(uint256 tokenId) external view returns (address) {
        return
            registry.account(
                accountImplementation,
                ACCOUNT_SALT,
                block.chainid,
                address(this),
                tokenId
            );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dividend correction hook — keeps entitlements attached to the NFT
    // ─────────────────────────────────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Enumerable)
        returns (address from)
    {
        from = super._update(to, tokenId, auth);

        int256 mag = magnifiedStockPerShare.toInt256();
        // `from` loses one share; `to` gains one share. Corrections preserve each
        // party's already-accrued stock across the transfer.
        if (from != address(0)) {
            magnifiedCorrections[from] += mag;
        }
        if (to != address(0)) {
            magnifiedCorrections[to] -= mag;
        }
    }

    function _increaseBalance(address account, uint128 amount)
        internal
        override(ERC721Enumerable)
    {
        super._increaseBalance(account, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "zero address");
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setBaseURI(string calldata baseTokenURI_) external onlyOwner {
        baseTokenURI = baseTokenURI_;
        emit BaseURIUpdated(baseTokenURI_);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
}

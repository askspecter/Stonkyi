// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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
 *   1. Burn 50,000 $STONKINU   (sent to the dead address — out of circulation
 *                               for good; works with any ERC-20, no burnFrom)
 *   2. Pay 0.002 ETH mint fee
 *
 * ── Automatic fee split (0.002 ETH) ─────────────────────────────────────────
 *   • 0.001 ETH → buy stock via the {IStockBuyer} adapter, which picks ONE stock
 *                 from a fixed basket (at random) and returns it; that stock is
 *                 distributed pro-rata to *existing* broker holders (a dividend).
 *   • 0.001 ETH → the protocol treasury.
 *
 * Holders accrue a mix of the basket's stocks over time and pull them whenever
 * they like via {claim}. Rewards follow the NFT: transferring a broker transfers
 * its future (unclaimed) entitlement for every stock, via cumulative dividend
 * accounting tracked per stock token.
 *
 * On mint the broker's token-bound account is created through the ERC-6551
 * registry, so airdrops and rewards can be sent to the broker itself.
 */
contract StonkInuBroker is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    // ─── Mint economics ──────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY = 999;
    uint256 public constant BURN_AMOUNT = 50_000 ether; // $STONKINU removed per mint
    uint256 public constant MINT_PRICE = 0.002 ether; // ETH fee per mint
    uint256 public constant STOCK_SHARE = 0.001 ether; // → buy stock for holders
    uint256 public constant PROTOCOL_SHARE = 0.001 ether; // → protocol treasury
    /// @notice Dead address the burned $STONKINU is sent to (provably unspendable).
    address public constant BURN_SINK = 0x000000000000000000000000000000000000dEaD;

    // ─── Immutable protocol wiring ───────────────────────────────────────────
    // Any standard ERC-20 works as $STONKINU — the burn is a transfer to the dead
    // address, so no burnFrom/mint permission on the token is required (this lets
    // a launchpad token, e.g. Pons on Robinhood Chain, be used directly).
    IERC20 public immutable stonkInu; // token "burned" (sent to BURN_SINK) on mint
    IStockBuyer public immutable stockBuyer; // ETH → stock adapter
    IERC6551Registry public immutable registry; // ERC-6551 registry
    address public immutable accountImplementation; // ERC-6551 account impl
    bytes32 public constant ACCOUNT_SALT = bytes32(0);

    /// @notice The fixed basket of stock tokens holders can accrue (snapshot of the buyer's).
    address[] public stockTokens;

    // ─── Mutable config ──────────────────────────────────────────────────────
    address public treasury; // receives PROTOCOL_SHARE (and first-mint stock)
    string public baseTokenURI;

    // ─── Supply ──────────────────────────────────────────────────────────────
    uint256 private _nextId; // last minted id (ids are 1-indexed, never reused)

    // ─── Dividend accounting (per stock token) ───────────────────────────────
    uint256 internal constant MAGNITUDE = 2 ** 128;
    mapping(address => uint256) public magnifiedStockPerShare; // token => magnified/holder
    mapping(address => uint256) public totalStockDistributed; // token => total handed out
    mapping(address => mapping(address => int256)) internal magnifiedCorrections; // token => holder => corr
    mapping(address => mapping(address => uint256)) public withdrawnStock; // token => holder => withdrawn

    // ─── Events ──────────────────────────────────────────────────────────────
    event BrokerMinted(address indexed to, uint256 indexed tokenId, address account);
    event StockDistributed(address indexed stock, uint256 stockAmount, uint256 holderSupply);
    event StockClaimed(address indexed holder, address indexed stock, uint256 amount);
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
        stonkInu = IERC20(stonkInu_);
        stockBuyer = IStockBuyer(stockBuyer_);
        registry = IERC6551Registry(registry_);
        accountImplementation = accountImplementation_;
        treasury = treasury_;
        baseTokenURI = baseTokenURI_;

        // Snapshot the buyer's stock basket so dividend accounting has a fixed set.
        address[] memory basket = IStockBuyer(stockBuyer_).stockTokens();
        require(basket.length > 0, "empty basket");
        for (uint256 i = 0; i < basket.length; i++) {
            require(basket[i] != address(0), "zero stock");
            stockTokens.push(basket[i]);
        }
    }

    /// @notice Number of distinct stock tokens in the basket.
    function stockTokenCount() external view returns (uint256) {
        return stockTokens.length;
    }

    /// @notice The full basket of stock tokens.
    function stockTokenList() external view returns (address[] memory) {
        return stockTokens;
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

        // 1. "Burn" $STONKINU: pull it from the minter and send it to the dead
        //    address (requires prior approval). Works with any ERC-20.
        stonkInu.safeTransferFrom(msg.sender, BURN_SINK, BURN_AMOUNT);

        // 2. Buy a (random) stock with STOCK_SHARE and distribute it to existing holders.
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
        (address stock, uint256 stockBought) = stockBuyer.buyStock{value: STOCK_SHARE}(address(this));

        if (holderSupply == 0) {
            // No holders yet — the very first mint's stock goes to the treasury.
            if (stockBought > 0) {
                IERC20(stock).safeTransfer(treasury, stockBought);
            }
            return;
        }

        magnifiedStockPerShare[stock] += (stockBought * MAGNITUDE) / holderSupply;
        totalStockDistributed[stock] += stockBought;
        emit StockDistributed(stock, stockBought, holderSupply);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stock rewards (pull-based)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Claim all accrued rewards across every stock in the basket.
    function claim() external nonReentrant {
        address holder = msg.sender;
        uint256 n = stockTokens.length;
        for (uint256 i = 0; i < n; i++) {
            _claimOne(holder, stockTokens[i]);
        }
    }

    /// @notice Claim accrued rewards for a single stock token.
    function claimStock(address stock) external nonReentrant returns (uint256 amount) {
        amount = _claimOne(msg.sender, stock);
        require(amount > 0, "nothing to claim");
    }

    function _claimOne(address holder, address stock) internal returns (uint256 amount) {
        amount = withdrawableStockOf(holder, stock);
        if (amount == 0) return 0;
        withdrawnStock[stock][holder] += amount;
        IERC20(stock).safeTransfer(holder, amount);
        emit StockClaimed(holder, stock, amount);
    }

    /// @notice Stock of `stock` currently claimable by `holder`.
    function withdrawableStockOf(address holder, address stock) public view returns (uint256) {
        return cumulativeStockOf(holder, stock) - withdrawnStock[stock][holder];
    }

    /// @notice Lifetime `stock` (claimed + unclaimed) attributable to `holder`.
    function cumulativeStockOf(address holder, address stock) public view returns (uint256) {
        int256 cumulative = (magnifiedStockPerShare[stock] * balanceOf(holder)).toInt256() +
            magnifiedCorrections[stock][holder];
        return uint256(cumulative) / MAGNITUDE;
    }

    /// @notice Convenience: every stock token and the amount `holder` can claim of each.
    function withdrawableAll(address holder)
        external
        view
        returns (address[] memory tokens, uint256[] memory amounts)
    {
        uint256 n = stockTokens.length;
        tokens = new address[](n);
        amounts = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            tokens[i] = stockTokens[i];
            amounts[i] = withdrawableStockOf(holder, stockTokens[i]);
        }
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

        // `from` loses one share; `to` gains one share. Corrections preserve each
        // party's already-accrued stock across the transfer, for every token.
        uint256 n = stockTokens.length;
        for (uint256 i = 0; i < n; i++) {
            address stock = stockTokens[i];
            int256 mag = magnifiedStockPerShare[stock].toInt256();
            if (from != address(0)) {
                magnifiedCorrections[stock][from] += mag;
            }
            if (to != address(0)) {
                magnifiedCorrections[stock][to] -= mag;
            }
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

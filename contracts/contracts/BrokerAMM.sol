// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BrokerAMM ("Anvil")
 * @notice A constant-product NFT automated market maker: brokers are bought,
 *         sold and sniped against $STONKBROKER, with a small flat ETH fee per
 *         item that funds the protocol.
 *
 * Pricing follows the classic x*y=k curve on two reserves:
 *   - `tokenReserve`  — $STONKBROKER held by the pool
 *   - `nftCount()`    — how many broker NFTs the pool holds
 *
 * Buying n NFTs removes them from inventory and pushes tokenReserve up; selling
 * n adds them and pulls tokenReserve down. A `swapFeeBps` cut on every trade
 * stays in the pool (growing the reserve for every liquidity holder); a flat
 * `ethFeePerItem` is forwarded to the treasury. `snipe` is a buy where the
 * caller names the exact tokenIds, optionally at a `snipePremiumBps` markup.
 *
 * Liquidity is single-provider for this version: the owner seeds inventory and
 * reserve with {addLiquidity} and can pull it back with {removeLiquidity}. An
 * LP-token model for open liquidity is a later upgrade.
 *
 * @dev All state (reserve + inventory) is updated before any NFT transfer out,
 *      and every external entry point is `nonReentrant`.
 */
contract BrokerAMM is Ownable, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    /// @notice Hard ceilings so fees can never be set abusively high.
    uint256 public constant MAX_SWAP_FEE_BPS = 1_000; // 10%
    uint256 public constant MAX_SNIPE_PREMIUM_BPS = 2_000; // 20%

    /// @notice The broker NFT collection this pool trades.
    IERC721 public immutable nft;
    /// @notice The ERC-20 the pool is priced and traded in.
    IERC20 public immutable token;

    /// @notice $STONKBROKER currently held by the pool (the curve's x reserve).
    uint256 public tokenReserve;

    /// @notice Where the flat per-item ETH fee is forwarded.
    address public treasury;
    /// @notice Fee on every swap, kept in the pool. In basis points.
    uint256 public swapFeeBps;
    /// @notice Extra markup applied to a snipe's token cost. In basis points.
    uint256 public snipePremiumBps;
    /// @notice Flat ETH fee charged per NFT bought or sold, sent to treasury.
    uint256 public ethFeePerItem;

    /// @notice Inventory of tokenIds the pool holds, in insertion order.
    uint256[] private _heldIds;
    /// @notice tokenId => (index in _heldIds) + 1. 0 means "not held".
    mapping(uint256 => uint256) private _heldIndex;

    event LiquidityAdded(address indexed from, uint256[] ids, uint256 tokenAmount);
    event LiquidityRemoved(address indexed to, uint256[] ids, uint256 tokenAmount);
    event Buy(address indexed buyer, address indexed to, uint256[] ids, uint256 tokenIn, uint256 ethFee);
    event Sell(address indexed seller, address indexed to, uint256[] ids, uint256 tokenOut, uint256 ethFee);
    event TreasuryUpdated(address treasury);
    event FeesUpdated(uint256 swapFeeBps, uint256 snipePremiumBps, uint256 ethFeePerItem);

    constructor(
        address nft_,
        address token_,
        address treasury_,
        uint256 swapFeeBps_,
        uint256 snipePremiumBps_,
        uint256 ethFeePerItem_,
        address owner_
    ) Ownable(owner_) {
        require(nft_ != address(0) && token_ != address(0) && treasury_ != address(0), "zero address");
        require(swapFeeBps_ <= MAX_SWAP_FEE_BPS, "swap fee too high");
        require(snipePremiumBps_ <= MAX_SNIPE_PREMIUM_BPS, "premium too high");
        nft = IERC721(nft_);
        token = IERC20(token_);
        treasury = treasury_;
        swapFeeBps = swapFeeBps_;
        snipePremiumBps = snipePremiumBps_;
        ethFeePerItem = ethFeePerItem_;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Number of broker NFTs currently in the pool (the curve's y reserve).
    function nftCount() public view returns (uint256) {
        return _heldIds.length;
    }

    /// @notice Whether the pool currently holds `tokenId`.
    function isHeld(uint256 tokenId) public view returns (bool) {
        return _heldIndex[tokenId] != 0;
    }

    /// @notice The full inventory list (small collections; 999 max supply).
    function heldIds() external view returns (uint256[] memory) {
        return _heldIds;
    }

    /**
     * @notice $STONKBROKER needed to buy `count` NFTs, fee included.
     * @dev Reverts if the pool can't keep at least one NFT after the trade.
     */
    function quoteBuy(uint256 count) public view returns (uint256 tokenIn) {
        return _quoteBuy(count, false);
    }

    /// @notice $STONKBROKER needed to snipe `count` specific NFTs, fee + premium included.
    function quoteSnipe(uint256 count) public view returns (uint256 tokenIn) {
        return _quoteBuy(count, true);
    }

    /// @notice $STONKBROKER the seller receives for selling `count` NFTs, fee deducted.
    function quoteSell(uint256 count) public view returns (uint256 tokenOut) {
        require(count > 0, "count = 0");
        uint256 n = nftCount();
        // gross = R * count / (n + count)  (constant product), then take the fee.
        uint256 gross = (tokenReserve * count) / (n + count);
        tokenOut = gross - (gross * swapFeeBps) / BPS;
    }

    function _quoteBuy(uint256 count, bool isSnipe) internal view returns (uint256 tokenIn) {
        require(count > 0, "count = 0");
        uint256 n = nftCount();
        require(count < n, "not enough inventory");
        // Base cost so that (R + base)*(n - count) = R*n  →  base = R*count/(n-count).
        uint256 base = (tokenReserve * count) / (n - count);
        // Fee is charged on the input (uniswap-style): grossUp by 1/(1-fee).
        tokenIn = (base * BPS) / (BPS - swapFeeBps);
        if (isSnipe && snipePremiumBps > 0) {
            tokenIn += (tokenIn * snipePremiumBps) / BPS;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Trading
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Buy `count` NFTs from the pool (it chooses which, newest first).
     * @param count       How many brokers to buy.
     * @param maxTokenIn  Slippage guard: revert if the cost exceeds this.
     * @param to          Recipient of the NFTs.
     */
    function buy(uint256 count, uint256 maxTokenIn, address to)
        external
        payable
        nonReentrant
        returns (uint256[] memory ids, uint256 tokenIn)
    {
        ids = new uint256[](count);
        uint256 n = _heldIds.length;
        for (uint256 i = 0; i < count; i++) {
            ids[i] = _heldIds[n - 1 - i]; // newest first; validated inside _buy
        }
        tokenIn = _buy(ids, maxTokenIn, to, false);
    }

    /**
     * @notice Buy specific brokers by id ("snipe"), optionally at a premium.
     * @param ids         The exact tokenIds to take; each must be in the pool.
     * @param maxTokenIn  Slippage guard: revert if the cost exceeds this.
     * @param to          Recipient of the NFTs.
     */
    function snipe(uint256[] calldata ids, uint256 maxTokenIn, address to)
        external
        payable
        nonReentrant
        returns (uint256 tokenIn)
    {
        return _buy(ids, maxTokenIn, to, true);
    }

    function _buy(uint256[] memory ids, uint256 maxTokenIn, address to, bool isSnipe)
        internal
        returns (uint256 tokenIn)
    {
        require(to != address(0), "zero recipient");
        uint256 count = ids.length;
        tokenIn = _quoteBuy(count, isSnipe);
        require(tokenIn <= maxTokenIn, "slippage");

        uint256 ethFee = ethFeePerItem * count;
        require(msg.value >= ethFee, "insufficient eth fee");

        // Effects: pull payment, grow the reserve, remove inventory — before any
        // NFT leaves the pool.
        token.safeTransferFrom(msg.sender, address(this), tokenIn);
        tokenReserve += tokenIn;
        for (uint256 i = 0; i < count; i++) {
            _removeId(ids[i]);
        }

        // Interactions.
        for (uint256 i = 0; i < count; i++) {
            nft.transferFrom(address(this), to, ids[i]);
        }
        _payEthFee(ethFee);

        emit Buy(msg.sender, to, ids, tokenIn, ethFee);
    }

    /**
     * @notice Sell brokers into the pool for $STONKBROKER.
     * @param ids          The tokenIds to sell (caller must own & have approved them).
     * @param minTokenOut  Slippage guard: revert if the payout is below this.
     * @param to           Recipient of the $STONKBROKER.
     */
    function sell(uint256[] calldata ids, uint256 minTokenOut, address to)
        external
        payable
        nonReentrant
        returns (uint256 tokenOut)
    {
        require(to != address(0), "zero recipient");
        uint256 count = ids.length;
        require(count > 0, "count = 0");

        tokenOut = quoteSell(count);
        require(tokenOut >= minTokenOut, "slippage");
        require(tokenOut <= tokenReserve, "reserve too low");

        uint256 ethFee = ethFeePerItem * count;
        require(msg.value >= ethFee, "insufficient eth fee");

        // Effects: shrink the reserve and take inventory in before paying out.
        tokenReserve -= tokenOut;
        for (uint256 i = 0; i < count; i++) {
            nft.transferFrom(msg.sender, address(this), ids[i]);
            _addId(ids[i]);
        }

        // Interactions.
        token.safeTransfer(to, tokenOut);
        _payEthFee(ethFee);

        emit Sell(msg.sender, to, ids, tokenOut, ethFee);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Liquidity (single-provider: owner)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Seed/add inventory and reserve. Owner must own & approve the NFTs.
    function addLiquidity(uint256[] calldata ids, uint256 tokenAmount) external onlyOwner nonReentrant {
        for (uint256 i = 0; i < ids.length; i++) {
            nft.transferFrom(msg.sender, address(this), ids[i]);
            _addId(ids[i]);
        }
        if (tokenAmount > 0) {
            token.safeTransferFrom(msg.sender, address(this), tokenAmount);
            tokenReserve += tokenAmount;
        }
        emit LiquidityAdded(msg.sender, ids, tokenAmount);
    }

    /// @notice Withdraw inventory and reserve back to the owner.
    function removeLiquidity(uint256[] calldata ids, uint256 tokenAmount, address to)
        external
        onlyOwner
        nonReentrant
    {
        require(to != address(0), "zero recipient");
        require(tokenAmount <= tokenReserve, "reserve too low");
        if (tokenAmount > 0) {
            tokenReserve -= tokenAmount;
            token.safeTransfer(to, tokenAmount);
        }
        for (uint256 i = 0; i < ids.length; i++) {
            _removeId(ids[i]);
            nft.transferFrom(address(this), to, ids[i]);
        }
        emit LiquidityRemoved(to, ids, tokenAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "zero address");
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setFees(uint256 swapFeeBps_, uint256 snipePremiumBps_, uint256 ethFeePerItem_)
        external
        onlyOwner
    {
        require(swapFeeBps_ <= MAX_SWAP_FEE_BPS, "swap fee too high");
        require(snipePremiumBps_ <= MAX_SNIPE_PREMIUM_BPS, "premium too high");
        swapFeeBps = swapFeeBps_;
        snipePremiumBps = snipePremiumBps_;
        ethFeePerItem = ethFeePerItem_;
        emit FeesUpdated(swapFeeBps_, snipePremiumBps_, ethFeePerItem_);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────────────────

    function _addId(uint256 tokenId) internal {
        require(_heldIndex[tokenId] == 0, "already held");
        _heldIds.push(tokenId);
        _heldIndex[tokenId] = _heldIds.length; // index + 1
    }

    function _removeId(uint256 tokenId) internal {
        uint256 idxPlusOne = _heldIndex[tokenId];
        require(idxPlusOne != 0, "not held");
        uint256 idx = idxPlusOne - 1;
        uint256 lastIdx = _heldIds.length - 1;
        if (idx != lastIdx) {
            uint256 lastId = _heldIds[lastIdx];
            _heldIds[idx] = lastId;
            _heldIndex[lastId] = idx + 1;
        }
        _heldIds.pop();
        delete _heldIndex[tokenId];
    }

    function _payEthFee(uint256 ethFee) internal {
        if (ethFee > 0) {
            (bool ok, ) = treasury.call{value: ethFee}("");
            require(ok, "eth fee transfer failed");
        }
        uint256 refund = msg.value - ethFee;
        if (refund > 0) {
            (bool ok2, ) = msg.sender.call{value: refund}("");
            require(ok2, "refund failed");
        }
    }

    /// @dev Accept NFTs only via our own bookkeeping paths (addLiquidity/sell).
    function onERC721Received(address operator, address, uint256, bytes calldata)
        external
        view
        returns (bytes4)
    {
        require(operator == address(this), "direct transfer");
        return IERC721Receiver.onERC721Received.selector;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

interface IStonkInuBroker {
    function claim() external;
    function stockTokenList() external view returns (address[] memory);
}

/**
 * @title BrokerOvertime ("Clock In")
 * @notice Put a StonkInu Broker to work: clock it in to start earning a share of
 *         every tokenized-stock distribution; clock it out to stop and take it back.
 *
 * Activation is custodial by design — clocking in deposits the broker NFT into
 * this contract. That makes the reward math sound: shares can't shift under a
 * distribution because ownership of a working broker can't change while it's
 * here. Each clocked-in broker is one share; distributions split pro-rata across
 * all currently-active shares, magnified-dividend style, and are pull-based.
 *
 * Two things feed the pool:
 *   - {distribute} — anyone (e.g. the Anvil fee router) deposits a basket stock.
 *   - {harvest}    — pulls the brokers' own mint-time stock rewards (this contract
 *                    holds the staked NFTs, so it accrues them) and rolls them in.
 *
 * @dev Correction bookkeeping mirrors StonkInuBroker's: a share joining is
 *      debited the running per-share so it can't claim past distributions, and a
 *      share leaving is credited so its accrued stock stays claimable.
 */
contract BrokerOvertime is Ownable, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    uint256 internal constant MAGNITUDE = 2 ** 128;

    /// @notice The broker collection whose NFTs are clocked in here.
    IERC721 public immutable nft;
    /// @notice Same collection, typed for harvesting its mint rewards.
    IStonkInuBroker public immutable broker;

    /// @notice The stock tokens that can be distributed (the broker's basket).
    address[] public stockTokens;
    mapping(address => bool) public isStock;

    /// @notice Total brokers currently clocked in (the share denominator).
    uint256 public totalActive;
    /// @notice Clocked-in brokers held for each staker (their share count).
    mapping(address => uint256) public activeShares;
    /// @notice Who clocked in a given tokenId (address(0) if not active).
    mapping(uint256 => address) public stakerOf;

    // Magnified-dividend accounting, per stock token.
    mapping(address => uint256) public magnifiedStockPerShare; // token => magnified/share
    mapping(address => mapping(address => int256)) internal magnifiedCorrections; // token => staker => corr
    mapping(address => mapping(address => uint256)) public withdrawnStock; // token => staker => withdrawn

    // Per-staker inventory of clocked-in tokenIds (for the UI).
    mapping(address => uint256[]) private _staked;
    mapping(uint256 => uint256) private _stakedIndex; // tokenId => (index in owner list) + 1

    event ClockedIn(address indexed staker, uint256 indexed tokenId);
    event ClockedOut(address indexed staker, uint256 indexed tokenId);
    event Distributed(address indexed stock, uint256 amount, uint256 activeShares);
    event Claimed(address indexed staker, address indexed stock, uint256 amount);
    event StockAdded(address indexed stock);

    constructor(address broker_, address[] memory stocks_, address owner_) Ownable(owner_) {
        require(broker_ != address(0), "zero broker");
        nft = IERC721(broker_);
        broker = IStonkInuBroker(broker_);
        for (uint256 i = 0; i < stocks_.length; i++) {
            _addStock(stocks_[i]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Clock in / out
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Clock in brokers to start earning (deposits the NFTs here).
    function clockIn(uint256[] calldata tokenIds) external nonReentrant {
        uint256 count = tokenIds.length;
        require(count > 0, "no tokens");
        // Every joining share is debited the running per-share so it earns only
        // from future distributions.
        uint256 n = stockTokens.length;
        for (uint256 i = 0; i < count; i++) {
            uint256 id = tokenIds[i];
            require(stakerOf[id] == address(0), "already clocked in");
            nft.transferFrom(msg.sender, address(this), id);
            stakerOf[id] = msg.sender;
            _pushStaked(msg.sender, id);
            emit ClockedIn(msg.sender, id);
        }
        for (uint256 j = 0; j < n; j++) {
            int256 mag = magnifiedStockPerShare[stockTokens[j]].toInt256();
            magnifiedCorrections[stockTokens[j]][msg.sender] -= mag * int256(count);
        }
        activeShares[msg.sender] += count;
        totalActive += count;
    }

    /// @notice Clock out brokers (returns the NFTs). Accrued stock stays claimable.
    function clockOut(uint256[] calldata tokenIds) external nonReentrant {
        uint256 count = tokenIds.length;
        require(count > 0, "no tokens");
        uint256 n = stockTokens.length;
        for (uint256 j = 0; j < n; j++) {
            int256 mag = magnifiedStockPerShare[stockTokens[j]].toInt256();
            magnifiedCorrections[stockTokens[j]][msg.sender] += mag * int256(count);
        }
        activeShares[msg.sender] -= count; // reverts on underflow if not the staker's
        totalActive -= count;
        for (uint256 i = 0; i < count; i++) {
            uint256 id = tokenIds[i];
            require(stakerOf[id] == msg.sender, "not your broker");
            stakerOf[id] = address(0);
            _popStaked(msg.sender, id);
            nft.transferFrom(address(this), msg.sender, id);
            emit ClockedOut(msg.sender, id);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Feeding the pool
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Deposit `amount` of a basket `stock` and split it across active shares.
    function distribute(address stock, uint256 amount) external nonReentrant {
        require(isStock[stock], "unknown stock");
        require(amount > 0, "amount = 0");
        IERC20(stock).safeTransferFrom(msg.sender, address(this), amount);
        _accrue(stock, amount);
    }

    /// @notice Pull the staked brokers' own mint-time stock rewards and roll them
    ///         into the overtime pool. Permissionless.
    function harvest() external nonReentrant returns (uint256 distributions) {
        require(totalActive > 0, "no active brokers");
        uint256 n = stockTokens.length;
        uint256[] memory before = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            before[i] = IERC20(stockTokens[i]).balanceOf(address(this));
        }
        broker.claim();
        for (uint256 i = 0; i < n; i++) {
            uint256 delta = IERC20(stockTokens[i]).balanceOf(address(this)) - before[i];
            if (delta > 0) {
                _accrue(stockTokens[i], delta);
                distributions++;
            }
        }
    }

    function _accrue(address stock, uint256 amount) internal {
        require(totalActive > 0, "no active shares");
        magnifiedStockPerShare[stock] += (amount * MAGNITUDE) / totalActive;
        emit Distributed(stock, amount, totalActive);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Claiming
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Claim all accrued stock across the basket.
    function claim() external nonReentrant {
        uint256 n = stockTokens.length;
        for (uint256 i = 0; i < n; i++) {
            _claimOne(msg.sender, stockTokens[i]);
        }
    }

    /// @notice Claim accrued rewards for a single stock token.
    function claimStock(address stock) external nonReentrant returns (uint256 amount) {
        amount = _claimOne(msg.sender, stock);
        require(amount > 0, "nothing to claim");
    }

    function _claimOne(address staker, address stock) internal returns (uint256 amount) {
        amount = withdrawableStockOf(staker, stock);
        if (amount == 0) return 0;
        withdrawnStock[stock][staker] += amount;
        IERC20(stock).safeTransfer(staker, amount);
        emit Claimed(staker, stock, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    function withdrawableStockOf(address staker, address stock) public view returns (uint256) {
        return cumulativeStockOf(staker, stock) - withdrawnStock[stock][staker];
    }

    function cumulativeStockOf(address staker, address stock) public view returns (uint256) {
        int256 cumulative = (magnifiedStockPerShare[stock] * activeShares[staker]).toInt256() +
            magnifiedCorrections[stock][staker];
        return uint256(cumulative) / MAGNITUDE;
    }

    /// @notice Every basket stock and the amount `staker` can claim of each.
    function withdrawableAll(address staker)
        external
        view
        returns (address[] memory tokens, uint256[] memory amounts)
    {
        uint256 n = stockTokens.length;
        tokens = new address[](n);
        amounts = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            tokens[i] = stockTokens[i];
            amounts[i] = withdrawableStockOf(staker, stockTokens[i]);
        }
    }

    function isClockedIn(uint256 tokenId) external view returns (bool) {
        return stakerOf[tokenId] != address(0);
    }

    /// @notice The tokenIds `staker` currently has clocked in.
    function stakedOf(address staker) external view returns (uint256[] memory) {
        return _staked[staker];
    }

    function stockCount() external view returns (uint256) {
        return stockTokens.length;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Add a stock token to the distributable basket.
    function addStock(address stock) external onlyOwner {
        _addStock(stock);
    }

    function _addStock(address stock) internal {
        require(stock != address(0), "zero stock");
        require(!isStock[stock], "exists");
        isStock[stock] = true;
        stockTokens.push(stock);
        emit StockAdded(stock);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────────────────

    function _pushStaked(address staker, uint256 id) internal {
        _staked[staker].push(id);
        _stakedIndex[id] = _staked[staker].length; // index + 1
    }

    function _popStaked(address staker, uint256 id) internal {
        uint256 idxPlusOne = _stakedIndex[id];
        uint256 idx = idxPlusOne - 1;
        uint256[] storage arr = _staked[staker];
        uint256 lastIdx = arr.length - 1;
        if (idx != lastIdx) {
            uint256 lastId = arr[lastIdx];
            arr[idx] = lastId;
            _stakedIndex[lastId] = idx + 1;
        }
        arr.pop();
        delete _stakedIndex[id];
    }

    function onERC721Received(address operator, address, uint256, bytes calldata)
        external
        view
        returns (bytes4)
    {
        require(operator == address(this), "direct transfer");
        return IERC721Receiver.onERC721Received.selector;
    }
}

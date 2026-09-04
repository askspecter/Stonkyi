// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IStockBuyer} from "./interfaces/IStockBuyer.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";
import {IWETH9} from "./interfaces/IWETH9.sol";

/**
 * @title UniswapV3StockBuyer
 * @notice Production {IStockBuyer}: on each call it picks one stock from a fixed
 *         basket (at random) and swaps the incoming ETH into it through a
 *         Uniswap V3 pool (SwapRouter02), delivering the output to `recipient`.
 *
 * Flow per call: choose a stock → wrap ETH → WETH → approve the router →
 * `exactInputSingle` (WETH → stock) to `recipient`. A per-token `minStockPerEth`
 * floor sets `amountOutMinimum` so a thin pool or sandwich can't drain the swap.
 *
 * @dev The basket is fixed at construction (the broker snapshots it), so tokens
 *      cannot be added/removed later — only per-token pool fee and slippage
 *      floor are adjustable. Randomness is pseudo-random (block data + a nonce),
 *      good enough for a cosmetic "which stock did I get" pick but NOT secure
 *      against a determined block producer; the per-buy value is tiny by design.
 */
contract UniswapV3StockBuyer is IStockBuyer, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Wrapped ETH used as the swap input token.
    IWETH9 public immutable weth;
    /// @notice Uniswap V3 SwapRouter02.
    ISwapRouter public immutable swapRouter;

    /// @notice The fixed basket of tokenized stocks this buyer can deliver.
    address[] private _stocks;
    /// @notice Default Uniswap V3 pool fee tier used when no per-token override is set.
    uint24 public defaultPoolFee;
    /// @notice Per-token pool fee tier override (0 = use {defaultPoolFee}).
    mapping(address => uint24) public poolFeeOf;
    /// @notice Per-token slippage floor: min stock out per 1 ETH in (18 decimals). 0 disables.
    mapping(address => uint256) public minStockPerEthOf;

    uint256 private _nonce;

    event StockBought(address indexed recipient, address indexed stock, uint256 ethIn, uint256 stockOut);
    event DefaultPoolFeeUpdated(uint24 poolFee);
    event PoolFeeUpdated(address indexed stock, uint24 poolFee);
    event MinStockPerEthUpdated(address indexed stock, uint256 minStockPerEth);

    constructor(
        address[] memory stocks_,
        uint24 defaultPoolFee_,
        address weth_,
        address swapRouter_,
        address owner_
    ) Ownable(owner_) {
        require(stocks_.length > 0, "empty basket");
        require(weth_ != address(0) && swapRouter_ != address(0), "zero address");
        for (uint256 i = 0; i < stocks_.length; i++) {
            require(stocks_[i] != address(0), "zero stock");
            _stocks.push(stocks_[i]);
        }
        defaultPoolFee = defaultPoolFee_;
        weth = IWETH9(weth_);
        swapRouter = ISwapRouter(swapRouter_);
    }

    function stockTokens() external view returns (address[] memory) {
        return _stocks;
    }

    function stockCount() external view returns (uint256) {
        return _stocks.length;
    }

    function buyStock(address recipient)
        external
        payable
        returns (address stock, uint256 stockAmount)
    {
        require(msg.value > 0, "no ETH sent");

        // 1. Pick a stock from the basket (pseudo-random).
        uint256 n = _stocks.length;
        uint256 idx = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    block.prevrandao,
                    tx.origin,
                    recipient,
                    _nonce++
                )
            )
        ) % n;
        stock = _stocks[idx];

        // 2. Wrap the incoming ETH into WETH and let the router pull it.
        weth.deposit{value: msg.value}();
        IERC20(address(weth)).forceApprove(address(swapRouter), msg.value);

        // 3. Swap WETH -> chosen stock, delivered straight to the recipient.
        uint24 fee = poolFeeOf[stock];
        if (fee == 0) fee = defaultPoolFee;
        uint256 amountOutMinimum = (msg.value * minStockPerEthOf[stock]) / 1 ether;
        stockAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(weth),
                tokenOut: stock,
                fee: fee,
                recipient: recipient,
                amountIn: msg.value,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        emit StockBought(recipient, stock, msg.value, stockAmount);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setDefaultPoolFee(uint24 poolFee_) external onlyOwner {
        defaultPoolFee = poolFee_;
        emit DefaultPoolFeeUpdated(poolFee_);
    }

    function setPoolFee(address stock, uint24 poolFee_) external onlyOwner {
        poolFeeOf[stock] = poolFee_;
        emit PoolFeeUpdated(stock, poolFee_);
    }

    function setMinStockPerEth(address stock, uint256 minStockPerEth_) external onlyOwner {
        minStockPerEthOf[stock] = minStockPerEth_;
        emit MinStockPerEthUpdated(stock, minStockPerEth_);
    }
}

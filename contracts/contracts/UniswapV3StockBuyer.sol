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
 * @notice Production {IStockBuyer}: swaps the ETH it receives into a real
 *         tokenized-stock ERC-20 through a Uniswap V3 pool, delivering the
 *         output straight to the recipient.
 *
 * Flow per call: wrap ETH → WETH, approve the router, `exactInputSingle`
 * (WETH → stock) with the stock sent to `recipient`. A configurable
 * `minStockPerEth` floor sets `amountOutMinimum` so a thin pool or sandwich
 * can't drain the swap to nothing.
 */
contract UniswapV3StockBuyer is IStockBuyer, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The tokenized stock delivered to holders.
    IERC20 public immutable stock;
    /// @notice Wrapped ETH used as the swap input token.
    IWETH9 public immutable weth;
    /// @notice Uniswap V3 SwapRouter.
    ISwapRouter public immutable swapRouter;

    /// @notice Uniswap V3 pool fee tier for the WETH/stock pool (e.g. 3000 = 0.3%).
    uint24 public poolFee;
    /// @notice Slippage floor: minimum stock out per 1 ETH in (18 decimals). 0 disables the floor.
    uint256 public minStockPerEth;

    event StockBought(address indexed recipient, uint256 ethIn, uint256 stockOut);
    event PoolFeeUpdated(uint24 poolFee);
    event MinStockPerEthUpdated(uint256 minStockPerEth);

    constructor(
        address stock_,
        address weth_,
        address swapRouter_,
        uint24 poolFee_,
        uint256 minStockPerEth_,
        address owner_
    ) Ownable(owner_) {
        require(
            stock_ != address(0) && weth_ != address(0) && swapRouter_ != address(0),
            "zero address"
        );
        stock = IERC20(stock_);
        weth = IWETH9(weth_);
        swapRouter = ISwapRouter(swapRouter_);
        poolFee = poolFee_;
        minStockPerEth = minStockPerEth_;
    }

    function stockToken() external view returns (address) {
        return address(stock);
    }

    function buyStock(address recipient) external payable returns (uint256 stockAmount) {
        require(msg.value > 0, "no ETH sent");

        // 1. Wrap the incoming ETH into WETH held by this contract.
        weth.deposit{value: msg.value}();

        // 2. Let the router pull exactly this swap's WETH.
        IERC20(address(weth)).forceApprove(address(swapRouter), msg.value);

        // 3. Swap WETH -> stock, delivered straight to the recipient.
        uint256 amountOutMinimum = (msg.value * minStockPerEth) / 1 ether;
        stockAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(weth),
                tokenOut: address(stock),
                fee: poolFee,
                recipient: recipient,
                deadline: block.timestamp,
                amountIn: msg.value,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        emit StockBought(recipient, msg.value, stockAmount);
    }

    function setPoolFee(uint24 poolFee_) external onlyOwner {
        poolFee = poolFee_;
        emit PoolFeeUpdated(poolFee_);
    }

    function setMinStockPerEth(uint256 minStockPerEth_) external onlyOwner {
        minStockPerEth = minStockPerEth_;
        emit MinStockPerEthUpdated(minStockPerEth_);
    }
}

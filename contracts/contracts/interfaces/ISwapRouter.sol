// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ISwapRouter (Uniswap V3 subset)
 * @notice Minimal interface for the canonical Uniswap V3 SwapRouter
 *         (0xE592427A0AEce92De3Edee1F18E0157C05861564), enough to perform a
 *         single-hop `exactInputSingle` swap.
 */
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another token.
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

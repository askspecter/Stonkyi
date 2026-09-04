// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ISwapRouter (Uniswap V3 SwapRouter02 subset)
 * @notice Minimal interface for Uniswap's SwapRouter02 (a.k.a. IV3SwapRouter),
 *         enough to perform a single-hop `exactInputSingle` swap.
 *
 * @dev SwapRouter02's `ExactInputSingleParams` has NO `deadline` field (unlike
 *      the original V3 SwapRouter). SwapRouter02 is the router deployed on
 *      Robinhood Chain and most current Uniswap V3 chains; deadline protection,
 *      when needed, is applied via the router's `multicall(deadline, data)`.
 */
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISwapRouter} from "../interfaces/ISwapRouter.sol";
import {StockToken} from "../StockToken.sol";

/**
 * @title MockSwapRouter
 * @notice Test/local stand-in for the Uniswap V3 SwapRouter. Pulls `tokenIn`
 *         from the caller and delivers `tokenOut` (a mintable {StockToken}) to
 *         the recipient at a fixed rate, honoring `amountOutMinimum`.
 *
 * Requires being set as a minter on the StockToken.
 */
contract MockSwapRouter is ISwapRouter {
    using SafeERC20 for IERC20;

    /// @notice tokenOut minted per 1 tokenIn (18 decimals).
    uint256 public immutable rate;

    constructor(uint256 rate_) {
        rate = rate_;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        amountOut = (params.amountIn * rate) / 1 ether;
        require(amountOut >= params.amountOutMinimum, "Too little received");
        StockToken(params.tokenOut).mint(params.recipient, amountOut);
    }
}

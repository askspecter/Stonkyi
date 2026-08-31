// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IWETH9 — wrapped-ether interface (deposit + ERC-20).
interface IWETH9 is IERC20 {
    /// @notice Wrap ETH into WETH 1:1, crediting the caller.
    function deposit() external payable;

    /// @notice Unwrap WETH back into ETH.
    function withdraw(uint256 amount) external;
}

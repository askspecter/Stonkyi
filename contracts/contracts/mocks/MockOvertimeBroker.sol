// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Test-only broker: an ERC-721 whose claim() pays out a preset stock
///         amount to the caller, standing in for StonkInuBroker mint rewards.
contract MockOvertimeBroker is ERC721 {
    address public rewardStock;
    uint256 public rewardAmount;

    constructor() ERC721("Mock Broker", "MBK") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function setReward(address stock, uint256 amount) external {
        rewardStock = stock;
        rewardAmount = amount;
    }

    /// @dev Pays `rewardAmount` of `rewardStock` (once) to the caller, if funded.
    function claim() external {
        if (rewardStock != address(0) && rewardAmount > 0) {
            uint256 amt = rewardAmount;
            rewardAmount = 0;
            IERC20(rewardStock).transfer(msg.sender, amt);
        }
    }

    function stockTokenList() external view returns (address[] memory list) {
        list = new address[](1);
        list[0] = rewardStock;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StockToken
 * @notice A tokenized stock (e.g. a wrapped equity share) that the protocol buys
 *         with a slice of every mint fee and distributes to broker NFT holders.
 *
 * On mainnet this would be an existing tokenized-equity asset acquired through a
 * DEX. For local development and testnets, the protocol's {StockBuyer} is granted
 * mint rights so the "buy stock with ETH" step is fully self-contained.
 */
contract StockToken is ERC20, Ownable {
    /// @notice Addresses allowed to mint new stock (e.g. the StockBuyer).
    mapping(address => bool) public minters;

    event MinterSet(address indexed minter, bool allowed);

    constructor(string memory name_, string memory symbol_, address owner_)
        ERC20(name_, symbol_)
        Ownable(owner_)
    {}

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
        emit MinterSet(minter, allowed);
    }

    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "StockToken: not a minter");
        _mint(to, amount);
    }
}

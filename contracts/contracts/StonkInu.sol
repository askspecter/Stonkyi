// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StonkInu ($STONKINU)
 * @notice The collection / utility token of the StonkInu protocol.
 *
 * Minting a StonkInu Broker NFT requires burning 50,000 $STONKINU, so the token
 * is deflationary: every broker minted permanently removes supply from circulation.
 *
 * The full supply is minted once to the deployer at construction. There is no
 * further mint path — supply can only ever go down (via burn).
 */
contract StonkInu is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    /// @notice Total supply minted at genesis: 1,000,000,000 $STONKINU.
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;

    constructor(address initialHolder)
        ERC20("StonkInu", "STONKINU")
        ERC20Permit("StonkInu")
        Ownable(initialHolder)
    {
        _mint(initialHolder, INITIAL_SUPPLY);
    }
}

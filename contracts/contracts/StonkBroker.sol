// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StonkBroker ($STONKBROKER)
 * @notice The collection / trading token of the StonkInu ecosystem.
 *
 * $STONKBROKER is the currency of the broker marketplace: brokers are bought,
 * sold and sniped against it in the on-chain NFT AMM ({BrokerAMM}), and AMM
 * trading fees are later routed into tokenized-stock rewards for activated
 * brokers.
 *
 * The full supply is minted once to the deployer at construction — there is no
 * further mint path, so supply is fixed and can only ever fall (via burn). The
 * deployer seeds the AMM and any launch liquidity from this balance.
 */
contract StonkBroker is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    /// @notice Total supply minted at genesis: 1,000,000,000 $STONKBROKER.
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;

    constructor(address initialHolder)
        ERC20("StonkBroker", "STONKBROKER")
        ERC20Permit("StonkBroker")
        Ownable(initialHolder)
    {
        _mint(initialHolder, INITIAL_SUPPLY);
    }
}

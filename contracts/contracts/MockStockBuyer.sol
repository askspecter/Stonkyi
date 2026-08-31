// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStockBuyer} from "./interfaces/IStockBuyer.sol";
import {StockToken} from "./StockToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockStockBuyer
 * @notice Self-contained {IStockBuyer} for local dev / testnets.
 *
 * It mints StockToken to the recipient at a fixed rate in exchange for the ETH
 * sent, simulating a DEX swap. The collected ETH is forwarded to a treasury.
 * Replace with a Uniswap-router-backed buyer for mainnet.
 */
contract MockStockBuyer is IStockBuyer, Ownable {
    /// @notice The stock token this buyer delivers.
    StockToken public immutable stock;

    /// @notice Stock tokens minted per 1 ETH of input (18 decimals).
    uint256 public stockPerEth;

    /// @notice Destination for the ETH spent buying stock.
    address public treasury;

    event StockBought(address indexed recipient, uint256 ethIn, uint256 stockOut);
    event RateUpdated(uint256 stockPerEth);
    event TreasuryUpdated(address treasury);

    constructor(address stock_, uint256 stockPerEth_, address treasury_, address owner_)
        Ownable(owner_)
    {
        require(stock_ != address(0) && treasury_ != address(0), "zero address");
        stock = StockToken(stock_);
        stockPerEth = stockPerEth_;
        treasury = treasury_;
    }

    function stockToken() external view returns (address) {
        return address(stock);
    }

    function buyStock(address recipient) external payable returns (uint256 stockAmount) {
        require(msg.value > 0, "no ETH sent");
        stockAmount = (msg.value * stockPerEth) / 1 ether;
        stock.mint(recipient, stockAmount);

        (bool ok, ) = treasury.call{value: msg.value}("");
        require(ok, "treasury transfer failed");

        emit StockBought(recipient, msg.value, stockAmount);
    }

    function setRate(uint256 stockPerEth_) external onlyOwner {
        stockPerEth = stockPerEth_;
        emit RateUpdated(stockPerEth_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "zero address");
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }
}

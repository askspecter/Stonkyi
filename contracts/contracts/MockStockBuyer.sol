// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStockBuyer} from "./interfaces/IStockBuyer.sol";
import {StockToken} from "./StockToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockStockBuyer
 * @notice Self-contained {IStockBuyer} for local dev / testnets.
 *
 * It holds a basket of mintable {StockToken}s, picks one at random per call, and
 * mints it to the recipient at a fixed rate in exchange for the ETH sent —
 * simulating "swap ETH for a random stock". The ETH is forwarded to a treasury.
 * Replace with a Uniswap-router-backed buyer for mainnet.
 */
contract MockStockBuyer is IStockBuyer, Ownable {
    /// @notice The basket of stock tokens this buyer can deliver.
    address[] private _stocks;

    /// @notice Stock tokens minted per 1 ETH of input (18 decimals).
    uint256 public stockPerEth;

    /// @notice Destination for the ETH spent buying stock.
    address public treasury;

    uint256 private _nonce;

    event StockBought(address indexed recipient, address indexed stock, uint256 ethIn, uint256 stockOut);
    event RateUpdated(uint256 stockPerEth);
    event TreasuryUpdated(address treasury);

    constructor(address[] memory stocks_, uint256 stockPerEth_, address treasury_, address owner_)
        Ownable(owner_)
    {
        require(stocks_.length > 0, "empty basket");
        require(treasury_ != address(0), "zero address");
        for (uint256 i = 0; i < stocks_.length; i++) {
            require(stocks_[i] != address(0), "zero stock");
            _stocks.push(stocks_[i]);
        }
        stockPerEth = stockPerEth_;
        treasury = treasury_;
    }

    function stockTokens() external view returns (address[] memory) {
        return _stocks;
    }

    function stockCount() external view returns (uint256) {
        return _stocks.length;
    }

    function buyStock(address recipient)
        external
        payable
        returns (address stock, uint256 stockAmount)
    {
        require(msg.value > 0, "no ETH sent");
        uint256 idx = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, recipient, _nonce++))
        ) % _stocks.length;
        stock = _stocks[idx];

        stockAmount = (msg.value * stockPerEth) / 1 ether;
        StockToken(stock).mint(recipient, stockAmount);

        (bool ok, ) = treasury.call{value: msg.value}("");
        require(ok, "treasury transfer failed");

        emit StockBought(recipient, stock, msg.value, stockAmount);
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IStockBuyer
 * @notice Pluggable adapter that converts ETH into StockToken.
 *
 * The StonkInuBroker sends a slice of every mint fee here and receives stock
 * tokens back. Swap out the implementation (mock mint on testnets, Uniswap
 * router on mainnet) without touching the broker contract.
 */
interface IStockBuyer {
    /// @notice The stock token delivered by {buyStock}.
    function stockToken() external view returns (address);

    /**
     * @notice Convert the ETH sent with this call into stock tokens.
     * @param recipient address that receives the purchased stock tokens
     * @return stockAmount amount of stock tokens delivered to `recipient`
     */
    function buyStock(address recipient) external payable returns (uint256 stockAmount);
}

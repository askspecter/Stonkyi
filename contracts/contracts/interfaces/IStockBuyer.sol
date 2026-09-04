// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IStockBuyer
 * @notice Pluggable adapter that converts ETH into one of several StockTokens.
 *
 * The StonkInuBroker sends a slice of every mint fee here. The buyer picks one
 * stock from its basket (at random) and returns which token it bought plus the
 * amount, so the broker can distribute that specific token to holders. Swap out
 * the implementation (mock mint on testnets, Uniswap router on mainnet) without
 * touching the broker contract.
 */
interface IStockBuyer {
    /// @notice The full, fixed basket of stock tokens this buyer can deliver.
    function stockTokens() external view returns (address[] memory);

    /**
     * @notice Convert the ETH sent with this call into one (randomly chosen)
     *         stock token from the basket.
     * @param recipient address that receives the purchased stock tokens
     * @return stockToken the token that was bought (a member of {stockTokens})
     * @return stockAmount amount of `stockToken` delivered to `recipient`
     */
    function buyStock(address recipient)
        external
        payable
        returns (address stockToken, uint256 stockAmount);
}

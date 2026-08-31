// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev the ERC-165 identifier for this interface is `0x400a0398`
interface IERC6551Registry {
    /// @notice Emitted when a new ERC-6551 account is created.
    event ERC6551AccountCreated(
        address account,
        address indexed implementation,
        bytes32 salt,
        uint256 chainId,
        address indexed tokenContract,
        uint256 indexed tokenId
    );

    /// @notice The registry MUST revert with AccountCreationFailed error if the create2 operation fails.
    error AccountCreationFailed();

    /// @notice Creates a token bound account for a non-fungible token.
    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external returns (address account);

    /// @notice Returns the computed token bound account address for a non-fungible token.
    function account(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external view returns (address account);
}

/// @dev the ERC-165 identifier for this interface is `0x6faff5f1`
interface IERC6551Account {
    /// @dev Allows the account to receive Ether.
    receive() external payable;

    /// @notice Returns a nonce that increases on every successful state-changing execute() call.
    function state() external view returns (uint256);

    /// @notice Returns a magic value (this function's selector) if `signer` is authorized to act on behalf of the account.
    function isValidSigner(address signer, bytes calldata context)
        external
        view
        returns (bytes4 magicValue);

    /// @notice Returns the identifier of the non-fungible token which owns the account.
    function token()
        external
        view
        returns (uint256 chainId, address tokenContract, uint256 tokenId);
}

/// @dev the ERC-165 identifier for this interface is `0x51945447`
interface IERC6551Executable {
    /// @notice Executes a low-level operation if the caller is a valid signer on the account.
    /// @param operation The operation type — only 0 (CALL) is supported here.
    function execute(address to, uint256 value, bytes calldata data, uint8 operation)
        external
        payable
        returns (bytes memory);
}

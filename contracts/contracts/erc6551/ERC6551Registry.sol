// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {IERC6551Registry} from "./interfaces/IERC6551.sol";

/**
 * @title ERC6551Registry
 * @notice ERC-6551 registry that deploys deterministic token-bound accounts.
 *
 * Each account is an ERC-1167 minimal proxy pointing at `implementation`, with
 * the tuple (salt, chainId, tokenContract, tokenId) appended to its runtime
 * bytecode so the account can read its own binding. This mirrors the canonical
 * registry's account bytecode layout, implemented in plain Solidity for clarity.
 *
 * Runtime bytecode layout of a deployed account:
 *   [ ERC-1167 header (10) | implementation (20) | ERC-1167 footer (15)
 *     | salt (32) | chainId (32) | tokenContract (32) | tokenId (32) ]   = 173 bytes
 */
contract ERC6551Registry is IERC6551Registry {
    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external returns (address) {
        bytes memory code = _creationCode(implementation, salt, chainId, tokenContract, tokenId);
        address predicted = Create2.computeAddress(salt, keccak256(code));

        if (predicted.code.length != 0) {
            // Account already exists — return it (idempotent).
            return predicted;
        }

        address deployed;
        try this.deploy(salt, code) returns (address a) {
            deployed = a;
        } catch {
            revert AccountCreationFailed();
        }

        emit ERC6551AccountCreated(
            deployed, implementation, salt, chainId, tokenContract, tokenId
        );
        return deployed;
    }

    function account(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external view returns (address) {
        bytes memory code = _creationCode(implementation, salt, chainId, tokenContract, tokenId);
        return Create2.computeAddress(salt, keccak256(code));
    }

    /// @dev External helper so registry can `try/catch` a failed CREATE2 deploy.
    function deploy(bytes32 salt, bytes memory code) external returns (address) {
        require(msg.sender == address(this), "internal only");
        return Create2.deploy(0, salt, code);
    }

    /**
     * @dev Builds the full CREATE2 init code for a token-bound account.
     *
     * Prefix `3d60ad80600a3d3981f3` returns the 173-byte (0xad) runtime that
     * starts 10 bytes in. The runtime is the ERC-1167 clone of `implementation`
     * followed by the appended (salt, chainId, tokenContract, tokenId).
     */
    function _creationCode(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                hex"3d60ad80600a3d3981f3363d3d373d3d3d363d73",
                implementation,
                hex"5af43d82803e903d91602b57fd5bf3",
                salt,
                chainId,
                uint256(uint160(tokenContract)),
                tokenId
            );
    }
}

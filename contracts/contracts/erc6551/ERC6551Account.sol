// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {IERC6551Account, IERC6551Executable} from "./interfaces/IERC6551.sol";

/**
 * @title ERC6551Account
 * @notice A minimal, self-owned token-bound account for a StonkInu Broker NFT.
 *
 * Deployed once as an implementation; the registry clones it per NFT. Each clone
 * has (salt, chainId, tokenContract, tokenId) appended to its bytecode, letting
 * it resolve its controlling NFT and, in turn, that NFT's owner.
 *
 * The current owner of the bound NFT is the sole signer: they can execute calls
 * from the account, giving every broker its own on-chain wallet that can hold
 * stock tokens, airdrops and other assets.
 */
contract ERC6551Account is
    IERC165,
    IERC1271,
    IERC6551Account,
    IERC6551Executable,
    IERC721Receiver,
    IERC1155Receiver
{
    /// @notice Increments on every successful state-changing execute().
    uint256 public state;

    receive() external payable {}

    /**
     * @notice Execute a call from this account. Only the owner of the bound NFT may call.
     * @param operation Must be 0 (CALL).
     */
    function execute(address to, uint256 value, bytes calldata data, uint8 operation)
        external
        payable
        returns (bytes memory result)
    {
        require(_isValidSigner(msg.sender), "ERC6551: invalid signer");
        require(operation == 0, "ERC6551: only call operations");

        ++state;

        bool success;
        (success, result) = to.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /// @notice Returns the (chainId, tokenContract, tokenId) this account is bound to.
    function token() public view returns (uint256, address, uint256) {
        bytes memory footer = new bytes(0x60);
        assembly {
            // Skip the ERC-1167 header/impl/footer (0x2d) + salt (0x20) = 0x4d.
            extcodecopy(address(), add(footer, 0x20), 0x4d, 0x60)
        }
        return abi.decode(footer, (uint256, address, uint256));
    }

    /// @notice The current owner of the bound NFT (only meaningful on the NFT's home chain).
    function owner() public view returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);
        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function isValidSigner(address signer, bytes calldata)
        external
        view
        returns (bytes4)
    {
        if (_isValidSigner(signer)) {
            return IERC6551Account.isValidSigner.selector;
        }
        return bytes4(0);
    }

    function isValidSignature(bytes32 hash, bytes memory signature)
        external
        view
        returns (bytes4)
    {
        bool valid = SignatureChecker.isValidSignatureNow(owner(), hash, signature);
        return valid ? IERC1271.isValidSignature.selector : bytes4(0);
    }

    function _isValidSigner(address signer) internal view returns (bool) {
        return signer == owner();
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC6551Account).interfaceId ||
            interfaceId == type(IERC6551Executable).interfaceId ||
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC1271).interfaceId;
    }
}

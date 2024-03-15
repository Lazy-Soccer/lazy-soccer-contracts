// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

abstract contract ERC721Lockable is ERC721, AccessControl {
    bytes32 public constant LOCKER = keccak256("LOCKER");
    mapping(uint256 => bool) public isLocked;

    event NFTLockedForGame(uint256 indexed tokenId);
    event NFTUnlockedForGame(uint256 indexed tokenId);

    error NftLocked();
    error NftUnlocked();
    error LockNotAccessible();

    modifier unlockedForGame(uint256 tokenId) {
        if (isLocked[tokenId]) {
            revert NftLocked();
        }
        _;
    }

    modifier lockedForGame(uint256 tokenId) {
        if (!isLocked[tokenId]) {
            revert NftUnlocked();
        }
        _;
    }

    modifier hasLockAccess(uint256 tokenId) {
        address sender = _msgSender();

        if (_ownerOf(tokenId) != sender && !hasRole(LOCKER, sender)) {
            revert LockNotAccessible();
        }

        _;
    }

    function unlockNftForGame(uint256 tokenId) external {
        _unlockNftForGame(tokenId);
    }

    function unlockBatch(uint256[] calldata tokenIds) external {
        for (uint256 i; i < tokenIds.length; ) {
            _unlockNftForGame(tokenIds[i]);

            unchecked {
                ++i;
            }
        }
    }

    function lockNftForGame(uint256 tokenId) external {
        _lockNftForGame(tokenId);
    }

    function lockBatch(uint256[] calldata tokenIds) external {
        for (uint256 i; i < tokenIds.length; ) {
            _lockNftForGame(tokenIds[i]);

            unchecked {
                ++i;
            }
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _lockNftForGame(
        uint256 tokenId
    ) private hasLockAccess(tokenId) unlockedForGame(tokenId) {
        isLocked[tokenId] = true;

        emit NFTLockedForGame(tokenId);
    }

    function _unlockNftForGame(
        uint256 tokenId
    ) private hasLockAccess(tokenId) lockedForGame(tokenId) {
        delete isLocked[tokenId];

        emit NFTUnlockedForGame(tokenId);
    }
}

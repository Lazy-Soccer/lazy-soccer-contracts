// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

abstract contract NftLock is ERC721 {
    mapping(uint256 => bool) public lockedNftForGame;

    event NFTLockedForGame(uint256 indexed tokenId);
    event NFTUnlockedForGame(uint256 indexed tokenId);

    error NftLocked();
    error NftUnlocked();
    error NotNftOwner();

    modifier unlockedForGame(uint256 tokenId) {
        if (lockedNftForGame[tokenId]) {
            revert NftLocked();
        }
        _;
    }

    modifier onlyNftOwner(uint256 tokenId) {
        if (_ownerOf(tokenId) != msg.sender) {
            revert NotNftOwner();
        }
        _;
    }

    function unlockNftForGame(uint256 tokenId) external {
        _unlockNftForGame(tokenId);
    }

    function unlockBatch(uint256[] calldata tokenIds) external {
        uint256 length = tokenIds.length;

        for (uint256 i; i < length; ) {
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
        uint256 length = tokenIds.length;

        for (uint256 i; i < length; ) {
            _lockNftForGame(tokenIds[i]);

            unchecked {
                ++i;
            }
        }
    }

    function _lockNftForGame(
        uint256 tokenId
    ) private onlyNftOwner(tokenId) unlockedForGame(tokenId) {
        lockedNftForGame[tokenId] = true;

        emit NFTLockedForGame(tokenId);
    }

    function _unlockNftForGame(uint256 tokenId) private onlyNftOwner(tokenId) {
        if (!lockedNftForGame[tokenId]) {
            revert NftUnlocked();
        }

        delete lockedNftForGame[tokenId];

        emit NFTUnlockedForGame(tokenId);
    }
}

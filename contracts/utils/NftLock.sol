// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

abstract contract NftLock is ERC721 {
    mapping(uint256 => bool) public lockedNftForGame;

    event NFTLockedForGame(uint256 indexed tokenId);
    event NFTUnlockedForGame(uint256 indexed tokenId);

    modifier unlockedForGame(uint256 tokenId) {
        require(!lockedNftForGame[tokenId], "NFT locked");
        _;
    }

    modifier onlyNftOwner(uint256 tokenId) {
        require(_ownerOf(tokenId) == msg.sender, "Not NFT owner");
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
        require(lockedNftForGame[tokenId], "Nft is unlocked");
        delete lockedNftForGame[tokenId];

        emit NFTUnlockedForGame(tokenId);
    }
}

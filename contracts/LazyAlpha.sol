// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LazyAlpha is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    mapping(uint256 => bool) public lockedNftForGame;

    event NFTLockedForGame(uint256 indexed tokenId);
    event NFTUnlockedForGame(uint256 indexed tokenId);

    constructor() ERC721("Lazy Alpha", "LA") {}

    modifier onlyUnlockedForGame(uint256 tokenId) {
        require(!lockedNftForGame[tokenId], "NFT is locked in game");
        _;
    }

    modifier onlyNftOwner(uint256 tokenId) {
        require(_ownerOf(tokenId) == msg.sender, "Not NFT owner");
        _;
    }

    function lockNftForGame(
        uint256 tokenId
    ) external onlyNftOwner(tokenId) onlyUnlockedForGame(tokenId) {
        lockedNftForGame[tokenId] = true;

        emit NFTLockedForGame(tokenId);
    }

    function unlockNftForGame(uint256 tokenId) external onlyNftOwner(tokenId) {
        require(lockedNftForGame[tokenId], "Nft is unlocked");
        delete lockedNftForGame[tokenId];

        emit NFTUnlockedForGame(tokenId);
    }

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override onlyUnlockedForGame(tokenId) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override onlyUnlockedForGame(tokenId) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override onlyUnlockedForGame(tokenId) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function approve(
        address to,
        uint256 tokenId
    ) public virtual override onlyUnlockedForGame(tokenId) {
        super.approve(to, tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

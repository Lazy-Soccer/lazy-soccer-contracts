// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LazyBox is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    event BoxOpened(address indexed owner, uint256 indexed tokenId);

    constructor() ERC721("Lazy Boxes", "LB") {}

    function safeMint(address to, string memory _ipfsHash) public onlyOwner {
        _tokenIdCounter.increment();

        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _ipfsHash);
    }

    function openBatch(uint256[] calldata tokenIds) external {
        uint256 length = tokenIds.length;

        for (uint256 i; i < length; ) {
            _openBox(tokenIds[i]);

            unchecked {
                ++i;
            }
        }
    }

    function openBox(uint256 tokenId) external {
        _openBox(tokenId);
    }

    function _openBox(uint256 tokenId) private {
        require(_ownerOf(tokenId) == msg.sender, "Not NFT owner");

        _burn(tokenId);
        emit BoxOpened(msg.sender, tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721) {
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
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

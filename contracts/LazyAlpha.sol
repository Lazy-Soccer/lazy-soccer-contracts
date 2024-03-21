// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./extensions/ERC721Lockable.sol";
import "./extensions/TransferBlacklist.sol";

contract LazyAlpha is
    ERC721,
    ERC721URIStorage,
    ERC721Lockable,
    TransferBlacklist
{
    using Strings for uint256;

    constructor() ERC721("Lazy Alpha", "LA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mintBatch(
        address to,
        uint256[] calldata tokenIds,
        string[] memory uris
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < tokenIds.length; ) {
            _safeMint(to, tokenIds[i]);
            _setTokenURI(tokenIds[i], uris[i]);

            unchecked {
                ++i;
            }
        }
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function approve(
        address to,
        uint256 tokenId
    ) public override(IERC721, ERC721, TransferBlacklist) {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(
        address operator,
        bool approved
    ) public override(IERC721, ERC721, TransferBlacklist) {
        super.setApprovalForAll(operator, approved);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Lockable, ERC721URIStorage, TransferBlacklist)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override unlockedForGame(tokenId) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}

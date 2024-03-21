// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./extensions/ERC721Lockable.sol";
import "./extensions/TransferBlacklist.sol";

contract LazyAlpha is ERC721, ERC721Lockable, TransferBlacklist {
    using Strings for uint256;

    constructor() ERC721("Lazy Alpha", "LA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mintBatch(
        address to,
        uint256[] calldata tokenIds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < tokenIds.length; ) {
            _safeMint(to, tokenIds[i]);

            unchecked {
                ++i;
            }
        }
    }

    function approve(address to, uint256 tokenId) public override(ERC721, TransferBlacklist) {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public override(ERC721, TransferBlacklist) {
        super.setApprovalForAll(operator, approved);
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        string memory baseURI = _baseURI();
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Lockable, TransferBlacklist) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmRSXsDSSPR9BEchy9qX3gLiq3RANCoy9jA53A5oSGYuRC/";
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

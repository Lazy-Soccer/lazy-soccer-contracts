// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./extensions/ERC721Lockable.sol";
import "./extensions/TransferBlacklist.sol";

contract LazyAlpha is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ERC721Lockable,
    TransferBlacklist,
    ERC2981Upgradeable
{
    using Strings for uint256;

    uint96 public royaltyFraction;

    function initialize(address royaltyReceiver, uint96 feeNumerator) public initializer {
        __ERC721_init("Lazy Alpha", "LA");
        __ERC2981_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        setDefaultRoyalty(royaltyReceiver, feeNumerator);
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
    )
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function approve(
        address to,
        uint256 tokenId
    )
        public
        override(IERC721Upgradeable, ERC721Upgradeable, TransferBlacklist)
    {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(
        address operator,
        bool approved
    )
        public
        override(IERC721Upgradeable, ERC721Upgradeable, TransferBlacklist)
    {
        super.setApprovalForAll(operator, approved);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721Upgradeable,
            ERC721Lockable,
            ERC721URIStorageUpgradeable,
            TransferBlacklist,
            ERC2981Upgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyRole(DEFAULT_ADMIN_ROLE) {
        royaltyFraction = feeNumerator;
        super._setDefaultRoyalty(receiver, feeNumerator);
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
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

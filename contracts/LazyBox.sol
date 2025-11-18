// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./extensions/TransferBlacklist.sol";

contract LazyBoxStorage {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    uint96 public royaltyFraction;

    uint256[50] private __gap;

    function counter() internal view returns (Counters.Counter storage) {
        return _tokenIdCounter;
    }
}

contract LazyBox is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    TransferBlacklist,
    OwnableUpgradeable,
    LazyBoxStorage,
    ERC2981Upgradeable
{
    using Counters for Counters.Counter;

    event BoxOpened(address indexed owner, uint256 indexed tokenId);

    function initialize() public initializer {
        __Ownable_init();
        __ERC2981_init();
        __ERC721_init("Lazy Boxes", "LB");
    }

    function safeMint(address to, string memory _ipfsHash) public onlyOwner {
        _safeMint(to, _ipfsHash);
    }

    function safeMintBatch(
        address[] memory _to,
        string[] memory _ipfs,
        uint256 _length
    ) public onlyOwner {
        require(
            _to.length == _ipfs.length,
            "LazyBox::safeMintBatch: Arrays are not equal in length"
        );
        require(
            _to.length == _length,
            "LazyBox::safeMintBatch: Array length not equal length"
        );

        for (uint256 i; i < _to.length; ) {
            _safeMint(_to[i], _ipfs[i]);

            unchecked {
                ++i;
            }
        }
    }

    function _safeMint(address to, string memory _ipfsHash) private {
        counter().increment();

        uint256 tokenId = counter().current();

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
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
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

    function setTokenURIBatch(uint256[] memory _tokenIds, string[] memory _tokenURIs, uint256 _length) external onlyOwner {
        require(
            _tokenIds.length == _tokenURIs.length,
            "LazyBox::setTokenURIBatch: Arrays are not equal in length"
        );
        require(
            _tokenIds.length == _length,
            "LazyBox::setTokenURIBatch: Array length not equal length"
        );

        for (uint256 i; i < _tokenIds.length; ) {
            super._setTokenURI(_tokenIds[i], _tokenURIs[i]);
            unchecked {
                ++i;
            }
        }
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner {
        royaltyFraction = feeNumerator;
        super._setDefaultRoyalty(receiver, feeNumerator);
    }

    function burn(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
    }

    function burnBatch(uint256[] calldata tokenIds) external onlyOwner {
        uint256 length = tokenIds.length;

        for (uint256 i; i < length; ) {
            _burn(tokenIds[i]);

            unchecked {
                ++i;
            }
        }
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721Upgradeable,
            ERC721URIStorageUpgradeable,
            TransferBlacklist,
            ERC2981Upgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

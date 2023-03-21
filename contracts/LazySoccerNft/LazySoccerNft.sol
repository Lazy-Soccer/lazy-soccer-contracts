// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./ILazySoccerNft.sol";

contract LazySoccerNFT is
    ILazySoccerNFT,
    ERC721Enumerable,
    ERC721URIStorage,
    Ownable
{
    mapping(uint256 => uint256) private _unspentSkills;
    mapping(uint256 => NftSkills) private _nftStats;
    mapping(uint256 => StuffNFTRarity) private _nftRarity;
    mapping(uint256 => bool) private _lockedNft;
    mapping(uint256 => bool) private _nonce;
    address[] _calltransactionAddresses;

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        _calltransactionAddresses = [
            0x484fBFa6B5122a736b1b9f33574db8A4b640a922,
            0x45579121E2CbEF84737401d3f0899473A6630E1e
        ];
    }

    function mint(
        address to,
        uint256 tokenId,
        string memory ipfsHash,
        NftSkills memory nftSkills,
        uint256 unspentSkills,
        StuffNFTRarity rarity
    ) public override(ILazySoccerNFT) onlyAvailableAddresses {
        require(
            _nonce[tokenId] == false,
            "Nft with the same id already minted"
        );
        require(to != address(0), "Invalid address");

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsHash);
        _unspentSkills[tokenId] = unspentSkills;
        _nftStats[tokenId] = nftSkills;
        _nftRarity[tokenId] = rarity;
        _nonce[tokenId] = true;

        emit NewNFTMinted(to, ipfsHash, tokenId);
    }

    function breedNft(
        uint256 firstParrentTokenId,
        uint256 secondParrentTokenId,
        address to,
        uint256 childTokenId,
        string memory childNftIpfsHash,
        NftSkills memory nftSkills,
        uint256 unspentSkills
    )
        external
        override(ILazySoccerNFT)
        onlyAvailableAddresses
        onlyUnlocked(firstParrentTokenId)
        onlyUnlocked(secondParrentTokenId)
    {
        require(
            _ownerOf(firstParrentTokenId) == to &&
                _ownerOf(secondParrentTokenId) == to,
            "Nfts must have 1 owner"
        );
        require(
            _nftRarity[firstParrentTokenId] == _nftRarity[secondParrentTokenId],
            "Nft must have one rarity"
        );
        require(
            _nftRarity[firstParrentTokenId] <= StuffNFTRarity.Epic,
            "You can`t breed Legendary nft"
        );

        _burnTokenForBreed(firstParrentTokenId);
        _burnTokenForBreed(secondParrentTokenId);

        uint256 nftRarity = uint256(_nftRarity[firstParrentTokenId]) + 1;

        mint(
            to,
            childTokenId,
            childNftIpfsHash,
            nftSkills,
            unspentSkills,
            StuffNFTRarity(nftRarity)
        );

        emit NFTBreeded(
            to,
            firstParrentTokenId,
            secondParrentTokenId,
            childTokenId
        );
    }

    function _burnTokenForBreed(uint256 tokenId) private {
        delete _unspentSkills[tokenId];
        delete _nftStats[tokenId];
        delete _nftRarity[tokenId];
        delete _lockedNft[tokenId];
        delete _nonce[tokenId];

        _burn(tokenId);
    }

    function updateNft(
        uint256 tokenId,
        NftSkills memory changeInTokenSkills
    ) external override(ILazySoccerNFT) onlyAvailableAddresses {
        require(
            changeInTokenSkills.MarketerLVL +
                changeInTokenSkills.AccountantLVL <=
                _unspentSkills[tokenId],
            "Scarcity of unspent skills"
        );
        require(
            _nftStats[tokenId].MarketerLVL + changeInTokenSkills.MarketerLVL >
                0,
            "Lvl must be more than 0"
        );
        require(
            _nftStats[tokenId].AccountantLVL +
                changeInTokenSkills.AccountantLVL >
                0,
            "Lvl must be more than 0"
        );

        _nftStats[tokenId].MarketerLVL += changeInTokenSkills.MarketerLVL;
        _nftStats[tokenId].AccountantLVL += changeInTokenSkills.AccountantLVL;

        _unspentSkills[tokenId] -= (changeInTokenSkills.MarketerLVL +
            changeInTokenSkills.AccountantLVL);

        emit NFTUpdated(
            tokenId,
            changeInTokenSkills.MarketerLVL,
            changeInTokenSkills.AccountantLVL
        );
    }

    function lockNft(
        uint256 tokenId
    ) public override(ILazySoccerNFT) onlyAvailableAddresses {
        require(_lockedNft[tokenId] == false, "Nft already locked");
        _lockedNft[tokenId] = true;

        emit NFTLocked(tokenId);
    }

    function unlockNft(
        uint256 tokenId
    ) public override(ILazySoccerNFT) onlyAvailableAddresses {
        require(_lockedNft[tokenId] == true, "Nft already unlocked");
        delete _lockedNft[tokenId];

        emit NFTUnlocked(tokenId);
    }

    function getUnspentSkills(
        uint256 tokenId
    ) public view override(ILazySoccerNFT) returns (uint256) {
        return _unspentSkills[tokenId];
    }

    function getNftStats(
        uint256 tokenId
    ) public view override(ILazySoccerNFT) returns (NftSkills memory) {
        return _nftStats[tokenId];
    }

    function getNftRarity(
        uint256 tokenId
    ) public view override(ILazySoccerNFT) returns (StuffNFTRarity) {
        return _nftRarity[tokenId];
    }

    function checkIsNftLocked(
        uint256 tokenId
    ) public view override(ILazySoccerNFT) returns (bool) {
        return _lockedNft[tokenId];
    }

    function walletOfOwner(
        address _owner
    ) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) onlyUnlocked(tokenId) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) onlyUnlocked(tokenId) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721, IERC721) onlyUnlocked(tokenId) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function approve(
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) onlyUnlocked(tokenId) {
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

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(IERC165, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return
            ERC721.supportsInterface(interfaceId) ||
            ERC721Enumerable.supportsInterface(interfaceId);
    }

    function changeCallTransactionAddresses(
        address[] memory _newAddresses
    ) public onlyOwner {
        _calltransactionAddresses = _newAddresses;
    }

    modifier onlyAvailableAddresses() {
        bool doesListContainElement = false;
        for (uint256 i = 0; i < _calltransactionAddresses.length; i++) {
            if (msg.sender == _calltransactionAddresses[i]) {
                doesListContainElement = true;

                break;
            }
        }
        require(doesListContainElement, "Not have permission");
        _;
    }

    modifier onlyUnlocked(uint256 tokenId) {
        require(!_lockedNft[tokenId], "NFT is locked");
        _;
    }
}

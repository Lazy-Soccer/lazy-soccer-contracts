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
    mapping(uint256 => bool) private _lockedNftForGame;
    mapping(uint256 => bool) private _lockedNftForMarket;
    mapping(uint256 => bool) private _nonce;
    address[] _calltransactionAddresses;
    address ingameMarketAddress;

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        ingameMarketAddress = 0x3DA9Ac2697abe7feB96d7438aa4bd7720c1D8b18;

        _calltransactionAddresses = [
            0x484fBFa6B5122a736b1b9f33574db8A4b640a922,
            0x45579121E2CbEF84737401d3f0899473A6630E1e,
            0x3DA9Ac2697abe7feB96d7438aa4bd7720c1D8b18
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
        uint256 childTokenId,
        string memory childNftIpfsHash,
        NftSkills memory nftSkills,
        uint256 unspentSkills
    )
        external
        override(ILazySoccerNFT)
        onlyNftOwner(firstParrentTokenId)
        onlyNftOwner(secondParrentTokenId)
        onlyUnlockedForGame(firstParrentTokenId)
        onlyUnlockedForGame(secondParrentTokenId)
        onlyUnlockedForMarket(firstParrentTokenId)
        onlyUnlockedForMarket(secondParrentTokenId)
    {
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
            msg.sender,
            childTokenId,
            childNftIpfsHash,
            nftSkills,
            unspentSkills,
            StuffNFTRarity(nftRarity)
        );

        emit NFTBreeded(
            msg.sender,
            firstParrentTokenId,
            secondParrentTokenId,
            childTokenId
        );
    }

    function _burnTokenForBreed(uint256 tokenId) private {
        delete _unspentSkills[tokenId];
        delete _nftStats[tokenId];
        delete _nftRarity[tokenId];
        delete _lockedNftForGame[tokenId];
        delete _nonce[tokenId];

        _burn(tokenId);
    }

    function updateNft(
        uint256 tokenId,
        NftSkills memory changeInTokenSkills
    )
        external
        override(ILazySoccerNFT)
        onlyNftOwner(tokenId)
        onlyUnlockedForGame(tokenId)
        onlyUnlockedForMarket(tokenId)
    {
        require(
            changeInTokenSkills.MarketerLVL +
                changeInTokenSkills.AccountantLVL <=
                _unspentSkills[tokenId],
            "Scarcity of unspent skills"
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

    function lockNftForGame(
        uint256 tokenId
    )
        public
        override(ILazySoccerNFT)
        onlyNftOwner(tokenId)
        onlyUnlockedForGame(tokenId)
        onlyUnlockedForMarket(tokenId)
    {
        _lockedNftForGame[tokenId] = true;

        emit NFTLockedForGame(tokenId);
    }

    function unlockNftForGame(
        uint256 tokenId
    ) public override(ILazySoccerNFT) onlyNftOwner(tokenId) {
        require(_lockedNftForGame[tokenId] == true, "Nft already unlocked");
        delete _lockedNftForGame[tokenId];

        emit NFTUnlockedForGame(tokenId);
    }

    function lockNftForMarket(
        uint256 tokenId
    )
        public
        override(ILazySoccerNFT)
        onlyNftOwner(tokenId)
        onlyUnlockedForGame(tokenId)
        onlyUnlockedForMarket(tokenId)
    {
        if (
            IERC721(address(this)).isApprovedForAll(
                msg.sender,
                ingameMarketAddress
            ) != true
        ) {
            super.setApprovalForAll(ingameMarketAddress, true);
        }

        _lockedNftForMarket[tokenId] = true;

        emit NFTLockedForMarket(tokenId);
    }

    function unlockNftForMarket(
        uint256 tokenId
    ) public override(ILazySoccerNFT) onlyNftOwner(tokenId) {
        require(_lockedNftForMarket[tokenId] == true, "Nft already unlocked");
        delete _lockedNftForMarket[tokenId];

        emit NFTUnlockedForMarket(tokenId);
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

    function checkIsNftLockedForGame(
        uint256 tokenId
    ) public view override(ILazySoccerNFT) returns (bool) {
        return _lockedNftForGame[tokenId];
    }

    function checkIsNftLockedForMarket(
        uint256 tokenId
    ) public view override(ILazySoccerNFT) returns (bool) {
        return _lockedNftForMarket[tokenId];
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
    ) public virtual override(ERC721, IERC721) onlyUnlockedForGame(tokenId) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) onlyUnlockedForGame(tokenId) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721, IERC721) onlyUnlockedForGame(tokenId) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function approve(
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) onlyUnlockedForGame(tokenId) {
        super.approve(to, tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        if (checkIsNftLockedForMarket(tokenId)) {
            delete _lockedNftForMarket[tokenId];
        }
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

    function changeIngameMarketAddress(address _newAddresse) public onlyOwner {
        ingameMarketAddress = _newAddresse;
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

    modifier onlyNftOwner(uint256 tokenId) {
        require(_ownerOf(tokenId) == msg.sender, "NFT have any owner");
        _;
    }

    modifier onlyUnlockedForGame(uint256 tokenId) {
        require(!_lockedNftForGame[tokenId], "NFT in game");
        _;
    }

    modifier onlyUnlockedForMarket(uint256 tokenId) {
        require(!_lockedNftForMarket[tokenId], "NFT in market");
        _;
    }
}

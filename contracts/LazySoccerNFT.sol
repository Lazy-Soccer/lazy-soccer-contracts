// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

import "./interfaces/ILazySoccerNft.sol";
import "./utils/SignatureResolver.sol";

contract LazySoccerNFT is
    ILazySoccerNFT,
    SignatureResolver,
    ERC721Enumerable,
    ERC721URIStorage,
    Ownable
{
    mapping(uint256 => uint256) public unspentSkills;
    mapping(uint256 => NftSkills) public nftStats;
    mapping(uint256 => StuffNFTRarity) public nftRarity;
    mapping(uint256 => bool) public lockedNftForGame;
    address public backendSigner;
    address[] public callTransactionAddresses;
    mapping(address => mapping(uint256 => bool)) private seenNonce;

    constructor(
        string memory _name,
        string memory _symbol,
        address _signer,
        address[] memory _transactionWhitelist
    ) ERC721(_name, _symbol) {
        backendSigner = _signer;
        callTransactionAddresses = _transactionWhitelist;
    }

    modifier onlyAvailableAddresses() {
        bool doesListContainElement = false;
        uint256 length = callTransactionAddresses.length;

        for (uint256 i = 0; i < length; i++) {
            if (msg.sender == callTransactionAddresses[i]) {
                doesListContainElement = true;

                break;
            }
        }
        require(doesListContainElement, "No permission");
        _;
    }

    modifier onlyNftOwner(uint256 tokenId) {
        require(_ownerOf(tokenId) == msg.sender, "Not NFT owner");
        _;
    }

    modifier onlyUnlockedForGame(uint256 tokenId) {
        require(!lockedNftForGame[tokenId], "NFT is locked in game");
        _;
    }

    function changeCallTransactionAddresses(
        address[] memory _newAddresses
    ) external onlyOwner {
        callTransactionAddresses = _newAddresses;
    }

    function changeBackendSigner(address _newAddress) external onlyOwner {
        backendSigner = _newAddress;
    }

    function updateNft(
        uint256 tokenId,
        NftSkills memory changeInTokenSkills
    ) external onlyNftOwner(tokenId) onlyUnlockedForGame(tokenId) {
        uint256 skillsSum = changeInTokenSkills.marketerLVL +
            changeInTokenSkills.accountantLVL +
            changeInTokenSkills.scoutLVL +
            changeInTokenSkills.coachLVL +
            changeInTokenSkills.fitnessTrainerLVL;

        require(
            skillsSum <= unspentSkills[tokenId],
            "Scarcity of unspent skills"
        );

        nftStats[tokenId].marketerLVL += changeInTokenSkills.marketerLVL;
        nftStats[tokenId].accountantLVL += changeInTokenSkills.accountantLVL;
        nftStats[tokenId].scoutLVL += changeInTokenSkills.scoutLVL;
        nftStats[tokenId].coachLVL += changeInTokenSkills.coachLVL;
        nftStats[tokenId].fitnessTrainerLVL += changeInTokenSkills
            .fitnessTrainerLVL;

        unspentSkills[tokenId] -= skillsSum;

        emit NFTUpdated(
            tokenId,
            changeInTokenSkills.marketerLVL,
            changeInTokenSkills.accountantLVL,
            changeInTokenSkills.scoutLVL,
            changeInTokenSkills.coachLVL,
            changeInTokenSkills.fitnessTrainerLVL
        );
    }

    function mintNewNft(
        address _to,
        uint256 _tokenId,
        string memory _ipfsHash,
        NftSkills memory _nftSkills,
        uint256 _unspentSkills,
        StuffNFTRarity _rarity
    ) external onlyAvailableAddresses {
        _mintNewNft(
            _to,
            _tokenId,
            _ipfsHash,
            _nftSkills,
            _unspentSkills,
            _rarity
        );
    }

    function breedNft(
        BreedArgs memory breedArgs
    )
        external
        onlyNftOwner(breedArgs.firstParentTokenId)
        onlyNftOwner(breedArgs.secondParentTokenId)
        onlyUnlockedForGame(breedArgs.firstParentTokenId)
        onlyUnlockedForGame(breedArgs.secondParentTokenId)
    {
        require(
            nftRarity[breedArgs.firstParentTokenId] ==
                nftRarity[breedArgs.secondParentTokenId],
            "Nft must have the same rarity"
        );
        require(
            nftRarity[breedArgs.firstParentTokenId] <= StuffNFTRarity.Epic,
            "You can`t breed Legendary nft"
        );

        bytes memory skillsEncoded = abi.encodePacked(
            _uint256ToString(breedArgs.nftSkills.marketerLVL),
            "-",
            _uint256ToString(breedArgs.nftSkills.accountantLVL),
            "-",
            _uint256ToString(breedArgs.nftSkills.scoutLVL),
            "-",
            _uint256ToString(breedArgs.nftSkills.coachLVL),
            "-",
            _uint256ToString(breedArgs.nftSkills.fitnessTrainerLVL)
        );

        require(
            _checkSignOperator(
                keccak256(
                    abi.encodePacked(
                        "Breed NFT"
                        "0x",
                        _toAsciiString(msg.sender),
                        "-",
                        _uint256ToString(breedArgs.firstParentTokenId),
                        "-",
                        _uint256ToString(breedArgs.secondParentTokenId),
                        "-",
                        _uint256ToString(breedArgs.childTokenId),
                        "-",
                        breedArgs.childNftIpfsHash,
                        "-",
                        skillsEncoded,
                        "-",
                        _uint256ToString(breedArgs.unspentSkills)
                    )
                ),
                breedArgs.signature,
                backendSigner
            ),
            "Transaction is not signed"
        );

        uint8 _nftRarity = uint8(nftRarity[breedArgs.firstParentTokenId]) + 1;

        _mintNewNft(
            msg.sender,
            breedArgs.childTokenId,
            breedArgs.childNftIpfsHash,
            breedArgs.nftSkills,
            breedArgs.unspentSkills,
            StuffNFTRarity(_nftRarity)
        );

        _burnTokenForBreed(breedArgs.firstParentTokenId);
        _burnTokenForBreed(breedArgs.secondParentTokenId);

        emit NFTBreeded(
            msg.sender,
            breedArgs.firstParentTokenId,
            breedArgs.secondParentTokenId,
            breedArgs.childTokenId
        );
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

    function _mintNewNft(
        address _to,
        uint256 _tokenId,
        string memory _ipfsHash,
        NftSkills memory _nftSkills,
        uint256 _unspentSkills,
        StuffNFTRarity _rarity
    ) private {
        _safeMint(_to, _tokenId);
        _setTokenURI(_tokenId, _ipfsHash);
        unspentSkills[_tokenId] = _unspentSkills;
        nftStats[_tokenId] = _nftSkills;
        nftRarity[_tokenId] = _rarity;

        emit NewNFTMinted(_to, _ipfsHash, _tokenId);
    }

    function _burnTokenForBreed(uint256 tokenId) private {
        delete unspentSkills[tokenId];
        delete nftStats[tokenId];
        delete nftRarity[tokenId];
        delete lockedNftForGame[tokenId];

        _burn(tokenId);
    }
}

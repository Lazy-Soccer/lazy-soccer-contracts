// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./interfaces/ILazyStaff.sol";
import "./utils/SignatureResolver.sol";
import "./utils/NftLock.sol";

contract LazyStaff is
    ILazyStaff,
    NftLock,
    SignatureResolver,
    ERC721URIStorage,
    Ownable
{
    mapping(uint256 => uint256) public unspentSkills;
    mapping(uint256 => NftSkills) public nftStats;
    mapping(uint256 => StuffNFTRarity) public nftRarity;
    address public backendSigner;
    address[] public whitelistAddresses;
    mapping(address => mapping(uint256 => bool)) private seenNonce;

    constructor(
        address _signer,
        address[] memory _whitelistAddresses
    ) ERC721("LAZY STAFF", "LS") {
        backendSigner = _signer;
        whitelistAddresses = _whitelistAddresses;
    }

    modifier onlyAvailableAddresses() {
        bool doesListContainElement = false;
        uint256 length = whitelistAddresses.length;

        for (uint256 i = 0; i < length; i++) {
            if (msg.sender == whitelistAddresses[i]) {
                doesListContainElement = true;

                break;
            }
        }
        require(doesListContainElement, "No permission");
        _;
    }

    function changeWhitelistAddresses(
        address[] memory _whitelistAddresses
    ) external onlyOwner {
        whitelistAddresses = _whitelistAddresses;
    }

    function changeBackendSigner(address _newAddress) external onlyOwner {
        backendSigner = _newAddress;
    }

    function updateNft(
        uint256 tokenId,
        NftSkills memory tokenSkills
    ) external onlyNftOwner(tokenId) unlockedForGame(tokenId) {
        uint256 skillsSum = tokenSkills.marketerLVL +
            tokenSkills.accountantLVL +
            tokenSkills.scoutLVL +
            tokenSkills.coachLVL +
            tokenSkills.fitnessTrainerLVL;

        require(skillsSum <= unspentSkills[tokenId], "Unspent skills");

        nftStats[tokenId].marketerLVL += tokenSkills.marketerLVL;
        nftStats[tokenId].accountantLVL += tokenSkills.accountantLVL;
        nftStats[tokenId].scoutLVL += tokenSkills.scoutLVL;
        nftStats[tokenId].coachLVL += tokenSkills.coachLVL;
        nftStats[tokenId].fitnessTrainerLVL += tokenSkills.fitnessTrainerLVL;

        unspentSkills[tokenId] -= skillsSum;

        emit NFTUpdated(
            tokenId,
            unspentSkills[tokenId],
            tokenSkills.marketerLVL,
            tokenSkills.accountantLVL,
            tokenSkills.scoutLVL,
            tokenSkills.coachLVL,
            tokenSkills.fitnessTrainerLVL
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
        _mintNft(_to, _tokenId, _ipfsHash, _nftSkills, _unspentSkills, _rarity);
    }

    function breedNft(
        BreedArgs memory breedArgs
    )
        external
        onlyNftOwner(breedArgs.firstParentTokenId)
        onlyNftOwner(breedArgs.secondParentTokenId)
        unlockedForGame(breedArgs.firstParentTokenId)
        unlockedForGame(breedArgs.secondParentTokenId)
    {
        require(
            nftRarity[breedArgs.firstParentTokenId] ==
                nftRarity[breedArgs.secondParentTokenId],
            "Different rarity"
        );
        require(
            nftRarity[breedArgs.firstParentTokenId] <= StuffNFTRarity.Epic,
            "Breed of Legendary nft"
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
                        "Breed NFT-"
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
            "Bad signature"
        );

        uint8 _nftRarity = uint8(nftRarity[breedArgs.firstParentTokenId]) + 1;

        _mintNft(
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

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) unlockedForGame(tokenId) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) unlockedForGame(tokenId) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721, IERC721) unlockedForGame(tokenId) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function approve(
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) unlockedForGame(tokenId) {
        super.approve(to, tokenId);
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

    function _mintNft(
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
        lockedNftForGame[_tokenId] = true;

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

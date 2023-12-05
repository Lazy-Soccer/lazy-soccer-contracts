// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./interfaces/ILazyStaff.sol";
import "./extensions/ERC721Lockable.sol";

contract LazyStaff is
    ILazyStaff,
    ERC721URIStorage,
    ERC721Lockable,
    EIP712
{
    using ECDSA for bytes32;

    mapping(uint256 => uint256) public unspentSkills;
    mapping(uint256 => NftSkills) public nftStats;
    mapping(uint256 => StuffNFTRarity) public nftRarity;
    address public backendSigner;

    string private constant NFT_SKILLS_TYPE =
        "NftSkills(uint256 marketerLVL,uint256 accountantLVL,uint256 scoutLVL,uint256 coachLVL,uint256 fitnessTrainerLVL)";
    bytes32 private constant NFT_SKILLS_TYPEHASH =
        keccak256(abi.encodePacked(NFT_SKILLS_TYPE));
    bytes32 private constant UPDATE_TYPEHASH =
        keccak256(
            abi.encodePacked(
                "Update("
                "uint256 tokenId,",
                "string ipfsHash,",
                "NftSkills skills,",
                "uint256 unspentSkills",
                ")",
                NFT_SKILLS_TYPE
            )
        );

    bytes32 private constant BREED_TYPEHASH =
        keccak256(
            abi.encodePacked(
                "Breed("
                "uint256 firstParentTokenId,",
                "uint256 secondParentTokenId,",
                "uint256 childTokenId,",
                "string childNftIpfsHash,",
                "NftSkills skills,",
                "uint256 unspentSkills",
                ")",
                NFT_SKILLS_TYPE
            )
        );

    modifier onlyNftOwner(uint256 tokenId) {
        if (_ownerOf(tokenId) != msg.sender) {
            revert NotNftOwner();
        }

        _;
    }

    constructor(
        address _backendSigner
    ) ERC721("Lazy Staff", "Lazy Staff") EIP712("Lazy Staff", "1") {
        backendSigner = _backendSigner;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function changeBackendSigner(
        address _backendSigner
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        backendSigner = _backendSigner;
    }

    function updateNft(
        uint256 _tokenId,
        NftSkills memory _nftSkills,
        string memory _ipfsHash,
        bytes memory _signature
    ) external onlyNftOwner(_tokenId) {
        uint256 skillsSum = _nftSkills.marketerLVL +
            _nftSkills.accountantLVL +
            _nftSkills.scoutLVL +
            _nftSkills.coachLVL +
            _nftSkills.fitnessTrainerLVL;
        uint256 _unspentSkills = unspentSkills[_tokenId];

        if (skillsSum > _unspentSkills) {
            revert NotEnoughSkills();
        }

        NftSkills memory _newSkills = nftStats[_tokenId];

        _newSkills.marketerLVL += _nftSkills.marketerLVL;
        _newSkills.accountantLVL += _nftSkills.accountantLVL;
        _newSkills.scoutLVL += _nftSkills.scoutLVL;
        _newSkills.coachLVL += _nftSkills.coachLVL;
        _newSkills.fitnessTrainerLVL += _nftSkills.fitnessTrainerLVL;

        _unspentSkills -= skillsSum;

        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    UPDATE_TYPEHASH,
                    _tokenId,
                    keccak256(bytes(_ipfsHash)),
                    hashSkills(_newSkills),
                    _unspentSkills
                )
            )
        );

        if (hash.recover(_signature) != backendSigner) {
            revert BadSignature();
        }

        _setTokenURI(_tokenId, _ipfsHash);
        nftStats[_tokenId] = _newSkills;
        unspentSkills[_tokenId] = _unspentSkills;

        emit NFTUpdated(
            _tokenId,
            unspentSkills[_tokenId],
            _newSkills,
            _ipfsHash
        );
    }

    function mintNewNft(
        address _to,
        uint256 _tokenId,
        string memory _ipfsHash,
        NftSkills memory _nftSkills,
        uint256 _unspentSkills,
        StuffNFTRarity _rarity
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _mintNft(_to, _tokenId, _ipfsHash, _nftSkills, _unspentSkills, _rarity);

        emit NewNFTMinted(
            _to,
            _ipfsHash,
            _tokenId,
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
        lockedForGame(breedArgs.firstParentTokenId)
        lockedForGame(breedArgs.secondParentTokenId)
    {
        if (
            nftRarity[breedArgs.firstParentTokenId] !=
            nftRarity[breedArgs.secondParentTokenId]
        ) {
            revert DifferentRarities();
        }

        if (nftRarity[breedArgs.firstParentTokenId] > StuffNFTRarity.Epic) {
            revert MaxRarity();
        }

        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    BREED_TYPEHASH,
                    breedArgs.firstParentTokenId,
                    breedArgs.secondParentTokenId,
                    breedArgs.childTokenId,
                    keccak256(bytes(breedArgs.childNftIpfsHash)),
                    hashSkills(breedArgs.nftSkills),
                    breedArgs.unspentSkills
                )
            )
        );

        if (hash.recover(breedArgs.signature) != backendSigner) {
            revert BadSignature();
        }

        uint8 _nftRarity = uint8(nftRarity[breedArgs.firstParentTokenId]) + 1;

        _burnTokenForBreed(breedArgs.firstParentTokenId);
        _burnTokenForBreed(breedArgs.secondParentTokenId);
        _mintNft(
            msg.sender,
            breedArgs.childTokenId,
            breedArgs.childNftIpfsHash,
            breedArgs.nftSkills,
            breedArgs.unspentSkills,
            StuffNFTRarity(_nftRarity)
        );

        emit NFTBreeded(
            msg.sender,
            breedArgs.firstParentTokenId,
            breedArgs.secondParentTokenId,
            breedArgs.childTokenId
        );
    }

    function tokenInfo(
        uint256 tokenId
    )
        external
        view
        returns (
            uint256 availableSkills,
            NftSkills memory skills,
            StuffNFTRarity rarity,
            bool locked,
            string memory uri
        )
    {
        availableSkills = unspentSkills[tokenId];
        skills = nftStats[tokenId];
        rarity = nftRarity[tokenId];
        locked = isLocked[tokenId];
        uri = tokenURI(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, ERC721Lockable) returns (bool) {
        return super.supportsInterface(interfaceId);
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
        isLocked[_tokenId] = true;
    }

    function _burnTokenForBreed(uint256 tokenId) private {
        delete unspentSkills[tokenId];
        delete nftStats[tokenId];
        delete nftRarity[tokenId];
        delete isLocked[tokenId];

        _burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override unlockedForGame(tokenId) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function hashSkills(
        NftSkills memory skills
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    NFT_SKILLS_TYPEHASH,
                    skills.marketerLVL,
                    skills.accountantLVL,
                    skills.scoutLVL,
                    skills.coachLVL,
                    skills.fitnessTrainerLVL
                )
            );
    }
}

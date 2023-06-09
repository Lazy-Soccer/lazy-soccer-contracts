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
    ERC721URIStorage,
    SignatureResolver,
    NftLock,
    Ownable
{
    mapping(uint256 => uint256) public unspentSkills;
    mapping(uint256 => NftSkills) public nftStats;
    mapping(uint256 => StuffNFTRarity) public nftRarity;
    address public backendSigner;
    address[] public whitelistAddresses;

    error BadSignature();
    error ForbiddenAction();
    error MaxRarity();
    error NotEnoughSkills();
    error DifferentRarities();

    constructor(
        address _signer,
        address[] memory _whitelistAddresses
    ) ERC721("LAZY STAFF", "LS") {
        backendSigner = _signer;
        whitelistAddresses = _whitelistAddresses;
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

        if (skillsSum > unspentSkills[_tokenId]) {
            revert NotEnoughSkills();
        }

        NftSkills memory _newSkills = nftStats[_tokenId];

        _newSkills.marketerLVL += _nftSkills.marketerLVL;
        _newSkills.accountantLVL += _nftSkills.accountantLVL;
        _newSkills.scoutLVL += _nftSkills.scoutLVL;
        _newSkills.coachLVL += _nftSkills.coachLVL;
        _newSkills.fitnessTrainerLVL += _nftSkills.fitnessTrainerLVL;

        bytes memory skillsEncoded = _encodeSkills(_newSkills);

        unspentSkills[_tokenId] -= skillsSum;

        if (
            !_checkSignOperator(
                keccak256(
                    abi.encodePacked(
                        "Update NFT-",
                        _uint256ToString(_tokenId),
                        "-",
                        _ipfsHash,
                        "-",
                        skillsEncoded,
                        "-",
                        _uint256ToString(unspentSkills[_tokenId])
                    )
                ),
                _signature,
                backendSigner
            )
        ) {
            revert BadSignature();
        }

        _setTokenURI(_tokenId, _ipfsHash);
        nftStats[_tokenId] = _newSkills;

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
    ) external {
        bool doesListContainElement = false;
        uint256 length = whitelistAddresses.length;

        for (uint256 i = 0; i < length; i++) {
            if (msg.sender == whitelistAddresses[i]) {
                doesListContainElement = true;

                break;
            }
        }

        if (!doesListContainElement) {
            revert ForbiddenAction();
        }

        _mintNft(_to, _tokenId, _ipfsHash, _nftSkills, _unspentSkills, _rarity);
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

        bytes memory skillsEncoded = _encodeSkills(breedArgs.nftSkills);

        if (
            !_checkSignOperator(
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
            )
        ) {
            revert BadSignature();
        }

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

    function tokenInfo(
        uint256 tokenId
    )
        external
        view
        returns (
            uint256 availableSkills,
            NftSkills memory skills,
            StuffNFTRarity rarity,
            bool isLocked,
            string memory uri
        )
    {
        availableSkills = unspentSkills[tokenId];
        skills = nftStats[tokenId];
        rarity = nftRarity[tokenId];
        isLocked = lockedNftForGame[tokenId];
        uri = tokenURI(tokenId);
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

        emit NewNFTMinted(
            _to,
            _ipfsHash,
            _tokenId,
            _nftSkills,
            _unspentSkills,
            _rarity
        );
    }

    function _burnTokenForBreed(uint256 tokenId) private {
        delete unspentSkills[tokenId];
        delete nftStats[tokenId];
        delete nftRarity[tokenId];
        delete lockedNftForGame[tokenId];

        _burn(tokenId);
    }

    function _encodeSkills(
        NftSkills memory skills
    ) private pure returns (bytes memory skillsEncoded) {
        skillsEncoded = abi.encodePacked(
            _uint256ToString(skills.marketerLVL),
            "-",
            _uint256ToString(skills.accountantLVL),
            "-",
            _uint256ToString(skills.scoutLVL),
            "-",
            _uint256ToString(skills.coachLVL),
            "-",
            _uint256ToString(skills.fitnessTrainerLVL)
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ILazyStaff {
    // State variables
    enum StuffNFTRarity {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary
    }

    struct NftSkills {
        uint256 marketerLVL;
        uint256 accountantLVL;
        uint256 scoutLVL;
        uint256 coachLVL;
        uint256 fitnessTrainerLVL;
    }

    struct BreedArgs {
        uint256 firstParentTokenId;
        uint256 secondParentTokenId;
        uint256 childTokenId;
        string childNftIpfsHash;
        NftSkills nftSkills;
        uint256 unspentSkills;
        bytes signature;
    }

    // Events
    event NewNFTMinted(
        address to,
        string ipfsHash,
        uint256 indexed tokenId,
        NftSkills skills,
        uint256 unspentSkills,
        StuffNFTRarity rarity
    );
    event NFTBreeded(
        address to,
        uint256 indexed firstParrentTokenId,
        uint256 indexed secondParrentTokenId,
        uint256 indexed childTokenId
    );
    event NFTUpdated(
        uint256 indexed tokenId,
        uint256 unspentSkills,
        NftSkills skills,
        string ipfsHash
    );

    // Errors
    error BadSignature();
    error MaxRarity();
    error NotEnoughSkills();
    error DifferentRarities();
    error NotNftOwner();
}

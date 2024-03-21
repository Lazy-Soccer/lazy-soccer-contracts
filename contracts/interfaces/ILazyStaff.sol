// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface ILazyStaff {
    // State variables
    enum StaffNFTRarity {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary
    }

    struct NftSkills {
        uint256 medicine;
        uint256 accounting;
        uint256 scouting;
        uint256 coaching;
        uint256 physiotherapy;
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
        StaffNFTRarity rarity
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

    // external functions
    function mintNewNft(
        address _to,
        uint256 _tokenId,
        string memory _ipfsHash,
        NftSkills memory _nftSkills,
        uint256 _unspentSkills,
        StaffNFTRarity _rarity,
        bool _isLocked
    ) external;
}

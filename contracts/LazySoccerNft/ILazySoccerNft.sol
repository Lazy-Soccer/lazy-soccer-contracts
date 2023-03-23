// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ILazySoccerNFT is IERC721 {
    event NewNFTMinted(address to, string ipfsHash, uint256 indexed tokenId);
    event NFTBreeded(
        address to,
        uint256 indexed firstParrentTokenId,
        uint256 indexed secondParrentTokenId,
        uint256 indexed childTokenId
    );
    event NFTUpdated(
        uint256 indexed tokenId,
        uint256 changeOnMarketerLVL,
        uint256 changeOnAccountantLVL
    );
    event NFTLockedForGame(uint256 indexed tokenId);
    event NFTUnlockedForGame(uint256 indexed tokenId);
    event NFTLockedForMarket(uint256 indexed tokenId);
    event NFTUnlockedForMarket(uint256 indexed tokenId);

    enum StuffNFTRarity {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary
    }
    struct NftSkills {
        uint256 MarketerLVL;
        uint256 AccountantLVL;
    }

    function mint(
        address to,
        uint256 tokenId,
        string memory ipfsHash,
        NftSkills memory nftSkills,
        uint256 unspentSkills,
        StuffNFTRarity rarity
    ) external;

    function breedNft(
        uint256 firstParrentTokenId,
        uint256 secondParrentTokenId,
        uint256 childTokenId,
        string memory childNftIpfsHash,
        NftSkills memory nftSkills,
        uint256 unspentSkills
    ) external;

    function updateNft(
        uint256 tokenId,
        NftSkills memory changeInTokenSkills
    ) external;

    function lockNftForGame(uint256 tokenId) external;

    function unlockNftForGame(uint256 tokenId) external;

    function lockNftForMarket(uint256 tokenId) external;

    function unlockNftForMarket(uint256 tokenId) external;

    function getNftRarity(
        uint256 tokenId
    ) external view returns (StuffNFTRarity);

    function getNftStats(
        uint256 tokenId
    ) external view returns (NftSkills memory);

    function getUnspentSkills(uint256 tokenId) external view returns (uint256);

    function checkIsNftLockedForGame(
        uint256 tokenId
    ) external view returns (bool);

    function checkIsNftLockedForMarket(
        uint256 tokenId
    ) external view returns (bool);
}

const { ethers } = require('hardhat');
const {
    BACKEND_SIGNER,
    WHITELIST_ADDRESSES,
} = require('../constants/marketplace.constants');

async function main() {
    const LazySoccerNFT = await ethers.getContractFactory('LazySoccerNFT');
    const args = [
        process.env.NFT_NAME || 'NFT',
        process.env.NFT_SYMBOL || 'NFT',
        BACKEND_SIGNER,
        WHITELIST_ADDRESSES,
    ];
    console.log('Deploying LazySoccerNFT...');

    const soccerNft = await LazySoccerNFT.deploy(...args);
    await soccerNft.deployed();

    console.log('LazySoccerNFT deployed to:', soccerNft.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

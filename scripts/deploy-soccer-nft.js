const { ethers } = require('hardhat');

async function main() {
    const LazySoccerNFT = await ethers.getContractFactory('LazySoccerNFT');
    const args = [
        process.env.NFT_NAME || 'NFT',
        process.env.NFT_SYMBOL || 'NFT',
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

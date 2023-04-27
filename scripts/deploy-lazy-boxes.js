const { ethers } = require('hardhat');

async function main() {
    const LazyBoxes = await ethers.getContractFactory('LazyBoxes');

    console.log('Deploying LazyBoxes...');

    const soccerNft = await LazyBoxes.deploy();
    await soccerNft.deployed();

    console.log('LazyBoxes deployed to:', soccerNft.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

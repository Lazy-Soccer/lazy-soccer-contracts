const { ethers } = require('hardhat');

async function main() {
    const LazyAlpha = await ethers.getContractFactory('LazyAlpha');

    console.log('Deploying LazyAlpha...');

    const alphaNft = await LazyAlpha.deploy();
    await alphaNft.deployed();

    console.log('LazyAlpha deployed to:', alphaNft.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

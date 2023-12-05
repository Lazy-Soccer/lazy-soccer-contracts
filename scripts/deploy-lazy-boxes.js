const { ethers } = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
    const LazyBoxes = await ethers.getContractFactory('LazyBox');

    console.log('Deploying LazyBox.sol...');

    const lazyBoxes = await LazyBoxes.deploy();
    await lazyBoxes.deployed();

    console.log('LazyBox.sol deployed to:', lazyBoxes.address);

    await new Promise((r) => setTimeout(r, 10000));
    await verify(lazyBoxes.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

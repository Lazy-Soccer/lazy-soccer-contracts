const { ethers, upgrades } = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
    const LazyBoxes = await ethers.getContractFactory('LazyBox');

    console.log('Deploying LazyBox.sol...');

    const lazyBoxes = await upgrades.deployProxy(LazyBoxes, [], {
        initializer: 'initialize',
    });

    await lazyBoxes.deployed();

    console.log('LazyBoxes deployed to:', lazyBoxes.address);

    console.log('Waiting for 30 seconds...');
    await new Promise((r) => setTimeout(r, 30000));

    const currentImplAddress = await upgrades.erc1967.getImplementationAddress(
        lazyBoxes.address,
    );

    console.log(`Implementation address - ${currentImplAddress}`);

    await verify(currentImplAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

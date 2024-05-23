const { ethers, upgrades } = require('hardhat');

async function main() {
    const LazyBoxes = await ethers.getContractFactory('LazyBox');

    console.log('Deploying LazyBox.sol...');

    const lazyBoxes = await upgrades.deployProxy(LazyBoxes, [], {
        initializer: 'initialize',
    });

    await lazyBoxes.deployed();

    console.log('LazyBoxes deployed to:', lazyBoxes.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

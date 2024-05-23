const { ethers, upgrades } = require('hardhat');

async function main() {
    const LazyAlpha = await ethers.getContractFactory('LazyAlpha');

    console.log('Deploying LazyAlpha...');

    const alphaNft = await upgrades.deployProxy(LazyAlpha, [], {
        initializer: 'initialize',
    });

    await alphaNft.deployed();

    console.log('LazyAlpha deployed to:', alphaNft.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

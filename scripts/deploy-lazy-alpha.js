const { ethers, upgrades } = require('hardhat');
const { ROYALTY_WALLET, ROYALTY_PERCENT } = require('../constants/marketplace.constants');

async function main() {
    const LazyAlpha = await ethers.getContractFactory('LazyAlpha');

    console.log('Deploying LazyAlpha...');

    const args = [ROYALTY_WALLET, ROYALTY_PERCENT]

    const alphaNft = await upgrades.deployProxy(LazyAlpha, args, {
        initializer: 'initialize',
    });

    await alphaNft.deployed();

    console.log('LazyAlpha deployed to:', alphaNft.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

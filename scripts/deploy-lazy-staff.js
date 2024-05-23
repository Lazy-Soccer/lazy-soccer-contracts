const { ethers, upgrades } = require('hardhat');
const { BACKEND_SIGNER } = require('../constants/marketplace.constants');

async function main() {
    const LazyStaff = await ethers.getContractFactory('LazyStaff');
    const args = [BACKEND_SIGNER];
    console.log('Deploying LazyStaff...');

    const lazyStaff = await upgrades.deployProxy(LazyStaff, args, {
        initializer: 'initialize',
    });

    await lazyStaff.deployed();

    console.log('LazyStaff deployed to:', lazyStaff?.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

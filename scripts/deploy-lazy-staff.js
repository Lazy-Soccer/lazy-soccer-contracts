const { ethers, upgrades } = require('hardhat');
const { verify } = require('../utils/verify');
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
    console.log('Waiting for 30 seconds...');
    await new Promise((r) => setTimeout(r, 30000));

    const currentImplAddress = await upgrades.erc1967.getImplementationAddress(
        lazyStaff.address,
    );

    console.log(`Implementation address - ${currentImplAddress}`);

    await verify(currentImplAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

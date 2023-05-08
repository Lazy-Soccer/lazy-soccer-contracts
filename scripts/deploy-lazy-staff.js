const { ethers } = require('hardhat');
const {
    BACKEND_SIGNER,
    WHITELIST_ADDRESSES,
} = require('../constants/marketplace.constants');

async function main() {
    const LazyStaff = await ethers.getContractFactory('LazyStaff');
    const args = [
        'Lazy Staff',
        'LS',
        BACKEND_SIGNER,
        WHITELIST_ADDRESSES,
    ];
    console.log('Deploying LazyStaff...');

    const lazyStaff = await LazyStaff.deploy(...args);
    await lazyStaff.deployed();

    console.log('LazyStaff deployed to:', lazyStaff.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

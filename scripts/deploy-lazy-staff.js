const { ethers } = require('hardhat');
const { BACKEND_SIGNER } = require('../constants/marketplace.constants');
const { verify } = require('../utils/verify');

async function main() {
    const LazyStaff = await ethers.getContractFactory('LazyStaff');
    const args = [BACKEND_SIGNER];
    console.log('Deploying LazyStaff...');

    const lazyStaff = await LazyStaff.deploy(...args);
    await lazyStaff.deployed();

    console.log('LazyStaff deployed to:', lazyStaff.address);

    await new Promise((r) => setTimeout(r, 10000));
    await verify(lazyStaff.address, args);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

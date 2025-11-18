const { ethers, upgrades } = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
    const LazyStaff = await ethers.getContractFactory('LazyStaff');

    console.log('Upgrade LazyStaff.sol...');

    // const oldStaffContract = "0xc106f25c60ad880cb916cef2cc19785e2e36f7f5"; //testnet arb
    const oldStaffContract = "0x0f0fC063d0DD0F0d62515f805dfE3dD84377fd06"; //testnet base

    const lazyStaff = await upgrades.upgradeProxy(oldStaffContract, LazyStaff);

    console.log('LazyStaff deployed to:', lazyStaff);

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

const { ethers, upgrades } = require('hardhat');

async function main() {
    const LazyStaff = await ethers.getContractFactory('LazyStaff');

    console.log('Upgrade LazyStaff.sol...');

    // const oldBoxContract = "0x3f039FC20Df35151daC595A29B97FF705139F7C3"; //testnet
    const oldStaffContract = "0x8d3A323540A5Cf3AD2c86a75C14AaA83BEbd1066";

    const lazyStaff = await upgrades.upgradeProxy(oldStaffContract, LazyStaff);

    // await lazyBoxes.deployed();

    console.log('LazyStaff deployed to:', lazyStaff);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

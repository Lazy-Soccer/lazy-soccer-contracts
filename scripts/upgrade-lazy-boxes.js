const { ethers, upgrades } = require('hardhat');

async function main() {
    const LazyBoxes = await ethers.getContractFactory('LazyBox');

    console.log('Upgrade LazyBox.sol...');

    // const oldBoxContract = "0x3f039FC20Df35151daC595A29B97FF705139F7C3"; //testnet
    const oldBoxContract = "0x5b6230E673C53968B9DF91FabC19791c5031dC84";

    const lazyBoxes = await upgrades.upgradeProxy(oldBoxContract, LazyBoxes);

    // await lazyBoxes.deployed();

    console.log('LazyBoxes deployed to:', lazyBoxes);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

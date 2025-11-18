const { ethers, upgrades } = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
    const LazyBoxes = await ethers.getContractFactory('LazyBox');

    console.log('Upgrade LazyBox.sol...');

    //const oldBoxContract = "0x3f039FC20Df35151daC595A29B97FF705139F7C3"; //testnet arb
    // const oldBoxContract = "0x5b6230E673C53968B9DF91FabC19791c5031dC84";
    const oldBoxContract = "0x351D55Cb7E08E412C20831536Bda47BaF65887D9"; // testnet base
    const lazyBoxes = await upgrades.upgradeProxy(oldBoxContract, LazyBoxes);

    console.log('LazyBoxes deployed to:', lazyBoxes);

    console.log('Waiting for 30 seconds...');
    await new Promise((r) => setTimeout(r, 30000));

    const currentImplAddress = await upgrades.erc1967.getImplementationAddress(
        lazyBoxes.address,
    );

    console.log(`Implementation address - ${currentImplAddress}`);

    await verify(currentImplAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

const { ethers, upgrades } = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
    const LazyAlpha = await ethers.getContractFactory('LazyAlpha');

    console.log('Upgrade LazyAlpha.sol...');

    // const oldAlphaContract = "0xCB8C9Ff05d9CdF10a565178fdddec64635896c16"; //testnet arb
    const oldAlphaContract = "0xc20f7E56c5D085889469F2229a8c48b6D19a999c";
    // const oldAlphaContract = "0xC9efbDd62F036F149AbF840Bbc90ab7E8423CEd9"; // testnet base
    const lazyAlpha = await upgrades.upgradeProxy(oldAlphaContract, LazyAlpha);

    console.log('LazyAlpha deployed to:', lazyAlpha);

    console.log('Waiting for 30 seconds...');
    await new Promise((r) => setTimeout(r, 30000));

    const currentImplAddress = await upgrades.erc1967.getImplementationAddress(
        lazyAlpha.address,
    );

    console.log(`Implementation address - ${currentImplAddress}`);

    await verify(currentImplAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

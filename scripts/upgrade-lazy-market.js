const { ethers, upgrades } = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
    const LazyMarketplace = await ethers.getContractFactory('LazySoccerMarketplace');

    console.log('Upgrade LazyMarketplace.sol...');

    // const oldMarketplaceContract = "0x3bcaa4936308918edf9ba89d506be98c569bfd55"; //testnet arb
    const oldMarketplaceContract = "0x6eDeC2E6c8b4D9F5c4316f9040d44c81D7c1eCbF"; //testnet base

    // await upgrades.forceImport(
    //     oldMarketplaceContract,
    //     LazyMarketplace,
    //     { kind: "uups" }
    //   );

    //   return;

    // console.log(await upgrades.deployImplementation(LazyMarketplace));

    // return;

    const lazyMarketplace = await upgrades.upgradeProxy(oldMarketplaceContract, LazyMarketplace);

    console.log('LazyMarketplace deployed to:', lazyMarketplace);

    console.log('Waiting for 30 seconds...');
    await new Promise((r) => setTimeout(r, 30000));

    const currentImplAddress = await upgrades.erc1967.getImplementationAddress(
        lazyMarketplace.address,
    );

    console.log(`Implementation address - ${currentImplAddress}`);

    await verify(currentImplAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

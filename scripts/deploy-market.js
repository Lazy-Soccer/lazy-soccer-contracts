const { ethers, upgrades } = require('hardhat');
const {
    CURRENCY_ADDRESS,
    FEE_WALLET,
    BACKEND_SIGNER,
    WHITELIST_ADDRESSES,
} = require('../constants/marketplace.constants');

async function main() {
    const LazySoccerMarketplace = await ethers.getContractFactory(
        'LazySoccerMarketplace',
    );
    const args = [
        process.env.SOCCER_NFT_ADDRESS,
        CURRENCY_ADDRESS,
        FEE_WALLET,
        BACKEND_SIGNER,
        WHITELIST_ADDRESSES,
    ];
    console.log('Deploying Marketplace...');

    const marketplace = await upgrades.deployProxy(
        LazySoccerMarketplace,
        args,
        {
            initializer: 'initialize',
        },
    );
    console.log('Marketplace deployed to:', marketplace.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

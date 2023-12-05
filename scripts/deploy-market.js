const { ethers, upgrades } = require('hardhat');
const {
    CURRENCY_ADDRESS,
    FEE_WALLET,
    BACKEND_SIGNER,
} = require('../constants/marketplace.constants');
const { verify } = require('../utils/verify');

async function main() {
    const LazySoccerMarketplace = await ethers.getContractFactory(
        'LazySoccerMarketplace',
    );
    const args = [
        CURRENCY_ADDRESS,
        [FEE_WALLET],
        BACKEND_SIGNER,
        [
            process.env.LAZY_STAFF_ADDRESS,
            process.env.LAZY_BOXES_ADDRESS,
            process.env.LAZY_ALPHA_ADDRESS,
        ],
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

    await new Promise((r) => setTimeout(r, 30000));
    await verify(marketplace.address, args);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

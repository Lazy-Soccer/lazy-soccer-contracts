const { ethers, upgrades } = require('hardhat');
const {
    CURRENCY_ADDRESS,
    FEE_WALLET,
    BACKEND_SIGNER,
} = require('../constants/marketplace.constants');
const { verify } = require('../utils/verify');

const NFTS = [
    process.env.LAZY_STAFF_ADDRESS,
    process.env.LAZY_ALPHA_ADDRESS,
    process.env.LAZY_BOXES_ADDRESS,
]

const LOCKABLE = [
    true, true, false
]

async function main() {
    const LazySoccerMarketplace = await ethers.getContractFactory(
        'LazySoccerMarketplace',
    );
    const args = [
        CURRENCY_ADDRESS,
        [FEE_WALLET],
        BACKEND_SIGNER,
        NFTS,
        LOCKABLE,
    ];
    console.log('Deploying Marketplace...');

    const marketplace = await upgrades.deployProxy(
        LazySoccerMarketplace,
        args,
        {
            initializer: 'initialize',
        },
    );

    console.log('Marketplace deployed to:', marketplace.address, marketplace.implementation.address);

    for(const nft of NFTS) {
        const index = NFTS.indexOf(nft);

        if(!LOCKABLE[index]) continue;

        const contract = await ethers.getContractAt('ERC721Lockable', nft);
        const role = await contract.LOCKER();

        const tx = await contract.grantRole(role, marketplace.address);
        await tx.wait(5);
    }

    await new Promise((r) => setTimeout(r, 30000));

    const currentImplAddress = await upgrades.erc1967.getImplementationAddress(marketplace.address);

    await verify(currentImplAddress, args);
    await verify(marketplace.address, args);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

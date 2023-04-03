const { network } = require('hardhat');
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const arguments = ['NFT', 'NFT'];
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;

    const lazySoccerNFT = await deploy('LazySoccerNFT', {
        from: deployer,
        log: true,
        args: arguments,
        waitConfirmations: waitBlockConfirmations,
    });

    log('Deployed LazySoccerNFT');

    if (
        !developmentChains.includes(network.name) &&
        process.env.POLYGONSCAN_API_KEY
    ) {
        log('Verifying LazySoccerNFT...');
        await verify(lazySoccerNFT.address, arguments);
    }
};

module.exports.tags = ['all', 'lazySoccerNFT'];

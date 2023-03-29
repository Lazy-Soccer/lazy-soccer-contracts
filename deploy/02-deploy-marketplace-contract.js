const { network, ethers } = require('hardhat')
const { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } = require('../helper-hardhat-config')
const {
    FEE_WALLET,
    BACKEND_SIGNER,
    WHITELIST_ADDRESSES,
    CURRENCY_ADDRESS
} = require("../constants/marketplace.constants");
const { verify } = require('../utils/verify')

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const nftContract = await ethers.getContract('LazySoccerNFT')
    const arguments = [nftContract.address, CURRENCY_ADDRESS, FEE_WALLET, BACKEND_SIGNER, WHITELIST_ADDRESSES]
    const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS

    const marketplace = await deploy('LazySoccerMarketplace', {
        from: deployer, log: true, args: arguments, waitConfirmations: waitBlockConfirmations
    })

    log('Deployed Marketplace')

    if (!developmentChains.includes(network.name) && process.env.POLYGONSCAN_API_KEY) {
        log('Verifying Marketplace...')
        await verify(marketplace.address, arguments)
    }
}

module.exports.tags = ['all', 'marketplace']

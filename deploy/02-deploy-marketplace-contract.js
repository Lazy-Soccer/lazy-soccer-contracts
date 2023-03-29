const { network, ethers } = require('hardhat')
const { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } = require('../helper-hardhat-config')
const { verify } = require('../utils/verify')

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const nftContract = await ethers.getContract('LazySoccerNFT')

    const arguments = [nftContract.address, nftContract.address]
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    const marketplace = await deploy('LazySoccerMarketplace', {
        from: deployer,
        log: true,
        args: arguments,
        waitConfirmations: waitBlockConfirmations
    })

    log('Deployed Marketplace')

    if (!developmentChains.includes(network.name) && process.env.POLYGONSCAN_API_KEY) {
        log('Verifying Marketplace...')
        await verify(marketplace.address, arguments)
    }
}

module.exports.tags = ['all', 'marketplace']

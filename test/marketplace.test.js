const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config");
const {
    CURRENCY_ADDRESS,
    FEE_WALLET,
    WHITELIST_ADDRESSES,
    BACKEND_SIGNER
} = require("../constants/marketplace.constants");
const { ZERO_ADDRESS } = require("../constants/common.constants");

!developmentChains.includes(network.name)
    ?
    describe.skip()
    :
    describe('Marketplace unit tests', () => {
        let deployer, marketplace, lazySoccer

        async function mintNFT() {
            await lazySoccer.mint(deployer.address, 0, 'hash', { MarketerLVL: 2, AccountantLVL: 0 }, 10, 0)
        }

        beforeEach(async () => {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]

            await deployments.fixture('all')

            lazySoccer = (await ethers.getContract('LazySoccerNFT')).connect(deployer)
            marketplace = (await ethers.getContract('LazySoccerMarketplace')).connect(deployer)
        })

        describe('constructor', () => {
            it('sets starting values correctly', async () => {
                const nftAddress = await marketplace.nftContract()
                const currencyAddress = await marketplace.currencyContract()
                const feeWallet = await marketplace.feeWallet()
                const callTransactionWhitelist = await marketplace.callTransactionWhitelist(0)
                const backendSigner = await marketplace.backendSigner()

                assert.equal(nftAddress, lazySoccer.address)
                assert.equal(currencyAddress, CURRENCY_ADDRESS)
                assert.equal(feeWallet, FEE_WALLET)
                assert.equal(callTransactionWhitelist, WHITELIST_ADDRESSES[0])
                assert.equal(backendSigner, BACKEND_SIGNER)
            })
        })

        describe('changing of contract params by owner', () => {
            it('reverts on execution by third person', async () => {
                const [, attacker] = await ethers.getSigners()

                marketplace = marketplace.connect(attacker)

                await expect(marketplace.changeFeeWallet(attacker.address)).to.be.reverted
                await expect(marketplace.changeBackendSigner(attacker.address)).to.be.reverted
                await expect(marketplace.changeCurrencyAddress(attacker.address)).to.be.reverted
                await expect(marketplace.changenftContract(attacker.address)).to.be.reverted
                await expect(marketplace.changeCallTransactionAddresses([attacker.address])).to.be.reverted
            })

            it('can change fee wallet', async () => {
                await marketplace.changeFeeWallet(ZERO_ADDRESS)

                const feeWallet = await marketplace.feeWallet()

                assert.equal(feeWallet, ZERO_ADDRESS)
            })

            it('can change backend signer', async () => {
                await marketplace.changeBackendSigner(ZERO_ADDRESS)

                const backendSigner = await marketplace.backendSigner()

                assert.equal(backendSigner, ZERO_ADDRESS)
            })

            it('can change currency address', async () => {
                await marketplace.changeCurrencyAddress(ZERO_ADDRESS)

                const currencyAddress = await marketplace.currencyContract()

                assert.equal(currencyAddress, ZERO_ADDRESS)
            })

            it('can change nft contract address', async () => {
                await marketplace.changenftContract(ZERO_ADDRESS)

                const nftAddress = await marketplace.nftContract()

                assert.equal(nftAddress, ZERO_ADDRESS)
            })

            it('can change nft whitelist array', async () => {
                await marketplace.changeCallTransactionAddresses([ZERO_ADDRESS])

                const callTransactionWhitelist = await marketplace.callTransactionWhitelist(0)

                assert.equal(callTransactionWhitelist, ZERO_ADDRESS)
            })
        })

        describe('listing of nft', () => {
            beforeEach(async () => {
                await lazySoccer.changeCallTransactionAddresses([deployer.address])
                await mintNFT()
            })

            it('can list nft', async () => {
                await lazySoccer.approve(marketplace.address, 0)

                await marketplace.listItem(0)
                const listingOwner = await marketplace.listings(0)

                assert.equal(listingOwner, deployer.address)
            })

            it('rejects when NFT is not approved', async () => {
                await expect(marketplace.listItem(0)).to.be.reverted
            })

            it('rejects when NFT is already listed', async () => {
                await lazySoccer.approve(marketplace.address, 0)

                await marketplace.listItem(0)
                await expect(marketplace.listItem(0)).to.be.revertedWithCustomError(marketplace, 'AlreadyListed')
                    .withArgs(0)
            })

            it('rejects when NFT is already listed', async () => {
                await lazySoccer.approve(marketplace.address, 0)

                await marketplace.listItem(0)
                await expect(marketplace.listItem(0)).to.be.revertedWithCustomError(marketplace, 'AlreadyListed')
                    .withArgs(0)
            })

            it('emits events on successful listing', async () => {
                await lazySoccer.approve(marketplace.address, 0)

                await expect(marketplace.listItem(0)).to.emit(marketplace, 'ItemListed')
                    .withArgs(0, deployer.address)
            })
        })
    })

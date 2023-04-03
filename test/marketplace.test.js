const { assert, expect } = require('chai')
const { network, deployments, ethers } = require('hardhat')
const { developmentChains } = require('../helper-hardhat-config')
const {
    CURRENCY_ADDRESS,
    FEE_WALLET,
    WHITELIST_ADDRESSES,
    BACKEND_SIGNER
} = require('../constants/marketplace.constants')
const { ZERO_ADDRESS } = require('../constants/common.constants')

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe('Marketplace unit tests', () => {
          let deployer, marketplace, lazySoccer

          async function mintNFT() {
              await lazySoccer.mint(
                  deployer.address,
                  0,
                  'hash',
                  { MarketerLVL: 2, AccountantLVL: 0 },
                  10,
                  0
              )
          }

          async function giveWhitelistAccess(address) {
              await lazySoccer.changeCallTransactionAddresses([address])
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
                  await expect(marketplace.changeCallTransactionAddresses([attacker.address])).to.be
                      .reverted
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
                  await giveWhitelistAccess(deployer.address)
                  await mintNFT()
              })

              it('can list nft', async () => {
                  await lazySoccer.approve(marketplace.address, 0)

                  await marketplace.listItem(0)
                  const listingOwner = await marketplace.listings(0)

                  const newNftOwner = await lazySoccer.ownerOf(0)

                  assert.equal(listingOwner, deployer.address)
                  assert.equal(newNftOwner, marketplace.address)
              })

              it('rejects when NFT is not approved', async () => {
                  await expect(marketplace.listItem(0)).to.be.reverted
              })

              it('rejects when NFT is already listed', async () => {
                  await lazySoccer.approve(marketplace.address, 0)

                  await marketplace.listItem(0)
                  await expect(marketplace.listItem(0))
                      .to.be.revertedWithCustomError(marketplace, 'AlreadyListed')
                      .withArgs(0)
              })

              it('rejects when NFT is already listed', async () => {
                  await lazySoccer.approve(marketplace.address, 0)

                  await marketplace.listItem(0)
                  await expect(marketplace.listItem(0))
                      .to.be.revertedWithCustomError(marketplace, 'AlreadyListed')
                      .withArgs(0)
              })

              it('emits events on successful listing', async () => {
                  await lazySoccer.approve(marketplace.address, 0)

                  await expect(marketplace.listItem(0))
                      .to.emit(marketplace, 'ItemListed')
                      .withArgs(0, deployer.address)
              })
          })

          describe('cancel of listing', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address)
                  await mintNFT()
              })

              it('cancels listing', async () => {
                  await lazySoccer.approve(marketplace.address, 0)

                  await marketplace.listItem(0)
                  await marketplace.cancelListing(0)

                  const newListingOwner = await marketplace.listings(0)
                  const newNftOwner = await lazySoccer.ownerOf(0)

                  assert.equal(newListingOwner, ZERO_ADDRESS)
                  assert.equal(newNftOwner, deployer.address)
              })

              it('rejects when no listing found', async () => {
                  await lazySoccer.approve(marketplace.address, 0)

                  await expect(marketplace.cancelListing(0)).to.be.reverted
              })

              it('emits cancel event', async () => {
                  await lazySoccer.approve(marketplace.address, 0)

                  await marketplace.listItem(0)
                  await expect(marketplace.cancelListing(0))
                      .to.be.emit(marketplace, 'ListingCanceled')
                      .withArgs(0, deployer.address)
              })
          })

          describe('ownership', () => {
              it('can change ownership by owner', async () => {
                  const accounts = await ethers.getSigners()
                  const newOwner = accounts[1]

                  await marketplace.transferOwnership(newOwner.address)

                  const contractOwner = await marketplace.owner()

                  assert.equal(newOwner.address, contractOwner)
              })

              it('rejects transfer of ownership by third person', async () => {
                  const accounts = await ethers.getSigners()
                  const newOwner = accounts[1]

                  await expect(marketplace.connect(newOwner).transferOwnership(newOwner.address)).to
                      .be.reverted
              })
          })

          describe('pausing the contract', () => {
              it('can pause the contract by owner', async () => {
                  await marketplace.pause()

                  const isPaused = await marketplace.paused()

                  assert.equal(isPaused, true)
              })

              it('can pause the contract by owner', async () => {
                  await marketplace.pause()
                  await marketplace.unpause()

                  const isPaused = await marketplace.paused()

                  assert.equal(isPaused, false)
              })

              it('rejects on pause actions by third person', async () => {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]

                  await expect(marketplace.connect(attacker).pause()).to.be.reverted
                  await expect(marketplace.connect(attacker).unpause()).to.be.reverted
              })

              it('rejects listing action when paused', async () => {
                  await marketplace.pause()
                  await giveWhitelistAccess(deployer.address)
                  await mintNFT()

                  await lazySoccer.approve(marketplace.address, 0)

                  await expect(marketplace.listItem(0)).to.be.reverted
              })

              it('rejects cancel action when paused', async () => {
                  await giveWhitelistAccess(deployer.address)
                  await mintNFT()

                  await lazySoccer.approve(marketplace.address, 0)

                  await marketplace.listItem(0).to.be.reverted

                  await marketplace.pause()

                  await expect(await marketplace.cancelListing(0)).to.be.reverted
              })
          })
      })

const { assert, expect } = require('chai');
const { network, ethers, upgrades } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config');
const {
    CURRENCY_ADDRESS,
    FEE_WALLET,
    WHITELIST_ADDRESSES,
    BACKEND_SIGNER,
} = require('../constants/marketplace.constants');
const { ZERO_ADDRESS } = require('../constants/common.constants');
const { getRandomInt } = require('../utils/math');

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe('Marketplace unit tests', () => {
          let deployer, marketplace, lazySoccer;

          async function mintNFT(address) {
              await lazySoccer.mintNewNft(
                  address,
                  0,
                  'hash',
                  {
                      marketerLVL: 0,
                      accountantLVL: 1,
                      scoutLVL: 2,
                      coachLVL: 3,
                      fitnessTrainerLVL: 4,
                  },
                  10,
                  0,
              );
          }

          async function giveWhitelistAccess(address) {
              await lazySoccer.changeCallTransactionAddresses([address]);
          }

          async function getDeadlineTimestamp() {
              const blockNumBefore = await ethers.provider.getBlockNumber();
              const blockBefore = await ethers.provider.getBlock(
                  blockNumBefore,
              );
              const timestampBefore = blockBefore.timestamp;

              return timestampBefore + 60;
          }

          beforeEach(async () => {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];

              const LazySoccerNFT = await ethers.getContractFactory(
                  'LazySoccerNFT',
              );
              const soccerArgs = [
                  process.env.NFT_NAME || 'NFT',
                  process.env.NFT_SYMBOL || 'NFT',
                  BACKEND_SIGNER,
                  WHITELIST_ADDRESSES,
              ];
              lazySoccer = (await LazySoccerNFT.deploy(...soccerArgs)).connect(
                  deployer,
              );

              const LazySoccerMarketplace = await ethers.getContractFactory(
                  'LazySoccerMarketplace',
              );
              const marketplaceArgs = [
                  lazySoccer.address,
                  CURRENCY_ADDRESS,
                  FEE_WALLET,
                  BACKEND_SIGNER,
                  WHITELIST_ADDRESSES,
              ];

              marketplace = (
                  await upgrades.deployProxy(
                      LazySoccerMarketplace,
                      marketplaceArgs,
                      {
                          initializer: 'initialize',
                      },
                  )
              ).connect(deployer);
          });

          describe('constructor', () => {
              it('sets starting values correctly', async () => {
                  const nftAddress = await marketplace.nftContract();
                  const currencyAddress = await marketplace.currencyContract();
                  const feeWallet = await marketplace.feeWallet();
                  const callTransactionWhitelist =
                      await marketplace.callTransactionWhitelist(0);
                  const backendSigner = await marketplace.backendSigner();

                  assert.equal(nftAddress, lazySoccer.address);
                  assert.equal(currencyAddress, CURRENCY_ADDRESS);
                  assert.equal(feeWallet, FEE_WALLET);
                  assert.equal(
                      callTransactionWhitelist,
                      WHITELIST_ADDRESSES[0],
                  );
                  assert.equal(backendSigner, BACKEND_SIGNER);
              });
          });

          describe('changing of contract params by owner', () => {
              it('reverts on execution by third person', async () => {
                  const [, attacker] = await ethers.getSigners();

                  marketplace = marketplace.connect(attacker);

                  await expect(marketplace.changeFeeWallet(attacker.address)).to
                      .be.reverted;
                  await expect(
                      marketplace.changeBackendSigner(attacker.address),
                  ).to.be.reverted;
                  await expect(
                      marketplace.changeCurrencyAddress(attacker.address),
                  ).to.be.reverted;
                  await expect(marketplace.changeNftContract(attacker.address))
                      .to.be.reverted;
                  await expect(
                      marketplace.changeCallTransactionAddresses([
                          attacker.address,
                      ]),
                  ).to.be.reverted;
              });

              it('can change fee wallet', async () => {
                  await marketplace.changeFeeWallet(ZERO_ADDRESS);

                  const feeWallet = await marketplace.feeWallet();

                  assert.equal(feeWallet, ZERO_ADDRESS);
              });

              it('can change backend signer', async () => {
                  await marketplace.changeBackendSigner(ZERO_ADDRESS);

                  const backendSigner = await marketplace.backendSigner();

                  assert.equal(backendSigner, ZERO_ADDRESS);
              });

              it('can change currency address', async () => {
                  await marketplace.changeCurrencyAddress(ZERO_ADDRESS);

                  const currencyAddress = await marketplace.currencyContract();

                  assert.equal(currencyAddress, ZERO_ADDRESS);
              });

              it('can change nft contract address', async () => {
                  await marketplace.changeNftContract(ZERO_ADDRESS);

                  const nftAddress = await marketplace.nftContract();

                  assert.equal(nftAddress, ZERO_ADDRESS);
              });

              it('can change nft whitelist array', async () => {
                  await marketplace.changeCallTransactionAddresses([
                      ZERO_ADDRESS,
                  ]);

                  const callTransactionWhitelist =
                      await marketplace.callTransactionWhitelist(0);

                  assert.equal(callTransactionWhitelist, ZERO_ADDRESS);
              });
          });

          describe('listing of nft', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('can list nft', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0);
                  const listingOwner = await marketplace.listings(0);

                  const newNftOwner = await lazySoccer.ownerOf(0);

                  assert.equal(listingOwner, deployer.address);
                  assert.equal(newNftOwner, marketplace.address);
              });

              it('rejects when NFT is not approved', async () => {
                  await expect(marketplace.listItem(0)).to.be.reverted;
              });

              it('rejects when NFT is already listed', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0);
                  await expect(marketplace.listItem(0))
                      .to.be.revertedWithCustomError(
                          marketplace,
                          'AlreadyListed',
                      )
                      .withArgs(0);
              });

              it('rejects when NFT is already listed', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0);
                  await expect(marketplace.listItem(0))
                      .to.be.revertedWithCustomError(
                          marketplace,
                          'AlreadyListed',
                      )
                      .withArgs(0);
              });

              it('emits events on successful listing', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await expect(marketplace.listItem(0))
                      .to.emit(marketplace, 'ItemListed')
                      .withArgs(0, deployer.address);
              });
          });

          describe('cancel of listing', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('cancels listing', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0);
                  await marketplace.cancelListing(0);

                  const newListingOwner = await marketplace.listings(0);
                  const newNftOwner = await lazySoccer.ownerOf(0);

                  assert.equal(newListingOwner, ZERO_ADDRESS);
                  assert.equal(newNftOwner, deployer.address);
              });

              it('rejects when no listing found', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await expect(marketplace.cancelListing(0)).to.be.reverted;
              });

              it('emits cancel event', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0);
                  await expect(marketplace.cancelListing(0))
                      .to.emit(marketplace, 'ListingCanceled')
                      .withArgs(0, deployer.address);
              });
          });

          describe('ownership', () => {
              it('can change ownership by owner', async () => {
                  const accounts = await ethers.getSigners();
                  const newOwner = accounts[1];

                  await marketplace.transferOwnership(newOwner.address);

                  const contractOwner = await marketplace.owner();

                  assert.equal(newOwner.address, contractOwner);
              });

              it('rejects transfer of ownership by third person', async () => {
                  const accounts = await ethers.getSigners();
                  const newOwner = accounts[1];

                  await expect(
                      marketplace
                          .connect(newOwner)
                          .transferOwnership(newOwner.address),
                  ).to.be.reverted;
              });
          });

          describe('pausing the contract', () => {
              it('can pause the contract by owner', async () => {
                  await marketplace.pause();

                  const isPaused = await marketplace.paused();

                  assert.equal(isPaused, true);
              });

              it('can pause the contract by owner', async () => {
                  await marketplace.pause();
                  await marketplace.unpause();

                  const isPaused = await marketplace.paused();

                  assert.equal(isPaused, false);
              });

              it('rejects on pause actions by third person', async () => {
                  const accounts = await ethers.getSigners();
                  const attacker = accounts[1];

                  await expect(marketplace.connect(attacker).pause()).to.be
                      .reverted;
                  await expect(marketplace.connect(attacker).unpause()).to.be
                      .reverted;
              });

              it('rejects listing action when paused', async () => {
                  await marketplace.pause();
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);

                  await lazySoccer.approve(marketplace.address, 0);

                  await expect(marketplace.listItem(0)).to.be.reverted;
              });

              it('rejects cancel action when paused', async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);

                  await lazySoccer.approve(marketplace.address, 0);
                  await marketplace.listItem(0);
                  await marketplace.pause();

                  await expect(marketplace.cancelListing(0)).to.be.reverted;
              });
          });

          describe('buying of NFT/In-game asset', () => {
              let buyer, buyerAddress, tokenId, nftPrice, fee, currency;

              beforeEach(async () => {
                  const accounts = await ethers.getSigners();
                  await marketplace.changeBackendSigner(deployer.address);
                  buyer = accounts[1];
                  buyerAddress = buyer.address;
                  tokenId = 0;
                  nftPrice = 100;
                  fee = 5;
                  currency = 0;

                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('can buy nft', async () => {
                  await lazySoccer.approve(marketplace.address, tokenId);
                  await marketplace.listItem(tokenId);

                  const nonce = getRandomInt(0, 1000000000);

                  const deadline = await getDeadlineTimestamp();

                  const hash = ethers.utils.keccak256(
                      ethers.utils.toUtf8Bytes(
                          `Buy NFT-${buyerAddress.toLowerCase()}-${deployer.address.toLowerCase()}-${tokenId}-${nftPrice}-${fee}-${currency}-${deadline}-${nonce}`,
                      ),
                  );

                  const signature = await deployer.signMessage(
                      ethers.utils.arrayify(hash),
                  );

                  const sellerInitBalance = (
                      await ethers.provider.getBalance(deployer.address)
                  ).toBigInt();

                  const tx = await marketplace
                      .connect(buyer)
                      .buyItem(
                          tokenId,
                          nftPrice,
                          fee,
                          currency,
                          deadline,
                          nonce,
                          signature,
                          { value: fee + nftPrice },
                      );

                  const newNftOwner = await lazySoccer.ownerOf(tokenId);
                  const sellerFinalBalance = (
                      await ethers.provider.getBalance(deployer.address)
                  ).toBigInt();

                  assert.equal(newNftOwner, buyer.address);
                  assert.equal(
                      sellerFinalBalance - sellerInitBalance,
                      BigInt(nftPrice),
                  );
                  expect(tx)
                      .to.emit(marketplace, 'ItemBought')
                      .withArgs(
                          tokenId,
                          buyerAddress,
                          newNftOwner,
                          nftPrice,
                          currency,
                      );
              });

              it('reverts with bad signature', async () => {
                  await lazySoccer.approve(marketplace.address, tokenId);
                  await marketplace.listItem(tokenId);

                  const nonce = getRandomInt(0, 1000000000);
                  const fakeFee = 0;

                  const deadline = await getDeadlineTimestamp();

                  const hash = ethers.utils.keccak256(
                      ethers.utils.toUtf8Bytes(
                          `Buy NFT-${buyerAddress.toLowerCase()}-${deployer.address.toLowerCase()}-${tokenId}-${nftPrice}-${fee}-${currency}-${deadline}-${nonce}`,
                      ),
                  );

                  const signature = await deployer.signMessage(
                      ethers.utils.arrayify(hash),
                  );

                  await expect(
                      marketplace
                          .connect(buyer)
                          .buyItem(
                              tokenId,
                              nftPrice,
                              fakeFee,
                              currency,
                              deadline,
                              nonce,
                              signature,
                              { value: fakeFee + nftPrice },
                          ),
                  ).to.be.reverted;
              });

              it('can buy in-game asset', async () => {
                  const nonce = getRandomInt(0, 1000000000);

                  const deadline = await getDeadlineTimestamp();

                  const hash = ethers.utils.keccak256(
                      ethers.utils.toUtf8Bytes(
                          `Buy in-game asset-${buyerAddress.toLowerCase()}-${deployer.address.toLowerCase()}-${tokenId}-${currency}-${nftPrice}-${fee}-${deadline}-${nonce}`,
                      ),
                  );

                  const signature = await deployer.signMessage(
                      ethers.utils.arrayify(hash),
                  );

                  const sellerInitBalance = (
                      await ethers.provider.getBalance(deployer.address)
                  ).toBigInt();

                  const tx = await marketplace
                      .connect(buyer)
                      .buyInGameAsset(
                          tokenId,
                          nftPrice,
                          fee,
                          deadline,
                          nonce,
                          currency,
                          deployer.address,
                          signature,
                          { value: fee + nftPrice },
                      );

                  const sellerFinalBalance = (
                      await ethers.provider.getBalance(deployer.address)
                  ).toBigInt();

                  assert.equal(
                      sellerFinalBalance - sellerInitBalance,
                      BigInt(nftPrice),
                  );
                  expect(tx)
                      .to.emit(marketplace, 'InGameAssetSold')
                      .withArgs(buyerAddress);
              });
          });
      });

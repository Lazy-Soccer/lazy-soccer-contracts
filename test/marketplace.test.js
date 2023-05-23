const { assert, expect } = require('chai');
const { network, ethers, upgrades } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config');
const {
    CURRENCY_ADDRESS,
    FEE_WALLET,
    FEE_SECOND_WALLET,
    WHITELIST_ADDRESSES,
    BACKEND_SIGNER,
} = require('../constants/marketplace.constants');
const { ZERO_ADDRESS } = require('../constants/common.constants');
const { getRandomInt } = require('../utils/math');

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe('Marketplace unit tests', () => {
          let deployer, marketplace, lazySoccer;

          async function mintNFT(address, tokenId = 0) {
              await lazySoccer.mintNewNft(
                  address,
                  tokenId,
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
              await lazySoccer.unlockNftForGame(tokenId);
          }

          async function giveWhitelistAccess(address) {
              await lazySoccer.changeWhitelistAddresses([address]);
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
                  'LazyStaff',
              );
              const soccerArgs = [BACKEND_SIGNER, WHITELIST_ADDRESSES];
              lazySoccer = (await LazySoccerNFT.deploy(...soccerArgs)).connect(
                  deployer,
              );

              const LazySoccerMarketplace = await ethers.getContractFactory(
                  'LazySoccerMarketplace',
              );
              const marketplaceArgs = [
                  CURRENCY_ADDRESS,
                  [FEE_WALLET, FEE_SECOND_WALLET],
                  BACKEND_SIGNER,
                  [lazySoccer.address],
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
                  const lazyCollectionAvailable =
                      await marketplace.availableCollections(
                          lazySoccer.address,
                      );
                  const currencyAddress = await marketplace.currencyContract();
                  const feeWallet = await marketplace.feeWallets(0);

                  const backendSigner = await marketplace.backendSigner();

                  assert.equal(lazyCollectionAvailable, true);
                  assert.equal(currencyAddress, CURRENCY_ADDRESS);
                  assert.equal(feeWallet, FEE_WALLET);
                  assert.equal(backendSigner, BACKEND_SIGNER);
              });
          });

          describe('changing of contract params by owner', () => {
              it('reverts on execution by third person', async () => {
                  const [, attacker] = await ethers.getSigners();

                  marketplace = marketplace.connect(attacker);

                  await expect(marketplace.changeFeeWallets([attacker.address]))
                      .to.be.reverted;
                  await expect(
                      marketplace.changeBackendSigner(attacker.address),
                  ).to.be.reverted;
                  await expect(
                      marketplace.changeCurrencyAddress(attacker.address),
                  ).to.be.reverted;
                  await expect(marketplace.addCollection(lazySoccer.address)).to
                      .be.reverted;
                  await expect(marketplace.removeCollection(lazySoccer.address))
                      .to.be.reverted;
              });

              it('can change fee wallet', async () => {
                  await marketplace.changeFeeWallets([ZERO_ADDRESS]);

                  const feeWallet = await marketplace.feeWallets(0);

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

              it('can add nft collection', async () => {
                  await marketplace.addCollection(lazySoccer.address);

                  const collectionAvailable =
                      await marketplace.availableCollections(
                          lazySoccer.address,
                      );

                  assert.equal(collectionAvailable, true);
              });

              it('can remove nft collection', async () => {
                  await marketplace.removeCollection(lazySoccer.address);

                  const collectionAvailable =
                      await marketplace.availableCollections(
                          lazySoccer.address,
                      );

                  assert.equal(collectionAvailable, false);
              });
          });

          describe('listing of nft', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('can list nft', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0, lazySoccer.address);
                  const listingOwner = await marketplace.listings(
                      lazySoccer.address,
                      0,
                  );

                  const newNftOwner = await lazySoccer.ownerOf(0);

                  assert.equal(listingOwner, deployer.address);
                  assert.equal(newNftOwner, marketplace.address);
              });

              it('can list a batch of nfts', async () => {
                  await mintNFT(deployer.address, 1);
                  await lazySoccer.approve(marketplace.address, 0);
                  await lazySoccer.approve(marketplace.address, 1);

                  await marketplace.listBatch([0, 1], lazySoccer.address);

                  let listingOwner = await marketplace.listings(
                      lazySoccer.address,
                      0,
                  );
                  let newNftOwner = await lazySoccer.ownerOf(0);

                  assert.equal(listingOwner, deployer.address);
                  assert.equal(newNftOwner, marketplace.address);

                  listingOwner = await marketplace.listings(
                      lazySoccer.address,
                      1,
                  );
                  newNftOwner = await lazySoccer.ownerOf(1);

                  assert.equal(listingOwner, deployer.address);
                  assert.equal(newNftOwner, marketplace.address);
              });

              it('rejects when NFT is not approved', async () => {
                  await expect(marketplace.listItem(0, lazySoccer.address)).to
                      .be.reverted;
              });

              it('rejects when NFT is already listed', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0, lazySoccer.address);
                  await expect(marketplace.listItem(0, lazySoccer.address))
                      .to.be.revertedWithCustomError(
                          marketplace,
                          'AlreadyListed',
                      )
                      .withArgs(0);
              });

              it('emits events on successful listing', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await expect(marketplace.listItem(0, lazySoccer.address))
                      .to.emit(marketplace, 'ItemListed')
                      .withArgs(0, deployer.address, lazySoccer.address);
              });
          });

          describe('cancel of listing', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('cancels listing', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0, lazySoccer.address);
                  await marketplace.cancelListing(0, lazySoccer.address);

                  const newListingOwner = await marketplace.listings(
                      lazySoccer.address,
                      0,
                  );
                  const newNftOwner = await lazySoccer.ownerOf(0);

                  assert.equal(newListingOwner, ZERO_ADDRESS);
                  assert.equal(newNftOwner, deployer.address);
              });

              it('it can cancel batch of listings', async () => {
                  await mintNFT(deployer.address, 1);
                  await lazySoccer.approve(marketplace.address, 0);
                  await lazySoccer.approve(marketplace.address, 1);

                  await marketplace.listItem(0, lazySoccer.address);
                  await marketplace.listItem(1, lazySoccer.address);
                  await marketplace.batchCancelListing(
                      [0, 1],
                      lazySoccer.address,
                  );

                  let newListingOwner = await marketplace.listings(
                      lazySoccer.address,
                      0,
                  );
                  let newNftOwner = await lazySoccer.ownerOf(0);

                  assert.equal(newListingOwner, ZERO_ADDRESS);
                  assert.equal(newNftOwner, deployer.address);

                  newListingOwner = await marketplace.listings(
                      lazySoccer.address,
                      1,
                  );
                  newNftOwner = await lazySoccer.ownerOf(1);

                  assert.equal(newListingOwner, ZERO_ADDRESS);
                  assert.equal(newNftOwner, deployer.address);
              });

              it('rejects when no listing found', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await expect(marketplace.cancelListing(0, lazySoccer.address))
                      .to.be.reverted;
              });

              it('emits cancel event', async () => {
                  await lazySoccer.approve(marketplace.address, 0);

                  await marketplace.listItem(0, lazySoccer.address);
                  await expect(marketplace.cancelListing(0, lazySoccer.address))
                      .to.emit(marketplace, 'ListingCanceled')
                      .withArgs(0, deployer.address, lazySoccer.address);
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

                  await expect(marketplace.listItem(0, lazySoccer.address)).to
                      .be.reverted;
              });

              it('rejects cancel action when paused', async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);

                  await lazySoccer.approve(marketplace.address, 0);
                  await marketplace.listItem(0, lazySoccer.address);
                  await marketplace.pause();

                  await expect(marketplace.cancelListing(0, lazySoccer.address))
                      .to.be.reverted;
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
                  await marketplace.listItem(tokenId, lazySoccer.address);

                  const nonce = getRandomInt(0, 1000000000);

                  const deadline = await getDeadlineTimestamp();

                  const hash = ethers.utils.keccak256(
                      ethers.utils.toUtf8Bytes(
                          `Buy NFT-${buyerAddress.toLowerCase()}-${deployer.address.toLowerCase()}-${lazySoccer.address.toLowerCase()}-${tokenId}-${nftPrice}-${fee}-${currency}-${deadline}-${nonce}`,
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
                          lazySoccer.address,
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
                          lazySoccer.address,
                          nftPrice,
                          currency,
                      );
              });

              it('reverts with bad signature', async () => {
                  await lazySoccer.approve(marketplace.address, tokenId);
                  await marketplace.listItem(tokenId, lazySoccer.address);

                  const nonce = getRandomInt(0, 1000000000);
                  const fakeFee = 0;

                  const deadline = await getDeadlineTimestamp();

                  const hash = ethers.utils.keccak256(
                      ethers.utils.toUtf8Bytes(
                          `Buy NFT-${buyerAddress.toLowerCase()}-${deployer.address.toLowerCase()}-${lazySoccer.address.toLowerCase()}-${tokenId}-${nftPrice}-${fee}-${currency}-${deadline}-${nonce}`,
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
                              lazySoccer.address,
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
                  const quantity = 10;

                  const deadline = await getDeadlineTimestamp();

                  const hash = ethers.utils.keccak256(
                      ethers.utils.toUtf8Bytes(
                          `Buy in-game asset-${buyerAddress.toLowerCase()}-${deployer.address.toLowerCase()}-${quantity}-${currency}-${nftPrice}-${fee}-${deadline}-${nonce}`,
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
                          quantity,
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
                      .withArgs(buyerAddress, deployer.address, quantity);
              });

              it('can buy a batch of nfts', async () => {
                  const secondTokenId = 1;
                  const nonces = [
                      getRandomInt(0, 1000000000),
                      getRandomInt(0, 1000000000),
                  ];
                  const tokenIds = [tokenId, secondTokenId];
                  const prices = [nftPrice, nftPrice];
                  const fees = [fee, fee];
                  const owners = [deployer.address, deployer.address];

                  const deadline = await getDeadlineTimestamp();

                  const hashes = [
                      ethers.utils.keccak256(
                          ethers.utils.toUtf8Bytes(
                              `Buy NFT-${buyerAddress.toLowerCase()}-${owners[0].toLowerCase()}-${lazySoccer.address.toLowerCase()}-${
                                  tokenIds[0]
                              }-${prices[0]}-${
                                  fees[0]
                              }-${currency}-${deadline}-${nonces[0]}`,
                          ),
                      ),
                      ethers.utils.keccak256(
                          ethers.utils.toUtf8Bytes(
                              `Buy NFT-${buyerAddress.toLowerCase()}-${owners[1].toLowerCase()}-${lazySoccer.address.toLowerCase()}-${
                                  tokenIds[1]
                              }-${prices[1]}-${
                                  fees[1]
                              }-${currency}-${deadline}-${nonces[1]}`,
                          ),
                      ),
                  ];
                  const signatures = await Promise.all(
                      hashes.map((hash) =>
                          deployer.signMessage(ethers.utils.arrayify(hash)),
                      ),
                  );

                  await mintNFT(deployer.address, secondTokenId);
                  await lazySoccer.approve(marketplace.address, tokenId);
                  await lazySoccer.approve(marketplace.address, secondTokenId);
                  await marketplace.listItem(tokenId, lazySoccer.address);
                  await marketplace.listItem(secondTokenId, lazySoccer.address);

                  const tx = await marketplace
                      .connect(buyer)
                      .batchBuyItem(
                          tokenIds,
                          prices,
                          fees,
                          currency,
                          lazySoccer.address,
                          deadline,
                          nonces,
                          signatures,
                          { value: fees[0] + fees[1] + prices[0] + prices[1] },
                      );

                  const newNftOwner = await lazySoccer.ownerOf(tokenId);
                  const secondNewNftOwner = await lazySoccer.ownerOf(
                      secondTokenId,
                  );

                  assert.equal(newNftOwner, buyer.address);
                  assert.equal(secondNewNftOwner, buyer.address);

                  expect(tx)
                      .to.emit(marketplace, 'ItemBought')
                      .withArgs(
                          tokenIds[0],
                          owners[0],
                          newNftOwner,
                          lazySoccer.address,
                          prices[0],
                          currency,
                      );
                  expect(tx)
                      .to.emit(marketplace, 'ItemBought')
                      .withArgs(
                          tokenIds[1],
                          owners[1],
                          newNftOwner,
                          lazySoccer.address,
                          prices[1],
                          currency,
                      );
              });

              it('can buy batch of in-game assets', async () => {
                  const accounts = await ethers.getSigners();
                  const nonces = [
                      getRandomInt(0, 1000000000),
                      getRandomInt(0, 1000000000),
                  ];
                  const quantities = [5, 20];
                  const prices = [100, 100];
                  const fees = [fee, fee];
                  const owners = [accounts[2].address, accounts[3].address];

                  const deadline = await getDeadlineTimestamp();

                  const hashes = [
                      ethers.utils.keccak256(
                          ethers.utils.toUtf8Bytes(
                              `Buy in-game asset-${buyerAddress.toLowerCase()}-${owners[0].toLowerCase()}-${
                                  quantities[0]
                              }-${currency}-${prices[0]}-${
                                  fees[0]
                              }-${deadline}-${nonces[0]}`,
                          ),
                      ),
                      ethers.utils.keccak256(
                          ethers.utils.toUtf8Bytes(
                              `Buy in-game asset-${buyerAddress.toLowerCase()}-${owners[1].toLowerCase()}-${
                                  quantities[1]
                              }-${currency}-${prices[1]}-${
                                  fees[1]
                              }-${deadline}-${nonces[1]}`,
                          ),
                      ),
                  ];
                  const signatures = await Promise.all(
                      hashes.map((hash) =>
                          deployer.signMessage(ethers.utils.arrayify(hash)),
                      ),
                  );

                  const tx = await marketplace
                      .connect(buyer)
                      .batchBuyInGameAsset(
                          quantities,
                          prices,
                          fees,
                          deadline,
                          nonces,
                          currency,
                          owners,
                          signatures,
                          { value: fees[0] + fees[1] + prices[0] + prices[1] },
                      );
                  expect(tx)
                      .to.emit(marketplace, 'InGameAssetSold')
                      .withArgs(buyerAddress, owners[0], quantities[0]);
                  expect(tx)
                      .to.emit(marketplace, 'InGameAssetSold')
                      .withArgs(buyerAddress, owners[1], quantities[1]);
              });
          });
      });

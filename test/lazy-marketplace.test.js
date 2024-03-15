const { assert, expect } = require('chai');
const { network, ethers, upgrades } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config');
const {
    CURRENCY_ADDRESS,
    FEE_WALLET,
    FEE_SECOND_WALLET,
} = require('../constants/marketplace.constants');
const { ZERO_ADDRESS } = require('../constants/common.constants');
const { getRandomInt } = require('../utils/math');

!developmentChains.includes(network.name)
    ? describe.skip('')
    : describe('LazySoccerMarketplace', () => {
          let deployer, marketplace, lazyStaff, domain;

          async function mintNFT(address, tokenId = 0) {
              await lazyStaff.mintNewNft(
                  address,
                  tokenId,
                  'hash',
                  {
                      medicine: 0,
                      accounting: 1,
                      scouting: 2,
                      coaching: 3,
                      physiotherapy: 4,
                  },
                  10,
                  0,
                  true
              );
              await lazyStaff.unlockNftForGame(tokenId);
          }

          async function giveWhitelistAccess(address) {
              const adminRole = await lazyStaff.DEFAULT_ADMIN_ROLE();
              const minterRole = await lazyStaff.MINTER_ROLE();

              await lazyStaff.grantRole(adminRole, address);
              await lazyStaff.grantRole(minterRole, address);
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
              const soccerArgs = [deployer.address];
              lazyStaff = (await LazySoccerNFT.deploy(...soccerArgs)).connect(
                  deployer,
              );

              const LazySoccerMarketplace = await ethers.getContractFactory(
                  'LazySoccerMarketplace',
              );
              const marketplaceArgs = [
                  CURRENCY_ADDRESS,
                  [FEE_WALLET, FEE_SECOND_WALLET],
                  deployer.address,
                  [lazyStaff.address],
                  [true]
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

              const lockerRole = await lazyStaff.LOCKER();
              await lazyStaff.grantRole(lockerRole, marketplace.address);

              domain = {
                  name: 'Lazy Soccer Marketplace',
                  version: '1',
                  chainId: '31337',
                  verifyingContract: marketplace.address,
              };
          });

          describe('constructor', () => {
              it('sets starting values correctly', async () => {
                  const lazyCollectionAvailable =
                      await marketplace.availableCollections(lazyStaff.address);
                  const currencyAddress = await marketplace.currencyContract();
                  const feeWallet = await marketplace.feeWallets(0);

                  const backendSigner = await marketplace.backendSigner();

                  assert.equal(lazyCollectionAvailable, true);
                  assert.equal(currencyAddress, CURRENCY_ADDRESS);
                  assert.equal(feeWallet, FEE_WALLET);
                  assert.equal(backendSigner, deployer.address);
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
                  await expect(marketplace.addCollection(lazyStaff.address, true)).to
                      .be.reverted;
                  await expect(marketplace.removeCollection(lazyStaff.address))
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
                  await marketplace.addCollection(lazyStaff.address, true);

                  const collectionAvailable =
                      await marketplace.availableCollections(lazyStaff.address);

                  assert.equal(collectionAvailable, true);
              });

              it('can remove nft collection', async () => {
                  await marketplace.removeCollection(lazyStaff.address);

                  const collectionAvailable =
                      await marketplace.availableCollections(lazyStaff.address);

                  assert.equal(collectionAvailable, false);
              });
          });

          describe('listing of nft', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('can list nft', async () => {
                  await lazyStaff.approve(marketplace.address, 0);

                  await marketplace.listItem(0, lazyStaff.address);
                  const listingOwner = await marketplace.listings(
                      lazyStaff.address,
                      0,
                  );

                  const newNftOwner = await lazyStaff.ownerOf(0);

                  assert.equal(listingOwner, deployer.address);
                  assert.equal(newNftOwner, marketplace.address);
              });

              it('can list a batch of nfts', async () => {
                  await mintNFT(deployer.address, 1);
                  await lazyStaff.approve(marketplace.address, 0);
                  await lazyStaff.approve(marketplace.address, 1);

                  await marketplace.listBatch([0, 1], lazyStaff.address);

                  let listingOwner = await marketplace.listings(
                      lazyStaff.address,
                      0,
                  );
                  let newNftOwner = await lazyStaff.ownerOf(0);

                  assert.equal(listingOwner, deployer.address);
                  assert.equal(newNftOwner, marketplace.address);

                  listingOwner = await marketplace.listings(
                      lazyStaff.address,
                      1,
                  );
                  newNftOwner = await lazyStaff.ownerOf(1);

                  assert.equal(listingOwner, deployer.address);
                  assert.equal(newNftOwner, marketplace.address);
              });

              it('rejects when NFT is not approved', async () => {
                  await expect(marketplace.listItem(0, lazyStaff.address)).to.be
                      .reverted;
              });

              it('rejects when NFT is already listed', async () => {
                  await lazyStaff.approve(marketplace.address, 0);

                  await marketplace.listItem(0, lazyStaff.address);
                  await expect(
                      marketplace.listItem(0, lazyStaff.address),
                  ).to.be.revertedWith('Already listed');
              });

              it('emits events on successful listing', async () => {
                  await lazyStaff.approve(marketplace.address, 0);

                  await expect(marketplace.listItem(0, lazyStaff.address))
                      .to.emit(marketplace, 'ItemListed')
                      .withArgs(0, deployer.address, lazyStaff.address);
              });
          });

          describe('cancel of listing', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('cancels listing', async () => {
                  await lazyStaff.approve(marketplace.address, 0);

                  await marketplace.listItem(0, lazyStaff.address);
                  await marketplace.cancelListing(0, lazyStaff.address);

                  const newListingOwner = await marketplace.listings(
                      lazyStaff.address,
                      0,
                  );
                  const newNftOwner = await lazyStaff.ownerOf(0);

                  assert.equal(newListingOwner, ZERO_ADDRESS);
                  assert.equal(newNftOwner, deployer.address);
              });

              it('it can cancel batch of listings', async () => {
                  await mintNFT(deployer.address, 1);
                  await lazyStaff.approve(marketplace.address, 0);
                  await lazyStaff.approve(marketplace.address, 1);

                  await marketplace.listItem(0, lazyStaff.address);
                  await marketplace.listItem(1, lazyStaff.address);
                  await marketplace.batchCancelListing(
                      [0, 1],
                      lazyStaff.address,
                  );

                  let newListingOwner = await marketplace.listings(
                      lazyStaff.address,
                      0,
                  );
                  let newNftOwner = await lazyStaff.ownerOf(0);

                  assert.equal(newListingOwner, ZERO_ADDRESS);
                  assert.equal(newNftOwner, deployer.address);

                  newListingOwner = await marketplace.listings(
                      lazyStaff.address,
                      1,
                  );
                  newNftOwner = await lazyStaff.ownerOf(1);

                  assert.equal(newListingOwner, ZERO_ADDRESS);
                  assert.equal(newNftOwner, deployer.address);
              });

              it('rejects when no listing found', async () => {
                  await lazyStaff.approve(marketplace.address, 0);

                  await expect(marketplace.cancelListing(0, lazyStaff.address))
                      .to.be.reverted;
              });

              it('emits cancel event', async () => {
                  await lazyStaff.approve(marketplace.address, 0);

                  await marketplace.listItem(0, lazyStaff.address);
                  await expect(marketplace.cancelListing(0, lazyStaff.address))
                      .to.emit(marketplace, 'ListingCanceled')
                      .withArgs(0, deployer.address, lazyStaff.address);
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

                  await lazyStaff.approve(marketplace.address, 0);

                  await expect(marketplace.listItem(0, lazyStaff.address)).to.be
                      .reverted;
              });

              it('rejects cancel action when paused', async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);

                  await lazyStaff.approve(marketplace.address, 0);
                  await marketplace.listItem(0, lazyStaff.address);
                  await marketplace.pause();

                  await expect(marketplace.cancelListing(0, lazyStaff.address))
                      .to.be.reverted;
              });
          });

          describe('buying of NFT/In-game asset', () => {
              let buyer,
                  buyerAddress,
                  tokenId,
                  nftPrice,
                  fee,
                  currency,
                  buyNftValue,
                  buyNftSignature,
                  buyInGameTypes,
                  buyNftTypes,
                  deadline,
                  nonce;

              beforeEach(async () => {
                  const accounts = await ethers.getSigners();

                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);

                  buyer = accounts[1];
                  buyerAddress = buyer.address;
                  tokenId = 0;
                  nftPrice = 100;
                  fee = 5;
                  currency = 0;
                  nonce = getRandomInt(0, 1000000000);
                  deadline = await getDeadlineTimestamp();
                  buyNftTypes = {
                      BuyItem: [
                          { name: 'buyer', type: 'address' },
                          { name: 'owner', type: 'address' },
                          { name: 'collection', type: 'address' },
                          { name: 'tokenId', type: 'uint256' },
                          { name: 'price', type: 'uint256' },
                          { name: 'fee', type: 'uint256' },
                          { name: 'currency', type: 'uint8' },
                          { name: 'deadline', type: 'uint256' },
                          { name: 'nonce', type: 'uint256' },
                      ],
                  };
                  buyInGameTypes = {
                      BuyInGameAsset: [
                          { name: 'buyer', type: 'address' },
                          { name: 'owner', type: 'address' },
                          { name: 'transferId', type: 'uint256' },
                          { name: 'currency', type: 'uint8' },
                          { name: 'price', type: 'uint256' },
                          { name: 'fee', type: 'uint256' },
                          { name: 'deadline', type: 'uint256' },
                          { name: 'nonce', type: 'uint256' },
                      ],
                  };
                  buyNftValue = {
                      buyer: buyerAddress,
                      owner: deployer.address,
                      collection: lazyStaff.address,
                      tokenId,
                      price: nftPrice,
                      fee,
                      currency,
                      deadline,
                      nonce,
                  };
                  buyNftValue = {
                      buyer: buyerAddress,
                      owner: deployer.address,
                      collection: lazyStaff.address,
                      tokenId,
                      price: nftPrice,
                      fee,
                      currency,
                      deadline,
                      nonce,
                  };
                  buyNftSignature = await deployer._signTypedData(
                      domain,
                      buyNftTypes,
                      buyNftValue,
                  );
              });

              it('can buy nft', async () => {
                  await lazyStaff.approve(marketplace.address, tokenId);
                  await marketplace.listItem(tokenId, lazyStaff.address);

                  const sellerInitBalance = (
                      await ethers.provider.getBalance(deployer.address)
                  ).toBigInt();

                  const tx = await marketplace
                      .connect(buyer)
                      .buyItem(
                          tokenId,
                          lazyStaff.address,
                          nftPrice,
                          fee,
                          currency,
                          deadline,
                          nonce,
                          buyNftSignature,
                          { value: fee + nftPrice },
                      );

                  const newNftOwner = await lazyStaff.ownerOf(tokenId);
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
                          lazyStaff.address,
                          nftPrice,
                          currency,
                      );
              });

              it('reverts with bad signature', async () => {
                  await lazyStaff.approve(marketplace.address, tokenId);
                  await marketplace.listItem(tokenId, lazyStaff.address);

                  const fakeFee = 0;

                  await expect(
                      marketplace
                          .connect(buyer)
                          .buyItem(
                              tokenId,
                              lazyStaff.address,
                              nftPrice,
                              fakeFee,
                              currency,
                              deadline,
                              nonce,
                              buyNftSignature,
                              { value: fakeFee + nftPrice },
                          ),
                  ).to.be.reverted;
              });

              it('can buy in-game asset', async () => {
                  const transferId = 1;

                  const value = {
                      buyer: buyerAddress,
                      owner: deployer.address,
                      transferId,
                      currency,
                      price: nftPrice,
                      fee: fee,
                      deadline,
                      nonce,
                  };

                  const signature = await deployer._signTypedData(
                      domain,
                      buyInGameTypes,
                      value,
                  );

                  const sellerInitBalance = (
                      await ethers.provider.getBalance(deployer.address)
                  ).toBigInt();

                  const tx = await marketplace
                      .connect(buyer)
                      .buyInGameAsset(
                          transferId,
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
                      .withArgs(buyerAddress, deployer.address, transferId);
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

                  const signatures = [];

                  for (let i = 0; i < tokenIds.length; i++) {
                      const value = {
                          buyer: buyerAddress,
                          owner: owners[i],
                          tokenId: tokenIds[i],
                          collection: lazyStaff.address,
                          price: prices[i],
                          fee: fees[i],
                          currency,
                          deadline,
                          nonce: nonces[i],
                      };

                      const signature = await deployer._signTypedData(
                          domain,
                          buyNftTypes,
                          value,
                      );
                      signatures.push(signature);
                  }

                  await mintNFT(deployer.address, secondTokenId);
                  await lazyStaff.approve(marketplace.address, tokenId);
                  await lazyStaff.approve(marketplace.address, secondTokenId);
                  await marketplace.listItem(tokenId, lazyStaff.address);
                  await marketplace.listItem(secondTokenId, lazyStaff.address);

                  const tx = await marketplace
                      .connect(buyer)
                      .batchBuyItem(
                          tokenIds,
                          prices,
                          fees,
                          currency,
                          lazyStaff.address,
                          deadline,
                          nonces,
                          signatures,
                          { value: fees[0] + fees[1] + prices[0] + prices[1] },
                      );

                  const newNftOwner = await lazyStaff.ownerOf(tokenId);
                  const secondNewNftOwner = await lazyStaff.ownerOf(
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
                          lazyStaff.address,
                          prices[0],
                          currency,
                      );
                  expect(tx)
                      .to.emit(marketplace, 'ItemBought')
                      .withArgs(
                          tokenIds[1],
                          owners[1],
                          newNftOwner,
                          lazyStaff.address,
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
                  const tokenIds = [5, 20];
                  const prices = [100, 100];
                  const fees = [fee, fee];
                  const owners = [accounts[2].address, accounts[3].address];

                  const deadline = await getDeadlineTimestamp();

                  const signatures = [];

                  for (let i = 0; i < tokenIds.length; i++) {
                      const value = {
                          buyer: buyerAddress,
                          owner: owners[i],
                          transferId: tokenIds[i],
                          currency,
                          price: prices[i],
                          fee: fees[i],
                          deadline,
                          nonce: nonces[i],
                      };

                      const signature = await deployer._signTypedData(
                          domain,
                          buyInGameTypes,
                          value,
                      );

                      signatures.push(signature);
                  }

                  const tx = await marketplace
                      .connect(buyer)
                      .batchBuyInGameAsset(
                          tokenIds,
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
                      .withArgs(buyerAddress, owners[0], tokenIds[0]);
                  expect(tx)
                      .to.emit(marketplace, 'InGameAssetSold')
                      .withArgs(buyerAddress, owners[1], tokenIds[1]);
              });
          });
      });

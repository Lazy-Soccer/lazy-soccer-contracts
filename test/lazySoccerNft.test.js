const { developmentChains } = require('../helper-hardhat-config');
const { network, ethers } = require('hardhat');
const {
    BACKEND_SIGNER,
    WHITELIST_ADDRESSES,
} = require('../constants/marketplace.constants');
const { assert, expect } = require('chai');
const { ZERO_ADDRESS } = require('../constants/common.constants');

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe('Lazy Soccer NFT unit tests', () => {
          let deployer, lazySoccer;

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
              await lazySoccer.changeWhitelistAddresses([address]);
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
          });

          describe('constructor', () => {
              it('sets starting values correctly', async () => {
                  const callTransactionWhitelist =
                      await lazySoccer.whitelistAddresses(0);
                  const backendSigner = await lazySoccer.backendSigner();

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

                  lazySoccer = lazySoccer.connect(attacker);

                  await expect(lazySoccer.changeBackendSigner(attacker.address))
                      .to.be.reverted;
                  await expect(
                      lazySoccer.changeWhitelistAddresses([attacker.address]),
                  ).to.be.reverted;
              });

              it('can change backend signer', async () => {
                  await lazySoccer.changeBackendSigner(ZERO_ADDRESS);

                  const backendSigner = await lazySoccer.backendSigner();

                  assert.equal(backendSigner, ZERO_ADDRESS);
              });

              it('can change nft whitelist array', async () => {
                  await lazySoccer.changeWhitelistAddresses([ZERO_ADDRESS]);

                  const callTransactionWhitelist =
                      await lazySoccer.whitelistAddresses(0);

                  assert.equal(callTransactionWhitelist, ZERO_ADDRESS);
              });
          });

          describe('Nft locks', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('is locked after mint', async () => {
                  const isLocked = await lazySoccer.lockedNftForGame(0);

                  assert.equal(isLocked, true);
              });

              it('can unlock nft', async () => {
                  await lazySoccer.unlockNftForGame(0);

                  const isLocked = await lazySoccer.lockedNftForGame(0);

                  assert.equal(isLocked, false);
              });

              it('can lock and unlock nft only by owner', async () => {
                  const [, attacker] = await ethers.getSigners();

                  await expect(lazySoccer.connect(attacker).unlockNftForGame(0))
                      .to.be.reverted;
                  await expect(lazySoccer.connect(attacker).lockNftForGame(0))
                      .to.be.reverted;
              });
          });

          describe('mint', () => {
              it('can mint nft', async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('reverts mint when minter is not in whitelist', async () => {
                  expect(mintNFT(deployer.address)).to.be.reverted;
              });

              it('mints nft with correct data', async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);

                  const unspentSkills = await lazySoccer.unspentSkills(0);
                  const nftStats = await lazySoccer.nftStats(0);
                  const hash = await lazySoccer.tokenURI(0);

                  assert.equal(unspentSkills.toString(), '10');
                  assert.equal(hash, 'hash');
                  assert.equal(unspentSkills.toString(), '10');
                  assert.equal(nftStats.marketerLVL.toString(), '0');
                  assert.equal(nftStats.accountantLVL.toString(), '1');
                  assert.equal(nftStats.scoutLVL.toString(), '2');
                  assert.equal(nftStats.coachLVL.toString(), '3');
                  assert.equal(nftStats.fitnessTrainerLVL.toString(), '4');
              });
          });

          describe('update nft', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
                  await lazySoccer.unlockNftForGame(0);
              });

              it('can update nft', async () => {
                  const initialFitnessSkill = (await lazySoccer.nftStats(0))
                      .fitnessTrainerLVL;
                  const initialUnspentSkills = await lazySoccer.unspentSkills(
                      0,
                  );

                  await lazySoccer.updateNft(0, {
                      marketerLVL: 0,
                      accountantLVL: 0,
                      scoutLVL: 0,
                      coachLVL: 0,
                      fitnessTrainerLVL: 5,
                  });

                  const finalFitnessSkill = (await lazySoccer.nftStats(0))
                      .fitnessTrainerLVL;
                  const finalUnspentSkills = await lazySoccer.unspentSkills(0);

                  assert.equal(
                      finalFitnessSkill.toString() -
                          initialFitnessSkill.toString(),
                      5,
                  );
                  assert.equal(
                      initialUnspentSkills.toString() -
                          finalUnspentSkills.toString(),
                      5,
                  );
              });

              it('allows only nft owner to update nft', async () => {
                  const [, attacker] = await ethers.getSigners();

                  await expect(
                      lazySoccer.connect(attacker).updateNft(0, {
                          marketerLVL: 0,
                          accountantLVL: 0,
                          scoutLVL: 0,
                          coachLVL: 0,
                          fitnessTrainerLVL: 5,
                      }),
                  ).to.be.reverted;
              });

              it('allows only unlocked nft to be updated', async () => {
                  await lazySoccer.lockNftForGame(0);

                  await expect(
                      lazySoccer.updateNft(0, {
                          marketerLVL: 0,
                          accountantLVL: 0,
                          scoutLVL: 0,
                          coachLVL: 0,
                          fitnessTrainerLVL: 5,
                      }),
                  ).to.be.reverted;
              });

              it('reverts when not enough unspent skills', async () => {
                  const fakeSkills = 25;

                  await expect(
                      lazySoccer.updateNft(0, {
                          marketerLVL: 0,
                          accountantLVL: 0,
                          scoutLVL: 0,
                          coachLVL: 0,
                          fitnessTrainerLVL: fakeSkills,
                      }),
                  ).to.be.reverted;
              });
          });
      });

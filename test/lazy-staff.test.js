const { developmentChains } = require('../helper-hardhat-config');
const { network, ethers } = require('hardhat');
const { assert, expect } = require('chai');
const { ZERO_ADDRESS } = require('../constants/common.constants');

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe('LazyStaff', () => {
          let deployer, lazyStaff, domain;

          async function mintNFT(address, amount = 1) {
              for (let i = 0; i < amount; i++) {
                  await lazyStaff.mintNewNft(
                      address,
                      i,
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
          }

          async function giveWhitelistAccess(address) {
              const adminRole = await lazyStaff.DEFAULT_ADMIN_ROLE();
              await lazyStaff.grantRole(adminRole, address);
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
              await giveWhitelistAccess(deployer.address);

              domain = {
                  name: 'Lazy Staff',
                  version: '1',
                  chainId: '31337',
                  verifyingContract: lazyStaff.address.toString(),
              };
          });

          describe('constructor', () => {
              it('sets starting values correctly', async () => {
                  const adminRole = await lazyStaff.DEFAULT_ADMIN_ROLE();
                  const hasAdminRole = await lazyStaff.hasRole(
                      adminRole,
                      deployer.address,
                  );
                  const backendSigner = await lazyStaff.backendSigner();

                  assert.equal(hasAdminRole, true);
                  assert.equal(backendSigner, deployer.address);
              });
          });

          describe('changing of contract params only by owner', () => {
              it('reverts on execution by attacker', async () => {
                  const [, attacker] = await ethers.getSigners();

                  lazyStaff = lazyStaff.connect(attacker);

                  await expect(lazyStaff.changeBackendSigner(attacker.address))
                      .to.be.reverted;
              });

              it('can change backend signer', async () => {
                  await lazyStaff.changeBackendSigner(ZERO_ADDRESS);

                  const backendSigner = await lazyStaff.backendSigner();

                  assert.equal(backendSigner, ZERO_ADDRESS);
              });
          });

          describe('Nft locks', () => {
              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
              });

              it('is locked after mint', async () => {
                  const isLocked = await lazyStaff.isLocked(0);

                  assert.equal(isLocked, true);
              });

              it('can unlock nft', async () => {
                  await lazyStaff.unlockNftForGame(0);

                  const isLocked = await lazyStaff.isLocked(0);

                  assert.equal(isLocked, false);
              });

              it('can lock and unlock nft only by owner', async () => {
                  const [, attacker] = await ethers.getSigners();

                  await expect(
                      lazyStaff.connect(attacker).unlockNftForGame(0),
                  ).to.be.revertedWithCustomError(
                      lazyStaff,
                      'LockNotAccessible',
                  );
                  await expect(
                      lazyStaff.connect(attacker).lockNftForGame(0),
                  ).to.be.revertedWithCustomError(
                      lazyStaff,
                      'LockNotAccessible',
                  );
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

                  const unspentSkills = await lazyStaff.unspentSkills(0);
                  const nftStats = await lazyStaff.nftStats(0);
                  const hash = await lazyStaff.tokenURI(0);

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

          describe('breed', () => {
              let types, value, signature;

              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await lazyStaff.changeBackendSigner(deployer.address);
                  await mintNFT(deployer.address, 2);

                  types = {
                      Breed: [
                          { name: 'firstParentTokenId', type: 'uint256' },
                          { name: 'secondParentTokenId', type: 'uint256' },
                          { name: 'childTokenId', type: 'uint256' },
                          { name: 'childNftIpfsHash', type: 'string' },
                          { name: 'skills', type: 'NftSkills' },
                          { name: 'unspentSkills', type: 'uint256' },
                      ],
                      NftSkills: [
                          { name: 'marketerLVL', type: 'uint256' },
                          { name: 'accountantLVL', type: 'uint256' },
                          { name: 'scoutLVL', type: 'uint256' },
                          { name: 'coachLVL', type: 'uint256' },
                          { name: 'fitnessTrainerLVL', type: 'uint256' },
                      ],
                  };

                  value = {
                      firstParentTokenId: 0,
                      secondParentTokenId: 1,
                      childTokenId: 2,
                      childNftIpfsHash: 'ipfs',
                      skills: {
                          marketerLVL: 1,
                          accountantLVL: 2,
                          scoutLVL: 3,
                          coachLVL: 4,
                          fitnessTrainerLVL: 5,
                      },
                      unspentSkills: 0,
                  };

                  signature = await deployer._signTypedData(
                      domain,
                      types,
                      value,
                  );
              });

              it('can breed own nfts', async () => {
                  await expect(
                      lazyStaff.breedNft([
                          value.firstParentTokenId,
                          value.secondParentTokenId,
                          value.childTokenId,
                          value.childNftIpfsHash,
                          value.skills,
                          value.unspentSkills,
                          signature,
                      ]),
                  )
                      .to.emit(lazyStaff, 'NFTBreeded')
                      .withArgs(
                          deployer.address,
                          value.firstParentTokenId,
                          value.secondParentTokenId,
                          value.childTokenId,
                      );
                  assert.equal(
                      await lazyStaff.ownerOf(value.childTokenId),
                      deployer.address,
                  );
              });
          });

          describe('update nft', () => {
              const tokenId = 0;
              const uri = 'ipfs';
              const finalSkills = [1, 2, 3, 4, 5];
              const finalUnspentSkills = 5;
              let signature, types, value;

              beforeEach(async () => {
                  await giveWhitelistAccess(deployer.address);
                  await mintNFT(deployer.address);
                  await lazyStaff.unlockNftForGame(0);
                  await lazyStaff.changeBackendSigner(deployer.address);

                  types = {
                      Update: [
                          { name: 'tokenId', type: 'uint256' },
                          { name: 'ipfsHash', type: 'string' },
                          { name: 'skills', type: 'NftSkills' },
                          { name: 'unspentSkills', type: 'uint256' },
                      ],
                      NftSkills: [
                          { name: 'marketerLVL', type: 'uint256' },
                          { name: 'accountantLVL', type: 'uint256' },
                          { name: 'scoutLVL', type: 'uint256' },
                          { name: 'coachLVL', type: 'uint256' },
                          { name: 'fitnessTrainerLVL', type: 'uint256' },
                      ],
                  };

                  value = {
                      tokenId: tokenId,
                      ipfsHash: uri,
                      skills: {
                          marketerLVL: 1,
                          accountantLVL: 2,
                          scoutLVL: 3,
                          coachLVL: 4,
                          fitnessTrainerLVL: 5,
                      },
                      unspentSkills: finalUnspentSkills,
                  };

                  signature = await deployer._signTypedData(
                      domain,
                      types,
                      value,
                  );
              });

              it('can update nft', async () => {
                  const unspentSkillsExpected = 5;

                  const initialFitnessSkill = (
                      await lazyStaff.nftStats(tokenId)
                  ).fitnessTrainerLVL;
                  const initialUnspentSkills = await lazyStaff.unspentSkills(
                      tokenId,
                  );

                  await expect(
                      lazyStaff.updateNft(
                          tokenId,
                          {
                              marketerLVL: 1,
                              accountantLVL: 1,
                              scoutLVL: 1,
                              coachLVL: 1,
                              fitnessTrainerLVL: 1,
                          },
                          uri,
                          signature,
                      ),
                  )
                      .to.emit(lazyStaff, 'NFTUpdated')
                      .withArgs(
                          tokenId,
                          unspentSkillsExpected,
                          finalSkills,
                          uri,
                      );

                  const finalFitnessSkill = (await lazyStaff.nftStats(0))
                      .fitnessTrainerLVL;
                  const finalUnspentSkills = await lazyStaff.unspentSkills(0);

                  assert.equal(
                      finalFitnessSkill.toString() -
                          initialFitnessSkill.toString(),
                      1,
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
                      lazyStaff.connect(attacker).updateNft(
                          tokenId,
                          {
                              marketerLVL: 0,
                              accountantLVL: 0,
                              scoutLVL: 0,
                              coachLVL: 0,
                              fitnessTrainerLVL: 5,
                          },
                          uri,
                          signature,
                      ),
                  ).to.be.revertedWithCustomError(lazyStaff, 'NotNftOwner');
              });

              it('reverts when not enough unspent skills', async () => {
                  const fakeSkills = 25;

                  await expect(
                      lazyStaff.updateNft(
                          0,
                          {
                              marketerLVL: 0,
                              accountantLVL: 0,
                              scoutLVL: 0,
                              coachLVL: 0,
                              fitnessTrainerLVL: fakeSkills,
                          },
                          uri,
                          signature,
                      ),
                  ).to.be.revertedWithCustomError(lazyStaff, 'NotEnoughSkills');
              });

              it('reverts on bad signature', async () => {
                  value.unspentSkills = 10;
                  signature = await deployer._signTypedData(
                      domain,
                      types,
                      value,
                  );

                  await expect(
                      lazyStaff.updateNft(
                          tokenId,
                          {
                              marketerLVL: 1,
                              accountantLVL: 1,
                              scoutLVL: 1,
                              coachLVL: 1,
                              fitnessTrainerLVL: 1,
                          },
                          uri,
                          signature,
                      ),
                  ).to.be.revertedWithCustomError(lazyStaff, 'BadSignature');
              });
          });
      });

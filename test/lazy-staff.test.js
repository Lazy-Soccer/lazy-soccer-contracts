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
                          medicine: 0,
                          accounting: 1,
                          scouting: 2,
                          coaching: 3,
                          physiotherapy: 4,
                      },
                      10,
                      0,
                      true,
                  );
              }
          }

          async function giveWhitelistAccess(address) {
              const adminRole = await lazyStaff.DEFAULT_ADMIN_ROLE();
              const minterRole = await lazyStaff.MINTER_ROLE();

              await lazyStaff.grantRole(adminRole, address);
              await lazyStaff.grantRole(minterRole, address);
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
                  assert.equal(nftStats.medicine.toString(), '0');
                  assert.equal(nftStats.accounting.toString(), '1');
                  assert.equal(nftStats.scouting.toString(), '2');
                  assert.equal(nftStats.coaching.toString(), '3');
                  assert.equal(nftStats.physiotherapy.toString(), '4');
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
                          { name: 'medicine', type: 'uint256' },
                          { name: 'accounting', type: 'uint256' },
                          { name: 'scouting', type: 'uint256' },
                          { name: 'coaching', type: 'uint256' },
                          { name: 'physiotherapy', type: 'uint256' },
                      ],
                  };

                  value = {
                      firstParentTokenId: 0,
                      secondParentTokenId: 1,
                      childTokenId: 2,
                      childNftIpfsHash: 'ipfs',
                      skills: {
                          medicine: 1,
                          accounting: 2,
                          scouting: 3,
                          coaching: 4,
                          physiotherapy: 5,
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
                          { name: 'medicine', type: 'uint256' },
                          { name: 'accounting', type: 'uint256' },
                          { name: 'scouting', type: 'uint256' },
                          { name: 'coaching', type: 'uint256' },
                          { name: 'physiotherapy', type: 'uint256' },
                      ],
                  };

                  value = {
                      tokenId: tokenId,
                      ipfsHash: uri,
                      skills: {
                          medicine: 1,
                          accounting: 2,
                          scouting: 3,
                          coaching: 4,
                          physiotherapy: 5,
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
                  ).physiotherapy;
                  const initialUnspentSkills = await lazyStaff.unspentSkills(
                      tokenId,
                  );

                  await expect(
                      lazyStaff.updateNft(
                          tokenId,
                          {
                              medicine: 1,
                              accounting: 1,
                              scouting: 1,
                              coaching: 1,
                              physiotherapy: 1,
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
                      .physiotherapy;
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
                              medicine: 0,
                              accounting: 0,
                              scouting: 0,
                              coaching: 0,
                              physiotherapy: 5,
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
                              medicine: 0,
                              accounting: 0,
                              scouting: 0,
                              coaching: 0,
                              physiotherapy: fakeSkills,
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
                              medicine: 1,
                              accounting: 1,
                              scouting: 1,
                              coaching: 1,
                              physiotherapy: 1,
                          },
                          uri,
                          signature,
                      ),
                  ).to.be.revertedWithCustomError(lazyStaff, 'BadSignature');
              });
          });
      });

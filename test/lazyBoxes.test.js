const { developmentChains } = require('../helper-hardhat-config');
const { network, ethers } = require('hardhat');
const { assert, expect } = require('chai');

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe('Lazy Boxes NFT unit tests', () => {
          let deployer, lazyBoxes;

          beforeEach(async () => {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];

              const LazyBoxes = await ethers.getContractFactory('LazyBoxes');
              lazyBoxes = (await LazyBoxes.deploy()).connect(deployer);
          });

          describe('minting', () => {
              it('can mint nft', async () => {
                  const tokenId = 0;

                  await lazyBoxes.safeMint(deployer.address);
                  assert.equal(
                      await lazyBoxes.ownerOf(tokenId),
                      deployer.address,
                  );
              });

              it('allows to mint only to contract owner', async () => {
                  const accounts = await ethers.getSigners();
                  attacker = accounts[1];

                  await expect(
                      lazyBoxes.connect(attacker).safeMint(attacker.address),
                  ).to.be.revertedWith('Ownable: caller is not the owner');
              });
          });

          describe('box opening', () => {
              it('burns box and emits an event', async () => {
                  const tokenId = 0;
                  await lazyBoxes.safeMint(deployer.address);

                  await expect(lazyBoxes.openBox(tokenId))
                      .to.emit(lazyBoxes, 'BoxOpened')
                      .withArgs(deployer.address, tokenId);
                  await expect(lazyBoxes.ownerOf(tokenId)).to.be.revertedWith(
                      'ERC721: invalid token ID',
                  );
              });

              it('reverts when opened by not nft owner', async () => {
                  const tokenId = 0;
                  const accounts = await ethers.getSigners();
                  attacker = accounts[1];

                  await lazyBoxes.safeMint(deployer.address);
                  await expect(
                      lazyBoxes.connect(attacker).openBox(tokenId),
                  ).to.be.revertedWith('Not NFT owner');
              });
          });
      });

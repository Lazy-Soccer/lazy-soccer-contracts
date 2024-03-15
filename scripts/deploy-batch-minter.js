const hre = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
    const nft = '0xC9efbDd62F036F149AbF840Bbc90ab7E8423CEd9';
    const args = [nft];

    const BatchMinter = await hre.ethers.getContractFactory('BatchMinter');
    const batchMinter = await BatchMinter.deploy(...args);

    await batchMinter.deployed();

    console.log('BatchMinter address: ', batchMinter.address);

    await new Promise((r) => setTimeout(r, 30000));
    await verify(batchMinter.address, args);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

const { ethers } = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
    const LazyAlpha = await ethers.getContractFactory('LazyAlpha');

    console.log('Deploying LazyAlpha...');

    const alphaNft = await LazyAlpha.deploy();
    await alphaNft.deployed();

    console.log('LazyAlpha deployed to:', alphaNft.address);

    await new Promise((r) => setTimeout(r, 10000));
    await verify(alphaNft.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

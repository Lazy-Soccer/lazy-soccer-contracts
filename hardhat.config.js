require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

const POLYGON_MAINNET_RPC_URL =
    process.env.POLYGON_MAINNET_RPC_URL || 'Your alchemy url';
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || 'Your alchemy url';
const REPORT_GAS = process.env.REPORT_GAS || false;
const POLYGONSCAN_API_KEY =
    process.env.POLYGONSCAN_API_KEY || 'Your polygonscan API key';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
    solidity: {
        compilers: [
            {
                version: '0.8.9',
            },
        ],
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
                details: { yul: false },
            },
        },
    },

    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            chainId: 31337,
            allowUnlimitedContractSize: true,
        },
        localhost: {
            chainId: 31337,
        },
        polygon: {
            url: POLYGON_MAINNET_RPC_URL,
            accounts: !!PRIVATE_KEY ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 137,
        },
        mumbai: {
            url: MUMBAI_RPC_URL,
            accounts: !!PRIVATE_KEY ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 80001,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    gasReporter: {
        currency: 'ETH',
        outputFile: `gas-report.txt`,
        enabled: REPORT_GAS,
        noColors: true,
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
    etherscan: {
        // npx hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            polygonMumbai: POLYGONSCAN_API_KEY,
            polygon: POLYGONSCAN_API_KEY,
        },
    },
};

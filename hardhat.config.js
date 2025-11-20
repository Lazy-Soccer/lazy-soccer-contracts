require('@nomicfoundation/hardhat-verify');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

//networks
const POLYGON_MAINNET_RPC_URL =
    process.env.POLYGON_MAINNET_RPC_URL || 'Your alchemy url';
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || 'Your alchemy url';
const ARBITRUM_SEPOLIA_RPC =
    process.env.ARBITRUM_SEPOLIA_RPC || 'Your arbitrum sepolia rpc url';
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || 'Your arbitrum rpc url';
const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || 'Your base sepolia rpc url';
const BASE_RPC = process.env.BASE_RPC || 'Your base rpc url';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'Your etherscan API key';

//other
const REPORT_GAS = process.env.REPORT_GAS || false;
const COINMARKETCAP_TOKEN = process.env.COINMARKETCAP_TOKEN;

//private
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
    solidity: {
        compilers: [
            {
                version: '0.8.20',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },

    defaultNetwork: 'arbitrum',
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
        arbitrumSepolia: {
            url: ARBITRUM_SEPOLIA_RPC,
            accounts: !!PRIVATE_KEY ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 421614,
        },
        arbitrum: {
            url: ARBITRUM_RPC,
            accounts: !!PRIVATE_KEY ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 42161,
        },
        baseSepolia: {
            url: BASE_SEPOLIA_RPC,
            accounts: !!PRIVATE_KEY ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 84532,
        },
        base: {
            url: BASE_RPC,
            accounts: !!PRIVATE_KEY ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 8453,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    gasReporter: {
        token: 'MATIC',
        coinmarketcap: COINMARKETCAP_TOKEN,
        outputFile: `gas-report.txt`,
        enabled: true,
        noColors: true,
        gasPriceApi:
            'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
        currency: 'USD',
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
    etherscan: {
        enabled: true,
        // npx hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: ETHERSCAN_API_KEY,

        customChains: [
            {
                network: 'baseSepolia',
                chainId: 84532,
                urls: {
                    apiURL: 'https://api.etherscan.io/v2/api',
                    browserURL: 'https://sepolia.basescan.org',
                },
            },
            {
                network: 'base',
                chainId: 8453,
                urls: {
                    apiURL: 'https://api.etherscan.io/v2/api',
                    browserURL: 'https://basescan.org',
                },
            },
        ],
    },
};

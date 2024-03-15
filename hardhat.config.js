require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

//networks
const POLYGON_MAINNET_RPC_URL =
    process.env.POLYGON_MAINNET_RPC_URL || 'Your alchemy url';
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || 'Your alchemy url';
const POLYGONSCAN_API_KEY =
    process.env.POLYGONSCAN_API_KEY || 'Your polygonscan API key';
const ARBITRUM_SEPOLIA_RPC = process.env.ARBITRUM_SEPOLIA_RPC || 'Your arbitrum sepolia rpc url';
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || 'Your arbiscan API key';

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
        arbitrumSepolia: {
            url: ARBITRUM_SEPOLIA_RPC,
            accounts: !!PRIVATE_KEY ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 421614,
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
        // npx hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            polygonMumbai: POLYGONSCAN_API_KEY,
            polygon: POLYGONSCAN_API_KEY,
            arbitrumSepolia: ARBISCAN_API_KEY,
        },

        customChains: [
            {
                network: "arbitrumSepolia",
                chainId: 421614,
                urls: {
                    apiURL: "https://api-sepolia.arbiscan.io/api",
                    browserURL: "https://sepolia.arbiscan.io"
                }
            }
        ]
    },
};

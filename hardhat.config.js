require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers")
require("@nomicfoundation/hardhat-chai-matchers")
require("hardhat-gas-reporter");
require('hardhat-deploy');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      chainId: 31337,
    }
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'EUR',
    gasPrice: 30
  }
};
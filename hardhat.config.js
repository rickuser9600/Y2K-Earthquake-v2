require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require('dotenv').config()


task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      forking: {
        // enabled: true,
        url: "https://arb1.arbitrum.io/rpc",
        blockNumber: 104864494
      }
    },
    // testnet: {
    //   url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    //   chainId: 97,
    //   gasPrice: "auto",
    //   accounts: {mnemonic: process.env.SECRET_KEY}
    // },
    // mainnet: {
    //   url: "https://bsc-dataseed.binance.org/",
    //   chainId: 56,
    //   gasPrice: 20000000000,
    //   accounts: {mnemonic: process.env.SECRET_KEY}
    // }
  },
  // etherscan: {
  //   // Your API key for Etherscan
  //   // Obtain one at https://bscscan.com/
  //   apiKey: process.env.apiKey 
  // },
  solidity: {
    compilers: [
      {
        version: "0.8.18",
      },
      {
        version: "0.8.17",
        settings: {},
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999
      }
    }
  },
  // paths: {
  //   sources: "./contracts",
  //   tests: "./test",
  //   cache: "./cache",
  //   artifacts: "./artifacts"
  // },
  // mocha: {
  //   timeout: 20000
  // }
};

const { ethers } = require("hardhat");

const networkConfig = {
  31337: {
    name: "hardhat",
    initialSupply: ethers.parseEther("50"),
  },
  11155111: {
    name: "sepolia",
    initialSupply: ethers.parseEther("50"),
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};

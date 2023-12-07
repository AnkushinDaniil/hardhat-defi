const { getNamedAccounts, network, ethers } = require("hardhat")
const { getWeth } = require("../scripts/getWeth")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const pool = await getPool(deployer)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
async function getPool(account) {
    const poolAddressesProvider = await ethers.getContractAt(
        "IPoolAddressesProvider",
        networkConfig[network.config.chainId].poolAddressesProvider,
        account.address,
    )
    const poolAddress = await poolAddressesProvider.getPool()
    console.log(`Pool address is ${poolAddress}`)
    const pool = await ethers.getContractAt(
        "IPool",
        poolAddress,
        account.address,
    )
    return pool
}

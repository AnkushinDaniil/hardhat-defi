const { ethers, network } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

const AMOUNT = ethers.parseEther("0.02")
const CHAIN_ID = network.config.chainId

async function getWeth() {
    // const { deployer } = await getNamedAccounts()
    const [deployer] = await ethers.getSigners()
    const iWeth = await ethers.getContractAt(
        "IWeth",
        networkConfig[network.config.chainId].wethToken,
        deployer,
    )
    let blocksToMine = CHAIN_ID == 31337 ? 1 : 3
    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait(blocksToMine)
    const wethBalance = await iWeth.balanceOf(deployer)

    console.log(
        `${ethers.formatUnits(wethBalance, "ether")} WETH was minted by ${
            deployer.address
        }`,
    )
}

module.exports = { getWeth, AMOUNT }

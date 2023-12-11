const { getNamedAccounts, network, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")
const { networkConfig } = require("../helper-hardhat-config")

const CHAIN_ID = network.config.chainId

async function main() {
    await getWeth()
    // const { deployer } = await getNamedAccounts()
    const [deployer] = await ethers.getSigners()
    const { pool, poolAddress, poolAddressesProvider } = await getPool(deployer)

    // Deposit
    const wethToken = networkConfig[CHAIN_ID].wethToken
    await approveERC20(wethToken, poolAddress, AMOUNT, deployer)
    // approve
    await pool.deposit(wethToken, AMOUNT, deployer, 0)
    console.log(
        `Deposited ${ethers.formatUnits(
            AMOUNT,
            "ether",
        )} ETH to ${wethToken} by ${deployer.address}`,
    )

    // Borrowing
    let { totalCollateralBase, availableBorrowsBase, totalDebtBase } =
        await getBorrowUserData(pool, deployer)

    const [, , networkBaseTokenPriceInUsd, ,] = await getBaseCurrencyInfo(
        poolAddressesProvider,
        deployer,
    )

    console.log(
        `${deployer.address} has ${ethers.formatEther(
            baseCurrencyToEth(totalCollateralBase, networkBaseTokenPriceInUsd),
        )} worth of ETH deposited.`,
    )
    console.log(
        `${deployer.address} has ${ethers.formatEther(
            baseCurrencyToEth(totalDebtBase, networkBaseTokenPriceInUsd),
        )} worth of ETH borrowed.`,
    )
    console.log(
        `${deployer.address} can borrow ${ethers.formatEther(
            baseCurrencyToEth(availableBorrowsBase, networkBaseTokenPriceInUsd),
        )} worth of ETH.`,
    )
}

async function getPool(account) {
    const poolAddressesProvider = await ethers.getContractAt(
        "IPoolAddressesProvider",
        networkConfig[CHAIN_ID].poolAddressesProvider,
        account,
    )
    const poolAddress = await poolAddressesProvider.getPool()
    console.log(`Pool address is ${poolAddress}`)
    const pool = await ethers.getContractAt("IPool", poolAddress, account)
    return { pool, poolAddress, poolAddressesProvider }
}

async function approveERC20(
    erc20Address,
    senderAddress,
    amountToSpend,
    account,
) {
    const erc20token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        account,
    )
    //   function approve(address spender, uint256 amount) external returns (bool);
    const tx = await erc20token.approve(senderAddress, amountToSpend)
    await tx.wait(1)
    console.log(
        `${
            account.address
        } approved ${senderAddress} to spend ${ethers.formatUnits(
            amountToSpend,
            "ether",
        )} ETH`,
    )
}

async function getBorrowUserData(pool, account) {
    const { totalCollateralBase, totalDebtBase, availableBorrowsBase } =
        await pool.getUserAccountData(account)
    return { totalCollateralBase, availableBorrowsBase, totalDebtBase }
}

async function getBaseCurrencyInfo(poolAddresesProvuder, account) {
    const uiPoolDataProviderV3 = await ethers.getContractAt(
        "IUiPoolDataProviderV3",
        networkConfig[CHAIN_ID].uiPoolDataProviderV3,
        account,
    )
    const baseCurrencyInfo = (
        await uiPoolDataProviderV3.getReservesData(poolAddresesProvuder)
    )[1]
    return baseCurrencyInfo
}

function baseCurrencyToEth(baseCurrency, networkBaseTokenPriceInUsd) {
    return (ethers.parseEther("1") * baseCurrency) / networkBaseTokenPriceInUsd
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

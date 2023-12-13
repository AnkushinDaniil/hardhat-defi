const { getNamedAccounts, network, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")
const { networkConfig } = require("../helper-hardhat-config")

const CHAIN_ID = network.config.chainId
let daiPrice, ethPrice, blocksToMine

async function main() {
    daiPrice = Number(await getDaiPrice())
    ethPrice = Number(await getEthPrice())

    // const { deployer } = await getNamedAccounts()
    const [deployer] = await ethers.getSigners()
    const pool = await getPool(deployer)
    const poolAddress = await pool.getAddress()
    blocksToMine = CHAIN_ID == 31337 ? 1 : 3

    await getWeth()

    // Approve
    const wethTokenAddress = networkConfig[CHAIN_ID].wethToken
    await approveErc20(wethTokenAddress, poolAddress, AMOUNT, deployer)

    // From interface: supply(address,uint256,address,uint16)
    const tx = await pool.supply(wethTokenAddress, AMOUNT, deployer, 0)
    tx.wait(blocksToMine)

    console.log(
        `Deposited ${ethers.formatUnits(
            AMOUNT,
            "ether",
        )} ETH to ${wethTokenAddress} by ${deployer.address}`,
    )

    // Borrowing
    let { totalCollateralBase, availableBorrowsBase, totalDebtBase } =
        await getBorrowUserData(pool, deployer)

    const amountDaiToBorrow = usdToDai(availableBorrowsBase) * 0.95
    console.log(`Available amount to borrow is ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString())

    const daiTokenAddress = networkConfig[CHAIN_ID].daiToken
    const isStableRateEnabled = await getReserveData(pool, daiTokenAddress)

    await borrowDai(
        daiTokenAddress,
        pool,
        amountDaiToBorrowWei,
        deployer,
        isStableRateEnabled,
    )

    await getBorrowUserData(pool, deployer)
}

/**
 *
 * @param {signer} account interacts with poolAddressesProvider and pool
 * @returns pool
 */
async function getPool(account) {
    const poolAddressesProvider = await ethers.getContractAt(
        "IPoolAddressesProvider",
        networkConfig[CHAIN_ID].poolAddressesProvider,
        account,
    )
    const poolAddress = await poolAddressesProvider.getPool()
    console.log(`Pool address is ${poolAddress}`)
    const pool = await ethers.getContractAt("IPool", poolAddress, account)
    return pool
}

/**
 *
 * @param {string} contractAddress - ERC20 token address
 * @param {string} spenderAddress - address that get allowance to spend
 * @param {BigInt} amountToSpend
 * @param {string} account interacts with contracts
 */
async function approveErc20(
    contractAddress,
    spenderAddress,
    amountToSpend,
    account,
) {
    const ecr20Token = await ethers.getContractAt(
        "IERC20",
        contractAddress,
        account,
    )
    const tx = await ecr20Token.approve(spenderAddress, amountToSpend)
    tx.wait(blocksToMine)
    console.log(
        `${
            account.address
        } approved ${spenderAddress} to spend ${ethers.formatUnits(
            amountToSpend,
            "ether",
        )} ETH`,
    )
    console.log(
        `allowance(deployer, spender) = ${ethers.formatUnits(
            await ecr20Token.allowance(account, spenderAddress),
        )} ETH`,
    )
}

/**
 *
 * @param {contracrt} pool
 * @param {string} account interacts with pool
 * @returns
 */
async function getBorrowUserData(pool, account) {
    const { totalCollateralBase, totalDebtBase, availableBorrowsBase } =
        await pool.getUserAccountData(account)
    console.log(`${account.address}`)
    console.log(`has ${usdToEth(totalCollateralBase)} worth of Eth deposited.`)
    console.log(`has ${usdToDai(totalDebtBase)} worth of DAI borrowed.`)
    console.log(`can borrow ${usdToDai(availableBorrowsBase)} worth of DAI.`)

    return { totalCollateralBase, availableBorrowsBase, totalDebtBase }
}

/**
 *
 * @returns {Number} price - DAI price in USD
 */
async function getDaiPrice() {
    const usdDaiPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[CHAIN_ID].usdDaiPriceFeed,
    )
    const price = (await usdDaiPriceFeed.latestRoundData())[1]
    console.log(`The DAI/USD price is ${price.toString()}`)
    return price
}

/**
 *
 * @returns {Number} price - ETH price in USD
 */
async function getEthPrice() {
    const usdEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[CHAIN_ID].usdEthPriceFeed,
    )
    const price = (await usdEthPriceFeed.latestRoundData())[1]
    console.log(`The ETH/USD price is ${price.toString()}`)
    return price
}

/**
 *
 * @param {string} daiAddress
 * @param {contract} pool
 * @param {BigInt} amountDaiToBorrowWei
 * @param {string} account
 * @param {bool} isStableRateEnabled
 */
async function borrowDai(
    daiAddress,
    pool,
    amountDaiToBorrowWei,
    account,
    isStableRateEnabled,
) {
    const tx = await pool.borrow(
        daiAddress,
        amountDaiToBorrowWei,
        2 - isStableRateEnabled,
        0,
        account,
    )
    await tx.wait(1)
    console.log(
        `${account.address} has borrowed ${ethers.formatEther(
            amountDaiToBorrowWei,
        )} DAI`,
    )
}

/**
 *
 * @param {BigInt} usd
 * @returns {Number} dai
 */
function usdToDai(usd) {
    const dai = Number(usd) / daiPrice
    return dai
}

/**
 *
 * @param {BigInt} usd
 * @returns {Number} eth
 */
function usdToEth(usd) {
    const eth = Number(usd) / ethPrice
    return eth
}

/**
 *
 * @param {contract} pool
 * @param {string} daiAddress
 * @returns {Number} isStableRateEnabled in form of number
 */
async function getReserveData(pool, daiAddress) {
    const { configuration } = await pool.getReserveData(daiAddress)

    const reserveData = BigInt(configuration.toString())
    // console.log(reserveData)

    // Create a bit mask to isolate the 59th bit of the configuration data
    // Bitwise shift BigInt(1) 59 places to the left
    const bitMask = BigInt(1) << BigInt(59)
    // console.log(bitMask.toString())

    // Use the bitwise AND operator (&) with reserveData and bitMask to isolate the 59th bit
    // Then, shift the result 59 places to the right to get the value of the 59th bit
    const bit59Value = (reserveData & bitMask) >> BigInt(59)

    return Number(bit59Value)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

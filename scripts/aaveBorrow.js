/**
 * aaveBorrow script allows to borrow and repay required amound of DAI
 */
const { network, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")
const { networkConfig } = require("../helper-hardhat-config")

const CHAIN_ID = network.config.chainId
const blocksToMine = CHAIN_ID == 31337 ? 1 : 3
let daiPrice, ethPrice, mode

async function main() {
    daiPrice = await getDaiPrice()
    ethPrice = await getEthPrice()

    // const { deployer } = await getNamedAccounts()
    const [deployer] = await ethers.getSigners()
    const pool = await getPool(deployer)
    const poolAddress = await pool.getAddress()

    await getWeth()

    // Approve
    const wethTokenAddress = networkConfig[CHAIN_ID].wethToken
    await approveErc20(wethTokenAddress, poolAddress, AMOUNT, deployer)
    console.log("-------------------------------------------------------------")

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
    let availableBorrowsBase, totalDebtBase
    ;({ availableBorrowsBase, totalDebtBase } = await getBorrowUserData(
        pool,
        deployer,
    ))

    const amountDaiToBorrow = usdToDai(availableBorrowsBase) * 0.95
    console.log(`Available amount to borrow is ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString())

    const daiTokenAddress = networkConfig[CHAIN_ID].daiToken
    const isStableRateEnabled = await getReserveData(pool, daiTokenAddress)
    mode = 2 - isStableRateEnabled

    await borrowDai(daiTokenAddress, pool, amountDaiToBorrowWei, deployer, mode)
    console.log("-------------------------------------------------------------")
    ;({ availableBorrowsBase, totalDebtBase } = await getBorrowUserData(
        pool,
        deployer,
    ))
    console.log("-------------------------------------------------------------")
    await repay(
        deployer,
        ethers.parseEther(
            usdToDai(totalDebtBase).toString(),
        ) /*ethers.parseEther(amountDaiToBorrow.toString()),*/,
        pool,
        poolAddress,
        daiTokenAddress,
        mode,
    )
    // ;({ availableBorrowsBase, totalDebtBase } =
    //     await getBorrowUserData(pool, deployer))

    // if (totalDebtBase > 0) {
    //     await getWeth()
    //     await swap(
    //         wethTokenAddress,
    //         daiTokenAddress,
    //         totalDebtBase,
    //         AMOUNT,
    //         deployer,
    //     )
    //     console.log(
    //         "-------------------------------------------------------------",
    //     )
    //     await repay(
    //         deployer,
    //         totalDebtBase,
    //         pool,
    //         poolAddress,
    //         daiTokenAddress,
    //         mode,
    //     )
    //     await getBorrowUserData(pool, deployer)
    // }
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
    // console.log(
    //     `${
    //         account.address
    //     } approved ${spenderAddress} to spend ${ethers.formatUnits(
    //         amountToSpend,
    //         "ether",
    //     )} ETH`,
    // )
    console.log(
        `allowance(${
            account.address
        }, ${spenderAddress}) = ${ethers.formatUnits(
            await ecr20Token.allowance(account, spenderAddress),
        )}`,
    )
}

/**
 *
 * @param {contracrt} pool
 * @param {string} account interacts with pool
 * @returns
 */
async function getBorrowUserData(pool, account) {
    const { totalDebtBase, availableBorrowsBase } =
        await pool.getUserAccountData(account)
    console.log(`${account.address}`)
    console.log(`has ${usdToEth(totalCollateralBase)} worth of Eth deposited.`)
    console.log(`has ${usdToDai(totalDebtBase)} worth of DAI borrowed.`)
    console.log(`can borrow ${usdToDai(availableBorrowsBase)} worth of DAI.`)

    return { availableBorrowsBase, totalDebtBase }
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
 * @param {Number} mode
 */
async function borrowDai(
    daiAddress,
    pool,
    amountDaiToBorrowWei,
    account,
    mode,
) {
    const tx = await pool.borrow(
        daiAddress,
        amountDaiToBorrowWei,
        mode,
        0,
        account,
    )
    await tx.wait(blocksToMine)
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
    const dai = Number(usd) / Number(daiPrice)
    return dai
}

/**
 *
 * @param {BigInt} usd
 * @returns {Number} eth
 */
function usdToEth(usd) {
    const eth = Number(usd) / Number(ethPrice)
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

    // Create a bit mask to isolate the 59th bit of the configuration data
    // Bitwise shift BigInt(1) 59 places to the left
    const bitMask = BigInt(1) << BigInt(59)

    // Use the bitwise AND operator (&) with reserveData and bitMask to isolate the 59th bit
    // Then, shift the result 59 places to the right to get the value of the 59th bit
    const bit59Value = (reserveData & bitMask) >> BigInt(59)

    return Number(bit59Value)
}

// function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)
async function repay(account, amount, pool, poolAddress, daiAddress, mode) {
    await approveErc20(daiAddress, poolAddress, amount, account)
    const tx = await pool.repay(daiAddress, amount, mode, account)
    await tx.wait(blocksToMine)
}

/**
 *
 * @param {address} inputTokenAddress - address of a token, that you want to spend
 * @param {address} outputTokenAddress - address of a token, that you want to get
 * @param {BigInt} amountOut - amount of token, that you want to get
 * @param {BigInt} amountInMaximum - maximum amount of token, that you want to spend
 * @param {address} account interacts with a contract
 */
async function swap(
    inputTokenAddress,
    outputTokenAddress,
    amountOut,
    amountInMaximum,
    account,
) {
    const swapRouter = await ethers.getContractAt(
        "ISwapRouter",
        networkConfig[CHAIN_ID].uniswapV3Router,
        account,
    )
    const swapRouterAddress = await swapRouter.getAddress()

    await approveErc20(
        inputTokenAddress,
        swapRouterAddress,
        amountInMaximum,
        account,
    )
    const currentTimestamp = (await ethers.provider.getBlock("latest"))
        .timestamp

    const exactOutputSingleParams = {
        tokenIn: inputTokenAddress,
        tokenOut: outputTokenAddress,
        fee: networkConfig[CHAIN_ID].poolFee,
        recipient: account,
        deadline: currentTimestamp + 1800,
        amountOut: amountOut,
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0,
    }

    const amountIn = await swapRouter.exactOutputSingle(exactOutputSingleParams)
    // console.log(`Swap: amountIn = ${amountIn.toString()}`)
    console.log(`Swap: amountOut = ${amountOut.toString()}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

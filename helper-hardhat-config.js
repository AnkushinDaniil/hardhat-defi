const networkConfig = {
    31337: {
        name: "hardhat",
        wethToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        aWETH: "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8",
        poolAddressesProvider: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
        daiEthPriceFeed: "0x773616E4d11A78F511299002da57A0a94577F1f4",
        usdDaiPriceFeed: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
        usdEthPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
        daiToken: "0x6b175474e89094c44da98b954eedeac495271d0f",
        uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        wrappedTokenGateway: "0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C",
        poolFee: 3000,
    },
    // 11155111: {
    //     name: "sepolia",
    //     wethToken: "0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92",
    //     PoolAddressesProvider: "0x0496275d34753A48320CA58103d5220d394FF77F",
    //     daiUsdPriceFeed: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19",
    //     ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    //     daiToken: "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    //     uniswapV3Router: "",
    //     poolFee: 3000,
    // },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}

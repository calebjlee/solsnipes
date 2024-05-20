const { start } = require('./index'); // Ensure index file is in the same directory
const axios = require('axios');

async function getMintAddress(tokenSymbol) {
    try {
        const response = await axios.get(`https://api.dexscreener.io/latest/dex/search?q=${tokenSymbol}`);

        // Adjust the path based on the actual structure of the API response
        const mintAddress = response.data.pairs[0].baseToken.address;
        console.log("Success! mint address is: ", mintAddress);
        return mintAddress;
        
        // return mintAddress.pairAddress;
    } catch (error) {
        console.error('Error fetching mint address:', error);
        throw error;
    }
}

async function runTrader(tokenSymbol) {
    const mintAddress = await getMintAddress(tokenSymbol);
    console.log(`The mint address for $${tokenSymbol} is ${mintAddress}`);
    start(mintAddress);
}

module.exports = { runTrader };

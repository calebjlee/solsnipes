import { LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { ArbBot, SwapToken } from './bot';
import * as dotenv from "dotenv";

dotenv.config({
    path: ".env",
});

const defaultConfig = {
    solanaEndpoint: clusterApiUrl("mainnet-beta"),
    jupiter: "https://public.jupiterapi.com",
};

async function start(initialAltMint: string) {
    if (!process.env.SECRET_KEY) {
        throw new Error("SECRET_KEY environment variable not set");
    }
    let decodedSecretKey = Uint8Array.from(JSON.parse(process.env.SECRET_KEY));

    console.log(initialAltMint);

    const bot = new ArbBot({
        solanaEndpoint: process.env.SOLANA_ENDPOINT ?? defaultConfig.solanaEndpoint,
        metisEndpoint: process.env.METIS_ENDPOINT ?? defaultConfig.jupiter,
        secretKey: decodedSecretKey,
        firstTradePrice: 0 * LAMPORTS_PER_SOL,
        targetGainPercentage: 20, //Adjust this to how much profit we want to take i. e. 50 = 50% profit
        initialInputToken: SwapToken.SOL,
        initialInputAmount: 0.005 * LAMPORTS_PER_SOL, // Adjust this to how much sol we want to initially invest. 0.005 = 0.005 SOL
        initialAltMint: new PublicKey(initialAltMint),
        
    });
    await bot.init();

}

export { start };
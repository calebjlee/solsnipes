import { Keypair, Connection, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL, TransactionInstruction, AddressLookupTableAccount, TransactionMessage, Transaction } from "@solana/web3.js";
import { createJupiterApiClient, DefaultApi, ResponseError, QuoteGetRequest, QuoteResponse, Instruction, AccountMeta } from '@jup-ag/api';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, getMint, getAccount, } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

interface LogSwapArgs {
    inputToken: string;
    inAmount: string;
    outputToken: string;
    outAmount: string;
    txId: string;
    timestamp: string;
}

interface ArbBotConfig {
    solanaEndpoint: string; // e.g., "https://ex-am-ple.solana-mainnet.quiknode.pro/123456/"
    metisEndpoint: string;  // e.g., "https://jupiter-swap-api.quiknode.pro/123456/"
    secretKey: Uint8Array;
    firstTradePrice: number; // e.g. 94 USDC/SOL
    targetGainPercentage?: number;
    checkInterval?: number;
    initialInputToken: SwapToken;
    initialInputAmount: number;
    initialAltMint: PublicKey;
}

interface NextTrade extends QuoteGetRequest {
    nextTradeThreshold: number;
}

export enum SwapToken {
    SOL,
    ALT
}

export class ArbBot {
    private solanaConnection: Connection;
    private jupiterApi: DefaultApi;
    private wallet: Keypair;
    private solMint: PublicKey = new PublicKey("So11111111111111111111111111111111111111112");
    private initialAltMint: PublicKey;
    private altTokenAccount: PublicKey;
    private solBalance: number = 0;
    private altBalance: number = 0;
    private checkInterval: number = 1000; 
    private lastCheck: number = 0;
    private priceWatchIntervalId?: NodeJS.Timeout;
    private targetGainPercentage: number = 1;
    private nextTrade: NextTrade;
    private initialPrice: number = 0;
    private waitingForConfirmation: boolean = false;
    private startTime: number = 0;

    constructor(config: ArbBotConfig) {
        const { 
            solanaEndpoint, 
            metisEndpoint, 
            secretKey, 
            targetGainPercentage,
            checkInterval,
            initialInputToken,
            initialInputAmount,
            initialAltMint,
            firstTradePrice
        } = config;
        this.solanaConnection = new Connection(solanaEndpoint);
        this.jupiterApi = createJupiterApiClient({ basePath: metisEndpoint });
        this.wallet = Keypair.fromSecretKey(secretKey);
        this.altTokenAccount = getAssociatedTokenAddressSync(initialAltMint, this.wallet.publicKey);
        this.initialAltMint = initialAltMint;
        if (targetGainPercentage) { this.targetGainPercentage = targetGainPercentage }
        if (checkInterval) { this.checkInterval = checkInterval }
        this.nextTrade = {
            inputMint: initialInputToken === SwapToken.SOL ? this.solMint.toBase58() : initialAltMint.toBase58(),
            outputMint: initialInputToken === SwapToken.SOL ? initialAltMint.toBase58() : this.solMint.toBase58(),
            amount: initialInputAmount,
            nextTradeThreshold: firstTradePrice,
        };
    }

    async init(): Promise<void> {
        console.log(`🤖 Initiating arb bot for wallet: ${this.wallet.publicKey.toBase58()}.`)
        await this.refreshBalances();
        console.log(`🏦 Current balances:\nSOL: ${this.solBalance / LAMPORTS_PER_SOL},\nALT: ${this.altBalance}`);
        await this.firstTrade();
        this.startTime = Date.now();
        await this.setInitialPrice();
        this.initiatePriceWatch();
    }

    private async firstTrade(): Promise<void> {
        try {
            if (this.waitingForConfirmation) {
                return;
            }
            const quote = await this.getQuote(this.nextTrade);
            await this.executeTrade(quote);
        } catch (error) {
            console.error('Error getting quote:', error);
        }
    }

    private async setInitialPrice(): Promise<void> {
        try {
            const quote = await this.getQuote(this.nextTrade);
            this.initialPrice = parseInt(quote.outAmount);
            console.log("Initial price set to: ", this.initialPrice);
            this.nextTrade.nextTradeThreshold = this.initialPrice * (1 + this.targetGainPercentage / 100);
            console.log("Next trade threshold set to: ", this.nextTrade.nextTradeThreshold);
        } catch (error) {
            console.error('Error getting quote:', error);
        }
    }

    private initiatePriceWatch(): void {
        this.priceWatchIntervalId = setInterval(async () => {
            const currentTime = Date.now();
            if (currentTime - this.lastCheck >= this.checkInterval) {
                this.lastCheck = currentTime;
                try {
                    if (this.waitingForConfirmation) {
                        return;
                    }
                    const quote = await this.getQuote(this.nextTrade);
                    this.evaluateQuoteAndSwap(quote);
                } catch (error) {
                    console.error('Error getting quote:', error);
                }
            }
        }, this.checkInterval) as NodeJS.Timeout;
    }

    private async executeTrade(quote: QuoteResponse): Promise<void> {
        console.log(`📊 Current price: ${quote.outAmount}`);
        try {
            this.waitingForConfirmation = true;
            this.executeSwap(quote, this.nextTrade.amount);
        } catch (error) {
            console.error('Error executing swap:', error);
        }
    }

    private async getQuote(quoteRequest: QuoteGetRequest): Promise<QuoteResponse> {
        try {
            const quote: QuoteResponse | null = await this.jupiterApi.quoteGet(quoteRequest);
            if (!quote) {
                throw new Error('No quote found');
            }
            return quote;
        } catch (error) {
            if (error instanceof ResponseError) {
                console.log(await error.response.json());
            }
            else {
                console.error(error);
            }
            throw new Error('Unable to find quote');
        }
    }

    
    private async getTokenDecimals(mintAddress: string): Promise<number> {
        const mintPublicKey = new PublicKey(mintAddress);
        const mintInfo = await getMint(this.solanaConnection, mintPublicKey);
        return mintInfo.decimals;
    }

    private async evaluateQuoteAndSwap(quote: QuoteResponse): Promise<void> {
        let difference = (parseInt(quote.outAmount) - this.nextTrade.nextTradeThreshold) / this.nextTrade.nextTradeThreshold;
        console.log(`📈 Current price: ${quote.outAmount} is ${difference > 0 ? 'higher' : 'lower'
            } than the next trade threshold: ${this.nextTrade.nextTradeThreshold} by ${Math.abs(difference * 100).toFixed(2)}%.`);
        const curTime = Date.now();
        // We will wait 75 seconds before executing stop loss
        const timeBeforeExecuting = 75000;
        if (parseInt(quote.outAmount) > this.nextTrade.nextTradeThreshold || ((parseInt(quote.outAmount) < this.initialPrice) && curTime - this.startTime > timeBeforeExecuting)) {
            try {
                this.waitingForConfirmation = true;
                await this.refreshBalances();
                await this.executeSwap(quote, this.altBalance * Math.pow(10, await this.getTokenDecimals(this.initialAltMint.toBase58())));
                this.terminateSession("Successfully Swapped!");
            } catch (error) {
                console.error('Error executing swap:', error);
            }
        }
    }

    private async executeSwap(route: QuoteResponse, customAmount: number): Promise<void> {
        try {
            // Round customAmount to the nearest integer and ensure it's positive
            const roundedAmount = Math.round(customAmount);
            if (!Number.isInteger(roundedAmount) || roundedAmount <= 0) {
                throw new Error('Invalid custom amount');
            }

            // Convert the rounded amount to string and assign to route
            route.inAmount = roundedAmount.toString();

            console.log(`Executing swap with amount: ${route.inAmount}`);

            const inputMint = new PublicKey(route.inputMint);
            const outputMint = new PublicKey(route.outputMint);

            // Ensure the associated token account for the output mint exists
            await this.createTokenAccountIfMissing(this.wallet.publicKey, outputMint);

            let inputTokenBalance = 0;

            if (inputMint.equals(this.solMint)) {
                const solBalance = await this.getSolBalance(this.wallet.publicKey);
                console.log(`SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

                if (solBalance < roundedAmount) {
                    console.error(`Insufficient SOL for the swap. Required: ${roundedAmount}, Available: ${solBalance}`);
                    throw new Error(`Insufficient SOL for the swap. Required: ${roundedAmount}, Available: ${solBalance}`);
                }

                inputTokenBalance = solBalance;
            } else {
                const inputTokenAccount = await this.getAssociatedTokenAccount(this.wallet.publicKey, inputMint);
                inputTokenBalance = await this.getTokenBalance(inputTokenAccount);

                console.log(`Input Token Balance for mint ${inputMint.toBase58()}: ${inputTokenBalance}`);

                if (inputTokenBalance < roundedAmount) {
                    console.error(`Insufficient funds for the swap. Required: ${roundedAmount}, Available: ${inputTokenBalance}`);
                    throw new Error(`Insufficient funds for the swap. Required: ${roundedAmount}, Available: ${inputTokenBalance}`);
                }
            }

            // Log input and output details
            console.log(`Input Mint: ${inputMint.toBase58()}`);
            console.log(`Output Mint: ${outputMint.toBase58()}`);
            console.log(`Input Token Balance: ${inputTokenBalance}`);
            console.log(`Rounded Amount: ${roundedAmount}`);

            const {
                computeBudgetInstructions,
                setupInstructions,
                swapInstruction,
                cleanupInstruction,
                addressLookupTableAddresses,
            } = await this.jupiterApi.swapInstructionsPost({
                swapRequest: {
                    quoteResponse: route,
                    userPublicKey: this.wallet.publicKey.toBase58(),
                    prioritizationFeeLamports: 'auto',
                },
            });

            const instructions: TransactionInstruction[] = [
                ...computeBudgetInstructions.map(this.instructionDataToTransactionInstruction),
                ...setupInstructions.map(this.instructionDataToTransactionInstruction),
                this.instructionDataToTransactionInstruction(swapInstruction),
                this.instructionDataToTransactionInstruction(cleanupInstruction),
            ].filter((ix) => ix !== null) as TransactionInstruction[];

            const addressLookupTableAccounts = await this.getAddressLookupTableAccounts(
                addressLookupTableAddresses,
                this.solanaConnection
            );

            const { blockhash, lastValidBlockHeight } = await this.solanaConnection.getLatestBlockhash();

            const messageV0 = new TransactionMessage({
                payerKey: this.wallet.publicKey,
                recentBlockhash: blockhash,
                instructions,
            }).compileToV0Message(addressLookupTableAccounts);

            const transaction = new VersionedTransaction(messageV0);
            transaction.sign([this.wallet]);

            const rawTransaction = transaction.serialize();
            const txid = await this.solanaConnection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 2,
            });

            const confirmation = await this.solanaConnection.confirmTransaction(
                { signature: txid, blockhash, lastValidBlockHeight },
                'confirmed'
            );
            if (confirmation.value.err) {
                console.error('Transaction confirmation error:', confirmation.value.err);
                throw new Error(`Transaction failed with error: ${JSON.stringify(confirmation.value.err)}`);
            }

            await this.postTransactionProcessing(route, txid);
        } catch (error) {
            if (error instanceof ResponseError) {
                console.error('Response error:', await error.response.json());
            } else if (error instanceof Error) {
                if (error.message.includes('Invalid custom amount')) {
                    console.error('Custom amount error:', error.message);
                } else if (error.message.includes('Transaction failed')) {
                    console.error('Transaction execution error:', error.message);
                    if (error.message.includes('6018')) {
                        console.error('Custom error 6018: Insufficient funds for the swap');
                    }
                } else {
                    console.error('Error during swap execution:', error);
                }
            } else {
                console.error('Unexpected error:', error);
            }
            throw new Error('Unable to execute swap');
        } finally {
            this.waitingForConfirmation = false;
        }
    }

    private async createTokenAccountIfMissing(walletPublicKey: PublicKey, mint: PublicKey): Promise<void> {
        const tokenAccount = await this.getAssociatedTokenAccount(walletPublicKey, mint);
        const tokenAccountInfo = await this.solanaConnection.getParsedAccountInfo(tokenAccount);

        if (!tokenAccountInfo.value) {
            console.log(`Creating associated token account for mint ${mint.toBase58()}`);
            const transaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    walletPublicKey,
                    tokenAccount,
                    walletPublicKey,
                    mint,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );
            await this.sendTransaction(transaction);
        } else {
            console.log(`Associated token account already exists for mint ${mint.toBase58()}`);
        }
    }

    private async sendTransaction(transaction: Transaction): Promise<void> {
        const { blockhash } = await this.solanaConnection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.wallet.publicKey;

        transaction.sign(this.wallet);
        const signature = await this.solanaConnection.sendRawTransaction(transaction.serialize());

        await this.solanaConnection.confirmTransaction(signature, 'singleGossip');
    }

    private async getSolBalance(walletPublicKey: PublicKey): Promise<number> {
        return await this.solanaConnection.getBalance(walletPublicKey);
    }

    private async getAssociatedTokenAccount(walletPublicKey: PublicKey, mint: PublicKey): Promise<PublicKey> {
        return getAssociatedTokenAddressSync(mint, walletPublicKey);
    }

    private async getTokenBalance(tokenAccount: PublicKey): Promise<number> {
        try {
            const tokenAccountInfo = await getAccount(this.solanaConnection, tokenAccount);
            return Number(tokenAccountInfo.amount); // Adjust if you need decimals based on token type
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return 0;
        }
    }

    private instructionDataToTransactionInstruction(instruction: Instruction | undefined) {
        if (instruction === null || instruction === undefined) return null;
        return new TransactionInstruction({
            programId: new PublicKey(instruction.programId),
            keys: instruction.accounts.map((key: AccountMeta) => ({
                pubkey: new PublicKey(key.pubkey),
                isSigner: key.isSigner,
                isWritable: key.isWritable,
            })),
            data: Buffer.from(instruction.data, 'base64'),
        });
    }

    private async getAddressLookupTableAccounts(keys: string[], connection: Connection): Promise<AddressLookupTableAccount[]> {
        const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
            keys.map((key) => new PublicKey(key))
        );

        return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
            const addressLookupTableAddress = keys[index];
            if (accountInfo) {
                const addressLookupTableAccount = new AddressLookupTableAccount({
                    key: new PublicKey(addressLookupTableAddress),
                    state: AddressLookupTableAccount.deserialize(accountInfo.data),
                });
                acc.push(addressLookupTableAccount);
            }

            return acc;
        }, new Array<AddressLookupTableAccount>());
    }

    private async postTransactionProcessing(route: QuoteResponse, txid: string): Promise<void> {
        const { inputMint, inAmount, outputMint, outAmount } = route;
        await this.updateNextTrade(route);
        await this.refreshBalances();
        await this.logSwap({ inputToken: inputMint, inAmount, outputToken: outputMint, outAmount, txId: txid, timestamp: new Date().toISOString() });
    }

    
    private async refreshBalances(): Promise<void> {
        try {
            const results = await Promise.allSettled([
                this.solanaConnection.getBalance(this.wallet.publicKey),
                this.solanaConnection.getTokenAccountBalance(this.altTokenAccount)
            ]);

            const solBalanceResult = results[0];
            const altBalanceResult = results[1];

            if (solBalanceResult.status === 'fulfilled') {
                this.solBalance = solBalanceResult.value;
            } else {
                console.error('Error fetching SOL balance:', solBalanceResult.reason);
            }

            if (altBalanceResult.status === 'fulfilled') {
                this.altBalance = altBalanceResult.value.value.uiAmount ?? 0;
            } else {
                this.altBalance = 0;
            }

            if (this.solBalance < LAMPORTS_PER_SOL / 1000) {
                this.terminateSession("Low SOL balance.");
            }
        } catch (error) {
            console.error('Unexpected error during balance refresh:', error);
        }
    }

    private async logSwap(args: LogSwapArgs): Promise<void> {
        const { inputToken, inAmount, outputToken, outAmount, txId, timestamp } = args;
        const logEntry = {
            inputToken,
            inAmount,
            outputToken,
            outAmount,
            txId,
            timestamp,
        };

        const filePath = path.join(__dirname, 'trades.json');

        try {
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify([logEntry], null, 2), 'utf-8');
            } else {
                const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
                const trades = JSON.parse(data);
                trades.push(logEntry);
                fs.writeFileSync(filePath, JSON.stringify(trades, null, 2), 'utf-8');
            }
            console.log(`✅ Logged swap: ${inAmount} ${inputToken} -> ${outAmount} ${outputToken},\n  TX: ${txId}}`);
        } catch (error) {
            console.error('Error logging swap:', error);
        }
    }

    private async updateNextTrade(lastTrade: QuoteResponse): Promise<void> {
        const priceChange = this.targetGainPercentage / 100;
        this.nextTrade = {
            inputMint: this.nextTrade.outputMint,
            outputMint: this.nextTrade.inputMint,
            amount: parseInt(lastTrade.outAmount),
            nextTradeThreshold: this.initialPrice * (1 + priceChange),
        };
        this.setInitialPrice();
    }

    private terminateSession(reason: string): void {
        console.warn(`❌ Terminating bot...${reason}`);
        console.log(`Current balances:\nSOL: ${this.solBalance / LAMPORTS_PER_SOL},\nALT: ${this.altBalance}`);
        if (this.priceWatchIntervalId) {
            clearInterval(this.priceWatchIntervalId);
            this.priceWatchIntervalId = undefined; // Clear the reference to the interval
        }
        setTimeout(() => {
            console.log('Bot has been terminated.');
            process.exit(1);
        }, 1000);
    }

    private async getAdressLookupTableAccounts (
        keys: string[], connection: Connection
    ): Promise<AddressLookupTableAccount[]> {
        const addressLookupTableAccountInfos =
            await connection.getMultipleAccountsInfo(
                keys.map((key) => new PublicKey(key))
            );
    
        return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
            const addressLookupTableAddress = keys[index];
            if (accountInfo) {
                const addressLookupTableAccount = new AddressLookupTableAccount({
                    key: new PublicKey(addressLookupTableAddress),
                    state: AddressLookupTableAccount.deserialize(accountInfo.data),
                });
                acc.push(addressLookupTableAccount);
            }
    
            return acc;
        }, new Array<AddressLookupTableAccount>());
    };
}
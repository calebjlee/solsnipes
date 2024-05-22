"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbBot = exports.SwapToken = void 0;
var web3_js_1 = require("@solana/web3.js");
var api_1 = require("@jup-ag/api");
var spl_token_1 = require("@solana/spl-token");
var fs = require("fs");
var path = require("path");
var SwapToken;
(function (SwapToken) {
    SwapToken[SwapToken["SOL"] = 0] = "SOL";
    SwapToken[SwapToken["ALT"] = 1] = "ALT";
})(SwapToken || (exports.SwapToken = SwapToken = {}));
var ArbBot = /** @class */ (function () {
    function ArbBot(config) {
        this.solMint = new web3_js_1.PublicKey("So11111111111111111111111111111111111111112");
        this.solBalance = 0;
        this.altBalance = 0;
        this.checkInterval = 1000;
        this.lastCheck = 0;
        this.targetGainPercentage = 1;
        this.initialPrice = 0;
        this.waitingForConfirmation = false;
        this.startTime = 0;
        var solanaEndpoint = config.solanaEndpoint, metisEndpoint = config.metisEndpoint, secretKey = config.secretKey, targetGainPercentage = config.targetGainPercentage, checkInterval = config.checkInterval, initialInputToken = config.initialInputToken, initialInputAmount = config.initialInputAmount, initialAltMint = config.initialAltMint, firstTradePrice = config.firstTradePrice;
        this.solanaConnection = new web3_js_1.Connection(solanaEndpoint);
        this.jupiterApi = (0, api_1.createJupiterApiClient)({ basePath: metisEndpoint });
        this.wallet = web3_js_1.Keypair.fromSecretKey(secretKey);
        this.altTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(initialAltMint, this.wallet.publicKey);
        this.initialAltMint = initialAltMint;
        if (targetGainPercentage) {
            this.targetGainPercentage = targetGainPercentage;
        }
        if (checkInterval) {
            this.checkInterval = checkInterval;
        }
        this.nextTrade = {
            inputMint: initialInputToken === SwapToken.SOL ? this.solMint.toBase58() : initialAltMint.toBase58(),
            outputMint: initialInputToken === SwapToken.SOL ? initialAltMint.toBase58() : this.solMint.toBase58(),
            amount: initialInputAmount,
            nextTradeThreshold: firstTradePrice,
        };
    }
    ArbBot.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83E\uDD16 Initiating arb bot for wallet: ".concat(this.wallet.publicKey.toBase58(), "."));
                        return [4 /*yield*/, this.refreshBalances()];
                    case 1:
                        _a.sent();
                        console.log("\uD83C\uDFE6 Current balances:\nSOL: ".concat(this.solBalance / web3_js_1.LAMPORTS_PER_SOL, ",\nALT: ").concat(this.altBalance));
                        return [4 /*yield*/, this.firstTrade()];
                    case 2:
                        _a.sent();
                        this.startTime = Date.now();
                        return [4 /*yield*/, this.setInitialPrice()];
                    case 3:
                        _a.sent();
                        this.initiatePriceWatch();
                        return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.firstTrade = function () {
        return __awaiter(this, void 0, void 0, function () {
            var quote, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (this.waitingForConfirmation) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.getQuote(this.nextTrade)];
                    case 1:
                        quote = _a.sent();
                        return [4 /*yield*/, this.executeTrade(quote)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Error getting quote:', error_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.setInitialPrice = function () {
        return __awaiter(this, void 0, void 0, function () {
            var quote, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getQuote(this.nextTrade)];
                    case 1:
                        quote = _a.sent();
                        this.initialPrice = parseInt(quote.outAmount);
                        console.log("Initial price set to: ", this.initialPrice);
                        this.nextTrade.nextTradeThreshold = this.initialPrice * (1 + this.targetGainPercentage / 100);
                        console.log("Next trade threshold set to: ", this.nextTrade.nextTradeThreshold);
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Error getting quote:', error_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.initiatePriceWatch = function () {
        var _this = this;
        this.priceWatchIntervalId = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var currentTime, quote, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentTime = Date.now();
                        if (!(currentTime - this.lastCheck >= this.checkInterval)) return [3 /*break*/, 4];
                        this.lastCheck = currentTime;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        if (this.waitingForConfirmation) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.getQuote(this.nextTrade)];
                    case 2:
                        quote = _a.sent();
                        this.evaluateQuoteAndSwap(quote);
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Error getting quote:', error_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); }, this.checkInterval);
    };
    ArbBot.prototype.executeTrade = function (quote) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log("\uD83D\uDCCA Current price: ".concat(quote.outAmount));
                try {
                    this.waitingForConfirmation = true;
                    this.executeSwap(quote, this.nextTrade.amount);
                }
                catch (error) {
                    console.error('Error executing swap:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    ArbBot.prototype.getQuote = function (quoteRequest) {
        return __awaiter(this, void 0, void 0, function () {
            var quote, error_4, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 6]);
                        return [4 /*yield*/, this.jupiterApi.quoteGet(quoteRequest)];
                    case 1:
                        quote = _c.sent();
                        if (!quote) {
                            throw new Error('No quote found');
                        }
                        return [2 /*return*/, quote];
                    case 2:
                        error_4 = _c.sent();
                        if (!(error_4 instanceof api_1.ResponseError)) return [3 /*break*/, 4];
                        _b = (_a = console).log;
                        return [4 /*yield*/, error_4.response.json()];
                    case 3:
                        _b.apply(_a, [_c.sent()]);
                        return [3 /*break*/, 5];
                    case 4:
                        console.error(error_4);
                        _c.label = 5;
                    case 5: throw new Error('Unable to find quote');
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.getTokenDecimals = function (mintAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var mintPublicKey, mintInfo;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mintPublicKey = new web3_js_1.PublicKey(mintAddress);
                        return [4 /*yield*/, (0, spl_token_1.getMint)(this.solanaConnection, mintPublicKey)];
                    case 1:
                        mintInfo = _a.sent();
                        return [2 /*return*/, mintInfo.decimals];
                }
            });
        });
    };
    ArbBot.prototype.evaluateQuoteAndSwap = function (quote) {
        return __awaiter(this, void 0, void 0, function () {
            var difference, curTime, timeBeforeExecuting, _a, _b, _c, _d, _e, _f, error_5;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        difference = (parseInt(quote.outAmount) - this.nextTrade.nextTradeThreshold) / this.nextTrade.nextTradeThreshold;
                        console.log("\uD83D\uDCC8 Current price: ".concat(quote.outAmount, " is ").concat(difference > 0 ? 'higher' : 'lower', " than the next trade threshold: ").concat(this.nextTrade.nextTradeThreshold, " by ").concat(Math.abs(difference * 100).toFixed(2), "%."));
                        curTime = Date.now();
                        timeBeforeExecuting = 75000;
                        if (!(parseInt(quote.outAmount) > this.nextTrade.nextTradeThreshold || ((parseInt(quote.outAmount) < this.initialPrice) && curTime - this.startTime > timeBeforeExecuting))) return [3 /*break*/, 6];
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 5, , 6]);
                        this.waitingForConfirmation = true;
                        return [4 /*yield*/, this.refreshBalances()];
                    case 2:
                        _g.sent();
                        _a = this.executeSwap;
                        _b = [quote];
                        _c = this.altBalance;
                        _e = (_d = Math).pow;
                        _f = [10];
                        return [4 /*yield*/, this.getTokenDecimals(this.initialAltMint.toBase58())];
                    case 3: return [4 /*yield*/, _a.apply(this, _b.concat([_c * _e.apply(_d, _f.concat([_g.sent()]))]))];
                    case 4:
                        _g.sent();
                        this.terminateSession("Successfully Swapped!");
                        return [3 /*break*/, 6];
                    case 5:
                        error_5 = _g.sent();
                        console.error('Error executing swap:', error_5);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.executeSwap = function (route, customAmount) {
        return __awaiter(this, void 0, void 0, function () {
            var roundedAmount, inputMint, outputMint, inputTokenBalance, solBalance, inputTokenAccount, _a, computeBudgetInstructions, setupInstructions, swapInstruction, cleanupInstruction, addressLookupTableAddresses, instructions, addressLookupTableAccounts, _b, blockhash, lastValidBlockHeight, messageV0, transaction, rawTransaction, txid, confirmation, error_6, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 13, 17, 18]);
                        roundedAmount = Math.round(customAmount);
                        if (!Number.isInteger(roundedAmount) || roundedAmount <= 0) {
                            throw new Error('Invalid custom amount');
                        }
                        // Convert the rounded amount to string and assign to route
                        route.inAmount = roundedAmount.toString();
                        console.log("Executing swap with amount: ".concat(route.inAmount));
                        inputMint = new web3_js_1.PublicKey(route.inputMint);
                        outputMint = new web3_js_1.PublicKey(route.outputMint);
                        // Ensure the associated token account for the output mint exists
                        return [4 /*yield*/, this.createTokenAccountIfMissing(this.wallet.publicKey, outputMint)];
                    case 1:
                        // Ensure the associated token account for the output mint exists
                        _f.sent();
                        inputTokenBalance = 0;
                        if (!inputMint.equals(this.solMint)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getSolBalance(this.wallet.publicKey)];
                    case 2:
                        solBalance = _f.sent();
                        console.log("SOL Balance: ".concat(solBalance / web3_js_1.LAMPORTS_PER_SOL, " SOL"));
                        if (solBalance < roundedAmount) {
                            console.error("Insufficient SOL for the swap. Required: ".concat(roundedAmount, ", Available: ").concat(solBalance));
                            throw new Error("Insufficient SOL for the swap. Required: ".concat(roundedAmount, ", Available: ").concat(solBalance));
                        }
                        inputTokenBalance = solBalance;
                        return [3 /*break*/, 6];
                    case 3: return [4 /*yield*/, this.getAssociatedTokenAccount(this.wallet.publicKey, inputMint)];
                    case 4:
                        inputTokenAccount = _f.sent();
                        return [4 /*yield*/, this.getTokenBalance(inputTokenAccount)];
                    case 5:
                        inputTokenBalance = _f.sent();
                        console.log("Input Token Balance for mint ".concat(inputMint.toBase58(), ": ").concat(inputTokenBalance));
                        if (inputTokenBalance < roundedAmount) {
                            console.error("Insufficient funds for the swap. Required: ".concat(roundedAmount, ", Available: ").concat(inputTokenBalance));
                            throw new Error("Insufficient funds for the swap. Required: ".concat(roundedAmount, ", Available: ").concat(inputTokenBalance));
                        }
                        _f.label = 6;
                    case 6:
                        // Log input and output details
                        console.log("Input Mint: ".concat(inputMint.toBase58()));
                        console.log("Output Mint: ".concat(outputMint.toBase58()));
                        console.log("Input Token Balance: ".concat(inputTokenBalance));
                        console.log("Rounded Amount: ".concat(roundedAmount));
                        return [4 /*yield*/, this.jupiterApi.swapInstructionsPost({
                                swapRequest: {
                                    quoteResponse: route,
                                    userPublicKey: this.wallet.publicKey.toBase58(),
                                    prioritizationFeeLamports: 'auto',
                                },
                            })];
                    case 7:
                        _a = _f.sent(), computeBudgetInstructions = _a.computeBudgetInstructions, setupInstructions = _a.setupInstructions, swapInstruction = _a.swapInstruction, cleanupInstruction = _a.cleanupInstruction, addressLookupTableAddresses = _a.addressLookupTableAddresses;
                        instructions = __spreadArray(__spreadArray(__spreadArray([], computeBudgetInstructions.map(this.instructionDataToTransactionInstruction), true), setupInstructions.map(this.instructionDataToTransactionInstruction), true), [
                            this.instructionDataToTransactionInstruction(swapInstruction),
                            this.instructionDataToTransactionInstruction(cleanupInstruction),
                        ], false).filter(function (ix) { return ix !== null; });
                        return [4 /*yield*/, this.getAddressLookupTableAccounts(addressLookupTableAddresses, this.solanaConnection)];
                    case 8:
                        addressLookupTableAccounts = _f.sent();
                        return [4 /*yield*/, this.solanaConnection.getLatestBlockhash()];
                    case 9:
                        _b = _f.sent(), blockhash = _b.blockhash, lastValidBlockHeight = _b.lastValidBlockHeight;
                        messageV0 = new web3_js_1.TransactionMessage({
                            payerKey: this.wallet.publicKey,
                            recentBlockhash: blockhash,
                            instructions: instructions,
                        }).compileToV0Message(addressLookupTableAccounts);
                        transaction = new web3_js_1.VersionedTransaction(messageV0);
                        transaction.sign([this.wallet]);
                        rawTransaction = transaction.serialize();
                        return [4 /*yield*/, this.solanaConnection.sendRawTransaction(rawTransaction, {
                                skipPreflight: true,
                                maxRetries: 2,
                            })];
                    case 10:
                        txid = _f.sent();
                        return [4 /*yield*/, this.solanaConnection.confirmTransaction({ signature: txid, blockhash: blockhash, lastValidBlockHeight: lastValidBlockHeight }, 'confirmed')];
                    case 11:
                        confirmation = _f.sent();
                        if (confirmation.value.err) {
                            console.error('Transaction confirmation error:', confirmation.value.err);
                            throw new Error("Transaction failed with error: ".concat(JSON.stringify(confirmation.value.err)));
                        }
                        return [4 /*yield*/, this.postTransactionProcessing(route, txid)];
                    case 12:
                        _f.sent();
                        return [3 /*break*/, 18];
                    case 13:
                        error_6 = _f.sent();
                        if (!(error_6 instanceof api_1.ResponseError)) return [3 /*break*/, 15];
                        _d = (_c = console).error;
                        _e = ['Response error:'];
                        return [4 /*yield*/, error_6.response.json()];
                    case 14:
                        _d.apply(_c, _e.concat([_f.sent()]));
                        return [3 /*break*/, 16];
                    case 15:
                        if (error_6 instanceof Error) {
                            if (error_6.message.includes('Invalid custom amount')) {
                                console.error('Custom amount error:', error_6.message);
                            }
                            else if (error_6.message.includes('Transaction failed')) {
                                console.error('Transaction execution error:', error_6.message);
                                if (error_6.message.includes('6018')) {
                                    console.error('Custom error 6018: Insufficient funds for the swap');
                                }
                            }
                            else {
                                console.error('Error during swap execution:', error_6);
                            }
                        }
                        else {
                            console.error('Unexpected error:', error_6);
                        }
                        _f.label = 16;
                    case 16: throw new Error('Unable to execute swap');
                    case 17:
                        this.waitingForConfirmation = false;
                        return [7 /*endfinally*/];
                    case 18: return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.createTokenAccountIfMissing = function (walletPublicKey, mint) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenAccount, tokenAccountInfo, transaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAssociatedTokenAccount(walletPublicKey, mint)];
                    case 1:
                        tokenAccount = _a.sent();
                        return [4 /*yield*/, this.solanaConnection.getParsedAccountInfo(tokenAccount)];
                    case 2:
                        tokenAccountInfo = _a.sent();
                        if (!!tokenAccountInfo.value) return [3 /*break*/, 4];
                        console.log("Creating associated token account for mint ".concat(mint.toBase58()));
                        transaction = new web3_js_1.Transaction().add((0, spl_token_1.createAssociatedTokenAccountInstruction)(walletPublicKey, tokenAccount, walletPublicKey, mint, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID));
                        return [4 /*yield*/, this.sendTransaction(transaction)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        console.log("Associated token account already exists for mint ".concat(mint.toBase58()));
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.sendTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var blockhash, signature;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.solanaConnection.getRecentBlockhash()];
                    case 1:
                        blockhash = (_a.sent()).blockhash;
                        transaction.recentBlockhash = blockhash;
                        transaction.feePayer = this.wallet.publicKey;
                        transaction.sign(this.wallet);
                        return [4 /*yield*/, this.solanaConnection.sendRawTransaction(transaction.serialize())];
                    case 2:
                        signature = _a.sent();
                        return [4 /*yield*/, this.solanaConnection.confirmTransaction(signature, 'singleGossip')];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.getSolBalance = function (walletPublicKey) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.solanaConnection.getBalance(walletPublicKey)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArbBot.prototype.getAssociatedTokenAccount = function (walletPublicKey, mint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, spl_token_1.getAssociatedTokenAddressSync)(mint, walletPublicKey)];
            });
        });
    };
    ArbBot.prototype.getTokenBalance = function (tokenAccount) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenAccountInfo, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, spl_token_1.getAccount)(this.solanaConnection, tokenAccount)];
                    case 1:
                        tokenAccountInfo = _a.sent();
                        return [2 /*return*/, Number(tokenAccountInfo.amount)]; // Adjust if you need decimals based on token type
                    case 2:
                        error_7 = _a.sent();
                        console.error('Error fetching token balance:', error_7);
                        return [2 /*return*/, 0];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.instructionDataToTransactionInstruction = function (instruction) {
        if (instruction === null || instruction === undefined)
            return null;
        return new web3_js_1.TransactionInstruction({
            programId: new web3_js_1.PublicKey(instruction.programId),
            keys: instruction.accounts.map(function (key) { return ({
                pubkey: new web3_js_1.PublicKey(key.pubkey),
                isSigner: key.isSigner,
                isWritable: key.isWritable,
            }); }),
            data: Buffer.from(instruction.data, 'base64'),
        });
    };
    ArbBot.prototype.getAddressLookupTableAccounts = function (keys, connection) {
        return __awaiter(this, void 0, void 0, function () {
            var addressLookupTableAccountInfos;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection.getMultipleAccountsInfo(keys.map(function (key) { return new web3_js_1.PublicKey(key); }))];
                    case 1:
                        addressLookupTableAccountInfos = _a.sent();
                        return [2 /*return*/, addressLookupTableAccountInfos.reduce(function (acc, accountInfo, index) {
                                var addressLookupTableAddress = keys[index];
                                if (accountInfo) {
                                    var addressLookupTableAccount = new web3_js_1.AddressLookupTableAccount({
                                        key: new web3_js_1.PublicKey(addressLookupTableAddress),
                                        state: web3_js_1.AddressLookupTableAccount.deserialize(accountInfo.data),
                                    });
                                    acc.push(addressLookupTableAccount);
                                }
                                return acc;
                            }, new Array())];
                }
            });
        });
    };
    ArbBot.prototype.postTransactionProcessing = function (route, txid) {
        return __awaiter(this, void 0, void 0, function () {
            var inputMint, inAmount, outputMint, outAmount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        inputMint = route.inputMint, inAmount = route.inAmount, outputMint = route.outputMint, outAmount = route.outAmount;
                        return [4 /*yield*/, this.updateNextTrade(route)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.refreshBalances()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.logSwap({ inputToken: inputMint, inAmount: inAmount, outputToken: outputMint, outAmount: outAmount, txId: txid, timestamp: new Date().toISOString() })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.refreshBalances = function () {
        return __awaiter(this, void 0, void 0, function () {
            var results, solBalanceResult, altBalanceResult, error_8;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Promise.allSettled([
                                this.solanaConnection.getBalance(this.wallet.publicKey),
                                this.solanaConnection.getTokenAccountBalance(this.altTokenAccount)
                            ])];
                    case 1:
                        results = _b.sent();
                        solBalanceResult = results[0];
                        altBalanceResult = results[1];
                        if (solBalanceResult.status === 'fulfilled') {
                            this.solBalance = solBalanceResult.value;
                        }
                        else {
                            console.error('Error fetching SOL balance:', solBalanceResult.reason);
                        }
                        if (altBalanceResult.status === 'fulfilled') {
                            this.altBalance = (_a = altBalanceResult.value.value.uiAmount) !== null && _a !== void 0 ? _a : 0;
                        }
                        else {
                            this.altBalance = 0;
                        }
                        if (this.solBalance < web3_js_1.LAMPORTS_PER_SOL / 1000) {
                            this.terminateSession("Low SOL balance.");
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_8 = _b.sent();
                        console.error('Unexpected error during balance refresh:', error_8);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ArbBot.prototype.logSwap = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var inputToken, inAmount, outputToken, outAmount, txId, timestamp, logEntry, filePath, data, trades;
            return __generator(this, function (_a) {
                inputToken = args.inputToken, inAmount = args.inAmount, outputToken = args.outputToken, outAmount = args.outAmount, txId = args.txId, timestamp = args.timestamp;
                logEntry = {
                    inputToken: inputToken,
                    inAmount: inAmount,
                    outputToken: outputToken,
                    outAmount: outAmount,
                    txId: txId,
                    timestamp: timestamp,
                };
                filePath = path.join(__dirname, 'trades.json');
                try {
                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, JSON.stringify([logEntry], null, 2), 'utf-8');
                    }
                    else {
                        data = fs.readFileSync(filePath, { encoding: 'utf-8' });
                        trades = JSON.parse(data);
                        trades.push(logEntry);
                        fs.writeFileSync(filePath, JSON.stringify(trades, null, 2), 'utf-8');
                    }
                    console.log("\u2705 Logged swap: ".concat(inAmount, " ").concat(inputToken, " -> ").concat(outAmount, " ").concat(outputToken, ",\n  TX: ").concat(txId, "}"));
                }
                catch (error) {
                    console.error('Error logging swap:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    ArbBot.prototype.updateNextTrade = function (lastTrade) {
        return __awaiter(this, void 0, void 0, function () {
            var priceChange;
            return __generator(this, function (_a) {
                priceChange = this.targetGainPercentage / 100;
                this.nextTrade = {
                    inputMint: this.nextTrade.outputMint,
                    outputMint: this.nextTrade.inputMint,
                    amount: parseInt(lastTrade.outAmount),
                    nextTradeThreshold: this.initialPrice * (1 + priceChange),
                };
                this.setInitialPrice();
                return [2 /*return*/];
            });
        });
    };
    ArbBot.prototype.terminateSession = function (reason) {
        console.warn("\u274C Terminating bot...".concat(reason));
        console.log("Current balances:\nSOL: ".concat(this.solBalance / web3_js_1.LAMPORTS_PER_SOL, ",\nALT: ").concat(this.altBalance));
        if (this.priceWatchIntervalId) {
            clearInterval(this.priceWatchIntervalId);
            this.priceWatchIntervalId = undefined; // Clear the reference to the interval
        }
        setTimeout(function () {
            console.log('Bot has been terminated.');
            process.exit(1);
        }, 1000);
    };
    ArbBot.prototype.getAdressLookupTableAccounts = function (keys, connection) {
        return __awaiter(this, void 0, void 0, function () {
            var addressLookupTableAccountInfos;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection.getMultipleAccountsInfo(keys.map(function (key) { return new web3_js_1.PublicKey(key); }))];
                    case 1:
                        addressLookupTableAccountInfos = _a.sent();
                        return [2 /*return*/, addressLookupTableAccountInfos.reduce(function (acc, accountInfo, index) {
                                var addressLookupTableAddress = keys[index];
                                if (accountInfo) {
                                    var addressLookupTableAccount = new web3_js_1.AddressLookupTableAccount({
                                        key: new web3_js_1.PublicKey(addressLookupTableAddress),
                                        state: web3_js_1.AddressLookupTableAccount.deserialize(accountInfo.data),
                                    });
                                    acc.push(addressLookupTableAccount);
                                }
                                return acc;
                            }, new Array())];
                }
            });
        });
    };
    ;
    return ArbBot;
}());
exports.ArbBot = ArbBot;

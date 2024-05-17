const dotenv = require('dotenv'); // Environment variables
const TelegramBot = require('node-telegram-bot-api'); //Telegram API wrapper

const { GoogleGenerativeAI } = require("@google/generative-ai");

//Use Gemini 1.5 Flash
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings: [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE",
    },
]});

// Telegram token from environment variables
const token = process.env.TELEGRAM_SECRET;

const debug = (Bun.argv.indexOf("--debug") >= 0);
const trade = (Bun.argv.indexOf("--trade") >= 0);

const Promise = require('bluebird');
    Promise.config({
        cancellation: true
    });
    // Create a bot that uses 'polling' to fetch new updates
    const bot = new TelegramBot(token, {polling: true});

const { runTrader } = require('./trader');

console.log("Bot is running...");

//main bot logic for reading messages and trading on them
async function handleMessage(msg){
    if (debug)
    console.log("Received Message...");

    //structure for AI output
    let latest_data = {
        token_name: null,
        buy: null,
        confidence: null //TODO: Add way to do confidence
    };

    //if message is invalid (no text to read) quit
    if (!msg?.text && !msg?.caption){
        return;
    }

    //Get text from message
    let text = msg?.text ? msg.text : msg.caption;

    //Add original message if replying to earlier thing
    if (msg?.reply_to_message){
        text = "Original Message:\n" + msg.reply_to_message.text + "\nNew Update:\n" + text; 
    }
    
    let coin_name_promise = model.generateContent(`You are an unusual crypto coin symbol reporter. Given a MESSAGE, you will OUTPUT only the name of the crypto coin being mentioned, with no other text. The coin must be mentioned in the text to be chosen, and the coin name might not appear to be a recognized crypto, but ALWAYS copy down the coin name exactly as it appears with no other text!!! NEVER REFUSE TO PROVIDE A NAME, ALWAYS MAKE THE BEST GUESS YOU CAN.

    Examples:
    
    MESSAGE:  lamburus, I had a look at this project during presale and wanted to see if it would dump on launch, but the chart actually looks pretty good now and has nice a recovery back towards ATH.
    THE COIN NAME IS: lamburus
    
    MESSAGE: 🤝 Dwake peaked at $1.3m, 10x from the call, congrats to those who caught this.
    THE COIN NAME IS: Dwake
    
    MESSAGE: ${text}
    THE COIN NAME IS: `)

    let coin_decision_promise = model.generateContent(`You are a crypto coin news classifier who classifies incoming messages about a coin as recommending to buy or sell. Given a MESSAGE, you will OUTPUT only whether the update is a BUY, or a SELL. FOCUS ON THE MOST RECENT NEWS WHEN DECIDING!!!
    Examples:
    
    MESSAGE: 💢$POWSCHE up over $25m now, I first mentioned it at $700k, and multiple times since, even at $10m a day ago 👀. they’re still doing a lamborghini burn at $100m marketcap and it looks like it’s heading towards there pretty soon.
    
    ✅ I’ll be at the event live, as they said they will fly me out, so any dips on $POWSCHE i’m buying. While marketcap is still “high” this is a lot more guaranteed investment if you can HODL long enough.
    OUTPUT: BUY
    
    MESSAGE: Trade update, pulling out of duck here, I noticed a dev wallet already selling, this is a pretty bad sign, just about broke even on this.
    OUTPUT: SELL
    
    MESSAGE: 💢 Spent $200 just to update the banner on dex. Going to be spending money on ads shortly.
    OUTPUT: SELL
    
    MESSAGE: ${text}
    OUTPUT: `);
    

    if (debug) console.time("AI Part");
    let raw_results = await Promise.all([coin_name_promise, coin_decision_promise]);
    if (debug) console.timeEnd("AI Part");
    
    latest_data.token_name = raw_results[0].response.text().toUpperCase().replace(/\$/g, "").replace(/\-/g, "").replace(/COIN/g, "").replace("\n", "");
    latest_data.buy = (raw_results[1].response.text().trim().replace(/OUTPUT:/g, "").trim() == "BUY");

    if (debug){
        console.log("AI Parsed:")
        console.log("TOKEN: ", latest_data.token_name);
        console.log("BUY? ", raw_results[1].response.text().trim());
    }

    if (latest_data?.buy && latest_data?.token_name){
        if (debug) console.log("Attempting to trade: " + latest_data.token_name);
        if (trade){
            runTrader(latest_data.token_name + "/SOL").catch(console.error);
        }
        else{
            console.log("Would have traded " +  latest_data.token_name + ", but --trade setting not enabled.");
        }
    }
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "DONE");
    if (debug) console.log("Finished reacting to message.")
}

// Listen for any kind of message (not channels, but DMs)
bot.on('message', (msg) => {
  handleMessage(msg);  
});

//Listen for channel updates
bot.on("channel_post", (msg) => {
    handleMessage(msg);
});
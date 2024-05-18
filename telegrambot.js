const dotenv = require('dotenv'); // Environment variables
const TelegramBot = require('node-telegram-bot-api'); //Telegram API wrapper

dotenv.config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

// ...

// For text-only input, use the gemini-pro model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});

// Telegram token from environment variables
const token = process.env.TELEGRAM_SECRET;

const Promise = require('bluebird');
    Promise.config({
        cancellation: true
    });
    // Create a bot that uses 'polling' to fetch new updates
    const bot = new TelegramBot(token, {polling: true});

const { runTrader } = require('./trader');

console.log("Bot is running...");

// Listen for any kind of message.
bot.on('message', async (msg) => {

    console.log("Received Message...");
    let finalMsg = "";

    //structure for AI output
    let latest_data = {
        token_name: null,
        buy: null, //
        confidence: null //TODO: Add way to do confidence
    };

    if (msg?.text || msg?.caption){
        let text = msg?.text ? msg.text : msg.caption;
        if (msg?.reply_to_message){
            text = "Original Message:\n" + msg.reply_to_message.text + "\nNew Update:\n" + text; //Add original message if replying to earlier thing
        }
        // let p1 = ollama.chat({
        //     model: 'phi3-coin-name', //use tiny model for higher tokens/sec
        //     messages: [{ role: 'user', content: `MESSAGE: ${text}\nTHE COIN NAME IS: `}],
        //     keep_alive: -1,
        // });
        
        let p1 = model.generateContent(`You are an unusual crypto coin symbol reporter. Given a MESSAGE, you will OUTPUT only the name of the crypto coin being mentioned, with no other text. The coin must be mentioned in the text to be chosen, and the coin name might not appear to be a recognized crypto, but ALWAYS copy down the coin name exactly as it appears with no other text!!! NEVER REFUSE TO PROVIDE A NAME, ALWAYS MAKE THE BEST GUESS YOU CAN.

        Examples:
        
        MESSAGE:  lamburus, I had a look at this project during presale and wanted to see if it would dump on launch, but the chart actually looks pretty good now and has nice a recovery back towards ATH.
        THE COIN NAME IS: lamburus
        
        MESSAGE: 🤝 Dwake peaked at $1.3m, 10x from the call, congrats to those who caught this.
        THE COIN NAME IS: Dwake
        
        MESSAGE: ${text}
        THE COIN NAME IS: `)
    
        let p2 = model.generateContent(`You are a crypto coin news classifier who classifies incoming messages about a coin as recommending to buy or sell. Given a MESSAGE, you will OUTPUT only whether the update is a BUY, or a SELL. If unsure, default to SELL to remain cautious. FOCUS ON THE MOST RECENT NEWS WHEN DECIDING!!!
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
        
        // ollama.chat({
        //     model: 'phi3-decision',
        //    messages: [{ role: 'user', content: `MESSAGE: ${text}\nOUTPUT: `}],
        //     keep_alive: -1,
        // }); 
    
        console.time("AI Part");
        let raw_results = await Promise.all([p1, p2]);
        console.timeEnd("AI Part");
        latest_data.token_name = raw_results[0].response.text().toUpperCase().replace(/\$/g, "").replace(/\-/g, "").replace(/COIN/g, "");
        latest_data.buy = (raw_results[1].response.text().trim().replace(/OUTPUT:/g, "").trim() == "BUY");
        console.log("AI Parsed:")
        console.log("TOKEN: ", latest_data.token_name);
        console.log("BUY? ", raw_results[1].response.text().trim());
    }
    
    //let imageExists = (msg?.photo) ? true : false; 
    //TODO: Increase confidence if imageExists

    if (latest_data?.buy && latest_data?.token_name){
        console.log("Attempting to trade: " + latest_data.token_name);
        runTrader(latest_data.token_name + "/SOL").catch(console.error);
    }
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "DONE");
    console.log("Finished reacting to message.")
});
import 'dotenv/config'; //initialize environment variables from .env file
const TelegramBot = require('node-telegram-bot-api'); //Telegram API wrapper
import { Ollama } from 'ollama' //Lets you run local LLMs easily: https://ollama.com/

// Telegram token from environment variables
const token = process.env.TELEGRAM_SECRET;

const ollama = new Ollama(); //start ollama server

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

const { runTrader } = require('./trader');

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
        let p1 = ollama.chat({
            model: 'phi3-coin-name', //use tiny model for higher tokens/sec
            messages: [{ role: 'user', content: `MESSAGE: ${text}\nTHE COIN NAME IS: `}],
            keep_alive: -1,
        });
    
        let p2 = ollama.chat({
            model: 'phi3-decision',
           messages: [{ role: 'user', content: `MESSAGE: ${text}\nOUTPUT: `}],
            keep_alive: -1,
        }); 
    
        console.time("AI Part");
        let raw_results = await Promise.all([p1, p2]);
        console.timeEnd("AI Part");
        latest_data.token_name = raw_results[0].message.content.replace(/\$/g, "");
        latest_data.buy = (raw_results[1].message.content.trim() == "BUY");
        // console.log("AI Parsed:")
        // console.log("TOKEN: ", latest_data.token_name);
        // console.log("BUY? ", latest_data.buy);
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
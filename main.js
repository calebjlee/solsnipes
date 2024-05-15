import 'dotenv/config'; //initialize environment variables from .env file
const TelegramBot = require('node-telegram-bot-api'); //Telegram API wrapper
import { Ollama } from 'ollama' //Lets you run local LLMs easily: https://ollama.com/

// Telegram token from environment variables
const token = process.env.TELEGRAM_SECRET;

const ollama = new Ollama(); //start ollama server

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

const { runTrader } = require('./trader');

//state data
let currCoin = "NA";

// Listen for any kind of message.
bot.on('message', async (msg) => {

    console.log("Received Message...");
    let finalMsg = "";

    if (msg?.text || msg?.caption){
        let text = msg?.text ? msg.text : msg.caption;
        let p1 = ollama.chat({
            model: 'phi3-coin-name', //use tiny model for higher tokens/sec
            messages: [{ role: 'user', content: `MESSAGE: ${text}\nOUTPUT: `}],
            keep_alive: -1,
        });
    
        let p2 = ollama.chat({
            model: 'phi3-decision',
            messages: [{ role: 'user', content: `MESSAGE: ${text}\nOUTPUT: `}],
            keep_alive: -1,
        }); 
    
        console.time("AI Part");
        let results = await Promise.all([p1, p2]);
        console.timeEnd("AI Part");
        
        for (var res of results){
            finalMsg += res.message.content + "\n";
        }    
    }
    
    let imageExists = (msg?.photo) ? true : false;
    finalMsg += "HAS IMAGE: " + imageExists + "\n";

    const chatId = msg.chat.id;
    bot.sendMessage(chatId, finalMsg);
    runTrader(finalMsg + "/SOL").catch(console.error);
    console.log("Sent response.");
});
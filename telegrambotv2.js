const dotenv = require('dotenv'); // Environment variables
const {Api} = require('telegram');

dotenv.config();

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { createClient } from 'redis';
const { runTrader } = require('./trader');

const { GoogleGenerativeAI } = require("@google/generative-ai");
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

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION);

const CHECK_FREQUENCY = 5000; //how often to see if there is a new message (milliseconds)
const TARGET_CHAT_ID = -1002094405795;
//Lyxe Calls ID: -1002138178253
//Testing Channel ID: -1002094405795;

const redis_client = await createClient({
  url: process.env.REDIS_URL
}).on('error', err => console.log('Redis Client Error', err)).connect();

const debug = (Bun.argv.indexOf("--debug") >= 0);
const trade = (Bun.argv.indexOf("--trade") >= 0);

var current_max_id = ~~parseInt(await redis_client.get(TARGET_CHAT_ID + '.CURRENT_MAX_ID'));
if (!current_max_id){
  current_max_id = 2;
}
if (debug)
console.log("Current Max Message ID: ", current_max_id);

async function handleMessage(text){

  if (debug)
  console.log("Received Message...");

  //structure for AI output
  let latest_data = {
      token_name: null,
      buy: null,
      confidence: null //TODO: Add way to do confidence
  };
  
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


  let coin_sanity_promise= new Promise(async (resolve, reject) => {
    let coin_sanity = await model.generateContent(`You are an irrelevant message detector in a crypto news messages group. Given a MESSAGE, you will output IRRELEVANT if you are 100% confident the message does NOT reference any crypto coin (even if the name is unusual) and does NOT provide any sort of information on a crypto coin, whether that information be advice or otherwise. Otherwise, output UNSURE. Remember to only output IRRELEVANT if you are 100% sure the message is useless, so if unsure output UNSURE.
    
    Examples: 

    MESSAGE:  lamburus, I had a look at this project during presale and wanted to see if it would dump on launch, but the chart actually looks pretty good now and has nice a recovery back towards ATH.
    DECISION: UNSURE

    MESSAGE: 🤝 Dwake peaked at $1.3m, 10x from the call, congrats to those who caught this.
    DECISION: UNSURE

    MESSAGE: 💢 Spent $200 just to update the banner on dex. Going to be spending money on ads shortly.
    DECISION: UNSURE

    MESSAGE: If you haven't made money on this channel you must not be paying attention.
    DECISION: IRRELEVANT

    MESSAGE: ${text}
    DECISION: `)

    let parsed = coin_sanity.response.text().replace(/DECISION:/, "").trim().toUpperCase();
    if (parsed == "IRRELEVANT"){
      if (debug) console.log("JUDGED IRRELEVANT");
      reject("IRRELEVANT");
    }
    else{
      if (debug) console.log("JUDGMENT: ", parsed);
      resolve();
    }

  });

  if (debug) console.time("AI Part");
  let raw_results = []
  try{
    raw_results = await Promise.all([coin_sanity_promise, coin_name_promise, coin_decision_promise]);
  }
  catch(e){
    console.log("BREAKING OUT");
    return;
  }
  if (debug) console.timeEnd("AI Part");
  
  latest_data.token_name = raw_results[1].response.text().toUpperCase().replace(/\$/g, "").replace(/\-/g, "").replace(/COIN/g, "").replace("\n", "");
  latest_data.buy = (raw_results[2].response.text().trim().replace(/OUTPUT:/g, "").trim() == "BUY");

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
  if (debug) console.log("Finished reacting to message.")
}


async function main(){
  console.log("Logging into Tony's Telegram...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();

  console.log("Connected!");

  setInterval(async () => {
    const messages = await client.getMessages(TARGET_CHAT_ID, {minId: current_max_id, maxId: current_max_id + 2})
    if (debug) console.log("New messages: ", messages.length);
    if (messages.length <= 0){
      return;
    }
    let curr_message_obj = messages[messages.length - 1]
    let raw_text = curr_message_obj.message;
    if (curr_message_obj?.replyTo){
      let original_id = curr_message_obj.replyTo.replyToMsgId;
      let original_message_obj = await client.getMessages(TARGET_CHAT_ID, {minId: original_id - 1, maxId: original_id + 1});
      raw_text = "Original Message:\n" + original_message_obj[0].message + "\nNew Update:\n" + raw_text; 
    }
    handleMessage(raw_text);
    current_max_id += messages.length;
    await redis_client.set(TARGET_CHAT_ID + '.CURRENT_MAX_ID', current_max_id);
  }, CHECK_FREQUENCY);

}

main();

//IN CASE YOU NEED NEW SESSION
//import readline from "readline";
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });
// await client.start({
  //   phoneNumber: async () =>
  //     new Promise((resolve) =>
  //       rl.question("Please enter your number: ", resolve)
  //     ),
  //   password: async () =>
  //     new Promise((resolve) =>
  //       rl.question("Please enter your password: ", resolve)
  //     ),
  //   phoneCode: async () =>
  //     new Promise((resolve) =>
  //       rl.question("Please enter the code you received: ", resolve)
  //     ),
  //   onError: (err) => console.log(err),
  // });
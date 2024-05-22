//RUN THIS SCRIPT TO GET A NEW SESSION STRING IF IT BREAKS.

const dotenv = require('dotenv'); // Environment variables
const {Api} = require('telegram');

dotenv.config();

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";


const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession("");

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  import readline from "readline";
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await client.start({
      phoneNumber: async () =>
        new Promise((resolve) =>
          rl.question("Please enter your number: ", resolve)
        ),
      password: async () =>
        new Promise((resolve) =>
          rl.question("Please enter your password: ", resolve)
        ),
      phoneCode: async () =>
        new Promise((resolve) =>
          rl.question("Please enter the code you received: ", resolve)
        ),
      onError: (err) => console.log(err),
    });
console.log(client.session.save());
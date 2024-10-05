# solsnipes

# 🚀 Influencer Cryptocurrency Trading Bot

Our strategy leverages large, popular Influencer Cryptocurrency Telegram channels with audiences in the tens of thousands. These channels attract impulsive buyers who tend to follow trends on Solana altcoins—known for their high volatility. Due to the low liquidity of these altcoins, prices can undergo substantial fluctuations, presenting unique trading opportunities.

## 📊 Strategy Overview

Using historical data from DexScreener, we observed that 100% of the time an influencer advertised an altcoin, its price would rise for a short period. However, over 90% of the time, these coins would eventually crash below their initial advertisement price. Based on this pattern, we developed a low-risk strategy to take advantage of these price movements.

- **Data Source:** 2.5 months of historical data from a popular influencer's Telegram channel.
- **Sentiment Analysis:** Using the Gemini 1.5 Flash model, we performed sentiment analysis on all messages from the target influencer to detect when they positively advertised a coin.
- **Entry & Exit Strategy:** 
  - **Buy Trigger:** Buy immediately on the first advertisement.
  - **Profit Target:** Sell at 20% profit.
  - **Loss Mitigation:** If the price dips back to the buy price within 1 minute, the trade is exited at breakeven.
  - **Holding Period:** Hold the position for at least 1 minute after the initial buy.

**Manual Data Analysis**: I manually reviewed hundreds of trades using DexScreener due to anti-automation measures that prevented effective web scraping. Each trade was assumed under the worst conditions, where the initial buy occurred on the next minute after the advertisement, and any wick crossing the initial buy price within the first minute triggered a sell at breakeven. Profits were only taken if there was a period longer than one minute where the price stayed above 20%.

## 💹 Results

Despite our strict conditions, a backtest of the first 75 days (multiple trades per day) showed that an initial balance could yield up to **7000% returns** over 2.5 months. While this backtest didn’t account for all possible variables, the results were promising.

A Monte Carlo simulation on the tracked data also indicated that this strategy would be profitable over longer periods of time.

![output](https://github.com/user-attachments/assets/33e3da19-fb6c-4fa1-a21f-05a165312f9d)

![output(1)](https://github.com/user-attachments/assets/ae624520-f151-443e-852b-4697f028d952)

## ⚠️ Challenges & Limitations

While our backtest proved successful, the real-world implementation had several challenges:

- **Transaction Time**: Using the QuickNode API, we executed real trades on the Solana blockchain. However, trades weren’t instantaneous (approximately 15 seconds delay), unlike competitors using dedicated Solana trading bots.
- **Liquidity Issues**: Market sell orders often suffered from slippage due to low liquidity in altcoins, reducing the actual profits.
- **Overhead Costs**: AWS EC2 server costs and QuickNode API expenses added operational overhead, making profitability difficult without risking a larger amount of capital.

Ultimately, while we believe in the potential of our strategy, we encourage others to experiment with this tool at their own risk.

## 🔧 Tech Stack

This project utilizes multiple APIs and programming languages to operate:

- **Telegram Bot API** for reading messages from Telegram channels.
- **QuickNode API** for executing trades on the Solana blockchain.
- **Sentiment Analysis**: Gemini 1.5 Flash for processing influencer messages.
- **Backend**: 
  - JavaScript and TypeScript for trading logic.
  - Solana Web3.js for blockchain interactions.
  - AWS EC2 with pm2 for server management.

## 🛠️ Languages & Tools Used

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Solana](https://img.shields.io/badge/Solana-00FFA3?style=for-the-badge&logo=solana&logoColor=black)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)


Javascript Runtime needed:
- bun https://bun.sh

To install JS dependencies:

```bash
bun install
```

To run (with real trading):

```bash
bun telegrambot.js --trade
```

Settings:
--trade: Allows the bot to actually trade the coins
--debug: Turns on additional logging for verifying that everything is working.


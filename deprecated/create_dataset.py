import random
from dotenv import load_dotenv
load_dotenv() #load API key from environment variables file (.env)
#Make sure to 'pip install outlines' for this to work
import outlines
from outlines.models.openai import OpenAI, OpenAIConfig
from openai import AsyncOpenAI
import json

DATASET_SIZE = 200

@outlines.prompt
def create_example(coin_name, outlook):
    """
    You are a Telegram group chat crypto news generator. Given a coin name and an outlook for the coin (buy or sell), make up a scenario and format the update on the coin like a Telegram crypto influencer. Don't be too overdramatic, and output only the message you write with no other text. You can write the coin name in any way (all lowercase, with $ before it, all caps, etc...)
     
    Examples:

    COIN NAME: CHEEKS
    OUTLOOK: BUY
    MESSAGE: ✅ cheeks, based longer term play that has a fully doxxed dev who’s a professional poker player (this guys rich af and are super connected), had an extensive phone call with him.Has a unique image + art style, similar to PONKE.This isn’t at all a quick flip trade for me, go in!

    COIN NAME: ZOOMER
    OUTLOOK: BUY
    MESSAGE: Moving into $ZOOMER here, held $1m floor very nicely during the dip, has a good narrative and can easily appeal to masses.

    COIN NAME: PixelWall
    OUTLOOK: SELL
    MESSAGE: Up 25% on pixelwall but dev seems like bit of a moron, has to apparently manually verify every pixel, and he’s selling 1B of them? like wtf, I would try pull out of this.

    COIN NAME: larry
    OUTLOOK: SELL
    MESSAGE: Devs at larry rugged that shit for 40k bunch of broke cunts.

    Your Task (output only the message you write with no other text)
    COIN NAME: {{coin_name}}OUTLOOK: {{outlook}}
    MESSAGE: 

    """


f = open("./synthetic-coin-names.txt", 'r')
coin_names = f.readlines()

openai_client = AsyncOpenAI()
llm = OpenAI(openai_client, OpenAIConfig(model="gpt-4o"))

outlook = "BUY"

output = []

outfile = open('./synthetic-messages.jsonl', 'a')

for x in range(DATASET_SIZE):
    curr_coin_name = random.choice(coin_names)
    outlook = "SELL" if (outlook == "BUY") else "BUY"
    prompt = create_example(curr_coin_name, outlook)
    result = outlines.generate.text(llm)(prompt, max_tokens=200)
    entry = {"coin": curr_coin_name, "buy": (outlook == "BUY"), "message": result}
    json.dump(entry, outfile)
    outfile.write("\n")
    print("DONE WITH: ", x)
    print(result)
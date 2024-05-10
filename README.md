# telegramcryptolookout

Dependencies needed:
- bun (or node js) https://bun.sh
- Ollama https://ollama.ai
- In ollama, install gemma-2b:instruct and phi3:instruct
- use command below for all modelfiles to get those settings working (current code uses names phi3-coin-name and phi3-decision from those respective modelfiles)
```bash
ollama create <name> -f <path>
```

To install JS dependencies:

```bash
bun install
```

To run:

```bash
bun main.js
```

This project was created using `bun init` in bun v1.0.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

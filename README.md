# Atlas One-Hour MVP

A deployable demonstration containing:

- an Express API protected by x402 v2;
- Base Sepolia payment configuration;
- a deterministic Solidity risk analyzer;
- a free web preview;
- an automated paying buyer script;
- a fixed-supply test token contract;
- a minimal ERC-20 job escrow;
- ERC-8004-oriented agent metadata.

## What this is not

It is not an audit, production escrow, token sale, liquidity launch, legal review, or promise of profit. Keep the contracts on testnet until they have tests and independent review.

## 1. Start the API

Requirements: Node.js 22+.

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm run check
npm start
```

In `.env`, replace `PAY_TO` with your public EVM receiving address.

Open:

```text
http://localhost:4021
```

Health check:

```powershell
curl http://localhost:4021/health
```

Unpaid protected request — it should return HTTP 402:

```powershell
curl.exe -i -X POST http://localhost:4021/api/analyze `
  -H "content-type: application/json" `
  -d "{\"source\":\"pragma solidity ^0.8.24; contract A{}\"}"
```

## 2. Run a real testnet paid call

Use a separate test wallet only. Put its private key in `.env` as `EVM_PRIVATE_KEY`.
Fund that address with Base Sepolia test USDC, then:

```powershell
npm run buy
```

Never paste a main wallet private key into chat, Git, screenshots, or Railway.

## 3. Deploy to Railway

1. Push this folder to a new GitHub repository.
2. In Railway, create a project from the repository.
3. Add variables: `PAY_TO`, `X402_NETWORK=eip155:84532`, `PRICE=$0.01`,
   `FACILITATOR_URL=https://x402.org/facilitator`.
4. Generate a public domain.
5. Check `/health`, then change `API_URL` locally to the public URL and run `npm run buy`.

## 4. Contracts

The files in `contracts/` are deliberately isolated from the API launch path so the paid service can ship first.

Fastest testnet route: open Remix, import OpenZeppelin dependencies, compile with Solidity 0.8.24, and deploy on Base Sepolia.

- `AtlasToken.sol`: fixed 1 billion test token supply.
- `AtlasEscrow.sol`: client funds a job; provider submits; evaluator completes or rejects.

Do not deploy either contract on mainnet without tests, threat modeling, and independent review.

## 5. 60-minute order

- 0–10: configure `.env`, install, local health check.
- 10–20: confirm the unpaid endpoint returns 402.
- 20–35: fund a test buyer and complete one paid request.
- 35–50: GitHub + Railway deployment.
- 50–60: public paid request, update `agent/agent.json`, publish README.

Token and escrow are included, but public mainnet issuance is intentionally outside this one-hour demo.

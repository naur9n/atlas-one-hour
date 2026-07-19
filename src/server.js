import { facilitator } from "@coinbase/x402";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { paymentMiddleware } from "@x402/express";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { analyzeSource } from "./analyzer.js";

const app = express();
const port = Number(process.env.PORT || 4021);
const payTo = process.env.PAY_TO;
const network = process.env.X402_NETWORK || "eip155:84532";
const price = process.env.PRICE || "$0.01";
const facilitatorUrl =
  process.env.FACILITATOR_URL || "https://x402.org/facilitator";

if (!payTo || !/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
  console.error("PAY_TO must be a valid EVM address. Copy .env.example to .env.");
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(express.static("public"));

const facilitatorClient = new HTTPFacilitatorClient(facilitator);
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(resourceServer);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Atlas Solidity Risk API",
    network,
    price
  });
});

app.post("/api/demo", (req, res) => {
  const source = String(req.body?.source || "");
  if (!source.trim()) {
    return res.status(400).json({ error: "source is required" });
  }
  const preview = source.slice(0, 1500);
  const result = analyzeSource(preview);
  res.json({
    ...result,
    demo: true,
    note: "The demo only scans the first 1,500 characters. The paid endpoint scans the full submitted source."
  });
});

app.use(
  paymentMiddleware(
    {
      "POST /api/analyze": {
        accepts: [
          {
            scheme: "exact",
            price,
            network,
            payTo
          }
        ],
        description:
          "Analyze submitted Solidity source with deterministic security heuristics.",
        mimeType: "application/json"
      }
    },
    resourceServer
  )
);

app.post("/api/analyze", (req, res) => {
  const source = String(req.body?.source || "");
  if (!source.trim()) {
    return res.status(400).json({ error: "source is required" });
  }
  if (source.length > 250_000) {
    return res.status(413).json({ error: "source exceeds 250,000 characters" });
  }

  res.json({
    ...analyzeSource(source),
    paid: true,
    service: "Atlas Solidity Risk API",
    generatedAt: new Date().toISOString()
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal_server_error" });
});

app.listen(port, () => {
  console.log(`Atlas API listening on http://localhost:${port}`);
  console.log(`Paid endpoint: POST /api/analyze — ${price} on ${network}`);
});

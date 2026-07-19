import "dotenv/config";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.EVM_PRIVATE_KEY;
const apiUrl = process.env.API_URL || "http://localhost:4021";

if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
  throw new Error("Set a test-wallet EVM_PRIVATE_KEY in .env");
}

const client = new x402Client();
registerExactEvmScheme(client, {
  signer: privateKeyToAccount(privateKey)
});

const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);

const sampleSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Example {
    address public owner;
    constructor() { owner = msg.sender; }

    function execute(address target, bytes calldata data) external {
        require(tx.origin == owner, "not owner");
        (bool ok,) = target.call(data);
        require(ok, "call failed");
    }
}
`;

const response = await fetchWithPayment(`${apiUrl}/api/analyze`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ source: sampleSource })
});

console.log("status:", response.status);
console.log("payment-response:", response.headers.get("payment-response"));
console.dir(await response.json(), { depth: null });

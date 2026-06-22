// A seller agent's HTTP service. It only serves a request AFTER verifying that the
// caller paid the matching PayPerCall endpoint on-chain.
//
// Because PayPerCall's CallReceipt has no "consumed" flag, a paid callId could be
// replayed. The seller therefore keeps an off-chain "served" set so each callId is
// honored exactly once (the missing half of the receipt gate).

import { createServer, type IncomingMessage } from "node:http";
import { getReceipt, verifyReceipt } from "./payments.ts";
import type { NetworkName } from "./chain.ts";

export type SellerConfig = {
  name: string; // service name == the PayPerCall endpoint "name"
  capability: string; // human/LLM-readable description, surfaced in the descriptor
  endpointId: `0x${string}`;
  priceWei: string;
  network?: NetworkName; // default "testnet"
  handle: (input: unknown) => Promise<unknown>; // the actual micro-service
};

export function createSellerService(cfg: SellerConfig) {
  const network = cfg.network ?? "testnet";
  const served = new Set<string>(); // callIds already honored (replay guard)

  return createServer(async (req, res) => {
    try {
      // Service descriptor for discovery.
      if (req.method === "GET" && req.url?.startsWith("/.well-known/obol.json")) {
        return json(res, 200, {
          name: cfg.name,
          capability: cfg.capability,
          endpointId: cfg.endpointId,
          priceWei: cfg.priceWei,
          network,
        });
      }

      // Paid serving.
      if (req.method === "POST" && req.url?.startsWith("/serve")) {
        const url = new URL(req.url, "http://localhost");
        const callIdStr = url.searchParams.get("callId");
        const payer = url.searchParams.get("payer") ?? "";
        if (callIdStr === null) return json(res, 400, { error: "missing callId" });

        const callId = BigInt(callIdStr);
        if (served.has(callIdStr)) return json(res, 409, { error: "callId already used" });

        let receipt;
        try {
          receipt = await getReceipt(callId, network);
        } catch {
          return json(res, 402, { error: "payment required / receipt not found" });
        }
        if (!verifyReceipt(receipt, { endpointId: cfg.endpointId, expectedPayer: payer })) {
          return json(res, 402, { error: "payment required / receipt does not match" });
        }

        served.add(callIdStr); // mark consumed before doing the work
        const body = await readJson(req);
        const result = await cfg.handle(body);
        return json(res, 200, { callId: callIdStr, result });
      }

      json(res, 404, { error: "not found" });
    } catch (err) {
      json(res, 500, { error: String((err as Error)?.message ?? err) });
    }
  });
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

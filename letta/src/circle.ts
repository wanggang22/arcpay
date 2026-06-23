// Circle User-Controlled Wallets — email/PIN login that gives a non-crypto user an Arc
// wallet (no MetaMask, no seed phrase). This is the production onboarding path.
//
// Verified working on ARC-TESTNET: create user -> session token -> wallet-init challenge
// all return 2xx. The frontend Web SDK consumes the challengeId so the user sets a PIN and
// Circle creates + secures the wallet. Credentials live in ~/.claude-apis.env
// (CIRCLE_API_KEY + CIRCLE_APP_ID), never committed.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = "https://api.circle.com/v1/w3s";

function creds(): { apiKey: string; appId: string } {
  let apiKey = process.env.CIRCLE_API_KEY ?? "";
  let appId = process.env.CIRCLE_APP_ID ?? "";
  if (!apiKey || !appId) {
    try {
      const env = readFileSync(join(homedir(), ".claude-apis.env"), "utf8");
      apiKey = apiKey || (env.match(/^CIRCLE_API_KEY=(.+)$/m)?.[1]?.trim() ?? "");
      appId = appId || (env.match(/^CIRCLE_APP_ID=(.+)$/m)?.[1]?.trim() ?? "");
    } catch {
      /* file may not exist */
    }
  }
  return { apiKey, appId };
}

export function circleConfigured(): boolean {
  const c = creds();
  return !!c.apiKey && !!c.appId;
}
export function circleAppId(): string {
  return creds().appId;
}

async function circle(path: string, opts: { method?: string; body?: unknown; userToken?: string } = {}): Promise<any> {
  const headers: Record<string, string> = { Authorization: `Bearer ${creds().apiKey}`, "Content-Type": "application/json" };
  if (opts.userToken) headers["X-User-Token"] = opts.userToken;
  const res = await fetch(BASE + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Circle ${path} ${res.status}: ${JSON.stringify(json).slice(0, 180)}`);
  return json.data ?? json;
}

const uuid = () => globalThis.crypto.randomUUID();

/** Email-login signup: create a Circle user, mint a session token, and start wallet
 *  creation on Arc. Returns everything the Web SDK needs to run the PIN challenge. */
export async function circleSignup(email: string): Promise<{
  userId: string;
  userToken: string;
  encryptionKey: string;
  challengeId: string;
  appId: string;
}> {
  const userId = `letta-${email.replace(/[^a-zA-Z0-9._-]/g, "_")}-${uuid().slice(0, 8)}`;
  await circle("/users", { method: "POST", body: { userId } });
  const tok = await circle("/users/token", { method: "POST", body: { userId } });
  const init = await circle("/user/initialize", {
    method: "POST",
    userToken: tok.userToken,
    body: { idempotencyKey: uuid(), accountType: "EOA", blockchains: ["ARC-TESTNET"] },
  });
  return { userId, userToken: tok.userToken, encryptionKey: tok.encryptionKey, challengeId: init.challengeId, appId: creds().appId };
}

/** After the user completes the PIN challenge, fetch their Arc wallet address. */
export async function circleWallet(userToken: string): Promise<{ address: string; id: string; blockchain: string } | null> {
  const res = await circle("/wallets", { userToken });
  const wallets = res.wallets ?? [];
  const w = wallets.find((x: any) => x.blockchain === "ARC-TESTNET") ?? wallets[0];
  return w ? { address: w.address, id: w.id, blockchain: w.blockchain } : null;
}

/** Create a transaction challenge to call a contract from the user's Circle wallet
 *  (e.g., deposit into LettaPool). The Web SDK signs it with the user's PIN. */
export async function circleContractExecution(p: {
  userToken: string;
  walletId: string;
  contractAddress: string;
  abiFunctionSignature: string; // e.g. "deposit()"
  abiParameters?: unknown[];
  amount?: string; // native USDC amount (decimal string), for payable calls
}): Promise<{ challengeId: string }> {
  const init = await circle("/user/transactions/contractExecution", {
    method: "POST",
    userToken: p.userToken,
    body: {
      idempotencyKey: uuid(),
      walletId: p.walletId,
      contractAddress: p.contractAddress,
      abiFunctionSignature: p.abiFunctionSignature,
      abiParameters: p.abiParameters ?? [],
      ...(p.amount ? { amount: p.amount } : {}),
      feeLevel: "MEDIUM",
    },
  });
  return { challengeId: init.challengeId };
}

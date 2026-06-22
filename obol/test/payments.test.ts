import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeEventTopics, encodeAbiParameters } from "viem";
import { parseCallIdFromLogs, verifyReceipt, type CallReceipt } from "../src/payments.ts";
import { payPerCallAbi } from "../src/abi.ts";

const endpointId = ("0x" + "11".repeat(32)) as `0x${string}`;
const payer = ("0x" + "22".repeat(20)) as `0x${string}`;

test("parseCallIdFromLogs extracts callId from a Paid event log", () => {
  const topics = encodeEventTopics({
    abi: payPerCallAbi,
    eventName: "Paid",
    args: { callId: 7n, endpointId, payer },
  });
  const data = encodeAbiParameters([{ type: "uint256" }], [1000n]); // amount (non-indexed)
  const callId = parseCallIdFromLogs([
    { address: ("0x" + "33".repeat(20)) as `0x${string}`, topics, data } as never,
  ]);
  assert.equal(callId, 7n);
});

test("parseCallIdFromLogs handles callId 0 (first call)", () => {
  const topics = encodeEventTopics({
    abi: payPerCallAbi,
    eventName: "Paid",
    args: { callId: 0n, endpointId, payer },
  });
  const data = encodeAbiParameters([{ type: "uint256" }], [1000n]);
  const callId = parseCallIdFromLogs([
    { address: ("0x" + "33".repeat(20)) as `0x${string}`, topics, data } as never,
  ]);
  assert.equal(callId, 0n);
});

test("parseCallIdFromLogs throws when no Paid event present", () => {
  assert.throws(() => parseCallIdFromLogs([]), /no Paid event/);
});

const receipt = (over: Partial<CallReceipt> = {}): CallReceipt => ({
  callId: 1n,
  endpointId,
  payer,
  amount: 1000n,
  timestamp: 0n,
  ...over,
});

test("verifyReceipt accepts a matching (endpoint, payer)", () => {
  assert.equal(verifyReceipt(receipt(), { endpointId, expectedPayer: payer }), true);
});

test("verifyReceipt is case-insensitive on addresses/ids", () => {
  assert.equal(
    verifyReceipt(receipt(), { endpointId: endpointId.toUpperCase(), expectedPayer: payer.toUpperCase() }),
    true,
  );
});

test("verifyReceipt rejects a wrong payer", () => {
  const otherPayer = ("0x" + "99".repeat(20)) as `0x${string}`;
  assert.equal(verifyReceipt(receipt(), { endpointId, expectedPayer: otherPayer }), false);
});

test("verifyReceipt rejects a wrong endpoint", () => {
  const otherEndpoint = ("0x" + "ab".repeat(32)) as `0x${string}`;
  assert.equal(verifyReceipt(receipt(), { endpointId: otherEndpoint, expectedPayer: payer }), false);
});

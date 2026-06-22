// ABIs Letta talks to.
// - factoringPoolAbi: the deployed FactoringPool (fund / repay / waterfall + views).
// - payPerCallPaidAbi: just the Paid event from ArcPay's PayPerCall, read as the
//   buyer's on-chain payment history (the credit signal the agent reasons over).

export const factoringPoolAbi = [
  {
    type: "function",
    name: "fundInvoice",
    stateMutability: "payable",
    inputs: [
      { name: "invoiceId", type: "bytes32" },
      { name: "supplier", type: "address" },
      { name: "buyer", type: "address" },
      { name: "faceValue", type: "uint256" },
      { name: "advance", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "repay",
    stateMutability: "payable",
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getInvoice",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "supplier", type: "address" },
          { name: "buyer", type: "address" },
          { name: "faceValue", type: "uint256" },
          { name: "advance", type: "uint256" },
          { name: "fee", type: "uint256" },
          { name: "collected", type: "uint256" },
          { name: "factorPaid", type: "uint256" },
          { name: "supplierPaid", type: "uint256" },
          { name: "funded", type: "bool" },
          { name: "settled", type: "bool" },
        ],
      },
    ],
  },
  { type: "function", name: "factor", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "event",
    name: "Funded",
    inputs: [
      { name: "invoiceId", type: "bytes32", indexed: true },
      { name: "supplier", type: "address", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "faceValue", type: "uint256", indexed: false },
      { name: "advance", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Repaid",
    inputs: [
      { name: "invoiceId", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "toFactor", type: "uint256", indexed: false },
      { name: "toSupplier", type: "uint256", indexed: false },
      { name: "isPartial", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WaterfallSettled",
    inputs: [
      { name: "invoiceId", type: "bytes32", indexed: true },
      { name: "totalCollected", type: "uint256", indexed: false },
    ],
  },
] as const;

// Minimal PayPerCall write surface, used only to establish the buyer's on-chain
// payment history in-window (real Paid events the agent later underwrites).
export const payPerCallAbi = [
  {
    type: "function",
    name: "pay",
    stateMutability: "payable",
    inputs: [{ name: "endpointId", type: "bytes32" }],
    outputs: [{ name: "callId", type: "uint256" }],
  },
] as const;

export const payPerCallPaidAbi = [
  {
    type: "event",
    name: "Paid",
    inputs: [
      { name: "callId", type: "uint256", indexed: true },
      { name: "endpointId", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

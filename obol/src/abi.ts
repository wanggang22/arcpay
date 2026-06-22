// Minimal PayPerCall ABI fragment used by Obol.
// Extracted verbatim from contracts/out/PayPerCall.sol/PayPerCall.json (Foundry build artifact).
// Only the functions/events the agent layer needs; `as const` so viem infers exact types.

export const payPerCallAbi = [
  {
    type: "function",
    name: "registerEndpoint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "username", type: "string" },
      { name: "name", type: "string" },
      { name: "pricePerCall", type: "uint256" },
    ],
    outputs: [{ name: "endpointId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "pay",
    stateMutability: "payable",
    inputs: [{ name: "endpointId", type: "bytes32" }],
    outputs: [{ name: "callId", type: "uint256" }],
  },
  {
    type: "function",
    name: "batchPay",
    stateMutability: "payable",
    inputs: [
      { name: "endpointId", type: "bytes32" },
      { name: "count", type: "uint256" },
    ],
    outputs: [{ name: "firstCallId", type: "uint256" }],
  },
  {
    type: "function",
    name: "payByName",
    stateMutability: "payable",
    inputs: [
      { name: "username", type: "string" },
      { name: "name", type: "string" },
    ],
    outputs: [{ name: "callId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getEndpoint",
    stateMutability: "view",
    inputs: [{ name: "endpointId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creatorHash", type: "bytes32" },
          { name: "name", type: "string" },
          { name: "pricePerCall", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "totalCalls", type: "uint256" },
          { name: "totalRevenue", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getEndpointByName",
    stateMutability: "view",
    inputs: [
      { name: "username", type: "string" },
      { name: "name", type: "string" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creatorHash", type: "bytes32" },
          { name: "name", type: "string" },
          { name: "pricePerCall", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "totalCalls", type: "uint256" },
          { name: "totalRevenue", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getReceipt",
    stateMutability: "view",
    inputs: [{ name: "callId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "callId", type: "uint256" },
          { name: "endpointId", type: "bytes32" },
          { name: "payer", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "Paid",
    anonymous: false,
    inputs: [
      { name: "callId", type: "uint256", indexed: true },
      { name: "endpointId", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

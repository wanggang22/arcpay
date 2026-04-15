"""Compact ABIs for ArcPay contracts (Python dict format for web3.py)."""

REGISTRY_ABI = [
    {"type": "function", "name": "register", "stateMutability": "nonpayable",
     "inputs": [{"name": "username", "type": "string"}, {"name": "displayName", "type": "string"}, {"name": "metadataURI", "type": "string"}], "outputs": []},
    {"type": "function", "name": "exists", "stateMutability": "view",
     "inputs": [{"name": "username", "type": "string"}], "outputs": [{"type": "bool"}]},
    {"type": "function", "name": "getPayoutAddress", "stateMutability": "view",
     "inputs": [{"name": "username", "type": "string"}], "outputs": [{"type": "address"}]},
    {"type": "function", "name": "getCreator", "stateMutability": "view",
     "inputs": [{"name": "username", "type": "string"}],
     "outputs": [{"type": "tuple", "components": [
         {"name": "payoutAddress", "type": "address"},
         {"name": "registeredAt", "type": "uint256"},
         {"name": "displayName", "type": "string"},
         {"name": "metadataURI", "type": "string"},
         {"name": "verified", "type": "bool"},
     ]}]},
]

TIPJAR_ABI = [
    {"type": "function", "name": "tip", "stateMutability": "payable",
     "inputs": [{"name": "username", "type": "string"}, {"name": "message", "type": "string"}], "outputs": []},
    {"type": "function", "name": "tipAddress", "stateMutability": "payable",
     "inputs": [{"name": "recipient", "type": "address"}, {"name": "message", "type": "string"}], "outputs": []},
    {"type": "function", "name": "getLifetimeReceived", "stateMutability": "view",
     "inputs": [{"name": "username", "type": "string"}], "outputs": [{"type": "uint256"}]},
    {"type": "function", "name": "getTipsByCreator", "stateMutability": "view",
     "inputs": [{"name": "username", "type": "string"}], "outputs": [{"type": "uint256[]"}]},
]

SUBSCRIPTIONS_ABI = [
    {"type": "function", "name": "createPlan", "stateMutability": "nonpayable",
     "inputs": [{"name": "username", "type": "string"}, {"name": "name", "type": "string"}, {"name": "pricePerMonth", "type": "uint256"}, {"name": "metadataURI", "type": "string"}],
     "outputs": [{"type": "uint256"}]},
    {"type": "function", "name": "subscribe", "stateMutability": "payable",
     "inputs": [{"name": "planId", "type": "uint256"}, {"name": "months", "type": "uint256"}], "outputs": [{"type": "uint256"}]},
    {"type": "function", "name": "cancel", "stateMutability": "nonpayable",
     "inputs": [{"name": "subId", "type": "uint256"}], "outputs": []},
    {"type": "function", "name": "withdraw", "stateMutability": "nonpayable",
     "inputs": [{"name": "username", "type": "string"}], "outputs": []},
    {"type": "function", "name": "isActive", "stateMutability": "view",
     "inputs": [{"name": "subscriber", "type": "address"}, {"name": "planId", "type": "uint256"}], "outputs": [{"type": "bool"}]},
    {"type": "function", "name": "getPlan", "stateMutability": "view",
     "inputs": [{"name": "planId", "type": "uint256"}],
     "outputs": [{"type": "tuple", "components": [
         {"name": "creatorHash", "type": "bytes32"},
         {"name": "name", "type": "string"},
         {"name": "pricePerMonth", "type": "uint256"},
         {"name": "metadataURI", "type": "string"},
         {"name": "active", "type": "bool"},
     ]}]},
]

CONTENT_PAYWALL_ABI = [
    {"type": "function", "name": "createContent", "stateMutability": "nonpayable",
     "inputs": [{"name": "username", "type": "string"}, {"name": "contentId", "type": "bytes32"}, {"name": "price", "type": "uint256"}, {"name": "metadataURI", "type": "string"}], "outputs": []},
    {"type": "function", "name": "purchase", "stateMutability": "payable",
     "inputs": [{"name": "contentId", "type": "bytes32"}], "outputs": []},
    {"type": "function", "name": "checkAccess", "stateMutability": "view",
     "inputs": [{"name": "contentId", "type": "bytes32"}, {"name": "user", "type": "address"}], "outputs": [{"type": "bool"}]},
    {"type": "function", "name": "withdraw", "stateMutability": "nonpayable",
     "inputs": [{"name": "username", "type": "string"}], "outputs": []},
]

PAYPERCALL_ABI = [
    {"type": "function", "name": "registerEndpoint", "stateMutability": "nonpayable",
     "inputs": [{"name": "username", "type": "string"}, {"name": "name", "type": "string"}, {"name": "pricePerCall", "type": "uint256"}],
     "outputs": [{"type": "bytes32"}]},
    {"type": "function", "name": "payByName", "stateMutability": "payable",
     "inputs": [{"name": "username", "type": "string"}, {"name": "name", "type": "string"}],
     "outputs": [{"type": "uint256"}]},
    {"type": "function", "name": "withdraw", "stateMutability": "nonpayable",
     "inputs": [{"name": "username", "type": "string"}], "outputs": []},
    {"type": "function", "name": "getEndpointByName", "stateMutability": "view",
     "inputs": [{"name": "username", "type": "string"}, {"name": "name", "type": "string"}],
     "outputs": [{"type": "tuple", "components": [
         {"name": "creatorHash", "type": "bytes32"},
         {"name": "name", "type": "string"},
         {"name": "pricePerCall", "type": "uint256"},
         {"name": "active", "type": "bool"},
         {"name": "totalCalls", "type": "uint256"},
         {"name": "totalRevenue", "type": "uint256"},
     ]}]},
    {"type": "function", "name": "getReceipt", "stateMutability": "view",
     "inputs": [{"name": "callId", "type": "uint256"}],
     "outputs": [{"type": "tuple", "components": [
         {"name": "callId", "type": "uint256"},
         {"name": "endpointId", "type": "bytes32"},
         {"name": "payer", "type": "address"},
         {"name": "amount", "type": "uint256"},
         {"name": "timestamp", "type": "uint256"},
     ]}]},
]

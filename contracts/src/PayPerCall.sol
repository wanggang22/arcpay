// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./UsernameRegistry.sol";

/// @title ArcPay PayPerCall
/// @notice Pay-per-API-call billing. Creators register endpoints, clients pay per call.
/// @dev Compatible with x402 HTTP flow. Each payment emits a receipt; server verifies off-chain.
contract PayPerCall {
    UsernameRegistry public immutable registry;

    struct Endpoint {
        bytes32 creatorHash;
        string name;              // e.g., "chat-completion" or URL path
        uint256 pricePerCall;     // in Arc USDC wei
        bool active;
        uint256 totalCalls;
        uint256 totalRevenue;
    }

    mapping(bytes32 => Endpoint) public endpoints; // endpointId → Endpoint (endpointId = keccak(username || name))
    mapping(bytes32 => bytes32[]) public creatorEndpoints;
    mapping(bytes32 => uint256) public creatorRevenue;
    mapping(bytes32 => uint256) public creatorWithdrawn;

    uint256 public callCounter;
    struct CallReceipt {
        uint256 callId;
        bytes32 endpointId;
        address payer;
        uint256 amount;
        uint256 timestamp;
    }
    mapping(uint256 => CallReceipt) public receipts;

    uint256 public protocolFeeBps;
    address public protocolFeeRecipient;
    uint256 public accumulatedProtocolFees;
    address public admin;

    event EndpointRegistered(bytes32 indexed endpointId, bytes32 indexed creatorHash, string name, uint256 price);
    event EndpointUpdated(bytes32 indexed endpointId, bool active, uint256 newPrice);
    event Paid(uint256 indexed callId, bytes32 indexed endpointId, address indexed payer, uint256 amount);
    event CreatorWithdrew(bytes32 indexed creatorHash, uint256 amount);

    error EndpointNotFound();
    error EndpointInactive();
    error WrongPayment();
    error NotCreator();
    error TransferFailed();
    error NotAdmin();

    modifier onlyAdmin() { if (msg.sender != admin) revert NotAdmin(); _; }

    constructor(address _registry, uint256 _protocolFeeBps, address _feeRecipient) {
        registry = UsernameRegistry(_registry);
        admin = msg.sender;
        require(_protocolFeeBps <= 1000, "fee too high");
        protocolFeeBps = _protocolFeeBps;
        protocolFeeRecipient = _feeRecipient;
    }

    function registerEndpoint(string calldata username, string calldata name, uint256 pricePerCall) external returns (bytes32 endpointId) {
        address payout = registry.getPayoutAddress(username);
        if (payout != msg.sender) revert NotCreator();

        endpointId = _endpointId(username, name);
        bytes32 h = keccak256(bytes(username));
        endpoints[endpointId] = Endpoint({
            creatorHash: h,
            name: name,
            pricePerCall: pricePerCall,
            active: true,
            totalCalls: 0,
            totalRevenue: 0
        });
        creatorEndpoints[h].push(endpointId);
        emit EndpointRegistered(endpointId, h, name, pricePerCall);
    }

    function updateEndpoint(string calldata username, string calldata name, bool active, uint256 newPrice) external {
        address payout = registry.getPayoutAddress(username);
        if (payout != msg.sender) revert NotCreator();
        bytes32 endpointId = _endpointId(username, name);
        Endpoint storage e = endpoints[endpointId];
        if (e.creatorHash == bytes32(0)) revert EndpointNotFound();
        e.active = active;
        if (newPrice != 0) e.pricePerCall = newPrice;
        emit EndpointUpdated(endpointId, active, newPrice);
    }

    /// @notice Pay for one API call. Server uses callId + tx hash to verify off-chain.
    function pay(bytes32 endpointId) external payable returns (uint256 callId) {
        Endpoint storage e = endpoints[endpointId];
        if (e.creatorHash == bytes32(0)) revert EndpointNotFound();
        if (!e.active) revert EndpointInactive();
        if (msg.value != e.pricePerCall) revert WrongPayment();

        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 net = msg.value - fee;

        callId = callCounter++;
        receipts[callId] = CallReceipt({
            callId: callId,
            endpointId: endpointId,
            payer: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        });
        e.totalCalls += 1;
        e.totalRevenue += msg.value;
        creatorRevenue[e.creatorHash] += net;
        accumulatedProtocolFees += fee;

        emit Paid(callId, endpointId, msg.sender, msg.value);
    }

    /// @notice Buy `count` call credits in a single transaction. Emits `count` Paid events.
    /// @dev Used by clients/agents that want to prepay multiple API calls up-front.
    function batchPay(bytes32 endpointId, uint256 count) external payable returns (uint256 firstCallId) {
        if (count == 0) revert WrongPayment();
        Endpoint storage e = endpoints[endpointId];
        if (e.creatorHash == bytes32(0)) revert EndpointNotFound();
        if (!e.active) revert EndpointInactive();
        if (msg.value != e.pricePerCall * count) revert WrongPayment();

        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 net = msg.value - fee;

        firstCallId = callCounter;
        uint256 per = e.pricePerCall;
        for (uint256 i = 0; i < count; i++) {
            uint256 callId = callCounter++;
            receipts[callId] = CallReceipt({
                callId: callId,
                endpointId: endpointId,
                payer: msg.sender,
                amount: per,
                timestamp: block.timestamp
            });
            emit Paid(callId, endpointId, msg.sender, per);
        }

        e.totalCalls += count;
        e.totalRevenue += msg.value;
        creatorRevenue[e.creatorHash] += net;
        accumulatedProtocolFees += fee;
    }

    /// @notice Helper: pay by (username, name) without computing id client-side
    function payByName(string calldata username, string calldata name) external payable returns (uint256 callId) {
        bytes32 id = _endpointId(username, name);
        Endpoint storage e = endpoints[id];
        if (e.creatorHash == bytes32(0)) revert EndpointNotFound();
        if (!e.active) revert EndpointInactive();
        if (msg.value != e.pricePerCall) revert WrongPayment();

        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 net = msg.value - fee;

        callId = callCounter++;
        receipts[callId] = CallReceipt({
            callId: callId,
            endpointId: id,
            payer: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        });
        e.totalCalls += 1;
        e.totalRevenue += msg.value;
        creatorRevenue[e.creatorHash] += net;
        accumulatedProtocolFees += fee;

        emit Paid(callId, id, msg.sender, msg.value);
    }

    function withdraw(string calldata username) external {
        address payout = registry.getPayoutAddress(username);
        if (payout != msg.sender) revert NotCreator();
        bytes32 h = keccak256(bytes(username));
        uint256 available = creatorRevenue[h] - creatorWithdrawn[h];
        if (available == 0) return;
        creatorWithdrawn[h] += available;
        (bool ok,) = payout.call{value: available}("");
        if (!ok) revert TransferFailed();
        emit CreatorWithdrew(h, available);
    }

    function setProtocolFee(uint256 newBps) external onlyAdmin {
        require(newBps <= 1000, "fee too high");
        protocolFeeBps = newBps;
    }

    function withdrawProtocolFees() external onlyAdmin {
        uint256 amt = accumulatedProtocolFees;
        accumulatedProtocolFees = 0;
        (bool ok,) = protocolFeeRecipient.call{value: amt}("");
        if (!ok) revert TransferFailed();
    }

    // ─── Views ───────────────────────────────────────────────────

    function getEndpoint(bytes32 endpointId) external view returns (Endpoint memory) {
        return endpoints[endpointId];
    }

    function getEndpointByName(string calldata username, string calldata name) external view returns (Endpoint memory) {
        return endpoints[_endpointId(username, name)];
    }

    function getCreatorEndpoints(string calldata username) external view returns (bytes32[] memory) {
        return creatorEndpoints[keccak256(bytes(username))];
    }

    function getReceipt(uint256 callId) external view returns (CallReceipt memory) {
        return receipts[callId];
    }

    function claimableRevenue(string calldata username) external view returns (uint256) {
        bytes32 h = keccak256(bytes(username));
        return creatorRevenue[h] - creatorWithdrawn[h];
    }

    // ─── Internal ────────────────────────────────────────────────

    function _endpointId(string calldata username, string calldata name) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(username, ":", name));
    }
}

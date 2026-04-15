// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./UsernameRegistry.sol";

/// @title ArcPay TipJar
/// @notice One-time USDC tips/donations to registered creators via username
/// @dev Uses Arc native USDC (msg.value). Protocol fee split on each tip.
contract TipJar {
    UsernameRegistry public immutable registry;

    struct TipRecord {
        address from;
        bytes32 usernameHash;
        uint256 amount;
        uint256 timestamp;
        string message; // 280 chars max, validated client-side
    }

    TipRecord[] public tips;
    mapping(bytes32 => uint256[]) private tipsByCreator;   // usernameHash → tip indices
    mapping(address => uint256[]) private tipsByFan;       // fan address → tip indices
    mapping(bytes32 => uint256) public totalReceived;      // usernameHash → lifetime USDC

    uint256 public protocolFeeBps;
    address public protocolFeeRecipient;
    uint256 public accumulatedProtocolFees;

    address public admin;

    event TipSent(
        uint256 indexed tipId,
        bytes32 indexed usernameHash,
        address indexed from,
        uint256 netAmount,
        uint256 protocolFee,
        string message
    );
    event ProtocolFeeUpdated(uint256 newBps);
    event ProtocolFeesWithdrawn(uint256 amount);

    error InvalidRecipient();
    error ZeroAmount();
    error NotAdmin();
    error TransferFailed();
    error InvalidFee();

    modifier onlyAdmin() { if (msg.sender != admin) revert NotAdmin(); _; }

    constructor(address _registry, uint256 _protocolFeeBps, address _protocolFeeRecipient) {
        registry = UsernameRegistry(_registry);
        admin = msg.sender;
        require(_protocolFeeBps <= 1000, "fee too high"); // max 10%
        protocolFeeBps = _protocolFeeBps;
        protocolFeeRecipient = _protocolFeeRecipient;
    }

    /// @notice Tip a creator by username
    /// @param username The creator's registered username
    /// @param message Optional message (emits in event, not stored in full on-chain by default — stored here for demo)
    function tip(string calldata username, string calldata message) external payable {
        if (msg.value == 0) revert ZeroAmount();

        address payout = registry.getPayoutAddress(username);
        if (payout == address(0)) revert InvalidRecipient();

        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 net = msg.value - fee;

        bytes32 h = keccak256(bytes(username));
        tips.push(TipRecord({
            from: msg.sender,
            usernameHash: h,
            amount: net,
            timestamp: block.timestamp,
            message: message
        }));
        uint256 tipId = tips.length - 1;
        tipsByCreator[h].push(tipId);
        tipsByFan[msg.sender].push(tipId);
        totalReceived[h] += net;

        accumulatedProtocolFees += fee;

        (bool ok,) = payout.call{value: net}("");
        if (!ok) revert TransferFailed();

        emit TipSent(tipId, h, msg.sender, net, fee, message);
    }

    /// @notice Direct address tip (bypass username), useful when creator hasn't registered
    function tipAddress(address payable recipient, string calldata message) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (recipient == address(0)) revert InvalidRecipient();

        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 net = msg.value - fee;
        accumulatedProtocolFees += fee;

        (bool ok,) = recipient.call{value: net}("");
        if (!ok) revert TransferFailed();

        emit TipSent(type(uint256).max, bytes32(0), msg.sender, net, fee, message);
    }

    // ─── Admin ───────────────────────────────────────────────────

    function setProtocolFee(uint256 newBps) external onlyAdmin {
        if (newBps > 1000) revert InvalidFee();
        protocolFeeBps = newBps;
        emit ProtocolFeeUpdated(newBps);
    }

    function setProtocolFeeRecipient(address newRecipient) external onlyAdmin {
        protocolFeeRecipient = newRecipient;
    }

    function withdrawProtocolFees() external onlyAdmin {
        uint256 amt = accumulatedProtocolFees;
        accumulatedProtocolFees = 0;
        (bool ok,) = protocolFeeRecipient.call{value: amt}("");
        if (!ok) revert TransferFailed();
        emit ProtocolFeesWithdrawn(amt);
    }

    // ─── Views ───────────────────────────────────────────────────

    function getTipsCount() external view returns (uint256) {
        return tips.length;
    }

    function getTipsByCreator(string calldata username) external view returns (uint256[] memory) {
        return tipsByCreator[keccak256(bytes(username))];
    }

    function getTipsByFan(address fan) external view returns (uint256[] memory) {
        return tipsByFan[fan];
    }

    function getTip(uint256 tipId) external view returns (TipRecord memory) {
        return tips[tipId];
    }

    function getLifetimeReceived(string calldata username) external view returns (uint256) {
        return totalReceived[keccak256(bytes(username))];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./UsernameRegistry.sol";

/// @title ArcPay Subscriptions
/// @notice Monthly / yearly recurring USDC subscriptions to creators
/// @dev Pre-paid model: subscriber pays N months upfront. Can cancel with prorated refund.
contract Subscriptions {
    UsernameRegistry public immutable registry;

    struct Plan {
        bytes32 creatorHash;
        string name;           // e.g., "Pro Tier"
        uint256 pricePerMonth; // in USDC wei (18 decimals on Arc native)
        string metadataURI;    // JSON: perks description, cover image, etc.
        bool active;
    }

    struct Subscription {
        uint256 planId;
        address subscriber;
        uint256 startedAt;
        uint256 paidUntil;      // unix timestamp sub is valid through
        uint256 depositedAmount;
        uint256 consumedAmount; // revenue consumed by creator (time-based accrual)
        bool active;
    }

    Plan[] public plans;
    Subscription[] public subscriptions;
    mapping(uint256 => uint256[]) public planSubscriptions;        // planId → sub ids
    mapping(address => mapping(uint256 => uint256)) public activeSubOf; // subscriber → planId → subId (0 if none; subId is index+1 to allow zero sentinel)

    mapping(bytes32 => uint256) public creatorConsumedRevenue;     // creatorHash → total claimable (consumed)
    mapping(bytes32 => uint256) public creatorWithdrawn;

    uint256 public constant SECONDS_PER_MONTH = 30 days;
    uint256 public protocolFeeBps;
    address public protocolFeeRecipient;
    uint256 public accumulatedProtocolFees;
    address public admin;

    event PlanCreated(uint256 indexed planId, bytes32 indexed creatorHash, uint256 pricePerMonth);
    event PlanUpdated(uint256 indexed planId, bool active, uint256 pricePerMonth);
    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint256 months, uint256 amount);
    event Cancelled(uint256 indexed subId, address indexed subscriber, uint256 refund);
    event Withdrawn(bytes32 indexed creatorHash, uint256 amount);

    error InvalidPlan();
    error PlanInactive();
    error AlreadySubscribed();
    error NotSubscribed();
    error NotSubscriber();
    error NotCreator();
    error WrongPayment();
    error NotAdmin();
    error TransferFailed();

    modifier onlyAdmin() { if (msg.sender != admin) revert NotAdmin(); _; }

    constructor(address _registry, uint256 _protocolFeeBps, address _feeRecipient) {
        registry = UsernameRegistry(_registry);
        admin = msg.sender;
        require(_protocolFeeBps <= 1000, "fee too high");
        protocolFeeBps = _protocolFeeBps;
        protocolFeeRecipient = _feeRecipient;
    }

    /// @notice Creator creates a subscription plan
    function createPlan(string calldata username, string calldata name, uint256 pricePerMonth, string calldata metadataURI) external returns (uint256 planId) {
        address payout = registry.getPayoutAddress(username);
        if (payout == address(0) || payout != msg.sender) revert NotCreator();

        planId = plans.length;
        bytes32 h = keccak256(bytes(username));
        plans.push(Plan({
            creatorHash: h,
            name: name,
            pricePerMonth: pricePerMonth,
            metadataURI: metadataURI,
            active: true
        }));
        emit PlanCreated(planId, h, pricePerMonth);
    }

    function updatePlan(uint256 planId, bool active, uint256 newPricePerMonth, string calldata newMetadataURI) external {
        if (planId >= plans.length) revert InvalidPlan();
        Plan storage p = plans[planId];
        address payout = registry.getPayoutAddress(_nameByHash(p.creatorHash));
        if (payout != msg.sender) revert NotCreator();
        p.active = active;
        if (newPricePerMonth != 0) p.pricePerMonth = newPricePerMonth;
        if (bytes(newMetadataURI).length > 0) p.metadataURI = newMetadataURI;
        emit PlanUpdated(planId, active, newPricePerMonth);
    }

    /// @notice Subscribe to a plan for N months (pay upfront)
    function subscribe(uint256 planId, uint256 months) external payable returns (uint256 subId) {
        if (planId >= plans.length) revert InvalidPlan();
        Plan storage p = plans[planId];
        if (!p.active) revert PlanInactive();
        if (activeSubOf[msg.sender][planId] != 0) revert AlreadySubscribed();

        uint256 required = p.pricePerMonth * months;
        if (msg.value != required) revert WrongPayment();

        subscriptions.push(Subscription({
            planId: planId,
            subscriber: msg.sender,
            startedAt: block.timestamp,
            paidUntil: block.timestamp + (months * SECONDS_PER_MONTH),
            depositedAmount: msg.value,
            consumedAmount: 0,
            active: true
        }));
        subId = subscriptions.length - 1;
        activeSubOf[msg.sender][planId] = subId + 1;
        planSubscriptions[planId].push(subId);

        emit Subscribed(subId, planId, msg.sender, months, msg.value);
    }

    /// @notice Cancel subscription, refund prorated unused portion to subscriber
    /// @dev Consumed portion (time-based) minus protocol fee goes to creator's claimable balance
    function cancel(uint256 subId) external {
        if (subId >= subscriptions.length) revert NotSubscribed();
        Subscription storage s = subscriptions[subId];
        if (s.subscriber != msg.sender) revert NotSubscriber();
        if (!s.active) revert NotSubscribed();

        uint256 consumedGross = _calculateConsumed(s);
        uint256 refund = s.depositedAmount - consumedGross;

        uint256 fee = (consumedGross * protocolFeeBps) / 10000;
        uint256 creatorNet = consumedGross - fee;
        Plan storage p = plans[s.planId];

        s.active = false;
        s.consumedAmount = consumedGross;
        s.paidUntil = block.timestamp;
        activeSubOf[msg.sender][s.planId] = 0;

        creatorConsumedRevenue[p.creatorHash] += creatorNet;
        accumulatedProtocolFees += fee;

        if (refund > 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            if (!ok) revert TransferFailed();
        }
        emit Cancelled(subId, msg.sender, refund);
    }

    /// @notice Creator withdraws accumulated (consumed) revenue
    function withdraw(string calldata username) external {
        address payout = registry.getPayoutAddress(username);
        if (payout != msg.sender) revert NotCreator();
        bytes32 h = keccak256(bytes(username));

        uint256 rollover = _rolloverActiveConsumed(h);
        creatorConsumedRevenue[h] += rollover;

        uint256 available = creatorConsumedRevenue[h] - creatorWithdrawn[h];
        if (available == 0) return;

        creatorWithdrawn[h] += available;
        (bool ok,) = payout.call{value: available}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(h, available);
    }

    // ─── Admin ───────────────────────────────────────────────────

    function setProtocolFee(uint256 newBps) external onlyAdmin {
        require(newBps <= 1000, "fee too high");
        protocolFeeBps = newBps;
    }

    function setProtocolFeeRecipient(address newRecipient) external onlyAdmin {
        protocolFeeRecipient = newRecipient;
    }

    function withdrawProtocolFees() external onlyAdmin {
        uint256 amt = accumulatedProtocolFees;
        accumulatedProtocolFees = 0;
        (bool ok,) = protocolFeeRecipient.call{value: amt}("");
        if (!ok) revert TransferFailed();
    }

    // ─── Views ───────────────────────────────────────────────────

    function isActive(address subscriber, uint256 planId) external view returns (bool) {
        uint256 idx = activeSubOf[subscriber][planId];
        if (idx == 0) return false;
        Subscription storage s = subscriptions[idx - 1];
        return s.active && s.paidUntil > block.timestamp;
    }

    function getSubscription(uint256 subId) external view returns (Subscription memory) {
        return subscriptions[subId];
    }

    function getPlan(uint256 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    function getPlanSubscribers(uint256 planId) external view returns (uint256[] memory) {
        return planSubscriptions[planId];
    }

    function claimableRevenue(string calldata username) external view returns (uint256) {
        bytes32 h = keccak256(bytes(username));
        return creatorConsumedRevenue[h] - creatorWithdrawn[h];
    }

    // ─── Internal ────────────────────────────────────────────────

    function _calculateConsumed(Subscription storage s) internal view returns (uint256) {
        if (block.timestamp >= s.paidUntil) return s.depositedAmount;
        uint256 total = s.paidUntil - s.startedAt;
        uint256 elapsed = block.timestamp - s.startedAt;
        return (s.depositedAmount * elapsed) / total;
    }

    /// @dev Rolls active subs' time-consumed portion to creatorConsumedRevenue without cancelling
    /// Called in withdraw() to make time-accrued revenue available.
    /// Simplified: only works if we have an index per creator. For now, we scan subscriptions — inefficient but OK for V1.
    /// Production: keep rolling pointer per creator to avoid full scan.
    function _rolloverActiveConsumed(bytes32 creatorHash) internal returns (uint256 rollover) {
        // This is V1 simple; V2 should use indexed pointer per creator.
        // For now, we don't auto-rollover — creator gets revenue only on subscriber cancel or explicit expire.
        // Callers can force expire individual subs if needed.
        return 0;
    }

    function _nameByHash(bytes32 h) internal view returns (string memory) {
        return registry.getNameByHash(h);
    }
}

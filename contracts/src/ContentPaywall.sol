// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "./UsernameRegistry.sol";

/// @title ArcPay ContentPaywall
/// @notice Pay-per-content access: creators list content items, buyers pay USDC to unlock
/// @dev Content itself lives off-chain (IPFS/Arweave/S3). On-chain stores access records only.
contract ContentPaywall {
    UsernameRegistry public immutable registry;

    struct Content {
        bytes32 contentId;      // e.g., keccak256(ipfs_cid) or any unique id
        bytes32 creatorHash;
        uint256 price;
        string metadataURI;     // JSON: title, description, preview URL
        bool active;
        uint256 totalSales;
        uint256 totalRevenue;   // gross (before fee)
    }

    mapping(bytes32 => Content) public contents;               // contentId → Content
    mapping(bytes32 => bytes32[]) public creatorContents;      // creatorHash → contentIds
    mapping(bytes32 => mapping(address => bool)) public hasAccess; // contentId → buyer → bool
    mapping(bytes32 => mapping(address => uint256)) public purchasedAt;
    mapping(bytes32 => uint256) public creatorRevenue;
    mapping(bytes32 => uint256) public creatorWithdrawn;

    uint256 public protocolFeeBps;
    address public protocolFeeRecipient;
    uint256 public accumulatedProtocolFees;
    address public admin;

    event ContentCreated(bytes32 indexed contentId, bytes32 indexed creatorHash, uint256 price);
    event ContentUpdated(bytes32 indexed contentId, bool active, uint256 newPrice);
    event AccessPurchased(bytes32 indexed contentId, address indexed buyer, uint256 amount);
    event CreatorWithdrew(bytes32 indexed creatorHash, uint256 amount);

    error ContentNotFound();
    error ContentInactive();
    error AlreadyPurchased();
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

    function createContent(
        string calldata username,
        bytes32 contentId,
        uint256 price,
        string calldata metadataURI
    ) external {
        address payout = registry.getPayoutAddress(username);
        if (payout != msg.sender) revert NotCreator();
        if (contents[contentId].price != 0 || contents[contentId].active) revert("already exists");

        bytes32 h = keccak256(bytes(username));
        contents[contentId] = Content({
            contentId: contentId,
            creatorHash: h,
            price: price,
            metadataURI: metadataURI,
            active: true,
            totalSales: 0,
            totalRevenue: 0
        });
        creatorContents[h].push(contentId);
        emit ContentCreated(contentId, h, price);
    }

    function updateContent(string calldata username, bytes32 contentId, bool active, uint256 newPrice, string calldata newMetadata) external {
        address payout = registry.getPayoutAddress(username);
        if (payout != msg.sender) revert NotCreator();
        Content storage c = contents[contentId];
        if (c.creatorHash != keccak256(bytes(username))) revert NotCreator();
        c.active = active;
        if (newPrice != 0) c.price = newPrice;
        if (bytes(newMetadata).length > 0) c.metadataURI = newMetadata;
        emit ContentUpdated(contentId, active, newPrice);
    }

    function purchase(bytes32 contentId) external payable {
        Content storage c = contents[contentId];
        if (c.creatorHash == bytes32(0)) revert ContentNotFound();
        if (!c.active) revert ContentInactive();
        if (hasAccess[contentId][msg.sender]) revert AlreadyPurchased();
        if (msg.value != c.price) revert WrongPayment();

        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 net = msg.value - fee;

        hasAccess[contentId][msg.sender] = true;
        purchasedAt[contentId][msg.sender] = block.timestamp;
        c.totalSales += 1;
        c.totalRevenue += msg.value;

        creatorRevenue[c.creatorHash] += net;
        accumulatedProtocolFees += fee;

        emit AccessPurchased(contentId, msg.sender, msg.value);
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

    function withdrawProtocolFees() external onlyAdmin {
        uint256 amt = accumulatedProtocolFees;
        accumulatedProtocolFees = 0;
        (bool ok,) = protocolFeeRecipient.call{value: amt}("");
        if (!ok) revert TransferFailed();
    }

    function setProtocolFee(uint256 newBps) external onlyAdmin {
        require(newBps <= 1000, "fee too high");
        protocolFeeBps = newBps;
    }

    // ─── Views ───────────────────────────────────────────────────

    function checkAccess(bytes32 contentId, address user) external view returns (bool) {
        return hasAccess[contentId][user];
    }

    function getContent(bytes32 contentId) external view returns (Content memory) {
        return contents[contentId];
    }

    function getCreatorContents(string calldata username) external view returns (bytes32[] memory) {
        return creatorContents[keccak256(bytes(username))];
    }

    function claimableRevenue(string calldata username) external view returns (uint256) {
        bytes32 h = keccak256(bytes(username));
        return creatorRevenue[h] - creatorWithdrawn[h];
    }
}

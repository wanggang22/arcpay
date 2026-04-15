// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title ArcPay UsernameRegistry
/// @notice Maps human-readable usernames to creator payout addresses
/// @dev Username rules: 3-32 chars, [a-z0-9_-], lowercase enforced off-chain/client
contract UsernameRegistry {
    struct Creator {
        address payoutAddress;
        uint256 registeredAt;
        string displayName;
        string metadataURI; // JSON URI with avatar, bio, social links
        bool verified;
    }

    mapping(bytes32 => Creator) private creators;
    mapping(bytes32 => string) private nameOf; // hash → original string (for enumeration)
    mapping(address => bytes32[]) private addressToUsernames;

    address public owner;
    mapping(address => bool) public verifiers; // trusted verifiers (e.g., Twitter/GitHub oracles)

    event Registered(bytes32 indexed usernameHash, string username, address indexed payoutAddress);
    event PayoutUpdated(bytes32 indexed usernameHash, address newPayoutAddress);
    event MetadataUpdated(bytes32 indexed usernameHash, string newMetadataURI);
    event Verified(bytes32 indexed usernameHash, address verifier);

    error AlreadyRegistered();
    error NotRegistered();
    error NotOwner();
    error InvalidUsername();
    error NotAuthorized();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    constructor() { owner = msg.sender; }

    function register(string calldata username, string calldata displayName, string calldata metadataURI) external {
        _validateUsername(username);
        bytes32 h = _hash(username);
        if (creators[h].registeredAt != 0) revert AlreadyRegistered();

        creators[h] = Creator({
            payoutAddress: msg.sender,
            registeredAt: block.timestamp,
            displayName: displayName,
            metadataURI: metadataURI,
            verified: false
        });
        nameOf[h] = username;
        addressToUsernames[msg.sender].push(h);

        emit Registered(h, username, msg.sender);
    }

    function updatePayout(string calldata username, address newPayout) external {
        bytes32 h = _hash(username);
        Creator storage c = creators[h];
        if (c.registeredAt == 0) revert NotRegistered();
        if (c.payoutAddress != msg.sender) revert NotOwner();
        c.payoutAddress = newPayout;
        emit PayoutUpdated(h, newPayout);
    }

    function updateMetadata(string calldata username, string calldata newDisplayName, string calldata newMetadataURI) external {
        bytes32 h = _hash(username);
        Creator storage c = creators[h];
        if (c.registeredAt == 0) revert NotRegistered();
        if (c.payoutAddress != msg.sender) revert NotOwner();
        c.displayName = newDisplayName;
        c.metadataURI = newMetadataURI;
        emit MetadataUpdated(h, newMetadataURI);
    }

    function verify(string calldata username) external {
        if (!verifiers[msg.sender]) revert NotAuthorized();
        bytes32 h = _hash(username);
        if (creators[h].registeredAt == 0) revert NotRegistered();
        creators[h].verified = true;
        emit Verified(h, msg.sender);
    }

    function setVerifier(address verifier, bool enabled) external onlyOwner {
        verifiers[verifier] = enabled;
    }

    // ─── Views ───────────────────────────────────────────────────

    function getCreator(string calldata username) external view returns (Creator memory) {
        return creators[_hash(username)];
    }

    function getPayoutAddress(string calldata username) external view returns (address) {
        return creators[_hash(username)].payoutAddress;
    }

    function exists(string calldata username) external view returns (bool) {
        return creators[_hash(username)].registeredAt != 0;
    }

    function getUsernamesByAddress(address a) external view returns (bytes32[] memory) {
        return addressToUsernames[a];
    }

    function getNameByHash(bytes32 h) external view returns (string memory) {
        return nameOf[h];
    }

    // ─── Internal ────────────────────────────────────────────────

    function _hash(string calldata username) internal pure returns (bytes32) {
        return keccak256(bytes(username));
    }

    function _validateUsername(string calldata username) internal pure {
        bytes calldata b = bytes(username);
        uint256 len = b.length;
        if (len < 3 || len > 32) revert InvalidUsername();
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) // a-z
                  || (c >= 0x30 && c <= 0x39) // 0-9
                  || c == 0x5f                 // _
                  || c == 0x2d;                // -
            if (!ok) revert InvalidUsername();
        }
    }
}

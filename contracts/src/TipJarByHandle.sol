// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title ArcPay TipJarByHandle
/// @notice Tip any X (Twitter) handle — recipient doesn't need a wallet yet.
/// Tips accumulate as "pending" keyed by handle hash. The handle owner later
/// proves ownership via X OAuth (off-chain), the ArcPay backend issues a signed
/// attestation, and the recipient submits it to claim their USDC.
contract TipJarByHandle {
    struct HandleTip {
        bytes32 handleHash;
        address from;
        uint256 amount;        // net (after fee)
        uint256 timestamp;
        string  message;
    }

    // Storage
    HandleTip[] public tips;
    mapping(bytes32 => uint256[]) public tipsByHandle;
    mapping(address => uint256[]) public tipsByFan;
    mapping(bytes32 => uint256) public pendingByHandle;    // handleHash => net pending
    mapping(bytes32 => uint256) public claimedByHandle;    // handleHash => total claimed

    // Admin
    address public admin;
    address public attestationSigner;       // backend's signing key
    uint256 public protocolFeeBps;          // e.g., 200 = 2%
    address public protocolFeeRecipient;
    uint256 public accumulatedProtocolFees;

    // Events
    event TipByHandle(
        uint256 indexed tipId,
        bytes32 indexed handleHash,
        address indexed from,
        uint256 netAmount,
        uint256 protocolFee,
        string  message,
        string  handlePlain        // indexed stripped string for easier indexing
    );
    event TipClaimed(bytes32 indexed handleHash, address indexed recipient, uint256 amount);
    event AttestationSignerUpdated(address indexed newSigner);
    event ProtocolFeeUpdated(uint256 newBps);

    // Errors
    error ZeroAmount();
    error InvalidHandle();
    error NothingToClaim();
    error Expired();
    error BadSignature();
    error AlreadyClaimed();
    error NotAdmin();
    error TransferFailed();

    modifier onlyAdmin() { if (msg.sender != admin) revert NotAdmin(); _; }

    constructor(address _attestationSigner, uint256 _protocolFeeBps, address _feeRecipient) {
        require(_protocolFeeBps <= 1000, "fee too high");
        admin = msg.sender;
        attestationSigner = _attestationSigner;
        protocolFeeBps = _protocolFeeBps;
        protocolFeeRecipient = _feeRecipient;
    }

    // ─── Tipping ────────────────────────────────────────────────

    /// @notice Tip an X handle. Handle must be normalized lowercase, no '@', 1-15 chars.
    function tipByHandle(string calldata handle, string calldata message) external payable returns (uint256 tipId) {
        if (msg.value == 0) revert ZeroAmount();
        if (!_isValidHandle(handle)) revert InvalidHandle();

        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 net = msg.value - fee;

        bytes32 h = keccak256(bytes(handle));

        tipId = tips.length;
        tips.push(HandleTip({
            handleHash: h,
            from: msg.sender,
            amount: net,
            timestamp: block.timestamp,
            message: message
        }));
        tipsByHandle[h].push(tipId);
        tipsByFan[msg.sender].push(tipId);
        pendingByHandle[h] += net;
        accumulatedProtocolFees += fee;

        emit TipByHandle(tipId, h, msg.sender, net, fee, message, handle);
    }

    // ─── Claim ──────────────────────────────────────────────────

    /// @notice Claim pending tips for a handle. The attestation is signed off-chain
    /// by `attestationSigner` after verifying the caller owns the X handle via OAuth.
    /// @param handle    normalized X handle (lowercase, no '@')
    /// @param recipient address to receive USDC
    /// @param deadline  unix timestamp after which this attestation expires
    /// @param signature EIP-191 signature by attestationSigner over the digest
    function claimByHandle(
        string calldata handle,
        address recipient,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) revert Expired();
        if (!_isValidHandle(handle)) revert InvalidHandle();

        bytes32 messageHash = keccak256(abi.encodePacked(
            "ArcPayHandleClaim",
            block.chainid,
            address(this),
            handle,
            recipient,
            deadline
        ));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = _recover(ethSigned, signature);
        if (signer == address(0) || signer != attestationSigner) revert BadSignature();

        bytes32 h = keccak256(bytes(handle));
        uint256 available = pendingByHandle[h] - claimedByHandle[h];
        if (available == 0) revert NothingToClaim();

        claimedByHandle[h] += available;
        (bool ok,) = recipient.call{value: available}("");
        if (!ok) revert TransferFailed();

        emit TipClaimed(h, recipient, available);
    }

    // ─── Admin ──────────────────────────────────────────────────

    function setAttestationSigner(address newSigner) external onlyAdmin {
        attestationSigner = newSigner;
        emit AttestationSignerUpdated(newSigner);
    }

    function setProtocolFee(uint256 newBps) external onlyAdmin {
        require(newBps <= 1000, "fee too high");
        protocolFeeBps = newBps;
        emit ProtocolFeeUpdated(newBps);
    }

    function withdrawProtocolFees() external onlyAdmin {
        uint256 amt = accumulatedProtocolFees;
        accumulatedProtocolFees = 0;
        (bool ok,) = protocolFeeRecipient.call{value: amt}("");
        if (!ok) revert TransferFailed();
    }

    // ─── Views ──────────────────────────────────────────────────

    function getTip(uint256 tipId) external view returns (HandleTip memory) { return tips[tipId]; }
    function getTipsByHandle(string calldata handle) external view returns (uint256[] memory) { return tipsByHandle[keccak256(bytes(handle))]; }
    function getTipsByHandleHash(bytes32 h) external view returns (uint256[] memory) { return tipsByHandle[h]; }
    function getTipsByFan(address fan) external view returns (uint256[] memory) { return tipsByFan[fan]; }

    function availableToClaim(string calldata handle) external view returns (uint256) {
        bytes32 h = keccak256(bytes(handle));
        return pendingByHandle[h] - claimedByHandle[h];
    }

    function totalTips() external view returns (uint256) { return tips.length; }

    // ─── Internal ───────────────────────────────────────────────

    /// X handle rules: 1-15 chars, [A-Za-z0-9_]. Here we require lowercase
    /// a-z to enforce client-side normalization (so the handleHash is canonical).
    function _isValidHandle(string memory handle) internal pure returns (bool) {
        bytes memory b = bytes(handle);
        if (b.length == 0 || b.length > 15) return false;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x30 && c <= 0x39) // 0-9
                || (c >= 0x61 && c <= 0x7A)    // a-z
                || c == 0x5F;                   // _
            if (!ok) return false;
        }
        return true;
    }

    function _recover(bytes32 digest, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 0x20))
            s := mload(add(sig, 0x40))
            v := byte(0, mload(add(sig, 0x60)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        // EIP-2 low-s
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) return address(0);
        return ecrecover(digest, v, r, s);
    }
}

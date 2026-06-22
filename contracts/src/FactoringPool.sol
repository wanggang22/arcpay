// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title Letta FactoringPool
/// @notice On-chain invoice factoring on Arc, settled in native USDC. The factor disburses an
///         `advance` to a supplier now; buyers repay later (partial/late allowed). Each repayment
///         runs a waterfall: the factor recovers its `advance + fee` first, then surplus routes to
///         the supplier. The underwriting agent (off-chain) decides advance/fee per invoice; this
///         contract enforces the money movement and emits receipts for verification on arcscan.
contract FactoringPool {
    address public immutable factor;

    struct Invoice {
        address supplier;
        address buyer;
        uint256 faceValue;     // what the buyer owes
        uint256 advance;       // disbursed to supplier up front
        uint256 fee;           // factor profit on top of recovering the advance
        uint256 collected;     // total repaid so far
        uint256 factorPaid;    // routed to factor so far (target = advance + fee)
        uint256 supplierPaid;  // surplus routed to supplier so far
        bool funded;
        bool settled;
    }

    mapping(bytes32 => Invoice) public invoices;

    event Funded(bytes32 indexed invoiceId, address indexed supplier, address indexed buyer, uint256 faceValue, uint256 advance, uint256 fee);
    event Repaid(bytes32 indexed invoiceId, address indexed payer, uint256 amount, uint256 toFactor, uint256 toSupplier, bool isPartial);
    event WaterfallSettled(bytes32 indexed invoiceId, uint256 totalCollected);

    error NotFactor();
    error AlreadyFunded();
    error NotFunded();
    error WrongAdvance();
    error BadParams();
    error TransferFailed();

    uint256 private _lock = 1;
    modifier nonReentrant() {
        require(_lock == 1, "reentrant");
        _lock = 2;
        _;
        _lock = 1;
    }

    modifier onlyFactor() {
        if (msg.sender != factor) revert NotFactor();
        _;
    }

    constructor() {
        factor = msg.sender;
    }

    /// @notice Factor funds an invoice: disburses `advance` (== msg.value) of native USDC to the
    ///         supplier immediately. `advance + fee` becomes the factor's recovery target and may
    ///         not exceed `faceValue` (otherwise the factor could never be made whole).
    function fundInvoice(
        bytes32 invoiceId,
        address supplier,
        address buyer,
        uint256 faceValue,
        uint256 advance,
        uint256 fee
    ) external payable onlyFactor nonReentrant {
        if (invoices[invoiceId].funded) revert AlreadyFunded();
        if (supplier == address(0) || buyer == address(0)) revert BadParams();
        if (advance == 0 || faceValue < advance + fee) revert BadParams();
        if (msg.value != advance) revert WrongAdvance();

        invoices[invoiceId] = Invoice({
            supplier: supplier,
            buyer: buyer,
            faceValue: faceValue,
            advance: advance,
            fee: fee,
            collected: 0,
            factorPaid: 0,
            supplierPaid: 0,
            funded: true,
            settled: false
        });

        emit Funded(invoiceId, supplier, buyer, faceValue, advance, fee);

        (bool ok,) = supplier.call{value: advance}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Repay toward an invoice (typically the buyer). Partial and late payments are
    ///         first-class. Runs the waterfall on every call: factor recovers advance+fee first,
    ///         then surplus to supplier. Re-run by the agent on each detected partial payment.
    function repay(bytes32 invoiceId) external payable nonReentrant {
        Invoice storage inv = invoices[invoiceId];
        if (!inv.funded) revert NotFunded();
        if (msg.value == 0) revert BadParams();

        uint256 target = inv.advance + inv.fee;
        uint256 factorOwed = target > inv.factorPaid ? target - inv.factorPaid : 0;
        uint256 toFactor = msg.value < factorOwed ? msg.value : factorOwed;
        uint256 toSupplier = msg.value - toFactor;

        inv.collected += msg.value;
        inv.factorPaid += toFactor;
        inv.supplierPaid += toSupplier;

        bool isPartial = inv.collected < inv.faceValue;
        emit Repaid(invoiceId, msg.sender, msg.value, toFactor, toSupplier, isPartial);

        if (!isPartial && !inv.settled) {
            inv.settled = true;
            emit WaterfallSettled(invoiceId, inv.collected);
        }

        if (toFactor > 0) {
            (bool ok1,) = factor.call{value: toFactor}("");
            if (!ok1) revert TransferFailed();
        }
        if (toSupplier > 0) {
            (bool ok2,) = inv.supplier.call{value: toSupplier}("");
            if (!ok2) revert TransferFailed();
        }
    }

    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }
}

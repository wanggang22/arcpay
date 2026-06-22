// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title Letta FactoringPool
/// @notice On-chain invoice factoring on Arc, settled in native USDC. The factor disburses an
///         `advance` to a supplier now; buyers repay later (partial/late allowed). Each repayment
///         runs a waterfall: the factor recovers its `advance + fee` first, then surplus routes to
///         the supplier. The underwriting agent (off-chain) decides advance/fee per invoice; this
///         contract enforces the money movement and emits receipts for verification on arcscan.
/// @dev    Payouts in repay() use push-with-escrow-fallback: if a recipient can't receive native
///         USDC, its leg is escrowed to `pending[]` (claim via withdraw()) instead of reverting the
///         whole repayment — so a griefing recipient can never brick the waterfall or strand the
///         factor's recovery. Overpayments are capped at faceValue and the excess is refunded.
contract FactoringPool {
    address public immutable factor;

    struct Invoice {
        address supplier;
        address buyer;
        uint256 faceValue;     // what the buyer owes
        uint256 advance;       // disbursed to supplier up front
        uint256 fee;           // factor profit on top of recovering the advance
        uint256 collected;     // total accepted toward this invoice (<= faceValue)
        uint256 factorPaid;    // routed to factor so far (target = advance + fee)
        uint256 supplierPaid;  // surplus routed to supplier so far
        bool funded;
        bool settled;
    }

    mapping(bytes32 => Invoice) public invoices;
    mapping(address => uint256) public pending; // escrowed payouts, claimable via withdraw()

    event Funded(bytes32 indexed invoiceId, address indexed supplier, address indexed buyer, uint256 faceValue, uint256 advance, uint256 fee);
    event Repaid(bytes32 indexed invoiceId, address indexed payer, uint256 amount, uint256 toFactor, uint256 toSupplier, bool isPartial);
    event WaterfallSettled(bytes32 indexed invoiceId, uint256 totalCollected);
    event Refunded(bytes32 indexed invoiceId, address indexed payer, uint256 amount);
    event Escrowed(address indexed recipient, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);

    error NotFactor();
    error AlreadyFunded();
    error NotFunded();
    error WrongAdvance();
    error BadParams();
    error TransferFailed();
    error NothingPending();

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
    ///         not exceed `faceValue`. Disbursement is fail-fast: if the supplier can't receive,
    ///         the whole fund reverts (nothing is committed), so the factor simply won't fund it.
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
    ///         first-class; the agent re-runs underwriting on each detected partial. Overpayment
    ///         beyond `faceValue` is refunded to the payer. Runs the waterfall: factor recovers
    ///         advance+fee first, then surplus to supplier.
    function repay(bytes32 invoiceId) external payable nonReentrant {
        Invoice storage inv = invoices[invoiceId];
        if (!inv.funded) revert NotFunded();
        if (msg.value == 0) revert BadParams();

        // Cap acceptance at the outstanding face value; refund any excess to the payer.
        uint256 remainingOwed = inv.faceValue - inv.collected; // invariant: collected <= faceValue
        uint256 accept = msg.value > remainingOwed ? remainingOwed : msg.value;
        uint256 refund = msg.value - accept;

        uint256 target = inv.advance + inv.fee;
        uint256 factorOwed = target > inv.factorPaid ? target - inv.factorPaid : 0;
        uint256 toFactor = accept < factorOwed ? accept : factorOwed;
        uint256 toSupplier = accept - toFactor;

        inv.collected += accept;
        inv.factorPaid += toFactor;
        inv.supplierPaid += toSupplier;

        bool isPartial = inv.collected < inv.faceValue;
        emit Repaid(invoiceId, msg.sender, accept, toFactor, toSupplier, isPartial);
        if (!isPartial && !inv.settled) {
            inv.settled = true;
            emit WaterfallSettled(invoiceId, inv.collected);
        }

        // Effects complete; now pay out (push, escrow-on-fail — never reverts the repayment).
        if (toFactor > 0) _payout(factor, toFactor);
        if (toSupplier > 0) _payout(inv.supplier, toSupplier);
        if (refund > 0) {
            _payout(msg.sender, refund);
            emit Refunded(invoiceId, msg.sender, refund);
        }
    }

    /// @notice Claim escrowed funds (set aside when a direct payout could not be delivered).
    function withdraw() external nonReentrant {
        uint256 amt = pending[msg.sender];
        if (amt == 0) revert NothingPending();
        pending[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amt}("");
        if (!ok) {
            pending[msg.sender] = amt;
            revert TransferFailed();
        }
        emit Withdrawn(msg.sender, amt);
    }

    function _payout(address to, uint256 amt) internal {
        (bool ok,) = to.call{value: amt}("");
        if (!ok) {
            pending[to] += amt;
            emit Escrowed(to, amt);
        }
    }

    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }

    /// @notice True once the factor has fully recovered advance+fee (independent of `settled`,
    ///         which tracks full face-value collection). Lets watchers distinguish a discounted payoff.
    function isFactorWhole(bytes32 invoiceId) external view returns (bool) {
        Invoice storage inv = invoices[invoiceId];
        return inv.funded && inv.factorPaid >= inv.advance + inv.fee;
    }
}

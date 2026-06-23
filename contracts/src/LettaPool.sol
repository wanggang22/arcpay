// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title LettaPool — a liquidity pool for autonomous invoice factoring on Arc (native USDC).
/// @notice The realistic model: the platform operator does NOT front its own capital. Anyone
///         (LPs / investors) deposits USDC into the pool and receives shares. The operator's
///         agent underwrites invoices and funds advances FROM the pool. When buyers repay, the
///         advance returns to the pool and the fee accrues as yield — so depositors earn, share
///         price rises, and the operator just runs the underwriting engine.
/// @dev    Share accounting is a standard vault: shares are a claim on totalAssets() = idle cash
///         (`available`) + receivables (`outstanding`). Fees grow totalAssets() → yield to LPs.
///         Withdrawals are limited to liquid `available`. Repay payouts to the supplier use
///         push-with-escrow-fallback so a griefing recipient can't brick the waterfall.
contract LettaPool {
    address public immutable operator; // underwrites + triggers funding (does not provide capital)

    mapping(address => uint256) public shares;
    uint256 public totalShares;
    uint256 public available;   // USDC in the pool, free to lend
    uint256 public outstanding; // principal advanced, not yet recovered (receivables)

    struct Invoice {
        address supplier;
        address buyer;
        uint256 faceValue;
        uint256 advance;
        uint256 fee;
        uint256 collected;
        uint256 factorPaid;
        uint256 supplierPaid;
        bool funded;
        bool settled;
    }
    mapping(bytes32 => Invoice) public invoices;
    mapping(address => uint256) public pending; // escrowed payouts

    event Deposited(address indexed lp, uint256 amount, uint256 sharesMinted);
    event Withdrawn(address indexed lp, uint256 sharesBurned, uint256 amount);
    event Funded(bytes32 indexed invoiceId, address indexed supplier, address indexed buyer, uint256 faceValue, uint256 advance, uint256 fee);
    event Repaid(bytes32 indexed invoiceId, address indexed payer, uint256 amount, uint256 toPool, uint256 toSupplier, bool isPartial);
    event YieldAccrued(bytes32 indexed invoiceId, uint256 fee);
    event WaterfallSettled(bytes32 indexed invoiceId, uint256 totalCollected);
    event Escrowed(address indexed recipient, uint256 amount);

    error NotOperator();
    error AlreadyFunded();
    error NotFunded();
    error BadParams();
    error InsufficientLiquidity();
    error TransferFailed();
    error NothingPending();

    uint256 private _lock = 1;
    modifier nonReentrant() { require(_lock == 1, "reentrant"); _lock = 2; _; _lock = 1; }
    modifier onlyOperator() { if (msg.sender != operator) revert NotOperator(); _; }

    constructor() {
        operator = msg.sender;
    }

    /// @notice Total assets backing the shares: idle cash + outstanding receivables.
    function totalAssets() public view returns (uint256) {
        return available + outstanding;
    }

    /// @notice LP deposits USDC and receives shares proportional to current pool value.
    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert BadParams();
        uint256 assets = totalAssets(); // before crediting this deposit
        uint256 minted = totalShares == 0 ? msg.value : (msg.value * totalShares) / assets;
        shares[msg.sender] += minted;
        totalShares += minted;
        available += msg.value;
        emit Deposited(msg.sender, msg.value, minted);
    }

    /// @notice LP redeems shares for the proportional pool value (deposit + earned yield).
    ///         Limited to liquid `available` — capital lent out must be repaid before it can exit.
    function withdraw(uint256 shareAmount) external nonReentrant {
        if (shareAmount == 0 || shareAmount > shares[msg.sender]) revert BadParams();
        uint256 assets = (shareAmount * totalAssets()) / totalShares;
        if (assets > available) revert InsufficientLiquidity();
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        available -= assets;
        emit Withdrawn(msg.sender, shareAmount, assets);
        (bool ok,) = msg.sender.call{value: assets}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice The agent funds an underwritten invoice FROM the pool: disburses `advance` to the
    ///         supplier now. Fail-fast if the supplier can't receive (nothing is committed).
    function fundInvoice(
        bytes32 invoiceId,
        address supplier,
        address buyer,
        uint256 faceValue,
        uint256 advance,
        uint256 fee
    ) external onlyOperator nonReentrant {
        if (invoices[invoiceId].funded) revert AlreadyFunded();
        if (supplier == address(0) || buyer == address(0)) revert BadParams();
        if (advance == 0 || faceValue < advance + fee) revert BadParams();
        if (advance > available) revert InsufficientLiquidity();

        available -= advance;
        outstanding += advance;

        invoices[invoiceId] = Invoice({
            supplier: supplier, buyer: buyer, faceValue: faceValue, advance: advance, fee: fee,
            collected: 0, factorPaid: 0, supplierPaid: 0, funded: true, settled: false
        });
        emit Funded(invoiceId, supplier, buyer, faceValue, advance, fee);

        (bool ok,) = supplier.call{value: advance}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Buyer repays (partial/late allowed). The pool recovers advance+fee first (principal
    ///         returns to `available`, fee accrues as LP yield); surplus routes to the supplier.
    function repay(bytes32 invoiceId) external payable nonReentrant {
        Invoice storage inv = invoices[invoiceId];
        if (!inv.funded) revert NotFunded();
        if (msg.value == 0) revert BadParams();

        uint256 remainingOwed = inv.faceValue - inv.collected;
        uint256 accept = msg.value > remainingOwed ? remainingOwed : msg.value;
        uint256 refund = msg.value - accept;

        uint256 target = inv.advance + inv.fee;
        uint256 factorOwed = target > inv.factorPaid ? target - inv.factorPaid : 0;
        uint256 toPool = accept < factorOwed ? accept : factorOwed;
        uint256 toSupplier = accept - toPool;

        // Reduce outstanding by the principal portion recovered in this repayment.
        uint256 oldPrincipal = inv.factorPaid < inv.advance ? inv.factorPaid : inv.advance;
        inv.collected += accept;
        inv.factorPaid += toPool;
        inv.supplierPaid += toSupplier;
        uint256 newPrincipal = inv.factorPaid < inv.advance ? inv.factorPaid : inv.advance;
        uint256 principalDelta = newPrincipal - oldPrincipal;
        outstanding -= principalDelta;
        available += toPool; // principal back + fee (yield) into the pool

        uint256 feePortion = toPool - principalDelta; // the rest of the recovery is yield
        if (feePortion > 0) emit YieldAccrued(invoiceId, feePortion);

        bool isPartial = inv.collected < inv.faceValue;
        emit Repaid(invoiceId, msg.sender, accept, toPool, toSupplier, isPartial);
        if (!isPartial && !inv.settled) {
            inv.settled = true;
            emit WaterfallSettled(invoiceId, inv.collected);
        }

        if (toSupplier > 0) _payout(inv.supplier, toSupplier);
        if (refund > 0) _payout(msg.sender, refund);
    }

    /// @notice Claim escrowed funds (set aside when a direct payout could not be delivered).
    function claimPending() external nonReentrant {
        uint256 amt = pending[msg.sender];
        if (amt == 0) revert NothingPending();
        pending[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amt}("");
        if (!ok) { pending[msg.sender] = amt; revert TransferFailed(); }
    }

    function _payout(address to, uint256 amt) internal {
        (bool ok,) = to.call{value: amt}("");
        if (!ok) { pending[to] += amt; emit Escrowed(to, amt); }
    }

    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }

    /// @notice An LP's current redeemable value (their share of total pool assets).
    function balanceOfAssets(address lp) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[lp] * totalAssets()) / totalShares;
    }
}

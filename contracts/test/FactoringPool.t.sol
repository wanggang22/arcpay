// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {FactoringPool} from "../src/FactoringPool.sol";

/// @dev The test contract itself is the factor (it deploys the pool), so it must be
///      able to receive native USDC when the waterfall routes recovery back to the factor.
contract FactoringPoolTest is Test {
    FactoringPool pool;

    address supplier = address(0x5);
    address buyer = address(0xB);
    address stranger = address(0x57);

    bytes32 constant INV = keccak256("invoice-001");
    uint256 constant FACE = 100 ether;   // buyer owes
    uint256 constant ADV = 88 ether;     // disbursed to supplier up front
    uint256 constant FEE = 5 ether;      // factor profit; recovery target = 93
    uint256 constant TARGET = ADV + FEE; // 93 ether

    function setUp() public {
        pool = new FactoringPool(); // factor = this test contract
        vm.deal(address(this), 1000 ether);
        vm.deal(buyer, 1000 ether);
        vm.deal(stranger, 1000 ether);
    }

    receive() external payable {}

    function _fund() internal {
        pool.fundInvoice{value: ADV}(INV, supplier, buyer, FACE, ADV, FEE);
    }

    function test_FundDisbursesAdvanceToSupplier() public {
        assertEq(supplier.balance, 0);
        _fund();
        assertEq(supplier.balance, ADV, "supplier got advance now");
        FactoringPool.Invoice memory inv = pool.getInvoice(INV);
        assertTrue(inv.funded);
        assertEq(inv.advance, ADV);
        assertEq(inv.fee, FEE);
        assertEq(inv.faceValue, FACE);
        assertFalse(inv.settled);
    }

    function test_FundOnlyFactor() public {
        vm.prank(stranger);
        vm.expectRevert(FactoringPool.NotFactor.selector);
        pool.fundInvoice{value: ADV}(INV, supplier, buyer, FACE, ADV, FEE);
    }

    function test_FundWrongAdvanceReverts() public {
        vm.expectRevert(FactoringPool.WrongAdvance.selector);
        pool.fundInvoice{value: 50 ether}(INV, supplier, buyer, FACE, ADV, FEE);
    }

    function test_FundFaceTooLowReverts() public {
        // faceValue (90) < advance + fee (93) => factor could never be made whole
        vm.expectRevert(FactoringPool.BadParams.selector);
        pool.fundInvoice{value: ADV}(INV, supplier, buyer, 90 ether, ADV, FEE);
    }

    function test_FundDoubleReverts() public {
        _fund();
        vm.expectRevert(FactoringPool.AlreadyFunded.selector);
        pool.fundInvoice{value: ADV}(INV, supplier, buyer, FACE, ADV, FEE);
    }

    function test_RepayFullRunsWaterfall() public {
        _fund();
        uint256 factorBefore = address(this).balance;
        vm.prank(buyer);
        pool.repay{value: FACE}(INV);
        assertEq(address(this).balance - factorBefore, TARGET, "factor recovered advance+fee");
        assertEq(supplier.balance, ADV + (FACE - TARGET), "supplier got advance + surplus");
        FactoringPool.Invoice memory inv = pool.getInvoice(INV);
        assertTrue(inv.settled, "settled");
        assertEq(inv.collected, FACE);
    }

    function test_RepayPartialThenComplete() public {
        _fund();
        uint256 supplierAfterFund = supplier.balance; // == ADV

        // partial 50 (< target 93): all to factor, none to supplier, not settled
        uint256 f0 = address(this).balance;
        vm.prank(buyer);
        pool.repay{value: 50 ether}(INV);
        assertEq(address(this).balance - f0, 50 ether, "partial all to factor");
        assertEq(supplier.balance, supplierAfterFund, "supplier unchanged on partial");
        FactoringPool.Invoice memory inv1 = pool.getInvoice(INV);
        assertFalse(inv1.settled, "not settled yet");
        assertEq(inv1.collected, 50 ether);

        // remaining 50: 43 completes factor recovery, 7 surplus to supplier, settled
        uint256 f1 = address(this).balance;
        vm.prank(buyer);
        pool.repay{value: 50 ether}(INV);
        assertEq(address(this).balance - f1, 43 ether, "factor completes recovery");
        assertEq(supplier.balance, supplierAfterFund + 7 ether, "supplier surplus");
        FactoringPool.Invoice memory inv2 = pool.getInvoice(INV);
        assertTrue(inv2.settled, "settled after full");
        assertEq(inv2.collected, FACE);
    }

    function test_RepayLateStillSettles() public {
        _fund();
        vm.warp(block.timestamp + 75 days); // buyer pays late
        vm.prank(buyer);
        pool.repay{value: FACE}(INV);
        assertTrue(pool.getInvoice(INV).settled);
    }

    function test_RepayNotFundedReverts() public {
        vm.expectRevert(FactoringPool.NotFunded.selector);
        pool.repay{value: 10 ether}(keccak256("nope"));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {LettaPool} from "../src/LettaPool.sol";

contract LettaPoolTest is Test {
    LettaPool pool;
    address lp1;
    address lp2;
    address supplier;
    address buyer;
    address stranger;
    bytes32 constant INV = keccak256("inv-1");

    function setUp() public {
        lp1 = makeAddr("lp1");
        lp2 = makeAddr("lp2");
        supplier = makeAddr("supplier");
        buyer = makeAddr("buyer");
        stranger = makeAddr("stranger");
        pool = new LettaPool(); // operator = this test contract
        vm.deal(lp1, 10000 ether);
        vm.deal(lp2, 10000 ether);
        vm.deal(buyer, 10000 ether);
        vm.deal(stranger, 10000 ether);
    }

    function _deposit(address lp, uint256 amt) internal {
        vm.prank(lp);
        pool.deposit{value: amt}();
    }

    function test_DepositMintsSharesFirst1to1() public {
        _deposit(lp1, 1000 ether);
        assertEq(pool.shares(lp1), 1000 ether);
        assertEq(pool.totalShares(), 1000 ether);
        assertEq(pool.available(), 1000 ether);
        assertEq(pool.totalAssets(), 1000 ether);
        assertEq(pool.balanceOfAssets(lp1), 1000 ether);
    }

    function test_FundDrawsFromPoolAndDisburses() public {
        _deposit(lp1, 1000 ether);
        pool.fundInvoice(INV, supplier, buyer, 1000 ether, 800 ether, 100 ether);
        assertEq(supplier.balance, 800 ether, "supplier got advance from pool");
        assertEq(pool.available(), 200 ether);
        assertEq(pool.outstanding(), 800 ether);
        assertEq(pool.totalAssets(), 1000 ether, "assets unchanged: cash -> receivable");
    }

    function test_FundOnlyOperator() public {
        _deposit(lp1, 1000 ether);
        vm.prank(stranger);
        vm.expectRevert(LettaPool.NotOperator.selector);
        pool.fundInvoice(INV, supplier, buyer, 1000 ether, 800 ether, 100 ether);
    }

    function test_FundInsufficientLiquidity() public {
        _deposit(lp1, 500 ether);
        vm.expectRevert(LettaPool.InsufficientLiquidity.selector);
        pool.fundInvoice(INV, supplier, buyer, 1000 ether, 800 ether, 100 ether);
    }

    function test_RepayReturnsPrincipalPlusFeeAsYield() public {
        _deposit(lp1, 1000 ether);
        pool.fundInvoice(INV, supplier, buyer, 1000 ether, 800 ether, 100 ether); // target 900
        vm.prank(buyer);
        pool.repay{value: 1000 ether}(INV);
        assertEq(pool.outstanding(), 0);
        assertEq(pool.available(), 1100 ether, "principal back + 100 fee yield");
        assertEq(pool.totalAssets(), 1100 ether);
        assertEq(supplier.balance, 900 ether, "advance 800 + surplus 100");
        assertEq(pool.balanceOfAssets(lp1), 1100 ether, "LP earned the 100 fee");
        assertTrue(pool.getInvoice(INV).settled);
    }

    function test_TwoLPsShareYieldProRata() public {
        _deposit(lp1, 1000 ether);
        _deposit(lp2, 1000 ether);
        assertEq(pool.shares(lp2), 1000 ether, "second deposit 1:1 (no yield yet)");
        pool.fundInvoice(INV, supplier, buyer, 2000 ether, 1600 ether, 200 ether);
        vm.prank(buyer);
        pool.repay{value: 2000 ether}(INV);
        assertEq(pool.balanceOfAssets(lp1), 1100 ether, "lp1 +100");
        assertEq(pool.balanceOfAssets(lp2), 1100 ether, "lp2 +100 (200 fee split evenly)");
    }

    function test_WithdrawRedeemsWithYield() public {
        _deposit(lp1, 1000 ether);
        pool.fundInvoice(INV, supplier, buyer, 1000 ether, 800 ether, 100 ether);
        vm.prank(buyer);
        pool.repay{value: 1000 ether}(INV);
        uint256 before = lp1.balance;
        vm.prank(lp1);
        pool.withdraw(1000 ether);
        assertEq(lp1.balance - before, 1100 ether, "redeemed deposit + yield");
        assertEq(pool.totalShares(), 0);
        assertEq(pool.available(), 0);
    }

    function test_WithdrawLimitedByLiquidity() public {
        _deposit(lp1, 1000 ether);
        pool.fundInvoice(INV, supplier, buyer, 1000 ether, 800 ether, 100 ether); // available -> 200
        vm.prank(lp1);
        vm.expectRevert(LettaPool.InsufficientLiquidity.selector);
        pool.withdraw(1000 ether); // would need 1000 > available 200
        uint256 before = lp1.balance;
        vm.prank(lp1);
        pool.withdraw(200 ether); // 200 shares -> 200 assets <= available
        assertEq(lp1.balance - before, 200 ether);
    }

    function test_PartialRepayReducesOutstanding() public {
        _deposit(lp1, 1000 ether);
        pool.fundInvoice(INV, supplier, buyer, 1000 ether, 800 ether, 100 ether); // outstanding 800, target 900
        vm.prank(buyer);
        pool.repay{value: 400 ether}(INV); // all to pool (400 < 900)
        assertEq(pool.outstanding(), 400 ether, "principal recovered 400");
        assertEq(pool.available(), 600 ether, "200 + 400");
        assertEq(supplier.balance, 800 ether, "no surplus yet");
        assertFalse(pool.getInvoice(INV).settled);

        vm.prank(buyer);
        pool.repay{value: 600 ether}(INV); // factorOwed 500 -> toPool 500, toSupplier 100
        assertEq(pool.outstanding(), 0);
        assertEq(pool.available(), 1100 ether);
        assertEq(supplier.balance, 900 ether);
        assertTrue(pool.getInvoice(INV).settled);
    }
}

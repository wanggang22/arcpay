// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {UsernameRegistry} from "../src/UsernameRegistry.sol";
import {TipJar} from "../src/TipJar.sol";
import {Subscriptions} from "../src/Subscriptions.sol";
import {ContentPaywall} from "../src/ContentPaywall.sol";
import {PayPerCall} from "../src/PayPerCall.sol";
import {ArcPayHub} from "../src/ArcPayHub.sol";

contract ArcPayTest is Test {
    UsernameRegistry registry;
    TipJar tipJar;
    Subscriptions subs;
    ContentPaywall content;
    PayPerCall api;
    ArcPayHub hub;

    address feeRecipient = address(0xFEE);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA701);

    uint256 constant FEE_BPS = 200; // 2%

    function setUp() public {
        registry = new UsernameRegistry();
        tipJar = new TipJar(address(registry), FEE_BPS, feeRecipient);
        subs = new Subscriptions(address(registry), FEE_BPS, feeRecipient);
        content = new ContentPaywall(address(registry), FEE_BPS, feeRecipient);
        api = new PayPerCall(address(registry), FEE_BPS, feeRecipient);
        hub = new ArcPayHub(address(registry), address(tipJar), address(subs), address(content), address(api));

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    // ─── UsernameRegistry ─────────────────────────────────────

    function test_RegisterUsername() public {
        vm.prank(alice);
        registry.register("alice", "Alice Chen", "ipfs://meta");
        assertTrue(registry.exists("alice"));
        assertEq(registry.getPayoutAddress("alice"), alice);
    }

    function test_CannotRegisterTwice() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(bob);
        vm.expectRevert(UsernameRegistry.AlreadyRegistered.selector);
        registry.register("alice", "", "");
    }

    function test_RejectsInvalidUsername() public {
        vm.prank(alice);
        vm.expectRevert(UsernameRegistry.InvalidUsername.selector);
        registry.register("AB", "", ""); // too short
        vm.prank(alice);
        vm.expectRevert(UsernameRegistry.InvalidUsername.selector);
        registry.register("has space", "", "");
        vm.prank(alice);
        vm.expectRevert(UsernameRegistry.InvalidUsername.selector);
        registry.register("CAPITAL", "", "");
    }

    function test_UpdatePayout() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(alice);
        registry.updatePayout("alice", bob);
        assertEq(registry.getPayoutAddress("alice"), bob);
    }

    // ─── TipJar ────────────────────────────────────────────────

    function test_TipByUsername() public {
        vm.prank(alice);
        registry.register("alice", "", "");

        uint256 amount = 1 ether;
        uint256 expectedFee = (amount * FEE_BPS) / 10000;
        uint256 expectedNet = amount - expectedFee;

        uint256 aliceBalBefore = alice.balance;
        vm.prank(bob);
        tipJar.tip{value: amount}("alice", "great post!");

        assertEq(alice.balance, aliceBalBefore + expectedNet);
        assertEq(tipJar.accumulatedProtocolFees(), expectedFee);
        assertEq(tipJar.getLifetimeReceived("alice"), expectedNet);
        assertEq(tipJar.getTipsCount(), 1);
    }

    function test_TipZeroAmountReverts() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(bob);
        vm.expectRevert(TipJar.ZeroAmount.selector);
        tipJar.tip{value: 0}("alice", "");
    }

    function test_TipUnknownUsernameReverts() public {
        vm.prank(bob);
        vm.expectRevert(TipJar.InvalidRecipient.selector);
        tipJar.tip{value: 1 ether}("nonexistent", "");
    }

    function test_AdminWithdrawsProtocolFees() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(bob);
        tipJar.tip{value: 1 ether}("alice", "");

        uint256 feesBefore = feeRecipient.balance;
        tipJar.withdrawProtocolFees();
        assertGt(feeRecipient.balance, feesBefore);
        assertEq(tipJar.accumulatedProtocolFees(), 0);
    }

    // ─── Subscriptions ────────────────────────────────────────

    function test_CreateAndSubscribe() public {
        vm.prank(alice);
        registry.register("alice", "", "");

        vm.prank(alice);
        uint256 planId = subs.createPlan("alice", "Pro", 1 ether, "");
        assertEq(planId, 0);

        vm.prank(bob);
        uint256 subId = subs.subscribe{value: 3 ether}(planId, 3);

        assertTrue(subs.isActive(bob, planId));

        Subscriptions.Plan memory p = subs.getPlan(planId);
        assertEq(p.name, "Pro");
        assertEq(p.pricePerMonth, 1 ether);
    }

    function test_CancelRefundsProrated() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(alice);
        uint256 planId = subs.createPlan("alice", "Pro", 1 ether, "");

        vm.prank(bob);
        subs.subscribe{value: 12 ether}(planId, 12);

        // Fast-forward 6 months
        vm.warp(block.timestamp + 180 days);

        uint256 bobBalBefore = bob.balance;
        vm.prank(bob);
        subs.cancel(0);

        // Should get ~50% refund (6 of 12 months remaining)
        uint256 refund = bob.balance - bobBalBefore;
        assertApproxEqRel(refund, 6 ether, 0.01e18); // 1% tolerance
    }

    function test_CannotSubscribeTwice() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(alice);
        subs.createPlan("alice", "Pro", 1 ether, "");

        vm.prank(bob);
        subs.subscribe{value: 1 ether}(0, 1);
        vm.prank(bob);
        vm.expectRevert(Subscriptions.AlreadySubscribed.selector);
        subs.subscribe{value: 1 ether}(0, 1);
    }

    function test_SubscribeWrongPaymentReverts() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(alice);
        subs.createPlan("alice", "Pro", 1 ether, "");

        vm.prank(bob);
        vm.expectRevert(Subscriptions.WrongPayment.selector);
        subs.subscribe{value: 0.5 ether}(0, 1);
    }

    // ─── ContentPaywall ───────────────────────────────────────

    function test_CreateAndPurchaseContent() public {
        vm.prank(alice);
        registry.register("alice", "", "");

        bytes32 cid = keccak256("my-article");
        vm.prank(alice);
        content.createContent("alice", cid, 0.5 ether, "ipfs://article");

        assertFalse(content.checkAccess(cid, bob));

        vm.prank(bob);
        content.purchase{value: 0.5 ether}(cid);
        assertTrue(content.checkAccess(cid, bob));

        ContentPaywall.Content memory c = content.getContent(cid);
        assertEq(c.totalSales, 1);
        assertEq(c.totalRevenue, 0.5 ether);
    }

    function test_CannotPurchaseTwice() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        bytes32 cid = keccak256("a");
        vm.prank(alice);
        content.createContent("alice", cid, 1 ether, "");
        vm.prank(bob);
        content.purchase{value: 1 ether}(cid);
        vm.prank(bob);
        vm.expectRevert(ContentPaywall.AlreadyPurchased.selector);
        content.purchase{value: 1 ether}(cid);
    }

    function test_WrongPaymentReverts() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        bytes32 cid = keccak256("a");
        vm.prank(alice);
        content.createContent("alice", cid, 1 ether, "");
        vm.prank(bob);
        vm.expectRevert(ContentPaywall.WrongPayment.selector);
        content.purchase{value: 0.5 ether}(cid);
    }

    function test_CreatorWithdrawsContentRevenue() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        bytes32 cid = keccak256("a");
        vm.prank(alice);
        content.createContent("alice", cid, 1 ether, "");
        vm.prank(bob);
        content.purchase{value: 1 ether}(cid);

        uint256 aliceBalBefore = alice.balance;
        vm.prank(alice);
        content.withdraw("alice");
        // Alice gets 98% (0.98 ether)
        assertEq(alice.balance, aliceBalBefore + 0.98 ether);
    }

    // ─── PayPerCall ───────────────────────────────────────────

    function test_RegisterAndPayEndpoint() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(alice);
        api.registerEndpoint("alice", "summarize", 0.001 ether);

        vm.prank(bob);
        uint256 callId = api.payByName{value: 0.001 ether}("alice", "summarize");
        assertEq(callId, 0);

        PayPerCall.CallReceipt memory r = api.getReceipt(callId);
        assertEq(r.payer, bob);
        assertEq(r.amount, 0.001 ether);
    }

    function test_PayInactiveEndpointReverts() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(alice);
        api.registerEndpoint("alice", "summarize", 0.001 ether);
        vm.prank(alice);
        api.updateEndpoint("alice", "summarize", false, 0);

        vm.prank(bob);
        vm.expectRevert(PayPerCall.EndpointInactive.selector);
        api.payByName{value: 0.001 ether}("alice", "summarize");
    }

    function test_CreatorWithdrawsApiRevenue() public {
        vm.prank(alice);
        registry.register("alice", "", "");
        vm.prank(alice);
        api.registerEndpoint("alice", "s", 1 ether);
        vm.prank(bob);
        api.payByName{value: 1 ether}("alice", "s");
        vm.prank(carol);
        api.payByName{value: 1 ether}("alice", "s");

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        api.withdraw("alice");
        assertEq(alice.balance, balBefore + 1.96 ether); // 2% fee × 2 calls
    }

    // ─── Hub ──────────────────────────────────────────────────

    function test_HubReturnsModuleAddresses() public view {
        (address r, address t, address s, address c, address p) = hub.getModules();
        assertEq(r, address(registry));
        assertEq(t, address(tipJar));
        assertEq(s, address(subs));
        assertEq(c, address(content));
        assertEq(p, address(api));
    }

    // ─── Fee bounds ────────────────────────────────────────────

    function test_FeeCappedAt10Percent() public {
        vm.expectRevert("fee too high");
        new TipJar(address(registry), 1001, feeRecipient);
    }
}

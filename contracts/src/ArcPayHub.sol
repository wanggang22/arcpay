// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title ArcPay Hub
/// @notice Aggregates references to all ArcPay modules; a single point of integration for SDK/dashboard
/// @dev Deploy modules separately, then deploy Hub with their addresses. Hub is mostly read-only.
contract ArcPayHub {
    address public immutable registry;
    address public immutable tipJar;
    address public immutable subscriptions;
    address public immutable contentPaywall;
    address public immutable payPerCall;

    string public constant VERSION = "0.1.0";

    constructor(
        address _registry,
        address _tipJar,
        address _subscriptions,
        address _contentPaywall,
        address _payPerCall
    ) {
        registry = _registry;
        tipJar = _tipJar;
        subscriptions = _subscriptions;
        contentPaywall = _contentPaywall;
        payPerCall = _payPerCall;
    }

    /// @notice Returns all module addresses at once for easy frontend loading
    function getModules() external view returns (
        address _registry,
        address _tipJar,
        address _subscriptions,
        address _contentPaywall,
        address _payPerCall
    ) {
        return (registry, tipJar, subscriptions, contentPaywall, payPerCall);
    }
}

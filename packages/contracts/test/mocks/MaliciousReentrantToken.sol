// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TreeVault} from "../../src/TreeVault.sol";

/// @dev A token with a transfer hook (unlike plain USDC), used only to
///      exercise TreeVault.fund's checks-effects-interactions ordering.
///      On its first transferFrom, it reenters the vault with a second
///      fund() call before the original transfer completes — the shape of
///      attack a hooked token (ERC-777 style) would let a payer mount.
contract MaliciousReentrantToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    TreeVault public target;
    bytes32 public reentryRoot;
    uint128 public reentryAmount;
    bool public armed;
    bool private _reentered;

    function mint(address to, uint256 v) external {
        balanceOf[to] += v;
    }

    function approve(address s, uint256 v) external returns (bool) {
        allowance[msg.sender][s] = v;
        return true;
    }

    /// The reentrant call's msg.sender inside fund() is this contract, not
    /// the original payer, so this contract needs its own balance and
    /// allowance to pull from — exactly what a hostile token contract would
    /// arrange for itself in a real attack.
    function arm(TreeVault t, bytes32 root, uint128 amount) external {
        target = t;
        reentryRoot = root;
        reentryAmount = amount;
        armed = true;
        balanceOf[address(this)] += amount;
        allowance[address(this)][address(t)] = type(uint256).max;
    }

    function transferFrom(address f, address t, uint256 v) external returns (bool) {
        if (armed && !_reentered) {
            _reentered = true;
            target.fund(reentryRoot, reentryAmount);
        }
        uint256 a = allowance[f][msg.sender];
        if (a != type(uint256).max) allowance[f][msg.sender] = a - v;
        balanceOf[f] -= v;
        balanceOf[t] += v;
        return true;
    }
}

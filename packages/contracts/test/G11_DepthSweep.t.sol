// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {MandateRegistry} from "../src/MandateRegistry.sol";
import {TreeVault} from "../src/TreeVault.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {IGatewayWallet} from "../src/interfaces/IGatewayWallet.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockGateway} from "./mocks/MockGateway.sol";

/**
 * G11 — draw() gas as a function of path depth, measured directly.
 *
 * research/AUDIT.md and the paper (Section 7.3) argue that draw's cost
 * grows with depth because _evaluate/_commit walk the full ancestor path,
 * but neither reports a measured per-level marginal cost — the existing
 * gas report aggregates whatever depths the rest of the suite happens to
 * exercise (mostly 0-3), not a controlled sweep. This file builds a fresh
 * chain at each depth in {1,2,4,8,16,24} (each its own root, so maxDepth
 * is unconstrained by the shared fixture's maxDepth=3) and measures one
 * draw's gas at the deepest node directly via gasleft(), printed for the
 * benchmark script to capture. This is deliberately a separate, isolated
 * chain per depth rather than one long chain reused across measurements,
 * so each measurement is a draw against a chain with no prior spend
 * anywhere on the path — the same "fresh window" condition every other
 * gas figure in the paper uses.
 */
contract G11_DepthSweep is Test {
    TreeVault vault;
    MandateRegistry registry;
    MockUSDC usdc;
    MockGateway gateway;
    address owner = address(0xA11CE);

    function setUp() public {
        usdc = new MockUSDC();
        registry = new MandateRegistry();
        gateway = new MockGateway();
        vault = new TreeVault(IERC20(address(usdc)), registry, IGatewayWallet(address(gateway)));
        usdc.mint(owner, 1_000_000_000_000);
        vm.prank(owner);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _paramsAt(uint8 maxDepth, address op) internal pure returns (MandateRegistry.Params memory) {
        return MandateRegistry.Params({
            operator: op,
            budget6: 1_000_000_000,
            lifetimeCap6: type(uint128).max,
            windowSeconds: 86400,
            trancheCap6: 1_000_000,
            concentrationBps: 10_000,
            maxDepth: maxDepth
        });
    }

    /// Builds a chain of exactly `depth` nodes below a fresh root and
    /// returns the deepest node's id and its operator's address.
    function _buildChain(uint8 depth, uint256 salt) internal returns (bytes32 node, address op) {
        op = address(uint160(uint256(keccak256(abi.encode("root", salt)))));
        vm.prank(owner);
        node = registry.open(_paramsAt(depth, op));
        vm.prank(owner);
        vault.fund(node, 1_000_000_000);

        for (uint8 i = 0; i < depth; i++) {
            address childOp = address(uint160(uint256(keccak256(abi.encode("child", salt, i)))));
            vm.prank(op);
            bytes32 child = registry.spawn(node, _paramsAt(depth, childOp));
            node = child;
            op = childOp;
        }
    }

    function test_gas_by_depth() public {
        uint8[6] memory depths = [1, 2, 4, 8, 16, 24];
        address payee = address(0xBEEF);

        console2.log("depth,gas");
        for (uint256 i = 0; i < depths.length; i++) {
            uint8 d = depths[i];
            (bytes32 node, address op) = _buildChain(d, i + 1);

            vm.prank(op);
            uint256 before = gasleft();
            (bool ok,,) = vault.draw(node, payee, 1);
            uint256 used = before - gasleft();
            assertTrue(ok, "draw at every depth in this sweep must release");

            console2.log(string.concat(vm.toString(uint256(d)), ",", vm.toString(used)));
        }
    }
}

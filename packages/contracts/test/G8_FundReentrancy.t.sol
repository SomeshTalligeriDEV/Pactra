// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {TreeVault} from "../src/TreeVault.sol";
import {MandateRegistry} from "../src/MandateRegistry.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {IGatewayWallet} from "../src/interfaces/IGatewayWallet.sol";
import {MockGateway} from "./mocks/MockGateway.sol";
import {MaliciousReentrantToken} from "./mocks/MaliciousReentrantToken.sol";

/**
 * G8 — fund() under a reentrant token.
 *
 * Plain USDC has no transfer hooks, so this is not exploitable against the
 * token Pactra actually targets. It is exercised here anyway because the
 * audit (research/AUDIT.md, research/THREAT_MODEL.md) named the ordering as
 * a latent risk specific to hooked tokens, and a latent risk that is only
 * asserted safe in prose is not the same as one a test has actually driven.
 *
 * TreeVault.fund was reordered (effects before the external pull) as a
 * direct result of this audit. This test does not prove the earlier
 * ordering was exploitable for double-crediting a simple additive counter —
 * it was not, since `treasury6[root] += amount6` is commutative regardless
 * of when it runs relative to the transfer. What it does establish: under
 * the current ordering, a reentrant fund() call from within the token's
 * transfer hook composes correctly with the outer call, and the final
 * treasury balance equals the exact sum of both funded amounts, with
 * neither lost nor double-counted.
 */
contract G8_FundReentrancy is Test {
    TreeVault vault;
    MandateRegistry registry;
    MaliciousReentrantToken token;
    MockGateway gateway;

    address owner = address(0xA11CE);
    address operator = address(0xB0B);
    bytes32 root;

    function setUp() public {
        token = new MaliciousReentrantToken();
        registry = new MandateRegistry();
        gateway = new MockGateway();
        vault = new TreeVault(IERC20(address(token)), registry, IGatewayWallet(address(gateway)));

        vm.prank(owner);
        root = registry.open(
            MandateRegistry.Params({
                operator: operator,
                budget6: 100_000_000,
                windowSeconds: 86400,
                lifetimeCap6: 1_000_000_000,
                trancheCap6: 10_000_000,
                concentrationBps: 5000,
                maxDepth: 3
            })
        );

        token.mint(owner, 1_000_000_000);
        vm.prank(owner);
        token.approve(address(vault), type(uint256).max);
    }

    function test_reentrant_fund_composes_without_losing_or_doubling_credit() public {
        uint128 first = 10_000_000;
        uint128 reentrant = 5_000_000;

        token.arm(vault, root, reentrant);

        vm.prank(owner);
        vault.fund(root, first);

        assertEq(
            vault.treasury6(root),
            uint128(first + reentrant),
            "treasury must reflect exactly both funding calls, in either order"
        );
    }
}

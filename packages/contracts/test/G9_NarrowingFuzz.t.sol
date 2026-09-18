// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base} from "./Base.t.sol";
import {MandateRegistry} from "../src/MandateRegistry.sol";
import {Fixtures} from "./Fixtures.gen.sol";

/**
 * G9 — narrowing across the fuzzed parameter space.
 *
 * G1_Narrowing (existing) checks specific, hand-picked violations: one field
 * over the parent's bound at a time. This file instead fuzzes all five
 * bounded fields together and asserts the general property: spawn succeeds
 * if and only if every field is within the parent's, and windowSeconds is
 * exactly equal. It does not test anything G1_Narrowing does not already
 * cover in the cases it covers — its value is exercising combinations
 * neither the handwritten tests nor a human enumerating cases would think
 * to try (e.g. two fields narrowed and a third widened by one unit).
 */
contract G9_NarrowingFuzz is Base {
    function testFuzz_spawn_succeeds_iff_every_field_is_within_the_parent(
        uint128 budget6,
        uint128 lifetimeCap6,
        uint64 windowSeconds,
        uint128 trancheCap6,
        uint16 concentrationBps
    ) public {
        // Bound to a range that includes both sides of every threshold
        // (0, exactly-equal, and above the parent's own value) without
        // spending the fuzzer's budget on magnitudes the contract already
        // rejects for an unrelated reason (ZeroBudget, etc. — covered
        // elsewhere).
        budget6 = uint128(bound(budget6, 1, uint256(Fixtures.BUDGET6) * 2));
        lifetimeCap6 = uint128(bound(lifetimeCap6, 1, type(uint128).max));
        trancheCap6 = uint128(bound(trancheCap6, 1, uint256(Fixtures.TRANCHE6) * 2));
        concentrationBps = uint16(bound(concentrationBps, 1, 20_000));
        windowSeconds = uint64(bound(windowSeconds, 1, uint256(Fixtures.WINDOW_SECONDS) * 2));

        MandateRegistry.Params memory p = MandateRegistry.Params({
            operator: opG,
            budget6: budget6,
            lifetimeCap6: lifetimeCap6,
            windowSeconds: windowSeconds,
            trancheCap6: trancheCap6,
            concentrationBps: concentrationBps,
            maxDepth: Fixtures.MAX_DEPTH
        });

        bool withinBounds = budget6 <= Fixtures.BUDGET6 && lifetimeCap6 <= type(uint128).max
            && trancheCap6 <= Fixtures.TRANCHE6 && concentrationBps <= Fixtures.CONCENTRATION_BPS
            && windowSeconds == Fixtures.WINDOW_SECONDS;

        // The root's own lifetimeCap6 in this harness is NO_LIFETIME_BOUND
        // (type(uint128).max), so the lifetime comparison above is always
        // true by construction — included anyway so the property statement
        // reads as the general rule, not one narrowed to this fixture.

        vm.prank(opRoot);
        if (withinBounds) {
            bytes32 node = reg.spawn(root, p);
            assertTrue(reg.exists(node), "a within-bounds spawn must succeed and exist");
        } else {
            vm.expectRevert();
            reg.spawn(root, p);
        }
    }
}

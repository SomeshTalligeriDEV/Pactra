// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base} from "./Base.t.sol";
import {TreeVault} from "../src/TreeVault.sol";
import {Fixtures} from "./Fixtures.gen.sol";

/**
 * G10 — draw() against a single node's tranche and window bounds, fuzzed.
 *
 * G1_TreeArithmetic and G1_Refusal check fixed amounts against fixed bounds.
 * G4_Search drives 45,360 draws through a generated *strategy* space, which
 * is a different kind of coverage — it exercises sequences of decisions an
 * adversarial spender might make, not the raw numeric input space of one
 * call. This fuzzes the one-call case directly: for an arbitrary amount
 * against a freshly-opened node with no prior spend, release happens if and
 * only if the amount is within both the tranche cap and the window budget,
 * and never on any other outcome.
 */
contract G10_DrawBoundsFuzz is Base {
    function testFuzz_draw_releases_iff_within_tranche_and_window(uint128 amount6) public {
        amount6 = uint128(bound(amount6, 1, uint256(Fixtures.BUDGET6) * 2));

        bool withinTranche = amount6 <= Fixtures.TRANCHE6;
        bool withinWindow = amount6 <= Fixtures.BUDGET6;
        bool shouldRelease = withinTranche && withinWindow;

        (bool ok,, TreeVault.Reason reason) = _draw(opRoot, root, aisa, amount6);

        assertEq(ok, shouldRelease, "release must match exactly whether both bounds hold");

        if (!shouldRelease) {
            if (!withinTranche) {
                assertEq(uint256(reason), uint256(TreeVault.Reason.TrancheCap), "tranche must be checked first");
            } else {
                assertEq(uint256(reason), uint256(TreeVault.Reason.WindowBudget), "window is the remaining cause");
            }
        }
    }

    /// Same property, but against an already-partially-spent window, so the
    /// fuzzer also has to land on the boundary of *remaining* headroom, not
    /// just the raw budget.
    function testFuzz_draw_respects_remaining_headroom_after_a_prior_spend(uint128 amount6) public {
        uint128 firstSpend = Fixtures.TRANCHE6;
        (bool firstOk,,) = _draw(opRoot, root, aisa, firstSpend);
        assertTrue(firstOk, "setup draw must release");

        amount6 = uint128(bound(amount6, 1, uint256(Fixtures.BUDGET6) * 2));

        uint128 remaining = Fixtures.BUDGET6 - firstSpend;
        bool withinTranche = amount6 <= Fixtures.TRANCHE6;
        bool withinRemaining = amount6 <= remaining;
        bool shouldRelease = withinTranche && withinRemaining;

        (bool ok,,) = _draw(opRoot, root, allium, amount6);
        assertEq(ok, shouldRelease, "release must account for the window's remaining headroom, not just the total");
    }
}

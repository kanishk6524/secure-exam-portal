# Ablation findings (read with docs/ablation-results.md)

Simulation only: synthetic candidates, not real students. Re-run with `npm run ablation`.

## What the experiment shows
1. **The hypothesis "the personal baseline has fewer false alarms" is NOT supported at the shipped settings.** At margin x1 the personal method raised more false alerts per honest hour than the fixed rule (about 3.0 vs 2.0 in the default scenario).
2. **At the same false-alarm rate, the personal baseline catches more cheating.** At the fixed rule's false-alarm rate (about 2 per hour) personal recall is 66.5% vs 50.3%. At the personal method's own rate (about 3 per hour) the fixed rule reaches only 54.8% vs 77.2%. This held in four of the five scenarios, including careful cheaters (27.1% vs 13.1%). With dirty calibration it is mixed: personal wins slightly at its own false-alarm rate (40.5% vs 38.9%) and loses at the fixed rule's (44.5% vs 48.7%).
3. **Who is falsely flagged changes.** The fixed rule hits users with naturally wide head movement hard (5.9 false alerts/h) and ordinary users lightly (1.5/h). The personal baseline nearly removes the first problem (0.3/h) but is stricter on ordinary users (3.4/h) because their personal range is narrow. That is a fairness result, not a pure accuracy result.
4. **The weak spot is the calibration.** If a candidate looks away during calibration, the personal method loses recall (it is then worse than the fixed rule at its own operating point).
5. **Absolute false-alarm rates are high for both methods in this simulation** (most honest candidates get at least one alert per hour). They depend on the assumed glance rates and are only meaningful as a comparison, but they say the alerts must go to a human reviewer, never to an automatic penalty.

## Claim you can defend
"In simulation, at an equal false-alarm rate, a per-candidate baseline detected about 16-22 percentage points more cheating episodes than a global threshold (default scenario), and nearly removed the false alarms on users who naturally move their heads a lot. The advantage disappears if the calibration is contaminated. Validation on real recordings is future work."

## Claim you cannot make
"Our method has fewer false alarms" or any accuracy figure for real exams.

## Suggested tuning (not applied)
The margin multiplier of about 1.5 puts the personal method near the fixed rule's false-alarm rate (1.75 vs 2.05 per hour) with 62.7% recall vs 50.3%. Changing the shipped default should wait for real data.

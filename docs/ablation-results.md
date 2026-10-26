# Ablation: fixed threshold vs personal baseline

> **This is a simulation, not a measurement on real students.** 500 synthetic honest and 500 synthetic cheating candidates per scenario, 60-minute exams checked every 500 ms, 3 random seeds (mean ± sd across seeds). Habits, glances and cheating movements are drawn from the assumptions below. It shows how the two decision rules behave under those assumptions. Real recorded sessions are needed to make a real-world claim.

Both arms run the real project code: `lib/fixed-gaze-rule.ts` (control: yaw > 25°, pitch > 20°, eyes sideways > 0.55, eyes down > 0.6) and `lib/gaze-baseline.ts` (personal range from a 5-point calibration, with margin). An alert needs more than 8 consecutive anomalous checks (about 4.5 s), exactly like the engine. The neural-network autoencoder is not included here; this isolates the personal **range** against the **global** thresholds.

Metrics: **false alerts per honest candidate-hour** (lower is better); **honest candidates flagged at least once** (lower is better); **episode recall** = share of cheating episodes (20-80 frames, about 10-40 s, 3 per exam) that raised an alert (higher is better).

## Headline results at the shipped operating points

| Scenario | Fixed: false alerts/h | Personal: false alerts/h | Fixed: honest flagged | Personal: honest flagged | Fixed: recall | Personal: recall |
|---|---|---|---|---|---|---|
| default | 1.98 ± 0.29 | 2.85 ± 0.09 | 74.1% ± 0.7% | 82.7% ± 1.3% | 49.3% ± 0.7% | 77.6% ± 0.5% |
| homogeneous | 1.56 ± 0.18 | 3.34 ± 0.05 | 72.6% ± 1.1% | 94.5% ± 0.5% | 47.8% ± 0.9% | 86.8% ± 0.8% |
| restless-honest | 3.49 ± 0.08 | 5.58 ± 0.07 | 90.3% ± 0.1% | 88.8% ± 1.1% | 49.0% ± 0.7% | 77.7% ± 1.5% |
| careful-cheater | 1.98 ± 0.29 | 2.85 ± 0.09 | 74.1% ± 0.7% | 82.7% ± 1.3% | 9.3% ± 0.5% | 27.2% ± 0.7% |
| dirty-calibration | 1.94 ± 0.29 | 1.07 ± 0.07 | 72.7% ± 0.3% | 50.5% ± 3.0% | 49.2% ± 0.9% | 40.3% ± 0.3% |

## Fair comparison: recall at the same false-alarm rate

Comparing single points can mislead, because either arm can trade recall for fewer false alarms by changing its sensitivity. Each arm's sensitivity was swept (fixed: thresholds × 0.6..3; personal: margin × 0.4..3.5) and the other arm's recall was interpolated at the same false-alert rate. "n/a" means that arm cannot reach that low a false-alarm rate within the sweep.

| Scenario | Fixed recall at personal's false-alarm rate | Personal recall at fixed rule's false-alarm rate | Personal's own recall | Fixed rule's own recall |
|---|---|---|---|---|
| default | 54.8% | 66.5% | 77.2% | 50.3% |
| homogeneous | 60.5% | 67.1% | 85.7% | 48.9% |
| restless-honest | 56.5% | 61.8% | 75.7% | 48.1% |
| careful-cheater | 13.1% | 15.6% | 27.1% | 9.8% |
| dirty-calibration | 38.9% | 44.5% | 40.5% | 48.7% |

## Paired difference in false alerts (fixed − personal), per honest candidate-hour, seed 11

Bootstrap 95% interval over candidates (positive = personal baseline raises fewer false alerts).

| Scenario | Difference | 95% CI |
|---|---|---|
| default | -0.94 | [-1.47, -0.19] |
| homogeneous | -1.60 | [-2.07, -0.83] |
| restless-honest | -2.11 | [-2.73, -1.36] |
| careful-cheater | -0.94 | [-1.47, -0.19] |
| dirty-calibration | 0.64 | [0.38, 0.98] |

## Who gets falsely flagged (default scenario, seed 11)

| Candidate group | Fixed: false alerts per candidate-hour | Personal: false alerts per candidate-hour |
|---|---|---|
| Wide natural movement (15%) | 5.87 | 0.26 |
| Everyone else | 1.45 | 3.41 |

## Assumptions (change them in `scripts/ablation.ts`)

- **default**: Mixed population, normal honest glances, standard cheating. Wide-movement share 15.0% (×2.5), glances 0.33/min, long looks away 0.08/min, cheat strength 1, eyes-only share 25.0%, calibration contamination 0.0%.
- **homogeneous**: Everyone sits like the average student (no wide-movement users) - the fixed rule's best case. Wide-movement share 0.0% (×2.5), glances 0.33/min, long looks away 0.08/min, cheat strength 1, eyes-only share 25.0%, calibration contamination 0.0%.
- **restless-honest**: Honest candidates look away twice as often. Wide-movement share 15.0% (×2.5), glances 0.66/min, long looks away 0.16/min, cheat strength 1, eyes-only share 25.0%, calibration contamination 0.0%.
- **careful-cheater**: Cheaters make smaller movements (60% amplitude) and use the eyes more. Wide-movement share 15.0% (×2.5), glances 0.33/min, long looks away 0.08/min, cheat strength 0.6, eyes-only share 50.0%, calibration contamination 0.0%.
- **dirty-calibration**: 10% of the calibration frames were taken while already looking off-screen (candidate gaming the baseline). Wide-movement share 15.0% (×2.5), glances 0.33/min, long looks away 0.08/min, cheat strength 1, eyes-only share 25.0%, calibration contamination 10.0%.
- Each candidate has a random head/eye offset and range (posture, camera height, screen size). Tracker noise 1.5° / 0.04. Cheating: head turned to the side, eyes down to a lap, or eyes only. Honest glances and long looks away use the same movement sizes, so the two classes overlap by design.

## Threats to validity (say these in the viva)

- The result depends on how realistic the synthetic users are. The real test is recorded sessions with labelled behaviour.
- The cheating model could be easier or harder than real cheating. The careful-cheater and dirty-calibration scenarios probe this, and they are where the personal baseline can lose.
- Only gaze is compared. The system's other signals (identity checks, second face, phone camera, audio) are not part of this study.
- A personal baseline is only as honest as the calibration. A candidate who cheats during calibration widens their own range (see dirty-calibration).

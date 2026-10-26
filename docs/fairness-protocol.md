# Fairness test protocol

Goal: find out whether honest candidates get more false alerts in some conditions (lighting, glasses, skin tone).

1. **Volunteers only, with consent.** Tell each person what is recorded and that the tags (lighting, glasses, skin tone) stay in a CSV on your computer and are not stored in the exam database. Skin tone is chosen by the volunteer (Fitzpatrick groups I-II, III-IV, V-VI). Do not guess anyone's group for them.
2. **Same exam, same instructions.** Each volunteer takes the 1-minute demo exam honestly, the same way: look at the screen, glance away naturally once or twice.
3. **Vary one thing at a time.** Per volunteer, repeat the exam in: bright light, dim room, and backlit (window behind). Do it with and without glasses if they wear them. Aim for at least 5 honest sessions per group you want to report.
4. **Tag every session.** After each run, copy the session id from Admin → Incident Review and add a row to `docs/fairness-tags.csv`: `sessionId,lighting,glasses,skinTone,honest`.
5. **Run** `npm run fairness`. Read `docs/fairness-report.md`.
6. **Report what you find.** If a group has a clearly higher false-alert rate, say so and what you would change (lighting guidance in the camera check, a re-calibration prompt, human review of that alert type). If the data is too small, say that instead of claiming fairness.

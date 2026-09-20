# EduVoice threat model

## Assets
1. Which student wrote which feedback (must stay secret).
2. Integrity of results: one response per enrolled student, no forged or replayed submissions.
3. Teacher and student accounts.

## Who we defend against

| Adversary | Goal | Defence | Residual risk |
|---|---|---|---|
| Teacher | Identify a critical student | Aggregates only, minimum-response thresholds, random comment order, PII flagging | Small classes; distinctive writing or incidents in comments |
| Administrator / DB reader | Join identity to feedback | No user reference on feedback; blind-signed credentials; date-only timestamps | Can still see who has *submitted* a credential request; can read comment text |
| Server operator with logs | Correlate requests | Sign blinded values; `/feedback` needs no cookie | IP/timing correlation unless proxy logs are disabled or delayed |
| Outsider without an account | Stuff the ballot | Credentials need a valid signature; nonces are single-use; rate limiting | Compromise of the signing key breaks integrity |
| Student | Vote twice | One issuance per (student, course), enforced by a unique constraint | Lost credential cannot be recovered |
| Malicious user input | XSS / SQLi | Pydantic validation, ORM parameters, React escaping, security headers | Needs testing in the security phase |

## Deployment notes
- With the Vercel proxy, the backend sees Vercel's addresses rather than each student's. Vercel's own request logs may still hold client IPs, so treat the hosting provider as a party that could correlate timing.
- The signing key is the trust anchor. Anyone holding it can mint valid credentials, so it lives only in the host's secret store.
- Accounts lock after repeated failures. An attacker can therefore lock a known username out for 15 minutes; this trades availability for brute-force resistance.

## Out of scope for the MVP
- A fully malicious server that modifies the client JavaScript to leak the nonce.
- Network-level anonymity (Tor, mixnets).
- Stylometric attacks beyond the basic PII and threshold measures.

## Things to test and report
- Show that the database alone cannot join `issuances` to `feedback`.
- Replay, forged-signature, wrong-course-credential and wrong-role tests (already in `backend/tests`).
- Effect of class size on anonymity (what does a teacher learn from 5 vs 10 vs 30 responses?).

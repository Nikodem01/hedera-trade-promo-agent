# Compliance mapping

A requirement → mechanism matrix for the regimes a CPG trade-finance buyer's procurement and legal
teams will raise. Mechanisms point at code/docs that exist today; the honest gaps are stated at the end.

## EU AI Act
Automated adjudication that determines a payout is plausibly **high-risk** AI, so we engineer to the
high-risk obligations regardless of final classification.

| Article | Obligation | Mechanism |
|---|---|---|
| Art. 9 | Risk management system | `docs/MODEL_RISK.md` — validation, review, monitoring, controls |
| Art. 10 | Data governance | Confidential dossier; commitments-on-chain / data-off-chain (`docs/ARCHITECTURE.md`) |
| Art. 12 | Logging & traceability | HCS audit ledger (immutable, timestamped) + provable **access log** (`lib/access-log.ts`) |
| Art. 13 | Transparency | Clause-cited findings + **citation verification**; typed, defensible reasoning summary |
| Art. 14 | Human oversight | Human **override** anchored on-chain (`app/api/override`) + safety-gate auto-escalation |
| Art. 15 | Accuracy, robustness, cybersecurity | Pilot validation; dual-model review; deterministic caps; at-rest encryption; no-drain design |

## GDPR / EDPB blockchain guidance
| Requirement | Mechanism |
|---|---|
| No personal/business data on an immutable ledger | On-chain record is **proof-only**: `{commitment, image_fp, ts}` — a salted Merkle root + keyed fingerprint |
| Data minimisation | Only commitments are published; the dossier never leaves the server |
| Right to erasure on an immutable chain | **Crypto-shredding** (`deleteDossier`): deleting the off-chain salted data renders the on-chain commitment permanently un-openable — the proof stays, the data is irrecoverable |
| Confidentiality of disclosures | Per-leaf salts → revealing one field cannot unmask a sibling; selective disclosure via Merkle proofs |

## Financial controls (SOX-style)
| Control | Mechanism |
|---|---|
| Segregation of duties | Settlement needs the **brand approver's** *and* the **retailer's** on-chain signatures — separate keys; the agent/operator holds neither |
| No unilateral disbursement | Scheduled transfer + receiver-signature-required; consensus-enforced, not app-enforced |
| Authorization limits | Deterministic `compute_settlement` cap (contract max **and** global ceiling) |
| Immutable audit trail | Every decision, override, and data access anchored to HCS; cannot be altered or backdated |

## SOC 2-style trust criteria
| Criterion | Mechanism |
|---|---|
| Security | At-rest AES-256-GCM encryption (`DOSSIER_ENC_KEY`); server-only keys; prompt-injection test |
| Confidentiality | Off-chain dossier; selective disclosure; proof-only chain |
| Processing integrity | Deterministic settlement + safety gate; citation verification |
| Availability / change mgmt | Stateless API routes; version-controlled (git) change history |
| Privacy | Data minimisation + crypto-shredding (above) |

## ISO/IEC 42001 (AI management system)
Lifecycle governance is documented (model inventory, validation methodology, monitoring, human
oversight, incident/limitation register) across `docs/MODEL_RISK.md` and `docs/SECURITY.md`.

## Honest gaps (not yet done)
- **No third-party attestations yet** (no completed SOC 2 / ISO 42001 audit) — the *controls* exist;
  the *certifications* are a roadmap item.
- **No formal DPIA / EU AI Act conformity assessment** authored — the engineering is aligned, the
  paperwork is not filed.
- App-level **RBAC/SSO is deliberately out of scope** for this build; segregation of duties is enforced
  by separate on-chain keys, not an IdP (`docs/SECURITY.md`).

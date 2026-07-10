# TranscriptionQA — Epics, Features & Tasks

> Mined from `products/transcriptionqa/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `TQ`.

---

## Epic TQ-1: Audio & Transcript Ingestion

**Goal:** Review existing transcripts (ASR-agnostic) rather than performing transcription — avoids the hardest problem (competitive ASR engine) per §27.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| TQ-1.1 | Prisma schema: audio_files, transcripts, speakers, findings, accuracy_scores | P0 | M | SH-ORG-1 | No |
| TQ-1.2 | Audio upload (common formats) | P0 | M | TQ-1.1, SH-STORAGE-2 | No |
| TQ-1.3 | Transcript ingestion (accepts any existing ASR-source transcript alongside audio) | P0 | M | TQ-1.1 | Yes |

---

## Epic TQ-2: AI Accuracy Copilot (Killer Feature)

**Goal:** Audio-transcript alignment, error detection, domain-terminology validation, and a calibrated confidence score.

### Feature TQ-2.1: Alignment & Error Detection

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| TQ-2.1.1 | Forced audio-transcript alignment service | P0 | L | TQ-1.2, TQ-1.3 | No |
| TQ-2.1.2 | Error detection service (likely-incorrect word/segment flagging) | P0 | L | TQ-2.1.1, SH-AI-1 | No |
| TQ-2.1.3 | AI correction suggestions | P0 | M | TQ-2.1.2, SH-AI-1, SH-AI-3 | No |

### Feature TQ-2.2: Confidence Scoring

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| TQ-2.2.1 | Accuracy score model (overall + per-section) | P0 | L | TQ-2.1.2 | No |
| TQ-2.2.2 | Confidence calibration validation (against human-reviewed ground truth benchmark, hard gate per §30) | P0 | M | TQ-2.2.1 | No |

### Feature TQ-2.3: Domain Dictionaries

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| TQ-2.3.1 | Medical terminology dictionary + validation model | P1 | L | TQ-2.1.2 | Yes |
| TQ-2.3.2 | Legal terminology dictionary + validation model | P1 | L | TQ-2.1.2 | Yes |
| TQ-2.3.3 | Dictionary accuracy validation (against real, anonymized transcripts with design-partner review — hard gate per §30) | P0 | M | TQ-2.3.1 | No |

### Feature TQ-2.4: Speaker Detection

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| TQ-2.4.1 | Speaker detection/diarization | P0 | M | TQ-1.2 | No |
| TQ-2.4.2 | Speaker verification (should-have, improved attribution accuracy) | P1 | M | TQ-2.4.1 | Yes |

---

## Epic TQ-3: Summary, Grammar & Export

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| TQ-3.1 | AI summary generation | P0 | M | TQ-1.3, SH-AI-1 | No |
| TQ-3.2 | AI grammar check (Starter tier) | P1 | M | TQ-1.3, SH-AI-1 | Yes |
| TQ-3.3 | Export (TXT Phase 1; PDF Starter tier) | P0 | S | TQ-1.3, SH-REPORT-2 | Yes |
| TQ-3.4 | Reports (accuracy score, flagged sections, speaker breakdown) | P0 | S | TQ-2.2.1, SH-REPORT-1 | Yes |

---

## Epic TQ-4: Advanced Capabilities (Phase 2)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| TQ-4.1 | AI Compliance Detection (flag disclosures/escalation triggers per vertical) | P2 | L | TQ-2.1.2, SH-AI-1 | No |
| TQ-4.2 | AI Translation | P2 | L | TQ-1.3, SH-AI-1 | No |
| TQ-4.3 | AI Sentiment Analysis | P2 | M | TQ-1.3, SH-AI-1 | Yes |
| TQ-4.4 | AI Call Quality Analysis (call center use case) | P2 | M | TQ-4.3 | No |
| TQ-4.5 | Webhooks | P2 | S | SH-INTEG-3 | Yes |

---

## Epic TQ-5: Roles, Admin & Billing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| TQ-5.1 | Admin/Reviewer/Viewer role wiring | P0 | S | SH-ORG-5 | No |
| TQ-5.2 | Users/Teams/AI Models/Dictionaries admin modules | P1 | M | SH-ADMIN-1 | Yes |
| TQ-5.3 | Wire TranscriptionQA entitlements into `SH-BILL` (processing-minutes-based Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2, SH-BILL-6 | No |
| TQ-5.4 | HIPAA-ready deployment path (Enterprise tier) | P2 | L | SH-DEVOPS-7 | Yes |

---

## TranscriptionQA Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| TQ-1 Audio & Transcript Ingestion | 3 | 3 |
| TQ-2 AI Accuracy Copilot | 10 | 7 |
| TQ-3 Summary, Grammar & Export | 4 | 3 |
| TQ-4 Advanced Capabilities (Phase 2) | 5 | 0 |
| TQ-5 Roles, Admin & Billing | 4 | 2 |
| **Total** | **26** | **15** |

**Note:** TQ-2.2.2 and TQ-2.3.3 are both hard gates — per §30, an uncalibrated confidence score or unreliable medical/legal terminology flag is actively worse than no QA tool at all in high-stakes contexts, since it creates false confidence.

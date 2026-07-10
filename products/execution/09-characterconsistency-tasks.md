# CharacterConsistency — Epics, Features & Tasks

> Mined from `products/characterconsistency/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `CX`.

**Note:** This product's infrastructure needs (GPU-backed generation, image/video model serving) are unlike the other 11 products in this portfolio. It reuses `SH-AI` for provider abstraction/routing concepts but requires dedicated generation infrastructure (CX-1) that no other product needs — do not assume `SH-AI` alone covers this epic.

---

## Epic CX-1: GPU Generation Infrastructure

**Goal:** The queue-based, GPU-backed generation pipeline every other epic depends on.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CX-1.1 | GPU worker pool infrastructure (tier-based priority queue: standard/priority/dedicated) | P0 | L | SH-DEVOPS-4 | No |
| CX-1.2 | Image generation model integration (diffusion model serving) | P0 | L | CX-1.1 | No |
| CX-1.3 | Generation credit metering (ties into `SH-BILL-6` usage counters) | P0 | M | CX-1.1, SH-BILL-6 | No |
| CX-1.4 | Generation request queue UI (status, ETA) | P1 | S | CX-1.1, SH-DASH-2 | Yes |

---

## Epic CX-2: AI Character DNA (Killer Feature)

**Goal:** The persistent, reusable identity object that conditions every subsequent generation — the entire product thesis.

### Feature CX-2.1: Character Creation & Identity Locking

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CX-2.1.1 | Prisma schema: characters, style_references, generations, character_memory | P0 | M | SH-ORG-1 | No |
| CX-2.1.2 | Character creation flow (from reference image or generated seed) | P0 | L | CX-2.1.1, CX-1.2 | No |
| CX-2.1.3 | Identity-conditioning pipeline (face/hairstyle/proportions locking — the core technical bet per §27) | P0 | L | CX-2.1.2, CX-1.2 | No |
| CX-2.1.4 | Style lock (consistent art/rendering style across generations) | P0 | M | CX-2.1.3 | Yes |
| CX-2.1.5 | Outfit consistency | P0 | M | CX-2.1.3 | Yes |
| CX-2.1.6 | Consistency quality benchmark (blind A/B vs. Midjourney/Leonardo.ai character-reference output, required before GA per §30) | P0 | M | CX-2.1.3 | No |

### Feature CX-2.2: Pose & Expression Memory

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CX-2.2.1 | Pose memory (generate new poses without identity drift) | P0 | M | CX-2.1.3 | No |
| CX-2.2.2 | Expression library (should-have) | P1 | M | CX-2.2.1 | Yes |

### Feature CX-2.3: Character Library

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CX-2.3.1 | Character library (store, browse, reuse across projects) | P0 | M | CX-2.1.1, SH-DASH-2 | No |
| CX-2.3.2 | Team workspace (shared character library, should-have) | P1 | M | CX-2.3.1, SH-ORG-3 | Yes |
| CX-2.3.3 | AI Prompt Optimizer (should-have) | P1 | M | CX-2.1.2, SH-AI-1 | Yes |

---

## Epic CX-3: Export & Output

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CX-3.1 | Standard resolution export | P0 | S | CX-1.2 | No |
| CX-3.2 | HD export (Starter tier) | P0 | S | CX-3.1 | Yes |

---

## Epic CX-4: Video & Multi-Character Consistency (Phase 2)

**Goal:** Harder versions of the core problem, explicitly sequenced after single-character/still-image consistency is proven (per §19).

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CX-4.1 | AI Story Memory (narrative/contextual continuity beyond single-generation identity) | P1 | L | CX-2.1.3 | No |
| CX-4.2 | Multi-character scene generation (relationship consistency) | P2 | L | CX-2.1.3, CX-2.1.6 | No |
| CX-4.3 | Video character consistency (frame-to-frame identity locking — flagship Phase 2 bet) | P2 | L | CX-2.1.3, CX-2.1.6 | No |
| CX-4.4 | Comic panel generator (cross-panel consistency) | P2 | L | CX-2.1.3, CX-4.1 | No |

---

## Epic CX-5: Roles, Admin & Billing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CX-5.1 | Owner/Team Member/Viewer role wiring | P0 | S | SH-ORG-5 | No |
| CX-5.2 | Wire CharacterConsistency entitlements into `SH-BILL` (character count + generation credits, Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2, CX-1.3 | No |
| CX-5.3 | White label / private models / dedicated GPU (Enterprise tier) | P2 | L | CX-1.1, SH-BILL-2 | Yes |

---

## CharacterConsistency Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| CX-1 GPU Generation Infrastructure | 4 | 3 |
| CX-2 AI Character DNA | 11 | 7 |
| CX-3 Export & Output | 2 | 2 |
| CX-4 Video & Multi-Character (Phase 2) | 4 | 0 |
| CX-5 Roles, Admin & Billing | 3 | 2 |
| **Total** | **24** | **14** |

**Note:** CX-2.1.6 (consistency benchmark) is the hardest gate in the entire 12-product portfolio in terms of *what it takes to pass* — per §30, the core positioning is a direct, provable claim ("this stays consistent, that doesn't"), so a launch that doesn't clear this bar collapses the value proposition regardless of how well-built the rest of the product is.

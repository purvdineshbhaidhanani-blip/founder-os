# 02 · Customer Research Framework

**Type:** Per-product fill-in. Copy
[`templates/CUSTOMER_RESEARCH_TEMPLATE.md`](../templates/CUSTOMER_RESEARCH_TEMPLATE.md)
into `products/<name>/docs/CUSTOMER_RESEARCH.md`.

Turns the "target customer" line from the product spec into a precise,
actionable understanding of who buys, who uses, and why. Everything from
onboarding copy to pricing tiers to feature priority traces back to this.

## Structure

### 1. Ideal Customer Profile (ICP)
The firmographic/demographic definition of the best-fit customer: company
size, industry, role, geography, tech maturity, budget authority. The ICP
is who the product is *for* — everyone outside it is explicitly out of
scope for v1.

### 2. Primary Persona
The main human who feels the pain and champions/uses the product. Give
them a name and capture: role, goals, daily context, current workflow,
what success looks like for them personally, and what would make them
switch. This persona drives the primary user journey and the dashboard
design ([`06`](./06-dashboard-framework.md)).

### 3. Secondary Persona(s)
Others involved in the buying or usage loop — e.g. the economic buyer who
approves spend, the admin who manages the account, the viewer who only
consumes reports. Each maps to a role in
[`09-roles-permissions.md`](./09-roles-permissions.md).

### 4. Jobs To Be Done (JTBD)
The functional, emotional, and social jobs the customer "hires" the
product to do, phrased as: *"When [situation], I want to [motivation], so I
can [expected outcome]."* JTBD keep the product honest about outcomes
rather than features.

### 5. Pain Points
The specific frictions, costs, and frustrations in the customer's current
reality — ranked by severity and frequency. Each pain point should map to
a feature in [`04-feature-classification.md`](./04-feature-classification.md)
or be explicitly deferred.

### 6. Customer Journey
The end-to-end path: Awareness → Consideration → Evaluation → Purchase →
Onboarding → Activation → Habit → Expansion → Advocacy. For each stage,
note the customer's question, their emotion, and the product/marketing
touchpoint that moves them forward. Activation and Habit stages directly
inform [`17-success-metrics.md`](./17-success-metrics.md).

### 7. Buying Triggers
The events that move a prospect from "aware" to "actively looking" (a new
regulation, a painful incident, hitting a scale ceiling, a budget cycle).
Marketing and onboarding are timed and worded around these triggers.

## Validation checklist

- [ ] ICP is specific enough to disqualify a clearly-out-of-scope company.
- [ ] Primary persona has goals, current workflow, and a switching trigger.
- [ ] Each secondary persona maps to a real role in the RBAC model.
- [ ] Every JTBD uses the "When… I want… so I can…" form.
- [ ] Pain points are ranked and each maps to a feature or a deferral.
- [ ] The journey names activation and habit moments explicitly.
- [ ] Buying triggers are concrete events, not vague "they realize they
      need it."

Gate: research is complete when the persona and journey are detailed
enough that a designer could build the primary flow without asking "but
who is this for?"

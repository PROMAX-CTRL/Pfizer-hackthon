# UAT Untangled

**Clearer feedback. Easier triage. Human decisions.**

UAT Untangled is a hackathon project designed to make user acceptance testing feedback easier to give, review and turn into actionable developer tickets.

The concept combines guided feedback capture, a prioritised review queue and individual manager approval. Every submission remains visible: prioritisation changes its position, not whether it is retained.

Developed for the **UAT, Untangled challenge**, presented by Pfizer AI Studio at the University of Brighton in November 2026.

> **Documentation status:** This README describes the agreed prototype design. The final source code and deployed application have not been reviewed against it. Confirm implemented features, actual dependencies and AI integration before treating this as a release specification.

## The problem

Tester feedback can be difficult to act on when it lacks context, arrives in different formats or mixes bugs with improvement suggestions. Developers need a clear account of what happened, while managers need to decide what deserves investigation and who should handle it.

UAT Untangled aims to connect those steps without making AI the final decision-maker.

## Intended workflow

```text
Tester describes a problem
          |
Optional clarification and editable report draft
          |
All feedback enters the manager's review queue
          |
Manager checks evidence, priority, category and owner
          |
Individual approval as a bug
          |
Developer receives the approved ticket
```

Clarification, ideas and deferred feedback should remain in the feedback workflow rather than automatically becoming developer tickets.

## User roles

| Role | Intended experience |
| --- | --- |
| **Tester** | Describe an issue, provide relevant details, review the draft and follow its status. |
| **UAT manager** | Review every submission, change classifications and priorities, request clarification and approve bugs individually. |
| **Developer** | Receive approved reports with the information needed to investigate. |

A demo role switcher is intended to demonstrate these perspectives. It is **not authentication or an access-control system**.

## Feedback organisation

### Categories and ownership

The agreed design uses five technical categories with fictional developer owners:

| Category | Demo owner |
| --- | --- |
| Interface & accessibility | Developer A |
| Functionality & workflow | Developer B |
| Data & saving | Developer C |
| Performance | Developer D |
| Access & permissions | Developer E |

**Unassigned** is a holding state when ownership is unclear, not a sixth developer category.

Feedback type is separate from technical category: **Possible bug**, **Improvement idea** or **Unsure**.

### Priority

The agreed priority values are **High**, **Medium**, **Low** and **Needs assessment**. New submissions should default to Needs assessment until reviewed, rather than being treated as low priority because their evidence is incomplete.

The review experience should retain an All feedback view and allow managers to override priority and ownership.

### Report content

A developer-ready report is intended to include:

- Original tester feedback, preserved separately from later edits.
- A concise title and description.
- Steps to reproduce.
- Expected and actual results.
- Relevant environment details, where supplied.
- Category, priority and assigned owner.
- Missing information and uncertainty.
- Review outcome and the manager's explanation.

Missing details should remain explicitly marked as **Not provided**, not filled with guesses.

## AI and human control

**AI-assisted coding and AI inside the application are different things.** Using a coding assistant to build the interface does not establish that the application has a live AI integration.

The initial build plan uses manual categorisation and prioritisation. The proposed AI-assisted extension would:

- Ask a small number of relevant questions about missing details.
- Avoid repeating questions already answered.
- Draft a structured report from the tester's actual evidence.
- Suggest category and priority with a short explanation.
- Identify information that remains uncertain.

A live model, provider and backend configuration have **not been confirmed for this README**. These capabilities should not be represented as implemented until demonstrated in the final build.

The intended human-control rules are:

- No automatic bug-ticket creation.
- No bulk approve-all action.
- Each bug requires an explicit individual approval.
- Manager edits remain distinct from AI suggestions.
- Original feedback is retained.
- Testers can submit incomplete feedback for manual review.
- Non-bug outcomes should include a clear, respectful explanation.

## Technical scope

The agreed starting architecture is **React with browser localStorage**, without a database or AI backend in the first stage. Confirm the actual framework, package manager and dependencies against the selected project's source code.

localStorage persists data across ordinary browser sessions for a particular site origin; it is not shared storage across devices. Private-browsing data is cleared when the last private tab closes. See the [MDN localStorage documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

If live AI is added, use a secure backend or managed integration for secret-bearing calls. Do not place private API keys in frontend code or browser storage.

## Running the project

Exact commands depend on the generated project. Check its `package.json`, lockfile and any builder-provided setup instructions before running it.

For an npm-based project with a `dev` script:

```bash
npm install
npm run dev
```

Open the local address printed by the development server. If the project uses a different package manager or start script, use the commands defined in that project instead.

Production build and deployment commands must also follow the actual repository configuration. No specific host, deployment URL, backend or environment variables are assumed here.

## Suggested demonstration

Use fictional feedback such as:

> After I edit a form and click Save, my changes disappear when I reopen it.

1. Submit the report from the Tester view.
2. If live clarification is implemented, answer its questions and inspect the editable draft.
3. Open Manager review and inspect the original feedback and proposed fields.
4. Change the category or priority to demonstrate human control.
5. Approve that specific report as a bug.
6. Show exactly one approved ticket in the Developer view.
7. Return to the Tester view to show the outcome.
8. Refresh and check that the record persists.

If clarification or drafting is not implemented, demonstrate the manual path honestly rather than presenting scripted text as live model output.

## Validation checklist

These are acceptance checks, **not a record of tests already passed**.

- [ ] Feedback reaches the manager before any developer ticket exists.
- [ ] Every submission remains accessible in the All feedback view.
- [ ] The manager can change category, priority and owner.
- [ ] Individual approval creates exactly one developer ticket.
- [ ] Repeated approval clicks do not create duplicate tickets.
- [ ] Refreshing preserves submitted reports and decisions.
- [ ] Original feedback remains separate from edited report fields.
- [ ] Simulated roles are clearly labelled.
- [ ] Any live AI failure preserves feedback and permits manual review.
- [ ] The published version behaves as expected outside the builder preview.

## Prototype limitations

The agreed initial scope is a single-browser demonstration, not a production deployment. It does not establish secure multi-user access, cross-device collaboration, production auditability, regulatory compliance or readiness for real organisational data.

Only fictional data should be used. Do not upload confidential company information, patient information, passwords or private API keys.

Shared storage, authenticated roles, duplicate suggestions, external ticket integrations and test-cycle analytics are possible future extensions—not confirmed features of this version.

## Acknowledgement

This project responds to the UAT, Untangled hackathon challenge. Referencing the challenge does not imply Pfizer endorsement, production adoption or access to Pfizer systems.

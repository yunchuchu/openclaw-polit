# OAuth Parser Robustness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

I'm using the writing-plans skill to create the implementation plan.

**Goal:** Strengthen the OAuth parser to align with the updated robustness rules so that it prioritizes authorize URLs, trims broader trailing punctuation, and respects question-mark line breaks.

**Architecture:** Adjust the parsing utility to run a two-pass URL selection (authorize-first, generic fallback) while expanding the trimming regex, then verify via focused Jest tests.

**Tech Stack:** Node.js/TypeScript, Jest

---

### Task 1: Codify the new failure cases in tests

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/.worktrees/qwen-oauth/src/main/openclaw/__tests__/oauthParser.test.ts`

- [ ] **Step 1: Write the failing test**

Add Jest cases covering `authorize` URL preference, punctuation trimming for trailing `)`, and question-mark line breaks so the current parser fails.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/main/openclaw/__tests__/oauthParser.test.ts`
Expected: FAIL because the parser still returns the wrong URL or concatenates the next line.

- [ ] **Step 3: Write the minimal implementation**

Adjust the parser to support the new selection and trimming behavior (Task 2 will detail this). Stop when the new tests can potentially pass.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run src/main/openclaw/__tests__/oauthParser.test.ts`
Expected: PASS after the implementation changes.

- [ ] **Step 5: Commit**

```bash
cd /Users/yunchuchu/workSpace/project/openclawPilot/.worktrees/qwen-oauth
git add src/main/openclaw/oauthParser.ts src/main/openclaw/__tests__/oauthParser.test.ts
git commit -m "fix: harden oauth parser url matching"
```

### Task 2: Implement the updated parser rules

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/.worktrees/qwen-oauth/src/main/openclaw/oauthParser.ts`

- [ ] **Step 1: Review current regex and selection order**

Identify where URLs are captured, how trailing punctuation is stripped, and how the first match is chosen.

- [ ] **Step 2: Implement authorize-first two-pass logic**

Prefer URLs containing `authorize` before falling back to a generic match, reusing the existing matcher while simply reorganizing candidate selection.

- [ ] **Step 3: Expand trailing-trim logic**

Ensure `.` `,` `;` `:` `!` `?` `)` `]` `}` are stripped (with question mark removal expected only when not followed by a URL segment on the next line).

- [ ] **Step 4: Update URL capture to respect question-mark line breaks**

Prevent concatenating the next line when a URL ends with `?` and the following line is regular text; treat the `?` as trailing punctuation to drop.

- [ ] **Step 5: Re-run the targeted tests**

Same command as in Task 1 Step 4.

### Task 3: Verification & handoff

**Files:**
- N/A (uses existing changes)

- [ ] **Step 1: Confirm lint/tests**

Ensure `npm test -- --run src/main/openclaw/__tests__/oauthParser.test.ts` passes cleanly.

- [ ] **Step 2: Perform git status check**

Run `git status -sb` to confirm only the intended files changed.

- [ ] **Step 3: Prepare the final commit**

Same command as Task 1 Step 5, if not run earlier; include parser and test updates.

- [ ] **Step 4: Note README/docs impact**

If any documentation is necessary (none expected), mention it in a follow-up comment or issue.

- [ ] **Step 5: Signal readiness**

Plan complete and saved to `docs/superpowers/plans/2026-03-18-oauth-parser.md`. Ready to execute?

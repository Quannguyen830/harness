# Spec: {{title}}

> Status: draft
> Feature: {{feature}} · Grill: [grill.md](grill.md) · Created: {{date}}

## Problem

<!-- Who has the problem, and what it costs them today. From the user's point of view. -->

## Scope

### In scope

### Out of scope (non-goals)

## User stories

<!-- Prioritised. Each story is an independently shippable, independently testable slice (P1 alone is a viable MVP). -->

### US1 — <title> (P1)

<plain-language journey>

Independent test: <how to show this story works on its own>

## Acceptance criteria

<!--
EARS patterns — one observable behaviour per line, each with an id and the story it belongs to:
  Ubiquitous:   THE <system> SHALL <response>.
  Event:        WHEN <trigger>, THE <system> SHALL <response>.
  State:        WHILE <state>, THE <system> SHALL <response>.
  Unwanted:     IF <condition>, THEN THE <system> SHALL <response>.
  Optional:     WHERE <feature is included>, THE <system> SHALL <response>.
-->

- A1 (US1): WHEN <trigger>, THE <system> SHALL <response>.

## Test seams

<!-- The few public interfaces tests go through (highest seam possible; ideally one). One line each: what it catches, what it misses. Quan approves these at Gate A; tasks may not test anywhere else without asking. -->

- <seam>: catches <...>; misses <...>

## Decisions

<!-- Feature-local decisions. Decisions that outlive this feature also go to docs/decisions.md. -->

## Tasks

<!--
One task = one branch = one PR. Vertical slices, small enough to review in one sitting.
Every acceptance item is covered by at least one task. The last task updates docs/product.md.
Format: - [ ] T<n>: <title> (covers: A1, A2) (after: T<m>)
-->

- [ ] T1: <title> (covers: A1)

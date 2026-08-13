# Domain docs

How engineering skills should consume this repository’s domain documentation.

## Before exploring, read these

- **`CONTEXT.md`** at the repository root, or
- **`CONTEXT-MAP.md`** at the repository root if it exists; it points to one
  `CONTEXT.md` per context.
- **`docs/adr/`** — read ADRs that touch the area being explored. In a
  multi-context repository, also check `src/<context>/docs/adr/` for
  context-scoped decisions.

If these files do not exist, proceed silently. Do not flag their absence or
suggest creating them upfront. Domain-modeling skills create them when terms
or decisions are actually resolved.

## File structure

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-example-decision.md
└── src/
```

## Use the glossary vocabulary

When naming a domain concept in an issue title, refactor proposal, hypothesis,
or test, use the term defined in `CONTEXT.md`. If the needed concept is not in
the glossary, reconsider whether new language is being invented or note the
gap for domain modeling.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than
silently overriding it:

> Contradicts ADR-0007 — but worth reopening because …

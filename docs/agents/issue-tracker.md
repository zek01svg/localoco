# Issue tracker: Linear

Issues for this repository live in the Linear project `localoco`, under the
`Personal` team (`PRS`).

Project: https://linear.app/zekkkv/project/localoco-ba3f24904707

Use the Linear MCP for issue and project operations.

## Conventions

- Create issues with `save_issue`, using team `PRS` and project `localoco`.
- Read issues with `get_issue`.
- List issues with `list_issues`.
- Update issue state, labels, priority, assignee, or relations with
  `save_issue`.
- Add comments with `save_comment`.
- Issue identifiers use the `PRS-123` format.

## Pull requests as a triage surface

Pull requests are included in triage.

- Inspect PRs with Linear diff tools such as `list_diffs` and `get_diff`.
- Read review threads with `get_diff_threads`.
- Submit review decisions with `submit_diff_review`.
- Keep PR findings connected to the corresponding Linear issue when one
  exists.

## When a skill says “publish to the issue tracker”

Create or update a Linear issue in the `localoco` project.

## When a skill says “fetch the relevant ticket”

Fetch the issue by its Linear identifier with `get_issue`.

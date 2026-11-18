# Release plans

Create `release-plans/<version>` without an extension; prompt the agent with that
path. Tasks run in order, each verified before the next. Completed work produces
`release-notes/<version>.md`; the user releases separately with
`--github --agent-notes`. Never treat an unchecked plan as release-ready.

Full workflow: [SeedWorks release contract](https://github.com/SeedWorksLab/Dev/blob/HEAD/RELEASING.md)
(workspace copy: `../Dev/RELEASING.md`).

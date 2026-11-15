# Benchmarks

One file per run (spec §8.4), named `<YYYY-MM-DD>-<kind>-<project>.md`, where kind is `greenfield` or `replay`.

Generate the numbers with:

```bash
node scripts/collect-logs.mjs <project-dir> [...] --out benchmarks/<file>.md
```

It records the harness version (`git describe`), interventions by type and gear, the error rate (harness-fault ÷ all), first-pass merge rate, G5 rounds per PR and fit scores. Add total time and an active-time estimate by hand under **Notes**.

Tag the harness (`git tag v0.x.y`) before a run so the version in the report means something. Compare trends across several runs, never one run.

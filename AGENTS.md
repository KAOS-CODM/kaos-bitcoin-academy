# KAOS Bitcoin Academy: Project Instructions

## PRD authority

"PRD.md" is the sole authoritative Product Requirements Document and source of truth for all requirements, scope, acceptance criteria, technical constraints, and definition of done.

- Never edit, overwrite, reformat, rename, or delete "PRD.md" without explicit authorization from the project owner.
- Never reinterpret a PRD requirement to resolve an implementation conflict.
- If a requirement conflicts with technical reality, stop the affected work. Identify the exact requirement, explain the conflict and its consequences, present alternatives that preserve the requirement where possible, and wait for explicit owner approval before deviating.
- Supporting documents are subordinate to "PRD.md" and must never silently amend it.
- If "PRD.md" and "PRD-ORIGINAL.txt" diverge, "PRD.md" governs. Report the discrepancy and never automatically reconcile either file.

## File roles

- "PRD.md": authoritative, immutable PRD.
- "PRD-ORIGINAL.txt": preserved reference copy of the original Markdown content. Never modify it.
- "PRD.txt": previous initialization copy. Archived and preserved unchanged; not authoritative.
- "PRD-SHA256.txt": historical integrity record for the archived "PRD.txt".
- "PRD-MD-SHA256.txt": integrity record for "PRD.md" and its matching reference copy.
- "ARCHITECTURE.md", "ENGINEERING-DECISIONS.md", "IMPLEMENTATION-PLAN.md", "CHANGELOG.md", and "TEST-REPORT.md": subordinate project documentation.

## Approval boundaries

Do not perform any of the following without explicit project-owner approval:

- Application or source-code modifications.
- Dependency installation or framework initialization.
- Git operations, including commits, branches, pushes, or repository modifications.
- Configuration changes outside explicitly approved tasks.
- Deployments or external service provisioning.
- Deviations from PRD requirements.

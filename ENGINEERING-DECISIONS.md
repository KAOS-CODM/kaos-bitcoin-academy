OD-001: Proposed documentation directory structure

Status: Open
Date: October 30, 2026
Priority: Resolve before creating "docs/"

Context

PRD.md §9.3 proposes a documentation structure containing:

- "docs/PRD.md"
- "docs/SPEC.md"
- "docs/ARCHITECTURE.md"
- "docs/SECURITY.md"
- "docs/WALLET-DECISION.md"

However, canonical project documents currently exist at the repository root, including:

- "PRD.md"
- "ARCHITECTURE.md"

Creating the proposed structure without resolving these paths could introduce duplicate or conflicting documents.

Decision required

Determine how the proposed "docs/" structure should map to the existing root-level documents.

Possible approaches include:

1. Keep canonical documents at the repository root and place only supplementary documentation in "docs/".
2. Move selected supporting documents into "docs/", while preserving "PRD.md" at the root as the sole authoritative PRD.
3. Use another explicitly approved structure that avoids duplicate sources of truth.

Constraints

- "PRD.md" remains the sole authoritative PRD.
- Do not move, duplicate, rename, or modify "PRD.md".
- Do not create "docs/" until this decision is resolved.
- Inspect existing project conventions before finalizing the directory structure.
- Any structural changes require explicit project-owner approval.

Resolution

Pending. No directory structure has been selected or implemented.

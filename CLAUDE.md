# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (pnpm required)
pnpm install

# Build (TypeScript compile + copy icons to dist/)
pnpm build

# Watch mode for development
pnpm dev

# Lint
pnpm lint

# Lint with auto-fix
pnpm lintfix

# Format with Prettier
pnpm format
```

There are no automated tests. Verification requires a live Twenty CRM + n8n instance.

## Architecture

This is an **n8n community node package** that provides a single node: `Twenty CRM - Dynamic`. The compiled output goes to `dist/` and is registered in `package.json` under the `n8n` key.

### Core files

| File | Role |
|------|------|
| `nodes/Twenty/Twenty.node.ts` | Main node class (~2000 lines). Defines all n8n UI properties, `loadOptions` methods, and the `execute()` dispatch loop. |
| `nodes/Twenty/TwentyApi.client.ts` | All API communication (~1000 lines). Schema caching, GraphQL/REST request helpers, query builders for mutations, enum resolution. |
| `nodes/Twenty/FieldParameters.ts` | Generates dynamic n8n `INodeProperties` arrays for complex field sub-inputs (FullName, Currency, Address, etc.) based on the selected resource. |
| `nodes/Twenty/ComplexFieldDetection.ts` | Static map of field names → complex types and helpers to detect them. |
| `nodes/Twenty/FieldTransformation.ts` | Transforms raw n8n parameter values into the shape the Twenty API expects (e.g., assembles sub-fields back into composite objects). |
| `nodes/Twenty/introspection/fieldIntrospection.ts` | GraphQL introspection queries to discover field types and subfield shapes at runtime. |
| `nodes/Twenty/operations/` | One file per bulk/special operation (`createMany`, `updateMany`, `deleteMany`, `getMany`, `upsert`, `upsertMany`, `list`). |
| `credentials/TwentyApi.credentials.ts` | Credential definition (API Key + Domain URL). |

### Data flow

1. **Schema discovery** (`TwentyApi.client.ts: getCachedSchema`): On first UI interaction the node hits Twenty's `/metadata` GraphQL endpoint to fetch all objects and fields. Results are cached in the n8n editor context (not across executions).
2. **Dynamic UI** (`Twenty.node.ts: loadOptions*` methods): Dropdowns for Database Group → Database → fields are populated by the cached schema.
3. **Field type detection** (`ComplexFieldDetection.ts` + `introspection/`): Determines whether a field needs composite sub-inputs (e.g., `FullName` → first/last name) vs. a simple input. Complex types are identified by both a static name map and runtime GraphQL introspection.
4. **Parameter generation** (`FieldParameters.ts`): Produces the actual `INodeProperties[]` shown to the user for a given resource+operation.
5. **Execution** (`Twenty.node.ts: execute()`): Reads node parameters, calls `FieldTransformation.ts` to assemble final field values, then dispatches to an operation handler or builds a query inline.
6. **API calls** (`TwentyApi.client.ts`): `twentyApiRequest` (GraphQL via POST) and `twentyRestApiRequest` (REST) both use n8n's `helpers.httpRequestWithAuthentication` so credentials are injected automatically.

### Dual-API architecture

- **Twenty Metadata API** (`/metadata`): Used to discover objects and custom fields. Source of truth for custom SELECT/MULTI_SELECT options.
- **Twenty GraphQL API** (`/graphql`): Used for mutations (Create, Update, Delete, Upsert) and for introspecting built-in enum types that the Metadata API doesn't expose.
- **Twenty REST API**: Used for queries (Get, List/Search) because it is more efficient for data retrieval.

### Key conventions

- Complex field types (`FullName`, `Links`, `Currency`, `Address`, `Emails`, `Phones`) are handled by templates in `FieldParameters.ts` that add sub-property inputs. Adding a new complex type requires entries in `ComplexFieldDetection.ts`, `FieldParameters.ts`, `FieldTransformation.ts`, and the introspection subfield map in `introspection/fieldIntrospection.ts`.
- Bulk operations use `Promise.allSettled()` for parallel execution and return per-item success/error results.
- The `buildSmartFilter` function in `Twenty.node.ts` auto-detects plain-text vs. advanced filter syntax for the List operation.
- `pnpm` is enforced via the `preinstall` script — do not use npm or yarn.

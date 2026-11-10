---
name: ff-pr-review-rules
description: Strict code and PR conventions enforced by reviewers in firefliesai repos (payments-ff, dashboard-ff, admin-dashboard, app, commands-ff, custom-scripts, shared-libs). Load BEFORE writing code and again before opening or updating a PR. Use when implementing a feature, fixing a bug, writing tests, adding a DTO/model/use-case/repository/helper/enum, or creating a PR in a Fireflies repo.
---

# Fireflies PR Rules

Enforce all of these. `payments-ff/CLAUDE.md` and `AGENTS.md` cover coverage thresholds, `ContextLogger` and helper reuse — follow them in addition to this.

## Pre-flight

- [ ] Every added symbol has a consumer in this PR
- [ ] No explanatory comments in the diff
- [ ] Base branch is `staging`; PR body uses the org template; Slack thread linked; test proof attached
- [ ] Specs: one `describe` per function, `beforeAll`, `it should be defined`
- [ ] DTO fields bounded, strongly typed, correctly ordered
- [ ] Reuse audit run (see below) — new abstractions applied everywhere they fit
- [ ] No sequential `findOne`/`create` loops
- [ ] Tracking event per affected entity; logs carry `teamId`/`userId`/`plan`
- [ ] REST change → rest client regenerated in this PR; enum change → GraphQL schema regenerated
- [ ] Helper or enum added → barrel export + `docs/helpers/*.md` row
- [ ] No mirror field, unread metadata, or guard that widens a return type to `T | void`

## Scope

- Never add a symbol whose only consumer is a later PR — helpers, constants, mocks, model fields, error codes, response types, repository methods, test utils.
- No enum-only or constant-only PRs.
- Regenerate the REST client in the same PR as the endpoint change; CI depends on it.
- Do not modify existing schemas or fields the PR does not read.
- Strip adjacent unrelated changes.

## Comments

- Delete explanatory comments. Names carry meaning.
- Never JSDoc a DTO — use `@ApiProperty({ description })`; JSDoc does not reach Swagger.
- Replace an explained magic number with a named constant.
- `TODO` only for a genuine tracked follow-up.

## Naming

- No abbreviated locals; match the full name used by the function.
- Rename every layer together: use case, DTO, model, repository method, endpoint, rest-client.
- Repository argument types end in `Input` and live in `src/modules/<mod>/types/*.repository.type.ts`.
- Sibling repository methods must be distinguishable at a glance.
- Predicates read as questions: `isSupportedCurrency`.
- Spec titles reuse existing phrasing, e.g. `should throw an error if the X is not found`.

## DTOs and validation

The pipe (`src/common/pipes/validation.pipe.ts`, registered `APP_PIPE`) runs `whitelist: true`, `transform: true`, `forbidNonWhitelisted` unset. **Unknown keys are silently stripped, never rejected — an undecorated field is dropped, not passed through.** Every field needs at least one validator or it does not exist at runtime.

`class-validator` here is the fork `@greguintow/class-validator`, which supplies `@ForbidIf` and predicate `@IsOptional((obj) => …)`.

**Decorator order** (consistent across 370/382 fields): presentation (`@ApiProperty`/`@Field`) → structural (`@ValidateNested`/`@Matches`/`@IsIn`/`@MaxLength`) → element (`@IsString({each})`/`@IsInt`) → container (`@ArrayMaxSize`/`@ArrayNotEmpty`/`@IsArray`) → `@IsOptional()` → `@Transform`. `@IsOptional` sits last because it evaluates bottom-up.

**Canonical stacks**

| Field | Stack |
|---|---|
| Required id / opaque string | `@ApiProperty()` `@IsNotEmpty()` `@IsString()` — Mongo ids too; `@IsMongoId` is never used |
| Required user text | above + `@TrimmedNotEmpty({message})` + `@MaxLength(N,{message})` |
| Optional string | `@ApiPropertyOptional()` `@IsString()` `@IsOptional()` `@MaxLength(N)` |
| Email | `@IsEmail()` `@IsNotEmpty()` `@IsString()` |
| Email array | `@IsEmail(undefined,{each:true})` `@IsString({each:true})` `@ArrayMaxSize(500)` `@ArrayNotEmpty()` `@IsArray()` |
| String array | `@MaxLength(N,{each:true})` `@IsString({each:true})` `@ArrayMaxSize(N)` `@IsArray()` — bound elements *and* length |
| Integer | `@IsInt()` `@IsPositive()` or `@Min(1)` + `@Max(N,{message})` |
| Money | integer cents, `@IsInt()` `@Min(1)`, unit stated in `description` |
| Enum | `@IsEnum(X)`, TS type is the enum, Swagger `{enum: X, enumName: 'X'}` |
| Closed string set (non-enum) | `@IsString()` + `@IsIn(SHARED_CONST_ARRAY,{message})` |
| Boolean | `@IsBoolean()`; query-string booleans need an inline `@Transform` |
| Nested | `@ValidateNested()` + `@Type(() => X)` always paired, above `@IsOptional()` |
| Date | `@Type(() => Date)` `@IsDate()`; `@IsDateString` is never used |
| GraphQL id | `@FieldId({isArray?,nullable?})` from `@common/decorators` |

**Rules**

- Optional means `@ApiPropertyOptional()`. `@ApiProperty({ required: false })` is never used.
- Bound every string. ~60% of existing string fields are unbounded — do not imitate them.
- Bound every `limit`/pagination field.
- Inline numeric literals are the norm; extract to a constant only when shared, and pair it with a `..._MESSAGE` constant.
- Mechanical cleanup belongs on the DTO via `@TrimmedNotEmpty()` / `@SanitizedText()`. Semantic normalization (lowercasing emails for matching) belongs in the use case. There is no `trimLower` util.
- Use `@Matches(PATTERN)`, never a hand-rolled `assert*` helper.
- Strong types only — never `object`, `Record<string, …>`, or `any`.
- Dual REST+GraphQL exposure = two sibling classes in one file, never one class carrying both decorator sets.
- **Never write a spec for a DTO** (`AGENTS.md`); `.dto.ts` is coverage-excluded.
- Follow `src/modules/user-groups/dto/create-user-group.dto.ts` (best overall), `promotions/dto/create-coupon.dto.ts` (conditional), `teams/dto/grant-ai-credits.dto.ts` (money + date).

## Helpers — when to create one

**Create when it has ≥2 call sites.** Size is irrelevant; one-line helpers are normal.

**Inline when it has one call site** — including a private method or module-scope function used once. Both get deleted in review. If the only gain is a name, extract a named `const` in the use case instead.

**Placement is decided by the signature:**

| Signature | Location |
|---|---|
| Domain types (`Team`, `Coupon`, `Stripe.*`) | `src/modules/<mod>/helpers/<domain>.helper.ts` |
| Primitives / generics only | `src/common/utils/<topic>.util.ts` |
| Another service needs the same answer | `packages/utils/src/index.ts`, re-exported from the owning module |

- Pure and DI-free. Pass infrastructure in as a parameter; never inject.
- ≤3 positional args (lint enforces `max-params-no-constructor: 3`), entity first. More than that → one destructured object with a named `*Params`/`*Args` interface.
- Prefix `get*` (value), `is*`/`has*` (boolean), `calculate*`, `format*`, `build*`, `generate*`, `convert*`. **`create*` is reserved for test fixtures.** `assert*` only for a stateful runtime invariant that throws — payload shape belongs on the DTO.
- Side-tasks: barrel export; row in `docs/helpers/{module-helpers,common-utilities,shared-package-utils}.md`; a spec in the sibling `tests/` dir (helpers are not coverage-excluded); if in `packages/utils`, bump its version and regenerate typedoc.

## Enums — when to create one

Enum is the default (~66 enums vs 14 const maps vs 6 unions).

| Use | When |
|---|---|
| `enum` | value is persisted to Mongo, registered on GraphQL, exposed on REST, or names a cross-process resource (queue, job, connection) |
| `as const` map | per-member *data*, not the vocabulary itself — `{...} as const satisfies Record<SomeEnum, T>`. Numeric codes live here, never in an enum |
| string union | compile-time only — never stored, never registered |

- Never create a single-member enum.
- String values only; members `SCREAMING_SNAKE_CASE`; type `PascalCase` singular.
- One enum per `<kebab>.enum.ts` in `src/common/enums/` if shared; colocate in the `.model.ts`/`.use-case.ts` if single-owner.
- **Never change an already-persisted value.**
- Side-tasks: barrel line in `src/common/enums/index.ts`; propagate the type into repository signatures **and** `types/*.repository.type.ts` rather than leaving `string`; wire `@Prop({ enum })` / `registerEnumType` / `@ApiProperty({ enumName })`; regenerate the rest client and/or `schema.graphql`; use enum members in tests, never literals.

## Reuse audit — run before opening a PR

Catches both directions: new code hand-rolling an existing abstraction, and a newly added abstraction not applied to the call sites that could use it.

1. **Duplicated query fragments.** `node ~/.claude/skills/ff-pr-review-rules/scripts/dup-query-fragments.mjs` from the repo root. Flags `key:value` fragments repeated ≥3× in one repository file. Highest signal; extract a shared filter builder (precedent: `InvitationRepository.pendingPrivateInviteFilter`).
2. **New export with ≤1 usage — diff-scoped only.** List added exports with
   `git diff --unified=0 origin/staging...HEAD -- 'src/**/*.ts' | grep -E '^\+export (async )?(function|const|enum|class|type|interface) '`
   then count real uses per symbol with
   `grep -rIw --include="*.ts" "$sym" src test | grep -v 'spec\.ts' | grep -v '/fixtures/' | wc -l`.
   Codebase-wide this is useless (55 hits); diff-scoped it is reliable.
3. **Enum cast piles.** `grep -rIhoE "\bas (Tier|SubscriptionStatus|InvoiceStatus|InviteSource)\b" src --include="*.ts" | sort | uniq -c | sort -rn`. A pile of casts proves the underlying field is typed `string` and should be the enum. Zero false positives.
4. **Enum applied unevenly.** For any enum this PR introduces or touches, grep its name, then confirm the *model* field uses it too — not just the repository and use cases.
5. **Hand-rolled utils.** grep the diff for `charAt(0).toUpperCase`, `Intl.NumberFormat`, `Math.round(x/y*100)`, `nanoid(`, `lodash`.

Do not bother grepping raw string literals against enum values, or `(status|reason|tier): string` codebase-wide — both are too noisy to action.

**Known debt (do not reintroduce, prefer fixing when nearby):** `Team.tier` is `string` while `Tier` exists, forcing 21 `as Tier` casts; `TEAM_TIERS` in `src/common/enums/team-tiers.enum.ts` is dead and duplicates `Tier` — never import it; `docs/helpers/common-utilities.md` is stale (documents `generateMD5`, shipped name is `generateHash`), so verify that index against source before trusting it.

## Tests

- One `describe` per function; no top-level catch-all. Exactly one `describe('execute')` per use-case spec.
- `beforeAll`, not `beforeEach`.
- Every spec has an `it should be defined` block; guard specs also have `canActivate`.
- Use bulk helpers; never loop sequential creates or finds. Missing a bulk util? Build it following the existing ones.
- Use existing generators: `createEmailWithDomain`, `getTestModelProvider`, faker for generic fields.
- Use-case specs construct the real repository with `getTestModelProvider` and spy its methods. Mock Stripe, other use cases, and external services. Do not mock the repository class. Ids come from fixtures (`createTestTeam()._id`), never a hoisted `'team-1'`.
- One fixture per type. `createTestCard` returns the saved `Card`. A checkout `CardInfoDto` (`brand`, `tokenId`) gets its own fixture. Do not add fields the persisted model does not have.
- A spec-local `createXForE2e` stays in that file until a second spec calls it.
- No `as never` / `as X` casts — use the real repository.
- Fixtures use a block body with no explicit return type.
- Every repository needs `tests/<name>.repository.spec.ts` or coverage fails.
- Never `delete` keys off shared objects.

## Repo idioms

| Use | Not |
|---|---|
| `removeKeys` | lodash |
| `logger.info` | `logger.log` |
| `\|\|` | `??` |
| `...(cond && { … })` | imperative conditional building |
| `flatObject` | manual flattening |
| existing models | a parallel model |
| base repository directly | a thin pass-through use case |
| payments client | direct `fetch` |
| `nuqs` | hand-rolled URL state |
| `satisfies` | bare config object literals |

- No private methods in repositories.
- Export via `models/index.ts`; import from `../models`.
- Guards and decorators used beyond one module live in `common/`.
- No mutation inside `useMemo` — use early returns.

## Queries and performance

- Push filters into the query, not into application code.
- One `findMany`, never N `findOne`s — in production code and tests. A list of teams is `repository.getByIds(ids)`, not a loop of `getById`.
- `Promise.all` independent awaits. A write and the step that depends on it stay sequential (seat lock, then the invoice that records it).
- Collapse repeated reads into a single repository call.

## Observability

- Emit a tracking event per affected entity, not one per batch.
- Enrich Segment payloads with the new domain data; thread `metadata` through so callers can attach context ids.
- Logs carry `teamId`, `userId`, `plan`, customer id, email, plus affected ids and any expiry.
- Service-to-service controllers read the `x-service` header and log and track it.

## Configuration

- Operational constants belong in GrowthBook, or are overridable per entity.
- Feature flags target the team, never the user.

## Data modelling

- Never mix identifier kinds in one field.
- Reason and status fields are enums; propagate the enum to sibling methods and the model.
- Persisted state takes priority over recomputation; never re-resolve a value already stored.
- Do not add a second field that stores the same number as an existing one. `billingSettings.maxSeats` is the purchased seat count; a `lockedSeats` mirror and a fallback that only runs when the two diverge get deleted. Declare the field on the Nest model. Do not `.add()` it onto a schema imported from shared-libs.
- Pinning billed seats means writing `minSeats` and `maxSeats` to the purchased count. `getMinSeats` bills `min(max(teammates, minSeats), maxSeats)`. A cap alone does not pin the charge; the billed count can fall below the purchase.
- Do not persist Stripe or invoice metadata, and do not query a document, when nothing reads the result. If the caller passed the id, that id is the value. Do not swap it for another document's `_id`.
- A response row assembled from existing documents (coupon redemptions + teams) is not a new collection and not a new model.
- A persisted string prefix (`partner:` on a coupon campaign) is a stored value. Renaming it without a migration leaves old rows unmatched.
- Do not add a guard that widens a return type to `T | void` when every caller then checks `typeof === 'string'`. If the bad value cannot occur, return `T`.
- Generalize — never special-case a single currency, plan or customer.
- No real customer names in code.
- Watch for breaking changes in shared util output.
- Prefer `Omit<T, 'secret'>` on the response type over `select: false` on the schema.

## Webhooks and multi-step setup

- Each step in a redelivered handler has its own skip marker. The marker for a later step must not be the flag an earlier step writes. The seat lock sets `partnerId`; the invoice skips on `partnerCoupon.invoiceId`. Skipping both on `partnerId` drops the invoice after Stripe retries.
- A non-fatal step (coupon redeem) is caught, logged with `teamId` / `userId` / `plan`, and does not stop the handler. A step Stripe should retry (partner setup) still throws. The `finally` that releases the lock wraps both.
- On webhook redelivery, load the coupon with `getById`. `getActiveCouponById` throws once the coupon has expired, before the idempotent redemption check, so an expired coupon never reaches the later step.

## Controllers

- One controller per auth surface. Routes that share the partner API-key guard belong together. Admin routes stay on their own controller.

## Layering

- Branching belongs in `execute`, not buried in a private method.
- Extract cohesive blocks into named methods.
- Use cases declare an `XArgs` interface extending the DTO for the generic, not the DTO itself.

## Reviewing behaviour

A note made once applies to the whole diff — fix the class of problem, not the flagged line. A reviewer question is a change request. Approvals are bare `LGTM`, so substance lives only in inline comments.

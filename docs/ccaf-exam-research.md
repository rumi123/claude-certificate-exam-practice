# CCAF Exam Research: Claude Certified Architect – Foundations

Research compiled 2026-11-08 to plan a study website.

> **Sources.** Anthropic's own exam guide PDF couldn't be reached. Everything here comes from
> third-party reproductions and prep sites (listed at the end). They agree on the core facts.
> Where they conflict, the conflict is noted. Check the format details against the official
> Exam Guide v1.0 (Anthropic Partner Academy on Skilljar) before relying on them.

---

## 1. Exam overview

| Item | Detail |
|---|---|
| Name | Claude Certified Architect – Foundations |
| Exam code | **CCAR-F** (v1.0 guide and most current sources). **CCA-F** in the March 2026 launch guide. "CCAF" is a common search term. |
| Launched | March 12, 2026. Exam Guide v1.0 took effect in July 2026 and replaces the launch guide. |
| Covers | Claude API, Claude Agent SDK, Claude Code, Model Context Protocol (MCP) |
| Target candidate | About 6+ months of hands-on work with the Claude API, Agent SDK, Claude Code and MCP |
| Delivery | Pearson VUE: online-proctored (OnVUE) or at a test center |
| Proctoring rules | Closed-book. Claude, Claude Code and the API console must not be running. Webcam on the whole time, full-desktop screen share, room sweep. A second monitor, a visible phone or a flagged browser tab can end the session (one source says beta candidates lost their seats this way). |
| Eligibility | Reported as limited to the **Claude Partner Network**: you attest that you work for a partner company, register with a corporate email (gmail, outlook, yahoo and icloud are rejected), then go through the Skilljar entitlement flow. Candidates must be 18 or older. One April 2026 source described an open access-request page at `anthropic.skilljar.com/claude-certified-architect-foundations-access-request`. The later source (Sept 2026) says partner-gated. |
| Fee | **$125 USD** per attempt (raised from $99, reportedly on June 30, 2026). Eligible partner employees may get a fully covered attempt ($0). |
| Validity | **12 months** (v1.0 guide). A beta-era Skilljar page said 6 months. |
| Renewal | Free if done on time, through a non-proctored, open-book assessment |
| Retakes | Up to 4 attempts per rolling 12 months. Waits of 14, 30 and 90 days after attempts 1, 2 and 3. |
| Cancel or reschedule | Free up to 48 hours before the appointment |
| Results | One source says "2 business days (Anthropic) / 7–10 days (community)". Unverified. |
| Badge | Issued through Credly |

### Related Anthropic certifications (often confused)
- **CCAO-F**: Claude Certified Associate – Foundations (non-technical), $99
- **CCDV-F**: Developer – Foundations, $125
- **CCAR-P**: Architect – Professional, $175

---

## 2. Exam format and question structure

- **60 questions in 120 minutes**, about 2 minutes per question. No per-question time limit and no scheduled breaks.
  - One outlier site lists 65 questions in 90 minutes. Most sources say 60/120.
  - The March 2026 guide reproduction gives no time limit. The v1.0 summaries say 120 minutes.
- **Scoring:** pass/fail on a **scaled score of 100–1000**. **720 to pass.**
  - Scaled and equated across exam forms, so 720 does **not** mean 72% correct. The number of correct answers needed isn't published.
- **No penalty for guessing.** Unanswered questions count as wrong.
- **Scenario-based.** Each sitting draws **4 of 6 scenarios** at random, and questions are tied to those scenarios.
  - One prep site (claudearchitectcertification.com) says the live exam draws from **13** scenarios, adding seven it calls "beyond the guide": Agentic Tool Design, Long Document Processing, Claude for Operations, Conversational AI Patterns, Agent Skills for Enterprise KM, Agent Skills for Developer Tooling, Agent Skills with Code Execution. No other source confirms this.
- **Question types (sources disagree):**
  - March 2026 guide (jc-aiwiki reproduction): "60 multiple choice questions — one correct answer, three distractors." Options are A–D.
  - v1.0 guide (GitHub study guide and prep sites): "multiple-choice and multiple-response." Each item states how many answers to select, so read the instruction line. The guide doesn't say what share is multiple-response.
  - **Plan:** support both single-answer (4 options) and multiple-response items.
- Official sample questions: the official guide reportedly has **9 sample questions across 3 scenarios** (see section 6a).

### Domain weights

| # | Domain | Weight | Approx. questions (of 60) | Task statements |
|---|---|---|---|---|
| D1 | Agentic Architecture & Orchestration | **27%** | ~16 | 1.1–1.7 (7) |
| D2 | Tool Design & MCP Integration | 18% | ~11 | 2.1–2.5 (5) |
| D3 | Claude Code Configuration & Workflows | 20% | ~12 | 3.1–3.6 (6) |
| D4 | Prompt Engineering & Structured Output | 20% | ~12 | 4.1–4.6 (6) |
| D5 | Context Management & Reliability | 15% | ~9 | 5.1–5.6 (6) |

30 task statements in total. D1 and D3 together are almost half the exam.
(claudecertifiedarchitects.com numbers the domains differently, swapping D2 and D3. The weights are the same.)

---

## 3. Full syllabus: task statements with knowledge and skill items

(Close to verbatim, from the jc-aiwiki reproduction of the official guide.)

### Domain 1: Agentic Architecture & Orchestration (27%)

**Task 1.1: Design and implement agentic loops for autonomous task execution**
Knowledge of:
- The agentic loop lifecycle: send request, inspect `stop_reason` (`"tool_use"` vs `"end_turn"`), execute tools, return results for next iteration
- How tool results are appended to conversation history so the model reasons about next action
- Model-driven decision-making (Claude reasons about which tool to call) vs pre-configured decision trees
- Anti-patterns: parsing natural language to determine loop termination, arbitrary iteration caps as primary stopping mechanism, checking assistant text for completion indicators

Skills in:
- Implementing control flow that continues when `stop_reason` is `"tool_use"` and terminates on `"end_turn"`
- Adding tool results to conversation context between iterations
- Avoiding anti-patterns like natural language parsing for termination

**Task 1.2: Orchestrate multi-agent systems with coordinator-subagent patterns**
Knowledge of:
- Hub-and-spoke architecture: coordinator manages all inter-subagent communication, error handling, information routing
- Subagents operate with isolated context: they do NOT inherit the coordinator's conversation history automatically
- Coordinator role: task decomposition, delegation, result aggregation, deciding which subagents to invoke based on query complexity
- Risks of overly narrow task decomposition leading to incomplete coverage of broad research topics

Skills in:
- Designing coordinators that dynamically select subagents rather than always routing through the full pipeline
- Partitioning research scope across subagents to minimize duplication
- Implementing iterative refinement loops (coordinator evaluates synthesis, re-delegates for gaps, re-invokes until sufficient)
- Routing all communication through coordinator for observability and consistent error handling

**Task 1.3: Configure subagent invocation, context passing, and spawning**
Knowledge of:
- The `Task` tool for spawning subagents; `allowedTools` must include `"Task"` for coordinators
- Subagent context must be explicitly provided in the prompt: subagents do NOT automatically inherit parent context or share memory
- `AgentDefinition` configuration: descriptions, system prompts, tool restrictions per subagent type
- `fork_session` for exploring divergent approaches from a shared analysis baseline

Skills in:
- Including complete findings from prior agents in the subagent's prompt (e.g., passing web search results to synthesis subagent)
- Using structured data formats to separate content from metadata (source URLs, page numbers) for attribution
- Spawning parallel subagents by emitting multiple `Task` calls in a single coordinator response
- Designing coordinator prompts with research goals and quality criteria, NOT step-by-step procedural instructions

**Task 1.4: Implement multi-step workflows with enforcement and handoff patterns**
Knowledge of:
- Programmatic enforcement (hooks, prerequisite gates) vs prompt-based guidance for workflow ordering
- When deterministic compliance is required (e.g., identity verification before financial operations), prompts alone have a non-zero failure rate
- Structured handoff protocols: customer ID, root cause analysis, recommended actions for escalation

Skills in:
- Implementing programmatic prerequisites that block downstream tool calls until prior steps complete (e.g., blocking `process_refund` until `get_customer` returns verified ID)
- Decomposing multi-concern customer requests into distinct items, investigating each in parallel, synthesizing unified resolution
- Compiling structured handoff summaries when escalating to humans

**Task 1.5: Apply Agent SDK hooks for tool call interception and data normalization**
Knowledge of:
- `PostToolUse` hooks that intercept tool results for transformation before the model processes them
- Hooks that intercept outgoing tool calls to enforce compliance (e.g., blocking refunds above a threshold)
- Hooks provide deterministic guarantees vs prompt instructions which are probabilistic

Skills in:
- Implementing `PostToolUse` hooks to normalize heterogeneous data formats (Unix timestamps, ISO 8601, numeric status codes) from different MCP tools
- Implementing interception hooks that block policy-violating actions and redirect to alternative workflows (e.g., human escalation)
- Choosing hooks over prompt-based enforcement when business rules require guaranteed compliance

**Task 1.6: Design task decomposition strategies for complex workflows**
Knowledge of:
- Fixed sequential pipelines (prompt chaining) vs dynamic adaptive decomposition based on intermediate findings
- Prompt chaining for breaking reviews into sequential steps (analyze each file individually, then cross-file integration pass)
- Adaptive investigation plans that generate subtasks based on what is discovered at each step

Skills in:
- Selecting prompt chaining for predictable multi-aspect reviews, dynamic decomposition for open-ended investigation
- Splitting large code reviews into per-file local analysis passes plus a separate cross-file integration pass
- Decomposing open-ended tasks by first mapping structure, identifying high-impact areas, then creating a prioritized plan that adapts

**Task 1.7: Manage session state, resumption, and forking**
Knowledge of:
- `--resume <session-name>` to continue a specific prior conversation
- `fork_session` for creating independent branches from a shared analysis baseline
- Informing the agent about changes to previously analyzed files when resuming sessions
- Starting fresh with structured summaries is more reliable than resuming with stale tool results

Skills in:
- Using `--resume` with session names to continue named investigation sessions
- Using `fork_session` to create parallel exploration branches (comparing testing strategies or refactoring approaches)
- Choosing between resumption (prior context mostly valid) and fresh start with injected summaries (prior tool results stale)
- Informing resumed sessions about specific file changes for targeted re-analysis

### Domain 2: Tool Design & MCP Integration (18%)

**Task 2.1: Design effective tool interfaces with clear descriptions and boundaries**
Knowledge of:
- Tool descriptions are the primary mechanism LLMs use for tool selection; minimal descriptions lead to unreliable selection
- Including input formats, example queries, edge cases, and boundary explanations in descriptions
- Ambiguous or overlapping descriptions (e.g., `analyze_content` vs `analyze_document` with near-identical descriptions) cause misrouting
- System prompt wording can create unintended keyword-sensitive tool associations

Skills in:
- Writing descriptions that clearly differentiate each tool's purpose, expected inputs/outputs, and when to use it vs alternatives
- Renaming tools and updating descriptions to eliminate functional overlap
- Splitting generic tools into purpose-specific tools with defined I/O contracts
- Reviewing system prompts for keyword-sensitive instructions that override well-written tool descriptions

**Task 2.2: Implement structured error responses for MCP tools**
Knowledge of:
- MCP `isError` flag pattern for communicating tool failures to the agent
- Distinction between transient errors (timeouts), validation errors (invalid input), business errors (policy violations), and permission errors
- Uniform error responses (generic "Operation failed") prevent appropriate recovery decisions
- Retryable vs non-retryable errors: structured metadata prevents wasted retry attempts

Skills in:
- Returning structured error metadata: `errorCategory` (transient/validation/permission), `isRetryable` boolean, human-readable descriptions
- Including `retriable: false` and customer-friendly explanations for business rule violations
- Local error recovery in subagents for transient failures; propagating only unresolvable errors to coordinator
- Distinguishing between access failures (needing retry) and valid empty results (no matches)

**Task 2.3: Distribute tools appropriately across agents and configure tool choice**
Knowledge of:
- Too many tools (e.g., 18 instead of 4-5) degrades tool selection reliability by increasing decision complexity
- Agents with tools outside their specialization tend to misuse them (e.g., synthesis agent attempting web searches)
- Scoped tool access: give agents only the tools needed for their role
- `tool_choice` options: `"auto"` (may return text), `"any"` (must call a tool), forced selection (`{"type": "tool", "name": "..."}`)

Skills in:
- Restricting each subagent's tool set to its role, preventing cross-specialization misuse
- Replacing generic tools with constrained alternatives (e.g., `fetch_url` replaced by `load_document` that validates document URLs)
- Providing scoped cross-role tools (e.g., `verify_fact` for synthesis agent) while routing complex cases through coordinator
- Using `tool_choice` forced selection to ensure a specific tool runs first in a pipeline
- Setting `tool_choice: "any"` to guarantee tool use rather than conversational text

**Task 2.4: Integrate MCP servers into Claude Code and agent workflows**
Knowledge of:
- Project-level `.mcp.json` for shared team tooling vs user-level `~/.claude.json` for personal/experimental servers
- Environment variable expansion in `.mcp.json` (e.g., `${GITHUB_TOKEN}`) for credential management without committing secrets
- Tools from all configured MCP servers discovered at connection time and available simultaneously
- MCP resources as content catalogs (issue summaries, documentation hierarchies, database schemas) to reduce exploratory tool calls

Skills in:
- Configuring shared MCP servers in project-scoped `.mcp.json` with environment variable expansion
- Configuring personal/experimental servers in user-scoped `~/.claude.json`
- Enhancing MCP tool descriptions to prevent agents from preferring built-in tools (like Grep) over more capable MCP tools
- Choosing existing community MCP servers over custom implementations for standard integrations
- Exposing content catalogs as MCP resources for agent visibility without exploratory tool calls

**Task 2.5: Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively**
Knowledge of:
- Grep for content search (function names, error messages, import statements)
- Glob for file path pattern matching (finding files by name or extension)
- Read/Write for full file operations; Edit for targeted modifications using unique text matching
- When Edit fails due to non-unique matches, use Read + Write as a fallback

Skills in:
- Selecting Grep for searching code content, Glob for finding files matching naming patterns
- Using Read + Write when Edit cannot find unique anchor text
- Building codebase understanding incrementally: Grep to find entry points, Read to follow imports and trace flows
- Tracing function usage across wrapper modules by identifying exported names, then searching across the codebase

### Domain 3: Claude Code Configuration & Workflows (20%)

**Task 3.1: Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization**
Knowledge of:
- CLAUDE.md hierarchy: user-level (`~/.claude/CLAUDE.md`), project-level (`.claude/CLAUDE.md` or root `CLAUDE.md`), directory-level (subdirectory `CLAUDE.md` files)
- User-level settings apply only to that user and are not shared via version control
- `@import` syntax for referencing external files to keep CLAUDE.md modular
- `.claude/rules/` directory for topic-specific rule files as an alternative to monolithic CLAUDE.md

Skills in:
- Diagnosing hierarchy issues (e.g., instructions in user-level rather than project-level config)
- Using `@import` to selectively include standards files in each package's CLAUDE.md
- Splitting large CLAUDE.md into focused topic-specific files in `.claude/rules/` (e.g., `testing.md`, `api-conventions.md`)
- Using `/memory` to verify which files are loaded and diagnose inconsistent behavior

**Task 3.2: Create and configure custom slash commands and skills**
Knowledge of:
- Project-scoped commands in `.claude/commands/` (shared via version control) vs user-scoped in `~/.claude/commands/`
- Skills in `.claude/skills/` with `SKILL.md` frontmatter: `context: fork`, `allowed-tools`, `argument-hint`
- `context: fork` runs skills in isolated sub-agent, preventing output pollution of main conversation
- Personal skill customization in `~/.claude/skills/` with different names to avoid affecting teammates

Skills in:
- Creating project-scoped slash commands in `.claude/commands/` for team-wide availability
- Using `context: fork` to isolate verbose or exploratory skill output
- Configuring `allowed-tools` to restrict tool access during skill execution
- Using `argument-hint` to prompt for required parameters when invoking without arguments
- Choosing between skills (on-demand) and CLAUDE.md (always-loaded universal standards)

**Task 3.3: Apply path-specific rules for conditional convention loading**
Knowledge of:
- `.claude/rules/` files with YAML frontmatter `paths` fields containing glob patterns
- Path-scoped rules load only when editing matching files, reducing irrelevant context and token usage
- Glob-pattern rules are more efficient than directory-level CLAUDE.md files for conventions spanning multiple directories

Skills in:
- Creating `.claude/rules/` files with frontmatter path scoping (e.g., `paths: ["terraform/**/*"]`)
- Using glob patterns to apply conventions by file type regardless of location (e.g., `**/*.test.tsx`)
- Choosing path-specific rules over subdirectory CLAUDE.md when conventions apply across the codebase

**Task 3.4: Determine when to use plan mode vs direct execution**
Knowledge of:
- Plan mode for complex tasks: large-scale changes, multiple valid approaches, architectural decisions, multi-file modifications
- Direct execution for simple, well-scoped changes (single-file bug fix, adding a validation check)
- Plan mode enables safe exploration before committing to changes
- Explore subagent for isolating verbose discovery and returning summaries

Skills in:
- Selecting plan mode for architectural tasks (microservice restructuring, 45+ file library migrations)
- Selecting direct execution for well-understood changes with clear scope
- Using Explore subagent for verbose discovery to prevent context exhaustion
- Combining plan mode for investigation with direct execution for implementation

**Task 3.5: Apply iterative refinement techniques for progressive improvement**
Knowledge of:
- Concrete input/output examples are the most effective way to communicate expected transformations when prose is interpreted inconsistently
- Test-driven iteration: write test suites first, iterate by sharing test failures
- The interview pattern: Claude asks questions to surface considerations the developer may not have anticipated
- Batching interacting problems in a single message vs sequential iteration for independent problems

Skills in:
- Providing 2-3 concrete I/O examples to clarify transformation requirements
- Writing test suites covering expected behavior, edge cases, and performance before implementation
- Using the interview pattern to surface design considerations in unfamiliar domains
- Providing specific test cases with example input and expected output to fix edge cases
- Addressing interacting issues in a single message; sequential iteration for independent issues

**Task 3.6: Integrate Claude Code into CI/CD pipelines**
Knowledge of:
- `-p` (or `--print`) flag for running Claude Code non-interactively in automated pipelines
- `--output-format json` and `--json-schema` CLI flags for structured output in CI contexts
- CLAUDE.md provides project context (testing standards, review criteria) to CI-invoked Claude Code
- Session context isolation: the same session that generated code is less effective at reviewing its own changes

Skills in:
- Running Claude Code in CI with `-p` flag to prevent interactive input hangs
- Using `--output-format json` with `--json-schema` for machine-parseable structured findings
- Including prior review findings when re-running reviews after new commits (avoid duplicate comments)
- Providing existing test files in context to avoid suggesting duplicate test scenarios
- Documenting testing standards and available fixtures in CLAUDE.md for CI quality

### Domain 4: Prompt Engineering & Structured Output (20%)

**Task 4.1: Design prompts with explicit criteria to improve precision and reduce false positives**
Knowledge of:
- Explicit criteria over vague instructions (e.g., "flag comments only when claimed behavior contradicts actual code behavior" vs "check that comments are accurate")
- General instructions like "be conservative" or "only report high-confidence findings" fail compared to specific categorical criteria
- High false positive rates in one category undermine confidence in accurate categories

Skills in:
- Writing specific review criteria defining which issues to report (bugs, security) vs skip (minor style, local patterns)
- Temporarily disabling high false-positive categories to restore developer trust
- Defining explicit severity criteria with concrete code examples for each level

**Task 4.2: Apply few-shot prompting to improve output consistency and quality**
Knowledge of:
- Few-shot examples are the most effective technique for consistently formatted, actionable output
- Few-shot examples demonstrate ambiguous-case handling (tool selection, coverage gaps)
- Few-shot examples enable generalization to novel patterns, not just matching pre-specified cases
- Effective for reducing hallucination in extraction tasks (informal measurements, varied document structures)

Skills in:
- Creating 2-4 targeted few-shot examples for ambiguous scenarios showing reasoning for chosen action
- Including examples that demonstrate specific desired output format (location, issue, severity, suggested fix)
- Providing few-shot examples distinguishing acceptable code patterns from genuine issues
- Using few-shot for varied document structures (inline citations vs bibliographies, methodology sections vs embedded details)
- Adding few-shot examples showing correct extraction with varied formats to address empty/null fields

**Task 4.3: Enforce structured output using tool use and JSON schemas**
Knowledge of:
- `tool_use` with JSON schemas is the most reliable approach for guaranteed schema-compliant structured output
- `tool_choice: "auto"` (may return text), `"any"` (must call a tool), forced selection (must call a specific named tool)
- Strict JSON schemas via tool use eliminate syntax errors but do NOT prevent semantic errors (line items do not sum to total, values in wrong fields)
- Schema design: required vs optional fields, enum fields with `"other"` + detail string for extensible categories

Skills in:
- Defining extraction tools with JSON schemas as input parameters, extracting structured data from `tool_use` response
- Setting `tool_choice: "any"` to guarantee structured output when multiple schemas exist
- Forcing a specific tool with `tool_choice: {"type": "tool", "name": "extract_metadata"}` for pipeline ordering
- Designing optional (nullable) schema fields to prevent fabrication when source documents lack information
- Adding `"unclear"` and `"other"` enum values with detail fields for extensible categorization
- Including format normalization rules in prompts alongside strict output schemas

**Task 4.4: Implement validation, retry, and feedback loops for extraction quality**
Knowledge of:
- Retry-with-error-feedback: append specific validation errors to the prompt on retry to guide correction
- Retries are ineffective when information is simply absent from the source document (vs format/structural errors)
- `detected_pattern` field in findings to enable systematic analysis of dismissal patterns
- Difference between semantic validation errors (values do not sum) and schema syntax errors (eliminated by tool use)

Skills in:
- Implementing follow-up requests that include the original document, the failed extraction, and specific validation errors
- Identifying when retries will be ineffective (missing information) vs effective (format mismatches)
- Adding `detected_pattern` fields to enable analysis of false positive patterns
- Designing self-correction validation: `calculated_total` alongside `stated_total`, `conflict_detected` booleans

**Task 4.5: Design efficient batch processing strategies**
Knowledge of:
- Message Batches API: 50% cost savings, up to 24-hour processing window, no guaranteed latency SLA
- Appropriate for non-blocking, latency-tolerant workloads (overnight reports, weekly audits, nightly test generation)
- NOT appropriate for blocking workflows (pre-merge checks)
- Batch API does not support multi-turn tool calling within a single request
- `custom_id` fields for correlating batch request/response pairs

Skills in:
- Matching API approach to latency requirements: synchronous for blocking, batch for overnight/weekly
- Calculating batch submission frequency based on SLA constraints (e.g., 4-hour windows for 30-hour SLA)
- Handling batch failures: resubmit only failed documents (identified by `custom_id`) with modifications
- Using prompt refinement on a sample set before batch-processing large volumes

**Task 4.6: Design multi-instance and multi-pass review architectures**
Knowledge of:
- Self-review limitations: a model retains reasoning context from generation, making it less likely to question its own decisions
- Independent review instances (without prior reasoning context) are more effective at catching subtle issues
- Multi-pass review: per-file local analysis passes plus cross-file integration passes to avoid attention dilution

Skills in:
- Using a second independent Claude instance to review generated code without the generator's reasoning context
- Splitting large multi-file reviews into per-file passes plus integration passes for cross-file data flow
- Running verification passes where the model self-reports confidence alongside each finding

### Domain 5: Context Management & Reliability (15%)

**Task 5.1: Manage conversation context to preserve critical information across long interactions**
Knowledge of:
- Progressive summarization risks: condensing numerical values, percentages, dates, and customer-stated expectations into vague summaries loses actionable detail
- The "lost in the middle" effect: models reliably process information at the beginning and end of long inputs but may omit findings from middle sections
- How tool results accumulate in context and consume tokens disproportionately to their relevance (e.g., 40+ fields per order lookup when only 5 are relevant)
- The importance of passing complete conversation history in subsequent API requests to maintain conversational coherence

Skills in:
- Extracting transactional facts (amounts, dates, order numbers, statuses) into a persistent "case facts" block included in each prompt, outside summarized history
- Extracting and persisting structured issue data (order IDs, amounts, statuses) into a separate context layer for multi-issue sessions
- Trimming verbose tool outputs to only relevant fields before they accumulate in context
- Placing key findings summaries at the beginning of aggregated inputs and organizing detailed results with explicit section headers to mitigate position effects
- Requiring subagents to include metadata (dates, source locations, methodological context) in structured outputs to support accurate downstream synthesis
- Modifying upstream agents to return structured data (key facts, citations, relevance scores) instead of verbose content when downstream agents have limited context budgets

**Task 5.2: Design effective escalation and ambiguity resolution patterns**
Knowledge of:
- Appropriate escalation triggers: customer requests for a human, policy exceptions/gaps (not just complex cases), and inability to make meaningful progress
- The distinction between escalating immediately when a customer explicitly demands it versus offering to resolve when the issue is straightforward
- Why sentiment-based escalation and self-reported confidence scores are unreliable proxies for actual case complexity
- How multiple customer matches require clarification (requesting additional identifiers) rather than heuristic selection

Skills in:
- Adding explicit escalation criteria with few-shot examples to the system prompt demonstrating when to escalate versus resolve autonomously
- Honoring explicit customer requests for human agents immediately without first attempting investigation
- Acknowledging frustration while offering resolution when the issue is within the agent's capability, escalating only if the customer reiterates their preference
- Escalating when policy is ambiguous or silent on the customer's specific request (e.g., competitor price matching when policy only addresses own-site adjustments)
- Instructing the agent to ask for additional identifiers when tool results return multiple matches, rather than selecting based on heuristics

**Task 5.3: Implement error propagation strategies across multi-agent systems**
Knowledge of:
- Structured error context (failure type, attempted query, partial results, alternative approaches) enables intelligent coordinator recovery decisions
- The distinction between access failures (timeouts needing retry decisions) and valid empty results (successful queries with no matches)
- Why generic error statuses ("search unavailable") hide valuable context from the coordinator
- Why silently suppressing errors (returning empty results as success) or terminating entire workflows on single failures are both anti-patterns

Skills in:
- Returning structured error context including failure type, what was attempted, partial results, and potential alternatives to enable coordinator recovery
- Distinguishing access failures from valid empty results in error reporting so the coordinator can make appropriate decisions
- Having subagents implement local recovery for transient failures and only propagate errors they cannot resolve, including what was attempted and partial results
- Structuring synthesis output with coverage annotations indicating which findings are well-supported versus which topic areas have gaps due to unavailable sources

**Task 5.4: Manage context effectively in large codebase exploration**
Knowledge of:
- Context degradation in extended sessions: models start giving inconsistent answers and referencing "typical patterns" rather than specific classes discovered earlier
- The role of scratchpad files for persisting key findings across context boundaries
- Subagent delegation for isolating verbose exploration output while the main agent coordinates high-level understanding
- Structured state persistence for crash recovery: each agent exports state to a known location, and the coordinator loads a manifest on resume

Skills in:
- Spawning subagents to investigate specific questions (e.g., "find all test files," "trace refund flow dependencies") while the main agent preserves high-level coordination
- Having agents maintain scratchpad files recording key findings, referencing them for subsequent questions to counteract context degradation
- Summarizing key findings from one exploration phase before spawning sub-agents for the next phase, injecting summaries into initial context
- Designing crash recovery using structured agent state exports (manifests) that the coordinator loads on resume and injects into agent prompts
- Using `/compact` to reduce context usage during extended exploration sessions when context fills with verbose discovery output

**Task 5.5: Design human review workflows and confidence calibration**
Knowledge of:
- The risk that aggregate accuracy metrics (e.g., 97% overall) may mask poor performance on specific document types or fields
- Stratified random sampling for measuring error rates in high-confidence extractions and detecting novel error patterns
- Field-level confidence scores calibrated using labeled validation sets for routing review attention
- The importance of validating accuracy by document type and field segment before automating high-confidence extractions

Skills in:
- Implementing stratified random sampling of high-confidence extractions for ongoing error rate measurement and novel pattern detection
- Analyzing accuracy by document type and field to verify consistent performance across all segments before reducing human review
- Having models output field-level confidence scores, then calibrating review thresholds using labeled validation sets
- Routing extractions with low model confidence or ambiguous/contradictory source documents to human review, prioritizing limited reviewer capacity

**Task 5.6: Preserve information provenance and handle uncertainty in multi-source synthesis**
Knowledge of:
- How source attribution is lost during summarization steps when findings are compressed without preserving claim-source mappings
- The importance of structured claim-source mappings that the synthesis agent must preserve and merge when combining findings
- How to handle conflicting statistics from credible sources: annotating conflicts with source attribution rather than arbitrarily selecting one value
- Temporal data: requiring publication/collection dates in structured outputs to prevent temporal differences from being misinterpreted as contradictions

Skills in:
- Requiring subagents to output structured claim-source mappings (source URLs, document names, relevant excerpts) that downstream agents preserve through synthesis
- Structuring reports with explicit sections distinguishing well-established findings from contested ones, preserving original source characterizations and methodological context
- Completing document analysis with conflicting values included and explicitly annotated, letting the coordinator decide how to reconcile before passing to synthesis
- Requiring subagents to include publication or data collection dates in structured outputs to enable correct temporal interpretation
- Rendering different content types appropriately in synthesis outputs (financial data as tables, news as prose, technical findings as structured lists) rather than converting everything to a uniform format

### Extra topics other prep sites list for each domain (not in the task statements)
- **D1:** parallel vs sequential subagent execution, scoped tool access, clarifying ambiguity before long autonomous runs, designing human-in-the-loop interrupts, recovering when a subagent fails mid-task.
- **D2:** MCP primitives (resources, tools, prompts), JSON Schema for tool inputs, naming conventions, auth for production MCP, spotting flawed tool schemas, when to expose a capability as a tool vs a skill.
- **D3:** settings.json vs settings.local.json, permission allowlists for Bash and file tools, MCP servers inside Claude Code, CLAUDE.md that guides without over-constraining. One prep site says "expect at least one question on PostToolUse hooks."
- **D4:** persona and role, context construction, choosing and ordering few-shot examples, chain-of-thought and extended thinking, preventing prompt injection, a "4D framework", "attention engineering", system prompts.
- **D5:** prompt caching (`cache_control` ephemeral), compaction and summarization, estimating and budgeting tokens, multi-turn design. One prep site calls D5 "the most common source of careless wrong answers."

---

## 4. The six scenarios

| # | Scenario | Description | Main domains |
|---|---|---|---|
| 1 | **Customer Support Resolution Agent** | A support agent built with the Claude Agent SDK. Handles returns, billing disputes and account issues through MCP tools (`get_customer`, `lookup_order`, `process_refund`, `escalate_to_human`). Target: 80%+ first-contact resolution while knowing when to escalate. | D1, D2, D5 |
| 2 | **Code Generation with Claude Code** | Claude Code for code generation, refactoring, debugging and documentation. Custom slash commands, CLAUDE.md setup, plan mode vs direct execution. | D3, D5 |
| 3 | **Multi-Agent Research System** | A coordinator delegates to specialized subagents (web search, document analysis, report synthesis) to produce thorough, cited reports. Covers orchestration, passing context, and partial failures. | D1, D2, D5 |
| 4 | **Developer Productivity with Claude** | An agent helps engineers explore unfamiliar codebases, understand legacy systems and generate boilerplate. Uses built-in tools (Read, Write, Bash, Grep, Glob) and MCP servers. | D2, D3, D1 |
| 5 | **Claude Code for CI/CD** | Claude Code in a CI/CD pipeline for automated review, test generation and PR feedback. Prompts must give actionable feedback with few false positives. `-p`, `--output-format json`, session isolation. | D3, D4 |
| 6 | **Structured Data Extraction** | Extract data from unstructured documents, validate with JSON schemas, keep accuracy high, handle edge cases and feed downstream systems. Nullable fields, batch strategy. | D4, D5 |

Short focus per scenario (GitHub study guide): S1 Agent SDK, MCP tools, escalation logic. S2 CLAUDE.md, plan mode, slash commands. S3 coordinator–subagent patterns, error handling. S4 built-in tools, MCP servers, codebase exploration. S5 structured output, Batch API, multi-pass review. S6 JSON schemas, tool_use, validation and retry.

---

## 5. What the questions are like

The questions test **applied architecture judgment**, not recall. A typical question:
1. Sets up a production system from one of the scenarios.
2. Describes a specific, often numeric symptom ("skips `get_customer` 12% of the time", "55% first-contact resolution vs an 80% target", "adds 40% latency", "18 tools").
3. Asks for the **most effective fix**, the **best approach**, the **most likely root cause** or **where to configure** something.
4. Offers four plausible options. Only one fixes the root cause in the right way, at the right layer and at the right cost.

### How wrong options are built
"Every distractor is an anti-pattern dressed up as the right call." (claudearchitectcertification.com)

1. **A prompt fix where a structural one exists**: "add an instruction to always…" or "add few-shot examples" when a hook, prerequisite gate, schema or merged tool would guarantee the behavior. ("A prompt instruction is a probabilistic nudge, not a structural guarantee.")
2. **Over-engineering**: adding a classifier, a separate routing layer, or merging tools when expanding descriptions would do.
3. **Treating the symptom**: granting broader permissions, shortening descriptions, renaming tools when the real problem is overlap, retrying a permanent error, or reassigning work to an agent that will fail the same way.
4. **The wrong configuration layer**: global `~/.claude/...` vs project `.claude/...` vs `settings.local.json` vs CLAUDE.md (guidance, not enforcement).
5. **Throwing away state**: clearing history, restarting, or returning an error to the user when compaction is available.
6. **Misreading parameters**: for example, treating `max_tokens` as the input window size, or raising temperature to make judgment more "nuanced".
7. **Going around the coordinator**: subagents writing to shared context or a shared database instead of reporting back through the hub.
8. **Unreliable proxies**: sentiment, all-caps text, self-reported confidence, overall accuracy numbers.
9. **Silent failure or total failure**: returning empty results as success, or ending the whole workflow over one subagent failure.
10. **Ignoring timing**: using the Batch API for blocking pre-merge checks.

### Patterns in the correct answers
- Deterministic or structural (hooks, gates, schemas, tool contracts) beats prompt-based **when compliance must be guaranteed**.
- Fix the root cause with the smallest effective change. Better tool descriptions come before routing layers.
- Subagents never inherit context. Pass it explicitly.
- All communication goes through the coordinator (hub-and-spoke).
- Return structured errors (category, retryable, what was attempted, partial results). Recover locally from transient errors and pass up only what can't be resolved.
- A failed call is not the same as a valid empty result.
- Escalate on explicit criteria: a direct request for a human, a policy gap, or no progress. Never escalate on sentiment.
- When a lookup returns several matching customers, ask for another identifier instead of guessing.
- Use a case-facts block and compaction instead of restarting. Put key information at the start and end of long inputs.
- Use few-shot examples to anchor format and tone when output drifts.
- Use tool_use with a JSON schema, nullable fields and validation-retry for extraction. Retries can't recover missing information.
- Use an independent reviewer instance rather than self-review. Use per-file passes plus a cross-file pass.
- Batch for jobs nothing waits on, synchronous for blocking ones. Resubmit only failures by `custom_id`.
- Team config goes in committed project files. Personal config goes in user or `.local` files.
- Plan mode for architectural or multi-file work. Direct execution for clear, small fixes.
- Answer honestly when a tool is down: say so, give a realistic next step, offer escalation, never guess a status.
- Persist compact structured results per agent and resume only unfinished work. Don't replay full histories.
- Search for a known identifier first and open only the matching files.

### Key decision frameworks (GitHub study guide)
| Situation | Choose |
|---|---|
| Financial or safety-critical rule | Programmatic hook or gate (not a prompt) |
| Best-effort preference | Prompt guidance |
| Multi-file or architectural change | Plan mode |
| Single-file, clear fix | Direct execution |
| Must call *some* tool | `tool_choice: "any"` |
| Must call a *specific* tool first | Forced `tool_choice: {"type":"tool","name":...}` |
| Blocking workflow (pre-merge) | Synchronous API |
| Latency-tolerant (overnight, weekly) | Message Batches API |
| Subagent failure | Structured error context (not generic, not silent) |
| Customer asks for a human | Escalate immediately |
| Frustrated customer, simple issue | Acknowledge, offer to resolve, escalate if they ask again |
| Large PR | Multi-pass (per-file plus integration) |
| Subagent context | Always explicit |

### The 10 critical anti-patterns (always wrong answers)
1. Parsing natural language for loop termination instead of checking `stop_reason`
2. Arbitrary iteration caps as the primary stopping mechanism
3. Prompt-based enforcement for critical business rules (use hooks)
4. Self-reported confidence scores for escalation decisions
5. Sentiment-based escalation (sentiment ≠ complexity)
6. Generic error messages hiding diagnostic context
7. Silently suppressing errors (returning empty results as success)
8. Too many tools per agent (18 vs 4–5 recommended)
9. Same-session self-review (the model keeps its own reasoning bias)
10. Aggregate accuracy metrics hiding per-document-type failures

---

## 6. Sample questions

### 6a. Official sample questions (9, across 3 scenarios)
Stems are paraphrased from the jc-aiwiki reproduction. Full option text wasn't available, so the wrong options are described by the reason they're wrong.

**Q1: Customer Support (Tasks 1.4, 1.5)**
The agent skips `get_customer` 12% of the time and calls `lookup_order` with the customer's stated name, which misidentifies accounts. What is the best fix?
- ✅ Add a programmatic prerequisite that blocks `lookup_order` and `process_refund` until `get_customer` returns a verified customer ID.
- ✗ Stronger system-prompt instruction: probabilistic.
- ✗ Few-shot examples of the correct order: probabilistic.
- ✗ Routing classifier: deals with which tools are available, not the order they run in.

**Q2: Customer Support (Task 2.1)**
The agent calls `get_customer` when users ask about orders ("check my order #12345") because both tools have minimal, overlapping descriptions. What is the best fix?
- ✅ Expand each tool's description with input formats, example queries, edge cases and boundaries.
- ✗ Few-shot examples: add overhead without fixing the root cause.
- ✗ Routing layer: over-engineered.
- ✗ Merging the tools: more effort than the problem needs.

**Q3: Customer Support (Task 5.2)**
First-contact resolution is 55% against an 80% target. The agent escalates simple cases but tries complex policy exceptions on its own. What is the best fix?
- ✅ Add explicit escalation criteria with few-shot examples to the system prompt.
- ✗ Self-reported confidence threshold: poorly calibrated.
- ✗ Separate classifier: over-engineered.
- ✗ Sentiment-based escalation: sentiment doesn't track complexity.

**Q4: Claude Code (Task 3.2)**
A `/review` command must be available to every developer who clones the repo. Where does it go?
- ✅ `.claude/commands/` in the project repo.
- ✗ `~/.claude/commands/`: personal only.
- ✗ CLAUDE.md: holds instructions, not command definitions.
- ✗ A `.claude/config.json` commands array: doesn't exist.

**Q5: Claude Code (Task 3.4)**
Restructuring a monolith into microservices: dozens of files and architectural decisions. Which approach?
- ✅ Enter plan mode.
- ✗ Direct execution in any form: risks costly rework.

**Q6: Claude Code (Task 3.3)**
Test files follow the same conventions wherever they are. How do you apply those conventions?
- ✅ A `.claude/rules/` file with YAML frontmatter glob patterns (e.g., `**/*.test.tsx`).
- ✗ Root CLAUDE.md: relies on Claude to infer which files it applies to.
- ✗ Skills: have to be invoked by hand.
- ✗ Subdirectory CLAUDE.md files: can't cover files spread across directories.

**Q7: Multi-Agent Research (Task 1.2)**
Research on "AI in creative industries" covers only visual arts and misses music, writing and film. Each subagent does its own scope correctly. What is the root cause?
- ✅ The coordinator's task decomposition is too narrow.

**Q8: Multi-Agent Research (Task 5.3)**
The web search subagent times out. What should it return?
- ✅ Structured error context: failure type, attempted query, partial results, alternatives.
- ✗ Generic "search unavailable": hides context.
- ✗ Return empty results: suppresses the error.
- ✗ Propagate the exception: ends the workflow unnecessarily.

**Q9: Multi-Agent Research (Task 2.3)**
The synthesis agent needs fact checks (85% are simple lookups). Sending them through the coordinator adds 2–3 round trips and 40% latency. What is the best fix?
- ✅ Give the synthesis agent a scoped `verify_fact` tool. Complex verifications still go through the coordinator.
- ✗ Batching: delays synthesis.
- ✗ Full web search tool: too many tools, and outside the agent's role.
- ✗ Proactive caching: requires predicting what will be needed.

**Extra questions from the study guide, as listed on jc-aiwiki (not official):**
- Q10 (Task 3.6): A CI pipeline hangs waiting for interactive input. → Use `claude -p "..."`.
- Q11 (Task 4.5): A manager proposes the Batch API for both pre-merge checks and overnight tech-debt reports. → Batch only the overnight reports; keep pre-merge real-time.
- Q12 (Task 4.6): A single-pass review of 14 files is inconsistent and misses bugs. → Per-file local passes plus a cross-file integration pass.

### 6b. Sample questions from claudecertifiedarchitects.com (unofficial; full options, paraphrased)

**Q1 (Agentic Architecture).** An orchestrator spawns four parallel subagents over a large document. One hits a file-system permission error and stops. What is the best response?
- A. Reassign that section to a subagent that finished, since its file access works.
- B. Have the failed subagent write its error into shared context so the others can route around it.
- C. Report the partial failure to the user, return the successful results, and ask for clarification before retrying. ✅
- D. Grant the subagent broader permissions and rerun without interrupting the user.
- *Why:* a permission error isn't transient, so retrying unchanged won't fix it. Escalate when an agent can't make progress alone. D has the agent grant itself a capability. A retries something that will fail the same way. B goes around the coordinator, which owns error handling.

**Q2 (Claude Code Configuration).** `npm test` and `npm run build` should run without prompts while other Bash commands still need approval, for every developer who clones the repo. Where do you configure this?
- A. Global `~/.claude/settings.json` under allowedTools.
- B. Project `.claude/settings.json` under allowedTools, committed to version control. ✅
- C. Project CLAUDE.md as a natural-language permission instruction.
- D. Project `.claude/settings.local.json` under allowedTools.
- *Why:* committed project settings apply to everyone. Global applies to every project on that machine. CLAUDE.md is guidance, not an enforced permission. `.local` is personal and isn't committed.
- ⚠️ The documented Claude Code key is a `permissions.allow` array, not `allowedTools`. Check against the docs.

**Q3 (Prompt Engineering).** A production support prompt has a clear persona, detailed instructions and rich context, but tone and length vary between sessions. It has no worked examples. What is the most likely root cause?
- A. The persona is too broad.
- B. Without concrete examples, Claude has no calibration anchor for tone, length and format. ✅
- C. The instructions are too long, so the model ignores parts of them.
- D. The context conflicts with the persona.
- *Why:* few-shot examples anchor length, tone and structure. Two or three worked examples are the fastest fix when everything else is solid.

**Q4 (Tool Design & MCP).** An MCP server exposes `get_order_status` and `get_order_shipping_info`. Both query the same orders table and are almost always needed together, but Claude sometimes calls only one. What is the most effective fix?
- A. Give both tools more distinctive names.
- B. Merge them into one `get_order_details` tool. ✅
- C. Add a system-prompt note to always call both.
- D. Keep them separate and shorten the descriptions.
- *Why:* merging removes the coordination decision entirely. A prompt instruction is a probabilistic nudge. Renaming addresses the wrong cause, and shorter descriptions make selection harder.

**Q5 (Context Management).** A long agentic task has about 15% of its context window left and needs three more tool calls. What is the best strategy?
- A. Clear the history and restart with the original system prompt.
- B. Summarize the completed steps into a compact state block and continue from it. ✅
- C. Increase `max_tokens` to extend the window.
- D. Return a context-limit error and ask the user to restart.
- *Why:* compaction keeps state and A throws it away. `max_tokens` controls output length, not the input window. An error is premature while compaction is available.

### 6c. Practice questions from the GitHub study guide (dnacenta; unofficial)

**Domain 1**
- Q1. After Claude responds in an agentic loop, what should the system check to decide the next action? A) Whether the response contains text B) **The `stop_reason` field** ✅ C) The length of the response D) Whether Claude sounded confident.
- Q2. A coordinator needs to pass customer information to a subagent. A) The subagent inherits the coordinator's context automatically B) **Include all relevant information explicitly in the subagent's prompt** ✅ C) Store it in a shared database D) Use environment variables.
- Q3. Identity verification must happen before any refund. A) A system-prompt instruction B) **A PreToolUse hook that blocks `process_refund` until verification is done** ✅ C) Train the model on examples D) Raise the temperature.

**Domain 2** (only the answers were captured)
- Q1. 18 tools with frequent wrong picks → split them across specialized subagents with about 4–5 tools each.
- Q2. A search returns an empty array → check the response status to tell a valid "no results" from a failed search.
- Q3. MCP credentials in `.mcp.json` → use `${VAR_NAME}` environment expansion.
- Q4. About 200 tools (~55k tokens of definitions) → turn on tool search, keep the 3–5 most-used tools loaded and defer the rest. Deferring every tool, including the search tool itself, causes an error. *(Beyond the guide.)*
- Q5. Forced `tool_choice` after migrating to Fable 5.1 → use `auto` plus an explicit instruction plus `strict: true`, or structured outputs. *(Beyond the guide, time-sensitive.)*

**Domain 3**
- Q1. Testing conventions for `*.test.ts` files spread across directories. A) A CLAUDE.md in every test directory B) **One `.claude/rules/` file with `paths` frontmatter for `**/*.test.ts`** ✅ C) Rules in the project CLAUDE.md D) Move all tests into a `tests/` directory with its own CLAUDE.md.
- Q2. When should you use plan mode? A) A single bug with a clear stack trace B) **Migrating a library across 45+ files** ✅ C) Adding a null check D) Updating a config constant.
- Q3. Which flag is essential for automated code review in CI? A) `--verbose` B) **`-p` / `--print`** ✅ C) `--force` D) `--no-cache`.

**Domain 4**
- Q1. A review system uses "use your best judgment" as its reporting criterion. A) More examples of past reviews B) **Replace it with explicit criteria for what counts as a reportable issue** ✅ C) Higher temperature D) A confidence threshold.
- Q2. Invoice extraction uses strict mode, but the total sometimes doesn't match the sum of the line items. A) Strict mode is broken B) The schema is misconfigured C) **Strict mode guarantees the schema, not semantic correctness** ✅ D) The model needs fine-tuning.
- Q3. A batch of 1,000 documents has 50 failures. A) Resubmit all 1,000 B) **Use `custom_id` to find and resubmit only the 50** ✅ C) Switch to synchronous processing D) Increase the batch timeout.
- Q4. *(Beyond the guide, time-sensitive.)* An extraction service sets `thinking={"type":"enabled","budget_tokens":8000}` and `temperature=0` and is being moved to a newer Opus model. → **B: both return a 400. Use `thinking={"type":"adaptive"}` and set depth with `output_config.effort`.**

**Domain 5**
- Q1. Order #67890 ($149.99) became "a recent order" after compression. A) Bigger context window B) **Extract critical transactional data into a persistent case-facts block** ✅ C) Turn off compression D) Repeat the details in every message.
- Q2. "I AM SO ANGRY RIGHT NOW!!!" about a simple $5 charge. Escalate? A) Yes, high sentiment B) Yes, capital letters C) **No: sentiment doesn't indicate complexity, and the issue is simple** ✅ D) No, but lower the confidence score.
- Q3. 97% overall extraction accuracy: ready for production? A) Yes B) **Check that accuracy holds across document types and fields** ✅ C) Run more documents D) Compare with competitors.
- Q4. Two subagents return different values for the same metric. A) Average them B) Use the most recent C) **Annotate the conflict with source attribution and let the user decide** ✅ D) Discard both and search again.
- Q5–Q8 *(Beyond the guide, time-sensitive API details)*: losing compaction state by appending only `response.content[0].text`; task budgets (`output_config.task_budget`) for pacing; keeping history append-only and using server-side context editing (`clear_tool_uses_20250919`) instead of deleting tool results; misplaced compaction blocks failing silently.

---

## 7. Material beyond the exam guide (GitHub study guide; probably not tested)
Useful background, but label it separately on the site. Version-dated and may change.
- **Naming:** the exam guide calls the subagent-spawning tool the **Task** tool. Current Claude Code and Agent SDK docs call it **`Agent`**. A "Task tool" question means the same thing.
- **Tool search** (`defer_loading`, regex or BM25 variants) changes the "4–5 tools" rule. The 4–5 refers to the tools in front of the model when it decides.
- **Hook events:** 33 in total. The exam-relevant ones are `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`, `SubagentStop`, `PreCompact`. Hook types: `command` (exit 0 passes, exit 2 blocks), `http`, `mcp_tool`, `prompt`, `agent`.
- **MCP transports:** stdio, Streamable HTTP (`"http"`), SSE (legacy), WebSocket (`"ws"`). An entry with a `url` but no `type` is a configuration error.
- **MCP scopes:** local (default; stored in `~/.claude.json` keyed by project), project (`.mcp.json`), user (`~/.claude.json`), managed.
- **Built-in tools** also include Agent, Skill, NotebookEdit, AskUserQuestion, ToolSearch, SendMessage/ListAgents and Workflow.
- **Context and compaction:** context editing (`clear_tool_uses_20250919`, `clear_thinking_20251015`), on-demand vs threshold compaction, the memory tool (`memory_20250818`), task budgets (`output_config.task_budget`, minimum 20,000).
- **CLAUDE.md loading:** files load from broadest to most specific and are concatenated, not overridden. `.claude/commands/` has been merged into skills. Skill frontmatter also supports `agent`, `disable-model-invocation` and `paths`.
- **Built-in subagents:** Explore, Plan, general-purpose, claude. **Permission modes:** default, acceptEdits, plan, auto, dontAsk, bypassPermissions.

### Listed as supplementary, not core
Specific release versions, model aliases and defaults, pricing and multiplier settings, model resolution per provider (Bedrock, Vertex, Foundry), settings and env vars for cost, cache and fleet control (e.g. `promptCacheTtl`, `bashOutputMaxChars`, `CLAUDE_CODE_DISABLE_WEB_FETCH`), beta headers, CLI flags beyond those in the guide, managed-integration details, and the current model lineup and prices. The official guide has no explicit out-of-scope list.

---

## 8. Preparation resources

### Anthropic Academy (free, on anthropic.skilljar.com / Partner Academy)
- Claude 101
- AI Capabilities and Limitations
- Building with the Claude API
- Introduction to Model Context Protocol
- Model Context Protocol: Advanced Topics
- Introduction to Subagents
- Introduction to Agent Skills
- Claude Code 101
- Claude Code in Action
- Introduction to Claude Cowork
- Bonus: Claude with Amazon Bedrock; Claude with Google Cloud's Vertex AI

### Hands-on projects (recommended)
1. Build an agent end to end with the Agent SDK: tool calling, error handling, sessions, subagents, hooks.
2. Configure Claude Code for a real project: CLAUDE.md hierarchy, `.claude/rules/` with `paths`, a skill using `context: fork` and `allowed-tools`, `.mcp.json` with env expansion.
3. Design MCP tools with error categories and `isRetryable` flags.
4. Build an extraction pipeline: tool_use, JSON schemas, nullable fields, validation and retry, the Message Batches API with `custom_id`.
5. Write few-shot examples and explicit review criteria. Run Claude Code with `-p --output-format json --json-schema`.
6. Practice context management: scratchpad files, subagents, `/compact`, case-facts blocks.

### Study plans (opinions from prep vendors)
- If you already build with Claude: 2–4 weeks at 60–90 minutes a day. Starting cold: 6–8 weeks.
- GitHub study guide: 4 weeks at 1.5–2 hours a day. Week 1 core architecture; week 2 applied skills; week 3 reliability and hands-on; week 4 practice exams and timed sets.
- claudecertifiedarchitects.com: 7-day sprint or 14-day plan.
- claudearchitectcertification.com suggests scoring 850/1000 on its mock before booking.

### Third-party practice (all unofficial)
- claudearchitectcertification.com: 10-question diagnostic (no login), 500-question bank, 60-question timed mock (paid Pro).
- claudecertifiedarchitects.com: free 10-question sprint, 500-question bank, 60-question mock.
- ccaf.cyberskill.world: free mock with a timer and an explanation for each option.
- open-exam-prep.com, flashgenius.net, Udemy practice-exam courses.
- ⚠️ Ignore the "dump" sellers (ITExamspro, PassExam4Sure, ITExamHome, Certs4Future, etc.) that appear in comment sections.

---

## 9. Where the sources disagree

| Topic | Disagreement | Best guess |
|---|---|---|
| Question type | Single answer (4 options) vs multiple choice plus multiple response | v1.0 includes multiple response; support both |
| Time limit | 120 min (most sources) vs not stated (launch guide) vs 90 min (one outlier) | 120 minutes |
| Question count | 60 (most) vs 65 (one outlier) | 60 |
| Exam code | CCA-F vs CCAR-F | CCAR-F (v1.0) |
| Scenario pool | 6 (official guide) vs 13 (one prep site) | Prepare all 6; the other 7 are unverified |
| Registration | Open access request (April) vs partner-gated (Sept) | Partner-gated (newer) |
| Fee | $99 vs $125 | $125 since mid-2026 |
| Validity | 6 months (beta) vs 12 months (v1.0) | 12 months |
| Domain numbering | D2/D3 order swapped on one site | Weights are the same either way |
| Settings key in sample Q | `allowedTools` vs documented `permissions.allow` | Check the Claude Code docs |
| B's question taxonomy | "four areas, split evenly" (CyberSkill) | Doesn't match the official five weighted domains; ignore |

---

## 10. Notes for building the study site
- Group questions by **scenario** (4 of 6 per mock exam) and tag each with a **domain** and **task statement** (1.1–5.6), so mocks can be weighted 27/18/20/20/15.
- Support **multiple-response** items (the question says "select 2"), not just single answer with 4 options.
- For **every** option, explain why it's right or wrong and name the anti-pattern it represents. Most of the learning comes from this.
- Mock mode: 60 questions, 120-minute timer, scaled score out of 1000, pass at 720, review afterwards.
- Track weak areas by domain and task statement.
- Mark "beyond the guide" or version-dated content separately from core syllabus content.
- Don't present prep-site questions as official exam items. Check the license before reusing reproduced text.

---

## Sources
- jc-aiwiki, official exam guide reproduction: https://jc-aiwiki.pages.dev/claude-ai/official-exam-guide
- dnacenta/claude-certified-architect (GitHub, unofficial study guide): https://github.com/dnacenta/claude-certified-architect
- DEV, "5 Domains, 6 Scenarios": https://dev.to/aws-builders/the-claude-certified-architect-exam-5-domains-6-scenarios-and-everything-you-need-to-know-4le3
- DEV, "What the exam actually tests" (CyberSkill): https://dev.to/zintaen/i-built-a-free-claude-certified-architect-practice-exam-here-is-what-the-exam-actually-tests-4ea5
- claudearchitectcertification.com exam guide: https://claudearchitectcertification.com/exam-guide
- claudecertifiedarchitects.com study plan and sample questions: https://www.claudecertifiedarchitects.com/blog/cca-foundations-exam-guide-2026/
- Whizlabs CCA-F guide: https://www.whizlabs.com/blog/cca-f-exam-guide/
- FlashGenius CCAR-F guide: https://flashgenius.net/blog-article/a-guide-to-the-claude-certified-architect-foundations-certification
- AgileFever, cost and eligibility: https://agilefever.com/cca-f-certification-cost-eligibility-exam-details/
- claudepractice.com exam overview: https://claudepractice.com/exam
- CloudThat exam guide: https://www.cloudthat.com/resources/blog/claude-certified-architect-foundations-exam-guide-skills-format-and-preparation
- Other guides from search results: lowcode.agency, passitexams.com, aitomationacademy.com, claudecertificationguide.com, digitalstrategy-ai.com, open-exam-prep.com, amitgambhir.github.io, claude-certified-architect.pages.dev

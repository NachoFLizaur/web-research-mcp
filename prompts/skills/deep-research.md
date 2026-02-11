# Deep Research Methodology

This skill teaches you the comprehensive research methodology for conducting thorough, multi-source web research using the web-research MCP tools.

## When to Apply This Skill

Use this methodology when:
- The question requires multiple sources to answer well
- You need to compare options, tools, or approaches
- The topic is complex and benefits from cross-referencing
- The user explicitly asks for deep or comprehensive research

## The 4-Step Research Workflow

### Step 1: Generate EXACTLY 10 Search Queries

Expand the research question into 10 diverse queries that cover different angles.

**Query Strategy:**
- Queries 1-2: Broad overview of the topic
- Queries 3-4: Specific aspects or subtopics
- Queries 5-6: Comparisons and alternatives
- Queries 7-8: Authoritative sources (use `site:` operator)
- Queries 9-10: Practical experience, benchmarks, or case studies

**Rules:**
- Always generate exactly 10 queries
- Each query should target a different angle
- Include the current year for time-sensitive topics
- Use search operators where they add precision

**Output format:**
```json
["query 1", "query 2", "query 3", "query 4", "query 5", "query 6", "query 7", "query 8", "query 9", "query 10"]
```

### Step 2: Search All Queries in Parallel

Call `web-research_multi_search` with all 10 queries at once:

```json
{
  "queries": [...all 10 queries...],
  "results_per_query": 5
}
```

This typically returns 30-50 unique URLs after deduplication.

### Step 3: Fetch ALL Returned URLs

Call `web-research_fetch_pages` with every URL from the search results:

```json
{
  "urls": [...all URLs...],
  "max_chars": 15000,
  "timeout": 30
}
```

**Critical**: Do NOT filter or select a subset. Fetch all URLs. More sources produce better synthesis.

### Step 4: Synthesize Findings

This is the most important step. Combine all fetched content into a comprehensive answer.

**Synthesis Process:**
1. Read all fetched content carefully - don't skim
2. Identify key themes that appear across multiple sources
3. Note where sources agree and where they conflict
4. Extract quantitative data (numbers, benchmarks, dates)
5. Formulate your answer addressing the original question directly

## Output Format Template

```markdown
## Research: [Topic]

### Executive Summary
[3-5 sentences - standalone overview of findings]

### Key Findings

#### 1. [Finding Title]
[2-4 paragraphs with evidence and citations]
**Evidence:** [Source citations with URLs]
**Confidence**: High/Medium/Low - [justification]

[Repeat for 5-7 findings]

### Comparison/Trade-offs
[Table comparing options if applicable]

### Conflicting Information
[Where sources disagreed and analysis of why]

### Confidence Assessment
[Table of findings with confidence levels]

### Sources Used
[Numbered list of all contributing sources with URLs]

### Research Gaps & Limitations
[What couldn't be found or verified]
```

## Quality Checklist

Before submitting your research, verify ALL of these:

- [ ] Used information from 10+ different sources
- [ ] Cited sources for all major claims
- [ ] Synthesis is longer than 500 words
- [ ] Addressed conflicting information between sources
- [ ] Directly answered the user's original question
- [ ] Noted confidence levels for key findings
- [ ] Included quantitative data where available
- [ ] Identified gaps and limitations

**If any item is unchecked, improve that aspect before submitting.**

## Key Principles

1. **Comprehensiveness over speed** - This is deep research, not a quick search
2. **Attribution is mandatory** - Every claim needs a source
3. **Conflicts are valuable** - Disagreements between sources reveal nuance
4. **Quantify when possible** - Numbers are more useful than vague statements
5. **Acknowledge uncertainty** - Honest gaps are better than false confidence
6. **Answer the question** - After all analysis, directly address what was asked

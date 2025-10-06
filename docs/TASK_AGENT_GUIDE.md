# Task Agent Guide - Claude Code

## Overview

The Task Agent is a powerful autonomous sub-agent system in Claude Code that handles complex, multi-step research and implementation tasks. It works independently to explore codebases, find patterns, and provide comprehensive analysis.

## Table of Contents
- [When to Use Task Agent](#when-to-use-task-agent)
- [Available Agent Types](#available-agent-types)
- [Command Structure](#command-structure)
- [Effective Keywords and Phrases](#effective-keywords-and-phrases)
- [Real-World Examples](#real-world-examples)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## When to Use Task Agent

### ✅ USE Task Agent For:

1. **Complex Code Discovery**
   - Finding all implementations of a feature across multiple files
   - Understanding architectural patterns
   - Discovering hidden dependencies

2. **Multi-Step Research**
   - Investigating bugs that span multiple systems
   - Analyzing performance bottlenecks
   - Understanding data flow through the application

3. **Comprehensive Audits**
   - Security vulnerability assessments
   - Code quality reviews
   - Feature completeness checks

4. **Open-Ended Exploration**
   - "Find all places where X happens"
   - "Understand how Y system works"
   - "Investigate why Z is broken"

### ❌ DON'T Use Task Agent For:

1. **Simple Operations**
   - Reading a single file (use `Read` tool)
   - Finding files by name (use `Glob` tool)
   - Searching for specific text (use `Grep` tool)
   - Making direct code edits (use `Edit` tool)

2. **Known Locations**
   - When you know exactly which file to look at
   - When you have the specific search term
   - When the task has fewer than 3 steps

## Available Agent Types

| Agent Type | Purpose | Use Cases |
|------------|---------|-----------|
| `general-purpose` | Complex research and multi-step tasks | Code searches, architecture analysis, bug investigation |
| `statusline-setup` | Configure Claude Code status line | Customizing status bar display |
| `output-style-setup` | Create Claude Code output styles | Formatting preferences |

## Command Structure

### Basic Syntax

```javascript
Task({
  description: "Short task name",    // 3-5 words
  prompt: "Detailed instructions",   // Complete task description
  subagent_type: "general-purpose"   // Agent type to use
})
```

### Parameter Details

#### `description` (required)
- **Length**: 3-5 words maximum
- **Style**: Active voice, present tense
- **Examples**:
  - ✅ "Find authentication flow"
  - ✅ "Analyze database queries"
  - ✅ "Debug performance issues"
  - ❌ "Looking for the authentication flow in the application"

#### `prompt` (required)
- **Length**: As detailed as needed
- **Style**: Clear, specific instructions
- **Include**: Context, goals, specific areas to search, desired output format

#### `subagent_type` (required)
- **Options**: `"general-purpose"`, `"statusline-setup"`, `"output-style-setup"`
- **Default choice**: `"general-purpose"` for most tasks

## Effective Keywords and Phrases

### Action Keywords

Use these verbs to clearly communicate what you want:

| Verb | Use Case | Example |
|------|----------|---------|
| **Find** | Locate specific code | "Find all API endpoints that handle user data" |
| **Search** | Broad exploration | "Search for authentication-related code" |
| **Analyze** | Deep understanding | "Analyze the review system architecture" |
| **Investigate** | Problem solving | "Investigate why games are loading slowly" |
| **Audit** | Comprehensive review | "Audit security vulnerabilities in user inputs" |
| **List** | Enumeration | "List all database tables and their relationships" |
| **Trace** | Follow execution | "Trace the data flow from user input to database" |
| **Identify** | Pattern recognition | "Identify code duplication in services" |
| **Examine** | Detailed inspection | "Examine error handling patterns" |
| **Discover** | Unknown exploration | "Discover unused code and dead endpoints" |

### Scope Keywords

Define boundaries with these terms:

| Keyword | Purpose | Example |
|---------|---------|---------|
| **All** | Complete coverage | "Find all instances of direct SQL queries" |
| **Only** | Limitation | "Search only in /src/services directory" |
| **Exclude** | Omission | "Analyze components but exclude test files" |
| **Focus on** | Priority | "Focus on performance-critical paths" |
| **Including** | Inclusion | "Find API calls including deprecated ones" |
| **Especially** | Emphasis | "Check security, especially authentication" |
| **Both/And** | Multiple targets | "Find both frontend and backend validations" |

### Output Format Keywords

Specify how you want results:

| Phrase | Result Type | Example |
|--------|-------------|---------|
| **List with** | Structured output | "List with file paths and line numbers" |
| **Summarize** | High-level overview | "Summarize how the caching system works" |
| **Group by** | Categorized results | "Group by feature area" |
| **Include details** | Comprehensive info | "Include details about parameters and return types" |
| **Report** | Formal findings | "Report potential security issues" |
| **Show examples** | Code samples | "Show examples of the pattern in use" |

## Real-World Examples

### Example 1: Feature Implementation Audit

```javascript
Task({
  description: "Audit referral system",
  prompt: `Please conduct a complete audit of the referral system:

  SEARCH AREAS:
  1. Database: Find all tables with referral-related columns
  2. Backend: Identify all services handling referral logic
  3. Frontend: Locate components displaying referral codes
  4. API: Find endpoints for referral tracking

  ANALYSIS NEEDED:
  - How are referral codes generated?
  - How is referral attribution tracked?
  - What rewards or incentives exist?
  - Are there any security vulnerabilities?

  OUTPUT FORMAT:
  - List each component with its file path
  - Summarize the overall implementation status
  - Identify any missing or incomplete features
  - Suggest improvements based on best practices`,
  subagent_type: "general-purpose"
})
```

### Example 2: Performance Investigation

```javascript
Task({
  description: "Debug slow queries",
  prompt: `Investigate performance issues in the game listing page:

  INVESTIGATE:
  1. Find all database queries in game-related services
  2. Search for N+1 query problems
  3. Look for missing database indexes
  4. Check for unnecessary data fetching
  5. Examine caching implementations

  FOCUS ON:
  - gameService.ts and related files
  - Supabase query patterns
  - React component re-renders
  - Data fetching hooks

  REPORT:
  - List queries that could cause performance issues
  - Include the specific file and line numbers
  - Estimate the performance impact (high/medium/low)
  - Provide specific optimization recommendations`,
  subagent_type: "general-purpose"
})
```

### Example 3: Security Vulnerability Assessment

```javascript
Task({
  description: "Security audit",
  prompt: `Perform a security audit focusing on user input handling:

  EXAMINE:
  1. All form inputs and user-controlled data
  2. SQL query construction (look for SQL injection risks)
  3. XSS vulnerabilities in rendered content
  4. Authentication and authorization checks
  5. Sensitive data exposure in logs or localStorage

  SEARCH PATTERNS:
  - Direct string concatenation in queries
  - innerHTML or dangerouslySetInnerHTML usage
  - Missing input validation
  - Unescaped user content
  - Exposed API keys or secrets

  DELIVERABLES:
  - Categorize findings by severity (Critical/High/Medium/Low)
  - Provide specific file locations for each issue
  - Include code snippets showing the vulnerability
  - Suggest fixes using security best practices`,
  subagent_type: "general-purpose"
})
```

### Example 4: Architecture Understanding

```javascript
Task({
  description: "Map search architecture",
  prompt: `Map out the complete search system architecture:

  DISCOVER:
  1. All search-related services and their responsibilities
  2. Database tables and indexes used for search
  3. Caching strategies (Redis, in-memory, browser)
  4. UI components for search input and results
  5. Search analytics and tracking

  UNDERSTAND:
  - How does the search query flow from UI to database?
  - What optimizations are in place?
  - How are search results ranked/sorted?
  - What happens when external APIs (IGDB) are involved?

  CREATE:
  - A hierarchical list of all search components
  - A data flow diagram (in text format)
  - Performance characteristics of each component
  - Recommendations for improvements`,
  subagent_type: "general-purpose"
})
```

### Example 5: Code Quality Review

```javascript
Task({
  description: "Review code quality",
  prompt: `Review code quality in the services directory:

  CHECK FOR:
  1. Duplicate code that could be refactored
  2. Inconsistent error handling patterns
  3. Missing TypeScript types or 'any' usage
  4. Complex functions that need simplification
  5. Unused exports and dead code

  ANALYZE:
  - Services with similar functionality
  - Error handling consistency
  - TypeScript type coverage
  - Function complexity (cyclomatic complexity)
  - Test coverage gaps

  PROVIDE:
  - List of services that could be consolidated
  - Files with poor TypeScript typing
  - Functions exceeding 50 lines
  - Specific refactoring recommendations
  - Priority order for improvements`,
  subagent_type: "general-purpose"
})
```

### Example 6: Feature Discovery

```javascript
Task({
  description: "Find notification system",
  prompt: `Discover how the notification system is implemented:

  FIND:
  1. Database tables storing notifications
  2. Backend logic for creating/sending notifications
  3. Real-time subscription setup (WebSockets/SSE)
  4. Frontend notification components
  5. User preference settings for notifications

  QUESTIONS TO ANSWER:
  - What triggers notifications?
  - How are they delivered (real-time, email, in-app)?
  - Can users control notification preferences?
  - Is there a notification history?
  - Are there unread notification counters?

  IF NOT FOUND:
  - Explicitly state that no notification system exists
  - List potential locations where it could be added
  - Suggest implementation approach based on existing patterns`,
  subagent_type: "general-purpose"
})
```

## Best Practices

### 1. Structure Your Prompts

Use clear sections in complex prompts:

```javascript
Task({
  description: "Analyze auth system",
  prompt: `
  OBJECTIVE:
  Understand the complete authentication system

  SEARCH AREAS:
  - /src/context/auth
  - /src/services/auth
  - /src/hooks/useAuth

  SPECIFIC QUESTIONS:
  1. How is the session managed?
  2. What happens on token expiry?
  3. Are there role-based permissions?

  OUTPUT FORMAT:
  - Component list with descriptions
  - Flow diagram of auth process
  - Security recommendations`,
  subagent_type: "general-purpose"
})
```

### 2. Provide Context

Explain why you're searching:

```javascript
// Good - provides context
prompt: "Users report being logged out randomly. Investigate session management, token refresh logic, and any timeout configurations that could cause unexpected logouts."

// Bad - no context
prompt: "Look at authentication"
```

### 3. Be Specific About Output

Tell the agent exactly what you want back:

```javascript
prompt: `Find all API endpoints.
For each endpoint provide:
- HTTP method (GET, POST, etc.)
- Path pattern
- Required parameters
- Authentication requirements
- Which components call it
Format as a markdown table.`
```

### 4. Use Parallel Execution

Run multiple agents for related tasks:

```javascript
// Parallel execution for faster results
const [security, performance, quality] = await Promise.all([
  Task({
    description: "Security audit",
    prompt: "Audit authentication and authorization vulnerabilities",
    subagent_type: "general-purpose"
  }),
  Task({
    description: "Performance check",
    prompt: "Find slow database queries and N+1 problems",
    subagent_type: "general-purpose"
  }),
  Task({
    description: "Code quality",
    prompt: "Identify duplicate code and missing types",
    subagent_type: "general-purpose"
  })
]);
```

## Common Patterns

### Pattern 1: Feature Implementation Status

```javascript
Task({
  description: "Check [feature] status",
  prompt: `Determine the implementation status of [feature]:

  FIND:
  - Database tables/columns
  - Backend services
  - API endpoints
  - Frontend components
  - Tests

  REPORT:
  - What's fully implemented
  - What's partially done
  - What's missing
  - Next steps needed`,
  subagent_type: "general-purpose"
})
```

### Pattern 2: Bug Investigation

```javascript
Task({
  description: "Investigate [bug]",
  prompt: `Investigate why [specific issue]:

  CHECK:
  - Error logs and error handling
  - Related services and functions
  - Database queries involved
  - Recent changes to relevant files

  IDENTIFY:
  - Root cause
  - Affected components
  - Potential fixes
  - Impact scope`,
  subagent_type: "general-purpose"
})
```

### Pattern 3: Migration Planning

```javascript
Task({
  description: "Plan [technology] migration",
  prompt: `Plan migration from [old] to [new]:

  INVENTORY:
  - All files using [old technology]
  - Dependencies on [old] patterns
  - Shared functionality

  ASSESS:
  - Migration complexity for each component
  - Risk areas
  - Order of migration
  - Estimated effort`,
  subagent_type: "general-purpose"
})
```

### Pattern 4: Dependency Analysis

```javascript
Task({
  description: "Analyze dependencies",
  prompt: `Analyze dependencies for [component/feature]:

  MAP:
  - What depends on this component
  - What this component depends on
  - Circular dependencies
  - External service dependencies

  EVALUATE:
  - Coupling level
  - Potential for extraction
  - Breaking change impact`,
  subagent_type: "general-purpose"
})
```

## Advanced Techniques

### 1. Conditional Searches

```javascript
prompt: `Search for user data handling:
IF using localStorage:
  - Check for sensitive data
  - List all keys stored
IF using cookies:
  - Verify httpOnly and secure flags
  - Check expiration settings
IF using session storage:
  - Ensure proper cleanup on logout`
```

### 2. Comparative Analysis

```javascript
prompt: `Compare the implementation of reviews vs ratings:
- Database schema differences
- Service layer patterns
- UI component structure
- Which approach is better and why?`
```

### 3. Historical Investigation

```javascript
prompt: `Investigate the evolution of the search feature:
- Original implementation approach
- Current implementation
- Deprecated code still present
- Migration artifacts
- Recommend cleanup tasks`
```

## Troubleshooting

### Issue: Agent Returns Too Much Information

**Solution**: Be more specific about scope and output format

```javascript
// Too broad
prompt: "Find all API calls"

// Better
prompt: "Find only external API calls to IGDB service. List just the function names and endpoints."
```

### Issue: Agent Misses Important Files

**Solution**: Provide hints about naming patterns or locations

```javascript
prompt: `Find payment processing code.
Note: Might be named 'billing', 'payment', 'subscription', 'stripe', or 'checkout'.
Check both /src/services and /api directories.`
```

### Issue: Agent Takes Too Long

**Solution**: Break into smaller, focused tasks

```javascript
// Instead of one large task
Task({
  description: "Audit entire app",
  prompt: "Review everything",
  subagent_type: "general-purpose"
})

// Break it down
Task({
  description: "Audit auth system",
  prompt: "Review authentication only",
  subagent_type: "general-purpose"
})
```

## Tips for Your VGReviewApp2 Project

Given your specific codebase, here are targeted examples:

### 1. IGDB Integration Audit

```javascript
Task({
  description: "Audit IGDB integration",
  prompt: `Complete audit of IGDB integration:

  FIND:
  - Netlify functions handling IGDB calls
  - Services using IGDB data
  - Caching strategies for IGDB responses
  - Error handling for API failures
  - Rate limiting implementation

  CHECK:
  - Are API keys properly secured?
  - Is there fallback for when IGDB is down?
  - How fresh is cached data?
  - Are there unnecessary API calls?`,
  subagent_type: "general-purpose"
})
```

### 2. Supabase Optimization

```javascript
Task({
  description: "Optimize Supabase queries",
  prompt: `Find Supabase optimization opportunities:

  SEARCH FOR:
  - Queries without proper indexes mentioned
  - SELECT * usage that could be narrowed
  - Missing row-level security policies
  - Opportunities for database views
  - Real-time subscriptions that could be batched

  FOCUS ON:
  - gameService and related services
  - High-traffic queries (ratings, reviews, games)
  - Join operations that could be optimized`,
  subagent_type: "general-purpose"
})
```

### 3. Component Consolidation Opportunities

```javascript
Task({
  description: "Find duplicate components",
  prompt: `Identify components that could be consolidated:

  LOOK FOR:
  - Similar modal components
  - Duplicate form components
  - Card components with minor variations
  - Multiple loading/spinner components

  PROVIDE:
  - Groups of similar components
  - Differences between them
  - Consolidation recommendations
  - Impact on bundle size`,
  subagent_type: "general-purpose"
})
```

## Quick Reference Card

### Essential Commands

| Task Type | Quick Command |
|-----------|---------------|
| Find Feature | `Task({ description: "Find [feature]", prompt: "Locate all code related to [feature] including database, backend, and frontend", subagent_type: "general-purpose" })` |
| Debug Issue | `Task({ description: "Debug [problem]", prompt: "Investigate why [issue] is happening. Check logs, error handling, and related services", subagent_type: "general-purpose" })` |
| Audit Code | `Task({ description: "Audit [area]", prompt: "Review [area] for security, performance, and code quality issues", subagent_type: "general-purpose" })` |
| Understand System | `Task({ description: "Explain [system]", prompt: "Explain how [system] works including all components and data flow", subagent_type: "general-purpose" })` |

### Do's and Don'ts

✅ **DO**:
- Provide clear, specific instructions
- Include context about why you're searching
- Specify desired output format
- Use for complex, multi-step research
- Trust the agent's findings

❌ **DON'T**:
- Use for simple, single-file operations
- Interrupt the agent while it's working
- Expect the agent to make code changes
- Use when you know exactly where to look
- Provide vague or ambiguous instructions

## Conclusion

The Task Agent is your autonomous research assistant. Use it to:
- Understand complex systems
- Find scattered implementations
- Investigate mysterious bugs
- Audit code quality and security
- Plan refactoring efforts

Remember: The Task Agent excels at exploration and discovery. Let it handle the time-consuming research while you focus on making decisions and implementing solutions based on its findings.
I'm using the writing-plans skill to create the implementation plan.

# Command Allowlist Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过添加 oauth 登录命令到白名单并用 TDD 验证，确保 `assertAllowedCommand` 支持新的使用场景。

**Architecture:** 增加新的测试覆盖以捕捉 `openclaw models auth login --provider qwen` 的允许行为，调整 `commandAllowlist` 模块使校验逻辑读取新的命令。整体保持白名单模块的纯函数性质，并通过 vitest 进行 TDD 循环。

**Tech Stack:** Node.js + TypeScript、Vitest、npm 脚本。

---

### Task 1: commandAllowlist 白名单扩展

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/install/commandAllowlist.ts`
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/install/__tests__/commandAllowlist.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest'
import { assertAllowedCommand } from '../commandAllowlist'

describe('commandAllowlist', () => {
  it('allows openclaw oauth login command', () => {
    expect(() => assertAllowedCommand('openclaw models auth login --provider qwen')).not.toThrow()
  })
})
```

- [ ] **Step 2: 运行用例并确认失败**

Run: `npm test -- --run src/main/install/__tests__/commandAllowlist.test.ts`
Expected: FAIL because `commandAllowlist` 未包含 oauth 命令。

- [ ] **Step 3: 增加允许项**

```ts
const commandAllowlist = [
  // existing entries...
  'openclaw models auth login --provider qwen',
]
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm test -- --run src/main/install/__tests__/commandAllowlist.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交更改**

```bash
git add src/main/install/commandAllowlist.ts src/main/install/__tests__/commandAllowlist.test.ts
git commit -m "test: allow openclaw oauth command"
```

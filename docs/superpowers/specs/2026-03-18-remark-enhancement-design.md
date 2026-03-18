# Remark Enhancement Design

## Goal
Improve `remark.md` with concise, high-signal guidance for developers: prerequisites, how to run, key resources, and a small troubleshooting section. Keep the document short and practical.

## Non-Goals
- No changes to installer behavior or code.
- No long deployment or release process documentation.

## Proposed Content Updates
1. **Project Summary**
   - Tighten the existing intro while preserving the project scope.
2. **Prerequisites**
   - Node.js LTS (recommend 22+), Git for development.
   - Admin permissions may be required during install flow (Windows/macOS).
3. **Run (Dev)**
   - Keep `npm install` and `npm run dev`.
4. **Common Commands**
   - Keep `npm test`, `npm run build`.
5. **Key Resources**
   - Explain `resources/portable-git/windows` must be included in packaging.
   - Note packaging configuration lives in `package.json` and `electron.vite.config.ts`.
6. **Troubleshooting (Short)**
   - Permission denied: authorize admin and retry.
   - Install failed: copy logs and attach for debugging.
   - PATH issues on Windows: restart app/terminal.

## Success Criteria
- The remark reads in under 1 minute.
- A new contributor can run the app without asking for basic setup help.
- Failure cases point to actionable next steps.

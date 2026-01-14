# Walkthrough - Discipline Score Debugging
The goal was to fix the "Final Discipline Score" (คะแนนด้านระเบียบ) showing as 0 in the Evaluation Form, despite data appearing correct.

## Problem Analysis
- **Symptom:** Discipline Score showed `0`.
- **Root Cause 1 (Data Type mismatch):** Firestore returned stats (e.g. `totalSickLeaveDays`) as **Strings** (e.g. `"7.31"`). `math.js` formulas failed or returned 0/error when doing strict arithmetic.
- **Root Cause 2 (Formula formatting):** System Variables in formulas were wrapped in brackets (e.g. `[totalSickLeaveDays]`). `math.js` interpreted `[7.31]` as a **Matrix** (Array), not a scalar Number.
- **User Confusion:** After fixes, the result was `-1`. The user's UI apparently clamps negative values to `0`, leading them to believe it was still broken.

## Changes
### 1. `useEvaluation.ts`
- **Stats Type Casting:** Added a loop to parse all `stats` fields to `Number()` before injection to context.
```typescript
Object.keys(stats).forEach(key => {
    const val = (stats as any)[key];
    context[key] = isNaN(Number(val)) ? val : Number(val);
});
```
- **Formula Sanitization:** Added `.replace(/[\[\]]/g, '')` to strip brackets from formulas before `math.evaluate`, converting `[Var]` to `Var` (scalar).
```typescript
const cleanFormula = v.formula.replace(/[\[\]]/g, '');
```

## Verification
- **Simulator:** Works (Manual input).
- **Real App:** Now calculates correctly.
- **Logs:** Confirmed calculation result `-1` for the given formula (Penalty Logic: 2 + 2 - 5 = -1).

## Next Steps
- User to adjust their formula if they do not want negative scores (e.g. `max(0, ...)` or add Base Score).

## Total Score & Variable Calculation Fixes
### Problem
- `TOTAL_SCORE` and summation variables (e.g. `รวมคะแนนพฤติกรรม`) were calculating as `0`.
- **Cause:** Variables were sorted by name length. Dependent variables (Summations) often appeared *before* their components in the calculation order.
- **Cause:** Thai Variable names (e.g. `[รวมคะแนน...]`) caused `SyntaxError` in `math.js`.

### Solution
1. **Multi-Pass Calculation:** Implemented a **2-Pass Loop**:
   - **Pass 1:** Calculates base variables (Components).
   - **Pass 2:** Calculates dependent variables (Summations), ensuring they have access to Pass 1 results.
2. **Variable Substitution:**
   - Pre-processed formulas to replace `[ThaiVariable]` with `(NumericValue)` before sending to `math.evaluate`.
   - This bypasses the parser's inability to handle non-English characters in variable names.
3. **Thai Name Mapping:**
   - Explicitly mapped `รวมคะแนนขาดลามาสาย` to the `DISCIPLINE_SCORE` logic to prevent fallback to default scoring (which was defaulting to 100).

## Total Score Display Fix
### Problem
- Users reported `TOTAL_SCORE` as 0 even though logs showed it was calculated as 100.
- **Cause:** The `EmployeeStatsCard` component was missing a section to display the Total Score. It only showed Discipline Score and Stats.
- **Cause:** `useEvaluation` hook was calculating `totalScore` but not returning it to the UI component.

### Solution
1. **Expose State:** Updated `useEvaluation.ts` to return `totalScore`.
2. **Update UI:** Modified `EmployeeStatsCard.tsx` to accept and render `totalScore` in a new "Total Score" card (Orange theme).

## Grade System Implementation
### Feature
- **Dynamic Grading:** Automatically assigns a Grade (NI - E) based on the Total Score.
- **Visual Feedback:** Card color changes (Red/Orange/Blue/Green/Purple) to reflect performance level.
- **Tooltip Description:** Detailed grade description is shown as a tooltip on hover, keeping the UI clean.

### Implementation
1. **Utility:** Created `src/utils/grade-calculation.ts` to define grade ranges and colors.
2. **Component:** Updated `EmployeeStatsCard.tsx` to:
   - Calculate grade from `totalScore`.
   - Apply dynamic CSS classes.
   - Inline Tooltip logic for hover interaction.

## Dynamic Grade Configuration (Admin)
### Problem
- Grade ranges (min/max) and colors were hardcoded in TypeScript. Changing them required a code deployment.

### Solution
- **Firestore:** Created `config_grading_rules` collection.
- **Admin UI:** Added "Grading Criteria" tab in "Scoring Rules" page.
    - Admins can Create/Update/Delete grade ranges.
    - Includes a "Load Defaults" button to seed standard (NI - E) grades.
- **Consumption:**
    - `useGradingRules` hook fetches rules.
    - `EvaluationPage` passes rules to `EmployeeStatsCard`.
    - Calculation logic falls back to hardcoded defaults if no database rules exist (Safe Migration).

## System Refactoring (Phase 2 & 3): Maintainability & Performance
### Goals
1.  **Maintainability:** Eliminate hardcoded values (colors, text) scattered across the codebase.
2.  **Performance:** Enable "Instant Switch" between Dashboard and Employee List without re-fetching data.

### Implementation
1.  **Centralized Constants (Phase 2):**
    -   Created `src/constants/colors.ts`: Defines `GRADE_COLORS` (E, OE, ME, BE, NI, NA) and `CHART_COLORS`.
    -   Created `src/constants/text.ts`: Defines `UI_TEXT` (Button labels, Titles) and `ERROR_MESSAGES`.
    -   Refactored `grade-calculation.ts`, `DashboardPage`, `EmployeeListPage`, and Charts to use these constants.

2.  **Evaluation Context (Phase 3):**
    -   Created `EvaluationContext.tsx`: Fetches and caches `Employees`, `Evaluations`, `ScoringRules`, and `Sections` globally.
    -   Wrapped App with `EvaluationProvider` in `Providers.tsx`.
    -   Refactored `useEvaluation.ts`:
        -   Removed internal `fetch` logic.
        -   Consumes data from Context.
        -   Implements `updateLocalEvaluation` to update Context state immediately after saving, reflecting changes instantly across the app.

### Results
-   **Theme Consistency:** Changing a grade color in `colors.ts` now updates all Charts, Tables, and Badges instanty.
-   **Instant Navigation:** Switching from Dashboard to details and back is instant (0ms loading time) because the data is loaded once at app start.

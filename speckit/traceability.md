# Traceability Matrix (ตารางความเชื่อมโยง)

## 1. RTM (Requirement Traceability Matrix)

| Feature ID | Task ID | Related File / Component | Note/Description |
| :--- | :--- | :--- | :--- |
| **F-001** (Import) | T-001, T-009 | `src/app/employees/page.tsx` | Main Import UI & Logic (Migrated) |
| | | `src/types/import-data.ts` | Interface: `LateAbsentRow`, `LeaveRow` |
| **F-002** (Emp Mgmt) | - | `src/app/employees/page.tsx` | Employee List UI |
| | | `src/types/employee.ts` | Interface: `Employee` |
| **F-003** (Evaluation) | T-002, T-004 | `src/app/evaluations/page.tsx` | **Main Engine** (Dynamic Criteria) |
| | | `Firestore: evaluation_categories` | Collection: Criteria Configuration |
| | | `src/data/evaluation-criteria.ts` | **Config (Legacy/Fallback)**: `HO_SECTIONS` |
| | | `src/utils/dateUtils.ts` | Utils: `calculateServiceTenure` |
| | | `src/utils/grade-calculation.ts` | **(New)** Utils: Grade & Color Logic |
| **F-004** (Criteria) | - | `src/app/admin/criteria/page.tsx` | CRUD Criteria UI |
| **F-005** (Scoring) | T-013 | `src/app/admin/scoring/page.tsx` | CRUD Formulas & **Grade Criteria** |
| | | `src/hooks/useGradingRules.ts` | **(New)** Hook: Grade Logic & Firestore |
| | | `Firestore: config_grading_rules` | **(New)** Collection: Grading Rules |

## 2. Data / Variable / Component Traceability

| Entity / Concept | Type | Code ID / Name | File Location | Linked To |
| :--- | :--- | :--- | :--- | :--- |
| **UI Components** |
| Tooltip (Info) | Component | `InfoTooltip` | `evaluations/page.tsx` | F-003 |
| Popup (Sub-criteria) | Logic/UI | `popupData` (State) | `evaluations/page.tsx` | F-003 |
| Question Item | Interface | `QuestionItem` | `types/evaluation.ts` (Added `isReadOnly`) | F-004, F-003 |
| Employee Selector | Component | `EmployeeSelector.tsx` | `components/evaluations/EmployeeSelector.tsx` | F-003 |
| Employee Info | Component | `EmployeeInfoCard.tsx` | `components/evaluations/EmployeeInfoCard.tsx` | F-003 |
| Rules & Stats | Component | `EmployeeStatsCard.tsx` | `components/evaluations/EmployeeStatsCard.tsx` | F-003 (Added `showTotalScore`) |
| Question Section | Component | `EvaluationSection.tsx` | `components/evaluations/EvaluationSection.tsx` | F-003 |
| Score Popup | Component | `ScoreHelperPopup.tsx` | `components/evaluations/ScoreHelperPopup.tsx` | F-003 |
| **Logic & Calculation** |
| Scoring Engine | Function | `runDisciplineCalculation` | `hooks/useEvaluation.ts` | F-003 |
| Evaluation Logic | Hook | `useEvaluation.ts` | `hooks/useEvaluation.ts` | F-003 (Updated Calculation Loop) |
| Stats Context | Object | `employeeStats` (State) | `evaluations/page.tsx` | F-003 |
| Math Library | Lib | `mathjs` | `(Dependency)` | F-003 |
| **Data Models** |
| Employee Profile | Interface | `Employee` | `types/employee.ts` | F-002, F-003 |
| Evaluation Config | Constant | `EVALUATION_CRITERIA` | `data/evaluation-criteria.ts` | F-003 |

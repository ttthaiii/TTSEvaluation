# Traceability Matrix (ตารางความเชื่อมโยง)

## 1. RTM (Requirement Traceability Matrix)

| Feature ID | Task ID | Related File / Component | Note/Description |
| :--- | :--- | :--- | :--- |
| **F-001** (Import) | T-001 | `src/app/admin/import/page.tsx` | Main Import UI & Logic |
| | | `src/types/import-data.ts` | Interface: `LateAbsentRow`, `LeaveRow` |
| **F-002** (Emp Mgmt) | - | `src/app/employees/page.tsx` | Employee List UI |
| | | `src/types/employee.ts` | Interface: `Employee` |
| **F-003** (Evaluation) | T-002, T-004 | `src/app/evaluations/page.tsx` | **Main Engine** (Dynamic Criteria) |
| | | `Firestore: evaluation_categories` | Collection: Criteria Configuration |
| | | `src/data/evaluation-criteria.ts` | **Config (Legacy/Fallback)**: `HO_SECTIONS` |
| | | `src/utils/dateUtils.ts` | Utils: `calculateServiceTenure` |
| **F-004** (Criteria) | - | `src/app/admin/criteria/page.tsx` | CRUD Criteria UI |
| **F-005** (Scoring) | - | `src/app/admin/scoring/page.tsx` | CRUD Formulas UI |

## 2. Data / Variable / Component Traceability

| Entity / Concept | Type | Code ID / Name | File Location | Linked To |
| :--- | :--- | :--- | :--- | :--- |
| **UI Components** |
| Tooltip (Info) | Component | `InfoTooltip` | `evaluations/page.tsx` | F-003 |
| Popup (Sub-criteria) | Logic/UI | `popupData` (State) | `evaluations/page.tsx` | F-003 |
| **Logic & Calculation** |
| Scoring Engine | Function | `runDisciplineCalculation` | `evaluations/page.tsx` | F-003 |
| Stats Context | Object | `employeeStats` (State) | `evaluations/page.tsx` | F-003 |
| Math Library | Lib | `mathjs` | `(Dependency)` | F-003 |
| **Data Models** |
| Employee Profile | Interface | `Employee` | `types/employee.ts` | F-002, F-003 |
| Evaluation Config | Constant | `EVALUATION_CRITERIA` | `data/evaluation-criteria.ts` | F-003 |

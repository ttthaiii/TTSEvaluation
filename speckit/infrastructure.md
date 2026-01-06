# Infrastructure

## Tech Stack (เทคโนโลยีที่ใช้)
- **Frontend Framework:** Next.js 16.0.8 (App Router), React 19.2.1
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 4.x
- **Backend Service:** Firebase (Client & Admin SDK)
- **Database:** Cloud Firestore
- **Key Libraries:**
  - `xlsx` & `csv-parser`: สำหรับการจัดการข้อมูล Excel/CSV Import
  - `mathjs`: สำหรับการคำนวณคะแนนและสูตรคณิตศาสตร์ (Scoring Engine)
  - `lucide-react`: สำหรับ Icons

## Folder Structure (โครงสร้างไฟล์แบบละเอียด)
```text
root/
├── public/                # Static assets (images, icons)
├── src/
│   ├── app/               # App Router main directory
│   │   ├── admin/         # Admin features
│   │   │   ├── criteria/  # [Page] Manage Evaluation Criteria
│   │   │   ├── import/    # [Page] Import Data (Excel/CSV)
│   │   │   └── scoring/   # [Page] Manage Scoring Formulas
│   │   ├── employees/     # [Page] Employee List & Search
│   │   ├── evaluations/   # [Page] Evaluation Form (Main Feature)
│   │   │   └── page.tsx   # [Dynamic] Fetches 'evaluation_categories' from Firestore
│   │   ├── globals.css    # Global Tailwind styles
│   │   ├── layout.tsx     # Root layout (Sidebar, Header logic)
│   │   └── page.tsx       # Landing page / Dashboard
│   ├── data/              # Static Data & Config
│   │   └── evaluation-criteria.ts # [Key File] Criteria Config, Tooltip Text, Popup content
│   ├── lib/               # Global configurations
│   │   └── firebase.ts    # Firebase Initialization
│   ├── types/             # TypeScript definitions
│   │   ├── employee.ts    # Employee Interface
│   │   └── import-data.ts # Excel/CSV Row Interfaces
│   └── utils/             # Utility functions
│       └── dateUtils.ts   # [Assumed] Date calculation for Tenure
└── package.json           # Dependencies management
```

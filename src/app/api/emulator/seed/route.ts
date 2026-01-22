import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    // 1. Verify we are in Emulator Mode
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') {
        return NextResponse.json({ error: 'Not in Emulator Mode' }, { status: 403 });
    }

    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        const logs: string[] = [];

        const log = (msg: string) => logs.push(msg);

        // 2. Seed Users
        const users: any[] = [
            {
                uid: 'admin-test-uid',
                email: 'admin@test.com',
                password: 'password',
                displayName: 'Admin Test',
                claims: { role: 'Admin' },
                data: {
                    email: "admin@test.com",
                    firstName: "Admin",
                    lastName: "Test",
                    password: "password", // 🔥 For Emulator Auth
                    role: "Admin",
                    position: "System Admin",
                    department: "IT",
                    employeeId: "ADM001",
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            },
            {
                uid: 'manager-test-uid',
                email: 'manager@test.com',
                password: 'password',
                displayName: 'Manager Test',
                claims: { role: 'User' },
                data: {
                    email: "manager@test.com",
                    firstName: "Manager",
                    lastName: "Test",
                    password: "password", // 🔥 For Emulator Auth
                    role: "User",
                    position: "Manager",
                    department: "Sales",
                    employeeId: "MGR001",
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            },
            {
                uid: 'employee-test-uid',
                email: 'employee@test.com',
                password: 'password', // Optional for non-login users
                displayName: 'Employee Test',
                claims: { role: 'User' },
                data: {
                    email: "employee@test.com",
                    firstName: "Employee",
                    lastName: "Test",
                    password: "password", // 🔥 For Emulator Auth
                    role: "User",
                    position: "Sales Staff",
                    department: "Sales",
                    section: "Sales-A",
                    employeeId: "EMP001",
                    evaluatorId: "MGR001", // Links to Manager
                    isActive: true,
                    startDate: "2023-01-01",
                    pdNumber: "PD001", // 🔥 Added to match type
                    createdAt: new Date().toISOString()
                }
            }
        ];

        const pdGroups = [
            { id: 'PD001', name: 'Modeling Section', dept: 'Production' },
            { id: 'PD002', name: 'Rigging Section', dept: 'Production' },
            { id: 'PD003', name: 'Animation Section', dept: 'Production' },
            { id: 'PD004', name: 'Lighting Section', dept: 'Post-Production' },
            { id: 'PD005', name: 'Compositing Section', dept: 'Post-Production' }
        ];

        // Helper to get grade (simplified for seeder)
        const getMockGrade = (score: number) => {
            if (score >= 86) return 'E';
            if (score >= 76) return 'OE';
            if (score >= 65) return 'ME';
            if (score >= 50) return 'BE';
            return 'NI';
        };

        // Calculate correct year/period (Mocking Utils logic)
        const now = new Date();
        // If Jan-Mar, it's previous year's eval. Else current year.
        const currentYear = now.getMonth() <= 2 ? now.getFullYear() - 1 : now.getFullYear();
        const currentPeriod = `${currentYear}-Annual`;

        // Generate 50 Mock Employees
        for (let i = 1; i <= 50; i++) {
            const pd = pdGroups[Math.floor(Math.random() * pdGroups.length)];
            const employeeId = `MOCK${String(i).padStart(3, '0')}`;
            const email = `mock${i}@test.com`;
            const randomScore = Number((Math.random() * (100 - 40) + 40).toFixed(2)); // Score between 40-100
            const grade = getMockGrade(randomScore);

            users.push({
                uid: `mock-user-${i}`,
                email: email,
                password: 'password',
                displayName: `Mock Employee ${i}`,
                claims: { role: 'User' },
                data: {
                    email: email,
                    firstName: `MockName${i}`,
                    lastName: `Surname${i}`,
                    password: "password",
                    role: "User",
                    position: "Artist",
                    department: pd.dept,
                    section: pd.name,
                    pdNumber: pd.id, // 🔥 Using PdNumber
                    employeeId: employeeId,
                    evaluatorId: "MGR001",
                    isActive: true,
                    startDate: "2023-01-01",
                    createdAt: new Date().toISOString()
                },
                // Add eval data to object for later use in loop
                evaluation: {
                    status: "Completed",
                    totalScore: randomScore,
                    grade: grade
                }
            });
        }

        for (const user of users) {
            // Create Auth User
            try {
                // Check if exists
                try {
                    await auth.getUserByEmail(user.email);
                    log(`⚠️ User ${user.email} already exists (Auth). Skiping creation.`);
                } catch {
                    await auth.createUser({
                        uid: user.uid,
                        email: user.email,
                        password: user.password,
                        displayName: user.displayName,
                        emailVerified: true
                    });
                    log(`✅ Created Auth: ${user.email}`);
                }

                // Create Firestore Doc
                await db.collection('users').doc(user.uid).set(user.data);

                // 🔥 Create Evaluation Doc if it's a mock user or the static employee
                if ((user as any).evaluation || user.data.employeeId === 'EMP001') {
                    const evalData = (user as any).evaluation || {
                        status: "Completed",
                        totalScore: 85,
                        grade: "A"
                    };

                    const evaluationId = `EVAL-${currentYear}-${user.data.employeeId}`;
                    await db.collection('evaluations').doc(evaluationId).set({
                        employeeId: user.data.employeeId,
                        employeeDocId: user.uid, // 🔥 Critical Link for Context
                        evaluatorId: "MGR001",
                        year: currentYear,
                        period: currentPeriod,
                        status: evalData.status,
                        totalScore: evalData.totalScore,
                        grade: evalData.grade,
                        sections: { "KPI": evalData.totalScore },
                        updatedAt: new Date().toISOString(),
                        isFinal: true,
                        encryptedSalaryData: null // Init as null
                    });
                    log(`✅ Created Eval ${currentYear} for ${user.data.employeeId}: ${evalData.grade} (${evalData.totalScore})`);

                    // 🔥 Create Previous Year Evaluation (Historical Data)
                    const prevYear = currentYear - 1;
                    const prevPeriod = `${prevYear}-Annual`;
                    const prevScore = Number((Math.random() * (100 - 60) + 60).toFixed(2)); // Random score for last year
                    const prevGrade = getMockGrade(prevScore);
                    const prevEvalId = `EVAL-${prevYear}-${user.data.employeeId}`;

                    await db.collection('evaluations').doc(prevEvalId).set({
                        employeeId: user.data.employeeId,
                        employeeDocId: user.uid, // 🔥 Critical Link for Context
                        evaluatorId: "MGR001",
                        year: prevYear,
                        period: prevPeriod,
                        status: "Completed",
                        totalScore: prevScore,
                        grade: prevGrade,
                        sections: { "KPI": prevScore },
                        updatedAt: new Date(`${prevYear}-12-25`).toISOString(),
                        isFinal: true
                    });
                    log(`   ↳ Created History ${prevYear}: ${prevGrade} (${prevScore})`);
                }

            } catch (e: any) {
                log(`❌ Error processing ${user.email}: ${e.message}`);
            }
        }

        // 3. Seed Rules (KPI & Salary)
        await db.collection('scoring_formulas').doc('KPI_SALES').set({
            name: 'KPI_SALES',
            description: 'Sales KPI Score',
            formula: '80', // Static for test
            isActive: true
        });

        // 🔥 Seed Salary Rules (Based on User's Table)
        const salaryRules = [
            { id: 'E', grade: 'E', increasePercent: 3.5, bonusMonths: 2.0, condition: 'Excellent' },
            { id: 'OE', grade: 'OE', increasePercent: 3.0, bonusMonths: 1.25, condition: 'Over Expectation' },
            { id: 'ME', grade: 'ME', increasePercent: 2.5, bonusMonths: 0.75, condition: 'Meet Expectation' },
            { id: 'BE', grade: 'BE', increasePercent: 1.5, bonusMonths: 0.0, condition: 'Below Expectation' },
            { id: 'NI', grade: 'NI', increasePercent: 0.0, bonusMonths: 0.0, condition: 'Need Improvement' }
        ];

        for (const rule of salaryRules) {
            await db.collection('salary_rules').doc(rule.id).set(rule);
        }

        log("✅ Created Scoring & Salary Rules");



        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error("Seed API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

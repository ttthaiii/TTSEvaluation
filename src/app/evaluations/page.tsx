'use client';

import React, { useState, useEffect } from 'react';
import { create, all } from 'mathjs';
import { collection, getDocs, addDoc, query, where, Timestamp, doc, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { HO_SECTIONS, CATEGORY_DETAILS } from '../../data/evaluation-criteria';
import { Employee } from '../../types/employee';
// ต้องแน่ใจว่า import ฟังก์ชัน getEvaluationYear, getCurrentPeriod แล้ว
import { calculateServiceTenure, getEvaluationYear, getCurrentPeriod } from '../../utils/dateUtils';

// --- Interfaces ---
interface EvaluationRecord {
  docId: string;
  scores: Record<string, number>;
  employeeDocId: string;
}

interface EmployeeStats {
  totalLateMinutes: number;
  totalSickLeaveDays: number;
  totalAbsentDays: number;
  warningCount: number;
  year: number;
  aiScore?: number;
}

interface ScoringRule {
  id: string;
  name: string;
  type: 'VARIABLE' | 'SCORE';
  formula: string;
  targetField?: string;
}

// --- Dynamic Criteria Interfaces ---
interface QuestionItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  maxScore: number;
}

interface Category {
  id: string;
  title: string;
  order: number;
  questions: QuestionItem[];
}

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative group inline-block ml-2 align-middle z-10">
    <button className="text-gray-400 hover:text-[#ff5722] transition-colors focus:outline-none">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
      </svg>
    </button>
    {/* Tooltip Popup */}
    <div className="invisible group-hover:visible group-focus-within:visible opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl pointer-events-none text-left leading-relaxed">
      {text}
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800"></div>
    </div>
  </div>
);

export default function EvaluationPage() {
  const [loading, setLoading] = useState(true);

  // Year Logic
  // ตรวจสอบว่ามีฟังก์ชันหรือไม่ ถ้าไม่มีให้ fallback
  const evalYear = typeof getEvaluationYear === 'function' ? getEvaluationYear() : new Date().getFullYear();
  const currentPeriod = typeof getCurrentPeriod === 'function' ? getCurrentPeriod() : `${evalYear}-Annual`;

  const [sections, setSections] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // New Dynamic Data

  const [disciplineScore, setDisciplineScore] = useState<number | string>("-");

  const [existingEvaluations, setExistingEvaluations] = useState<Record<string, EvaluationRecord>>({});

  const [selectedSection, setSelectedSection] = useState<string>('');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [scores, setScores] = useState<Record<string, number>>({});

  const [popupData, setPopupData] = useState<{ title: string, subItems: any[], criteriaId: string } | null>(null);
  const [popupScores, setPopupScores] = useState<Record<number, number>>({});
  const [integrityWarnings, setIntegrityWarnings] = useState<string[]>([]); // 🔥 Safety Check

  // --- 1. Init Data & Fetch Rules ---
  const initData = async () => {
    try {
      setLoading(true);

      const qUsers = query(collection(db, 'users'), where('isActive', '==', true));
      const userSnapshot = await getDocs(qUsers);

      const empList: Employee[] = [];
      const sectionSet = new Set<string>();

      userSnapshot.forEach((doc) => {
        const d = doc.data();
        if (d.section) sectionSet.add(d.section);

        empList.push({
          id: doc.id,
          employeeId: d.employeeId || "",
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          position: d.position || "",
          department: d.department || "",
          section: d.section || "",
          level: d.level || "Monthly Staff",
          startDate: d.startDate,
          isActive: d.isActive ?? true,
        } as Employee);
      });

      const qEvals = query(collection(db, 'evaluations'), where('period', '==', currentPeriod));
      const evalSnapshot = await getDocs(qEvals);

      const evalMap: Record<string, EvaluationRecord> = {};
      evalSnapshot.forEach((doc) => {
        const d = doc.data();
        if (d.employeeDocId) {
          evalMap[d.employeeDocId] = {
            docId: doc.id,
            scores: d.scores || {},
            employeeDocId: d.employeeDocId
          };
        }
      });

      const rulesSnapshot = await getDocs(collection(db, 'scoring_formulas'));
      const rules: ScoringRule[] = [];
      rulesSnapshot.forEach(doc => {
        const d = doc.data();
        rules.push({
          id: doc.id,
          name: d.name,
          type: d.type,
          formula: d.formula,
          targetField: d.targetField
        });
      });

      setEmployees(empList);
      setSections(Array.from(sectionSet).sort());
      setExistingEvaluations(evalMap);
      setScoringRules(rules);

      // Fetch Categories
      const qCats = query(collection(db, 'evaluation_categories'), orderBy('order'));
      const catSnap = await getDocs(qCats);
      const catsData = catSnap.docs.map(d => d.data() as Category);
      setCategories(catsData);


    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // --- Safety Check Logic ---
  const validateScoringIntegrity = (rules: ScoringRule[], cats: Category[]) => {
    const warnings: string[] = [];
    const systemVars = ['totalLateMinutes', 'totalSickLeaveDays', 'totalAbsentDays', 'warningCount', 'aiScore'];
    const math = create(all);

    // 1. Collect all valid IDs
    const validIds = new Set<string>();
    systemVars.forEach(v => validIds.add(v));
    cats.forEach(c => c.questions.forEach(q => {
      validIds.add(q.id);
      validIds.add(q.id.replace('-', '_'));
    }));
    rules.forEach(r => validIds.add(r.name));

    // 2. Scan formulas
    rules.forEach(r => {
      try {
        // Regex Check (for bracketed style)
        const matches = r.formula.match(/\[([a-zA-Z0-9_\-]+)\]/g);
        if (matches) {
          matches.forEach(m => {
            const varName = m.replace(/[\[\]]/g, '');
            if (!validIds.has(varName) && !systemVars.includes(varName)) {
              warnings.push(`⚠️ สูตร "${r.name}": อ้างอิง [${varName}] ซึ่งไม่พบในระบบ`);
            }
          });
        }

        // MathJS Parse Check (for unbracketed style)
        const node = math.parse(r.formula);
        node.traverse((n: any) => {
          if (n.isSymbolNode) {
            const varName = n.name;
            const isValid = validIds.has(varName) || systemVars.includes(varName);
            // Check known function in mathjs context
            const isMathFunc = typeof (math as any)[varName] === 'function';

            if (!isValid && !isMathFunc) {
              if (varName === 'pi' || varName === 'e') return;

              // Avoid double warning if regex caught it
              const isBracketedCoverage = r.formula.includes(`[${varName}]`);
              if (!isBracketedCoverage) {
                // Filter common noise (short vars if needed)
                if (varName.length > 1) {
                  warnings.push(`⚠️ สูตร "${r.name}": พบตัวแปร "${varName}" (ไม่มีวงเล็บ) ที่ไม่มีอยู่ในระบบ`);
                }
              }
            }
          }
        });

      } catch (e) {
        // Ignore parse errors here to avoid noise
      }
    });
    setIntegrityWarnings(warnings.filter((item, index) => warnings.indexOf(item) === index));
  };

  useEffect(() => {
    if (scoringRules.length > 0 && categories.length > 0) {
      validateScoringIntegrity(scoringRules, categories);
    }
  }, [scoringRules, categories]);

  // --- 2. Calculate Score (Multi-pass System) ---
  const runDisciplineCalculation = (stats: EmployeeStats, currentScores: Record<string, number>) => {
    if (scoringRules.length === 0) return;

    try {
      const math = create(all);
      const context: any = { ...stats };

      // 1. ใส่คะแนนประเมิน (A_1, B_1...) เข้า Context
      Object.entries(currentScores).forEach(([key, value]) => {
        const safeKey = key.replace('-', '_');
        context[safeKey] = value;
      });

      // เติม 0 ให้ตัวที่ยังไม่ได้ประเมิน (Loop ผ่าน Categories ที่โหลดมา)
      categories.forEach(cat => {
        cat.questions.forEach(q => {
          const safeKey = q.id.replace('-', '_');
          if (!(safeKey in context)) {
            context[safeKey] = 0;
          }
        });
      });

      const sortedRules = [...scoringRules].sort((a, b) => b.name.length - a.name.length);
      const variables = sortedRules.filter(r => r.type === 'VARIABLE');
      const finalScores = sortedRules.filter(r => r.type === 'SCORE');

      // 2. คำนวณ Sub-Variables ก่อน
      variables.forEach(v => {
        try {
          const result = math.evaluate(v.formula, context);
          context[`VAR_${v.name}`] = result;
        } catch (e) {
          context[`VAR_${v.name}`] = 0;
        }
      });

      // 3. คำนวณ Scores (Pass 1) - เพื่อให้ Score พื้นฐานมีค่า
      finalScores.forEach(s => {
        try {
          let scoreFormula = s.formula;

          // แทนค่า Custom Vars
          variables.forEach(v => {
            const pattern = `[${v.name}]`;
            const val = context[`VAR_${v.name}`] || 0;
            scoreFormula = scoreFormula.split(pattern).join(`(${val})`);
          });

          // คำนวณเบื้องต้น
          const result = math.evaluate(scoreFormula, context);
          context[`VAR_${s.name}`] = result;
        } catch (e) {
          // Ignore error in Pass 1 (might depend on other scores)
        }
      });

      // 4. คำนวณ Scores (Pass 2) - เพื่อให้ Score ที่อ้างอิง Score อื่นทำงานได้
      let calculatedDisciplineScore: number | string = "-";

      finalScores.forEach(s => {
        try {
          let scoreFormula = s.formula;

          // แทนค่า Custom Vars
          variables.forEach(v => {
            const pattern = `[${v.name}]`;
            const val = context[`VAR_${v.name}`] || 0;
            scoreFormula = scoreFormula.split(pattern).join(`(${val})`);
          });

          // แทนค่า Scores อื่นๆ (จาก Pass 1)
          finalScores.forEach(otherS => {
            if (otherS.id !== s.id) {
              const pattern = `[${otherS.name}]`;
              const val = context[`VAR_${otherS.name}`] || 0;
              scoreFormula = scoreFormula.split(pattern).join(`(${val})`);
            }
          });

          const result = math.evaluate(scoreFormula, context);

          // อัปเดตค่าล่าสุด
          context[`VAR_${s.name}`] = result;

          // ถ้าเป็น Field เป้าหมาย (คะแนนรวม) ให้เก็บค่าไว้โชว์
          // (ในอนาคตถ้ามีหลาย Score ที่ต้องโชว์ อาจจะต้องปรับ UI ให้ Loop แสดง)
          if (s.targetField === 'disciplineScore') {
            calculatedDisciplineScore = Math.round(result * 100) / 100;
          }
        } catch (e) {
          console.error(`Error final calc ${s.name}:`, e);
        }
      });

      setDisciplineScore(calculatedDisciplineScore);

    } catch (err) {
      setDisciplineScore("Error");
    }
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sec = e.target.value;
    setSelectedSection(sec);
    setSelectedEmployeeId('');
    setSelectedEmployee(null);
    setScores({});
    setEmployeeStats(null);
    setDisciplineScore("-");
    setFilteredEmployees(sec ? employees.filter(emp => emp.section === sec) : []);
  };

  const handleEmployeeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const empId = e.target.value;
    setScores({});
    setEmployeeStats(null);
    setDisciplineScore("-");

    if (!empId) {
      setSelectedEmployeeId('');
      setSelectedEmployee(null);
      return;
    }

    const emp = employees.find(e => e.id === empId) || null;
    setSelectedEmployee(emp);
    setSelectedEmployeeId(empId);

    let currentLoadedScores = {};
    const prevEval = existingEvaluations[empId];
    if (prevEval) {
      const confirmReEval = confirm(`⚠️ พนักงานคนนี้ (${emp?.firstName}) ถูกประเมินไปแล้ว...`);
      if (confirmReEval) {
        setScores(prevEval.scores);
        currentLoadedScores = prevEval.scores;
      }
    }

    if (emp) {
      try {
        const statsRef = doc(db, 'users', emp.id, 'yearlyStats', String(evalYear));
        const statsSnap = await getDoc(statsRef);

        let statsData: EmployeeStats;
        if (statsSnap.exists()) {
          statsData = statsSnap.data() as EmployeeStats;
        } else {
          statsData = {
            totalLateMinutes: 0, totalSickLeaveDays: 0,
            totalAbsentDays: 0, warningCount: 0,
            year: evalYear
          } as any;
        }

        setEmployeeStats(statsData);
        runDisciplineCalculation(statsData, currentLoadedScores);

      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    }
    setPopupData(null);
  };

  const handleScoreChange = (criteriaId: string, score: number) => {
    const newScores = { ...scores, [criteriaId]: score };
    setScores(newScores);

    if (employeeStats) {
      runDisciplineCalculation(employeeStats, newScores);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) return;
    if (!confirm(`ยืนยันการบันทึกการประเมินของ ${selectedEmployee.firstName}?`)) return;

    try {
      const dataToSave = {
        employeeId: selectedEmployee.employeeId,
        employeeDocId: selectedEmployee.id,
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
        department: selectedEmployee.department,
        section: selectedEmployee.section,
        level: selectedEmployee.level,
        evaluator: "Admin",
        scores: scores,
        aiScore: employeeStats?.aiScore || 0,
        disciplineScore: disciplineScore,
        updatedAt: Timestamp.now(),
        period: currentPeriod,
        evaluationYear: evalYear
      };

      const prevEval = existingEvaluations[selectedEmployee.id];

      if (prevEval) {
        const docRef = doc(db, 'evaluations', prevEval.docId);
        await setDoc(docRef, dataToSave, { merge: true });
      } else {
        await addDoc(collection(db, 'evaluations'), {
          ...dataToSave,
          createdAt: Timestamp.now()
        });
      }

      alert("✅ บันทึกการประเมินเรียบร้อย!");
      await initData();

      setScores({});
      setSelectedEmployeeId('');
      setSelectedEmployee(null);
      setEmployeeStats(null);
      setDisciplineScore("-");

    } catch (error) {
      console.error("Error saving evaluation:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก: " + error);
    }
  };

  // --- Dynamic Filtering Logic ---
  const getDisplayCategories = () => {
    if (!selectedEmployee) return [];

    // Filter Categories & Questions
    return categories.map(cat => {
      // 1. Filter Questions
      const validQuestions = cat.questions.filter(q => {
        // B-4 Check (HO Section only)
        if (q.id === 'B-4' && HO_SECTIONS.includes(selectedEmployee.section)) return false;
        return true;
      });

      // 2. Filter Category Level if needed (e.g. Category C for Monthly Staff)
      if (cat.id === 'C' && selectedEmployee.level === 'Monthly Staff') return null;

      if (validQuestions.length === 0) return null;

      return { ...cat, questions: validQuestions };
    }).filter(c => c !== null) as Category[];
  };

  const displayCategories = getDisplayCategories();

  // --- Popup Logic ---
  const openPopup = (item: QuestionItem) => {
    if (popupData?.criteriaId === item.id) return;
    setPopupData({
      title: item.title,
      subItems: (item.description || '').split('\n').map(line => {
        const parts = line.split(';');
        return {
          title: parts[0]?.trim() || '',
          description: parts[1]?.trim() || ''
        };
      }).filter(item => item.title),
      criteriaId: item.id
    });
    setPopupScores({});
  };
  const closePopup = () => setPopupData(null);
  const handlePopupScore = (index: number, score: number) => {
    setPopupScores(prev => ({ ...prev, [index]: score }));
  };
  const calculateAverage = () => {
    if (!popupData) return 0;
    const values = Object.values(popupScores);
    if (values.length < popupData.subItems.length) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(2);
  };
  const applyPopupScore = () => {
    const avg = calculateAverage();
    if (avg && popupData) {
      handleScoreChange(popupData.criteriaId, Math.round(parseFloat(avg)));
    }
  };

  if (loading) return <div className="p-10 text-center text-xl">⏳ กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 md:p-8 font-sans">
      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-8 items-start">


        {/* 🔥 Safety Warning Banner */}
        {integrityWarnings.length > 0 && (
          <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white p-4 shadow-xl animate-bounce-in">
            <div className="max-w-4xl mx-auto flex items-start gap-4">
              <span className="text-3xl">🚫</span>
              <div>
                <h3 className="font-bold text-lg underline">พบปัญหาความปลอดภัยของสูตรคำนวณ (Scoring Integrity Error)</h3>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {integrityWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
                <p className="mt-2 text-sm bg-red-800 inline-block px-2 py-1 rounded">กรุณาแจ้ง Admin ให้แก้ไขสูตรที่ หน้า "ตั้งค่าสูตรคำนวณ"</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= LEFT COLUMN ================= */}
        <div className="flex-1 w-full min-w-0 space-y-8">

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-[#5d4037] text-white p-6">
              <h1 className="text-3xl font-bold">แบบประเมินผลการปฏิบัติงาน</h1>
              <p className="text-orange-200 mt-2">
                📅 รอบการประเมินประจำปี: <span className="font-bold text-white">{evalYear}</span> (Period: {currentPeriod})
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[#3e2723] font-bold text-lg mb-3">เลือกส่วนงาน (Section)</label>
                  <select
                    className="w-full p-4 text-lg border-2 border-[#d7ccc8] rounded-lg text-[#3e2723] bg-gray-50 focus:border-[#ff5722] outline-none"
                    value={selectedSection}
                    onChange={handleSectionChange}
                  >
                    <option value="">-- เลือกส่วนงาน --</option>
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {selectedSection && (
                  <div>
                    <label className="block text-[#3e2723] font-bold text-lg mb-3">เลือกพนักงาน</label>
                    <select
                      className="w-full p-4 text-lg border-2 border-[#d7ccc8] rounded-lg text-[#3e2723] bg-gray-50 focus:border-[#ff5722] outline-none"
                      value={selectedEmployeeId}
                      onChange={handleEmployeeChange}
                    >
                      <option value="">-- เลือกพนักงาน --</option>
                      {filteredEmployees.map(emp => {
                        const isEvaluated = !!existingEvaluations[emp.id];
                        return (
                          <option key={emp.id} value={emp.id}>
                            {isEvaluated ? "✅ " : ""}{emp.employeeId} - {emp.firstName} {emp.lastName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Employee Info Box & Criteria (Code ส่วนนี้เหมือนเดิมครับ ตัดมาเฉพาะส่วนสำคัญ) */}
          {selectedEmployee && (
            <div className="bg-[#efebe9] p-8 rounded-xl shadow-md border-2 border-[#d7ccc8]">

              {/* 1. ส่วนข้อมูลพนักงาน (กลับมาแล้ว) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-gray-500 font-bold text-sm">รหัสพนักงาน</p>
                  <p className="text-xl font-bold text-[#3e2723]">{selectedEmployee.employeeId}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-bold text-sm">ชื่อ-นามสกุล</p>
                  <p className="text-xl font-bold text-[#3e2723]">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-bold text-sm">ระดับ</p>
                  <p className="text-lg text-[#5d4037]">{selectedEmployee.level}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-bold text-sm">อายุงาน</p>
                  <p className="text-lg text-[#5d4037]">
                    {calculateServiceTenure(selectedEmployee.startDate, evalYear)}
                  </p>
                </div>
              </div>

              {/* 2. ส่วนสถิติการมาทำงาน (กลับมาแล้ว) */}
              {employeeStats && (
                <div className="mt-6 pt-4 border-t-2 border-[#d7ccc8]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 font-bold">รวมมาสาย</p>
                      <p className={`text-xl font-bold ${employeeStats.totalLateMinutes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {employeeStats.totalLateMinutes} <span className="text-sm font-normal text-gray-400">นาที</span>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 font-bold">รวมลาป่วย</p>
                      <p className={`text-xl font-bold ${employeeStats.totalSickLeaveDays > 30 ? 'text-orange-600' : 'text-gray-700'}`}>
                        {employeeStats.totalSickLeaveDays} <span className="text-sm font-normal text-gray-400">วัน</span>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 font-bold">รวมขาดงาน</p>
                      <p className={`text-xl font-bold ${employeeStats.totalAbsentDays > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {isNaN(Number(employeeStats.totalAbsentDays)) ? 0 : employeeStats.totalAbsentDays} <span className="text-sm font-normal text-gray-400">วัน</span>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 font-bold">จำนวนใบเตือน</p>
                      <p className={`text-xl font-bold ${employeeStats.warningCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {employeeStats.warningCount} <span className="text-sm font-normal text-gray-400">ใบ</span>
                      </p>
                    </div>
                  </div>

                  {/* คะแนนคำนวณ (Discipline Score / AI Score) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🤖</span>
                        <div>
                          <h4 className="font-bold text-blue-900 text-lg">AI Score</h4>
                          <InfoTooltip text="คะแนนดิบที่ระบบคำนวณให้อัตโนมัติ โดยอ้างอิงจากสถิติการมาทำงาน (ขาด, ลา, มาสาย) และใบเตือน ตามเงื่อนไขที่กำหนดไว้ในระบบ (Scoring Rules)" />
                        </div>
                      </div>
                      <div className="text-4xl font-extrabold text-blue-600">
                        {employeeStats.aiScore !== undefined ? employeeStats.aiScore : "-"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">⚖️</span>
                        <div>
                          <h4 className="font-bold text-green-900 text-lg">คะแนนด้านระเบียบ</h4>
                          <InfoTooltip text="คะแนนสุทธิที่ผ่านการคำนวณจากสูตร (Formula) โดยนำ 'AI Score' มารวมหรือหักลบกับคะแนนประเมินจากหัวหน้างาน เพื่อให้ได้คะแนนสรุปสุดท้าย" />
                        </div>
                      </div>
                      <div className="text-4xl font-extrabold text-green-600">
                        {disciplineScore}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evaluation Criteria Loop (Dynamic) */}
          {selectedEmployee && displayCategories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl shadow-md border-2 border-[#d7ccc8] overflow-hidden">
              <div className="bg-[#5d4037] text-white p-6">
                <h2 className="font-bold text-2xl">[{cat.id}] {cat.title}</h2>
                {CATEGORY_DETAILS[`[${cat.id}] ${cat.title}`] && (
                  <p className="text-lg text-orange-100 mt-2 font-light opacity-90 leading-relaxed">
                    {CATEGORY_DETAILS[`[${cat.id}] ${cat.title}`]}
                  </p>
                )}
                {/* Fallback description if not in static mapping */}
                {!CATEGORY_DETAILS[`[${cat.id}] ${cat.title}`] && (
                  <p className="text-lg text-orange-100 mt-2 font-light opacity-90 leading-relaxed">
                    -
                  </p>
                )}
              </div>
              <div className="p-8 divide-y-2 divide-[#d7ccc8]">
                {cat.questions.map((item) => {
                  const isActive = popupData?.criteriaId === item.id;
                  return (
                    <div key={item.id} className={`py-8 first:pt-0 last:pb-0 transition-all duration-300 ${isActive ? 'bg-orange-50 -mx-8 px-8 border-l-8 border-[#ff5722] shadow-inner' : ''}`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                        <h4 className={`text-2xl font-bold ${isActive ? 'text-[#ff5722]' : 'text-[#212121]'}`}>[{item.id}] {item.title}</h4>
                        <button onClick={() => openPopup(item)} className="px-4 py-2 bg-white border border-[#d7ccc8] text-[#5d4037] rounded-lg shadow-sm hover:bg-orange-50 hover:border-[#ff5722] hover:text-[#ff5722] transition-all flex items-center gap-2 font-bold">
                          <span>{isActive ? '⚡' : '🧮'}</span> {isActive ? 'กำลังคำนวณ...' : 'ตัวช่วยคำนวณ'}
                        </button>
                      </div>
                      <p className="text-gray-700 text-lg leading-relaxed">{item.subtitle}</p>

                      {/* Description / Sub-items preview can go here if needed */}

                      <div className="flex flex-col items-center mt-8 bg-[#fafafa] p-6 rounded-xl border border-gray-100">
                        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button key={score} onClick={() => handleScoreChange(item.id, score)}
                              className={`w-14 h-14 md:w-16 md:h-16 text-xl md:text-2xl font-bold rounded-full border-2 transition-all transform active:scale-95 ${scores[item.id] === score ? 'bg-[#ff5722] border-[#ff5722] text-white shadow-lg scale-110' : 'bg-white border-[#d7ccc8] text-[#5d4037] hover:border-[#ff5722] hover:bg-orange-50'}`}>
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedEmployee && (
            <button className="w-full bg-[#4caf50] hover:bg-[#43a047] text-white font-bold py-5 rounded-xl shadow-lg transition-transform active:scale-[0.99] text-2xl mt-8" onClick={handleSubmit}>
              บันทึกการประเมิน
            </button>
          )}
        </div>

        {/* ================= RIGHT COLUMN (Popup) เหมือนเดิม ================= */}
        {popupData && (
          <div className="w-full lg:w-[480px] shrink-0 lg:sticky lg:top-8 z-40">
            {/* ... Popup UI Code ... */}
            <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border-2 border-[#d7ccc8] flex flex-col max-h-[85vh] lg:max-h-[calc(100vh-4rem)] animate-in slide-in-from-right-10 fade-in duration-300">
              <div className="p-5 bg-[#5d4037] text-white flex justify-between items-center rounded-t-xl shrink-0 shadow-md z-10">
                <h3 className="font-bold text-xl truncate leading-snug mt-1">{popupData.title}</h3>
                <button onClick={closePopup} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors shrink-0 text-xl">✕</button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-6 bg-gray-50">
                {popupData.subItems.map((sub, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="font-bold text-lg mb-2 text-[#3e2723]">{sub.title}</p>
                    <p className="text-base text-gray-600 mb-4 leading-relaxed">{sub.description}</p>
                    <div className="flex gap-3 justify-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => handlePopupScore(idx, s)} className={`w-12 h-12 text-lg font-bold rounded-full border-2 transition-all duration-200 ${popupScores[idx] === s ? 'bg-[#ff5722] text-white border-[#ff5722] shadow-md scale-110' : 'bg-white border-gray-300 text-gray-600 hover:border-[#ff5722]'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-white border-t-2 border-gray-100 shrink-0 rounded-b-xl shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-700 font-bold text-lg">คะแนนเฉลี่ย:</span>
                  <span className={`text-4xl font-extrabold ${calculateAverage() ? 'text-[#ff5722]' : 'text-gray-300'}`}>{calculateAverage() || '0.00'}</span>
                </div>
                <button onClick={applyPopupScore} disabled={!calculateAverage()} className="w-full bg-[#ff5722] hover:bg-[#f4511e] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 text-xl">
                  <span>ใช้นำคะแนนนี้</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
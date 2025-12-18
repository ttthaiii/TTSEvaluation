'use client';

import React, { useState, useEffect } from 'react';
import { create, all } from 'mathjs'; 
import { collection, getDocs, addDoc, query, where, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore'; 
import { db } from '../../lib/firebase';
import { EVALUATION_CRITERIA, HO_SECTIONS, CATEGORY_DETAILS, EvaluationItem } from '../../data/evaluation-criteria';
import { Employee } from '../../types/employee';
import { calculateServiceTenure } from '../../utils/dateUtils';

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

export default function EvaluationPage() {
  const [loading, setLoading] = useState(true);
  
  const [sections, setSections] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  
  const [disciplineScore, setDisciplineScore] = useState<number | string>("-");

  const [existingEvaluations, setExistingEvaluations] = useState<Record<string, EvaluationRecord>>({});
  
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [scores, setScores] = useState<Record<string, number>>({});
  
  const [popupData, setPopupData] = useState<{ title: string, subItems: any[], criteriaId: string } | null>(null);
  const [popupScores, setPopupScores] = useState<Record<number, number>>({});

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

      const currentPeriod = "2025-H1";
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

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // --- 2. Calculate Discipline Score ---
  const runDisciplineCalculation = (stats: EmployeeStats) => {
    if (scoringRules.length === 0) return;

    try {
        const math = create(all);
        const context: any = { ...stats }; 

        const sortedRules = [...scoringRules].sort((a, b) => b.name.length - a.name.length);
        const variables = sortedRules.filter(r => r.type === 'VARIABLE');
        const finalScores = sortedRules.filter(r => r.type === 'SCORE');

        // 1. คำนวณ Sub-Variables
        variables.forEach(v => {
            try {
                const result = math.evaluate(v.formula, context);
                context[`VAR_${v.name}`] = result; 
            } catch (e) {
                context[`VAR_${v.name}`] = 0;
            }
        });

        // 2. คำนวณ Final Score
        let targetRule = finalScores.find(r => r.targetField === 'disciplineScore');
        if (!targetRule && finalScores.length > 0) {
            targetRule = finalScores[0];
        }

        if (targetRule) {
            let finalFormula = targetRule.formula;
            variables.forEach(v => {
                const pattern = `[${v.name}]`;
                const val = context[`VAR_${v.name}`] || 0;
                finalFormula = finalFormula.split(pattern).join(`(${val})`);
            });

            const finalResult = math.evaluate(finalFormula, context);
            setDisciplineScore(Math.round(finalResult * 100) / 100);
        } else {
            setDisciplineScore("-");
        }

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

    const prevEval = existingEvaluations[empId];
    if (prevEval) {
        const confirmReEval = confirm(`⚠️ พนักงานคนนี้ (${emp?.firstName}) ถูกประเมินไปแล้ว...`);
        if (confirmReEval) setScores(prevEval.scores);
    } 

    if (emp) {
      try {
        const statsRef = doc(db, 'users', emp.id, 'yearlyStats', '2025');
        const statsSnap = await getDoc(statsRef);
        
        if (statsSnap.exists()) {
          const statsData = statsSnap.data() as EmployeeStats;
          setEmployeeStats(statsData);
          runDisciplineCalculation(statsData);
          
        } else {
          const emptyStats = { totalLateMinutes:0, totalSickLeaveDays:0, totalAbsentDays:0, totalUnpaidLeaveDays:0, warningCount:0, year: 2025 };
          setEmployeeStats(emptyStats);
          runDisciplineCalculation(emptyStats);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    }
    setPopupData(null); 
  };

  const handleScoreChange = (criteriaId: string, score: number) => {
    setScores(prev => ({ ...prev, [criteriaId]: score }));
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
        period: "2025-H1"
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

  const getFilteredCriteria = () => {
    if (!selectedEmployee) return [];
    return EVALUATION_CRITERIA.filter(item => {
      if (item.category === 'C' && selectedEmployee.level === 'Monthly Staff') return false;
      if (item.id === 'B-4' && HO_SECTIONS.includes(selectedEmployee.section)) return false;
      return true;
    });
  };

  const groupedCriteria = getFilteredCriteria().reduce((acc, item) => {
    if (!acc[item.categoryTitle]) acc[item.categoryTitle] = [];
    acc[item.categoryTitle].push(item);
    return acc;
  }, {} as Record<string, EvaluationItem[]>);

  // --- Popup Logic ---
  const openPopup = (item: EvaluationItem) => {
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
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="flex-1 w-full min-w-0 space-y-8">
          
          {/* Header */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-[#5d4037] text-white p-6">
              <h1 className="text-3xl font-bold">แบบประเมินผลการปฏิบัติงาน</h1>
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

          {/* Employee Info Box */}
        {selectedEmployee && (
            <div className="bg-[#efebe9] p-8 rounded-xl shadow-md border-2 border-[#d7ccc8]">
              <h3 className="text-[#5d4037] font-bold mb-6 text-2xl border-b-2 border-[#d7ccc8] pb-3">
                ข้อมูลพนักงาน
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-[#3e2723] text-lg mb-6">
                <div className="flex items-center"><span className="font-bold w-32">รหัส:</span> {selectedEmployee.employeeId}</div>
                <div className="flex items-center"><span className="font-bold w-32">ชื่อ:</span> {selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                <div className="flex items-center"><span className="font-bold w-32">ส่วนงาน:</span> {selectedEmployee.section}</div>
                <div className="flex items-center"><span className="font-bold w-32">ตำแหน่ง:</span> {selectedEmployee.position}</div>
                
                <div className="flex items-center">
                  <span className="font-bold w-32">อายุงาน:</span> 
                  <span className="text-blue-700 font-bold">
                    {calculateServiceTenure(selectedEmployee.startDate, 2025)}
                  </span>
                </div>

                <div className="flex items-center">
                  <span className="font-bold w-32">ระดับ:</span>
                  <span className="bg-[#ff5722] text-white px-4 py-1 rounded-full font-medium text-sm">
                    {selectedEmployee.level}
                  </span>
                </div>
              </div>

              {/* 👇 ส่วนแสดงสถิติและคะแนน (ปรับ Layout ใหม่) */}
              {employeeStats && (
                <div className="mt-6 pt-4 border-t-2 border-[#d7ccc8]">
                  
                  {/* 1. ข้อมูลดิบ (ย้ายมาไว้ด้านบน) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/50 p-4 rounded-lg mb-6">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">มาสาย (นาที)</div>
                      <div className={`text-xl font-bold ${employeeStats.totalLateMinutes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {employeeStats.totalLateMinutes}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">ลาป่วย (วัน)</div>
                      <div className={`text-xl font-bold ${employeeStats.totalSickLeaveDays > 30 ? 'text-orange-600' : 'text-gray-800'}`}>
                        {employeeStats.totalSickLeaveDays}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">ขาดงาน (วัน)</div>
                      <div className={`text-xl font-bold ${employeeStats.totalAbsentDays > 0 ? 'text-red-800' : 'text-gray-800'}`}>
                        {employeeStats.totalAbsentDays}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">ใบเตือน</div>
                      <div className={`text-xl font-bold ${employeeStats.warningCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {employeeStats.warningCount}
                      </div>
                    </div>
                  </div>

                  {/* 2. ส่วนคะแนน (AI Score & Discipline Score) ย้ายลงมาด้านล่าง */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* AI Score */}
                      <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🤖</span>
                            <div>
                            <h4 className="font-bold text-blue-900 text-lg">AI Score</h4>
                            <p className="text-sm text-blue-700">คะแนนประเมินดิบ</p>
                            </div>
                        </div>
                        <div className="text-4xl font-extrabold text-blue-600">
                            {employeeStats.aiScore !== undefined ? employeeStats.aiScore : "-"}
                        </div>
                      </div>

                      {/* คะแนนด้านระเบียบ (เอา Breakdown ออก) */}
                      <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">⚖️</span>
                            <div>
                            <h4 className="font-bold text-green-900 text-lg">คะแนนด้านระเบียบ</h4>
                            <p className="text-sm text-green-700">คำนวณจากสูตร</p>
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

          {/* Evaluation Criteria List */}
          {selectedEmployee && Object.entries(groupedCriteria).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl shadow-md border-2 border-[#d7ccc8] overflow-hidden">
              <div className="bg-[#5d4037] text-white p-6">
                <h2 className="font-bold text-2xl">{category}</h2>
                {CATEGORY_DETAILS[category] && (
                  <p className="text-lg text-orange-100 mt-2 font-light opacity-90 leading-relaxed">
                    {CATEGORY_DETAILS[category]}
                  </p>
                )}
              </div>
              
              <div className="p-8 divide-y-2 divide-[#d7ccc8]">
                {items.map((item) => {
                  const isActive = popupData?.criteriaId === item.id;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`py-8 first:pt-0 last:pb-0 transition-all duration-300 ${
                        isActive ? 'bg-orange-50 -mx-8 px-8 border-l-8 border-[#ff5722] shadow-inner' : ''
                      }`}
                    >
                      <div className="mb-6">
                        <div className="flex flex-col gap-3">
                          
                          {/* Header row: Title & Button */}
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <h4 className={`text-2xl font-bold ${isActive ? 'text-[#ff5722]' : 'text-[#212121]'}`}>
                              {item.title}
                            </h4>
                            
                            <button 
                              onClick={() => openPopup(item)}
                              className={`shrink-0 text-base font-medium px-5 py-2 rounded-lg transition-colors border-2 shadow-sm flex items-center gap-2 ${
                                isActive 
                                  ? 'bg-[#ff5722] text-white border-[#ff5722]' 
                                  : 'bg-white text-blue-700 border-blue-200 hover:border-blue-50'
                              }`}
                            >
                              <span>{isActive ? '⚡' : '🧮'}</span>
                              {isActive ? 'กำลังคำนวณ...' : 'ตัวช่วยคำนวณ'}
                            </button>
                          </div>

                          <p className="text-gray-700 text-lg leading-relaxed">{item.subtitle}</p>

                          <div className="mt-4 space-y-2 pl-2 border-l-4 border-gray-200 ml-1">
                            {(item.description || '').split('\n').map(line => {
                                const parts = line.split(';');
                                const title = parts[0]?.trim() || '';
                                return title ? (
                                    <p key={title} className="text-lg text-gray-600 leading-relaxed pl-3">
                                        <span className="font-semibold text-[#5d4037] mr-2">•</span>
                                        {title}
                                    </p>
                                ) : null;
                            })}
                          </div>
                          
                          {item.note && (
                            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-600 text-base font-medium mt-2">
                              * {item.note}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scoring Buttons */}
                      <div className="flex flex-col items-center mt-8 bg-[#fafafa] p-6 rounded-xl border border-gray-100">
                        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              onClick={() => handleScoreChange(item.id, score)}
                              className={`w-14 h-14 md:w-16 md:h-16 text-xl md:text-2xl font-bold rounded-full border-2 transition-all transform active:scale-95 ${
                                scores[item.id] === score 
                                  ? 'bg-[#ff5722] border-[#ff5722] text-white shadow-lg scale-110' 
                                  : 'bg-white border-[#d7ccc8] text-[#5d4037] hover:border-[#ff5722] hover:bg-orange-50'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between w-full max-w-[350px] mt-2 px-2 text-gray-400 text-sm md:text-base font-medium">
                          <span>น้อยที่สุด</span>
                          <span>มากที่สุด</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedEmployee && (
            <button 
              className="w-full bg-[#4caf50] hover:bg-[#43a047] text-white font-bold py-5 rounded-xl shadow-lg transition-transform active:scale-[0.99] text-2xl mt-8"
              onClick={handleSubmit}
            >
              บันทึกการประเมิน
            </button>
          )}
        </div>

        {/* ================= RIGHT COLUMN (Popup) ================= */}
        {popupData && (
          <div className="w-full lg:w-[480px] shrink-0 lg:sticky lg:top-8 z-40">
            <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border-2 border-[#d7ccc8] flex flex-col max-h-[85vh] lg:max-h-[calc(100vh-4rem)] animate-in slide-in-from-right-10 fade-in duration-300">
              
              <div className="p-5 bg-[#5d4037] text-white flex justify-between items-center rounded-t-xl shrink-0 shadow-md z-10">
                <div className="flex flex-col min-w-0 pr-3">
                  <span className="text-sm text-orange-200 uppercase tracking-wider font-bold">เครื่องมือช่วยคำนวณ</span>
                  <h3 className="font-bold text-xl truncate leading-snug mt-1">{popupData.title}</h3>
                </div>
                <button 
                  onClick={closePopup} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors shrink-0 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-6 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                {popupData.subItems.map((sub, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="font-bold text-lg mb-2 text-[#3e2723]">{sub.title}</p>
                    <p className="text-base text-gray-600 mb-4 leading-relaxed">{sub.description}</p>
                    
                    <div className="flex gap-3 justify-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => handlePopupScore(idx, s)}
                          className={`w-12 h-12 text-lg font-bold rounded-full border-2 transition-all duration-200 ${
                            popupScores[idx] === s 
                              ? 'bg-[#ff5722] text-white border-[#ff5722] shadow-md scale-110' 
                              : 'bg-white border-gray-300 text-gray-600 hover:border-[#ff5722] hover:text-[#ff5722]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-white border-t-2 border-gray-100 shrink-0 rounded-b-xl shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10">
                <div className="flex justify-between items-center mb-4">
                   <span className="text-gray-700 font-bold text-lg">คะแนนเฉลี่ย:</span>
                   <span className={`text-4xl font-extrabold ${calculateAverage() ? 'text-[#ff5722]' : 'text-gray-300'}`}>
                      {calculateAverage() || '0.00'}
                   </span>
                </div>
                
                <button 
                  onClick={applyPopupScore}
                  disabled={!calculateAverage()}
                  className="w-full bg-[#ff5722] hover:bg-[#f4511e] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 text-xl"
                >
                  <span>ใช้นำคะแนนนี้</span>
                  {calculateAverage() && (
                     <span className="bg-white/20 px-3 py-1 rounded-lg text-lg font-bold">
                       {Math.round(parseFloat(calculateAverage() || '0'))}
                     </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
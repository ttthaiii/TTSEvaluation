'use client';

import React, { useState, useEffect } from 'react';
import { create, all } from 'mathjs';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useGradingRules } from '../../../hooks/useGradingRules';
import { GRADE_RANGES, GradeCriteria } from '../../../utils/grade-calculation';


// --- Interfaces & Constants ---

const SYSTEM_VARIABLES = [
  { label: 'นาทีสายรวม', value: 'totalLateMinutes', unit: 'นาที' },
  { label: 'วันลาป่วยรวม', value: 'totalSickLeaveDays', unit: 'วัน' },
  { label: 'วันขาดงาน', value: 'totalAbsentDays', unit: 'วัน' },
  { label: 'ใบเตือน', value: 'warningCount', unit: 'ใบ' },
];

interface ScoreCondition {
  operator: string;
  limit: number;
  score: number;
}

interface SavedRule {
  id: string;
  name: string;
  type: 'VARIABLE' | 'SCORE';
  variableCode?: string;
  formula: string;
  isSimpleMode?: boolean;
  sourceVar?: string;
  conditions?: ScoreCondition[];
  defaultScore?: number;
  targetField?: string;
}

export default function ScoringConfigPage() {
  // --- States ---
  const [activeTab, setActiveTab] = useState<'FORMULA' | 'GRADE'>('FORMULA');
  const { rules: gradeRules, loading: gradeLoading, addRule: addGrade, updateRule: updateGrade, deleteRule: deleteGrade, seedDefaults } = useGradingRules();
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState<Partial<GradeCriteria>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [useSimpleMode, setUseSimpleMode] = useState(true);
  const [formulaType, setFormulaType] = useState<'VARIABLE' | 'SCORE'>('SCORE');

  const [formulaName, setFormulaName] = useState('');
  const [variableCodeInternal, setVariableCodeInternal] = useState('');
  const [formula, setFormula] = useState('');

  // Simple Mode States
  const [selectedSimpleVar, setSelectedSimpleVar] = useState(SYSTEM_VARIABLES[0].value);
  const [conditions, setConditions] = useState<ScoreCondition[]>([
    { operator: '<=', limit: 0, score: 3 },
    { operator: '<=', limit: 10, score: 2 },
    { operator: '<=', limit: 20, score: 1 }
  ]);
  const [defaultScore, setDefaultScore] = useState(0);

  // Data States
  const [savedRules, setSavedRules] = useState<SavedRule[]>([]);
  const [customVariables, setCustomVariables] = useState<any[]>([]);
  const [otherScores, setOtherScores] = useState<any[]>([]);
  const [dynamicCriteria, setDynamicCriteria] = useState<any[]>([]); // New: for dynamic questions

  // Test States (Simulator)
  const [testValues, setTestValues] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<any>(null);

  // --- Functions ---

  // กำหนดค่าเริ่มต้นให้ Simulator (System = 0, Eval = 5)
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Rules
      const qRules = query(collection(db, 'scoring_formulas'), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(qRules);

      const allRules: SavedRule[] = [];
      const vars: any[] = [];
      const scores: any[] = [];

      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const rule: SavedRule = {
          id: doc.id,
          name: d.name,
          type: d.type,
          variableCode: d.variableCode,
          formula: d.formula,
          isSimpleMode: d.isSimpleMode,
          sourceVar: d.sourceVar,
          conditions: d.conditions,
          defaultScore: d.defaultScore,
          targetField: d.targetField
        };
        allRules.push(rule);
        if (d.type === 'VARIABLE') {
          vars.push({ id: doc.id, label: d.name, value: d.variableCode, formula: d.formula });
        } else {
          scores.push({ id: doc.id, label: d.name, formula: d.formula });
        }
      });

      setSavedRules(allRules);
      setCustomVariables(vars);
      setOtherScores(scores);

      // 2. Fetch Dynamic Criteria (Categories -> Questions)
      const qCats = query(collection(db, 'evaluation_categories'), orderBy('order'));
      const catSnap = await getDocs(qCats);
      const flattenedQuestions: any[] = [];

      catSnap.forEach(doc => {
        const d = doc.data();
        if (Array.isArray(d.questions)) {
          d.questions.forEach((q: any) => {
            flattenedQuestions.push({
              id: q.id,
              title: q.title
            });
          });
        }
      });
      setDynamicCriteria(flattenedQuestions);

      // 3. Set Defaults for Simulator
      setTestValues(prev => {
        const defaults: Record<string, number> = { ...prev };
        // System Vars
        SYSTEM_VARIABLES.forEach(v => {
          if (defaults[v.value] === undefined) defaults[v.value] = 0;
        });
        // Questions
        flattenedQuestions.forEach(item => {
          const safeKey = item.id.replace('-', '_');
          if (defaults[safeKey] === undefined) defaults[safeKey] = 5;
        });
        return defaults;
      });

    } catch (error: any) {
      console.error("Error loading data:", error);
    }
  };

  // --- Table Actions ---
  const addCondition = () => {
    setConditions([...conditions, { operator: '<=', limit: 0, score: 0 }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, field: keyof ScoreCondition, value: any) => {
    const newConds = [...conditions];
    // @ts-ignore
    newConds[idx] = { ...newConds[idx], [field]: value };
    setConditions(newConds);
  };

  const generateFormulaFromTable = (variable: string) => {
    const currentList = [...conditions];
    const isAllLess = currentList.every(c => c.operator === '<=' || c.operator === '<');
    if (isAllLess) {
      currentList.sort((a, b) => a.limit - b.limit);
    }

    let currentFormula = String(defaultScore);
    for (let i = currentList.length - 1; i >= 0; i--) {
      const cond = currentList[i];
      currentFormula = `${variable} ${cond.operator} ${cond.limit} ? ${cond.score} : (${currentFormula})`;
    }
    return currentFormula;
  };

  const insertVariableToFormula = (label: string) => {
    setFormula((prev) => prev + ` [${label}] `);
  };
  const insertSystemVariableToFormula = (val: string) => {
    setFormula((prev) => prev + ` ${val} `);
  };
  const insertScoreVariable = (id: string) => {
    // Remove brackets and replace dashes with underscores to ensure clean variable name
    const safeId = id.replace(/[\[\]]/g, '').replace('-', '_');
    setFormula((prev) => prev + ` [${safeId}] `);
  };

  const handleTestValueChange = (key: string, value: string) => {
    setTestValues((prev: any) => ({ ...prev, [key]: Number(value) }));
  };

  const setAllTestScores = (val: number) => {
    setTestValues(prev => {
      const next = { ...prev };
      setTestValues(prev => {
        const next = { ...prev };
        dynamicCriteria.forEach(item => {
          next[item.id.replace('-', '_')] = val;
        });
        return next;
      });
      return next;
    });
  };

  // Logic การจำลองคำนวณ (Simulator)
  const evaluateComplexFormula = (rawFormula: string, context: any, math: any) => {
    let processedFormula = rawFormula;

    const allReferenceable = [...customVariables, ...otherScores].sort((a, b) => b.label.length - a.label.length);

    // Pass 1: Replace user-friendly labels with evaluated values
    allReferenceable.forEach((v) => {
      const pattern = `[${v.label}]`;
      if (processedFormula.includes(pattern)) {
        let subValue = 0;
        try {
          // ลองคำนวณตัวแปรย่อยจาก context ที่มีอยู่ (ซึ่งมีค่าจากการกรอกครบถ้วนแล้ว)
          // *หมายเหตุ* ใน Simulator นี้เราทำแค่ชั้นเดียว (ไม่ได้ Recursive ลึก) เพื่อความปลอดภัย
          // ถ้าสูตรซ้อนสูตรมากๆ อาจจะต้องใช้ Logic แบบ EvaluationPage

          // เราต้องแทนค่าตัวแปรในสูตรย่อยด้วย
          let subFormula = v.formula;
          allReferenceable.forEach(innerV => {
            const innerPattern = `[${innerV.label}]`;
            if (subFormula.includes(innerPattern)) {
              // ถ้าสูตรย่อยอ้างถึงตัวอื่นที่ยังไม่รู้ค่า ให้ใส่ 0 ไปก่อน (Simulation limitation)
              // หรือถ้าจะให้ดี ต้องทำ Topological Sort แต่เอาเท่านี้ก่อนสำหรับ Admin UI
              subFormula = subFormula.split(innerPattern).join('(0)');
            }
          });

          subValue = math.evaluate(subFormula, context);
        } catch (e) {
          subValue = 0;
        }
        processedFormula = processedFormula.split(pattern).join(`(${subValue})`);
      }
    });

    return math.evaluate(processedFormula, context);
  };

  const runTest = () => {
    try {
      const math = create(all);
      // 👇 ใช้ค่าจากที่กรอกจริง ไม่มีการ Mock 5 คะแนนแล้ว
      const currentContext = { ...testValues };

      let formulaToTest = formula;
      if (useSimpleMode) {
        formulaToTest = generateFormulaFromTable(selectedSimpleVar);
      }

      const result = evaluateComplexFormula(formulaToTest, currentContext, math);

      // ปัดทศนิยมให้สวยงาม
      if (typeof result === 'number') {
        setTestResult(Math.round(result * 100) / 100);
      } else {
        setTestResult(result);
      }

    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      setTestResult("Error: " + msg);
    }
  };

  const saveFormula = async () => {
    if (!formulaName) return alert("กรุณากรอกชื่อ");

    let finalVarCode = variableCodeInternal;
    if (formulaType === 'VARIABLE' && !finalVarCode) {
      finalVarCode = 'var_' + Math.random().toString(36).substring(2, 7);
    }

    let finalFormula = formula;
    if (useSimpleMode) {
      finalFormula = generateFormulaFromTable(selectedSimpleVar);
    }

    if (!finalFormula) return alert("ยังไม่มีสูตร");

    const dataToSave = {
      name: formulaName,
      formula: finalFormula,
      type: formulaType,
      variableCode: formulaType === 'VARIABLE' ? finalVarCode : null,
      targetField: formulaType === 'SCORE' ? 'disciplineScore' : null,
      isSimpleMode: useSimpleMode,
      sourceVar: useSimpleMode ? selectedSimpleVar : null,
      conditions: useSimpleMode ? conditions : null,
      defaultScore: useSimpleMode ? defaultScore : null,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'scoring_formulas', editingId), dataToSave);
        alert("อัปเดตข้อมูลสำเร็จ!");
      } else {
        await addDoc(collection(db, 'scoring_formulas'), dataToSave);
        alert("บันทึกข้อมูลสำเร็จ!");
      }

      resetForm();
      fetchData();

    } catch (e) {
      alert("บันทึกไม่ผ่าน: " + e);
    }
  };

  const deleteRule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("ยืนยันการลบ?")) return;
    try {
      await deleteDoc(doc(db, 'scoring_formulas', id));
      fetchData();
      if (editingId === id) resetForm();
    } catch (e) {
      alert("ลบไม่สำเร็จ: " + e);
    }
  };

  const editRule = (rule: SavedRule) => {
    setEditingId(rule.id);
    setFormulaName(rule.name);
    setFormulaType(rule.type);
    setUseSimpleMode(rule.isSimpleMode ?? false);
    setVariableCodeInternal(rule.variableCode || '');

    if (rule.isSimpleMode) {
      if (rule.conditions && rule.conditions.length > 0) {
        setConditions(JSON.parse(JSON.stringify(rule.conditions)));
      } else {
        setConditions([{ operator: '<=', limit: 0, score: 0 }]);
      }

      if (rule.defaultScore !== undefined) setDefaultScore(rule.defaultScore);

      if (rule.sourceVar) {
        setSelectedSimpleVar(rule.sourceVar);
      } else {
        const foundVar = SYSTEM_VARIABLES.find(v => rule.formula.includes(v.value));
        if (foundVar) {
          setSelectedSimpleVar(foundVar.value);
        } else {
          setSelectedSimpleVar(SYSTEM_VARIABLES[0].value);
        }
      }
    } else {
      setFormula(rule.formula || '');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormulaName('');
    setVariableCodeInternal('');
    setFormula('');
    setConditions([{ operator: '<=', limit: 0, score: 0 }]);
    setDefaultScore(0);
    setTestResult(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen font-sans text-[#3e2723]">
      <h1 className="text-3xl font-bold text-[#5d4037] mb-6">⚙️ ตั้งค่าเกณฑ์การประเมิน (Scoring Rules)</h1>

      {/* 🔥 Tab Switcher */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('FORMULA')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'FORMULA' ? 'bg-[#ff5722] text-white shadow-lg scale-105' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
        >
          🧮 สูตรคำนวณ (Formulas)
        </button>
        <button
          onClick={() => setActiveTab('GRADE')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'GRADE' ? 'bg-[#ff5722] text-white shadow-lg scale-105' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
        >
          🎨 เกณฑ์การตัดเกรด (Grading)
        </button>
      </div>

      {
        activeTab === 'GRADE' ? (
          <div className="space-y-8 animate-fade-in">
            {/* Grade Management UI */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">จัดการเกณฑ์เกรด (Grading Scales)</h2>
                <div className="flex gap-2">
                  {gradeRules.length === 0 && (
                    <button onClick={() => seedDefaults(GRADE_RANGES)} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 font-bold">
                      ✨ Load Defaults (NI-E)
                    </button>
                  )}
                  <button onClick={() => { setEditingGradeId(null); setGradeForm({}); }} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200">
                    ล้างฟอร์ม
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border">
                <input type="text" placeholder="Grade (e.g. A, E)" value={gradeForm.grade || ''} onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })} className="p-2 border rounded" />
                <input type="text" placeholder="Label (e.g. Excellent)" value={gradeForm.label || ''} onChange={e => setGradeForm({ ...gradeForm, label: e.target.value })} className="p-2 border rounded" />
                <input type="text" placeholder="Description" value={gradeForm.description || ''} onChange={e => setGradeForm({ ...gradeForm, description: e.target.value })} className="p-2 border rounded" />
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={gradeForm.min || 0} onChange={e => setGradeForm({ ...gradeForm, min: Number(e.target.value) })} className="p-2 border rounded w-24" />
                  <span>-</span>
                  <input type="number" placeholder="Max" value={gradeForm.max || 100} onChange={e => setGradeForm({ ...gradeForm, max: Number(e.target.value) })} className="p-2 border rounded w-24" />
                </div>
                <input type="text" placeholder="Icon (e.g. 🏆)" value={gradeForm.icon || ''} onChange={e => setGradeForm({ ...gradeForm, icon: e.target.value })} className="p-2 border rounded" />

                <select value={gradeForm.colorClass || ''} onChange={e => {
                  const color = e.target.value;
                  setGradeForm({
                    ...gradeForm,
                    colorClass: `text-${color}-600`,
                    bgClass: `bg-${color}-50`,
                    borderClass: `border-${color}-200`
                  })
                }} className="p-2 border rounded">
                  <option value="">Select Color Theme</option>
                  <option value="emerald">Green (Emerald)</option>
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                  <option value="rose">Red</option>
                </select>

                <button
                  onClick={() => {
                    if (!gradeForm.grade || !gradeForm.label) return alert("กรุณากรอกข้อมูลให้ครบ");
                    if (editingGradeId) {
                      // @ts-ignore
                      updateGrade(editingGradeId, gradeForm);
                      setEditingGradeId(null);
                    } else {
                      // @ts-ignore
                      addGrade(gradeForm);
                    }
                    setGradeForm({});
                  }}
                  className="col-span-full md:col-span-1 bg-[#ff5722] text-white font-bold py-2 rounded hover:bg-[#f4511e]"
                >
                  {editingGradeId ? 'Update Grade' : 'Add Grade'}
                </button>
              </div>

              {/* List */}
              <div className="space-y-2">
                {gradeRules.map(rule => (
                  <div key={rule.id} onClick={() => { setEditingGradeId(rule.id!); setGradeForm(rule); }} className={`flex items-center justify-between p-4 bg-white border rounded-lg cursor-pointer hover:shadow-md transition ${editingGradeId === rule.id ? 'border-[#ff5722] bg-orange-50' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${rule.bgClass} ${rule.colorClass}`}>
                        {rule.icon}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{rule.grade} <span className="text-sm font-normal text-gray-500">({rule.min} - {rule.max})</span></div>
                        <div className="text-sm text-gray-500">{rule.label}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs px-2 py-1 rounded ${rule.bgClass} ${rule.colorClass} border ${rule.borderClass}`}>Preview</div>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) deleteGrade(rule.id!); }} className="text-red-400 hover:text-red-600 px-2">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={`bg-white p-6 rounded-xl shadow-lg space-y-8 mb-10 border-2 ${editingId ? 'border-yellow-400' : 'border-transparent'}`}>
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {editingId ? '✏️ กำลังแก้ไขเกณฑ์' : '✨ สร้างเกณฑ์ใหม่'}
                  {editingId && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Editing Mode</span>}
                </h2>
                {
                  editingId && (
                    <button onClick={resetForm} className="text-sm text-gray-500 hover:text-red-500 underline">
                      ยกเลิกการแก้ไข
                    </button>
                  )
                }
              </div >

              <div className="flex flex-col md:flex-row gap-6 pb-6">
                <div className="flex-1">
                  <label className="block font-bold mb-2">1. สิ่งที่คุณต้องการสร้างคือ?</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer ${formulaType === 'SCORE' ? 'border-[#ff5722] bg-orange-50 text-[#ff5722]' : 'border-gray-200'}`}>
                      <input type="radio" className="hidden" checked={formulaType === 'SCORE'} onChange={() => setFormulaType('SCORE')} />
                      <span className="font-bold">🏆 เกณฑ์หลัก (Final)</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer ${formulaType === 'VARIABLE' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>
                      <input type="radio" className="hidden" checked={formulaType === 'VARIABLE'} onChange={() => setFormulaType('VARIABLE')} />
                      <span className="font-bold">🧩 ตัวแปรย่อย (Sub)</span>
                    </label>
                  </div>
                </div>

                <div className="flex-[1.5] space-y-4">
                  <div>
                    <label className="block font-bold mb-2">2. ตั้งชื่อ (Display Name)</label>
                    <input
                      type="text"
                      placeholder={formulaType === 'SCORE' ? "เช่น คะแนนรวมทั้งหมด" : "เช่น คะแนนตัดเกรดลาป่วย"}
                      value={formulaName}
                      onChange={(e) => setFormulaName(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg focus:border-[#ff5722] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="block font-bold text-xl">3. กำหนดสูตร / เงื่อนไข</label>
                  <button
                    onClick={() => setUseSimpleMode(!useSimpleMode)}
                    className="text-sm font-semibold text-blue-600 underline"
                  >
                    {useSimpleMode ? "สลับไปโหมดขั้นสูง (Advanced)" : "กลับไปโหมดตาราง (Simple)"}
                  </button>
                </div>

                {useSimpleMode ? (
                  <div className="bg-blue-50/50 p-6 rounded-xl border-2 border-blue-100">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="font-bold">ใช้ค่าจาก:</span>
                      <select
                        className="p-2 border rounded-lg"
                        value={selectedSimpleVar}
                        onChange={(e) => setSelectedSimpleVar(e.target.value)}
                      >
                        <optgroup label="ข้อมูลดิบ (System)">
                          {SYSTEM_VARIABLES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                        </optgroup>
                      </select>
                    </div>

                    <div className="space-y-3">
                      {conditions.map((cond, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-lg border shadow-sm">
                          <span className="text-gray-600 font-bold w-10 text-right">ถ้า</span>

                          <select
                            className="bg-gray-100 border rounded px-2 py-1 font-mono font-bold text-center"
                            value={cond.operator}
                            onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                          >
                            <option value="<=">&le; น้อยกว่าเท่ากับ</option>
                            <option value="<">&lt; น้อยกว่า</option>
                            <option value="=">= เท่ากับ</option>
                            <option value=">">&gt; มากกว่า</option>
                            <option value=">=">&ge; มากกว่าเท่ากับ</option>
                          </select>

                          <input
                            type="number"
                            value={cond.limit}
                            onChange={(e) => updateCondition(idx, 'limit', Number(e.target.value))}
                            className="w-24 p-2 border rounded font-bold text-center"
                          />

                          <span className="text-gray-400">➜</span>
                          <span className="text-gray-600">ได้</span>

                          <input
                            type="number"
                            value={cond.score}
                            onChange={(e) => updateCondition(idx, 'score', Number(e.target.value))}
                            className="w-20 p-2 border-2 border-green-100 bg-green-50 text-green-700 rounded font-bold text-center"
                          />
                          <span className="text-gray-600">คะแนน</span>

                          <button onClick={() => removeCondition(idx)} className="ml-auto text-red-400 hover:text-red-600">🗑️</button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between mt-4">
                      <button onClick={addCondition} className="text-blue-600 font-bold text-sm">+ เพิ่มเงื่อนไข</button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">กรณีไม่เข้าเงื่อนไขใดเลย ได้:</span>
                        <input type="number" value={defaultScore} onChange={(e) => setDefaultScore(Number(e.target.value))} className="w-16 p-1 border rounded text-center" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-orange-50 p-4 border border-orange-200 rounded-lg">
                      <p className="text-sm font-bold text-orange-800 mb-2">💡 วิธีการรวมคะแนน & ตัดคะแนน (Sum & Cap)</p>
                      <p className="text-sm text-orange-700">
                        - การรวมคะแนน: <span className="font-bold">[คะแนนลาป่วย] + [คะแนนมาสาย]</span><br />
                        - การตัดคะแนนเต็ม: <span className="font-bold">min([คะแนนรวม], 20)</span> (ถ้าเกิน 20 ให้เหลือ 20)
                      </p>
                    </div>

                    {/* ปุ่มแทรกตัวแปร */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-2">1. System Variables</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {SYSTEM_VARIABLES.map((v) => (
                          <button key={v.value} onClick={() => insertSystemVariableToFormula(v.value)} className="px-3 py-1 bg-white border rounded-full text-xs shadow-sm hover:bg-gray-50 transition text-gray-700">
                            {v.label}
                          </button>
                        ))}
                      </div>

                      <p className="text-xs text-gray-400 uppercase font-bold mb-2">2. Evaluation Scores</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {dynamicCriteria.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => insertScoreVariable(item.id)}
                            title={item.title}
                            className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-xs font-bold shadow-sm hover:bg-purple-100 transition"
                          >
                            {item.id}
                          </button>
                        ))}
                        {dynamicCriteria.length === 0 && <span className="text-xs text-gray-400">- กำลังโหลด... -</span>}
                      </div>

                      <p className="text-xs text-gray-400 uppercase font-bold mb-2">3. Custom Variables (ตัวแปรย่อย)</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {customVariables.map((v) => (
                          <button key={v.id} onClick={() => insertVariableToFormula(v.label)} className="px-3 py-1 bg-blue-100 border border-blue-300 text-blue-800 rounded-full text-xs font-bold shadow-sm hover:bg-blue-200 transition">
                            ★ {v.label}
                          </button>
                        ))}
                        {customVariables.length === 0 && <span className="text-xs text-gray-400">- ยังไม่มี -</span>}
                      </div>

                      <p className="text-xs text-gray-400 uppercase font-bold mb-2">4. Other Scores (เกณฑ์อื่นๆ)</p>
                      <div className="flex flex-wrap gap-2">
                        {otherScores.map((v) => (
                          // กรองไม่ให้เลือกตัวเอง
                          v.id !== editingId && (
                            <button key={v.id} onClick={() => insertVariableToFormula(v.label)} className="px-3 py-1 bg-orange-100 border border-orange-300 text-orange-800 rounded-full text-xs font-bold shadow-sm hover:bg-orange-200 transition">
                              🏆 {v.label}
                            </button>
                          )
                        ))}
                        {otherScores.length === 0 && <span className="text-xs text-gray-400">- ยังไม่มีเกณฑ์อื่น -</span>}
                      </div>
                    </div>

                    <textarea
                      value={formula}
                      onChange={(e) => setFormula(e.target.value)}
                      rows={4}
                      className="w-full p-4 font-mono text-lg border-2 border-gray-300 rounded-xl bg-[#282c34] text-[#a9b7c6]"
                      placeholder="เช่น min( ([A_1] + [A_2]), 20 )"
                    />
                  </div>
                )}
              </div>

              {/* Simulator อัปเกรดใหม่ มีตัวแปรครบ */}
              <div className="bg-gray-100 p-6 rounded-xl flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 text-lg">🧪 ทดสอบคำนวณ (Simulator)</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setAllTestScores(0)} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">Reset 0</button>
                    <button onClick={() => setAllTestScores(5)} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">Set All 5</button>
                  </div>
                </div>

                {/* 1. System Variables */}
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">System Variables</p>
                  <div className="flex flex-wrap gap-4">
                    {SYSTEM_VARIABLES.map((v) => (
                      <div key={v.value} className="flex flex-col">
                        <label className="text-xs font-bold text-gray-500 mb-1">{v.label}</label>
                        <input
                          type="number"
                          className="p-2 border rounded w-24 text-center bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
                          placeholder="0"
                          value={testValues[v.value] || 0}
                          onChange={(e) => handleTestValueChange(v.value, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Evaluation Scores (Grid) */}
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">Evaluation Scores (1-5)</p>
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    {dynamicCriteria.map((item) => {
                      const safeKey = item.id.replace('-', '_');
                      return (
                        <div key={item.id} className="flex flex-col items-center">
                          <label className="text-[10px] font-bold text-purple-600 mb-1">{item.id}</label>
                          <input
                            type="number"
                            min={0} max={5}
                            className="p-1 border rounded w-full text-center text-sm focus:border-purple-500 outline-none bg-purple-50/30 focus:bg-white"
                            value={testValues[safeKey] || 0}
                            onChange={(e) => handleTestValueChange(safeKey, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Result Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    ℹ️ <span className="text-xs">กรอกค่าตัวแปรด้านบน แล้วกดคำนวณ (ตัวแปรย่อย/เกณฑ์อื่น จะถูกคำนวณอัตโนมัติ)</span>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={runTest} className="flex-1 md:flex-none bg-gray-800 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-black transition flex items-center justify-center gap-2">
                      <span>▶ คำนวณผลลัพธ์:</span>
                      <span className="text-[#ff5722] text-2xl ml-1">{testResult !== null ? testResult : "-"}</span>
                    </button>
                    <button onClick={saveFormula} className="flex-1 md:flex-none bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition">
                      {editingId ? '💾 บันทึกการแก้ไข' : '💾 บันทึกใหม่'}
                    </button>
                  </div>
                </div>
              </div>

            </div >

            {/* List (Code เดิม) */}
            < div className="bg-white rounded-xl shadow-md overflow-hidden" >
              <div className="bg-[#5d4037] text-white p-4">
                <h2 className="font-bold text-xl">📋 รายการเกณฑ์ที่บันทึกไว้ ({savedRules.length})</h2>
                <p className="text-sm text-orange-100 opacity-80">คลิกที่รายการเพื่อแก้ไข</p>
              </div>
              <div className="divide-y">
                {savedRules.length === 0 && <p className="p-8 text-center text-gray-400">ยังไม่มีเกณฑ์ที่บันทึก</p>}

                {savedRules.map((rule) => (
                  <div
                    key={rule.id}
                    onClick={() => editRule(rule)}
                    className={`p-4 flex items-center justify-between hover:bg-blue-50 cursor-pointer transition-colors border-l-4 ${editingId === rule.id ? 'bg-blue-50 border-blue-500' : 'border-transparent'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${rule.type === 'SCORE' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {rule.type === 'SCORE' ? '🏆' : '🧩'}
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-800">{rule.name}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {rule.type === 'VARIABLE' ? 'Sub Variable' : 'Final Score'}
                          {rule.isSimpleMode && <span className="ml-2 bg-green-100 text-green-700 px-1 rounded">Simple Table</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => deleteRule(rule.id, e)}
                        className="text-red-400 hover:bg-red-50 hover:text-red-600 p-2 rounded transition z-10"
                        title="ลบ"
                      >
                        🗑️ ลบ
                      </button>
                      <span className="text-gray-300">›</span>
                    </div>
                  </div>
                ))}
              </div>
            </div >
          </>
        )
      }
    </div >
  );
}
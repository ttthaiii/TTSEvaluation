'use client';

import React, { useState, useEffect } from 'react';
import { create, all } from 'mathjs';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'; 
import { db } from '../../../lib/firebase';

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
}

export default function ScoringConfigPage() {
  // --- States ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useSimpleMode, setUseSimpleMode] = useState(true);
  const [formulaType, setFormulaType] = useState<'VARIABLE' | 'SCORE'>('SCORE'); 
  
  // ชื่อสำหรับแสดงผล (ไทยได้)
  const [formulaName, setFormulaName] = useState('');   
  
  // รหัสตัวแปร (เก็บไว้หลังบ้าน User ไม่ต้องยุ่ง)
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

  // Test States
  const [testValues, setTestValues] = useState<any>({
    totalLateMinutes: 0,
    totalSickLeaveDays: 0,
    totalAbsentDays: 0,
    warningCount: 0,
  });
  const [testResult, setTestResult] = useState<any>(null);

  // --- Functions ---

  const fetchData = async () => {
    try {
      const q = query(collection(db, 'scoring_formulas'), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const allRules: SavedRule[] = [];
      const vars: any[] = [];

      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const rule: SavedRule = {
          id: doc.id,
          name: d.name,
          type: d.type,
          variableCode: d.variableCode, // รหัสภาษาอังกฤษ (มีหรือไม่มีก็ได้ ระบบจัดการเอง)
          formula: d.formula,
          isSimpleMode: d.isSimpleMode,
          sourceVar: d.sourceVar,
          conditions: d.conditions, 
          defaultScore: d.defaultScore
        };

        allRules.push(rule);

        if (d.type === 'VARIABLE') {
          vars.push({ 
            id: doc.id,
            label: d.name,          // ชื่อแสดง (ไทย)
            value: d.variableCode,  // รหัสคำนวณ
            formula: d.formula     
          });
        }
      });

      setSavedRules(allRules);
      setCustomVariables(vars);

    } catch (error: any) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      // ถ้า variable เป็นชื่อไทยในวงเล็บ [ชื่อ] ต้องไม่พัง
      // แต่ใน Simple Mode ตัว variable มักจะเป็น system var (totalLateMinutes) หรือ custom var code
      // *จุดสำคัญ* คือตอน save เราจะ save logic นี้ไป
      currentFormula = `${variable} ${cond.operator} ${cond.limit} ? ${cond.score} : (${currentFormula})`;
    }
    return currentFormula;
  };

  // ✅ แก้ไข: แทรกชื่อไทยพร้อมวงเล็บ [ ] เพื่อให้อ่านง่าย
  const insertVariableToFormula = (label: string) => {
    setFormula((prev) => prev + ` [${label}] `);
  };
  const insertSystemVariableToFormula = (val: string) => {
    setFormula((prev) => prev + ` ${val} `);
  };

  const handleTestValueChange = (key: string, value: string) => {
    setTestValues((prev: any) => ({ ...prev, [key]: Number(value) }));
  };

  // ✅ ฟังก์ชันหัวใจสำคัญ: แปลงสูตรที่มี [ชื่อไทย] ให้เป็นสูตรที่คำนวณได้จริง
  const evaluateComplexFormula = (rawFormula: string, context: any, math: any) => {
      let processedFormula = rawFormula;

      // 1. วนลูปหา [ชื่อตัวแปร] ในสูตร แล้วแทนที่ด้วยค่าที่คำนวณได้
      // เราจะเรียงจากชื่อยาวไปสั้น เพื่อป้องกันการแทนที่คำที่ซ้อนกัน
      const sortedVars = [...customVariables].sort((a, b) => b.label.length - a.label.length);

      sortedVars.forEach((v) => {
         const pattern = `[${v.label}]`; // เช่น [คะแนนเกณฑ์ลาป่วย]
         
         if (processedFormula.includes(pattern)) {
             // คำนวณค่าของตัวแปรย่อยนั้นก่อน
             let subValue = 0;
             try {
                 // ถ้าสูตรย่อยมีการอ้างถึง [ตัวอื่น] อีก ก็ต้อง recursive (แต่ในที่นี้เอาชั้นเดียวพอก่อนเพื่อไม่ให้ซับซ้อน)
                 // ส่วนใหญ่ตัวแปรย่อยจะใช้ System Vars (total...) ซึ่งคำนวณได้เลย
                 subValue = math.evaluate(v.formula, context); 
             } catch (e) {
                 console.error(`Error calc sub-var ${v.label}:`, e);
                 subValue = 0;
             }
             
             // แทนที่ [ชื่อไทย] ด้วยตัวเลขผลลัพธ์ไปเลย
             // ใช้ replaceAll เพื่อแทนทุกจุด
             processedFormula = processedFormula.split(pattern).join(`(${subValue})`);
         }
      });

      return math.evaluate(processedFormula, context);
  };

  const runTest = () => {
    try {
      const math = create(all);
      const currentContext = { ...testValues };
      
      let formulaToTest = formula;
      if (useSimpleMode) {
        // ใน Simple Mode ส่วนใหญ่ใช้ System Var ตรงๆ ไม่ต้องแปลงอะไรมาก
        formulaToTest = generateFormulaFromTable(selectedSimpleVar);
      }

      console.log("Original Formula:", formulaToTest);
      
      // เรียกใช้ฟังก์ชันคำนวณแบบพิเศษที่รองรับ [ภาษาไทย]
      const result = evaluateComplexFormula(formulaToTest, currentContext, math);
      setTestResult(result);
      
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      setTestResult("Error: " + msg);
    }
  };

  const saveFormula = async () => {
    if (!formulaName) return alert("กรุณากรอกชื่อ");

    // ถ้าเป็น Variable แล้วยังไม่มี code ให้สร้าง auto
    let finalVarCode = variableCodeInternal;
    if (formulaType === 'VARIABLE' && !finalVarCode) {
        // สร้างรหัสสุ่ม เช่น var_x9z1m
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
          // Fallback logic
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

      {/* Box สร้างเกณฑ์ */}
      <div className={`bg-white p-6 rounded-xl shadow-lg space-y-8 mb-10 border-2 ${editingId ? 'border-yellow-400' : 'border-transparent'}`}>
        
        <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
                {editingId ? '✏️ กำลังแก้ไขเกณฑ์' : '✨ สร้างเกณฑ์ใหม่'}
                {editingId && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Editing Mode</span>}
            </h2>
            {editingId && (
                <button onClick={resetForm} className="text-sm text-gray-500 hover:text-red-500 underline">
                    ยกเลิกการแก้ไข
                </button>
            )}
        </div>
        
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
                  placeholder={formulaType === 'SCORE' ? "เช่น คะแนนรวมด้านระเบียบวินัย" : "เช่น คะแนนตัดเกรดลาป่วย"}
                  value={formulaName} 
                  onChange={(e) => setFormulaName(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg focus:border-[#ff5722] outline-none"
                />
              </div>
              {/* ซ่อนช่องกรอก Variable Code ไปเลย ให้ระบบจัดการเอง */}
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
                  {/* สำหรับ Simple Mode เรามักจะใช้ข้อมูลดิบมาตัดเกรด จึงอาจจะไม่แสดงตัวแปรย่อยที่สร้างเองเพื่อกันงง */}
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
                  <p className="text-sm font-bold text-orange-800 mb-2">💡 วิธีการรวมคะแนน (Summation)</p>
                  <p className="text-sm text-orange-700">
                    คลิกที่ปุ่มตัวแปรด้านล่างเพื่อแทรกสูตร เช่น <span className="font-bold">[คะแนนลาป่วย] + [คะแนนมาสาย]</span>
                  </p>
               </div>
               
               {/* ปุ่มแทรกตัวแปร */}
               <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-sm text-gray-500 mb-2">คลิกเพื่อแทรกตัวแปร:</p>
                <div className="flex flex-wrap gap-2">
                  {/* System Vars */}
                  {SYSTEM_VARIABLES.map((v) => (
                    <button key={v.value} onClick={() => insertSystemVariableToFormula(v.value)} className="px-3 py-1 bg-white border rounded-full text-xs shadow-sm hover:bg-gray-50 transition text-gray-700">
                      {v.label} (System)
                    </button>
                  ))}
                  
                  {/* Custom Vars (แสดงชื่อไทย) */}
                  {customVariables.map((v) => (
                    <button key={v.id} onClick={() => insertVariableToFormula(v.label)} className="px-3 py-1 bg-blue-100 border border-blue-300 text-blue-800 rounded-full text-xs font-bold shadow-sm hover:bg-blue-200 transition">
                      ★ {v.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <textarea 
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                rows={4}
                className="w-full p-4 font-mono text-lg border-2 border-gray-300 rounded-xl bg-[#282c34] text-[#a9b7c6]"
                placeholder="เช่น [คะแนนเกณฑ์ลาป่วย] + [คะแนนเกณฑ์มาสาย]"
              />
            </div>
          )}
        </div>

        {/* Simulator */}
        <div className="bg-gray-100 p-6 rounded-xl flex flex-col gap-4">
           <h3 className="font-bold text-gray-700">🧪 ทดสอบคำนวณ (Simulator)</h3>
           <div className="flex flex-wrap gap-4 items-center border-b pb-4 mb-2">
             {SYSTEM_VARIABLES.map((v) => (
                <div key={v.value} className="flex flex-col">
                  <label className="text-xs font-bold text-gray-500 mb-1">{v.label}</label>
                  <input
                    type="number"
                    className="p-2 border rounded w-28 bg-white focus:border-blue-500 outline-none"
                    placeholder="0"
                    value={testValues[v.value]}
                    onChange={(e) => handleTestValueChange(v.value, e.target.value)}
                  />
                </div>
             ))}
           </div>
           
           <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="text-sm text-gray-500">
                * กรอกตัวเลขด้านบนแล้วกด "คำนวณผลลัพธ์"
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={runTest} className="flex-1 md:flex-none bg-gray-800 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-black transition">
                        ▶ คำนวณผลลัพธ์: <span className="text-[#ff5722] text-xl ml-2">{testResult !== null ? testResult : "-"}</span>
                    </button>
                    <button onClick={saveFormula} className="flex-1 md:flex-none bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition">
                        {editingId ? '💾 บันทึกการแก้ไข' : '💾 บันทึกใหม่'}
                    </button>
              </div>
           </div>
        </div>

      </div>

      {/* รายการที่บันทึกไว้ */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
      </div>

    </div>
  );
}
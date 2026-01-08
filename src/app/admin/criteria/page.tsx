'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
// Import ข้อมูลตั้งต้นเผื่อใช้ Reset
import { EVALUATION_CRITERIA } from '../../../data/evaluation-criteria';

interface QuestionItem {
    id: string; // เช่น A-1
    title: string;
    subtitle?: string;
    description?: string;
    maxScore: number; // คะแนนเต็มของข้อนี้ (ปกติ 5)
    isReadOnly?: boolean; // 🔥 New feature via T-010
}

interface Category {
    id: string; // A, B, C
    title: string; // พฤติกรรม
    order: number;
    questions: QuestionItem[];
}

export default function CriteriaManagementPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [scoringRules, setScoringRules] = useState<any[]>([]); // 🔥 for Safety Check
    const [loading, setLoading] = useState(true);

    // Form States
    const [editingCat, setEditingCat] = useState<Category | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

    // --- Fetch Data ---
    const fetchData = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'evaluation_categories'), orderBy('order'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                // ถ้ายังไม่มีข้อมูลใน DB ให้ปุ่มกดเพื่อ Load Default
                setCategories([]);
            } else {
                const data = snapshot.docs.map(d => d.data() as Category);
                setCategories(data);
                if (data.length > 0 && !selectedCatId) setSelectedCatId(data[0].id);
            }

            // Fetch Scoring Rules for Safety Check
            const rulesSnap = await getDocs(collection(db, 'scoring_formulas'));
            const rules = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setScoringRules(rules);

        } catch (err) {
            console.error(err);
            alert("โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Actions ---

    // ฟังก์ชันโหลดข้อมูลจากไฟล์ Static ลง Database ครั้งแรก
    const loadDefaults = async () => {
        if (!confirm("การโหลดค่าเริ่มต้นจะล้างข้อมูลเกณฑ์ที่มีอยู่ทั้งหมด?")) return;
        try {
            setLoading(true);
            const batch = writeBatch(db);

            // 1. Group ข้อมูลจากไฟล์เดิม
            const grouped: Record<string, Category> = {};
            EVALUATION_CRITERIA.forEach(item => {
                if (!grouped[item.category]) {
                    grouped[item.category] = {
                        id: item.category,
                        title: item.categoryTitle.replace(`[${item.category}] `, ''), // ตัด prefix ออก
                        order: item.category.charCodeAt(0),
                        questions: []
                    };
                }
                grouped[item.category].questions.push({
                    id: item.id,
                    title: item.title,
                    subtitle: item.subtitle,
                    description: item.description,
                    maxScore: 5 // Default 5 คะแนน
                });
            });

            // 2. Prepare Batch
            Object.values(grouped).forEach(cat => {
                const ref = doc(db, 'evaluation_categories', cat.id);
                batch.set(ref, cat);
            });

            await batch.commit();
            alert("✅ โหลดข้อมูลเริ่มต้นเรียบร้อย!");
            fetchData();
        } catch (e) {
            alert("Error: " + e);
        } finally {
            setLoading(false);
        }
    };

    const saveCategory = async () => {
        if (!editingCat) return;
        try {
            await setDoc(doc(db, 'evaluation_categories', editingCat.id), editingCat);
            setEditingCat(null);
            fetchData();
        } catch (e) { alert(e); }
    };

    const deleteCategory = async (id: string) => {
        if (!confirm("ยืนยันลบหมวดหมู่นี้?")) return;
        await deleteDoc(doc(db, 'evaluation_categories', id));
        fetchData();
    };

    const saveQuestion = async () => {
        if (!editingQuestion || !selectedCatId) return;

        const catIndex = categories.findIndex(c => c.id === selectedCatId);
        if (catIndex === -1) return;

        const newCategories = [...categories];
        const cat = { ...newCategories[catIndex] };

        // เช็คว่าแก้ไขหรือเพิ่มใหม่
        const qIndex = cat.questions.findIndex(q => q.id === editingQuestion.id);

        if (qIndex > -1) {
            // แก้ไข
            cat.questions[qIndex] = editingQuestion;
        } else {
            // เพิ่มใหม่ (ต้องเช็ค ID ซ้ำไหม ถ้าซ้ำอาจต้องแจ้งเตือน หรือยอมให้ทับ)
            cat.questions.push(editingQuestion);
            // เรียงลำดับตาม ID หน่อยก็ดี
            cat.questions.sort((a, b) => a.id.localeCompare(b.id));
        }

        try {
            await setDoc(doc(db, 'evaluation_categories', cat.id), cat);
            setEditingQuestion(null);
            fetchData();
        } catch (e) { alert(e); }
    };

    const deleteQuestion = async (qId: string) => {
        if (!selectedCatId) return;

        // 🔥 1. Check Usage in Formulas
        const safeId = qId.replace('-', '_'); // e.g. A-1 -> A_1
        const usedIn = scoringRules.filter(rule => {
            // Check for both [A-1] and A_1 formats
            const formula = rule.formula || '';
            return formula.includes(safeId) || formula.includes(`[${qId}]`);
        });

        if (usedIn.length > 0) {
            const ruleNames = usedIn.map(r => `"${r.name}"`).join(', ');
            alert(`🚫 ไม่สามารถลบ "${qId}" ได้!\n\nเนื่องจากถูกใช้งานอยู่ในสูตรคำนวณ:\n${ruleNames}\n\nกรุณาลบหรือแก้ไขสูตรเหล่านี้ก่อนครับ`);
            return;
        }

        // 2. Normal Delete
        if (!confirm("ยืนยันการลบข้อนี้?")) return;

        const cat = categories.find(c => c.id === selectedCatId);
        if (!cat) return;

        const newQuestions = cat.questions.filter(q => q.id !== qId);
        await setDoc(doc(db, 'evaluation_categories', cat.id), { ...cat, questions: newQuestions });
        fetchData();
    };

    // --- Render ---

    if (loading) return <div className="p-10 text-center">⏳ กำลังโหลด...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-[#5d4037]">📝 จัดการแบบประเมิน (Evaluation Form Config)</h1>
                <button onClick={loadDefaults} className="text-sm text-gray-500 underline hover:text-red-500">
                    ↺ รีเซ็ตค่าเริ่มต้น (Reset Default)
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">

                {/* Left: Category List */}
                <div className="w-full md:w-1/3 bg-white p-4 rounded-xl shadow-md h-fit">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">หมวดหมู่ (Categories)</h3>
                        <button
                            onClick={() => setEditingCat({ id: '', title: '', order: 0, questions: [] })}
                            className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                        >+ เพิ่ม</button>
                    </div>

                    <div className="space-y-2">
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                onClick={() => setSelectedCatId(cat.id)}
                                className={`p-3 rounded-lg cursor-pointer border-2 transition-all flex justify-between items-center ${selectedCatId === cat.id ? 'border-[#ff5722] bg-orange-50' : 'border-transparent hover:bg-gray-100'
                                    }`}
                            >
                                <div>
                                    <span className="font-bold text-[#5d4037] mr-2">[{cat.id}]</span>
                                    {cat.title}
                                    <div className="text-xs text-gray-400">
                                        {cat.questions.length} ข้อ | เต็ม {cat.questions.reduce((sum, q) => sum + q.maxScore, 0)} คะแนน
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat); }} className="text-gray-400 hover:text-blue-500">✎</button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="text-gray-400 hover:text-red-500">🗑</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Questions List */}
                <div className="w-full md:w-2/3 bg-white p-6 rounded-xl shadow-md min-h-[500px]">
                    {selectedCatId ? (
                        <>
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-[#3e2723]">
                                        หัวข้อการประเมิน: หมวด {categories.find(c => c.id === selectedCatId)?.title}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        คะแนนรวมหมวดนี้: <span className="font-bold text-[#ff5722]">{categories.find(c => c.id === selectedCatId)?.questions.reduce((a, b) => a + b.maxScore, 0)}</span> คะแนน
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingQuestion({ id: `${selectedCatId}-NEW`, title: '', maxScore: 5 })}
                                    className="bg-[#ff5722] text-white px-4 py-2 rounded-lg shadow hover:bg-[#e64a19]"
                                >
                                    + เพิ่มหัวข้อ
                                </button>
                            </div>

                            <div className="space-y-4">
                                {categories.find(c => c.id === selectedCatId)?.questions.map((q) => (
                                    <div key={q.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">{q.id}</span>
                                                    <h4 className="font-bold text-lg">{q.title}</h4>
                                                </div>
                                                <p className="text-gray-600 text-sm mt-1">{q.subtitle || '-'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-xs text-gray-400">เต็ม</span>
                                                <span className="text-xl font-bold text-green-600 min-w-[30px] inline-block text-right">{q.maxScore}</span>
                                            </div>
                                        </div>
                                        {q.isReadOnly && (
                                            <div className="mt-2 inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded border border-yellow-200 font-bold">
                                                🔒 Read Only (Imported Score)
                                            </div>
                                        )}
                                        <div className="mt-3 pt-3 border-t flex justify-end gap-3">
                                            <button onClick={() => setEditingQuestion(q)} className="text-sm text-blue-600 hover:underline">แก้ไข</button>
                                            <button onClick={() => deleteQuestion(q.id)} className="text-sm text-red-500 hover:underline">ลบ</button>
                                        </div>
                                    </div>
                                ))}
                                {categories.find(c => c.id === selectedCatId)?.questions.length === 0 && (
                                    <div className="text-center text-gray-400 py-10">ยังไม่มีหัวข้อประเมินในหมวดนี้</div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            ← กรุณาเลือกหมวดหมู่ทางซ้ายมือ
                        </div>
                    )}
                </div>
            </div>

            {/* --- Modal Edit Category --- */}
            {editingCat && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96 space-y-4">
                        <h3 className="font-bold text-lg">จัดการหมวดหมู่</h3>
                        <input className="border w-full p-2 rounded" placeholder="ID (เช่น A, B)" value={editingCat.id} onChange={e => setEditingCat({ ...editingCat, id: e.target.value })} disabled={categories.some(c => c.id === editingCat.id && c.id !== editingCat.id)} />
                        <input className="border w-full p-2 rounded" placeholder="ชื่อหมวดหมู่" value={editingCat.title} onChange={e => setEditingCat({ ...editingCat, title: e.target.value })} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingCat(null)} className="px-3 py-1 bg-gray-200 rounded">ยกเลิก</button>
                            <button onClick={saveCategory} className="px-3 py-1 bg-blue-600 text-white rounded">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modal Edit Question --- */}
            {editingQuestion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-[600px] space-y-4">
                        <h3 className="font-bold text-lg">จัดการหัวข้อประเมิน</h3>
                        <div className="flex gap-4">
                            <div className="w-1/4">
                                <label className="text-xs font-bold text-gray-500">รหัส (ID)</label>
                                <input className="border w-full p-2 rounded" value={editingQuestion.id} onChange={e => setEditingQuestion({ ...editingQuestion, id: e.target.value })} />
                            </div>
                            <div className="w-1/4">
                                <label className="text-xs font-bold text-gray-500">คะแนนเต็ม</label>
                                <input type="number" className="border w-full p-2 rounded font-bold text-green-600" value={editingQuestion.maxScore} onChange={e => setEditingQuestion({ ...editingQuestion, maxScore: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">หัวข้อ (Title)</label>
                            <input className="border w-full p-2 rounded" value={editingQuestion.title} onChange={e => setEditingQuestion({ ...editingQuestion, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">คำอธิบายย่อ (Subtitle)</label>
                            <input className="border w-full p-2 rounded" value={editingQuestion.subtitle || ''} onChange={e => setEditingQuestion({ ...editingQuestion, subtitle: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">รายละเอียดเกณฑ์ (Description)</label>
                            <textarea rows={4} className="border w-full p-2 rounded" value={editingQuestion.description || ''} onChange={e => setEditingQuestion({ ...editingQuestion, description: e.target.value })} placeholder="ก. ... ; ข. ..." />
                        </div>

                        {/* 🔥 New Option: Read Only */}
                        <div className="flex items-center gap-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                            <input
                                type="checkbox"
                                id="isReadOnly"
                                checked={editingQuestion.isReadOnly || false}
                                onChange={e => setEditingQuestion({ ...editingQuestion, isReadOnly: e.target.checked })}
                            />
                            <label htmlFor="isReadOnly" className="text-sm font-bold text-gray-700 cursor-pointer">
                                Read Only (แสดงคะแนนดิบ)
                            </label>
                        </div>
                        <p className="text-xs text-gray-500">* สำหรับหัวข้อที่นำเข้าคะแนนจาก Excel เท่านั้น (เช่น AI Score)</p>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingQuestion(null)} className="px-3 py-1 bg-gray-200 rounded">ยกเลิก</button>
                            <button onClick={saveQuestion} className="px-3 py-1 bg-blue-600 text-white rounded">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useModal } from '../../context/ModalContext'; // 🔥
import { calculateScores } from '../../utils/score-engine';
import { getGrade } from '../../utils/grade-calculation';

interface EmployeeEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string; // Document ID (doc.id)
    employeeName: string;
    onSaveSuccess: () => void;
    currentYear: number;
    isEvaluator?: boolean; // New prop from parent
}

export default function EmployeeEditModal({ isOpen, onClose, employeeId, employeeName, onSaveSuccess, currentYear, isEvaluator }: EmployeeEditModalProps) {
    const { showAlert } = useModal(); // 🔥
    const [activeTab, setActiveTab] = useState<'stats' | 'security'>('stats');
    const [loading, setLoading] = useState(false);
    const [employeeRole, setEmployeeRole] = useState<string>('User'); // Default to User

    // Stats Data
    const [stats, setStats] = useState<{
        totalLateMinutes: number | string;
        totalSickLeaveDays: number | string;
        totalAbsentDays: number | string;
        warningCount: number | string;
        aiScore: number | string;
    }>({
        totalLateMinutes: 0,
        totalSickLeaveDays: 0,
        totalAbsentDays: 0,
        warningCount: 0,
        aiScore: 0
    });

    const [dynamicScores, setDynamicScores] = useState<Record<string, number | string>>({});
    const [questionMap, setQuestionMap] = useState<Record<string, string>>({}); // Map ID -> Title

    // Security Data
    const [newPassword, setNewPassword] = useState('');
    const [username, setUsername] = useState(''); // New State for Username

    useEffect(() => {
        if (isOpen && employeeId) {
            fetchData();
        }
    }, [isOpen, employeeId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch evaluation categories for mapping
            const { collection, getDocs } = await import('firebase/firestore');
            const catsSnap = await getDocs(collection(db, 'evaluation_categories'));
            const qMap: Record<string, string> = {};
            catsSnap.forEach(doc => {
                const data = doc.data();
                if (data.questions) {
                    data.questions.forEach((q: any) => {
                        qMap[q.id] = q.title;
                    });
                }
            });
            setQuestionMap(qMap);

            // Fetch Yearly Stats
            const statsRef = doc(db, 'users', employeeId, 'yearlyStats', String(currentYear));
            const statsSnap = await getDoc(statsRef);

            // Fetch User Doc for Username/Password check (and fallback stats)
            const userDoc = await getDoc(doc(db, 'users', employeeId));
            const ud = userDoc.data();

            if (ud) {
                setEmployeeRole(ud.role || 'User'); // Set Role
            }

            if (statsSnap.exists()) {
                const data = statsSnap.data();

                // [Speckit T-Sync] Unify AI Score keys
                // Fix: Prioritize standard 'aiScore' if available. Fallback to legacy keys only if 'aiScore' is missing or 0.
                const legacyAiScore = data['[O]-1'] || data['[0]-1'] || data['O-1'] || 0;
                const finalAiScore = data.aiScore || legacyAiScore || 0;

                setStats({
                    totalLateMinutes: data.totalLateMinutes || 0,
                    totalSickLeaveDays: data.totalSickLeaveDays || 0,
                    totalAbsentDays: data.totalAbsentDays || 0,
                    warningCount: data.warningCount || 0,
                    aiScore: finalAiScore // Use unified score
                });

                // Extract Dynamic Scores
                // Filter out standard keys AND known AI Score aliases to avoid duplicate inputs
                const standardKeys = ['totalLateMinutes', 'totalSickLeaveDays', 'totalAbsentDays', 'warningCount', 'aiScore', 'year'];
                const aiAliases = ['[O]-1', '[0]-1', 'O-1', '0-1'];
                const extraScores: Record<string, number> = {};

                Object.keys(data).forEach(key => {
                    if (!standardKeys.includes(key) && !aiAliases.includes(key)) {
                        extraScores[key] = data[key];
                    }
                });
                setDynamicScores(extraScores);
            } else if (ud) {
                // ... fallback logic
                setStats({
                    totalLateMinutes: ud.totalLateMinutes || 0,
                    totalSickLeaveDays: ud.totalSickLeaveDays || 0,
                    totalAbsentDays: ud.totalAbsentDays || 0,
                    warningCount: ud.warningCount || 0,
                    aiScore: ud.aiScore || 0
                });
                setDynamicScores({});
            } else {
                setStats({
                    totalLateMinutes: 0,
                    totalSickLeaveDays: 0,
                    totalAbsentDays: 0,
                    warningCount: 0,
                    aiScore: 0
                });
                setDynamicScores({});
            }

            // Set Security Fields
            if (ud) {
                setUsername(ud.username || ud.employeeId || '');
            } else {
                setUsername('');
            }
            setNewPassword('');

        } catch (error) {
            console.error("Error fetching employee details:", error);
        } finally {
            setLoading(false);
        }
    };

    // Generic Input Handlers with Float Support
    const handleStatChange = (key: keyof typeof stats, value: string) => {
        // Allow empty string or regex for partial number inputs if needed
        setStats(prev => ({ ...prev, [key]: value }));
    };

    const handleStatBlur = (key: keyof typeof stats) => {
        setStats(prev => {
            const val = prev[key];
            const num = parseFloat(String(val));
            return {
                ...prev,
                [key]: isNaN(num) ? 0 : num
            };
        });
    };

    const handleDynamicScoreChange = (key: string, value: string) => {
        setDynamicScores(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleDynamicScoreBlur = (key: string) => {
        setDynamicScores(prev => {
            const val = prev[key];
            const num = parseFloat(String(val));
            return {
                ...prev,
                [key]: isNaN(num) ? 0 : num
            };
        });
    };

    // 🔥 Imports for Auto-Recalculation REMOVED (Moved to top)

    const handleSaveStats = async () => {
        setLoading(true);
        try {
            // Sanitize Data before Saving (Ensure numbers)
            // Sanitize Data before Saving (Ensure numbers)
            const sanitizedStats = {
                totalLateMinutes: Number(stats.totalLateMinutes) || 0,
                totalSickLeaveDays: Number(stats.totalSickLeaveDays) || 0,
                totalAbsentDays: Number(stats.totalAbsentDays) || 0,
                warningCount: Number(stats.warningCount) || 0,
                aiScore: Number(stats.aiScore) || 0,
                // '[O]-1': Number(stats.aiScore) || 0, // ❌ Error: Firestore keys cannot contain '[' or ']' 
            };

            const sanitizedDynamic: Record<string, number> = {};
            Object.keys(dynamicScores).forEach(k => {
                sanitizedDynamic[k] = Number(dynamicScores[k]) || 0;
            });

            // [Speckit Cleanup] Standardize on 'aiScore' ONLY.
            // We do NOT save 'O-1' or '[O]-1' to yearlyStats anymore to strictly follow the "One Variable" rule.

            // 1. Update Subcollection
            const statsRef = doc(db, 'users', employeeId, 'yearlyStats', String(currentYear));
            // Check existence to decide set(merge) vs update? set with merge is safest
            const { setDoc, collection, getDocs, query, where, orderBy } = await import('firebase/firestore');
            await setDoc(statsRef, { ...sanitizedStats, ...sanitizedDynamic, year: currentYear }, { merge: true });

            // 2. Update Main Doc (Always update main doc to reflect the current evaluation/stats in the list)
            const mainRef = doc(db, 'users', employeeId);
            await updateDoc(mainRef, sanitizedStats);

            // 🔥 3. Auto-Recalculate Existing Evaluation (if exists)
            // This ensures the "Evaluation" reflects the new stats immediately
            const evalPeriod = `${currentYear}-Annual`;
            const evalsRef = collection(db, 'evaluations');
            const qEval = query(
                evalsRef,
                where('employeeDocId', '==', employeeId),
                where('period', '==', evalPeriod)
            );
            const evalSnap = await getDocs(qEval);

            if (!evalSnap.empty) {
                const evalDoc = evalSnap.docs[0];
                const evalData = evalDoc.data();
                const evalScores = evalData.scores || {};

                // We need Categories and Rules for Calculation
                // A. Fetch Categories
                const catsRef = collection(db, 'evaluation_categories');
                const catsSnap = await getDocs(query(catsRef, orderBy('order', 'asc')));
                const categories: any[] = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // B. Fetch Scoring Formulas (Rules)
                const formulasRef = collection(db, 'scoring_formulas');
                const formulasSnap = await getDocs(formulasRef);
                const scoringRules: any[] = formulasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // C. Fetch Grade Criteria (needed for getGrade)
                const rulesRef = collection(db, 'config_grading_rules');
                const rulesSnap = await getDocs(query(rulesRef, orderBy('min', 'desc')));
                const gradeCriteria: any[] = rulesSnap.docs.map(d => d.data());

                const fullStats = { ...sanitizedStats, ...sanitizedDynamic, year: currentYear };

                // Fetch Employee Data for Context
                const empSnap = await getDoc(mainRef);
                const empData = empSnap.data() as any;

                // 🔥 SYNC AI SCORE TO EVALUATION SCORES
                // The formula likely uses [O]-1 or similar keys. We must update them.
                const newAiScore = sanitizedStats.aiScore;
                if (newAiScore !== undefined) {
                    // List of possible keys for AI Score
                    const aiKeys = ['[0]-1', '[O]-1', 'O-1', '0-1', 'aiScore'];
                    aiKeys.forEach(key => {
                        // Update if key exists OR if it's the standard O-1 key even if missing
                        // Actually, we should force update [O]-1 if we know that's the one.
                        // But let's be safe and update any that are found, plus ensure [O]-1 is set if it's the standard.
                        // Given user feedback "[O]-1 = 5", let's ensure [O]-1 matches aiScore.
                        if (key === '[O]-1' || key in evalScores) {
                            evalScores[key] = newAiScore;
                        }
                    });
                    // Force set [O]-1 just in case it wasn't there (Standard Key)
                    evalScores['[O]-1'] = newAiScore;
                }

                // Calculate
                const { disciplineScore, totalScore } = calculateScores(
                    fullStats as any,
                    evalScores,
                    scoringRules,
                    categories,
                    empData
                );

                // Determine Grade
                const numTotal = Number(totalScore);
                const newGrade = getGrade(numTotal, gradeCriteria);

                // Update Evaluation Doc
                await updateDoc(doc(db, 'evaluations', evalDoc.id), {
                    scores: evalScores, // 🔥 Save the updated scores map too!
                    disciplineScore,
                    totalScore: numTotal,
                    grade: newGrade,
                    aiScore: sanitizedStats.aiScore, // Sync AI Score root field
                    updatedAt: serverTimestamp()
                });
            }

            await showAlert("สำเร็จ", "✅ บันทึกข้อมูลและคำนวณคะแนนใหม่เรียบร้อย");
            onSaveSuccess();
        } catch (error) {
            console.error("Error saving stats:", error);
            await showAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSecurity = async () => {
        setLoading(true);
        try {
            const userRef = doc(db, 'users', employeeId);
            const updateData: any = {};

            if (username) updateData.username = username;
            if (newPassword) updateData.password = newPassword;

            if (Object.keys(updateData).length === 0) {
                setLoading(false);
                return;
            }

            await updateDoc(userRef, updateData);
            await showAlert("สำเร็จ", "✅ บันทึกข้อมูลความปลอดภัยเรียบร้อย");
            setNewPassword('');
            onClose(); // 🔥 Close modal after successful save
        } catch (error) {
            console.error("Error saving security settings:", error);
            await showAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Determine if Security Tab should be visible
    // Hide if role is 'user' (normal employee) UNLESS they are explicitly marked as Evaluator
    const showSecurityTab = employeeRole.toLowerCase() !== 'user' || !!isEvaluator;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            แก้ไขข้อมูลพนักงาน
                            {isEvaluator && (
                                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full border border-indigo-200">
                                    Evaluator
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-500">{employeeName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'stats' ? 'border-b-2 border-orange-600 text-orange-600 bg-orange-50' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('stats')}
                    >
                        📊 สถิติ/คะแนน (ปี {currentYear})
                    </button>
                    {showSecurityTab && (
                        <button
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'security' ? 'border-b-2 border-orange-600 text-orange-600 bg-orange-50' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('security')}
                        >
                            🔐 ตั้งรหัสผ่าน / ความปลอดภัย
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div></div>
                    ) : (
                        <>
                            {activeTab === 'stats' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">มาสาย (นาที)</label>
                                            <input
                                                type="number"
                                                value={stats.totalLateMinutes}
                                                onChange={e => handleStatChange('totalLateMinutes', e.target.value)}
                                                onBlur={() => handleStatBlur('totalLateMinutes')}
                                                onFocus={e => e.target.select()}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ใบเตือน (ครั้ง)</label>
                                            <input
                                                type="number"
                                                value={stats.warningCount}
                                                onChange={e => handleStatChange('warningCount', e.target.value)}
                                                onBlur={() => handleStatBlur('warningCount')}
                                                onFocus={e => e.target.select()}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ลาป่วย (วัน)</label>
                                            <input
                                                type="number" step="0.5"
                                                value={stats.totalSickLeaveDays}
                                                onChange={e => handleStatChange('totalSickLeaveDays', e.target.value)}
                                                onBlur={() => handleStatBlur('totalSickLeaveDays')}
                                                onFocus={e => e.target.select()}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ขาดงาน (วัน)</label>
                                            <input
                                                type="number" step="0.5"
                                                value={stats.totalAbsentDays}
                                                onChange={e => handleStatChange('totalAbsentDays', e.target.value)}
                                                onBlur={() => handleStatBlur('totalAbsentDays')}
                                                onFocus={e => e.target.select()}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2 border-t pt-4 mt-2">
                                            <h4 className="font-bold text-gray-800 mb-2 text-sm">คะแนนส่วนเพิ่ม (Additional Scores)</h4>

                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Combine Explicit AI Score + Dynamic Scores */}
                                                {/* If 'aiScore' exists in stats, render it first here treated as dynamic item */}
                                                {/* Note: 'aiScore' is inside stats object, so we manually include it if needed or check dynamicScores */}

                                                {/* Render 'aiScore' explicitly ONLY if it is not 0 (to avoid confusion) OR if user wants to see it. 
                                                    But user said [0]-1 IS AI Score. So we prioritize the map. 
                                                    If stats.aiScore is used, show it. If [0]-1 is used, show it with mapped name.
                                                */}

                                                {/* Loop through all dynamic scores including mapped keys */}
                                                {Object.entries(dynamicScores).map(([key, val]) => {
                                                    // Resolve Title
                                                    let title = key;
                                                    if (questionMap[key]) {
                                                        title = questionMap[key]; // Use mapped title (e.g. AI Score)
                                                    } else if (key === 'aiScore' || key === 'AI Score') {
                                                        title = 'AI Score';
                                                    } else {
                                                        title = key.replace(/_/g, ' ');
                                                    }

                                                    return (
                                                        <div key={key}>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize truncate" title={title}>
                                                                {title} <span className="text-gray-400 text-xs font-normal">({key})</span>
                                                            </label>
                                                            <input
                                                                type="number" step="0.1"
                                                                value={val}
                                                                onChange={e => handleDynamicScoreChange(key, e.target.value)}
                                                                onBlur={() => handleDynamicScoreBlur(key)}
                                                                onFocus={e => e.target.select()}
                                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50"
                                                            />
                                                        </div>
                                                    );
                                                })}

                                                {/* Always show AI Score (Manual) since we filtered loops */}
                                                {!dynamicScores['aiScore'] && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">AI Score ([O]-1)</label>
                                                        <input
                                                            type="number" step="0.1"
                                                            value={stats.aiScore}
                                                            onChange={e => handleStatChange('aiScore', e.target.value)}
                                                            onBlur={() => handleStatBlur('aiScore')}
                                                            onFocus={e => e.target.select()}
                                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-orange-50/30"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-400 mt-2">คะแนนเหล่านี้จะถูกนำไปรวมคำนวณเกรดตามสูตรที่กำหนด</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveStats}
                                        className="w-full mt-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
                                    >
                                        บันทึกการเปลี่ยนแปลง
                                    </button>
                                </div>
                            )}

                            {activeTab === 'security' && showSecurityTab && (
                                <div className="space-y-4">
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                                        ⚠️ <b>หมายเหตุ:</b><br />
                                        - <b>Username:</b> ใช้สำหรับ Login (ถ้าไม่ตั้ง จะใช้รหัสพนักงาน)<br />
                                        - <b>Password:</b> ค่าเริ่มต้นคือ "รหัสพนักงาน"
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                                        <input
                                            type="text"
                                            placeholder="Ex. admin, manager01"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่ (New Password)</label>
                                        <input
                                            type="text"
                                            placeholder="กรอกรหัสผ่านใหม่ (ว่างไว้ถ้าไม่เปลี่ยน)..."
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveSecurity}
                                        className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
                                    >
                                        บันทึกการตั้งค่า (Save Credentials)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

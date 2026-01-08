import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface EmployeeEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string; // Document ID (doc.id)
    employeeName: string;
    onSaveSuccess: () => void;
    currentYear: number;
}

export default function EmployeeEditModal({ isOpen, onClose, employeeId, employeeName, onSaveSuccess, currentYear }: EmployeeEditModalProps) {
    const [activeTab, setActiveTab] = useState<'stats' | 'security'>('stats');
    const [loading, setLoading] = useState(false);

    // Stats Data
    const [stats, setStats] = useState({
        totalLateMinutes: 0,
        totalSickLeaveDays: 0,
        totalAbsentDays: 0,
        warningCount: 0
    });

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
            // Fetch Yearly Stats
            const statsRef = doc(db, 'users', employeeId, 'yearlyStats', String(currentYear));
            const statsSnap = await getDoc(statsRef);

            // Fetch User Doc for Username/Password check (and fallback stats)
            const userDoc = await getDoc(doc(db, 'users', employeeId));
            const ud = userDoc.data();

            if (statsSnap.exists()) {
                const data = statsSnap.data();
                setStats({
                    totalLateMinutes: data.totalLateMinutes || 0,
                    totalSickLeaveDays: data.totalSickLeaveDays || 0,
                    totalAbsentDays: data.totalAbsentDays || 0,
                    warningCount: data.warningCount || 0
                });
            } else if (ud) {
                // If subcollection doesn't exist, try fetching from main doc as fallback or reset
                setStats({
                    totalLateMinutes: ud.totalLateMinutes || 0,
                    totalSickLeaveDays: ud.totalSickLeaveDays || 0,
                    totalAbsentDays: ud.totalAbsentDays || 0,
                    warningCount: ud.warningCount || 0
                });
            } else {
                // Reset stats if neither yearlyStats nor main user doc has them
                setStats({
                    totalLateMinutes: 0,
                    totalSickLeaveDays: 0,
                    totalAbsentDays: 0,
                    warningCount: 0
                });
            }

            // Set Security Fields
            if (ud) {
                setUsername(ud.username || employeeId || ''); // Default to employeeId if no custom username
            } else {
                setUsername(''); // Reset if no user doc
            }
            setNewPassword('');

        } catch (error) {
            console.error("Error fetching employee details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveStats = async () => {
        setLoading(true);
        try {
            // 1. Update Subcollection
            const statsRef = doc(db, 'users', employeeId, 'yearlyStats', String(currentYear));
            // Check existence to decide set(merge) vs update? set with merge is safest
            await import('firebase/firestore').then(mod => {
                mod.setDoc(statsRef, { ...stats, year: currentYear }, { merge: true });
            });

            // 2. Update Main Doc (for quick access if needed, though we primarily use yearlyStats now)
            // But to be consistent with import logic:
            if (currentYear === new Date().getFullYear()) {
                const mainRef = doc(db, 'users', employeeId);
                await updateDoc(mainRef, stats);
            }

            alert("✅ บันทึกข้อมูลสถิติเรียบร้อย");
            onSaveSuccess();
        } catch (error) {
            console.error("Error saving stats:", error);
            alert("เกิดข้อผิดพลาดในการบันทับึก");
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
            alert("✅ บันทึกข้อมูลความปลอดภัยเรียบร้อย");
            setNewPassword('');
        } catch (error) {
            console.error("Error saving security settings:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">แก้ไขข้อมูลพนักงาน</h3>
                        <p className="text-sm text-gray-500">{employeeName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'stats' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('stats')}
                    >
                        📊 สถิติขาด/ลา/มาสาย (ปี {currentYear})
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'security' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('security')}
                    >
                        🔐 ตั้งรหัสผ่าน / ความปลอดภัย
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
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
                                                onChange={e => setStats({ ...stats, totalLateMinutes: Number(e.target.value) })}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ใบเตือน (ครั้ง)</label>
                                            <input
                                                type="number"
                                                value={stats.warningCount}
                                                onChange={e => setStats({ ...stats, warningCount: Number(e.target.value) })}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ลาป่วย (วัน)</label>
                                            <input
                                                type="number" step="0.5"
                                                value={stats.totalSickLeaveDays}
                                                onChange={e => setStats({ ...stats, totalSickLeaveDays: Number(e.target.value) })}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ขาดงาน (วัน)</label>
                                            <input
                                                type="number" step="0.5"
                                                value={stats.totalAbsentDays}
                                                onChange={e => setStats({ ...stats, totalAbsentDays: Number(e.target.value) })}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveStats}
                                        className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                                    >
                                        บันทึกการเปลี่ยนแปลง
                                    </button>
                                </div>
                            )}

                            {activeTab === 'security' && (
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
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่ (New Password)</label>
                                        <input
                                            type="text"
                                            placeholder="กรอกรหัสผ่านใหม่ (ว่างไว้ถ้าไม่เปลี่ยน)..."
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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

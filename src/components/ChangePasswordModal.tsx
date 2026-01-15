import { useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useModal } from '../context/ModalContext';
import { Eye, EyeOff } from 'lucide-react';
import { signOut } from 'next-auth/react'; // 🔥 Import signOut

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
}

export default function ChangePasswordModal({ isOpen, onClose, employeeId }: ChangePasswordModalProps) {
    const { showAlert } = useModal();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            await showAlert('ข้อผิดพลาด', 'รหัสผ่านใหม่ไม่ตรงกัน (Passwords do not match)');
            return;
        }

        if (newPassword.length < 4) {
            await showAlert('ข้อผิดพลาด', 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
            return;
        }

        setLoading(true);
        try {
            const userRef = doc(db, 'users', employeeId);

            // Update Password directly without checking old password
            await updateDoc(userRef, {
                password: newPassword
            });

            await showAlert('สำเร็จ', '✅ เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่'); // Message updated

            // 🔥 Force Logout (Manual Redirect to avoid 0.0.0.0 issues)
            await signOut({ redirect: false });
            window.location.href = '/login';

            onClose();
            // Reset fields (though likely redirect happens first)
            setNewPassword('');
            setConfirmPassword('');

        } catch (error) {
            console.error(error);
            await showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        🔐 เปลี่ยนรหัสผ่าน (Change Password)
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-2xl font-light">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่ (New Password)</label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all pr-10"
                                placeholder="ระบุรหัสผ่านใหม่..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่ (Confirm New Password)</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all pr-10"
                                placeholder="ระบุรหัสผ่านใหม่อีกครั้ง..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 py-2.5 text-white rounded-lg font-medium shadow-md transition-all flex justify-center items-center gap-2
                                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-red-600 hover:shadow-lg transform active:scale-95'}`}
                        >
                            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            บันทึก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

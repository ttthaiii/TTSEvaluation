'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import ChangePasswordModal from './ChangePasswordModal';
import HelpModal from './HelpModal'; // 🔥 Import HelpModal
import { LogOut, User as UserIcon, LayoutDashboard, ClipboardList, Youtube } from 'lucide-react'; // 🔥 Import Youtube Icon
import { usePathname, useRouter } from 'next/navigation';
import { useModal } from '../context/ModalContext';

export default function Navbar() {
    const { data: session } = useSession();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false); // 🔥 Help Modal State

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.user-profile-dropdown')) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);
    const user = session?.user;
    const pathname = usePathname();
    const router = useRouter();
    const { navigationGuard } = useModal();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

    const handleNavigation = async (e: React.MouseEvent, href: string) => {
        if (pathname === href) {
            e.preventDefault();
            return;
        }

        if (navigationGuard) {
            e.preventDefault();
            const canNavigate = await navigationGuard();
            if (canNavigate) {
                router.push(href);
            }
        }
    };

    const NavItem = ({ href, icon: Icon, label, exact = false }: { href: string, icon: any, label: string, exact?: boolean }) => {
        const active = exact ? pathname === href : isActive(href);
        return (
            <Link
                href={href}
                onClick={(e) => handleNavigation(e, href)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:text-orange-600 hover:bg-slate-50'}`}
            >
                <Icon className={`w-4 h-4 ${active ? 'text-orange-600' : 'text-slate-400 group-hover:text-orange-600'}`} />
                <span>{label}</span>
            </Link>
        );
    };

    return (
        <>
            <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
                <div className="w-full px-4 h-16 flex justify-between items-center">
                    {/* Logo area */}
                    <div className="flex items-center gap-6">
                        {/* 🔥 Fixed: Logo now links to /dashboard instead of / */}
                        <Link
                            href="/dashboard"
                            onClick={(e) => handleNavigation(e, '/dashboard')}
                            className="flex items-center gap-2 group"
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src="/ttslogo1.png"
                                    alt="TTS Icon"
                                    className="h-10 w-auto object-contain"
                                />
                                <img
                                    src="/ttslogo2.png"
                                    alt="TTS Name"
                                    className="h-8 w-auto object-contain"
                                />
                            </div>
                        </Link>

                        {/* Main Navigation - Visible to logged in users */}
                        {user && (
                            <div className="hidden md:flex items-center space-x-1 ml-4 border-l border-gray-200 pl-4 h-8">
                                <NavItem href="/dashboard" icon={LayoutDashboard} label="ภาพรวม (Dashboard)" />
                                <NavItem href="/evaluations" icon={ClipboardList} label="แบบประเมิน (Evaluation)" />

                                {/* 🔥 Restored: Admin Dropdown Menu */}
                                {(user as any).role === 'Admin' && (
                                    <div className="relative group h-16 flex items-center ml-2">
                                        <button className={`flex items-center gap-1.5 font-medium transition px-2 py-1 rounded-md focus:outline-none ${isActive('/admin') || isActive('/employees') ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:text-orange-600'}`}>
                                            <span className="text-xl">⚙️</span>
                                            <span className="hidden lg:inline text-sm">ผู้ดูแลระบบ</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 mt-0.5 opacity-50 group-hover:rotate-180 transition-transform duration-200">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </button>

                                        <div className="absolute left-0 top-[90%] w-60 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50">
                                            <div className="p-1">
                                                <Link
                                                    href="/employees"
                                                    onClick={(e) => handleNavigation(e, '/employees')}
                                                    className="block px-3 py-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-800 transition-colors"
                                                >
                                                    <div className="font-semibold text-sm">👥 จัดการพนักงาน</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">รายชื่อและข้อมูลพนักงาน</div>
                                                </Link>
                                                <Link
                                                    href="/admin/criteria"
                                                    onClick={(e) => handleNavigation(e, '/admin/criteria')}
                                                    className="block px-3 py-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-800 transition-colors"
                                                >
                                                    <div className="font-semibold text-sm">📝 จัดการแบบประเมิน</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">เพิ่ม/ลบ หัวข้อคำถาม</div>
                                                </Link>
                                                <Link
                                                    href="/admin/scoring"
                                                    onClick={(e) => handleNavigation(e, '/admin/scoring')}
                                                    className="block px-3 py-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-800 transition-colors"
                                                >
                                                    <div className="font-semibold text-sm">🧮 ตั้งค่าสูตรคำนวณ</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">Scoring Rules & Variables</div>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Side: User Profile & Dropdown */}
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="relative user-profile-dropdown">
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                                >
                                    <div className="text-right hidden sm:block">
                                        <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                                        <div className="text-xs text-slate-500">{(user as any).employeeId} | {(user as any).role || 'User'}</div>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shadow-sm">
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                </button>

                                {isProfileOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-down origin-top-right">
                                        <div className="p-2 border-b border-gray-100 sm:hidden">
                                            <div className="text-sm font-semibold text-slate-800 px-3">{user.name}</div>
                                            <div className="text-xs text-slate-500 px-3 pb-2">{(user as any).employeeId}</div>
                                        </div>
                                        <div className="p-1">
                                            {/* 1. Change Password */}
                                            <button
                                                onClick={() => {
                                                    setIsProfileOpen(false);
                                                    setIsPasswordModalOpen(true);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-700 transition-colors text-left"
                                            >
                                                <div className="p-1.5 bg-orange-100 rounded-md text-orange-600">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm font-medium">เปลี่ยนรหัสผ่าน</span>
                                            </button>

                                            {/* 2. Help / Video Manual */}
                                            <button
                                                onClick={() => {
                                                    setIsProfileOpen(false);
                                                    setIsHelpModalOpen(true);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors text-left"
                                            >
                                                <div className="p-1.5 bg-blue-100 rounded-md text-blue-600">
                                                    <Youtube className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">ดูวิดีโอ / คู่มือการใช้งาน</span>
                                            </button>

                                            <div className="my-1 border-t border-gray-100"></div>

                                            {/* 3. Logout */}
                                            <button
                                                onClick={async (e) => {
                                                    if (navigationGuard) {
                                                        const canExit = await navigationGuard();
                                                        if (!canExit) return;
                                                    }
                                                    await signOut({ redirect: false });
                                                    window.location.href = '/login';
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-50 text-slate-700 hover:text-red-700 transition-colors text-left"
                                            >
                                                <div className="p-1.5 bg-red-100 rounded-md text-red-600">
                                                    <LogOut className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">ออกจากระบบ</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/login" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                                เข้าสู่ระบบ
                            </Link>
                        )}
                    </div>
                </div>
            </nav>
            {user && (
                <>
                    <ChangePasswordModal
                        isOpen={isPasswordModalOpen}
                        onClose={() => setIsPasswordModalOpen(false)}
                        employeeId={(user as any).id}
                    />
                    <HelpModal
                        isOpen={isHelpModalOpen}
                        onClose={() => setIsHelpModalOpen(false)}
                    />
                </>
            )}
        </>
    );
}

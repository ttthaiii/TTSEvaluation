'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User as UserIcon, LayoutDashboard, ClipboardList } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { data: session } = useSession();
    const user = session?.user;
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

    const NavItem = ({ href, icon: Icon, label, exact = false }: { href: string, icon: any, label: string, exact?: boolean }) => {
        const active = exact ? pathname === href : isActive(href);
        return (
            <Link href={href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:text-orange-600 hover:bg-slate-50'}`}>
                <Icon className={`w-4 h-4 ${active ? 'text-orange-600' : 'text-slate-400 group-hover:text-orange-600'}`} />
                <span>{label}</span>
            </Link>
        );
    };

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex justify-between items-center">
                {/* Logo area */}
                <div className="flex items-center gap-6">
                    {/* 🔥 Fixed: Logo now links to /dashboard instead of / */}
                    <Link href="/dashboard" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md group-hover:shadow-orange-200 transition-all">
                            Ex
                        </div>
                        <span className="font-bold text-lg text-slate-800 tracking-tight group-hover:text-orange-600 transition-colors hidden sm:inline">
                            ระบบประเมิน
                        </span>
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
                                            <Link href="/employees" className="block px-3 py-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-800 transition-colors">
                                                <div className="font-semibold text-sm">👥 จัดการพนักงาน</div>
                                                <div className="text-xs text-slate-400 mt-0.5">รายชื่อและข้อมูลพนักงาน</div>
                                            </Link>
                                            <Link href="/admin/criteria" className="block px-3 py-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-800 transition-colors">
                                                <div className="font-semibold text-sm">📝 จัดการแบบประเมิน</div>
                                                <div className="text-xs text-slate-400 mt-0.5">เพิ่ม/ลบ หัวข้อคำถาม</div>
                                            </Link>
                                            <Link href="/admin/scoring" className="block px-3 py-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-800 transition-colors">
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

                {/* Right Side: User Profile & Logout */}
                <div className="flex items-center space-x-4">
                    {user ? (
                        <>
                            <div className="flex items-center gap-3 mr-2">
                                <div className="text-right hidden sm:block">
                                    <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                                    <div className="text-xs text-slate-500">{(user as any).employeeId} | {(user as any).role || 'User'}</div>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">ออกจากระบบ</span>
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                            เข้าสู่ระบบ
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}

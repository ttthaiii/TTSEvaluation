'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardList, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function MobileNavbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user;

    if (!user) return null;

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

    const NavItem = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
        const active = isActive(href);
        return (
            <Link
                href={href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${active ? 'text-orange-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
                <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-medium">{label}</span>
            </Link>
        );
    };

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 shadow-[0_-1px_10px_rgba(0,0,0,0.05)] md:hidden">
            <div className={`grid h-full max-w-lg mx-auto font-medium ${(user as any).role === 'Admin' ? 'grid-cols-4' : 'grid-cols-2'}`}>
                <NavItem href="/dashboard" icon={LayoutDashboard} label="ภาพรวม" />

                {(user as any).role === 'Admin' && (
                    <NavItem href="/employees" icon={Users} label="พนักงาน" />
                )}

                <NavItem href="/evaluations" icon={ClipboardList} label="ประเมิน" />

                {(user as any).role === 'Admin' && (
                    <NavItem href="/admin/criteria" icon={Settings} label="ตั้งค่า" />
                )}
            </div>
        </div>
    );
}

// src/app/layout.tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-ibm-thai",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ระบบประเมินพนักงาน 2025",
  description: "Employee Evaluation System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSansThai.variable} font-sans antialiased bg-[#fafafa] text-slate-900`}
      >
        {/* --- Navbar (Glassmorphism) --- */}
        <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex justify-between items-center">
            {/* Logo area */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md group-hover:shadow-orange-200 transition-all">
                  Example
                </div>
                <span className="font-bold text-lg text-slate-800 tracking-tight group-hover:text-orange-600 transition-colors">
                  ระบบประเมิน
                </span>
              </Link>
            </div>

            {/* Menu Items */}
            <div className="flex items-center space-x-1 md:space-x-6">

              {/* Dropdown Menu: ผู้ดูแลระบบ */}
              <div className="relative group h-16 flex items-center">
                <button className="flex items-center gap-1.5 text-slate-600 font-medium hover:text-orange-600 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-100">
                  <span className="text-xl">⚙️</span>
                  <span className="hidden md:inline">ผู้ดูแลระบบ</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 mt-0.5 opacity-50 group-hover:rotate-180 transition-transform duration-200">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Dropdown Content */}
                <div className="absolute right-0 top-[90%] w-60 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
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

              <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

              <Link href="/evaluations" className="bg-slate-900 text-white px-5 py-2 rounded-full font-medium shadow-lg shadow-slate-200 hover:bg-orange-600 hover:shadow-orange-200 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
                <span>✍️</span>
                <span>ทำแบบประเมิน</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Spacer for Fixed Navbar */}
        <div className="h-16"></div>

        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </body>
    </html>
  );
}
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link"; // อย่าลืม import Link
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f5f5f5]`}
      >
        {/* --- ส่วน Navbar (เพิ่มใหม่) --- */}
        <nav className="bg-[#5d4037] text-white p-4 shadow-md">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Link href="/" className="font-bold text-xl hover:text-gray-200">
              🏠 ระบบประเมิน
            </Link>
            <div className="flex items-center space-x-4">

              {/* Dropdown Menu: ผู้ดูแลระบบ */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-[#ffccbc] transition focus:outline-none">
                  ⚙️ ผู้ดูแลระบบ (Admin)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {/* Dropdown Content */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl text-[#3e2723] overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                  <Link href="/employees" className="block px-4 py-3 hover:bg-orange-50 border-b border-gray-100">
                    👥 จัดการพนักงาน
                    <span className="block text-xs text-gray-500 font-normal">รายชื่อและข้อมูลพนักงาน</span>
                  </Link>
                  <Link href="/admin/criteria" className="block px-4 py-3 hover:bg-orange-50 border-b border-gray-100">
                    📝 จัดการแบบประเมิน
                    <span className="block text-xs text-gray-500 font-normal">เพิ่ม/ลบ หัวข้อคำถาม</span>
                  </Link>
                  <Link href="/admin/scoring" className="block px-4 py-3 hover:bg-orange-50">
                    🧮 ตั้งค่าสูตรคำนวณ
                    <span className="block text-xs text-gray-500 font-normal">Define Scoring Rules</span>
                  </Link>
                </div>
              </div>

              <Link href="/evaluations" className="bg-[#ff5722] px-4 py-2 rounded hover:bg-[#f4511e] transition ml-2">
                ทำแบบประเมิน
              </Link>
            </div>
          </div>
        </nav>
        {/* ----------------------------- */}

        {children}
      </body>
    </html>
  );
}
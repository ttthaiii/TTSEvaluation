// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-4xl font-bold mb-12 text-[#5d4037]">ระบบประเมินพนักงาน 2025</h1>
      
      <div className="flex flex-col gap-6 items-center">
        {/* กลุ่มปุ่มหลัก */}
        <div className="flex gap-6">
          {/* ปุ่มไปหน้ารายชื่อพนักงาน */}
          <Link 
            href="/employees" 
            className="px-8 py-4 bg-white text-[#5d4037] border-2 border-[#5d4037] rounded-xl hover:bg-[#efebe9] transition font-semibold text-lg shadow-sm"
          >
            📋 รายชื่อพนักงาน
          </Link>

          {/* ปุ่มไปหน้าแบบประเมิน */}
          <Link 
            href="/evaluations" 
            className="px-8 py-4 bg-[#ff5722] text-white rounded-xl hover:bg-[#f4511e] transition font-semibold text-lg shadow-md"
          >
            ✍️ ทำแบบประเมิน
          </Link>
        </div>

        {/* 👇 เพิ่มปุ่ม Admin แยกออกมาด้านล่าง หรือจะวางเรียงกันก็ได้ครับ */}
        <Link 
          href="/admin/scoring" 
          className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium text-base shadow-sm flex items-center gap-2"
        >
          ⚙️ ตั้งค่าเกณฑ์การให้คะแนน (Admin)
        </Link>
      </div>
    </div>
  );
}
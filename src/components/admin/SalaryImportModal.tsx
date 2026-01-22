'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { FileUp, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface SalaryRow {
    EmployeeID: string;
    CurrentSalary: number;
    [key: string]: any;
}

export default function SalaryImportModal({ isOpen, onClose, onSuccess }: Props) {
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Download Template (ดาวน์โหลดแบบฟอร์ม Excel)
    const handleDownloadTemplate = () => {
        const rows = [
            { EmployeeID: 'EMP001', Name: 'Example Name', CurrentSalary: 25000 },
            { EmployeeID: 'EMP002', Name: 'John Doe', CurrentSalary: 30000 },
        ];

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

        XLSX.writeFile(workbook, "employee_salary_template.xlsx");
    };

    // Handle File Upload (อัปโหลดข้อมูลเงินเดือน)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setLogs([]);
        setError(null);
        const newLogs: string[] = [];

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<SalaryRow>(worksheet);

            if (jsonData.length === 0) {
                throw new Error("No data found in Excel file");
            }

            newLogs.push(`Found ${jsonData.length} rows in Excel.`);
            setLogs(prev => [...prev, ...newLogs]);

            // Firestore Batch Update
            const batch = writeBatch(db);
            const usersRef = collection(db, 'users'); // Corrected collection name
            let updatedCount = 0;
            let missingCount = 0;

            // Process each row
            for (const row of jsonData) {
                const empId = row.EmployeeID; // Must match 'employeeId' field
                const salary = Number(row.CurrentSalary);

                if (!empId || isNaN(salary)) {
                    newLogs.push(`Skipping invalid row: ${JSON.stringify(row)}`);
                    continue;
                }

                // Query by EmployeeID
                // Note: Ensure your Firestore 'users' collection has 'employeeId' field indexed if large
                const q = query(usersRef, where("employeeId", "==", String(empId).trim()));
                const snap = await getDocs(q);

                if (snap.empty) {
                    missingCount++;
                    newLogs.push(`⚠ Employee ID not found: ${empId}`);
                } else {
                    snap.forEach(docSnap => {
                        batch.update(docSnap.ref, { baseSalary: salary });
                        updatedCount++;
                    });
                }
            }

            if (updatedCount > 0) {
                await batch.commit();
                newLogs.push(`✅ Successfully updated ${updatedCount} employees.`);
                alert(`นำเข้าสำเร็จ! อัปเดตเงินเดือน ${updatedCount} คน`);
                onSuccess();
                onClose();
            } else {
                newLogs.push("No matching employees found to update.");
                if (missingCount > 0) setError("Some Employee IDs were not found in the system.");
            }

            setLogs(prev => [...prev, ...newLogs]);

        } catch (err) {
            console.error("Import failed", err);
            setError("เกิดข้อผิดพลาดในการอ่านไฟล์: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileUp className="w-5 h-5 text-blue-600" />
                        นำเข้าฐานเงินเดือน (Excel)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Step 1: Download Template */}
                    <div className="space-y-2">
                        <div className="text-sm font-semibold text-slate-700">1. ดาวน์โหลดแบบฟอร์ม</div>
                        <button
                            onClick={handleDownloadTemplate}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium"
                        >
                            <Download className="w-5 h-5" />
                            Download Template (.xlsx)
                        </button>
                        <p className="text-xs text-slate-400 px-1">
                            *กรุณากรอกรหัสพนักงาน (EmployeeID) และเงินเดือนปัจจุบัน (CurrentSalary) ให้ถูกต้อง
                        </p>
                    </div>

                    <div className="border-t border-slate-100"></div>

                    {/* Step 2: Upload */}
                    <div className="space-y-2">
                        <div className="text-sm font-semibold text-slate-700">2. อัปโหลดไฟล์ Excel</div>
                        <label className="block w-full cursor-pointer relative group">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 bg-blue-50 border-2 border-dashed border-blue-200 text-blue-600 rounded-xl group-hover:bg-blue-100 group-hover:border-blue-300 transition-colors">
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <span className="font-semibold">กำลังประมวลผล...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileUp className="w-8 h-8" />
                                        <span className="font-semibold">คลิกเพื่อเลือกไฟล์ (Excel)</span>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Logs / Errors */}
                    {(logs.length > 0 || error) && (
                        <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono max-h-40 overflow-y-auto border border-slate-200">
                            {error && (
                                <div className="text-red-500 font-bold mb-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {error}
                                </div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className="text-slate-600 py-0.5 border-b border-slate-100 last:border-0">
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

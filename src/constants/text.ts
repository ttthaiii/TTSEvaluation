export const UI_TEXT = {
    WAITING: 'รอประเมิน',
    WAITING_DESC: 'ยังไม่ได้รับการประเมิน',
    MANAGE_EMPLOYEES: 'จัดการพนักงาน',
    DASHBOARD_TITLE: 'ภาพรวมผลการประเมินพนักงาน',
    EVAL_YEAR_LABEL: 'ประจำปี',
    SEARCH_PLACEHOLDER: 'ค้นหาชื่อ หรือ รหัส...',
    SECTION_LABEL: 'สังกัด / แผนก',
    RESET_FILTER: 'รีเซ็ต',
    EXPORT_EXCEL: 'ส่งออกผลประเมิน (Excel)',
    IMPORT_DATA: 'นำเข้าข้อมูล (Excel)',
    COMPARE_MODE: 'เปรียบเทียบปี',
    SELECT_YEAR: 'เลือกปี',
    SHOW_EVALUATORS_ONLY: 'แสดงเฉพาะรายชื่อผู้ประเมิน',
    NO_DATA: 'ไม่พบข้อมูลที่ค้นหา'
} as const;

export const ERROR_MESSAGES = {
    FETCH_FAILED: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
    SAVE_FAILED: 'บันทึกข้อมูลไม่สำเร็จ',
    NO_DATA_TO_EXPORT: 'ไม่พบข้อมูลสำหรับส่งออก',
    IMPORT_ERROR: 'เกิดข้อผิดพลาดในการอ่านไฟล์',
    NO_TABLE_FOUND: 'ไม่พบตารางข้อมูลในไฟล์นี้'
} as const;

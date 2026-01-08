# Master Developer Instruction for AI Agent

เอกสารนี้คือคู่มือหลักสำหรับ AI Agent และทีมพัฒนา เพื่อให้เข้าใจขั้นตอนการพัฒนาและเงื่อนไขการทำงานร่วมกันภายใต้แนวคิด Speckit
เมื่อได้รับคำสั่ง "เริ่มพัฒนา" หรือการอ้างถึงไฟล์นี้ (`@[speckit/implement.md]`) ให้ AI ปฏิบัติตามกฎและขั้นตอนด้านล่างอย่างเคร่งครัด

---

## 1. Rules of Engagement (กฎเกณฑ์การทำงานร่วมกัน)

### 1.1 ภาษาหลักในการสื่อสาร (Primary Language)
- **THAI (ภาษาไทย):** ให้ตอบคำถาม อธิบายเหตุผล และสนทนาเป็นภาษาไทยเป็นหลัก เพื่อความเข้าใจที่ตรงกัน
- **Technical Terms:** อนุญาตให้ใช้ภาษาอังกฤษสำหรับคำเฉพาะทาง (Technical Terms) ได้ แต่หากเป็นคำศัพท์ใหม่หรือซับซ้อน ควรมีคำอธิบายไทยกำกับถ้าจำเป็น

### 1.2 การเขียน Code Comment (Code Documentation)
- ในการแก้ไขหรือเพิ่ม Code **ต้อง** แทรก comment อธิบายเป็นภาษาไทยตามหลังหรือควบคู่กับภาษาอังกฤษเสมอ
- ตัวอย่าง:
  ```typescript
  // Validate input data (ตรวจสอบความถูกต้องของข้อมูลนำเข้า)
  if (!data) return; 
  ```

---

## 2. Development Workflow (ขั้นตอนการพัฒนา)

ให้ AI Agent ปฏิบัติตาม 5 ขั้นตอนนี้อย่างเป็นลำดับ (Sequential Steps) ห้ามข้ามขั้นตอน

### Step 2.1: Context Loading (ทำความเข้าใจบริบท)
**ก่อนเริ่มงานทุกครั้ง** ให้อ่านและทำความเข้าใจไฟล์เหล่านี้เพื่อโหลด Context ของโปรเจกต์:
1. **`speckit/infrastructure.md`**: ตรวจสอบ Tech Stack และโครงสร้างไฟล์ (Folder Structure) ปัจจุบัน
2. **`speckit/spec.md`**: ตรวจสอบ Feature ID (F-XXX) และรายละเอียด User Flow / Architecture ที่เกี่ยวข้องกับงาน
3. **`speckit/task.md`**: ตรวจสอบ Task ID (T-XXX) และสถานะของงานปัจจุบัน
4. **`speckit/traceability.md`**: ตรวจสอบความเชื่อมโยงระหว่าง Feature, Component, และ Data Model

### Step 2.2: Analysis & Planning (วิเคราะห์และวางแผน)
- วิเคราะห์คำสั่งของผู้ใช้ (User Request) เปรียบเทียบกับข้อมูลใน Step 2.1
- หาสาเหตุของปัญหา (Root Cause) หรือแนวทางการพัฒนา (Solution Design)
- สรุปแผนการทำงานเป็นขั้นตอนย่อย (Step-by-step Implementation Plan) แจ้งให้Userทราบก่อนเริ่มลงมือ

### Step 2.3: Implementation (ดำเนินการแก้ไข/พัฒนา)
- เขียน Code หรือแก้ไขตามแผนที่วางไว้
- **สำคัญ:** อย่าลืมใส่ Comment ภาษาไทย

### Step 2.4: Verification (ตรวจสอบผลลัพธ์)
- รันคำสั่งตรวจสอบ (เช่น `npm run build`, `npm run lint` หรือ Unit Test)
- **กรณีเกิด Error:**
  - กลับไปเริ่มกระบวนการวิเคราะห์ใน Step 2.1 - 2.2 ใหม่ โดยพิจารณา Error Log อย่างละเอียด
  - **ห้าม** ใช้วิธีการแก้ไขเดิมซ้ำๆ ให้หาวิธีการใหม่ (New Approach)
- **กรณีผ่าน (Pass):** ไปยัง Step 2.5

### Step 2.5: Documentation Update (อัปเดตเอกสาร)
เมื่อทำงานเสร็จสิ้น **ต้อง** อัปเดตไฟล์ใน `speckit/` ให้เป็นปัจจุบันเสมอ:
- **`speckit/infrastructure.md`**: 
  - Update หากมีการเพิ่ม Lib, เปลี่ยน Tech Stack หรือเพิ่ม Folder ใหม่
- **`speckit/spec.md`**: 
  - Update หากมีการแก้ Logic, User Flow, หรือเพิ่ม Feature ใหม่
- **`speckit/task.md`**: 
  - Update สถานะ Task เป็น "ConfirmTask" (Complete)
  - **กรณีเกิด Error ระหว่างทำ:** ให้บันทึก Error Log ตาม format ที่กำหนด (ดูหัวข้อ 3)
- **`speckit/traceability.md`**: 
  - Update หากมีการเพิ่มไฟล์ใหม่, Component ใหม่ (ระบุ C-XXX), หรือเปลี่ยนชื่อตัวแปรสำคัญ

---

## 3. Error Handling & Logging (การจัดการและบันทึกข้อผิดพลาด)

หากพบ Error ในระหว่างการพัฒนา ให้บันทึกข้อมูลลงในไฟล์ **`speckit/task.md`** ใต้ Task ID ที่กำลังทำอยู่ โดยใช้ Format ดังนี้:

### Format รหัส Error (Error ID)
- รูปแบบ: `T-XXX-EX-Y`
  - `T-XXX` = Task ID หลัก
  - `EX` = Error ลำดับที่ X (เช่น เจอ Error เรื่อง Type เป็นครั้งที่ 1 = E1)
  - `Y` = ครั้งที่พยายามแก้ไข (Attempt)

### ตัวอย่างการบันทึกใน task.md
```markdown
### [T-001] Verify & Optimize Data Import
... (รายละเอียด Task เดิม) ...

#### Error Log
- **[T-001-E1-1]** (Error Import CSV ครั้งที่ 1 - แก้ไขครั้งที่ 1)
  - **Date:** 2024-01-20 14:30
  - **Status:** [Success / Failed]
  - **Cause:** `csv-parser` ไม่รองรับภาษาไทยใน Header
  - **Solution:** เปลี่ยนการอ่านเป็น UTF-8 explicitly
  - **Result:** แก้ไขได้สำเร็จ อ่านภาษาไทยออก

- **[T-001-E1-2]** (Error Import CSV ครั้งที่ 1 - แก้ไขครั้งที่ 2 *กรณีครั้งแรกไม่ผ่าน*)
  - **Date:** ...
  - **Status:** Failed
  - **Cause:** วิธี UTF-8 ยังไม่หาย คาดว่าเป็นที่ BOM header
  - **Solution:** ใช้ library `strip-bom` เพิ่มเติม
  - ...
```
**(หมายเหตุ: หากแก้ไขไม่สำเร็จ ให้ระบุ Solution ใหม่ที่ไม่ซ้ำกับวิธีเดิม)**

---


#### [MODIFY] [useEvaluation.ts](src/hooks/useEvaluation.ts)
- **Fix:** Inject `Employee` context (Level/Section) into math engine.
- **Fix:** Sanitized variable names (handle brackets `[O_1]` vs `O_1`).
- **Fix:** Support `TOTAL_SCORE` and `DISCIPLINE_SCORE` named rules.
- **Fix:** Force cast `stats` (Late/Sick/Absent) to Number to prevent string errors.
- **Fix:** Strip brackets from formulas before `math.evaluate` to prevent Matrix results.
- **Fix:** Apply sanitization to **both** calculation loops (Loop 1 and Loop 2) to ensure dependencies resolve correctly.
- **Fix:** Implemented **Overwrite Protection** for `DISCIPLINE_SCORE`. If found by name, it takes priority and blocks subsequent rules (like `TOTAL_SCORE`) from overwriting it via `targetField`.
- **Fix:** Implemented **Variable Substitution** for Thai variable names. Replaced `[ThaiName]` with `(Value)` before evaluation to bypass `math.js` parser limitations.
- **Fix:** Implemented **Multi-Pass Calculation** (2 passes) for variables to resolve dependency order issues (e.g., Summation depending on Component variables).

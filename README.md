# Duangjai Studio Website

ยินดีต้อนรับสู่โปรเจกต์เว็บไซต์ **Duangjai Studio** ที่ย้ายมายังบ้านใหม่ใน `Documents/Website/duangjaistudio`

## วิธีใช้งานเบื้องต้น

### 1. การรันเว็บไซต์บนเครื่อง (Local Server)
คุณสามารถรันเว็บไซต์เพื่อดูตัวอย่างได้ง่ายๆ ผ่าน 2 วิธี:
- **วิธีที่ 1 (แนะนำ):** เปิด Terminal ในโฟลเดอร์นี้แล้วพิมพ์ `npm start`
- **วิธีที่ 2:** พิมพ์ `node start_server.js`

เมื่อรันแล้ว สามารถเข้าดูเว็บได้ที่: `http://localhost:8082`

### 2. การแก้ไขเนื้อหา
เว็บไซต์นี้ถูกออกแบบมาให้แก้ไขเนื้อหาได้ง่ายผ่านไฟล์ JSON ในโฟลเดอร์ `content/` และ `data/` โดยไม่ต้องแก้โค้ด HTML:
- **บทความ (Stories):** แก้ไขที่ `content/posts.json`
- **กิจกรรม (Activities):** แก้ไขที่ `content/activities.json`
- **รายชื่อนักเรียน (Students):** แก้ไขที่ `content/students.json`
- **บรรยากาศ & คำนิยม:** แก้ไขที่ `data/atmosphere.json` และ `data/testimonials.json`

*อ่านคู่มือฉบับเต็มได้ที่ [GUIDE_CONTENT.md](./GUIDE_CONTENT.md)*

## โครงสร้างโปรเจกต์
- `/assets`: ไฟล์ไอคอน โลโก้ และฟอนต์
- `/content`: เนื้อหาบทความ รูปภาพประกอบ และไฟล์ JSON
- `/data`: ข้อมูลระบบเสริม (บรรยากาศ, รีวิว)
- `/images`: รูปภาพส่วนกลางของเว็บไซต์
- `/js`: ไฟล์ JavaScript หลัก (`main.js`)
- `styles.css`: ไฟล์สไตล์หลักของเว็บ
- `index.html`: หน้าแรกของเว็บไซต์

---
*หากมีคำถามหรือต้องการให้ช่วยตั้งค่าอะไรเพิ่มเติม บอก Antigravity ได้เลยครับ!*

# 🛡️ CleanVideo

> **Watch the video, not the ads.**  
> เครื่องมือจัดการโฆษณาวิดีโอบนเว็บไซต์ ข้ามโฆษณาอัตโนมัติ (ภาษาไทยและอังกฤษ), ปิด Popup กวนใจ, เคลียร์ Transparent Click-Trap และป้องกัน Redirect แท็บใหม่ สำหรับ **Mobile Safari (iOS: iPhone / iPad)** และ Desktop Browsers (Chrome / Chromium / Safari)

---

## ✨ คุณสมบัติหลัก (Key Features)

- ⏩ **Auto-Skip Video Ads:** ตรวจจับและกดปุ่ม *"ข้ามโฆษณา"*, *"ข้าม"*, *"Skip Ad"*, *"Skip"* โดยอัตโนมัติ พร้อมรองรับตัวตรวจจับเฉพาะสำหรับ YouTube, Dailymotion และเว็บสตรีมมิ่งทั่วไป
- 🪟 **Auto-Close Popups & Modals:** ตรวจจับหน้าต่าง Popup และ Banner โฆษณาที่บังหน้าจอ พร้อมกดปุ่มปิด (`Close`, `Dismiss`, `ปิด`, `×`) ให้อัตโนมัติ และคืนค่า scrolling ของหน้าเว็บ
- 🕸️ **Transparent Overlay Cleaner:** ปลดล็อกเลเยอร์โปร่งใสดักคลิก (Click-Traps) เหนือตัวเล่นวิดีโอ เพื่อให้ผู้ใช้แตะปุ่ม Play / Fullscreen ได้โดยตรงโดยไม่ถูกพาไปยังเว็บพนันหรือสแปม
- 🚫 **Redirect & Popunder Guard:** ดักจับคำสั่ง `window.open` และการเปิดแท็บใหม่ที่ไม่พึงประสงค์
- 📱 **Mobile Touch Draggable HUD:** เม็ดแคปซูลควบคุมแบบลอย (Floating Pill) บน Safari มือถือ แตะเพื่อเปิดแผงตั้งค่า ปิดการทำงานชั่วคราว ยกเว้นเว็บไซต์ (Whitelist) และดูสถิติได้แบบเรียลไทม์

---

## 📱 วิธีติดตั้งบน Safari บน iPhone / iPad

คุณสามารถติดตั้งใช้งานบน Safari ของ iOS ได้ทันที โดยไม่ต้องใช้เครื่อง Mac หรือสมัคร Apple Developer:

1. ติดตั้งแอปฟรี **[Userscripts for Safari](https://apps.apple.com/app/userscripts/id1463298887)** หรือ **Stay** จาก iOS App Store
2. ไปที่ **Settings (การตั้งค่า)** ของเครื่อง iPhone/iPad > **Safari** > **Extensions (ส่วนขยาย)** > เปิดใช้งาน **Userscripts** และอนุญาตการเข้าถึงเว็บไซต์
3. เปิด Safari แตะที่ไอคอนส่วนขยาย Userscripts บนแถบที่อยู่ แล้วเลือกเพิ่มสคริปต์ใหม่
4. นำโค้ดจากไฟล์ [`dist/cleanvideo.user.js`](dist/cleanvideo.user.js) ไปวางแล้วกด **Save**
5. เปิดเข้าเว็บดูวิดีโอที่ต้องการ CleanVideo จะเริ่มทำงานและแสดงปุ่มลอยสีเขียว `🟢 CleanVideo` ทันที!

---

## 💻 วิธีติดตั้งบน Desktop (Chrome / Chromium / Brave / Edge)

1. เปิดเบราว์เซอร์ไปที่ `chrome://extensions`
2. เปิดสวิตช์ **Developer mode** ที่มุมขวาบน
3. คลิกปุ่ม **Load unpacked**
4. เลือกโฟลเดอร์โปรเจกต์นี้
5. ปักหมุดส่วนขยาย CleanVideo บนแถบ Toolbar เพื่อดูสถิติและควบคุมการทำงาน

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
NoAds/
├── manifest.json              # Extension Manifest V3 (iOS Safari & Chrome)
├── assets/                    # Extension Icons (16, 48, 128)
├── dist/
│   └── cleanvideo.user.js     # Standalone Userscript สำหรับ Mobile Safari
├── src/
│   ├── config/
│   │   └── rules.json         # Global Keywords & Site-specific Rules
│   ├── core/
│   │   ├── detector.js        # Heuristic Scoring Engine
│   │   ├── skip-handler.js    # Auto-Skip Ad Engine (Thai/Eng)
│   │   ├── popup-handler.js   # Auto-Close Popups & Scroll Restorer
│   │   ├── overlay-handler.js # Transparent Click-Trap Cleaner
│   │   ├── redirect-guard.js  # Mobile Window.open Interceptor
│   │   └── engine.js          # Main Orchestrator & MutationObserver
│   ├── ui/
│   │   ├── mobile-hud.js      # Mobile Safari Floating Action Pill
│   │   └── mobile-hud.css     # Glassmorphism Dark Theme
│   ├── content/
│   │   └── content.js         # Content Script Entry Point
│   └── popup/
│       ├── popup.html         # Extension Toolbar Popup UI
│       ├── popup.css
│       └── popup.js
└── test/
    └── mock-video-player.html # Interactive Video Ad Test Lab
```

---

## 🧪 การทดสอบ (Local Test Lab)

ในโปรเจกต์มีหน้าห้องทดลอง [`test/mock-video-player.html`](test/mock-video-player.html) ที่จำลองตัวเล่นวิดีโอพร้อมโฆษณาครบทุกรูปแบบ (ปุ่มข้าม, Popup กวนใจ, Transparent Click-Trap) เพื่อใช้ทดสอบความแม่นยำของระบบ

---

## 🔒 ความเป็นส่วนตัว (Privacy First)

- ประมวลผลและตัดสินใจทั้งหมดภายในเครื่องของผู้ใช้ (100% Local Execution)
- ไม่มีการเก็บหรือส่งประวัติการเข้าชมเว็บไซต์ออกสู่เซิร์ฟเวอร์ภายนอก

## 📄 License
MIT License

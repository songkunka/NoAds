# CleanVideo — Project Idea & MVP Specification

## 1. Project Overview

**CleanVideo** คือโปรเจกต์สำหรับลด/จัดการโฆษณาที่รบกวนการดูวิดีโอบนเว็บไซต์ โดยเน้นประสบการณ์แบบ:

> เปิดวิดีโอ → ไม่ต้องไล่ปิด Popup → ไม่ต้องกด Skip Ad หลายครั้ง → ดูวิดีโอได้ต่อทันที

แนวทางหลักคือเริ่มจาก **Browser Extension สำหรับ Desktop** แล้วต่อยอดไป **Safari Extension บน iPhone/iPad** และ **Browser App บน Android**

---

## 2. Problem

ผู้ใช้เว็บดูหนัง/วิดีโอบางเว็บไซต์มักเจอปัญหา:

- Popup เด้งหลายครั้ง
- เปิด Tab/Window ใหม่เมื่อกด Play
- ต้องกดปุ่ม Close หลายรอบ
- ต้องรอและกด `Skip Ad`
- Overlay โฆษณาบังตัววิดีโอ
- โฆษณา/Tracking โหลดก่อนวิดีโอ
- บางเว็บไซต์มีโฆษณาหลายชั้น ทำให้ใช้งานยุ่งยาก
- ผู้ใช้ต้องเสียเวลาไล่ปิดสิ่งรบกวนเอง

---

## 3. Product Vision

สร้างเครื่องมือชื่อ **CleanVideo** ที่ช่วยให้การดูวิดีโอบนเว็บไซต์สะอาดและรบกวนน้อยลง โดยใช้การตรวจจับและจัดการโฆษณาหลายชั้น

### Core Promise

> **Watch the video, not the ads.**

---

## 4. Platform Strategy

### Phase 1 — Desktop Browser Extension

เป้าหมายแรกคือ Chrome/Chromium-based browser

ใช้:

- Manifest V3
- Content Scripts
- Declarative Net Request
- Background Service Worker
- Popup UI
- Site-specific rules

### Phase 2 — iPhone / iPad

ทำเป็น Safari Web Extension / Content Blocker

เป้าหมาย:

- Block network requests บางประเภท
- ซ่อน/ลบ element ที่เป็นโฆษณา
- Inject script สำหรับบางกรณีที่อนุญาต

### Phase 3 — Android

แทนที่จะพยายามทำ Chrome Extension แบบ Desktop ให้พิจารณาสร้าง **CleanVideo Browser** ของตัวเอง

โครงสร้างโดยประมาณ:

```text
Android App
  ├── WebView / Browser Engine
  ├── Ad Request Blocking
  ├── Popup Detection
  ├── Overlay Removal
  ├── Auto Skip
  └── Site Rules
```

---

## 5. MVP Goal

MVP ไม่จำเป็นต้องรองรับทุกเว็บไซต์ตั้งแต่วันแรก

ให้เริ่มจากเว็บไซต์วิดีโอจำนวนเล็กน้อย แล้วทำให้ประสบการณ์ใช้งานดีจริงก่อน

### MVP Features

1. **Ad Request Blocking**
2. **Popup / Overlay Removal**
3. **Auto Close**
4. **Auto Skip Ad**
5. **New Tab / Redirect Protection**
6. **On/Off Toggle**
7. **Whitelist Website**
8. **Basic Site-specific Rules**

---

# 6. Core Features

## 6.1 Ad Request Blocking

ใช้ `declarativeNetRequest` เพื่อ block request ที่ตรงกับ rule

ตัวอย่าง flow:

```text
Website
   ↓
Request ad/tracker
   ↓
Extension checks rule
   ↓
BLOCK
   ↓
Page continues loading
```

เป้าหมายคือไม่ให้ resource บางชนิดโหลดตั้งแต่แรก แทนการรอให้โหลดแล้วค่อยซ่อน

---

## 6.2 Popup Detector

ตรวจหา popup ที่ถูกสร้างขึ้นใน DOM หลังโหลดหน้าเว็บ

ตัวอย่าง selector:

```javascript
[
  '.popup',
  '.modal',
  '.overlay',
  '.ad-overlay',
  '.ads',
  '[class*="popup"]',
  '[class*="modal"]',
  '[id*="popup"]'
]
```

ควรทำแบบ heuristic ไม่ใช่ลบทุก element ที่ชื่อมีคำว่า `ad`

เพราะอาจไปลบ UI สำคัญของเว็บไซต์

---

## 6.3 Auto Close

ตรวจหาปุ่มปิด เช่น:

```text
X
Close
Dismiss
ปิด
×
```

รวมถึง attributes เช่น:

```text
aria-label="Close"
title="Close"
```

แล้ว click โดยอัตโนมัติเมื่อมั่นใจว่า element นั้นเป็น popup/ad

---

## 6.4 Auto Skip Ad

ตรวจหาปุ่มหรือข้อความประเภท:

```text
Skip Ad
Skip
Skip Advertisement
ข้ามโฆษณา
ข้าม
```

ตัวอย่าง logic:

```javascript
if (buttonText.includes('skip')) {
  button.click();
}
```

แต่ production version ควรมี:

- normalization ของข้อความ
- case-insensitive matching
- mutation observer
- debounce/throttle
- confidence score

---

## 6.5 Overlay Removal

บางเว็บมีโฆษณาแบบ overlay ที่ไม่ได้มีปุ่ม Close ที่หาได้ง่าย

สามารถตรวจจากลักษณะ เช่น:

- `position: fixed`
- `position: absolute`
- `z-index` สูงผิดปกติ
- ขนาดครอบคลุม video
- มี iframe
- มีข้อความโฆษณา
- class/id ที่สื่อถึง ad

จากนั้นประเมิน confidence score ก่อนลบ

ตัวอย่างแนวคิด:

```text
class contains "popup"      +30
contains "advertisement"   +40
position fixed              +15
z-index very high           +15
iframe                       +20
covers video                 +20
-------------------------------
Total                       140
```

ถ้า score เกิน threshold เช่น 80 → จัดเป็น ad overlay

> ค่า threshold เป็นค่าที่ควรทดลองและปรับจริง ไม่ควร hard-code เป็นหลักตายตัว

---

# 7. New Tab / Redirect Protection

กรณีผู้ใช้กด Play แล้วเว็บไซต์พยายาม:

```text
Video page
   ↓
Click Play
   ↓
New Tab
   ↓
Ad / Redirect
```

ตัว Extension ควรช่วยลด redirect ที่เข้าข่ายโฆษณา/Tracking ตาม rules

แนวทาง:

- ตรวจ URL
- ตรวจ known ad/tracker domain
- ตรวจ redirect chain เมื่อ API/platform อนุญาต
- เก็บ domain whitelist/blacklist

ต้องระวังไม่ block navigation ที่ผู้ใช้ตั้งใจเปิดเอง

---

# 8. Site Rules

ควรมีระบบ rule แยกตามเว็บไซต์

ตัวอย่าง concept:

```javascript
const siteRules = {
  'example.com': {
    popupSelectors: [
      '.popup',
      '.overlay'
    ],
    closeSelectors: [
      '.close-btn',
      '[aria-label="Close"]'
    ],
    skipTexts: [
      'Skip Ad',
      'Skip'
    ]
  }
};
```

ข้อดีคือสามารถแก้ปัญหาเฉพาะเว็บได้โดยไม่กระทบเว็บไซต์อื่น

---

# 9. Smart Detection

ระยะต่อไป CleanVideo สามารถพัฒนาเป็น **Universal Video Cleaner**

แทนการพึ่ง selector ของแต่ละเว็บเพียงอย่างเดียว ให้ระบบประเมินว่า element ไหนมีโอกาสเป็นโฆษณา

### Input Signals

- Text
- Class name
- ID
- `aria-label`
- Button label
- iframe source
- URL/domain
- CSS position
- z-index
- ขนาด element
- ตำแหน่งเมื่อเทียบกับ video
- DOM mutation

### Detection Output

```text
Element
   ↓
Feature extraction
   ↓
Confidence score
   ↓
┌──────────────┐
│ score >= 80  │ → Remove / Click
└──────────────┘
```

ในอนาคตสามารถเพิ่ม ML/AI classifier ได้ แต่ MVP ไม่จำเป็นต้องใช้ AI

---

# 10. Architecture

```text
CleanVideo
│
├── Extension UI
│   ├── Enable / Disable
│   ├── Current Site Status
│   ├── Whitelist
│   └── Settings
│
├── Background Service Worker
│   ├── Rule Management
│   ├── Site Configuration
│   └── Extension State
│
├── Content Script
│   ├── Popup Detection
│   ├── Overlay Detection
│   ├── Auto Close
│   ├── Auto Skip
│   └── DOM Observation
│
├── Declarative Net Request
│   ├── Ad Rules
│   ├── Tracker Rules
│   └── Redirect Rules
│
└── Site Rule Database
    ├── Site A
    ├── Site B
    └── Site C
```

---

# 11. Suggested Folder Structure

```text
cleanvideo/
│
├── manifest.json
│
├── src/
│   ├── background/
│   │   └── service-worker.js
│   │
│   ├── content/
│   │   ├── content.js
│   │   ├── detector.js
│   │   ├── popup-handler.js
│   │   ├── skip-handler.js
│   │   └── overlay-handler.js
│   │
│   ├── rules/
│   │   ├── rules.json
│   │   └── sites/
│   │       ├── site-a.json
│   │       ├── site-b.json
│   │       └── site-c.json
│   │
│   └── popup/
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
│
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
└── README.md
```

---

# 12. Basic User Experience

### First Install

```text
Install CleanVideo
      ↓
Extension icon appears
      ↓
User opens video website
      ↓
CleanVideo starts automatically
```

### Extension Popup

```text
┌──────────────────────────┐
│       CleanVideo         │
│                          │
│   Protection     ON      │
│                          │
│   This site: Supported   │
│                          │
│   Ads blocked: 12        │
│   Popups removed: 3      │
│                          │
│   [ Disable on this site]│
│                          │
└──────────────────────────┘
```

---

# 13. Product Metrics

ใน MVP ควรเก็บเฉพาะข้อมูลที่จำเป็น และหลีกเลี่ยงการเก็บ browsing history ที่ไม่จำเป็น

ตัวชี้วัดในเครื่อง เช่น:

- Number of blocked requests
- Number of removed overlays
- Number of auto-clicked skip buttons
- Number of blocked redirects
- Active state per site

ไม่ควรส่ง URL ของทุกเว็บไซต์ขึ้น server โดยไม่จำเป็น

---

# 14. Privacy Principles

CleanVideo ควรออกแบบโดยเน้น privacy-first

### หลักการ

- Process detection locally whenever possible
- ไม่เก็บประวัติการเข้าชมแบบละเอียดโดยไม่จำเป็น
- ไม่เก็บ video content
- ไม่เก็บ credential/cookies
- ไม่ส่งข้อมูล browsing activity ออก server โดย default
- ถ้ามี analytics ต้อง opt-in หรือเก็บแบบ aggregate เท่าที่จำเป็น

---

# 15. Important Technical Limitations

CleanVideo ไม่สามารถรับประกันว่าโฆษณาทุกประเภทบนทุกเว็บไซต์จะถูกลบได้ 100%

กรณีที่ยาก เช่น:

- โฆษณาฝังอยู่ใน video stream
- โฆษณาที่เป็นส่วนหนึ่งของ player logic
- เว็บไซต์ตรวจจับ ad blocker
- anti-bot / anti-extension systems
- encrypted/media delivery ที่ไม่สามารถแก้ได้จาก DOM
- เว็บไซต์ที่เปลี่ยน class/DOM structure บ่อย

ดังนั้น Product positioning ควรใช้แนวคิด:

> **Reduce intrusive ads and automate repetitive ad interactions**

มากกว่าการสัญญาว่า “กำจัดโฆษณาทั้งหมด 100%”

---

# 16. MVP Development Order

## Sprint 1 — Foundation

- Create Chrome Manifest V3 project
- Basic popup UI
- Enable/Disable state
- Content script injection
- Basic logging

## Sprint 2 — Popup / Overlay

- MutationObserver
- Popup detection
- Close button detection
- Overlay removal
- Site-specific selectors

## Sprint 3 — Auto Skip

- Detect `Skip` buttons
- Detect Thai/English variations
- Auto-click with confidence checks
- Prevent repeated clicks

## Sprint 4 — Network Blocking

- Declarative Net Request
- Basic ad/tracker rules
- Dynamic rules support
- Rule update architecture

## Sprint 5 — Testing

ทดสอบกับเว็บไซต์หลายรูปแบบ:

- Popup-heavy site
- Overlay-heavy site
- Redirect-heavy site
- Video player with skip button
- Site without ads
- Site with legitimate modal dialogs

---

# 17. Safety / Compatibility Strategy

อย่าใช้ logic แบบ:

```javascript
removeAllFixedElements();
```

เพราะอาจทำให้เว็บไซต์พัง

ควรใช้:

```text
Detect
  ↓
Score
  ↓
Confirm
  ↓
Action
```

และมี:

- Per-site rules
- Global disable
- Whitelist
- Debug mode
- Recovery mechanism

---

# 18. Future Features

### Smart Rule Learning

ระบบสามารถจำได้ว่าเว็บไหนต้องจัดการอย่างไร

```text
Site A
→ selector A
→ close button A
→ skip button A
```

### Community Rules

ผู้ใช้/ผู้พัฒนาสามารถแชร์ rule ของเว็บไซต์

```text
Rule Repository
   ├── site-a
   ├── site-b
   └── site-c
```

### Rule Auto Update

Extension ตรวจสอบ rule version ใหม่เป็นระยะ

### Debug Mode

ให้ผู้ใช้เปิดโหมด debug แล้วดูว่า CleanVideo ตรวจเจออะไร

```text
Detected Popup
Confidence: 91%
Reason:
- overlay
- high z-index
- ad keyword
```

### AI-assisted Detection

ในระยะยาวสามารถใช้ ML/AI ช่วย classify DOM element ที่ซับซ้อน แต่ต้องรักษา privacy และไม่ทำให้ extension หนักเกินไป

---

# 19. Business Model Ideas

โปรเจกต์สามารถทำเป็นฟรี + paid features ได้ เช่น:

### Free

- Basic popup blocking
- Basic skip detection
- Basic site rules

### Pro

- Advanced smart detection
- Cloud rule sync
- Custom rules
- Cross-device sync
- Advanced statistics

อย่างไรก็ตาม core blocking ควรยังให้คุณค่าได้ตั้งแต่ Free tier

---

# 20. Suggested Tech Stack

### Desktop Extension

- JavaScript หรือ TypeScript
- Manifest V3
- HTML/CSS
- Chrome Extensions API
- Declarative Net Request
- MutationObserver

### UI

เลือกได้ระหว่าง:

- Vanilla HTML/CSS/JS — ง่ายที่สุดสำหรับ MVP
- React — เหมาะถ้าจะทำ UI ซับซ้อนขึ้น

### Mobile

**iOS/iPadOS:** Safari Web Extension / Content Blocker

**Android:** Native Android + WebView/browser architecture หรือพิจารณา browser engine/framework ตาม requirement ของโปรเจกต์

---

# 21. Recommended MVP Scope

อย่าทำทุกอย่างพร้อมกัน

### Version 0.1

```text
Chrome Extension
    ↓
Popup detection
    ↓
Auto close
    ↓
Auto skip
    ↓
Basic overlay removal
```

### Version 0.2

```text
+ Network blocking
+ Site rules
+ Whitelist
+ Statistics
```

### Version 0.3

```text
+ Smart confidence scoring
+ Dynamic rules
+ Better redirect handling
```

### Version 1.0

```text
Chrome/Chromium
+ Safari
+ Android Browser
+ Shared rule system
```

---

# 22. Product Name Ideas

Primary name:

**CleanVideo**

Alternative names:

- VideoClean
- Adless
- CleanPlay
- SkipFree
- PurePlay
- WatchClean
- ClearPlay
- NoPopup
- VideoShield

---

# 23. One-line Pitch

> **CleanVideo automatically blocks intrusive ad requests, removes annoying popups, and skips repetitive ad interactions so users can get to their video faster.**

---

# 24. First Task for IDE / Vibe Coding

เริ่มจากสร้าง Chrome Extension MVP โดยมี requirements ดังนี้:

```text
Create a Manifest V3 Chrome Extension named CleanVideo.

Requirements:
1. Add a popup UI with Enable/Disable toggle.
2. Inject a content script into supported pages.
3. Use MutationObserver to detect newly added DOM elements.
4. Detect likely popup/overlay elements using configurable selectors and heuristic scoring.
5. Detect buttons containing Skip / Skip Ad / Close / Dismiss and Thai equivalents.
6. Auto-click only when confidence is high.
7. Remove confirmed ad overlays.
8. Keep site-specific rules in separate JSON configuration.
9. Add whitelist support.
10. Add a debug mode that logs why an element was detected.
11. Keep all processing local by default.
12. Structure code so Declarative Net Request rules can be added later.
```

### Success Criteria for MVP

```text
[ ] Extension installs successfully
[ ] Toggle works
[ ] Popup detector works
[ ] Close button automation works
[ ] Skip button automation works
[ ] Overlay removal works
[ ] Whitelist works
[ ] No major breakage on normal pages
[ ] Debug mode explains detections
```

---

# 25. Final Direction

**เริ่มจาก Extension ก่อน ไม่ต้องทำ Mobile พร้อมกัน**

เหตุผล:

- Develop เร็วกว่า
- Debug ง่ายกว่า
- ทดสอบ DOM/network ได้สะดวกกว่า
- ทำ MVP ได้เร็ว
- สามารถนำ architecture เดิมไปต่อ Safari/Android ได้

เป้าหมายแรกไม่ใช่ “Ad Blocker ที่ดีที่สุดในโลก” แต่คือ:

> **Extension ที่ช่วยให้ผู้ใช้กด Play แล้วไม่ต้องเสียเวลาจัดการ popup และปุ่ม Skip ซ้ำ ๆ**

เมื่อ MVP นี้เสถียรแล้ว จึงค่อยเพิ่ม network blocking, smart detection, shared rules และ mobile platform

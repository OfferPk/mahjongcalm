# MahjongCalm — Istemaal Guide (Roman Urdu)

> Factory rule: har published project mein yeh file `GUIDE-roman-urdu.md` ke naam se zaroori hai.

## 1. Yeh project kya hai?

MahjongCalm ek **offline mahjong solitaire** game hai — stacked layouts par geometric tiles match karke board clear karo. Asli mahjong characters ki zaroorat nahi; original shapes/colors hain. Ads stubs hain (real AdMob nahi).

## 2. Kahan se download karein?

- GitHub Pages (jab publish ho): `…/mahjongcalm/`
- Source / ZIP: factory path `/workspace/factory/projects/mahjongcalm`
- Local build: `npm run build` → `dist/`

## 3. Pehle kya chahiye? (requirements)

- **Node.js** 20+ (dev / build ke liye)
- Modern browser (Chrome / Edge / Firefox / Safari)
- Internet sirf pehli load / install ke liye; baad mein PWA offline chal sakti hai

## 4. Install + Run (step-by-step)

1. Terminal kholo aur project folder mein jao:
   ```bash
   cd /workspace/factory/projects/mahjongcalm
   ```
2. Dependencies:
   ```bash
   npm install
   ```
3. Dev server:
   ```bash
   npm run dev
   ```
4. Browser mein **`/mahjongcalm/`** path kholo (base path zaroori hai), maslan `http://localhost:5173/mahjongcalm/`
5. Production check:
   ```bash
   npm test
   npm run build
   npm run preview
   ```

## 5. Demo login (agar ho)

Koi account / login nahi. Sab progress browser `localStorage` mein rehti hai.

## 6. Features — har ek kya karta hai

### Home / Play
- **Kahan:** pehli screen
- **Kaise:** **Play** dabao (pehla uncleared layout) ya **Choose layout**
- **Result:** game board khul jata hai
- **Pehli baar:** agar `mahjongcalm:howto` missing ho to How to play auto dikhega; **Got it** → Home + flag save; baad mein sirf manual button

### Free tile + Match
- **Kahan:** play screen, board par tap
- **Kaise:** pehle free tile select, phir matching free tile
- **Rule:** upar kuch na ho, aur left ya right mein se kam az kam ek side khuli ho
- **Result:** pair remove; sab clear → win

### Hint
- **Kahan:** play HUD — 💡
- **Kaise:** pehle 3 hints free; baad mein rewarded stub overlay
- **Result:** ek valid free pair highlight

### Shuffle
- **Kahan:** play bar — **Shuffle**
- **Kaise:** stuck ho to dabao
- **Result:** baqi tiles ke faces reshuffle (stack same)

### Layouts
- **Kahan:** Choose layout / Layouts
- **Kaise:** card select (turtle, pyramid, bridge, …)
- **Result:** us layout se naya deal

### Settings — Mute + Remove ads
- **Kahan:** Home → Settings
- **Mute:** sound flag localStorage mein
- **Remove ads (stub):** `adsRemoved` true; interstitial skip; rewarded auto-grant
- **Result:** koi real payment nahi — sirf stub

### Win screen
- **Kahan:** board clear hone par overlay
- **Kaise:** Next / **Share** / Replay / Layouts / Home
- **Share:** `navigator.share` (agar available) warna clipboard + toast — text jaise `MahjongCalm — cleared Turtle Lite in 42 moves` (offline, network nahi)
- **Result:** layout “cleared” progress mein save

## 7. Common masail (troubleshooting)

- **Blank page / assets 404:** URL mein `/mahjongcalm/` base use karo; root `/` par Vite base break karega
- **Tiles tap nahi ho rahe:** blocked tile (dono sides band ya upar stack) — Hint / Shuffle try karo
- **Progress gayab:** dusra browser / private mode / storage clear
- **`npm test` fail:** Node version check; `rm -rf node_modules && npm install`

## 8. Security / privacy tips

- Koi server login nahi; data local hi rehta hai
- Real AdMob / payment keys repo mein nahi
- Sirf trusted GitHub Pages / apna build host karo

## 9. Agla update

- Daily challenge (stretch), zyada layouts, polish audio — PRD ke mutabiq baad mein

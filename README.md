# ⚡ TAP RUSH — Neon Arcade Reflex Game

An intense, fast-paced 30-second arcade game built with pure modern HTML5, CSS3, and JavaScript (Canvas 2D + Web Audio API). Optimized for smartphones, tablets, and desktop browsers with 60 FPS smooth neon visuals, tactile procedural sound effects, and zero external runtime dependencies.

---

## 🎮 Game Features

- **⏱️ 30-Second Countdown:** Rapid, adrenaline-fueled rounds with an animated radial timer and urgent audiovisual alerts during the final 5 seconds.
- **🎯 Dynamic Moving Targets:**
  - **Normal Orb (+100 pts):** Cyan target moving at base speed. Builds your combo.
  - **Speedster (+250 pts):** Compact amber target zig-zagging aggressively across the screen.
  - **Golden Star (+500 pts):** Rare bonus orb. Drops +500 points and a 25% chance of granting **+2.0 bonus seconds**!
  - **Ice Orb (+200 pts):** Triggers **Time Freeze** for 3.5 seconds (targets slow down by 65%), allowing rapid-fire combo chains.
  - **Multi-Tap Boss Core (+600 pts):** Takes 3 rapid hits to shatter, unleashing a giant shockwave and massive combo points.
  - **Hazard Bomb (-300 pts):** Spawns in Medium and Hard modes. Avoid tapping! Deducts 300 points, resets your combo streak to 0, and triggers screen shake.
- **📈 Progressive Speed & Difficulty:**
  - Targets accelerate by up to **+75%** and spawn rate speeds up continuously as the 30-second clock winds down.
  - Final 10 seconds activates the pulsing **SPEED RUSH!** frenzy banner.
- **🔥 Combo & Precision Scoring:**
  - Consecutive hits without missing multiply points up to **5x** (`x1`, `x2`, `x3`, `x4`, `x5`).
  - Tapping empty arena space counts as a miss, resets your combo multiplier, and reduces your **Accuracy %**.
- **🎚️ 3 Difficulty Levels:**
  - **Easy:** Larger targets (32–38px), slower speed, longer lifespan, zero hazard bombs.
  - **Medium:** Standard speed, bonus targets, and occasional hazards.
  - **Hard:** High speed, small targets (20–27px), fast zig-zags, and frequent hazard bombs.
- **📅 Deterministic Daily Challenge:**
  - Generates a fixed target spawn sequence seeded by today's date (`YYYY-MM-DD`).
  - Every player around the world experiences the exact same sequence of targets on the same day.
- **🏆 Hall of Fame & Leaderboards:**
  - Personal best scores for Easy, Medium, Hard, and Daily Challenge saved locally in `localStorage`.
  - Top 10 Arcade Leaderboard with player name entry, accuracy %, difficulty filter, and ranking badges.
- **💬 WhatsApp Score Sharing:**
  - One-tap WhatsApp button creates an emoji-formatted challenge card with your score, rank grade (S/A/B/C/D), accuracy, and combo to challenge friends.
- **🔊 Procedural Web Audio API:**
  - 100% synthesized retro-arcade sound effects (ascending pitch chimes, gold bonus chords, freeze whoosh, bomb explosions, countdown beeps).
  - Works instantly offline with zero audio file load lag. Persistent mute/unmute toggle.
- **📱 Mobile Optimized:**
  - Fast touch handling with zero 300ms tap delay (`touch-action: manipulation`).
  - Retina/HiDPI canvas scaling (`window.devicePixelRatio`).
  - Forgiving touch hitbox padding (+14px) for fingers.
  - Prevents pull-to-refresh or double-tap zooming.

---

## 🚀 How to Run Locally

### Option 1: Direct Browser Launch (Easiest)
1. Navigate to the project directory:
   ```
   C:\Users\Sachin\.gemini\antigravity\scratch\tap-rush
   ```
2. Double-click `start.bat` (or open `index.html` directly in Chrome, Edge, Safari, or Firefox).
3. The game will launch immediately!

### Option 2: Local HTTP Server
1. Double-click `start-server.bat` or run in terminal:
   ```bash
   node server.js
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000/
   ```

---

## 🌐 Instructions to Publish Online (100% Free)

Because TAP RUSH is built with pure static HTML, CSS, and JavaScript with zero backend or database required, you can deploy it globally in under 2 minutes using any of the free hosting services below:

### Method 1: GitHub Pages (Recommended)
1. Create a free account on [GitHub.com](https://github.com) if you haven't already.
2. Create a new repository named `tap-rush` (set to **Public**).
3. Upload all files from this folder (`index.html`, `styles.css`, `game.js`, `audio.js`, `leaderboard.js`).
4. Go to repository **Settings** ➔ **Pages** (in the left sidebar).
5. Under **Branch**, select `main` (or `master`) and folder `/ (root)`, then click **Save**.
6. Within 60 seconds, your game is live worldwide at:
   `https://<your-username>.github.io/tap-rush/`

---

### Method 2: Netlify (Drag-and-Drop Deploy in 10 Seconds)
1. Go to [Netlify Drop](https://app.netlify.com/drop).
2. Simply drag and drop the `tap-rush` folder into the browser window.
3. Netlify will instantly deploy it and give you a live production URL (e.g., `https://tap-rush-arcade.netlify.app`).
4. You can connect a custom domain or rename your site subdomain for free.

---

### Method 3: Vercel (Production Ready)

The project is pre-configured with `vercel.json`, `package.json`, `manifest.json`, and `favicon.svg`.

#### Option A: Via Vercel Web Dashboard (No CLI needed)
1. Go to [vercel.com/new](https://vercel.com/new) and log in.
2. If your code is on GitHub/GitLab/Bitbucket, click **Import** next to your `tap-rush` repository.
3. Configure the Project Settings:
   - **Framework Preset:** `Other`
   - **Root Directory:** `./`
   - **Build Command:** *(Leave blank / default)*
   - **Output Directory:** `./` *(or leave blank)*
   - **Install Command:** *(Leave blank / default)*
4. Click **Deploy**. Within 20 seconds, your game is live with global edge caching and free HTTPS!

#### Option B: Via Vercel CLI
If you have Vercel CLI installed:
```bash
npx vercel
```
Follow the prompts (accept default settings) to deploy immediately to production.

---

### Method 4: Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **Workers & Pages**.
2. Click **Create Application** ➔ **Pages** ➔ **Direct Upload**.
3. Upload the `tap-rush` folder and click **Deploy site**.

---

## 📱 Adding to Mobile Home Screen (PWA Style)

Players on mobile phones can run TAP RUSH in full-screen mode just like a native app:
- **iPhone / iPad (Safari):** Tap the **Share** button ➔ Tap **Add to Home Screen**.
- **Android (Chrome):** Tap the **Three Dots Menu (⋮)** ➔ Tap **Install App** or **Add to Home Screen**.

---

## 📂 File Architecture

```
tap-rush/
├── index.html        # Clean semantic markup, HUD, screens, and modals
├── styles.css        # Cyberpunk neon aesthetic, glassmorphism, responsive grid
├── game.js           # 60 FPS Canvas game loop, physics, targets, particles
├── audio.js          # Procedural Web Audio API sound synthesizer
├── leaderboard.js    # LocalStorage manager, personal bests, WhatsApp share
├── server.js         # Lightweight Node.js local static HTTP server
├── start.bat         # Windows one-click direct game launcher
├── start-server.bat  # Windows one-click local HTTP server launcher
└── README.md         # Documentation & deployment guide
```

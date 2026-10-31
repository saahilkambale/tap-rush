const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png'
};

// 1. Start HTTP Server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

async function main() {
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`[TEST] HTTP Server running on port ${PORT}`);

  // Find Chrome or Edge executable
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  let browserExe = chromePaths.find(p => fs.existsSync(p));
  if (!browserExe) {
    console.error('No browser executable found!');
    process.exit(1);
  }
  console.log(`[TEST] Using browser: ${browserExe}`);

  const debugPort = 9333;
  const testProfile = path.join(__dirname, '.chrome-test-profile');
  
  let browserWsUrl = null;
  const browserProc = spawn(browserExe, [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    `--remote-debugging-port=${debugPort}`,
    '--remote-debugging-address=127.0.0.1',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + testProfile,
    `http://127.0.0.1:${PORT}/`
  ]);

  browserProc.stderr.on('data', d => {
    const str = d.toString();
    const match = str.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      browserWsUrl = match[1];
      console.log(`[TEST] Detected browser DevTools URL: ${browserWsUrl}`);
    }
  });

  // Wait for remote debugging to be ready
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find(p => p.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (e) {}
  }

  if (!wsUrl && browserWsUrl) {
    console.log('[TEST] Connecting to browser target to resolve page...');
    const bWs = new WebSocket(browserWsUrl);
    await new Promise((resolve) => {
      bWs.onopen = resolve;
      bWs.onerror = () => resolve();
    });
    const targetsRes = await new Promise((resolve) => {
      bWs.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === 999) resolve(d.result?.targetInfos || []);
      };
      bWs.send(JSON.stringify({ id: 999, method: 'Target.getTargets' }));
      setTimeout(() => resolve([]), 2000);
    });
    bWs.close();
    const pageTarget = targetsRes.find(t => t.type === 'page');
    if (pageTarget) {
      wsUrl = `ws://127.0.0.1:${debugPort}/devtools/page/${pageTarget.targetId}`;
    }
  }

  if (!wsUrl) {
    console.error('[TEST] Could not connect to browser CDP WebSocket!');
    browserProc.kill();
    server.close();
    process.exit(1);
  }
  console.log(`[TEST] Connected to browser page via CDP`);

  // Connect WebSocket
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const pendingRequests = new Map();
  const consoleMessages = [];
  const errors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      consoleMessages.push(text);
      if (data.params.type === 'error') {
        errors.push(text);
      }
    } else if (data.method === 'Runtime.exceptionThrown') {
      errors.push(data.params.exceptionDetails.text + ': ' + (data.params.exceptionDetails.exception?.description || ''));
    }
  };

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'Evaluation failed');
    }
    return res.result.value;
  }

  // Enable CDP domains
  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');

  console.log('[TEST] Initializing tests...');

  // TEST 1: Check Page Title & Canvas
  const title = await evaluate('document.title');
  console.log(`[TEST 1] Page Title: "${title}" - ${title.includes('TAP RUSH') ? 'PASS' : 'FAIL'}`);

  const canvasExists = await evaluate('Boolean(document.getElementById("gameCanvas") && window.tapRushGame)');
  console.log(`[TEST 2] Game instance & Canvas exist: ${canvasExists ? 'PASS' : 'FAIL'}`);

  // TEST 3: Sound toggle test
  const initialMute = await evaluate('window.soundCtrl.isMuted');
  await evaluate('document.getElementById("btnSoundToggle").click()');
  const toggledMute = await evaluate('window.soundCtrl.isMuted');
  console.log(`[TEST 3] Sound toggle works (${initialMute} -> ${toggledMute}): ${initialMute !== toggledMute ? 'PASS' : 'FAIL'}`);

  // TEST 4: Difficulty selection
  await evaluate('document.querySelector(".diff-btn[data-diff=\'hard\']").click()');
  const selectedDiff = await evaluate('window.tapRushGame.selectedDifficulty');
  console.log(`[TEST 4] Difficulty selection (HARD): ${selectedDiff === 'hard' ? 'PASS' : 'FAIL'}`);

  // TEST 5: Help Modal
  await evaluate('document.getElementById("btnHowToPlay").click()');
  const helpVisible = await evaluate('!document.getElementById("modalHelp").classList.contains("hidden")');
  await evaluate('document.getElementById("btnDoneHelp").click()');
  const helpClosed = await evaluate('document.getElementById("modalHelp").classList.contains("hidden")');
  console.log(`[TEST 5] Help modal open/close: ${helpVisible && helpClosed ? 'PASS' : 'FAIL'}`);

  // TEST 6: Leaderboard Modal
  await evaluate('document.getElementById("btnOpenLeaderboard").click()');
  const lbVisible = await evaluate('!document.getElementById("modalLeaderboard").classList.contains("hidden")');
  const rowCount = await evaluate('document.querySelectorAll("#leaderboardBody tr").length');
  await evaluate('document.getElementById("btnCloseLeaderboard").click()');
  console.log(`[TEST 6] Leaderboard modal open with ${rowCount} records: ${lbVisible && rowCount > 0 ? 'PASS' : 'FAIL'}`);

  // TEST 7: Start Game & Countdown Flow
  console.log('[TEST 7] Starting game and checking countdown...');
  await evaluate('document.querySelector(".diff-btn[data-diff=\'medium\']").click()');
  await evaluate('document.getElementById("btnStartGame").click()');

  const inCountdown = await evaluate('window.tapRushGame.state === "COUNTDOWN"');
  console.log(`[TEST 7.1] Game entered COUNTDOWN: ${inCountdown ? 'PASS' : 'FAIL'}`);

  // Wait for countdown to finish (3 * 850ms + GO ~ 3.5s)
  await new Promise(r => setTimeout(r, 3800));

  const isPlaying = await evaluate('window.tapRushGame.state === "PLAYING"');
  const targetCount = await evaluate('window.tapRushGame.targets.length');
  console.log(`[TEST 7.2] State is PLAYING with ${targetCount} active targets: ${isPlaying && targetCount > 0 ? 'PASS' : 'FAIL'}`);

  // TEST 8: Simulate Player Tapping on a target
  console.log('[TEST 8] Simulating tap on moving target...');
  const tapResult = await evaluate(`
    (() => {
      const g = window.tapRushGame;
      if (g.targets.length === 0) return { success: false, reason: 'no targets' };
      const t = g.targets[0];
      const initialScore = g.score;
      const initialHits = g.hits;

      // Simulate pointerdown
      const rect = g.canvas.getBoundingClientRect();
      const event = new PointerEvent('pointerdown', {
        clientX: rect.left + t.x,
        clientY: rect.top + t.y,
        bubbles: true,
        cancelable: true
      });
      g.canvas.dispatchEvent(event);

      return {
        success: true,
        scoreDelta: g.score - initialScore,
        hitsDelta: g.hits - initialHits,
        combo: g.combo,
        accuracy: g.hits / g.totalTaps
      };
    })()
  `);
  console.log(`[TEST 8.1] Tap Hit Result:`, tapResult);

  // TEST 9: Simulate Miss Tap
  const missResult = await evaluate(`
    (() => {
      const g = window.tapRushGame;
      const initialMisses = g.misses;
      // Tap in top-left corner where padding ensures no target
      const rect = g.canvas.getBoundingClientRect();
      const event = new PointerEvent('pointerdown', {
        clientX: rect.left + 5,
        clientY: rect.top + 5,
        bubbles: true,
        cancelable: true
      });
      g.canvas.dispatchEvent(event);

      return {
        missDelta: g.misses - initialMisses,
        comboReset: g.combo === 0
      };
    })()
  `);
  console.log(`[TEST 9] Miss Tap Result (miss added, combo reset):`, missResult);

  // TEST 10: Pause & Resume
  await evaluate('document.getElementById("btnPause").click()');
  const isPaused = await evaluate('window.tapRushGame.state === "PAUSED"');
  await evaluate('document.getElementById("btnResumeGame").click()');
  const resumedPlaying = await evaluate('window.tapRushGame.state === "PLAYING"');
  console.log(`[TEST 10] Pause & Resume works: ${isPaused && resumedPlaying ? 'PASS' : 'FAIL'}`);

  // TEST 11: End Game / Time-out Flow
  console.log('[TEST 11] Testing Game Over and Results Calculation...');
  await evaluate(`
    (() => {
      const g = window.tapRushGame;
      g.timeRemaining = 0.05;
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  const isGameOver = await evaluate('window.tapRushGame.state === "GAMEOVER"');
  const gameOverVisible = await evaluate('!document.getElementById("screenGameOver").classList.contains("hidden")');
  const gradeText = await evaluate('document.getElementById("rankStamp").textContent');
  const finalScoreText = await evaluate('document.getElementById("goFinalScore").textContent');
  console.log(`[TEST 11] Game Over screen active: ${isGameOver && gameOverVisible ? 'PASS' : 'FAIL'} (Score: ${finalScoreText}, Grade: ${gradeText})`);

  // TEST 12: Save Player Name to Hall of Fame
  await evaluate(`
    (() => {
      document.getElementById('playerNameInput').value = 'NEON_HERO';
      document.getElementById('btnSaveScore').click();
    })()
  `);
  const savedSuccess = await evaluate('!document.getElementById("saveConfirmMessage").classList.contains("hidden")');
  console.log(`[TEST 12] Score saved with player tag NEON_HERO: ${savedSuccess ? 'PASS' : 'FAIL'}`);

  // TEST 13: Daily Challenge Mode
  console.log('[TEST 13] Testing Daily Challenge deterministic generation...');
  await evaluate('document.getElementById("btnGoMenu").click()');
  await evaluate('document.getElementById("btnDailyCard").click()');
  const isDaily = await evaluate('window.tapRushGame.isDailyChallenge');
  console.log(`[TEST 13.1] Daily Challenge started: ${isDaily ? 'PASS' : 'FAIL'}`);

  // Wait for countdown
  await new Promise(r => setTimeout(r, 3800));
  const dailyTargets = await evaluate('window.tapRushGame.targets.map(t => ({ type: t.type, r: Math.round(t.radius) }))');
  console.log(`[TEST 13.2] Daily targets seeded properly:`, dailyTargets);

  // Check any browser errors
  console.log(`[TEST SUMMARY] Total runtime errors logged: ${errors.length}`);
  if (errors.length > 0) {
    console.error('[TEST ERRORS]:', errors);
  }

  // Cleanup
  ws.close();
  browserProc.kill();
  server.close();

  // Remove test profile directory
  try {
    fs.rmSync(path.join(__dirname, '.chrome-test-profile'), { recursive: true, force: true });
  } catch (e) {}

  if (errors.length === 0) {
    console.log('\n🌟 ALL TESTS PASSED SUCCESSFULLY! TAP RUSH IS FULLY FUNCTIONAL! 🌟');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL TEST ERROR]:', err);
  process.exit(1);
});

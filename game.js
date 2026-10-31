/**
 * TAP RUSH — Core Game Engine
 * Neon Reflex Arcade Gameplay, Physics, Particle Engine & State Management
 */

// PRNG for Daily Challenge (Mulberry32)
function createSeededRandom(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 123456789;
}

class TapRushGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.bgCanvas = document.getElementById('bgCanvas');
    this.bgCtx = this.bgCanvas ? this.bgCanvas.getContext('2d') : null;

    // Game Config & Difficulty Presets
    this.GAME_DURATION = 30.0; // 30 seconds
    this.DIFFICULTIES = {
      easy: {
        name: 'EASY',
        baseSpeed: 105,
        spawnInterval: 850,
        maxTargets: 4,
        targetRadius: { min: 32, max: 38 },
        hazardChance: 0.0,
        goldChance: 0.14,
        freezeChance: 0.12,
        fastChance: 0.14,
        bossChance: 0.08,
        lifespan: 5.0
      },
      medium: {
        name: 'MEDIUM',
        baseSpeed: 175,
        spawnInterval: 680,
        maxTargets: 5,
        targetRadius: { min: 25, max: 32 },
        hazardChance: 0.15,
        goldChance: 0.12,
        freezeChance: 0.10,
        fastChance: 0.22,
        bossChance: 0.10,
        lifespan: 4.2
      },
      hard: {
        name: 'HARD',
        baseSpeed: 255,
        spawnInterval: 520,
        maxTargets: 6,
        targetRadius: { min: 20, max: 27 },
        hazardChance: 0.24,
        goldChance: 0.10,
        freezeChance: 0.08,
        fastChance: 0.30,
        bossChance: 0.12,
        lifespan: 3.4
      },
      daily: {
        name: 'DAILY',
        baseSpeed: 200,
        spawnInterval: 600,
        maxTargets: 5,
        targetRadius: { min: 24, max: 30 },
        hazardChance: 0.18,
        goldChance: 0.14,
        freezeChance: 0.10,
        fastChance: 0.24,
        bossChance: 0.10,
        lifespan: 3.8
      }
    };

    // Game State
    this.state = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.selectedDifficulty = 'medium';
    this.isDailyChallenge = false;
    this.rng = Math.random;

    // Runtime Metrics
    this.score = 0;
    this.timeRemaining = this.GAME_DURATION;
    this.totalTaps = 0;
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastTickTime = 0;

    // Power-up States
    this.freezeTimer = 0; // Freeze slow-down in seconds
    this.shakeIntensity = 0;
    this.shakeTime = 0;

    // Entities
    this.targets = [];
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.ambientStars = [];

    // Timing
    this.lastFrameTime = performance.now();
    this.spawnTimer = 0;

    // DOM Elements Cache
    this.dom = {
      hud: document.getElementById('hud'),
      hudTimer: document.getElementById('hudTimer'),
      timerProgressBar: document.getElementById('timerProgressBar'),
      hudScore: document.getElementById('hudScore'),
      hudCombo: document.getElementById('hudCombo'),
      comboFire: document.getElementById('comboFire'),
      hudAccuracy: document.getElementById('hudAccuracy'),
      frenzyBanner: document.getElementById('frenzyBanner'),
      freezeOverlay: document.getElementById('freezeOverlay'),
      screenMenu: document.getElementById('screenMenu'),
      screenCountdown: document.getElementById('screenCountdown'),
      countdownNumber: document.getElementById('countdownNumber'),
      countdownModeText: document.getElementById('countdownModeText'),
      screenGameOver: document.getElementById('screenGameOver'),
      screenPause: document.getElementById('screenPause'),
      pauseScore: document.getElementById('pauseScore'),
      pauseTime: document.getElementById('pauseTime'),
      menuBestScore: document.getElementById('menuBestScore'),
      menuDailyBest: document.getElementById('menuDailyBest'),
      dailyDateTitle: document.getElementById('dailyDateTitle'),
      bestEasy: document.getElementById('bestEasy'),
      bestMedium: document.getElementById('bestMedium'),
      bestHard: document.getElementById('bestHard'),
      goFinalScore: document.getElementById('goFinalScore'),
      goAccuracy: document.getElementById('goAccuracy'),
      goMaxCombo: document.getElementById('goMaxCombo'),
      goHitsMisses: document.getElementById('goHitsMisses'),
      rankStamp: document.getElementById('rankStamp'),
      rankLabel: document.getElementById('rankLabel'),
      newHighScoreAlert: document.getElementById('newHighScoreAlert'),
      playerNameInput: document.getElementById('playerNameInput'),
      saveConfirmMessage: document.getElementById('saveConfirmMessage'),
      modalLeaderboard: document.getElementById('modalLeaderboard'),
      modalHelp: document.getElementById('modalHelp'),
      leaderboardBody: document.getElementById('leaderboardBody'),
      leaderboardEmpty: document.getElementById('leaderboardEmpty'),
      soundIcon: document.getElementById('soundIcon')
    };

    this.currentEndStats = null;

    this.init();
  }

  init() {
    this.resizeCanvases();
    window.addEventListener('resize', () => this.resizeCanvases());

    this.initAmbientStars();
    this.bindEvents();
    this.updateMenuBests();
    this.updateSoundIcon();

    // Start 60fps Loop
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    const w = (rect && rect.width > 50) ? rect.width : (this.canvas.clientWidth || window.innerWidth || 480);
    const h = (rect && rect.height > 50) ? rect.height : (this.canvas.clientHeight || (window.innerHeight - 60) || 640);

    this.width = w;
    this.height = h;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    if (this.ctx.setTransform) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
    }

    if (this.bgCanvas) {
      const bgW = window.innerWidth || 480;
      const bgH = window.innerHeight || 800;
      this.bgCanvas.width = Math.floor(bgW * dpr);
      this.bgCanvas.height = Math.floor(bgH * dpr);
      if (this.bgCtx) {
        if (this.bgCtx.setTransform) {
          this.bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else {
          this.bgCtx.resetTransform?.();
          this.bgCtx.scale(dpr, dpr);
        }
      }
    }
  }

  initAmbientStars() {
    this.ambientStars = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.ambientStars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.25 + 0.08,
        color: Math.random() > 0.5 ? '#00f3ff' : '#ff007f'
      });
    }
  }

  updateSoundIcon() {
    if (this.dom.soundIcon) {
      this.dom.soundIcon.textContent = window.soundCtrl.isMuted ? '🔇' : '🔊';
    }
  }

  updateMenuBests() {
    if (window.leaderboardMgr) {
      const overall = window.leaderboardMgr.getOverallBest();
      if (this.dom.menuBestScore) {
        this.dom.menuBestScore.textContent = `${overall.toLocaleString()} PTS`;
      }

      const easyBest = window.leaderboardMgr.getPersonalBest('easy');
      const medBest = window.leaderboardMgr.getPersonalBest('medium');
      const hardBest = window.leaderboardMgr.getPersonalBest('hard');
      const dailyBest = window.leaderboardMgr.getPersonalBest('daily');

      if (this.dom.bestEasy) this.dom.bestEasy.textContent = `Best: ${easyBest.toLocaleString()}`;
      if (this.dom.bestMedium) this.dom.bestMedium.textContent = `Best: ${medBest.toLocaleString()}`;
      if (this.dom.bestHard) this.dom.bestHard.textContent = `Best: ${hardBest.toLocaleString()}`;

      if (this.dom.menuDailyBest) {
        this.dom.menuDailyBest.textContent = dailyBest > 0 ? `${dailyBest.toLocaleString()} PTS` : '--';
      }

      if (this.dom.dailyDateTitle) {
        this.dom.dailyDateTitle.textContent = `Daily: ${window.leaderboardMgr.getFormattedToday()}`;
      }
    }
  }

  bindEvents() {
    // 1. Difficulty Buttons
    const diffButtons = document.querySelectorAll('.diff-btn');
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        window.soundCtrl.playClick();
        diffButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedDifficulty = btn.getAttribute('data-diff');
        this.isDailyChallenge = false;
      });
    });

    // 2. Daily Challenge Card
    const btnDailyCard = document.getElementById('btnDailyCard');
    const btnDailyNav = document.getElementById('btnDailyNav');
    const triggerDaily = () => {
      window.soundCtrl.playClick();
      this.isDailyChallenge = true;
      this.selectedDifficulty = 'daily';
      diffButtons.forEach(b => b.classList.remove('selected'));
      this.startCountdown();
    };
    if (btnDailyCard) btnDailyCard.addEventListener('click', triggerDaily);
    if (btnDailyNav) btnDailyNav.addEventListener('click', triggerDaily);

    // 3. Start Game Button
    const btnStartGame = document.getElementById('btnStartGame');
    if (btnStartGame) {
      btnStartGame.addEventListener('click', () => {
        window.soundCtrl.playClick();
        this.startCountdown();
      });
    }

    // 4. In-Game Canvas Pointer/Touch Input
    this.canvas.addEventListener('pointerdown', (e) => this.handleCanvasTap(e), { passive: false });

    // 5. In-Game Pause & Pause Screen Controls
    const btnPause = document.getElementById('btnPause');
    if (btnPause) {
      btnPause.addEventListener('click', (e) => {
        e.stopPropagation();
        window.soundCtrl.playClick();
        this.pauseGame();
      });
    }

    const btnResumeGame = document.getElementById('btnResumeGame');
    if (btnResumeGame) {
      btnResumeGame.addEventListener('click', () => {
        window.soundCtrl.playClick();
        this.resumeGame();
      });
    }

    const btnRestartFromPause = document.getElementById('btnRestartFromPause');
    if (btnRestartFromPause) {
      btnRestartFromPause.addEventListener('click', () => {
        window.soundCtrl.playClick();
        this.startCountdown();
      });
    }

    const btnQuitToMenu = document.getElementById('btnQuitToMenu');
    if (btnQuitToMenu) {
      btnQuitToMenu.addEventListener('click', () => {
        window.soundCtrl.playClick();
        this.showMenu();
      });
    }

    // 6. Game Over Controls
    const btnRestartGame = document.getElementById('btnRestartGame');
    if (btnRestartGame) {
      btnRestartGame.addEventListener('click', () => {
        window.soundCtrl.playClick();
        this.startCountdown();
      });
    }

    const btnGoMenu = document.getElementById('btnGoMenu');
    if (btnGoMenu) {
      btnGoMenu.addEventListener('click', () => {
        window.soundCtrl.playClick();
        this.showMenu();
      });
    }

    const btnGoLeaderboard = document.getElementById('btnGoLeaderboard');
    if (btnGoLeaderboard) {
      btnGoLeaderboard.addEventListener('click', () => {
        window.soundCtrl.playClick();
        this.openLeaderboard('arcade');
      });
    }

    // 7. WhatsApp Share
    const btnWhatsappShare = document.getElementById('btnWhatsappShare');
    if (btnWhatsappShare) {
      btnWhatsappShare.addEventListener('click', () => {
        window.soundCtrl.playClick();
        if (this.currentEndStats && window.leaderboardMgr) {
          window.leaderboardMgr.shareOnWhatsApp(this.currentEndStats);
        }
      });
    }

    // 8. Player Name Save Tag
    const btnSaveScore = document.getElementById('btnSaveScore');
    if (btnSaveScore) {
      btnSaveScore.addEventListener('click', () => {
        window.soundCtrl.playClick();
        this.saveCurrentPlayerScore();
      });
    }

    // 9. Sound Toggle Button
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        window.soundCtrl.toggleMute();
        this.updateSoundIcon();
      });
    }

    // 10. Header Navigation & Modals
    const btnLeaderboardNav = document.getElementById('btnLeaderboardNav');
    const btnOpenLeaderboard = document.getElementById('btnOpenLeaderboard');
    if (btnLeaderboardNav) btnLeaderboardNav.addEventListener('click', () => this.openLeaderboard('arcade'));
    if (btnOpenLeaderboard) btnOpenLeaderboard.addEventListener('click', () => this.openLeaderboard('arcade'));

    const btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
    const btnDoneLeaderboard = document.getElementById('btnDoneLeaderboard');
    if (btnCloseLeaderboard) btnCloseLeaderboard.addEventListener('click', () => this.closeModal('modalLeaderboard'));
    if (btnDoneLeaderboard) btnDoneLeaderboard.addEventListener('click', () => this.closeModal('modalLeaderboard'));

    const btnHelpNav = document.getElementById('btnHelpNav');
    const btnHowToPlay = document.getElementById('btnHowToPlay');
    if (btnHelpNav) btnHelpNav.addEventListener('click', () => this.openHelp());
    if (btnHowToPlay) btnHowToPlay.addEventListener('click', () => this.openHelp());

    const btnCloseHelp = document.getElementById('btnCloseHelp');
    const btnDoneHelp = document.getElementById('btnDoneHelp');
    if (btnCloseHelp) btnCloseHelp.addEventListener('click', () => this.closeModal('modalHelp'));
    if (btnDoneHelp) btnDoneHelp.addEventListener('click', () => this.closeModal('modalHelp'));

    // 11. Leaderboard Tabs & Filters
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        window.soundCtrl.playClick();
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        this.renderLeaderboardTable(tab);
      });
    });

    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        window.soundCtrl.playClick();
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const mode = pill.getAttribute('data-filter');
        this.renderLeaderboardTable('arcade', mode);
      });
    });

    const btnResetLeaderboard = document.getElementById('btnResetLeaderboard');
    if (btnResetLeaderboard) {
      btnResetLeaderboard.addEventListener('click', () => {
        if (confirm("Reset Hall of Fame scores to arcade defaults?")) {
          window.soundCtrl.playClick();
          window.leaderboardMgr.resetHallOfFame();
          this.renderLeaderboardTable('arcade');
        }
      });
    }

    // Logo click returns to menu
    const logoHeader = document.getElementById('logoHeader');
    if (logoHeader) {
      logoHeader.addEventListener('click', () => {
        if (this.state !== 'PLAYING') {
          this.showMenu();
        }
      });
    }
  }

  showMenu() {
    this.state = 'MENU';
    this.dom.screenMenu.classList.add('active');
    this.dom.screenMenu.classList.remove('hidden');
    this.dom.screenCountdown.classList.remove('active');
    this.dom.screenCountdown.classList.add('hidden');
    this.dom.screenGameOver.classList.remove('active');
    this.dom.screenGameOver.classList.add('hidden');
    this.dom.screenPause.classList.remove('active');
    this.dom.screenPause.classList.add('hidden');
    this.dom.hud.classList.add('hidden');
    this.dom.freezeOverlay.classList.add('hidden');
    this.dom.frenzyBanner.classList.add('hidden');
    this.updateMenuBests();
  }

  startCountdown() {
    this.state = 'COUNTDOWN';
    this.dom.screenMenu.classList.remove('active');
    this.dom.screenMenu.classList.add('hidden');
    this.dom.screenGameOver.classList.add('hidden');
    this.dom.screenPause.classList.add('hidden');
    this.dom.screenCountdown.classList.remove('hidden');
    this.dom.screenCountdown.classList.add('active');

    const modeName = this.isDailyChallenge ? 'DAILY CHALLENGE' : `${this.selectedDifficulty.toUpperCase()} MODE`;
    this.dom.countdownModeText.textContent = modeName;

    // Set PRNG: deterministic for Daily, standard for normal
    if (this.isDailyChallenge) {
      const todayKey = window.leaderboardMgr.getTodayKey();
      const seed = stringToSeed(todayKey);
      this.rng = createSeededRandom(seed);
    } else {
      this.rng = Math.random;
    }

    let count = 3;
    this.dom.countdownNumber.textContent = count;
    window.soundCtrl.playCountBeep(false);

    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.dom.countdownNumber.textContent = count;
        window.soundCtrl.playCountBeep(false);
      } else if (count === 0) {
        this.dom.countdownNumber.textContent = 'GO!';
        window.soundCtrl.playCountBeep(true);
      } else {
        clearInterval(countInterval);
        this.dom.screenCountdown.classList.remove('active');
        this.dom.screenCountdown.classList.add('hidden');
        this.startGameplay();
      }
    }, 850);
  }

  startGameplay() {
    this.state = 'PLAYING';
    this.dom.hud.classList.remove('hidden');

    // Reset Metrics
    this.score = 0;
    this.timeRemaining = this.GAME_DURATION;
    this.totalTaps = 0;
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.freezeTimer = 0;
    this.shakeIntensity = 0;
    this.shakeTime = 0;
    this.lastTickTime = Math.ceil(this.GAME_DURATION);

    this.targets = [];
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.spawnTimer = 0;

    this.updateHUD();

    // Initial Targets Spawn
    const preset = this.DIFFICULTIES[this.selectedDifficulty];
    for (let i = 0; i < 3; i++) {
      this.spawnTarget();
    }
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.dom.pauseScore.textContent = this.score.toLocaleString();
    this.dom.pauseTime.textContent = `${this.timeRemaining.toFixed(1)}s`;
    this.dom.screenPause.classList.remove('hidden');
    this.dom.screenPause.classList.add('active');
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.dom.screenPause.classList.add('hidden');
    this.dom.screenPause.classList.remove('active');
    this.lastFrameTime = performance.now();
  }

  endGame() {
    this.state = 'GAMEOVER';
    this.dom.hud.classList.add('hidden');
    this.dom.freezeOverlay.classList.add('hidden');
    this.dom.frenzyBanner.classList.add('hidden');

    const accuracy = this.totalTaps > 0 ? (this.hits / this.totalTaps) * 100 : 0;
    const mode = this.selectedDifficulty;
    const isHigh = window.leaderboardMgr.isNewPersonalBest(this.score, mode);

    // Save Personal Best
    window.leaderboardMgr.savePersonalBest(this.score, mode);

    // Calculate Grade
    const grade = window.leaderboardMgr.calculateGrade(this.score, accuracy, mode);

    this.currentEndStats = {
      score: this.score,
      accuracy,
      mode,
      maxCombo: this.maxCombo,
      hits: this.hits,
      misses: this.misses,
      grade
    };

    // Play Sound
    window.soundCtrl.playGameOver(isHigh);

    // Populate Game Over Screen
    this.dom.goFinalScore.textContent = this.score.toLocaleString();
    this.dom.goAccuracy.textContent = `${Math.round(accuracy)}%`;
    this.dom.goMaxCombo.textContent = `${this.maxCombo}x`;
    this.dom.goHitsMisses.textContent = `${this.hits} / ${this.misses}`;

    this.dom.rankStamp.textContent = grade.grade;
    this.dom.rankStamp.style.borderColor = grade.color;
    this.dom.rankStamp.style.color = grade.color;
    this.dom.rankLabel.textContent = grade.label;
    this.dom.rankLabel.style.color = grade.color;

    if (isHigh) {
      this.dom.newHighScoreAlert.classList.remove('hidden');
      this.spawnConfetti();
    } else {
      this.dom.newHighScoreAlert.classList.add('hidden');
    }

    // Name tag pre-population
    this.dom.playerNameInput.value = window.leaderboardMgr.getLastPlayerName();
    this.dom.saveConfirmMessage.classList.add('hidden');

    this.dom.screenGameOver.classList.remove('hidden');
    this.dom.screenGameOver.classList.add('active');
  }

  saveCurrentPlayerScore() {
    if (!this.currentEndStats) return;
    const name = this.dom.playerNameInput.value.trim() || 'PLAYER_1';
    window.leaderboardMgr.recordScore({
      name,
      score: this.currentEndStats.score,
      accuracy: this.currentEndStats.accuracy,
      mode: this.currentEndStats.mode,
      maxCombo: this.currentEndStats.maxCombo
    });

    this.dom.saveConfirmMessage.classList.remove('hidden');
    setTimeout(() => {
      this.dom.saveConfirmMessage.classList.add('hidden');
    }, 2800);
  }

  // =========================================================================
  // Target Mechanics & Spawning
  // =========================================================================

  spawnTarget() {
    const preset = this.DIFFICULTIES[this.selectedDifficulty];
    if (this.targets.length >= preset.maxTargets) return;

    // Determine Type
    const roll = this.rng();
    let type = 'NORMAL';

    if (roll < preset.hazardChance) {
      type = 'BOMB';
    } else if (roll < preset.hazardChance + preset.goldChance) {
      type = 'GOLDEN';
    } else if (roll < preset.hazardChance + preset.goldChance + preset.freezeChance) {
      type = 'FREEZE';
    } else if (roll < preset.hazardChance + preset.goldChance + preset.freezeChance + preset.bossChance) {
      type = 'BOSS';
    } else if (roll < preset.hazardChance + preset.goldChance + preset.freezeChance + preset.bossChance + preset.fastChance) {
      type = 'FAST';
    }

    // Radius
    let radius = preset.targetRadius.min + this.rng() * (preset.targetRadius.max - preset.targetRadius.min);
    if (type === 'FAST') radius *= 0.85;
    if (type === 'BOSS') radius *= 1.35;

    // Position (Safe inside arena borders)
    const padding = radius + 20;
    const x = padding + this.rng() * (this.width - padding * 2);
    const y = padding + this.rng() * (this.height - padding * 2);

    // Speed & Velocity
    // Speed increases as 30-sec timer runs out!
    const timeProgress = (this.GAME_DURATION - this.timeRemaining) / this.GAME_DURATION;
    const timeSpeedMult = 1.0 + timeProgress * 0.75;
    let baseSpeed = preset.baseSpeed * timeSpeedMult;

    if (type === 'FAST') baseSpeed *= 2.1;
    if (type === 'BOSS') baseSpeed *= 0.75;
    if (type === 'GOLDEN') baseSpeed *= 1.25;

    const angle = this.rng() * Math.PI * 2;
    const vx = Math.cos(angle) * baseSpeed;
    const vy = Math.sin(angle) * baseSpeed;

    const target = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x,
      y,
      vx,
      vy,
      radius,
      hitRadius: radius + 14, // Mobile forgiving hitbox
      hp: type === 'BOSS' ? 3 : 1,
      maxHp: type === 'BOSS' ? 3 : 1,
      lifespan: preset.lifespan,
      maxLifespan: preset.lifespan,
      age: 0,
      scale: 0.1, // Spawn pop-in animation
      rotation: 0,
      rotSpeed: (this.rng() - 0.5) * 4,
      points: type === 'BOMB' ? -300 : (type === 'GOLDEN' ? 500 : (type === 'BOSS' ? 600 : (type === 'FAST' ? 250 : (type === 'FREEZE' ? 200 : 100))))
    };

    this.targets.push(target);
  }

  // =========================================================================
  // Tap Handling (Player Interaction)
  // =========================================================================

  handleCanvasTap(e) {
    if (this.state !== 'PLAYING') return;
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const tapY = e.clientY - rect.top;

    this.totalTaps++;

    // Find closest target under tap
    let hitIndex = -1;
    let closestDist = Infinity;

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      const dx = tapX - t.x;
      const dy = tapY - t.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= t.hitRadius && dist < closestDist) {
        hitIndex = i;
        closestDist = dist;
      }
    }

    if (hitIndex !== -1) {
      // Successful Hit!
      const target = this.targets[hitIndex];
      this.handleTargetHit(target, hitIndex, tapX, tapY);
    } else {
      // Missed Tap (empty arena)
      this.handleTapMiss(tapX, tapY);
    }

    this.updateHUD();
  }

  handleTargetHit(target, index, hitX, hitY) {
    // 1. Hazard Bomb
    if (target.type === 'BOMB') {
      this.hits++;
      this.combo = 0; // Combo breaks!
      this.score = Math.max(0, this.score - 300);

      window.soundCtrl.playBomb();
      this.triggerScreenShake(14, 0.35);

      this.spawnExplosion(target.x, target.y, '#ff3344', 24);
      this.addFloatingText('-300 HAZARD!', target.x, target.y, '#ff3344');
      this.addShockwave(target.x, target.y, '#ff3344', target.radius * 2.5);

      this.targets.splice(index, 1);
      return;
    }

    // 2. Boss multi-tap
    if (target.type === 'BOSS' && target.hp > 1) {
      target.hp--;
      this.hits++;
      window.soundCtrl.playBossHit(target.hp);
      this.spawnExplosion(hitX, hitY, '#ff007f', 8);
      this.addFloatingText(`HIT! (${target.hp} LEFT)`, target.x, target.y - 15, '#ff007f');
      target.radius *= 0.92;
      return;
    }

    // 3. Normal / Bonus / Destroyed Target
    this.hits++;
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    const mult = this.getComboMultiplier();
    const pointsGained = target.points * mult;
    this.score += pointsGained;

    // Check combo milestones
    if (this.combo === 5 || this.combo === 10 || this.combo === 20 || this.combo === 35) {
      window.soundCtrl.playComboMilestone();
      this.addFloatingText(`${this.combo}x COMBO RUSH!`, this.width / 2, this.height * 0.3, '#ff007f', 1.4);
    }

    // Type specific mechanics
    if (target.type === 'GOLDEN') {
      window.soundCtrl.playGoldBonus();
      this.spawnExplosion(target.x, target.y, '#ffd700', 30);
      this.addShockwave(target.x, target.y, '#ffd700', target.radius * 3.2);

      // 25% Chance for +2 seconds extra time bonus!
      if (this.rng() < 0.25) {
        this.timeRemaining = Math.min(this.GAME_DURATION, this.timeRemaining + 2.0);
        this.addFloatingText('+2.0s TIME BONUS! ⏳', target.x, target.y - 35, '#ffd700', 1.2);
      } else {
        this.addFloatingText(`+${pointsGained} GOLD!`, target.x, target.y, '#ffd700');
      }
    } else if (target.type === 'FREEZE') {
      window.soundCtrl.playFreeze();
      this.freezeTimer = 3.5; // 3.5 seconds freeze
      this.dom.freezeOverlay.classList.remove('hidden');
      this.spawnExplosion(target.x, target.y, '#38bdf8', 22);
      this.addShockwave(target.x, target.y, '#38bdf8', target.radius * 3);
      this.addFloatingText(`TIME FREEZE! +${pointsGained}`, target.x, target.y, '#38bdf8');
    } else if (target.type === 'BOSS') {
      window.soundCtrl.playHit(this.combo);
      this.spawnExplosion(target.x, target.y, '#ff007f', 32);
      this.addShockwave(target.x, target.y, '#ff007f', target.radius * 4);
      this.addFloatingText(`BOSS SHATTERED! +${pointsGained}`, target.x, target.y, '#ff007f', 1.25);
    } else if (target.type === 'FAST') {
      window.soundCtrl.playHit(this.combo);
      this.spawnExplosion(target.x, target.y, '#00ff88', 20);
      this.addFloatingText(`+${pointsGained} SPEED!`, target.x, target.y, '#00ff88');
    } else {
      // Normal target
      window.soundCtrl.playHit(this.combo);
      this.spawnExplosion(target.x, target.y, '#00f3ff', 16);
      this.addFloatingText(`+${pointsGained}`, target.x, target.y, '#00f3ff');
    }

    this.targets.splice(index, 1);
  }

  handleTapMiss(x, y) {
    this.misses++;
    this.combo = 0; // Combo streak reset
    window.soundCtrl.playMiss();

    // Spawn miss ring
    this.addShockwave(x, y, 'rgba(255, 255, 255, 0.4)', 28);
    this.addFloatingText('MISS!', x, y - 10, '#94a3b8', 0.9);
  }

  getComboMultiplier() {
    if (this.combo >= 35) return 5;
    if (this.combo >= 20) return 4;
    if (this.combo >= 10) return 3;
    if (this.combo >= 5) return 2;
    return 1;
  }

  triggerScreenShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeTime = duration;
  }

  // =========================================================================
  // Particle & Visual FX System
  // =========================================================================

  spawnExplosion(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        decay: Math.random() * 1.8 + 1.2,
        gravity: 80
      });
    }
  }

  spawnConfetti() {
    const colors = ['#00f3ff', '#ff007f', '#ffd700', '#00ff88', '#a855f7'];
    for (let i = 0; i < 70; i++) {
      const angle = (Math.PI * 1.2) + Math.random() * (Math.PI * 0.6);
      const speed = Math.random() * 400 + 200;
      this.particles.push({
        x: this.width / 2,
        y: this.height * 0.7,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 150,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.6 + 0.4,
        gravity: 300
      });
    }
  }

  addShockwave(x, y, color, maxRadius) {
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius,
      color,
      alpha: 0.9,
      speed: (maxRadius - 4) * 3.5
    });
  }

  addFloatingText(text, x, y, color = '#00f3ff', scale = 1.0) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      scale,
      alpha: 1,
      vy: -55,
      life: 0.75
    });
  }

  // =========================================================================
  // Game Loop (Update & Render)
  // =========================================================================

  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  update(dt) {
    // 1. Ambient Background Stars
    for (let s of this.ambientStars) {
      s.y -= s.speed;
      if (s.y < 0) s.y = window.innerHeight;
    }

    if (this.state !== 'PLAYING') return;

    // 2. Countdown Timer
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    // Audio tick every full second
    const currentSecond = Math.ceil(this.timeRemaining);
    if (currentSecond < this.lastTickTime) {
      this.lastTickTime = currentSecond;
      if (this.timeRemaining <= 5 && this.timeRemaining > 0) {
        window.soundCtrl.playTick(true);
      } else if (this.timeRemaining <= 10 && this.timeRemaining > 0) {
        window.soundCtrl.playTick(false);
      }
    }

    if (this.timeRemaining <= 0) {
      this.endGame();
      return;
    }

    // 3. Freeze & Frenzy Status
    let speedScale = 1.0;
    if (this.freezeTimer > 0) {
      this.freezeTimer = Math.max(0, this.freezeTimer - dt);
      speedScale = 0.35; // Slow down targets by 65%
      if (this.freezeTimer <= 0) {
        this.dom.freezeOverlay.classList.add('hidden');
      }
    }

    // Frenzy banner during final 10s
    if (this.timeRemaining <= 10 && !this.freezeTimer) {
      this.dom.frenzyBanner.classList.remove('hidden');
    } else {
      this.dom.frenzyBanner.classList.add('hidden');
    }

    // 4. Screen Shake
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeIntensity = 0;
    }

    // 5. Target Spawning
    const preset = this.DIFFICULTIES[this.selectedDifficulty];
    const timeProgress = (this.GAME_DURATION - this.timeRemaining) / this.GAME_DURATION;
    const currentSpawnInterval = Math.max(380, preset.spawnInterval * (1.0 - timeProgress * 0.45));

    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= currentSpawnInterval) {
      this.spawnTimer = 0;
      this.spawnTarget();
    }

    // 6. Update Targets Physics & Lifespan
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];

      // Pop-in scale animation
      if (t.scale < 1) {
        t.scale = Math.min(1, t.scale + dt * 6);
      }

      // Age & Lifespan
      t.age += dt;
      if (t.age >= t.lifespan) {
        this.targets.splice(i, 1);
        continue;
      }

      // Movement & Wall Bounce
      t.x += t.vx * speedScale * dt;
      t.y += t.vy * speedScale * dt;
      t.rotation += t.rotSpeed * dt;

      // Zig-zag sine wave for FAST targets
      if (t.type === 'FAST') {
        t.x += Math.sin(t.age * 9) * 45 * dt;
      }

      // Wall Bouncing
      const pad = t.radius;
      if (t.x < pad) {
        t.x = pad;
        t.vx = Math.abs(t.vx);
      } else if (t.x > this.width - pad) {
        t.x = this.width - pad;
        t.vx = -Math.abs(t.vx);
      }

      if (t.y < pad) {
        t.y = pad;
        t.vy = Math.abs(t.vy);
      } else if (t.y > this.height - pad) {
        t.y = this.height - pad;
        t.vy = -Math.abs(t.vy);
      }
    }

    // 7. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 8. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += s.speed * dt;
      s.alpha = Math.max(0, 1 - (s.radius / s.maxRadius));
      if (s.radius >= s.maxRadius || s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 9. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 0.75);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    this.updateHUD();
  }

  updateHUD() {
    if (!this.dom.hudTimer) return;

    // Timer display
    this.dom.hudTimer.textContent = this.timeRemaining.toFixed(1);
    const progressPct = (this.timeRemaining / this.GAME_DURATION) * 100;
    this.dom.timerProgressBar.style.width = `${progressPct}%`;

    if (this.timeRemaining <= 5) {
      this.dom.hudTimer.classList.add('timer-urgent');
      this.dom.timerProgressBar.style.background = '#ff3344';
    } else {
      this.dom.hudTimer.classList.remove('timer-urgent');
      this.dom.timerProgressBar.style.background = 'linear-gradient(90deg, #00f3ff, #ff007f)';
    }

    // Score
    this.dom.hudScore.textContent = this.score.toLocaleString();

    // Combo
    const mult = this.getComboMultiplier();
    this.dom.hudCombo.textContent = `x${mult}`;
    if (this.combo >= 5) {
      this.dom.hud.querySelector('.hud-combo-box').classList.add('combo-active');
    } else {
      this.dom.hud.querySelector('.hud-combo-box').classList.remove('combo-active');
    }

    // Accuracy
    const acc = this.totalTaps > 0 ? (this.hits / this.totalTaps) * 100 : 100;
    this.dom.hudAccuracy.textContent = `${Math.round(acc)}%`;
  }

  // =========================================================================
  // Canvas Rendering (Targets, Glows, Particles, HUD)
  // =========================================================================

  render() {
    // 1. Render Ambient Background Canvas
    if (this.bgCtx) {
      this.bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let s of this.ambientStars) {
        this.bgCtx.beginPath();
        this.bgCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        this.bgCtx.fillStyle = s.color;
        this.bgCtx.globalAlpha = s.alpha;
        this.bgCtx.fill();
      }
      this.bgCtx.globalAlpha = 1;
    }

    // 2. Clear Main Game Canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Screen Shake transform
    this.ctx.save();
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.ctx.translate(shakeX, shakeY);
    }

    // Render Shockwaves
    for (let s of this.shockwaves) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = s.color;
      this.ctx.lineWidth = 3;
      this.ctx.globalAlpha = s.alpha;
      this.ctx.shadowColor = s.color;
      this.ctx.shadowBlur = 12;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Render Targets
    for (let t of this.targets) {
      this.renderTarget(t);
    }

    // Render Particles
    for (let p of this.particles) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.restore();
    }

    // Render Floating Text
    for (let ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.font = `900 ${Math.round(20 * ft.scale)}px 'Orbitron', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  renderTarget(t) {
    this.ctx.save();
    this.ctx.translate(t.x, t.y);
    this.ctx.scale(t.scale, t.scale);
    this.ctx.rotate(t.rotation);

    const r = t.radius;

    // Remaining lifespan ring indicator
    const lifeRatio = Math.max(0, 1 - (t.age / t.lifespan));
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifeRatio);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    switch (t.type) {
      case 'NORMAL':
        this.drawNormalTarget(r);
        break;
      case 'FAST':
        this.drawFastTarget(r);
        break;
      case 'GOLDEN':
        this.drawGoldenTarget(r);
        break;
      case 'FREEZE':
        this.drawFreezeTarget(r);
        break;
      case 'BOSS':
        this.drawBossTarget(r, t.hp, t.maxHp);
        break;
      case 'BOMB':
        this.drawBombTarget(r);
        break;
    }

    this.ctx.restore();
  }

  drawNormalTarget(r) {
    const grad = this.ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#00f3ff');
    grad.addColorStop(1, 'rgba(0, 243, 255, 0.2)');

    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 16;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    this.ctx.strokeStyle = '#00f3ff';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // Inner cross
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-r * 0.45, 0);
    this.ctx.lineTo(r * 0.45, 0);
    this.ctx.moveTo(0, -r * 0.45);
    this.ctx.lineTo(0, r * 0.45);
    this.ctx.stroke();
  }

  drawFastTarget(r) {
    const grad = this.ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ffd700');
    grad.addColorStop(1, 'rgba(255, 215, 0, 0.25)');

    this.ctx.shadowColor = '#ffd700';
    this.ctx.shadowBlur = 18;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Speed Chevron Symbol
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.moveTo(-r * 0.35, -r * 0.4);
    this.ctx.lineTo(r * 0.4, 0);
    this.ctx.lineTo(-r * 0.35, r * 0.4);
    this.ctx.lineTo(-r * 0.1, 0);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawGoldenTarget(r) {
    const grad = this.ctx.createRadialGradient(0, 0, 3, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#ffbb00');
    grad.addColorStop(1, 'rgba(255, 170, 0, 0.3)');

    this.ctx.shadowColor = '#ffbb00';
    this.ctx.shadowBlur = 24;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // 5-Pointed Star
    this.drawStar(0, 0, 5, r * 0.75, r * 0.38, '#ffffff');
  }

  drawFreezeTarget(r) {
    const grad = this.ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.25)');

    this.ctx.shadowColor = '#38bdf8';
    this.ctx.shadowBlur = 18;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // Snowflake arms
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, -r * 0.55);
      this.ctx.lineTo(0, r * 0.55);
      this.ctx.stroke();
      this.ctx.rotate(Math.PI / 3);
    }
  }

  drawBossTarget(r, hp, maxHp) {
    const grad = this.ctx.createRadialGradient(0, 0, 3, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#ff007f');
    grad.addColorStop(1, 'rgba(255, 0, 127, 0.35)');

    this.ctx.shadowColor = '#ff007f';
    this.ctx.shadowBlur = 22;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ff007f';
    this.ctx.lineWidth = 3.5;
    this.ctx.stroke();

    // Multi-tap health dots
    const dotRadius = 4;
    const spacing = 12;
    const startX = -((maxHp - 1) * spacing) / 2;
    for (let i = 0; i < maxHp; i++) {
      this.ctx.beginPath();
      this.ctx.arc(startX + i * spacing, 0, dotRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = i < hp ? '#ffffff' : 'rgba(255, 255, 255, 0.2)';
      this.ctx.fill();
    }
  }

  drawBombTarget(r) {
    const grad = this.ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ff3344');
    grad.addColorStop(1, 'rgba(255, 51, 68, 0.35)');

    this.ctx.shadowColor = '#ff3344';
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ff3344';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Hazard X / Skull Symbol
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3.5;
    this.ctx.beginPath();
    const d = r * 0.45;
    this.ctx.moveTo(-d, -d);
    this.ctx.lineTo(d, d);
    this.ctx.moveTo(d, -d);
    this.ctx.lineTo(-d, d);
    this.ctx.stroke();
  }

  drawStar(cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }
    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  // =========================================================================
  // Modals & Leaderboard Rendering
  // =========================================================================

  openLeaderboard(defaultTab = 'arcade') {
    if (this.state === 'PLAYING') this.pauseGame();
    this.dom.modalLeaderboard.classList.remove('hidden');

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === defaultTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.renderLeaderboardTable(defaultTab);
  }

  renderLeaderboardTable(tab = 'arcade', filterMode = 'all') {
    const filtersRow = document.getElementById('leaderboardFilters');
    if (tab === 'daily') {
      filtersRow.style.display = 'none';
    } else {
      filtersRow.style.display = 'flex';
    }

    let records = [];
    if (tab === 'daily') {
      records = window.leaderboardMgr.getDailyLeaderboard();
    } else {
      records = window.leaderboardMgr.getArcadeLeaderboard(filterMode);
    }

    this.dom.leaderboardBody.innerHTML = '';
    if (!records || records.length === 0) {
      this.dom.leaderboardEmpty.classList.remove('hidden');
      return;
    }

    this.dom.leaderboardEmpty.classList.add('hidden');
    records.forEach((rec, idx) => {
      const tr = document.createElement('tr');
      const rankClass = idx === 0 ? 'rank-top-1' : (idx === 1 ? 'rank-top-2' : (idx === 2 ? 'rank-top-3' : ''));
      tr.innerHTML = `
        <td class="col-rank ${rankClass}">${idx + 1}</td>
        <td class="col-name ${rankClass}">${escapeHtml(rec.name)}</td>
        <td class="col-score">${rec.score.toLocaleString()}</td>
        <td class="col-acc">${rec.accuracy}%</td>
        <td class="col-diff">${rec.mode}</td>
      `;
      this.dom.leaderboardBody.appendChild(tr);
    });
  }

  openHelp() {
    if (this.state === 'PLAYING') this.pauseGame();
    this.dom.modalHelp.classList.remove('hidden');
  }

  closeModal(modalId) {
    window.soundCtrl.playClick();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

// Expose globally
window.TapRushGame = TapRushGame;

// Bootstrap Game safely whether DOM is loading or already loaded
function initTapRushGame() {
  if (!window.tapRushGame) {
    window.tapRushGame = new TapRushGame();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTapRushGame);
} else {
  initTapRushGame();
}

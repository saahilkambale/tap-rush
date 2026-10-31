/**
 * TAP RUSH — Leaderboard, Personal Bests, Daily Challenge & WhatsApp Sharing
 */

const memoryStore = {};
function safeStorageGet(key) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : (memoryStore[key] || null);
  } catch (e) {
    return memoryStore[key] || null;
  }
}

function safeStorageSet(key, val) {
  memoryStore[key] = String(val);
  try {
    localStorage.setItem(key, String(val));
  } catch (e) {
    // Memory store handles fallback
  }
}

class LeaderboardManager {
  constructor() {
    this.DEFAULT_PLAYERS = [
      { name: "CYBER_ACE", score: 14850, accuracy: 96, mode: "hard", date: "2026-10-28" },
      { name: "NEON_VIPER", score: 12200, accuracy: 92, mode: "hard", date: "2026-10-29" },
      { name: "TURBO_KID", score: 10400, accuracy: 94, mode: "medium", date: "2026-10-30" },
      { name: "PIXEL_GLOW", score: 9150, accuracy: 89, mode: "medium", date: "2026-10-27" },
      { name: "GRID_RUNNER", score: 8300, accuracy: 91, mode: "hard", date: "2026-10-29" },
      { name: "SYNTH_WAVE", score: 7650, accuracy: 88, mode: "medium", date: "2026-10-26" },
      { name: "FLASH_TAP", score: 6900, accuracy: 95, mode: "easy", date: "2026-10-30" },
      { name: "COSMIC_RAY", score: 5800, accuracy: 85, mode: "easy", date: "2026-10-25" },
      { name: "NOVA_BLAZE", score: 5100, accuracy: 82, mode: "easy", date: "2026-10-24" },
      { name: "RETRO_BOT", score: 4500, accuracy: 80, mode: "easy", date: "2026-10-23" }
    ];

    this.initStorage();
  }

  getTodayKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getFormattedToday() {
    const d = new Date();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options).toUpperCase();
  }

  initStorage() {
    try {
      // 1. Check Hall of Fame
      if (!safeStorageGet('tap_rush_hall_of_fame')) {
        this.resetHallOfFame();
      }

      // 2. Check Daily Leaderboard for today
      const todayKey = this.getTodayKey();
      const dailyKey = `tap_rush_daily_board_${todayKey}`;
      if (!safeStorageGet(dailyKey)) {
        this.initDailyLeaderboard(dailyKey);
      }
    } catch (e) {
      console.warn("Storage init notice:", e);
    }
  }

  resetHallOfFame() {
    safeStorageSet('tap_rush_hall_of_fame', JSON.stringify(this.DEFAULT_PLAYERS));
  }

  initDailyLeaderboard(dailyKey) {
    const today = this.getTodayKey();
    const dailyDefaults = [
      { name: "DAILY_TITAN", score: 11900, accuracy: 95, mode: "daily", date: today },
      { name: "SOLAR_TAP", score: 10150, accuracy: 91, mode: "daily", date: today },
      { name: "SPEED_GHOST", score: 8750, accuracy: 89, mode: "daily", date: today },
      { name: "CHRONO_X", score: 7300, accuracy: 87, mode: "daily", date: today },
      { name: "VAPOR_PRO", score: 6100, accuracy: 84, mode: "daily", date: today }
    ];
    safeStorageSet(dailyKey, JSON.stringify(dailyDefaults));
  }

  // Get Personal Best for a specific mode
  getPersonalBest(mode = 'medium') {
    try {
      if (mode === 'daily') {
        const todayKey = this.getTodayKey();
        return parseInt(safeStorageGet(`tap_rush_daily_best_${todayKey}`) || '0', 10);
      }
      return parseInt(safeStorageGet(`tap_rush_best_${mode}`) || '0', 10);
    } catch (e) {
      return 0;
    }
  }

  // Get overall highest personal score across all modes
  getOverallBest() {
    const easy = this.getPersonalBest('easy');
    const medium = this.getPersonalBest('medium');
    const hard = this.getPersonalBest('hard');
    const daily = this.getPersonalBest('daily');
    return Math.max(easy, medium, hard, daily);
  }

  // Check if current score is a new personal best for the mode
  isNewPersonalBest(score, mode) {
    if (score <= 0) return false;
    const currentBest = this.getPersonalBest(mode);
    return score > currentBest;
  }

  // Save personal best
  savePersonalBest(score, mode) {
    try {
      if (mode === 'daily') {
        const todayKey = this.getTodayKey();
        const currentBest = this.getPersonalBest('daily');
        if (score > currentBest) {
          safeStorageSet(`tap_rush_daily_best_${todayKey}`, score.toString());
        }
      } else {
        const currentBest = this.getPersonalBest(mode);
        if (score > currentBest) {
          safeStorageSet(`tap_rush_best_${mode}`, score.toString());
        }
      }
    } catch (e) {
      console.warn("Could not save personal best:", e);
    }
  }

  // Get Last Saved Player Name
  getLastPlayerName() {
    return safeStorageGet('tap_rush_player_tag') || 'PLAYER_1';
  }

  // Save Player Name
  savePlayerName(name) {
    const cleanName = (name || 'PLAYER_1').trim().toUpperCase().slice(0, 12);
    safeStorageSet('tap_rush_player_tag', cleanName);
    return cleanName;
  }

  // Record a score in Leaderboards (Arcade or Daily)
  recordScore({ name, score, accuracy, mode, maxCombo }) {
    const cleanName = this.savePlayerName(name);
    const dateStr = this.getTodayKey();
    const entry = {
      name: cleanName,
      score,
      accuracy: Math.round(accuracy),
      mode,
      maxCombo,
      date: dateStr
    };

    try {
      if (mode === 'daily') {
        const dailyKey = `tap_rush_daily_board_${dateStr}`;
        let list = [];
        try {
          list = JSON.parse(safeStorageGet(dailyKey)) || [];
        } catch (e) {
          list = [];
        }
        list.push(entry);
        list.sort((a, b) => b.score - a.score);
        list = list.slice(0, 10);
        safeStorageSet(dailyKey, JSON.stringify(list));
      } else {
        let list = [];
        try {
          list = JSON.parse(safeStorageGet('tap_rush_hall_of_fame')) || [];
        } catch (e) {
          list = [];
        }
        list.push(entry);
        list.sort((a, b) => b.score - a.score);
        list = list.slice(0, 15);
        safeStorageSet('tap_rush_hall_of_fame', JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Record score warning:", e);
    }
    return entry;
  }

  // Fetch Arcade Leaderboard with optional mode filter
  getArcadeLeaderboard(filterMode = 'all') {
    try {
      let list = JSON.parse(safeStorageGet('tap_rush_hall_of_fame')) || this.DEFAULT_PLAYERS;
      if (filterMode && filterMode !== 'all') {
        list = list.filter(item => item.mode === filterMode);
      }
      return list.slice(0, 10);
    } catch (e) {
      return this.DEFAULT_PLAYERS.slice(0, 10);
    }
  }

  // Fetch Daily Leaderboard
  getDailyLeaderboard() {
    const todayKey = this.getTodayKey();
    const dailyKey = `tap_rush_daily_board_${todayKey}`;
    try {
      let list = JSON.parse(safeStorageGet(dailyKey));
      if (!list || list.length === 0) {
        this.initDailyLeaderboard(dailyKey);
        list = JSON.parse(safeStorageGet(dailyKey));
      }
      return list.slice(0, 10);
    } catch (e) {
      return [];
    }
  }

  // Calculate Rank Grade based on score and accuracy
  calculateGrade(score, accuracy, mode) {
    let sThreshold = 12000;
    let aThreshold = 8500;
    let bThreshold = 5500;
    let cThreshold = 3000;

    if (mode === 'easy') {
      sThreshold = 8000;
      aThreshold = 5500;
      bThreshold = 3500;
      cThreshold = 2000;
    } else if (mode === 'hard') {
      sThreshold = 15000;
      aThreshold = 11000;
      bThreshold = 7500;
      cThreshold = 4500;
    }

    if (score >= sThreshold && accuracy >= 90) {
      return { grade: 'S', label: 'CYBER LEGEND', color: '#ffd700' };
    }
    if (score >= aThreshold && accuracy >= 80) {
      return { grade: 'A', label: 'NEON MASTER', color: '#00f3ff' };
    }
    if (score >= bThreshold) {
      return { grade: 'B', label: 'REFLEX WARRIOR', color: '#00ff88' };
    }
    if (score >= cThreshold) {
      return { grade: 'C', label: 'ARCADE CONTENDER', color: '#a855f7' };
    }
    return { grade: 'D', label: 'ROOKIE TAPPER', color: '#94a3b8' };
  }

  // WhatsApp Score Sharing Builder
  shareOnWhatsApp({ score, accuracy, mode, maxCombo, grade }) {
    const modeUpper = mode.toUpperCase();
    const textLines = [
      `⚡ *TAP RUSH ARCADE CHALLENGE* ⚡`,
      ``,
      `🎮 *Mode:* ${modeUpper}`,
      `🏆 *Score:* ${score.toLocaleString()} PTS`,
      `🎖️ *Rank:* Grade ${grade.grade} (${grade.label})`,
      `🎯 *Accuracy:* ${Math.round(accuracy)}%`,
      `🔥 *Max Combo:* ${maxCombo}x`,
      ``,
      `Think your reflexes are faster? Tap your way to the top! 🚀`,
      `Play TAP RUSH: ${window.location.href}`
    ];

    const shareText = textLines.join('\n');
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    // Try native navigator.share if on mobile and supported, otherwise open WhatsApp link
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      navigator.share({
        title: 'TAP RUSH — Arcade Score Challenge',
        text: shareText,
        url: window.location.href
      }).catch(err => {
        // User cancelled or share failed, fallback to direct WhatsApp URL
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      });
    } else {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

// Global leaderboard instance
window.leaderboardMgr = new LeaderboardManager();

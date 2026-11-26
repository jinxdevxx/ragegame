// =====================================================================
//  RAGEVERSE – Spielstand (localStorage)
// =====================================================================
const KEY = 'rageverse_save_v1';

export function defaultSave() {
  return {
    scrap: 0, totalScrap: 0, chaos: 0, totalChaos: 0, totalKills: 0, upgrades: {}, bestWorld: 0, bestRadius: 0, runs: 0,
    seenVersion: null, muted: false, music: true, tutorial: 0,
    selectedChar: 'grumpf', unlockedChars: ['grumpf'], selectedMap: 'suburb', mapBest: {},
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : null;
    const out = Object.assign(defaultSave(), s || {});
    if (!out.unlockedChars.includes('grumpf')) out.unlockedChars.push('grumpf');
    if (out.bestWorld && !out.mapBest.suburb) out.mapBest.suburb = out.bestWorld; // Stände aus v0.1
    return out;
  } catch { return defaultSave(); }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* privat / blockiert */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch { }
}

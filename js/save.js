// =====================================================================
//  RAGEVERSE – Spielstand (localStorage)
// =====================================================================
const KEY = 'rageverse_save_v1';

export function defaultSave() {
  return { scrap: 0, totalScrap: 0, upgrades: {}, bestWorld: 0, bestRadius: 0, runs: 0, seenVersion: null, muted: false };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : null;
    return Object.assign(defaultSave(), s || {});
  } catch { return defaultSave(); }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* privat / blockiert */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch { }
}

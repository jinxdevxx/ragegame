// Zeichnet alle Monster (Stufe 0, 4, 8 + Berserker) auf ein Blatt → monsters.png
// Vorher im Repo: python3 -m http.server 8080 ; dann: node tools/monster-sheet.cjs [ordner]
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1220 } });
  await p.goto('http://localhost:8080/tools/sheet.html' + (process.argv[3] ? '?skin=' + process.argv[3] : '')); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/monsters' + (process.argv[3] || '') + '.png', fullPage: true }); await b.close();
})();

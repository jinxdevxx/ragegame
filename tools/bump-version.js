// Setzt die Spielversion überall gleichzeitig (Cache-Schutz).
// Aufruf: node tools/bump-version.js 0.2.2
// - version.json
// - alle import-Pfade in js/*.js bekommen "?v=VERSION"
// - index.html: Skript- und CSS-Link bekommen "?v=VERSION"
// So laden Browser nach einem Update garantiert die neuen Dateien.
// (Die Patch Notes in js/patchnotes.js trägst du weiterhin von Hand ein.)
import fs from 'fs';
import path from 'path';

const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('Bitte Version angeben, z. B.: node tools/bump-version.js 0.2.2'); process.exit(1); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
fs.writeFileSync(path.join(root, 'version.json'), `{ "version": "${v}" }\n`);
const jsDir = path.join(root, 'js');
for (const f of fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))) {
  const p = path.join(jsDir, f);
  const src = fs.readFileSync(p, 'utf8');
  const out = src.replace(/from '(\.\/[\w-]+\.js)(\?v=[\d.]+)?'/g, `from '$1?v=${v}'`);
  if (out !== src) fs.writeFileSync(p, out);
}
const html = path.join(root, 'index.html');
fs.writeFileSync(html, fs.readFileSync(html, 'utf8')
  .replace(/src="js\/main\.js(\?v=[\d.]+)?"/, `src="js/main.js?v=${v}"`)
  .replace(/href="css\/style\.css(\?v=[\d.]+)?"/, `href="css/style.css?v=${v}"`));
const pn = fs.readFileSync(path.join(jsDir, 'patchnotes.js'), 'utf8');
if (!pn.includes(`version: '${v}'`)) console.warn(`Achtung: In js/patchnotes.js fehlt noch ein Eintrag für v${v}.`);
console.log(`Version ${v} gesetzt.`);

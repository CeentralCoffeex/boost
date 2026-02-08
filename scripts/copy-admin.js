/**
 * Copie le build de l'app admin (src/app/administration/dist) vers public/administration.
 * À exécuter après "npm run build" dans src/app/administration.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const src = path.join(root, 'src', 'app', 'administration', 'dist');
const dest = path.join(root, 'public', 'administration');

if (!fs.existsSync(src)) {
  console.error('Erreur: src/app/administration/dist introuvable. Lancez d\'abord le build admin.');
  process.exit(1);
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((f) => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) rmDir(full);
    else fs.unlinkSync(full);
  });
  fs.rmdirSync(dir);
}

function copyDir(a, b) {
  fs.mkdirSync(b, { recursive: true });
  fs.readdirSync(a).forEach((f) => {
    const s = path.join(a, f);
    const t = path.join(b, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, t);
    else fs.copyFileSync(s, t);
  });
}

rmDir(dest);
copyDir(src, dest);
console.log('Admin copié dans public/administration (Profil + Catégories dans le menu).');

/*
 Copia templates HTML e assets (logo etc.) para a pasta dist,
 garantindo que o PdfGenerator encontre os arquivos em tempo de execução.
*/

const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

const projectRoot = process.cwd();
const srcTemplates = path.join(projectRoot, 'src', 'modules', '6-generation', 'templates');
const distTemplates = path.join(projectRoot, 'dist', 'src', 'modules', '6-generation', 'templates');

copyDir(srcTemplates, distTemplates);

console.log(`[copy-assets] Templates copiados de ${srcTemplates} para ${distTemplates}`);

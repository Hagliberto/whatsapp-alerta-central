import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const chromeManifest = readJson('manifest.json');
const firefoxManifest = readJson('manifest.firefox.json');
const fail = (msg) => { throw new Error(msg); };

if (chromeManifest.version !== firefoxManifest.version) fail('Versões dos manifests são diferentes.');
if (chromeManifest.author !== 'Hagliberto Alves de Oliveira') fail('Autor ausente no Manifest Chrome/Edge.');
if (firefoxManifest.author !== 'Hagliberto Alves de Oliveira') fail('Autor ausente no Manifest Firefox.');
if (chromeManifest.background?.service_worker !== 'background.js') fail('Chrome/Edge precisa usar background.service_worker.');
if (chromeManifest.background?.scripts) fail('Chrome/Edge não deve usar background.scripts.');
if (!Array.isArray(firefoxManifest.background?.scripts) || firefoxManifest.background.scripts[0] !== 'background.js') fail('Firefox precisa usar background.scripts.');
if (firefoxManifest.background?.service_worker) fail('Firefox não deve conter background.service_worker.');
if (!firefoxManifest.browser_specific_settings?.gecko?.id) fail('Firefox precisa de Gecko ID.');
const data = firefoxManifest.browser_specific_settings?.gecko?.data_collection_permissions?.required || [];
if (data.length !== 1 || data[0] !== 'none') fail('Firefox precisa declarar data_collection_permissions.required=["none"].');

const jsFiles = ['background.js','content-ui.js','content-whatsapp.js','options.js','pending.js','popup.js'];
for (const file of jsFiles) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) fail(`Arquivo ausente: ${file}`);
  execFileSync(process.execPath, ['--check', full], { stdio: 'inherit' });
}

const referenced = new Set();
for (const manifest of [chromeManifest, firefoxManifest]) {
  if (manifest.background?.service_worker) referenced.add(manifest.background.service_worker);
  for (const f of manifest.background?.scripts || []) referenced.add(f);
  if (manifest.action?.default_popup) referenced.add(manifest.action.default_popup);
  if (manifest.options_page) referenced.add(manifest.options_page);
  for (const cs of manifest.content_scripts || []) {
    for (const f of cs.js || []) referenced.add(f);
    for (const f of cs.css || []) referenced.add(f);
  }
  for (const f of Object.values(manifest.icons || {})) referenced.add(f);
}
for (const f of referenced) {
  if (!fs.existsSync(path.join(root, f))) fail(`Manifest referencia arquivo ausente: ${f}`);
}

const bg = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
if (!bg.includes('globalThis.browser') || !bg.includes('globalThis.chrome')) fail('Camada de compatibilidade de navegador ausente no background.');

console.log(`OK - WhatsApp Alerta Central v${chromeManifest.version}`);
console.log('OK - Chrome/Edge: service worker');
console.log('OK - Firefox: background scripts + Gecko ID + data collection none');
console.log('OK - JavaScript e referências de Manifest validados');

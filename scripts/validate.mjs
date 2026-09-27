import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3) throw new Error('manifest_version deve ser 3');
if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? '')) throw new Error('version inválida no manifest');

const required = [
  'manifest.json', 'background.js', 'content-whatsapp.js', 'content-ui.js',
  'content-ui.css', 'popup.html', 'popup.js', 'options.html', 'options.js',
  'README.md', 'AGENTS.md', 'PRIVACIDADE.md'
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Arquivo obrigatório ausente: ${file}`);
}

const jsFiles = fs.readdirSync(root).filter(f => f.endsWith('.js'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Falha de sintaxe em ${file}:\n${result.stderr}`);
}

const refs = [];
if (manifest.background?.service_worker) refs.push(manifest.background.service_worker);
if (manifest.action?.default_popup) refs.push(manifest.action.default_popup);
if (manifest.options_page) refs.push(manifest.options_page);
for (const cs of manifest.content_scripts ?? []) {
  refs.push(...(cs.js ?? []), ...(cs.css ?? []));
}
for (const icon of Object.values(manifest.icons ?? {})) refs.push(icon);
for (const ref of refs) {
  if (!fs.existsSync(path.join(root, ref))) throw new Error(`Arquivo referenciado no manifest não existe: ${ref}`);
}

console.log(`OK - WhatsApp Alerta Central v${manifest.version}`);
console.log(`OK - ${jsFiles.length} arquivos JavaScript validados`);
console.log('OK - referências do manifest verificadas');

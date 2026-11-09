'use strict';

/* Gate de merge do MVP (AGENTS.md: "scripts/check — lint + testes + build").
   Zero dependências: só Node padrão. Uso: node scripts/check.js (ou scripts\check.cmd).
   Saída: passo a passo OK/FALHA + exit 1 se algo falhar.
   Pós-pull (nov/2026): o site vive na RAIZ do repositório (o remoto moveu STZ_Frontend/*). */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist'); /* na raiz do repo — .gitignore já cobre dist/ */
const PAGINAS = ['index.html', 'painel.html', 'ordens.html', 'resultado.html', 'estoque.html', 'permissoes.html', 'tablet.html'];

let falhas = 0;
function passo(nome, ok, extra) {
  console.log((ok ? 'OK    ' : 'FALHA ') + nome + (extra ? '  ·  ' + extra : ''));
  if (!ok) falhas++;
}

/* ---------- 1. LINT: sintaxe dos JS ---------- */
for (const arq of ['js/data.js', 'js/logica.js', 'js/app.js', 'testes/logica_testes.js']) {
  const r = spawnSync(process.execPath, ['--check', path.join(RAIZ, arq)], { encoding: 'utf8' });
  passo('lint ' + arq, r.status === 0, (r.stderr || '').trim().split('\n')[0]);
}

/* ---------- 2. TESTES: fonte única testes/logica_testes.js ---------- */
try {
  const codigo = ['js/data.js', 'js/logica.js', 'testes/logica_testes.js']
    .map(a => fs.readFileSync(path.join(RAIZ, a), 'utf8')).join('\n;\n');
  const TESTES = new Function(codigo + '\n;return TESTES;')();
  let f = 0;
  TESTES.forEach(([rot, tst]) => {
    let ok = false;
    try { ok = !!tst(); } catch (e) { ok = false; }
    if (!ok) { f++; console.log('        FAIL - ' + rot); }
  });
  passo('testes de lógica (' + TESTES.length + ' asserts)', f === 0, f ? f + ' falham' : 'todos verdes');
} catch (e) {
  passo('testes de lógica', false, e.message.split('\n')[0]);
}

/* ---------- 3. SITE: HTMLs íntegros e fechados ---------- */
const htmls = {};
let htmlsOk = true;
for (const p of PAGINAS) {
  try { htmls[p] = fs.readFileSync(path.join(RAIZ, p), 'utf8'); }
  catch (e) { htmlsOk = false; passo('html ' + p, false, 'ARQUIVO AUSENTE (404 na sidebar!)'); }
}
if (htmlsOk) {
  /* 3a. divs balanceadas */
  for (const [p, t] of Object.entries(htmls)) {
    const abre = (t.match(/<div\b/g) || []).length, fecha = (t.match(/<\/div>/g) || []).length;
    passo('html ' + p + ' (divs ' + abre + '/' + fecha + ')', abre === fecha);
  }

  /* 3b. scripts inline parseáveis (STZ.boot depende do app.js — checado nos boots) */
  for (const [p, t] of Object.entries(htmls)) {
    const blocos = [...t.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    let ok = true, msg = '';
    blocos.forEach((b, i) => {
      try { new Function(b); } catch (e) { ok = false; msg = p + ' bloco ' + (i + 1) + ': ' + e.message.split('\n')[0]; }
    });
    passo('inline ' + p, ok, msg);
  }

  /* 3c. boots válidos (página ↔ módulo) */
  const MODULOS = ['login', 'painel', 'ordens', 'resultado', 'estoque', 'permissoes', 'tablet'];
  for (const [p, t] of Object.entries(htmls)) {
    const m = t.match(/STZ\.boot\('([a-z]+)',\s*'([a-z]+)'\)/);
    const ok = !!m && m[1] === m[2] && MODULOS.includes(m[1]) && p.replace('.html', '') === (m[1] === 'login' ? 'index' : m[1]);
    passo('boot ' + p, ok, m ? m[0] : 'sem boot');
  }

  /* 3d. IDs usados pelo app.js resolvem nos HTMLs (exceção: criados dinamicamente) */
  const app = fs.readFileSync(path.join(RAIZ, 'js/app.js'), 'utf8');
  const todosHtml = Object.values(htmls).join('\n');
  const ids = [...app.matchAll(/\('#([a-z0-9-]+)'\)/g)].map(m => m[1]);
  /* criados em runtime pelo próprio app (topbar/menu gaveta, toast) */
  const dinamicos = ['toast', 'btn-sair', 'btn-menu'];
  const faltando = [...new Set(ids)].filter(id => !dinamicos.includes(id) && !todosHtml.includes('id="' + id + '"'));
  passo('ids do app.js (' + new Set(ids).size + ' únicos)', faltando.length === 0, faltando.join(', ') || 'todos resolvem');

  /* 3e. offline: nenhum request externo (src/href http) */
  const externos = [...todosHtml.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
  passo('offline (sem requests externos)', externos.length === 0, externos.join(', ') || 'ok');
}

/* ---------- 3f. CSS citado existe ---------- */
for (const c of ['tokens.css', 'base.css', 'components.css']) {
  passo('css ' + c, fs.existsSync(path.join(RAIZ, 'css', c)));
}

/* ---------- 4. BUILD: dist/ pronto para publicar (GitHub Pages) ---------- */
try {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  /* whitelist explícita: 7 páginas + js/ + css/ — nada de docs, testes ou scripts no site publicado */
  for (const p of PAGINAS) fs.copyFileSync(path.join(RAIZ, p), path.join(DIST, p));
  fs.cpSync(path.join(RAIZ, 'js'), path.join(DIST, 'js'), { recursive: true });
  fs.cpSync(path.join(RAIZ, 'css'), path.join(DIST, 'css'), { recursive: true });
  const esperados = [...PAGINAS, 'js/data.js', 'js/logica.js', 'js/app.js',
    'css/tokens.css', 'css/base.css', 'css/components.css'];
  const ausentes = esperados.filter(a => !fs.existsSync(path.join(DIST, a)));
  passo('build dist/ (' + esperados.length + ' arquivos essenciais)', ausentes.length === 0,
    ausentes.length ? 'faltam: ' + ausentes.join(', ') : 'whitelist: só site — pronto para Pages');
} catch (e) {
  passo('build dist/', false, e.message.split('\n')[0]);
}

/* ---------- resumo ---------- */
console.log('');
console.log(falhas === 0 ? 'CHECK VERDE — pode fazer merge.' : 'CHECK VERMELHO — ' + falhas + ' passo(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);

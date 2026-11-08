'use strict';

/* Funcoes puras de negocio — testadas em testes/logica_test.html (T3 do Plan.md). */

function calcularResultadoOP(valorRegistrado, custoMP, custoMO) {
  return valorRegistrado - custoMP - custoMO;
}

function podeAcessar(perfil, modulo) {
  const restritos = ['custos', 'resultados', 'relatorios', 'permissoes'];
  if (perfil === 'administracao') return true;
  if (perfil === 'operador') return restritos.indexOf(modulo) === -1;
  return false;
}

/* Máquina de decisão do login (pura) — usada por app.js.
   estado: {tentativas, bloqueadoAte} · credOk: credênciais corretas? · agora: ms.
   Bloqueio expirado reinicia o contador (antes do fix re-travava na 1ª falha). */
function avaliarLogin(estado, credOk, agora) {
  if (estado.bloqueadoAte > agora) {
    return { ok: false, motivo: 'bloqueado', restanteMs: estado.bloqueadoAte - agora };
  }
  if (credOk) return { ok: true, tentativas: 0 };
  const base = estado.bloqueadoAte > 0 ? 0 : estado.tentativas; /* bloqueio expirou -> zera */
  const t = base + 1;
  if (t >= 3) {
    return { ok: false, motivo: 'bloqueio3', tentativas: t, bloquearAte: agora + 15 * 60 * 1000 };
  }
  return { ok: false, motivo: 'credenciais', tentativas: t };
}

/* Acesso real (F‑2): perfil primeiro — o toggle JAMAIS concede o que o perfil não tem;
   só RESTRINGE (ausente/undefined conta como ligado). */
function acessoEfetivo(perfil, moduloNome, toggles) {
  let perfilBase;
  if (perfil === 'administracao') perfilBase = true;
  else if (perfil === 'operador') perfilBase = !['Custos', 'Relatórios', 'Usuários'].includes(moduloNome);
  else perfilBase = false;
  return perfilBase && toggles[moduloNome] !== false;
}

/* estoque: [{codigo, lote, saldo}] — devolve NOVO array; nunca altera o original. */
function registrarMaterial(estoque, codigoItem, lote, qtd) {
  const novo = estoque.map(function (i) { return { codigo: i.codigo, lote: i.lote, saldo: i.saldo }; });
  const item = novo.filter(function (i) { return i.codigo === codigoItem; })[0];
  if (!item) return { ok: false, motivo: 'item', estoque: novo };
  if (item.lote !== lote) return { ok: false, motivo: 'lote', estoque: novo };
  if (item.saldo < qtd) return { ok: false, motivo: 'saldo', estoque: novo };
  item.saldo -= qtd;
  return { ok: true, motivo: 'ok', estoque: novo };
}

/* Custo de Mão de Obra (Etapa 3/F‑3): Σ valor-hora individual × horas por OP.
   Funcionário sem cadastro contribui 0 (não quebra o relatório). */
function custoMODe(maoDeObra, funcionarios) {
  return (maoDeObra || []).reduce((s, a) => {
    const f = funcionarios.filter(x => x.nome === a.nome)[0];
    return s + (f ? f.valorHora * a.horas : 0);
  }, 0);
}

/* BOM crítica (UC06/Etapa 2): item crítico quando a necessidade da OP não cabe no
   saldo atual (baixa seria recusada — US14). Item fora do estoque conta como saldo 0. */
function avaliarBom(materiais, estoque) {
  const criticos = materiais.map(m => {
    const it = estoque.filter(i => i.codigo === m.codigo)[0];
    const saldo = it ? it.saldo : 0;
    return saldo < m.qtd ? { codigo: m.codigo, necessario: m.qtd, saldo: saldo } : null;
  }).filter(Boolean);
  return { ok: criticos.length === 0, criticos: criticos };
}

/* "ultrapassar em 10%" = estritamente maior que 110% do previsto. */
function deveAlertarTempo(tempoRealSeg, tempoPrevistoSeg) {
  return tempoRealSeg > tempoPrevistoSeg * 1.1;
}

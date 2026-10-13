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

/* "ultrapassar em 10%" = estritamente maior que 110% do previsto. */
function deveAlertarTempo(tempoRealSeg, tempoPrevistoSeg) {
  return tempoRealSeg > tempoPrevistoSeg * 1.1;
}

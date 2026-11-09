'use strict';

/* Fonte única dos testes da lógica pura (T3 do Plan.md) — Etapa 5.
   Consumida por:
   - testes/logica_test.html (navegador: tudo verde = passou)
   - scripts/check.js (gate de merge: node scripts/check.js)
   Cada item: [descrição, função => boolean]. Lógica em ../js/logica.js. */

const estoqueBase = [{ codigo: 'AL-PL-001', lote: 'A12', saldo: 8 }];

const TESTES = [
  ['calcularResultadoOP(10000, 4000, 3500) === 2500', () => calcularResultadoOP(10000, 4000, 3500) === 2500],
  ['calcularResultadoOP(10000, 9000, 2000) === -1000', () => calcularResultadoOP(10000, 9000, 2000) === -1000],
  ['podeAcessar("operador", "custos") === false', () => podeAcessar('operador', 'custos') === false],
  ['podeAcessar("administracao", "permissoes") === true', () => podeAcessar('administracao', 'permissoes') === true],
  ['podeAcessar("operador", "painel") === true', () => podeAcessar('operador', 'painel') === true],
  ['registrarMaterial: baixa ok (saldo 8 -> 5)', () => {
    const r = registrarMaterial(estoqueBase, 'AL-PL-001', 'A12', 3);
    return r.ok === true && r.estoque[0].saldo === 5;
  }],
  ['registrarMaterial: não altera o array original (saldo segue 8)', () => estoqueBase[0].saldo === 8],
  ['registrarMaterial: qtd 20 > saldo -> motivo "saldo"', () => {
    const r = registrarMaterial(estoqueBase, 'AL-PL-001', 'A12', 20);
    return r.ok === false && r.motivo === 'saldo';
  }],
  ['registrarMaterial: lote errado -> motivo "lote"', () => {
    const r = registrarMaterial(estoqueBase, 'AL-PL-001', 'Z99', 1);
    return r.ok === false && r.motivo === 'lote';
  }],
  ['registrarMaterial: código inexistente -> motivo "item"', () => {
    const r = registrarMaterial(estoqueBase, 'XX-000', 'A12', 1);
    return r.ok === false && r.motivo === 'item';
  }],
  ['deveAlertarTempo(111, 100) === true', () => deveAlertarTempo(111, 100) === true],
  ['deveAlertarTempo(110, 100) === false (10% exato não alerta)', () => deveAlertarTempo(110, 100) === false],

  /* avaliarLogin — estado {tentativas, bloqueadoAte}; credOk = credênciais corretas; agora em ms */
  ['avaliarLogin: sucesso zera tentativas', () => {
    const r = avaliarLogin({ tentativas: 2, bloqueadoAte: 0 }, true, 1000);
    return r.ok === true && r.tentativas === 0;
  }],
  ['avaliarLogin: 1ª falha -> tentativas 1', () => {
    const r = avaliarLogin({ tentativas: 0, bloqueadoAte: 0 }, false, 1000);
    return r.ok === false && r.motivo === 'credenciais' && r.tentativas === 1;
  }],
  ['avaliarLogin: 3ª falha -> bloqueio de 15 min', () => {
    const r = avaliarLogin({ tentativas: 2, bloqueadoAte: 0 }, false, 1000);
    return r.motivo === 'bloqueio3' && r.bloquearAte === 1000 + 15 * 60 * 1000;
  }],
  ['avaliarLogin: bloqueio expirado -> 1 falha reinicia contador (não re-trava)', () => {
    const r = avaliarLogin({ tentativas: 3, bloqueadoAte: 900 }, false, 1000);
    return r.motivo === 'credenciais' && r.tentativas === 1 && !r.bloquearAte;
  }],
  ['avaliarLogin: bloqueio ativo nega mesmo com senha correta', () => {
    const r = avaliarLogin({ tentativas: 3, bloqueadoAte: 9999999999 }, true, 1000);
    return r.ok === false && r.motivo === 'bloqueado' && r.restanteMs > 0;
  }],

  /* acessoEfetivo — perfil primeiro (jamais concede), toggle só restringe (F‑2) */
  ['acessoEfetivo: administração acessa Custos sem toggle', () => acessoEfetivo('administracao', 'Custos', {}) === true],
  ['acessoEfetivo: administração restrita por toggle (toggle desligado)', () => acessoEfetivo('administracao', 'Custos', { Custos: false }) === false],
  ['acessoEfetivo: operador NÃO ganha Custos com toggle ligado', () => acessoEfetivo('operador', 'Custos', { Custos: true }) === false],
  ['acessoEfetivo: operador acessa Estoque por padrão', () => acessoEfetivo('operador', 'Estoque', {}) === true],
  ['acessoEfetivo: operador restrito a Estoque com toggle desligado', () => acessoEfetivo('operador', 'Estoque', { Estoque: false }) === false],

  /* custoMODe — MO = Σ valor-hora individual × horas (Etapa 3, F‑3) */
  ['custoMODe: 40h×65 = 2600', () => custoMODe([{ nome: 'João Pedro', horas: 40 }], [{ nome: 'João Pedro', valorHora: 65 }]) === 2600],
  ['custoMODe: soma de 2 operadores = 5000', () => custoMODe([{ nome: 'A', horas: 40 }, { nome: 'B', horas: 40 }], [{ nome: 'A', valorHora: 65 }, { nome: 'B', valorHora: 60 }]) === 5000],
  ['custoMODe: sem cadastro contribui 0', () => custoMODe([{ nome: 'X', horas: 10 }], [{ nome: 'A', valorHora: 65 }]) === 0],
  ['custoMODe: vazio = 0', () => custoMODe([], []) === 0],
  ['custoMODe: não altera o cadastro de funcionários (Etapa 5)', () => {
    const fs2 = [{ nome: 'A', valorHora: 65 }];
    custoMODe([{ nome: 'A', horas: 40 }], fs2);
    return fs2[0].valorHora === 65 && fs2.length === 1;
  }],

  /* avaliarBom — BOM crítica da OP (UC06): crítico = necessidade > saldo ou item ausente */
  ['avaliarBom: ok quando necessidade <= saldo', () => {
    const r = avaliarBom([{ codigo: 'AL-PL-001', qtd: 8 }], [{ codigo: 'AL-PL-001', saldo: 8 }]);
    return r.ok === true && r.criticos.length === 0;
  }],
  ['avaliarBom: saldo < necessidade -> crítico com dados', () => {
    const r = avaliarBom([{ codigo: 'PS-GR-310', qtd: 12 }], [{ codigo: 'PS-GR-310', saldo: 6 }]);
    return r.ok === false && r.criticos[0].codigo === 'PS-GR-310' && r.criticos[0].necessario === 12 && r.criticos[0].saldo === 6;
  }],
  ['avaliarBom: item inexistente -> crítico (saldo 0)', () => {
    const r = avaliarBom([{ codigo: 'XX', qtd: 2 }], []);
    return r.ok === false && r.criticos[0].saldo === 0;
  }],
  ['avaliarBom: vários críticos -> conta todos (Etapa 5)', () => {
    const r = avaliarBom(
      [{ codigo: 'A', qtd: 5 }, { codigo: 'B', qtd: 2 }, { codigo: 'C', qtd: 1 }],
      [{ codigo: 'A', saldo: 1 }, { codigo: 'B', saldo: 9 }]
    );
    return r.ok === false && r.criticos.length === 2 && r.criticos[1].codigo === 'C';
  }],
  ['avaliarBom: estoque original intacto', () => {
    const est = [{ codigo: 'A', saldo: 1 }];
    avaliarBom([{ codigo: 'A', qtd: 5 }], est);
    return est[0].saldo === 1;
  }]
];

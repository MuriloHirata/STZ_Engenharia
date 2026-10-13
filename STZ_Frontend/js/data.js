'use strict';

/* Fixtures de demonstracao (sem back-end). Valores das figuras do PI I
   quando existem; demais valores inventados para o prototipo. */
const STZ_DATA = {
  senha: 'stz@2026',

  usuarios: [
    { usuario: 'isadora', nome: 'Isadora Martins', perfil: 'administracao' },
    { usuario: 'joao.pedro', nome: 'João Pedro', perfil: 'operador' }
  ],

  funcionarios: [
    { nome: 'Isadora Martins', perfil: 'administracao' },
    { nome: 'João Pedro', perfil: 'operador' },
    { nome: 'Murilo Zampieri', perfil: 'operador' },
    { nome: 'Heloisa Soares', perfil: 'administracao' }
  ],

  op: {
    id: '#1024-C',
    produto: 'Tubulação inox 3"',
    quantidade: 12,
    tempoPrevistoSeg: 150,
    orcamento: 10000,
    custoReal: 11200,
    valorRegistrado: 14500,
    custoMP: 6000,
    custoMO: 3000,
    maquina: 'Ponta rolante'
  },

  /* Painel (Figura 4) */
  kpis: { ocupacao: 87, tarefasConcluidas: 42, tarefasTotal: 50, horas: '164h 30m', desvio: -4 },
  serieHora: {
    rotulos: ['08', '10', '12', '14', '15', '16', '17', '18'],
    valores: [0, 30, 40, 58, 50, 68, 72, 90]
  },
  donut: [
    { rot: 'Obra A', pct: 40, cor: 'var(--color-periwinkle)' },
    { rot: 'Planejamento', pct: 30, cor: 'var(--color-teal)' },
    { rot: 'Reuniões', pct: 20, cor: 'var(--color-amber)' },
    { rot: 'Outros', pct: 10, cor: 'var(--color-emerald)' }
  ],
  equipe: [
    { nome: 'Isadora Martins', pct: 85 },
    { nome: 'João Pedro', pct: 55 },
    { nome: 'Murilo Zampieri', pct: 70 },
    { nome: 'Heloisa Soares', pct: 40 }
  ],
  maquinas: [
    { nome: 'Ponta rolante', status: 'producao', desde: '07:00' },
    { nome: 'Guilhotina', status: 'ociosa', motivo: 'Manutenção corretiva', ociosaMin: 105 },
    { nome: 'Torno CNC', status: 'producao', desde: '09:15' },
    { nome: 'Solda MIG', status: 'ociosa', motivo: 'Falta de material', ociosaMin: 35 }
  ],

  /* Estoque (Figura 2) — KPIs conforme a figura */
  estoqueKpis: { baixas: 14230, criticos: '14% - Seguro', alertas: 28 },
  consumo: [
    { rot: '#1024-C', v: 18 }, { rot: '#1025-A', v: 14 },
    { rot: '#1026-B', v: 11 }, { rot: '#1027-C', v: 12 },
    { rot: '#1024-D', v: 7 },  { rot: '#1028-B', v: 3 },
    { rot: '#1029-A', v: 3 },  { rot: '#1030-C', v: 2 }
  ],
  estoqueItens: [
    { codigo: 'CH-3MM-120', desc: 'Chapa carbono 3 mm 1200×2400', lote: 'A12', saldo: 34, min: 20 },
    { codigo: 'AL-PL-001', desc: 'Placa de alumínio de 6 mm', lote: 'A12', saldo: 8, min: 10 },
    { codigo: 'FX-CL-022', desc: 'Clipe de fixação, aço inoxidável', lote: 'B07', saldo: 120, min: 50 },
    { codigo: 'PS-GR-310', desc: 'Junta de silicone de precisão', lote: 'C03', saldo: 6, min: 12 },
    { codigo: 'RD-BT-58', desc: 'Barra de reforço, aço temperado', lote: 'D21', saldo: 4, min: 6 },
    { codigo: 'SV-M6-200', desc: 'Parafuso M6 (200 un)', lote: 'C01', saldo: 900, min: 300 }
  ],

  /* Tablet (Figura 6) */
  materiais: [
    { codigo: 'AL-PL-001', desc: 'Placa de alumínio de 6 mm', lote: 'A12', saldo: 40, qtd: 8 },
    { codigo: 'FX-CL-022', desc: 'Clipe de fixação, aço inoxidável', lote: 'B07', saldo: 120, qtd: 24 },
    { codigo: 'PS-GR-310', desc: 'Junta de silicone de precisão', lote: 'C03', saldo: 30, qtd: 12 },
    { codigo: 'RD-BT-58', desc: 'Barra de reforço, aço temperado', lote: 'D21', saldo: 2, qtd: 4 } /* saldo < necessario: demonstra recusa (US14) */
  ],
  etapas: { atual: 4, total: 12, concluidas: [ { n: 1, seg: 120 }, { n: 2, seg: 90 }, { n: 3, seg: 30 } ] },
  motivosParada: ['Manutenção corretiva', 'Falta de material', 'Setup', 'Falta de operador'],

  /* Permissoes (Figura 3) */
  permissoesModulos: [
    { nome: 'Produção', acoes: ['Listar', 'Apontar etapas', 'Editar', 'Relatórios'] },
    { nome: 'Estoque', acoes: ['Listar', 'Registrar baixa', 'Editar', 'Relatórios'] },
    { nome: 'Custos', acoes: ['Visualizar', 'Editar', 'Resultados por OP'], restrito: true },
    { nome: 'Documentos', acoes: ['Visualizar', 'Editar', 'Baixar'] },
    { nome: 'Relatórios', acoes: ['Gerar', 'Exportar PDF', 'Agendar'], restrito: true },
    { nome: 'Usuários', acoes: ['Listar', 'Editar', 'Permissões'] }
  ]
};

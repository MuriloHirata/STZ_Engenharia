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
    { nome: 'Isadora Martins', perfil: 'administracao', valorHora: 120 },
    { nome: 'João Pedro', perfil: 'operador', valorHora: 65 },
    { nome: 'Murilo Zampieri', perfil: 'operador', valorHora: 60 },
    { nome: 'Heloisa Soares', perfil: 'administracao', valorHora: 110 }
  ],

  /* OPs (UC06/Etapa 2) — dados das figuras quando existem (#1024-C), demais plausíveis.
     BOM: {codigo, qtd} crítica via avaliarBom()/estoque; apontamentos (etapas/concluidas)
     persistem em stz.ops. Etapa 3 (F‑3): custoMO/custoReal NÃO são mais fixtures —
     custoMO = Σ valorHora individual × horas (custoMODe) e custoReal = custoMP + custoMO.
     #1024-C: MO 5.000 (João 40h×65 + Murilo 40h×60), real 11.000 > orçamento (banner UC08),
     resultado +3.500. #1027-C fecha no prejuízo para demonstrar o negativo (UC11). */
  ops: [
    {
      id: '#1024-C', produto: 'Tubulação inox 3"', quantidade: 12,
      tempoPrevistoSeg: 150, orcamento: 10000, valorRegistrado: 14500,
      custoMP: 6000, maquina: 'Ponta rolante',
      maoDeObra: [{ nome: 'João Pedro', horas: 40 }, { nome: 'Murilo Zampieri', horas: 40 }],
      status: 'Em produção',
      materiais: [
        { codigo: 'AL-PL-001', qtd: 8 },
        { codigo: 'FX-CL-022', qtd: 24 },
        { codigo: 'PS-GR-310', qtd: 12 },
        { codigo: 'RD-BT-58', qtd: 4 }
      ],
      etapas: { atual: 4, total: 12, concluidas: [{ n: 1, seg: 120 }, { n: 2, seg: 90 }, { n: 3, seg: 30 }] },
      documentos: [
        { nome: 'Desenho técnico PL-001 rev B', tipo: 'PDF', tamanho: '240 KB' },
        { nome: 'Lista de materiais (BOM)', tipo: 'XLSX', tamanho: '18 KB' }
      ]
    },
    {
      id: '#1025-A', produto: 'Carcasa de bomba modelo B-100', quantidade: 6,
      tempoPrevistoSeg: 180, orcamento: 8000, valorRegistrado: 9600,
      custoMP: 3200, maquina: 'Torno CNC',
      maoDeObra: [{ nome: 'Murilo Zampieri', horas: 40 }],
      status: 'Em produção',
      materiais: [
        { codigo: 'CH-3MM-120', qtd: 4 },
        { codigo: 'RD-BT-58', qtd: 6 },
        { codigo: 'SV-M6-200', qtd: 40 }
      ],
      etapas: { atual: 2, total: 8, concluidas: [{ n: 1, seg: 140 }] },
      documentos: [
        { nome: 'Plano de usinagem B-100', tipo: 'PDF', tamanho: '150 KB' }
      ]
    },
    {
      id: '#1026-B', produto: 'Suporte de fixação inox', quantidade: 40,
      tempoPrevistoSeg: 120, orcamento: 12000, valorRegistrado: 11800,
      custoMP: 5400, maquina: 'Guilhotina',
      maoDeObra: [{ nome: 'João Pedro', horas: 40 }],
      status: 'Planejada',
      materiais: [
        { codigo: 'CH-3MM-120', qtd: 10 },
        { codigo: 'FX-CL-022', qtd: 80 }
      ],
      etapas: { atual: 1, total: 5, concluidas: [] },
      documentos: [
        { nome: 'Lista de materiais (BOM)', tipo: 'XLSX', tamanho: '22 KB' }
      ]
    },
    {
      id: '#1027-C', produto: 'Tanque de expansão 50 L', quantidade: 2,
      tempoPrevistoSeg: 240, orcamento: 6000, valorRegistrado: 4600,
      custoMP: 2400, maquina: 'Solda MIG',
      maoDeObra: [{ nome: 'Heloisa Soares', horas: 20 }, { nome: 'Murilo Zampieri', horas: 20 }],
      status: 'Concluída',
      materiais: [
        { codigo: 'PS-GR-310', qtd: 4 },
        { codigo: 'SV-M6-200', qtd: 12 }
      ],
      etapas: { atual: 4, total: 4, concluidas: [{ n: 1, seg: 200 }, { n: 2, seg: 215 }, { n: 3, seg: 190 }] },
      documentos: [
        { nome: 'Desenho técnico TX-50 rev A', tipo: 'PDF', tamanho: '180 KB' },
        { nome: 'Laudo de ensaio hidrostático', tipo: 'PDF', tamanho: '96 KB' }
      ]
    }
  ],

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

  /* Estoque (Figura 2) — KPIs derivados no app (fonte única); críticos estáticos até a Etapa 3 (F‑4/F‑7) */
  estoqueKpis: { usoCriticosPct: 14, usoCriticosEstado: 'Seguro' },
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

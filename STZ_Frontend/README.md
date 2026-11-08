# STZ_Frontend — MVP front-end (PI II)

Protótipo estático (HTML/CSS/JS puro, sem back-end e sem dependências) para
familiarização com o design concreto e conferência de telas e funcionalidades.
Base: `Plan.md` (na raiz do repositório) e o estilo `STZ_style.md`.

## Como abrir

Abra `index.html` no navegador (duplo clique; não precisa de servidor).
Teste de lógica: abra `testes/logica_test.html` — todos os itens em verde.

## Gate de merge (`scripts/check`)

Na raiz do repositório: `node scripts/check.js` (ou `scripts\check.cmd` no Windows).
Zero dependências — só Node padrão. Roda: lint (`node --check`) dos JS →
**32 asserts** de lógica (fonte única `testes/logica_testes.js`) → verificação
dos HTMLs (divs, scripts inline, boots, IDs, offline sem requests externos,
CSS) → build em `dist/` (pronto para publicar; ignorado pelo git).
Saída verde = pode fazer merge.

## Acesso de demonstração

| Usuário | Perfil | Senha |
|---|---|---|
| `isadora` | Administração | `stz@2026` |
| `joao.pedro` | Operador | `stz@2026` |

## Telas

| Arquivo | Wireframe (PI I) | O que demonstra |
|---|---|---|
| `index.html` | Figura 5 — Login | UC13: 3 tentativas → bloqueio 15 min (com contagem e reabertura automática); destino pela 1ª página permitida |
| `painel.html` | Figura 4 — Painel de Produtividade | US07 (refresh a cada 30 s), US08 (banner de estouro de orçamento), US09 (ociosidade com duração real), estado vazio uniforme, donut com furo (Etapa 4) |
| `estoque.html` | Figura 2 — Estoque | RF06 fonte única: saldo/mínimo/pill âmbar + histórico de movimentações (RF03) |
| `ordens.html` | Fase B — UC06 | Lista/cadastro/edição de OPs; BOM crítica por OP (crítico = necessidade > saldo, US14); documentos por OP (mock) |
| `resultado.html` | Fase B — UC11/TA11 | Resultado por OP: lucro = valor registrado − MP − MO; MO = valor-hora individual × horas (F‑3); lucro Emerald / prejuízo Alert Red |
| `permissoes.html` | Figura 3 — Permissões | US12/UC08: toggles que SÓ restringem (menor privilégio), Salvar/Descartar reais, log seguro |
- `tablet.html` | Figura 6 — Apontamento (dark) | US01–US06 e US14: **seleção de OP (Etapa 2)**, cronômetro com pausa (RUNNING↔PAUSED), etapas persistidas, alerta >10% com som, parada de máquina com duração, baixa no estoque real |

## Simulações (sem back-end)

- Estado em `localStorage` (sessão, tentativas, permissões, máquinas, log,
  **estoque, movimentações, OPs e OP selecionada**). Estoque, tablet e ordens
  usam a MESMA fonte: consumo no tablet baixa o saldo real e alimenta o
  histórico do estoque; o BOM das ordens lê o mesmo estoque em tempo real.
- OPs (Etapa 2): 4 fixtures (#1024-C, #1025-A, #1026-B, #1027-C) com BOM,
  etapas e documentos próprios. Apontamentos (etapas concluídas) **persistem
  em `stz.ops`** — sobrevivem ao F5; ao concluir a última etapa a OP vira
  "Concluída". Nova OP recebe id sequencial com sufixo `-N`.
- Custos (Etapa 3): `custoMO` e `custoReal` não são mais fixtures — derivam de
  `maoDeObra` (horas alocadas) × **valor-hora individual** (F‑3: Isadora 120,
  Heloisa 110, João Pedro 65, Murilo 60). #1024-C: MO 5.000, custo real 11.000
  (> orçamento 10.000 → banner UC08), resultado +3.500; #1027-C fecha em
  −1.200 para demonstrar o negativo (UC11). Resultado por OP: `resultado.html`
  (módulo Custos — operador não acessa, TA12).
- BOM crítica (UC06): item crítico quando a necessidade da OP não cabe no saldo
  (baixa seria recusada — US14). Hoje: PS-GR-310 em #1024-C e RD-BT-58 em #1025-A.
- Itens consumíveis no tablet: AL‑PL‑001 (8 pcs), FX‑CL‑022 (24), RD‑BT‑58 (4)
  dão baixa; **PS‑GR‑310 recusa** (precisa 12, saldo 6 — demonstra US14).
- Trocar de OP no tablet: salvo em `stz.opSel` (volta como inicial); se houver
  etapa em andamento, pede confirmação antes de descartar a contagem.
- Permissões: perfil primeiro (operador nunca abre Custos/Relatórios/Usuários);
  o toggle da **1ª ação** do módulo liga/desliga o módulo inteiro; toggle só restringe.
  Ordens de Produção pertence ao módulo Produção.
- Bloqueio: após os 15 min o contador zera e os campos reabrem sozinhos.
- Responsivo (Etapa 4): ≤900px a sidebar vira gaveta (hamburguer no topbar +
  backdrop; navegar fecha a gaveta); tabelas rolam horizontalmente dentro do
  card em telas estreitas. No desktop o hamburguer some e a sidebar volta.
- Permissões (Etapa 4): a linha inteira do toggle é clicável (alvo de toque
  maior) — clicar no texto ou no switch altera o rascunho uma única vez.
- Footer do tablet mostra o último acesso real da sessão (sem IP inventado).
- Tablet inicia PARADA; no "Começar Etapa" o cronômetro conta e o alerta de
  >10% usa o tempo previsto **da OP selecionada**; o som requer clique prévio
  (política de áudio). Pausa pelo próprio pill de status (RUNNING ↔ PAUSED —
  é diferente da parada de máquina).
- Itens fictícios removidos da revisão de escopo (IA, NF-e, RH, compras)
  não aparecem em nenhuma tela — decisão registrada no `Plan.md`.

## Publicação (checklist final do manual)

Caminhos são relativos e o site funciona offline (`file://`) — publicar é só subir a pasta:

1. `node scripts/check.js` — gate verde gera `dist/` (sem `testes/` nem README).
2. Publicar o **conteúdo de `dist/`** na branch `gh-pages` e ativar
   Settings → Pages → Deploy from branch (`gh-pages`, raiz). Alternativa: apontar
   a Action de Pages para a pasta. Qualquer subcaminho funciona (paths relativos).
3. Conferir o checklist do manual: headers invertidos, um Indigo preenchido por
   região, status em pill, tablet dark sem sombras com alvos ≥ 44 px, offline
   sem requests externos — todos cobertos pela bateria `pw_check.js` (86 checks).

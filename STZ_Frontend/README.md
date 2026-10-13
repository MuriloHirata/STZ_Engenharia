# STZ_Frontend — MVP front-end (PI II)

Protótipo estático (HTML/CSS/JS puro, sem back-end e sem dependências) para
familiarização com o design concreto e conferência de telas e funcionalidades.
Base: `Plan.md` (na raiz do repositório) e o estilo `STZ_style.md`.

## Como abrir

Abra `index.html` no navegador (duplo clique; não precisa de servidor).
Teste de lógica: abra `testes/logica_test.html` — todos os itens em verde.

## Acesso de demonstração

| Usuário | Perfil | Senha |
|---|---|---|
| `isadora` | Administração | `stz@2026` |
| `joao.pedro` | Operador | `stz@2026` |

## Telas

| Arquivo | Wireframe (PI I) | O que demonstra |
|---|---|---|
| `index.html` | Figura 5 — Login | UC13: 3 tentativas → bloqueio 15 min; perfil define destino |
| `painel.html` | Figura 4 — Painel de Produtividade | US07 (KPIs atualizam a cada 30 s), US08 (banner de estouro de orçamento), US09 (ociosidade por cor) |
| `estoque.html` | Figura 2 — Estoque | RF06: saldo/mínimo/pill âmbar, baixa automática por OP, sem módulo de compras |
| `permissoes.html` | Figura 3 — Permissões | US12/UC08: toggles por módulo, log de auditoria; operador não abre a página (TA12) |
| `tablet.html` | Figura 6 — Apontamento (dark) | US01–US06 e US14: cronômetro, etapas, alerta >10% com som, parada de máquina, baixa de materiais |

## Simulações (sem back-end)

- Estado em `localStorage` (sessão, tentativas, permissões, máquinas, log).
- Dados em `js/data.js` (fixtures). Recarregar a página restaura os dados,
  exceto sessão/permissões/log.
- Alerta do tablet dispara ~15 s após abrir (cronômetro inicia em 02:30 com
  previsto 02:30); o som requer um clique prévio na página (política de áudio).
- Itens fictícios removidos da revisão de escopo (IA, NF-e, RH, compras)
  não aparecem em nenhuma tela — decisão registrada no `Plan.md`.

## Fase B (fora deste MVP)

`ordens.html` (UC06), `resultado.html` (UC11/TA11) e publicação estática.

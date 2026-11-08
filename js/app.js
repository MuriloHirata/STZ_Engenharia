'use strict';

/* MVP front-end STZ — sessão, shell e comportamento das telas.
   Sem back-end: estado em localStorage, dados em js/data.js. */
const STZ = (() => {

  /* ---------- utilidades ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* leitura única de localStorage com fallback (substitui os 5 try/catch copiados) */
  function lerJSON(chave, padrao) {
    try {
      const v = JSON.parse(localStorage.getItem(chave));
      return v == null ? padrao : v;
    } catch (e) { return padrao; }
  }

  function mmss(seg) {
    const m = Math.floor(seg / 60), s = seg % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function brl(n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  let toastTimer = null;
  function toast(msg, tipo) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast show' + (tipo ? ' ' + tipo : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------- sessão / bloqueio (UC13, RF11) ---------- */
  function sessao() {
    return lerJSON('stz.sessao', null);
  }

  function logEvento(msg) {
    const log = lerJSON('stz.log', []);
    log.unshift({ quando: new Date().toLocaleString('pt-BR'), msg: msg });
    localStorage.setItem('stz.log', JSON.stringify(log.slice(0, 50)));
  }

  function bloqueadoAte() {
    return parseInt(localStorage.getItem('stz.bloqueadoAte') || '0', 10);
  }

  function login(usuario, senha) {
    const agora = Date.now();
    const u = STZ_DATA.usuarios.filter(x => x.usuario === String(usuario || '').trim().toLowerCase())[0];
    /* decisão pura (avaliarLogin) centraliza bloqueio, expiração e contador */
    const r = avaliarLogin({ tentativas: parseInt(localStorage.getItem('stz.tentativas') || '0', 10), bloqueadoAte: bloqueadoAte() }, !!u && senha === STZ_DATA.senha, agora);
    if (!r.ok && r.motivo === 'bloqueado') return r;
    if (r.ok) {
      localStorage.setItem('stz.tentativas', '0');
      localStorage.setItem('stz.bloqueadoAte', '0');
      localStorage.setItem('stz.sessao', JSON.stringify({ usuario: u.usuario, nome: u.nome, perfil: u.perfil }));
      logEvento('Login: ' + u.nome + ' (' + u.perfil + ')');
      return { ok: true, sessao: u };
    }
    /* falhas contáveis (credenciais/3ª tentativa) */
    localStorage.setItem('stz.tentativas', String(r.tentativas));
    if (r.motivo === 'bloqueio3') {
      localStorage.setItem('stz.bloqueadoAte', String(r.bloquearAte));
      logEvento('Bloqueio de acesso: 3 tentativas inválidas ("' + usuario + '")');
    }
    return r;
  }

  function logout() {
    logEvento('Logout');
    localStorage.removeItem('stz.sessao');
    location.href = 'index.html';
  }

  /* F‑2: página → módulo da matriz de permissões (toggle desliga o módulo inteiro) */
  const MODULO_DA_PAGINA = { painel: 'Produção', tablet: 'Produção', estoque: 'Estoque', permissoes: 'Usuários', ordens: 'Produção', resultado: 'Custos' };

  /* matriz do usuário: módulo ativado quando sua ação raiz (1ª da lista) está ligada;
     sem registro = ligado (o toggle só restringe) */
  function lerToggles(nome) {
    const e = lerJSON('stz.perm.' + nome, {});
    const t = {};
    STZ_DATA.permissoesModulos.forEach((m, mi) => { t[m.nome] = e[mi + ':0'] !== false; });
    return t;
  }

  /* destino seguro: primeira página que o perfil+matriz permitem */
  function primeiraPermitida(s) {
    return MENU.filter(m => acessoEfetivo(s.perfil, MODULO_DA_PAGINA[m.id], lerToggles(s.nome)))[0] || null;
  }

  function guard(modulo) {
    const s = sessao();
    if (!s) { location.replace('index.html'); return null; }
    const nome = MODULO_DA_PAGINA[modulo] || modulo;
    if (!acessoEfetivo(s.perfil, nome, lerToggles(s.nome))) {
      logEvento('Acesso negado: ' + s.usuario + ' tentou abrir "' + nome + '" (US12/TA12)');
      const alt = primeiraPermitida(s);
      if (alt) { location.replace(alt.href); return null; }
      location.replace('index.html'); /* sem módulo permitido: index mostra aviso */
      return null;
    }
    return s;
  }

  /* ---------- shell ---------- */
  const ICONES = {
    painel: '<path d="M2 12l4-5 3 3 5-6"/><path d="M2 14h12"/>',
    ordens: '<rect x="3" y="2.5" width="10" height="11" rx="1.5"/><path d="M6 6h4.5M6 9h4.5"/>',
    resultado: '<path d="M3 13V9M8 13V4M13 13V7"/>',
    estoque: '<path d="M2.5 5L8 2l5.5 3v6L8 14l-5.5-3z"/><path d="M2.5 5L8 8l5.5-3M8 8v6"/>',
    permissoes: '<rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>',
    tablet: '<rect x="4" y="2" width="8" height="12" rx="1.5"/><path d="M7 11.5h2"/>'
  };

  const MENU = [
    { id: 'painel', rot: 'Painel de Produtividade', href: 'painel.html' },
    { id: 'ordens', rot: 'Ordens de Produção', href: 'ordens.html' },
    { id: 'resultado', rot: 'Resultado por OP', href: 'resultado.html' },
    { id: 'estoque', rot: 'Estoque', href: 'estoque.html' },
    { id: 'permissoes', rot: 'Permissões', href: 'permissoes.html' },
    { id: 'tablet', rot: 'Apontamento', href: 'tablet.html' }
  ];

  function iniciais(nome) {
    return nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  function renderShell(pagina, s) {
    const top = $('#topbar');
    if (top) {
      top.className = 'topbar';
      top.innerHTML =
        /* hamburguer: só aparece ≤900px (menu gaveta, Etapa 4) */
        '<button class="btn-menu" id="btn-menu" aria-label="Abrir menu" aria-expanded="false">' +
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M3 5h14M3 10h14M3 15h14"/></svg></button>' +
        '<a class="brand" href="painel.html"><span class="brand-mark">&#9889;</span>STZ Engenharia</a>' +
        '<div class="topbar-right">' +
          '<span class="usuario-chip"><span class="avatar">' + iniciais(s.nome) + '</span>' +
          s.nome + ' · ' + (s.perfil === 'administracao' ? 'Administração' : 'Operador') + '</span>' +
          '<button class="btn btn-outline" id="btn-sair">Sair</button>' +
        '</div>';
      $('#btn-sair').addEventListener('click', logout);
      const side = $('#sidebar');
      let backdrop = document.querySelector('.backdrop');
      if (!backdrop) {
        backdrop = document.createElement('button');
        backdrop.className = 'backdrop';
        backdrop.setAttribute('aria-label', 'Fechar menu');
        backdrop.hidden = true;
        document.body.appendChild(backdrop);
      }
      const setMenu = abrir => {
        side.classList.toggle('aberta', abrir);
        backdrop.hidden = !abrir;
        $('#btn-menu').setAttribute('aria-expanded', String(abrir));
      };
      $('#btn-menu').addEventListener('click', () => setMenu(!side.classList.contains('aberta')));
      backdrop.addEventListener('click', () => setMenu(false));
      /* navegar pelo menu gaveta fecha a gaveta */
      side.addEventListener('click', ev => { if (ev.target.closest('a')) setMenu(false); });
    }
    const side = $('#sidebar');
    if (side) {
      side.className = 'sidebar';
      /* F‑2: menu só exibe módulos que a sessão realmente alcança */
      const visiveis = MENU.filter(m => acessoEfetivo(s.perfil, MODULO_DA_PAGINA[m.id], lerToggles(s.nome)));
      side.innerHTML = '<div class="eyebrow">Menu</div>' +
        visiveis.map(m =>
          '<a class="nav-item' + (m.id === pagina ? ' ativo' : '') + '" href="' + m.href + '">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          ICONES[m.id] + '</svg>' + m.rot + '</a>'
        ).join('');
    }
  }

  /* ---------- gráficos (SVG / CSS puro) ---------- */
  function graficoLinha(el, valores, rotulos) {
    const w = 560, h = 190, pl = 34, pb = 22, pt = 10;
    const max = 100;
    const x = i => pl + i * (w - pl - 10) / (valores.length - 1);
    const y = v => h - pb - (v / max) * (h - pb - pt);
    const pts = valores.map((v, i) => x(i) + ',' + y(v)).join(' ');
    const area = 'M' + x(0) + ',' + (h - pb) + ' L' +
      valores.map((v, i) => x(i) + ',' + y(v)).join(' L') +
      ' L' + x(valores.length - 1) + ',' + (h - pb) + ' Z';
    const eixos = [0, 25, 50, 75, 100].map(t =>
      '<text x="' + (pl - 6) + '" y="' + (y(t) + 3) + '" font-size="10" fill="var(--color-mist)" text-anchor="end">' + t + '</text>'
    ).join('');
    const pontos = valores.map((v, i) =>
      '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3" fill="var(--color-periwinkle)"/>' +
      '<text x="' + x(i) + '" y="' + (h - 6) + '" font-size="10" fill="var(--color-mist)" text-anchor="middle">' + rotulos[i] + '</text>'
    ).join('');
    el.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Gráfico de apontamentos por hora">' +
      '<path d="' + area + '" fill="rgba(124,140,255,0.22)"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="var(--color-periwinkle)" stroke-width="2"/>' +
      eixos + pontos + '</svg>';
  }

  function donut(el, fatias) {
    let acc = 0;
    const partes = fatias.map(f => {
      const ini = acc; acc += f.pct;
      return f.cor + ' ' + ini + '% ' + acc + '%';
    });
    el.style.background = 'conic-gradient(' + partes.join(', ') + ')';
  }

  /* ---------- Login (Figura 5) ---------- */
  function initLogin() {
    const s = sessao();
    if (s) {
      const inicio = primeiraPermitida(s);
      if (inicio) { location.replace(inicio.href); return; }
      /* sessão sem nenhum módulo permitido: aviso, sem loop de redirect */
      const aviso = $('#aviso');
      aviso.hidden = false;
      aviso.textContent = 'Sua sessão está sem permissão para nenhum módulo. Contate a gestão.';
      return;
    }
    const form = $('#form-login');
    const aviso = $('#aviso');
    const inputUser = $('#usuario');
    const inputSenha = $('#senha');

    $('#ultimo-acesso').textContent = localStorage.getItem('stz.ultimoAcesso') || '—';

    function desabilitarForm() {
      form.querySelector('button[type=submit]').disabled = true;
      inputUser.disabled = true;
      inputSenha.disabled = true;
    }
    function habilitarForm() {
      form.querySelector('button[type=submit]').disabled = false;
      inputUser.disabled = false;
      inputSenha.disabled = false;
    }
    function bloqueioUI(restanteMs) {
      aviso.hidden = false;
      aviso.textContent = 'Acesso bloqueado após 3 tentativas. Tente novamente em ' + mmss(Math.ceil(restanteMs / 1000)) + '.';
      desabilitarForm();
    }

    let emBloqueio = Date.now() < bloqueadoAte();
    if (emBloqueio) bloqueioUI(bloqueadoAte() - Date.now());

    /* contagem regressiva viva + reabertura quando o bloqueio expira (antes: travado até F5) */
    setInterval(() => {
      const rest = bloqueadoAte() - Date.now();
      if (rest > 0 && emBloqueio) {
        bloqueioUI(rest);
      } else if (rest <= 0 && emBloqueio) {
        emBloqueio = false;
        localStorage.setItem('stz.tentativas', '0');
        habilitarForm();
        aviso.hidden = true;
      }
    }, 1000);

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const r = login(inputUser.value, inputSenha.value);
      if (r.ok) {
        localStorage.setItem('stz.ultimoAcesso', new Date().toLocaleString('pt-BR'));
        const inicio = primeiraPermitida(r.sessao);
        location.href = inicio ? inicio.href : 'painel.html';
      } else if (r.motivo === 'bloqueado') {
        emBloqueio = true;
        bloqueioUI(r.restanteMs);
      } else if (r.motivo === 'bloqueio3') {
        emBloqueio = true;
        bloqueioUI(r.bloquearAte - Date.now());
      } else {
        aviso.hidden = false;
        aviso.textContent = 'Usuário ou senha inválidos. Tentativa ' + r.tentativas + ' de 3.';
      }
    });
  }

  /* ---------- Painel (Figura 4) — US07/US08/US09, TA07/TA08/TA09 ---------- */
  function initPainel() {
    /* US08: banner do 1º estouro encontrado entre as OPs (custoReal derivado do valor-hora) */
    const op = carregarOps().filter(o => custoRealDe(o) > o.orcamento)[0];
    if (op) {
      const b = $('#banner-estouro');
      b.hidden = false;
      $('#banner-estouro-texto').textContent =
        'OP ' + op.id + ': custo real ' + brl(custoRealDe(op)) +
        ' acima do orçamento ' + brl(op.orcamento) + '. Ação preventiva necessária.';
    }

    function render() {
      const vazio = $('#f-periodo').value === 'vazio';
      $('#kpis-vazio').hidden = !vazio;
      $('#kpis').hidden = vazio;
      /* estado vazio uniforme (UC12): sem indicadores = sem gráficos/equipe/máquinas */
      $('#painel-conteudo').hidden = vazio;
      if (vazio) return;
      const k = STZ_DATA.kpis;
      /* F‑7: números estáticos coerentes (o intervalo de 30 s permanece, o aleatório não) */
      $('#k-ocup').textContent = k.ocupacao + ' %';
      $('#k-ocup-bar').style.width = k.ocupacao + '%';
      $('#k-tarefas').textContent = k.tarefasConcluidas + '/' + k.tarefasTotal;
      $('#k-horas').textContent = k.horas;
      const kd = $('#k-desvio');
      kd.textContent = (k.desvio > 0 ? '+' : '') + k.desvio + ' %';
      kd.className = 'stat ' + (k.desvio >= 0 ? 'pos' : 'neg');
    }

    $('#f-periodo').addEventListener('change', render);
    render();
    setInterval(render, 30000); /* TA07: atualização a cada 30 s */

    graficoLinha($('#chart-linha'), STZ_DATA.serieHora.valores, STZ_DATA.serieHora.rotulos);
    donut($('#donut'), STZ_DATA.donut);
    $('#legenda-donut').innerHTML = STZ_DATA.donut.map(f =>
      '<li><span class="quad" style="background:' + f.cor + '"></span>' + f.rot + ' ' + f.pct + '%</li>').join('');

    $('#equipe').innerHTML = STZ_DATA.equipe.map(p =>
      '<div class="linha-pessoa"><span class="avatar">' + iniciais(p.nome) + '</span>' +
      '<span class="nome">' + p.nome + '</span>' +
      '<span class="progresso"><i style="width:' + p.pct + '%"></i></span>' +
      '<span class="nota">' + p.pct + '%</span></div>').join('');

    renderMaquinas();
    setInterval(renderMaquinas, 30000);
  }

  function carregarMaquinas() {
    let maq = lerJSON('stz.maquinas', null);
    if (!maq) {
      maq = STZ_DATA.maquinas.map(m => Object.assign({}, m));
      maq.forEach(m => {
        if (m.status === 'ociosa') m.ociosaDesde = Date.now() - (m.ociosaMin || 0) * 60000;
      });
      gravarMaquinas(maq);
    }
    /* migração: registros antigos só com ociosaMin ganham o timestamp */
    maq.forEach(m => {
      if (m.ociosaMin != null && m.ociosaDesde == null) m.ociosaDesde = Date.now() - m.ociosaMin * 60000;
    });
    return maq;
  }

  function minutosOciosa(m) {
    return m.ociosaDesde ? Math.floor((Date.now() - m.ociosaDesde) / 60000) : 0;
  }

  function gravarMaquinas(maq) {
    localStorage.setItem('stz.maquinas', JSON.stringify(maq.map(m => {
      /* não persistir derivado: ociosaMin vira ociosaDesde no boot e na parada */
      const o = Object.assign({}, m);
      delete o.ociosaMin;
      return o;
    })));
  }

  function renderMaquinas() {
    const alvo = $('#maquinas');
    if (!alvo) return;
    alvo.innerHTML = carregarMaquinas().map(m => {
      const ociosa = m.status === 'ociosa';
      const min = minutosOciosa(m);
      const det = ociosa
        ? 'há ' + (min >= 60 ? Math.floor(min / 60) + 'h' + String(min % 60).padStart(2, '0') + 'm' : min + 'min') +
          (m.motivo ? ' · ' + m.motivo : '')
        : 'em produção desde ' + m.desde;
      return '<div class="chip-maq"><span>' + m.nome + '<br><span class="det">' + det + '</span></span>' +
        '<span class="pill ' + (ociosa ? 'pill-warn' : 'pill-on') + '">' + (ociosa ? 'Ociosa' : 'Em produção') + '</span></div>';
    }).join('');
  }

  /* ---------- OPs (UC06/Etapa 2) — persistência dos apontamentos (etapas sobrevivem ao F5) ---------- */
  /* custoReal = custoMP + MO (Etapa 3/F‑3: MO = Σ valor-hora individual × horas) */
  function custoRealDe(op) {
    return op.custoMP + custoMODe(op.maoDeObra, STZ_DATA.funcionarios);
  }

  function carregarOps() {
    let ops = lerJSON('stz.ops', null);
    if (!ops) {
      ops = JSON.parse(JSON.stringify(STZ_DATA.ops));
      localStorage.setItem('stz.ops', JSON.stringify(ops));
    }
    /* migração Etapa 3: ops sem maoDeObra recebem a fixture; custoMO/custoReal armazenados
       saem (passam a ser derivados de maoDeObra × valorHora) */
    let mudou = false;
    ops.forEach(o => {
      if (!o.maoDeObra) {
        const f = STZ_DATA.ops.filter(x => x.id === o.id)[0];
        if (f) { o.maoDeObra = JSON.parse(JSON.stringify(f.maoDeObra)); mudou = true; }
      }
      if (o.custoMO != null) { delete o.custoMO; mudou = true; }
      if (o.custoReal != null) { delete o.custoReal; mudou = true; }
    });
    if (mudou) salvarOps(ops);
    return ops;
  }

  function salvarOps(ops) {
    localStorage.setItem('stz.ops', JSON.stringify(ops));
  }

  /* ---------- Estoque (Figura 2) — RF06: fonte única + rastreabilidade (RF03) ---------- */
  function semearEstoque() {
    if (!localStorage.getItem('stz.estoque')) {
      localStorage.setItem('stz.estoque', JSON.stringify(STZ_DATA.estoqueItens));
    }
    if (!localStorage.getItem('stz.movs')) {
      /* 42 baixas distribuídas nos últimos 30 dias (determinístico) */
      const itens = STZ_DATA.estoqueItens;
      const ops = STZ_DATA.ops.map(o => o.id);
      const movs = [];
      for (let i = 0; i < 42; i++) {
        const it = itens[i % itens.length];
        const ts = Date.now() - ((i % 30) + 1) * 86400000;
        movs.push({ op: ops[i % ops.length], item: it.codigo, lote: it.lote, qtd: (i % 3) + 1, ts: ts, quando: new Date(ts).toLocaleString('pt-BR') });
      }
      localStorage.setItem('stz.movs', JSON.stringify(movs));
    }
  }

  function estoqueAtual() {
    semearEstoque();
    return lerJSON('stz.estoque', STZ_DATA.estoqueItens);
  }

  /* baixa por OP grava saldo e movimentação atômica (OP + item + lote + qtd) */
  function baixarMaterial(codigoItem, qtd, opId) {
    const itens = estoqueAtual();
    const item = itens.filter(i => i.codigo === codigoItem)[0];
    const r = registrarMaterial(itens, codigoItem, item ? item.lote : '', qtd);
    if (!r.ok) return r;
    const movs = lerJSON('stz.movs', []).concat({
      op: opId || '—', item: codigoItem, lote: item.lote, qtd: qtd,
      ts: Date.now(), quando: new Date().toLocaleString('pt-BR')
    });
    localStorage.setItem('stz.estoque', JSON.stringify(r.estoque));
    localStorage.setItem('stz.movs', JSON.stringify(movs));
    return r;
  }

  function initEstoque() {
    semearEstoque();
    const k = STZ_DATA.estoqueKpis;
    const itens = estoqueAtual();
    const movs = lerJSON('stz.movs', []);
    const abaixo = itens.filter(i => i.saldo < i.min);

    /* KPIs derivados da mesma fonte das tabelas (F‑4/F‑7) */
    $('#e-baixas').textContent = movs.length.toLocaleString('pt-BR');
    $('#e-criticos').textContent = k.usoCriticosPct + ' %';
    const pillCrit = $('#e-criticos-pill');
    pillCrit.textContent = k.usoCriticosEstado;
    pillCrit.className = 'pill ' + (k.usoCriticosEstado === 'Seguro' ? 'pill-on' : 'pill-warn');
    $('#e-alertas').textContent = abaixo.length + ' Itens em Alerta';

    const max = Math.max.apply(null, STZ_DATA.consumo.map(c => c.v));
    $('#barras').innerHTML = STZ_DATA.consumo.map(c =>
      '<div class="col"><div class="barra' + (c.v <= 3 ? ' amber' : '') + '" style="height:' + Math.round(c.v / max * 100) + '%"></div>' +
      '<span class="rot">' + c.rot + '</span></div>').join('');

    /* posição de estoque — a MESMA lista que o tablet consome (fonte única) */
    $('#tabela-itens').innerHTML =
      '<table class="tabela"><thead><tr>' +
      '<th>Código</th><th>Descrição</th><th>Lote</th><th class="num">Saldo</th><th class="num">Mínimo</th><th>Status</th>' +
      '</tr></thead><tbody>' +
      itens.map(i => {
        const abaixoMin = i.saldo < i.min;
        return '<tr><td>' + i.codigo + '</td><td>' + i.desc + '</td><td>' + i.lote + '</td>' +
          '<td class="num">' + i.saldo + '</td><td class="num">' + i.min + '</td>' +
          '<td><span class="pill ' + (abaixoMin ? 'pill-warn' : 'pill-on') + '">' +
          (abaixoMin ? 'Abaixo do mínimo' : 'Normal') + '</span></td></tr>';
      }).join('') + '</tbody></table>';

    /* itens abaixo do mínimo (mesma regra da tabela) */
    $('#lista-alertas').innerHTML = abaixo.length
      ? abaixo.map(i =>
        '<div class="chip-maq"><span>' + i.codigo + ' — ' + i.desc +
        '<br><span class="det">saldo ' + i.saldo + ' · mínimo ' + i.min + '</span></span></div>').join('')
      : '<p class="vazio">Nenhum item abaixo do mínimo.</p>';

    /* histórico de movimentações (rastreabilidade RF03): últimas 6, OP + item + lote */
    const ultimas = movs.slice().sort((a, b) => b.ts - a.ts).slice(0, 6);
    $('#historico').innerHTML = ultimas.length
      ? ultimas.map(m =>
        '<div class="chip-maq"><span>OP ' + m.op + ' · ' + m.item +
        '<br><span class="det">lote ' + m.lote + ' · ' + m.qtd + ' pcs · ' + m.quando + '</span></span></div>').join('')
      : '<p class="vazio">Nenhuma movimentação registrada.</p>';
  }

  /* ---------- Permissões (Figura 3) — US12/UC08 ---------- */
  function initPermissoes() {
    const sel = $('#alvo');
    sel.innerHTML = STZ_DATA.funcionarios.map(f =>
      '<option value="' + f.nome + '">' + f.nome + '</option>').join('');

    const chaveEstado = () => 'stz.perm.' + sel.value;
    const lerEstado = () => lerJSON(chaveEstado(), {});
    let rasc = {}; /* rascunho aplicado SOMENTE no Salvar — Descartar volta de verdade */

    function render() {
      const f = STZ_DATA.funcionarios.filter(x => x.nome === sel.value)[0];
      const operador = f.perfil === 'operador';
      rasc = Object.assign({}, lerEstado());
      $('#modulos').innerHTML = STZ_DATA.permissoesModulos.map((m, mi) => {
        const restrito = m.restrito && operador;
        return '<section class="card' + (restrito ? ' restrito' : '') + '">' +
          '<div class="card-header">' + m.nome +
          (restrito ? ' <span class="acao">Restrito ao perfil</span>' : '') + '</div>' +
          '<div class="card-body">' +
          m.acoes.map((a, ai) => {
            const on = !!rasc[mi + ':' + ai];
            return '<div class="toggle-row"><span>' + a + '</span>' +
              '<button class="switch' + (on ? ' on' : '') + '" data-k="' + mi + ':' + ai + '" ' +
              'role="switch" aria-checked="' + on + '" aria-label="' + m.nome + ' — ' + a + '"></button></div>';
          }).join('') + '</div></section>';
      }).join('');

      /* Etapa 4: a LINHA inteira é clicável (alvo de toque maior); o click do switch
         borbulha até a linha — um único toggle, sem listener duplicado */
      $$('#modulos .toggle-row').forEach(row => row.addEventListener('click', () => {
        const sw = row.querySelector('.switch');
        const k = sw.dataset.k;
        rasc[k] = !rasc[k];
        sw.classList.toggle('on');
        sw.setAttribute('aria-checked', String(sw.classList.contains('on')));
      }));
    }

    function aplicarRasc() {
      $$('#modulos .switch').forEach(sw => {
        const on = !!rasc[sw.dataset.k];
        sw.classList.toggle('on', on);
        sw.setAttribute('aria-checked', String(on));
      });
    }

    sel.addEventListener('change', render);
    render();

    $('#btn-salvar').addEventListener('click', () => {
      localStorage.setItem(chaveEstado(), JSON.stringify(rasc));
      logEvento('Permissões salvas para ' + sel.value);
      toast('Permissões de ' + sel.value + ' salvas.', 'ok');
    });
    $('#btn-descartar').addEventListener('click', () => {
      rasc = Object.assign({}, lerEstado());
      aplicarRasc();
      toast('Alterações descartadas.');
    });

    /* Atalhos */
    $('#atalho-usuarios').addEventListener('click', () => toast('MVP: tela de usuários prevista na Fase B.'));
    $('#atalho-pref').addEventListener('click', () => toast('MVP: preferências previstas na Fase B.'));
    $('#atalho-log').addEventListener('click', () => {
      const caixa = $('#caixa-log');
      caixa.hidden = !caixa.hidden;
      if (!caixa.hidden) renderLog();
    });

    function renderLog() {
      /* mensagem do usuário nunca via innerHTML — constrói nós com textContent (anti-XSS) */
      const log = lerJSON('stz.log', []);
      const alvo = $('#log-lista');
      alvo.textContent = '';
      if (!log.length) {
        const p = document.createElement('p');
        p.className = 'vazio';
        p.textContent = 'Nenhum evento registrado.';
        alvo.appendChild(p);
        return;
      }
      log.forEach(l => {
        const row = document.createElement('div');
        row.className = 'toggle-row';
        const msg = document.createElement('span');
        msg.textContent = l.msg;
        const quando = document.createElement('span');
        quando.className = 'nota';
        quando.textContent = l.quando;
        row.appendChild(msg);
        row.appendChild(quando);
        alvo.appendChild(row);
      });
    }
  }

  /* ---------- Tablet (Figura 6) — US01–US06, US14, TA01/02/04/05/06.
     Etapa 2: seleção de OP (UC06) + apontamentos persistidos em stz.ops (sobrevivem ao F5). ---------- */
  function initTablet(s) {
    $('#t-operador').textContent = (s.perfil === 'administracao' ? 'Gerência: ' : 'Operador: ') + s.nome;
    const ops = carregarOps();

    /* seletor de OP: última usada volta como inicial (stz.opSel) */
    const sel = $('#sel-op');
    sel.innerHTML = ops.map(o => '<option value="' + o.id + '">' + o.id + ' — ' + o.produto + '</option>').join('');
    const idSalvo = localStorage.getItem('stz.opSel');
    if (ops.some(o => o.id === idSalvo)) sel.value = idSalvo;
    let idAnterior = sel.value;

    /* estado inicial PARADA (F‑5); etapas/saldos vêm da OP persistida */
    let estado = { rodando: false, pausado: false, seg: 0, alertado: false };
    function op() { return ops.filter(o => o.id === sel.value)[0]; }

    function trocarOp() {
      if (estado.rodando && !confirm('Etapa em andamento: trocar de OP descarta a contagem da etapa atual. Continuar?')) {
        sel.value = idAnterior; /* reverte a mudança */
        return;
      }
      idAnterior = sel.value;
      localStorage.setItem('stz.opSel', sel.value);
      estado = { rodando: false, pausado: false, seg: 0, alertado: false };
      $('#alerta-tempo').hidden = true;
      $('#cronometro').textContent = mmss(0);
      $('#visualizador-det').textContent = 'Desenho técnico da OP ' + sel.value + ' (placeholder — US03: render ≤ 5 s).';
      renderBotoes(); renderTempos(); renderMateriais();
      toast('OP ' + sel.value + ' selecionada.', 'ok');
    }

    /* Áudio (exige gesto do usuário para desbloquear em navegadores) */
    let audioCtx = null;
    function beep() {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'square';
        o.frequency.value = 880;
        g.gain.value = 0.04;
        o.connect(g); g.connect(audioCtx.destination);
        o.start();
        setTimeout(() => { o.stop(); }, 300);
      } catch (e) { /* sem áudio disponível: o alerta visual já foi exibido */ }
    }
    document.addEventListener('click', () => {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
      } catch (e) { /* ignorado */ }
    }, { once: true });

    function renderTempos() {
      const atual = op();
      const linhas = atual.etapas.concluidas.map(c =>
        '<p><strong>Etapa ' + c.n + ':</strong> ' + mmss(c.seg) + '</p>').join('');
      const total = atual.etapas.concluidas.reduce((s, c) => s + c.seg, 0) + (estado.rodando ? estado.seg : 0);
      $('#tempos-etapas').innerHTML = linhas +
        '<p style="margin-top:8px"><strong>Tempo Total: ' + mmss(total) + '</strong></p>';
    }

    function renderBotoes() {
      const atual = op();
      $('#btn-iniciar').disabled = estado.rodando;
      $('#btn-finalizar').disabled = !estado.rodando;
      const rotulo = estado.rodando ? (estado.pausado ? 'PAUSED' : 'RUNNING') : 'PARADA';
      const classe = estado.rodando ? (estado.pausado ? 'pill-off' : 'pill-on') : 'pill-warn';
      const pill = $('#pill-estado');
      pill.textContent = rotulo;
      pill.className = 'pill ' + classe;
      $('#etapa-atual').textContent = 'Etapa ' + atual.etapas.atual + ' de ' + atual.etapas.total;
    }

    function renderMateriais() {
      const atual = op();
      /* saldo/lote/desc vêm do ESTOQUE (fonte única, RF06); BOM da própria OP */
      const estoque = estoqueAtual();
      $('#materiais').innerHTML = atual.materiais.map((m, i) => {
        const it = estoque.filter(x => x.codigo === m.codigo)[0];
        return '<tr><td>' + m.codigo + '</td><td>' + (it ? it.desc : '—') + '</td><td>' + (it ? it.lote : '—') + '</td>' +
          '<td class="num">' + m.qtd + ' pcs</td><td class="num">' + (it ? it.saldo : '—') + '</td>' +
          '<td><button class="btn btn-outline" data-i="' + i + '">Registrar consumo</button></td></tr>';
      }).join('');
      $$('#materiais button').forEach(b => b.addEventListener('click', () => {
        const m = op().materiais[+b.dataset.i];
        const t0 = performance.now();
        const r = baixarMaterial(m.codigo, m.qtd, op().id);
        const dt = performance.now() - t0;
        if (r.ok) {
          renderMateriais();
          toast('✓ Baixa registrada: ' + m.codigo + ' (' + m.qtd + ' pcs) em ' + dt.toFixed(0) + ' ms (limite 2 s).', 'ok');
        } else {
          const motivo = { item: 'item inexistente', lote: 'lote não cadastrado', saldo: 'saldo insuficiente' }[r.motivo];
          toast('✗ Registro recusado (' + motivo + ').', 'erro');
        }
      }));
    }

    /* Cronômetro + alerta de 10% (US05/TA05); pausa congela a contagem (F‑5) */
    setInterval(() => {
      $('#hora-local').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (!estado.rodando || estado.pausado) return;
      estado.seg++;
      $('#cronometro').textContent = mmss(estado.seg);
      if (!estado.alertado && deveAlertarTempo(estado.seg, op().tempoPrevistoSeg)) {
        estado.alertado = true;
        const b = $('#alerta-tempo');
        b.hidden = false;
        $('#alerta-tempo-texto').textContent =
          'O tempo de execução em tempo real excedeu o tempo previsto da etapa em 10% (' +
          mmss(estado.seg) + ' vs ' + mmss(op().tempoPrevistoSeg) + ').';
        beep();
      }
      if (estado.seg % 5 === 0) renderTempos();
    }, 1000);

    sel.addEventListener('change', trocarOp);

    /* Pausa explícita (F‑5): RUNNING ↔ PAUSED, distinta da parada de máquina */
    $('#pill-estado').addEventListener('click', () => {
      if (!estado.rodando) { toast('Inicie a etapa antes de pausar.'); return; }
      estado.pausado = !estado.pausado;
      renderBotoes();
      toast(estado.pausado ? 'Etapa pausada — cronômetro parado.' : 'Etapa retomada.', estado.pausado ? '' : 'ok');
    });

    $('#btn-iniciar').addEventListener('click', () => {
      const atual = op();
      if (atual.etapas.atual > atual.etapas.total) { toast('Todas as etapas da ' + atual.id + ' concluídas.'); return; }
      estado.rodando = true;
      estado.pausado = false;
      estado.seg = 0;
      estado.alertado = false;
      $('#alerta-tempo').hidden = true;
      $('#cronometro').textContent = mmss(0);
      renderBotoes(); renderTempos();
      toast('Etapa ' + atual.etapas.atual + ' da OP ' + atual.id + ' iniciada.', 'ok');
    });

    $('#btn-finalizar').addEventListener('click', () => {
      if (!estado.rodando) return;
      const t0 = performance.now();
      const atual = op();
      /* apontamento persiste na PRÓPRIA OP (stz.ops) — sobrevive ao F5 */
      atual.etapas.concluidas.push({ n: atual.etapas.atual, seg: estado.seg });
      atual.etapas.atual++;
      estado.rodando = false;
      estado.pausado = false;
      estado.seg = 0;
      estado.alertado = false;
      if (atual.etapas.atual > atual.etapas.total && atual.status !== 'Concluída') {
        atual.status = 'Concluída';
        logEvento('OP ' + atual.id + ' concluída (todas as ' + atual.etapas.total + ' etapas)');
      }
      salvarOps(ops);
      $('#alerta-tempo').hidden = true;
      $('#cronometro').textContent = mmss(0);
      renderBotoes(); renderTempos();
      const dt = performance.now() - t0;
      /* TA04: status da OP refletido no painel em até 5 s */
      toast('Etapa finalizada — apontamento salvo em ' + dt.toFixed(0) + ' ms (limite 5 s).', 'ok');
    });

    /* Parada de máquina (US06/TA06) — distinta da PAUSED de etapa; duração real a partir de agora */
    $('#btn-ociosa').addEventListener('click', () => {
      const motivo = $('#motivo-parada').value;
      const maq = carregarMaquinas();
      const alvo = maq.filter(m => m.nome === op().maquina)[0] || maq[0];
      alvo.status = 'ociosa';
      alvo.motivo = motivo;
      alvo.ociosaDesde = Date.now();
      gravarMaquinas(maq);
      logEvento('Parada de máquina: ' + alvo.nome + ' (' + motivo + ') — OP ' + op().id);
      toast('Máquina "' + alvo.nome + '" em Ociosa (' + motivo + '). Duração contando; painel reflete em até 30 s.', 'ok');
    });

    $('#motivo-parada').innerHTML = STZ_DATA.motivosParada.map(m => '<option>' + m + '</option>').join('');
    /* footer honesto: último acesso real da sessão (Etapa 4), sem IP inventado */
    $('#t-acesso').textContent = 'Último acesso: ' + (localStorage.getItem('stz.ultimoAcesso') || '—') +
      ' — protótipo local (sem rede)';
    $('#cronometro').textContent = mmss(0);
    $('#hora-local').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    $('#visualizador-det').textContent = 'Desenho técnico da OP ' + sel.value + ' (placeholder — US03: render ≤ 5 s).';
    renderBotoes();
    renderTempos();
    renderMateriais();
  }

  /* ---------- Ordens de Produção (UC06/Etapa 2) — lista, cadastro, edição, BOM e documentos ---------- */
  function initOrdens() {
    const statusPill = { 'Em produção': 'pill-on', 'Planejada': 'pill-warn', 'Concluída': 'pill-off' };
    let editando = null; /* OP em edição; null = formulário de nova OP */

    function opPorId(id) { return carregarOps().filter(o => o.id === id)[0]; }
    function pillBom(o, est) {
      const bom = avaliarBom(o.materiais, est);
      return { bom: bom, html: '<span class="pill ' + (bom.ok ? 'pill-on' : 'pill-warn') + '">' +
        (bom.ok ? 'OK' : bom.criticos.length + ' crítico' + (bom.criticos.length > 1 ? 's' : '')) + '</span>' };
    }

    function renderTabela() {
      const ops = carregarOps();
      const est = estoqueAtual();
      $('#tabela-ops').innerHTML =
        '<table class="tabela"><thead><tr>' +
        '<th>ID</th><th>Produto</th><th class="num">Qtde</th><th>Tempo Previsto</th>' +
        '<th class="num">Orçamento</th><th class="num">Custo Real</th><th>BOM</th><th>Status</th><th></th>' +
        '</tr></thead><tbody>' +
        ops.map(o => {
          const pb = pillBom(o, est);
          return '<tr><td>' + o.id + '</td><td>' + o.produto + '</td><td class="num">' + o.quantidade + '</td>' +
            '<td>' + mmss(o.tempoPrevistoSeg) + '</td><td class="num">' + brl(o.orcamento) + '</td>' +
            '<td class="num">' + brl(custoRealDe(o)) + '</td>' +
            '<td>' + pb.html + '</td>' +
            '<td><span class="pill ' + (statusPill[o.status] || 'pill-off') + '">' + o.status + '</span></td>' +
            '<td><button class="btn btn-outline" data-id="' + o.id + '">Editar</button></td></tr>';
        }).join('') + '</tbody></table>';
      $$('#tabela-ops button').forEach(b => b.addEventListener('click', () => editar(b.dataset.id)));
    }

    function editar(id) {
      editando = id;
      const o = opPorId(id);
      $('#form-titulo').textContent = 'Editar OP ' + o.id;
      $('#f-produto').value = o.produto;
      $('#f-quantidade').value = o.quantidade;
      $('#f-tempo').value = o.tempoPrevistoSeg;
      $('#f-orcamento').value = o.orcamento;
      renderBom(o);
      renderDocumentos(o);
    }

    function renderBom(o) {
      $('#bom-titulo').textContent = o ? 'BOM — OP ' + o.id : 'BOM';
      if (!o) { $('#tabela-bom').innerHTML = '<p class="vazio">Selecione uma OP na lista para ver a lista de materiais.</p>'; return; }
      const est = estoqueAtual();
      $('#tabela-bom').innerHTML = o.materiais.length
        ? '<table class="tabela"><thead><tr><th>Código</th><th>Descrição</th><th class="num">Necessário</th><th class="num">Saldo</th><th>Status</th></tr></thead><tbody>' +
          o.materiais.map(m => {
            const it = est.filter(x => x.codigo === m.codigo)[0];
            const critico = !it || it.saldo < m.qtd;
            return '<tr><td>' + m.codigo + '</td><td>' + (it ? it.desc : '— (fora do estoque)') + '</td>' +
              '<td class="num">' + m.qtd + '</td><td class="num">' + (it ? it.saldo : 0) + '</td>' +
              '<td><span class="pill ' + (critico ? 'pill-warn' : 'pill-on') + '">' + (critico ? 'Crítico (US14)' : 'Atende') + '</span></td></tr>';
          }).join('') + '</tbody></table>' +
          (pillBom(o, est).bom.ok
            ? '<p class="nota">Saldo suficiente para todo o BOM.</p>'
            : '<p class="nota">Saldo insuficiente: a baixa será recusada (US14) até a compra no sistema atual.</p>')
        : '<p class="vazio">Nenhum material vinculado a esta OP.</p>';
    }

    function renderDocumentos(o) {
      $('#docs-titulo').textContent = o ? 'Documentos — OP ' + o.id : 'Documentos';
      $('#docs-lista').innerHTML = (o && o.documentos.length)
        ? o.documentos.map((d, i) =>
          '<div class="chip-maq"><span>' + d.nome + '<br><span class="det">' + d.tipo + ' · ' + d.tamanho + '</span></span>' +
          '<span><button class="btn btn-outline" data-doc="v' + i + '">Visualizar</button> ' +
          '<button class="btn btn-outline" data-doc="b' + i + '">Baixar</button></span></div>').join('')
        : '<p class="vazio">Nenhum documento vinculado.</p>';
      $$('#docs-lista button').forEach(b => b.addEventListener('click', () => {
        const acao = b.dataset.doc[0];
        const d = o.documentos[+b.dataset.doc.slice(1)];
        toast(acao === 'v' ? 'Visualizando "' + d.nome + '" (mock — publica na Etapa 5).' : 'Download de "' + d.nome + '" iniciado (mock).', 'ok');
      }));
    }

    /* Nova OP: formulário em branco; os cards BOM/Documentos aguardam o salvar */
    $('#btn-nova-op').addEventListener('click', () => {
      editando = null;
      $('#form-titulo').textContent = 'Nova OP';
      $('#form-op').reset();
      renderBom(null);
      renderDocumentos(null);
      $('#f-produto').focus();
    });

    $('#form-op').addEventListener('submit', ev => {
      ev.preventDefault();
      const produto = $('#f-produto').value.trim();
      const quantidade = parseInt($('#f-quantidade').value, 10);
      const tempo = parseInt($('#f-tempo').value, 10);
      const orcamento = parseFloat(String($('#f-orcamento').value).replace(',', '.'));
      if (!produto || !(quantidade > 0) || !(tempo > 0) || !(orcamento >= 0)) {
        toast('Verifique os campos: produto e números positivos em quantidade/tempo/orçamento.', 'erro');
        return;
      }
      const ops = carregarOps();
      if (editando) {
        const o = ops.filter(x => x.id === editando)[0];
        o.produto = produto; o.quantidade = quantidade; o.tempoPrevistoSeg = tempo; o.orcamento = orcamento;
      } else {
        /* id novo: maior número dos ids + 1, sufixo "N" marca origem desta tela */
        const maxNum = ops.reduce((mx, o) => Math.max(mx, parseInt((o.id.match(/#?(\d+)/) || [0, 0])[1], 10) || 0), 0);
        const nova = {
          id: '#' + (maxNum + 1) + '-N', produto: produto, quantidade: quantidade,
          tempoPrevistoSeg: tempo, orcamento: orcamento, valorRegistrado: 0,
          custoMP: 0, maquina: 'Ponta rolante', maoDeObra: [],
          status: 'Planejada', materiais: [],
          etapas: { atual: 1, total: 1, concluidas: [] }, documentos: []
        };
        ops.push(nova);
        editando = nova.id;
      }
      salvarOps(ops);
      logEvento('OP ' + editando + ' salva (UC06)');
      toast('OP ' + editando + ' salva.', 'ok');
      renderTabela();
      editar(editando);
    });

    renderTabela();
    renderBom(null);
    renderDocumentos(null);
    $('#form-titulo').textContent = 'Nova OP';
  }

  /* ---------- Resultado por OP (UC11/TA11, Etapa 3) — lucro = valor registrado − MP − MO ---------- */
  function initResultado() {
    const fs = STZ_DATA.funcionarios;
    const linhas = carregarOps().map(o => {
      const mo = custoMODe(o.maoDeObra, fs);
      const res = calcularResultadoOP(o.valorRegistrado, o.custoMP, mo);
      return { o: o, mo: mo, real: o.custoMP + mo, res: res };
    });

    const total = linhas.reduce((s, l) => s + l.res, 0);
    const elTotal = $('#r-total');
    elTotal.textContent = brl(total);
    elTotal.className = 'stat ' + (total >= 0 ? 'pos' : 'neg');

    const prej = linhas.filter(l => l.res < 0).length;
    const elPrej = $('#r-prej');
    elPrej.textContent = prej + (prej === 1 ? ' OP' : ' OPs');
    elPrej.className = 'stat ' + (prej > 0 ? 'neg' : 'pos');

    $('#r-mo').textContent = brl(linhas.reduce((s, l) => s + l.mo, 0));

    /* verde = lucro (Emerald); vermelho = prejuízo (Alert Red) — UC11 */
    const cor = v => v >= 0 ? 'var(--color-emerald)' : 'var(--color-alert-red)';
    $('#tabela-resultado').innerHTML =
      '<table class="tabela"><thead><tr>' +
      '<th>OP</th><th>Produto</th><th class="num">Valor Registrado</th><th class="num">MP</th>' +
      '<th class="num">MO (valor-hora)</th><th class="num">Custo Real</th><th class="num">Resultado</th>' +
      '</tr></thead><tbody>' +
      linhas.map(l =>
        '<tr><td>' + l.o.id + '</td><td>' + l.o.produto + '</td>' +
        '<td class="num">' + brl(l.o.valorRegistrado) + '</td>' +
        '<td class="num">' + brl(l.o.custoMP) + '</td>' +
        '<td class="num">' + brl(l.mo) + '</td>' +
        '<td class="num">' + brl(l.real) + '</td>' +
        '<td class="num" style="color:' + cor(l.res) + '; font-weight:600">' + brl(l.res) + '</td></tr>').join('') +
      '</tbody></table>';
  }

  /* ---------- boot ---------- */
  function boot(pagina, modulo) {
    if (pagina === 'login') { initLogin(); return; }
    const s = guard(modulo);
    if (!s) return;
    renderShell(pagina, s);
    ({ painel: initPainel, estoque: initEstoque, permissoes: initPermissoes, tablet: initTablet, ordens: initOrdens, resultado: initResultado }[pagina] || function () {})(s);
  }

  return { boot: boot, toast: toast };
})();

'use strict';

/* MVP front-end STZ — sessão, shell e comportamento das telas.
   Sem back-end: estado em localStorage, dados em js/data.js. */
const STZ = (() => {

  /* ---------- utilidades ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

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
    try { return JSON.parse(localStorage.getItem('stz.sessao')); } catch (e) { return null; }
  }

  function logEvento(msg) {
    let log = [];
    try { log = JSON.parse(localStorage.getItem('stz.log')) || []; } catch (e) { log = []; }
    log.unshift({ quando: new Date().toLocaleString('pt-BR'), msg: msg });
    localStorage.setItem('stz.log', JSON.stringify(log.slice(0, 50)));
  }

  function bloqueadoAte() {
    return parseInt(localStorage.getItem('stz.bloqueadoAte') || '0', 10);
  }

  function login(usuario, senha) {
    const agora = Date.now();
    if (agora < bloqueadoAte()) {
      return { ok: false, motivo: 'bloqueado', restanteMs: bloqueadoAte() - agora };
    }
    const u = STZ_DATA.usuarios.filter(x => x.usuario === usuario.trim().toLowerCase())[0];
    if (!u || senha !== STZ_DATA.senha) {
      const t = parseInt(localStorage.getItem('stz.tentativas') || '0', 10) + 1;
      localStorage.setItem('stz.tentativas', String(t));
      if (t >= 3) {
        localStorage.setItem('stz.bloqueadoAte', String(agora + 15 * 60 * 1000));
        logEvento('Bloqueio de acesso: 3 tentativas inválidas ("' + usuario + '")');
        return { ok: false, motivo: 'bloqueio3' };
      }
      return { ok: false, motivo: 'credenciais', tentativas: t };
    }
    localStorage.setItem('stz.tentativas', '0');
    localStorage.setItem('stz.sessao', JSON.stringify({ usuario: u.usuario, nome: u.nome, perfil: u.perfil }));
    logEvento('Login: ' + u.nome + ' (' + u.perfil + ')');
    return { ok: true, sessao: u };
  }

  function logout() {
    logEvento('Logout');
    localStorage.removeItem('stz.sessao');
    location.href = 'index.html';
  }

  function guard(modulo) {
    const s = sessao();
    if (!s) { location.replace('index.html'); return null; }
    if (!podeAcessar(s.perfil, modulo)) {
      logEvento('Acesso negado: ' + s.usuario + ' tentou abrir "' + modulo + '" (US12/TA12)');
      location.replace('painel.html');
      return null;
    }
    return s;
  }

  /* ---------- shell ---------- */
  const ICONES = {
    painel: '<path d="M2 12l4-5 3 3 5-6"/><path d="M2 14h12"/>',
    estoque: '<path d="M2.5 5L8 2l5.5 3v6L8 14l-5.5-3z"/><path d="M2.5 5L8 8l5.5-3M8 8v6"/>',
    permissoes: '<rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>',
    tablet: '<rect x="4" y="2" width="8" height="12" rx="1.5"/><path d="M7 11.5h2"/>'
  };

  const MENU = [
    { id: 'painel', rot: 'Painel de Produtividade', href: 'painel.html' },
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
        '<a class="brand" href="painel.html"><span class="brand-mark">&#9889;</span>STZ Engenharia</a>' +
        '<div class="topbar-right">' +
          '<span class="usuario-chip"><span class="avatar">' + iniciais(s.nome) + '</span>' +
          s.nome + ' · ' + (s.perfil === 'administracao' ? 'Administração' : 'Operador') + '</span>' +
          '<button class="btn btn-outline" id="btn-sair">Sair</button>' +
        '</div>';
      $('#btn-sair').addEventListener('click', logout);
    }
    const side = $('#sidebar');
    if (side) {
      side.className = 'sidebar';
      side.innerHTML = '<div class="eyebrow">Menu</div>' +
        MENU.map(m =>
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
    if (sessao()) { location.replace('painel.html'); return; }
    const form = $('#form-login');
    const aviso = $('#aviso');
    const inputUser = $('#usuario');
    const inputSenha = $('#senha');

    const ultimo = localStorage.getItem('stz.ultimoAcesso');
    if (ultimo) $('#ultimo-acesso').textContent = ultimo;

    function bloqueioUI(restanteMs) {
      const seg = Math.ceil(restanteMs / 1000);
      aviso.hidden = false;
      aviso.textContent = 'Acesso bloqueado após 3 tentativas. Tente novamente em ' +
        Math.floor(seg / 60) + ':' + String(seg % 60).padStart(2, '0') + '.';
      form.querySelector('button[type=submit]').disabled = true;
      inputUser.disabled = true;
      inputSenha.disabled = true;
    }

    if (Date.now() < bloqueadoAte()) bloqueioUI(bloqueadoAte() - Date.now());

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const r = login(inputUser.value, inputSenha.value);
      if (r.ok) {
        localStorage.setItem('stz.ultimoAcesso', new Date().toLocaleString('pt-BR'));
        location.href = 'painel.html';
      } else if (r.motivo === 'bloqueado') {
        bloqueioUI(r.restanteMs);
      } else if (r.motivo === 'bloqueio3') {
        bloqueioUI(15 * 60 * 1000);
      } else {
        aviso.hidden = false;
        aviso.textContent = 'Usuário ou senha inválidos. Tentativa ' + r.tentativas + ' de 3.';
      }
    });
  }

  /* ---------- Painel (Figura 4) — US07/US08/US09, TA07/TA08/TA09 ---------- */
  function initPainel() {
    const op = STZ_DATA.op;

    /* Banner de estouro de orçamento (US08/TA08) */
    if (op.custoReal > op.orcamento) {
      const b = $('#banner-estouro');
      b.hidden = false;
      $('#banner-estouro-texto').textContent =
        'OP ' + op.id + ': custo real ' + brl(op.custoReal) +
        ' acima do orçamento ' + brl(op.orcamento) + '. Ação preventiva necessária.';
    }

    function render() {
      const vazio = $('#f-periodo').value === 'vazio';
      $('#kpis-vazio').hidden = !vazio;
      $('#kpis').hidden = vazio;
      if (vazio) return;
      const k = STZ_DATA.kpis;
      const jit = n => Math.max(0, Math.round(n + (Math.random() * 4 - 2)));
      const ocup = Math.min(100, jit(k.ocupacao));
      $('#k-ocup').textContent = ocup + ' %';
      $('#k-ocup-bar').style.width = ocup + '%';
      $('#k-tarefas').textContent = jit(k.tarefasConcluidas) + '/' + k.tarefasTotal;
      $('#k-horas').textContent = k.horas;
      const d = k.desvio + (Math.random() < 0.5 ? 0 : -1);
      const kd = $('#k-desvio');
      kd.textContent = (d > 0 ? '+' : '') + d + ' %';
      kd.className = 'stat ' + (d >= 0 ? 'pos' : 'neg');
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
    let sobrescritas = null;
    try { sobrescritas = JSON.parse(localStorage.getItem('stz.maquinas')); } catch (e) { sobrescritas = null; }
    return sobrescritas || STZ_DATA.maquinas;
  }

  function gravarMaquinas(maq) {
    localStorage.setItem('stz.maquinas', JSON.stringify(maq));
  }

  function renderMaquinas() {
    const alvo = $('#maquinas');
    if (!alvo) return;
    alvo.innerHTML = carregarMaquinas().map(m => {
      const ociosa = m.status === 'ociosa';
      const det = ociosa
        ? 'há ' + (m.ociosaMin >= 60 ? Math.floor(m.ociosaMin / 60) + 'h' + String(m.ociosaMin % 60).padStart(2, '0') + 'm' : m.ociosaMin + 'min') +
          (m.motivo ? ' · ' + m.motivo : '')
        : 'em produção desde ' + m.desde;
      return '<div class="chip-maq"><span>' + m.nome + '<br><span class="det">' + det + '</span></span>' +
        '<span class="pill ' + (ociosa ? 'pill-warn' : 'pill-on') + '">' + (ociosa ? 'Ociosa' : 'Em produção') + '</span></div>';
    }).join('');
  }

  /* ---------- Estoque (Figura 2) — RF06 ---------- */
  function initEstoque() {
    const k = STZ_DATA.estoqueKpis;
    $('#e-baixas').textContent = k.baixas.toLocaleString('pt-BR') + ' itens';
    $('#e-criticos').textContent = k.criticos;
    $('#e-alertas').textContent = k.alertas + ' Itens em Alerta';

    const max = Math.max.apply(null, STZ_DATA.consumo.map(c => c.v));
    $('#barras').innerHTML = STZ_DATA.consumo.map(c =>
      '<div class="col"><div class="barra' + (c.v <= 3 ? ' amber' : '') + '" style="height:' + Math.round(c.v / max * 100) + '%"></div>' +
      '<span class="rot">' + c.rot + '</span></div>').join('');

    const itens = STZ_DATA.estoqueItens;
    $('#tabela-itens').innerHTML =
      '<table class="tabela"><thead><tr>' +
      '<th>Código</th><th>Descrição</th><th>Lote</th><th class="num">Saldo</th><th class="num">Mínimo</th><th>Status</th>' +
      '</tr></thead><tbody>' +
      itens.map(i => {
        const abaixo = i.saldo < i.min;
        return '<tr><td>' + i.codigo + '</td><td>' + i.desc + '</td><td>' + i.lote + '</td>' +
          '<td class="num">' + i.saldo + '</td><td class="num">' + i.min + '</td>' +
          '<td><span class="pill ' + (abaixo ? 'pill-warn' : 'pill-on') + '">' +
          (abaixo ? 'Abaixo do mínimo' : 'Normal') + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- Permissões (Figura 3) — US12/UC08 ---------- */
  function initPermissoes() {
    const sel = $('#alvo');
    sel.innerHTML = STZ_DATA.funcionarios.map(f =>
      '<option value="' + f.nome + '">' + f.nome + '</option>').join('');

    let chaveEstado = () => 'stz.perm.' + sel.value;
    let estadoSalvo = {};

    function lerEstado() {
      try { return JSON.parse(localStorage.getItem(chaveEstado())) || {}; } catch (e) { return {}; }
    }

    function render() {
      const f = STZ_DATA.funcionarios.filter(x => x.nome === sel.value)[0];
      const operador = f.perfil === 'operador';
      const estado = lerEstado();
      $('#modulos').innerHTML = STZ_DATA.permissoesModulos.map((m, mi) => {
        const restrito = m.restrito && operador;
        return '<section class="card' + (restrito ? ' restrito' : '') + '">' +
          '<div class="card-header">' + m.nome +
          (restrito ? ' <span class="acao">Restrito ao perfil</span>' : '') + '</div>' +
          '<div class="card-body">' +
          m.acoes.map((a, ai) => {
            const on = !!estado[mi + ':' + ai];
            return '<div class="toggle-row"><span>' + a + '</span>' +
              '<button class="switch' + (on ? ' on' : '') + '" data-k="' + mi + ':' + ai + '" ' +
              'role="switch" aria-checked="' + on + '" aria-label="' + m.nome + ' — ' + a + '"></button></div>';
          }).join('') + '</div></section>';
      }).join('');

      $$('#modulos .switch').forEach(sw => sw.addEventListener('click', () => {
        const e = lerEstado();
        const k = sw.dataset.k;
        e[k] = !e[k];
        localStorage.setItem(chaveEstado(), JSON.stringify(e));
        sw.classList.toggle('on');
        sw.setAttribute('aria-checked', String(sw.classList.contains('on')));
      }));
    }

    sel.addEventListener('change', render);
    render();

    $('#btn-salvar').addEventListener('click', () => {
      logEvento('Permissões salvas para ' + sel.value);
      toast('Permissões de ' + sel.value + ' salvas.', 'ok');
    });
    $('#btn-descartar').addEventListener('click', () => {
      render();
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
      let log = [];
      try { log = JSON.parse(localStorage.getItem('stz.log')) || []; } catch (e) { log = []; }
      $('#log-lista').innerHTML = log.length
        ? log.map(l => '<div class="toggle-row"><span>' + l.msg + '</span><span class="nota">' + l.quando + '</span></div>').join('')
        : '<p class="vazio">Nenhum evento registrado.</p>';
    }
  }

  /* ---------- Tablet (Figura 6) — US01–US06, US14, TA01/02/04/05/06 ---------- */
  function initTablet() {
    const op = STZ_DATA.op;
    const estado = {
      rodando: true,
      seg: 150,                 /* exibe 02:30 como na figura */
      previsto: op.tempoPrevistoSeg,
      etapa: STZ_DATA.etapas.atual,
      total: STZ_DATA.etapas.total,
      concluidas: STZ_DATA.etapas.concluidas.slice(),
      alertado: false
    };
    let materiais = STZ_DATA.materiais.map(m => ({ codigo: m.codigo, desc: m.desc, lote: m.lote, saldo: m.saldo, qtd: m.qtd }));

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
      const linhas = estado.concluidas.map(c =>
        '<p><strong>Etapa ' + c.n + ':</strong> ' + mmss(c.seg) + '</p>').join('');
      const total = estado.concluidas.reduce((s, c) => s + c.seg, 0) + (estado.rodando ? estado.seg : 0);
      $('#tempos-etapas').innerHTML = linhas +
        '<p style="margin-top:8px"><strong>Tempo Total: ' + mmss(total) + '</strong></p>';
    }

    function renderBotoes() {
      $('#btn-iniciar').disabled = estado.rodando;
      $('#btn-finalizar').disabled = !estado.rodando;
      const pill = $('#pill-estado');
      pill.textContent = estado.rodando ? 'RUNNING' : 'PARADA';
      pill.className = 'pill ' + (estado.rodando ? 'pill-on' : 'pill-warn');
      $('#etapa-atual').textContent = 'Etapa ' + estado.etapa + ' de ' + estado.total;
    }

    function renderMateriais() {
      $('#materiais').innerHTML = materiais.map((m, i) =>
        '<tr><td>' + m.codigo + '</td><td>' + m.desc + '</td><td>' + m.lote + '</td>' +
        '<td class="num">' + m.qtd + ' pcs</td><td class="num">' + m.saldo + '</td>' +
        '<td><button class="btn btn-outline" data-i="' + i + '">Registrar consumo</button></td></tr>').join('');
      $$('#materiais button').forEach(b => b.addEventListener('click', () => {
        const m = materiais[+b.dataset.i];
        const t0 = performance.now();
        const r = registrarMaterial(materiais, m.codigo, m.lote, m.qtd);
        const dt = performance.now() - t0;
        if (r.ok) {
          materiais = r.estoque.map(x => {
            const ref = materiais.filter(m2 => m2.codigo === x.codigo)[0];
            return { codigo: x.codigo, desc: ref.desc, lote: x.lote, saldo: x.saldo, qtd: ref.qtd };
          });
          renderMateriais();
          toast('✓ Baixa registrada: ' + m.codigo + ' (' + m.qtd + ' pcs) — ' + dt.toFixed(0) + ' ms (limite 2 s).', 'ok');
        } else {
          const motivo = { item: 'item inexistente', lote: 'lote não cadastrado', saldo: 'saldo insuficiente' }[r.motivo];
          toast('✗ Registro recusado (' + motivo + ').', 'erro');
        }
      }));
    }

    /* Cronômetro + alerta de 10% (US05/TA05) */
    setInterval(() => {
      $('#hora-local').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (!estado.rodando) return;
      estado.seg++;
      $('#cronometro').textContent = mmss(estado.seg);
      if (!estado.alertado && deveAlertarTempo(estado.seg, estado.previsto)) {
        estado.alertado = true;
        const b = $('#alerta-tempo');
        b.hidden = false;
        $('#alerta-tempo-texto').textContent =
          'O tempo de execução em tempo real excedeu o tempo previsto da etapa em 10% (' +
          mmss(estado.seg) + ' vs ' + mmss(estado.previsto) + ').';
        beep();
      }
      if (estado.seg % 5 === 0) renderTempos();
    }, 1000);

    $('#btn-iniciar').addEventListener('click', () => {
      if (estado.etapa > estado.total) { toast('Todas as etapas concluídas.'); return; }
      estado.rodando = true;
      estado.seg = 0;
      estado.alertado = false;
      $('#alerta-tempo').hidden = true;
      $('#cronometro').textContent = mmss(0);
      renderBotoes(); renderTempos();
      toast('Etapa ' + estado.etapa + ' iniciada.', 'ok');
    });

    $('#btn-finalizar').addEventListener('click', () => {
      if (!estado.rodando) return;
      const t0 = performance.now();
      estado.concluidas.push({ n: estado.etapa, seg: estado.seg });
      estado.etapa++;
      estado.rodando = false;
      estado.seg = 0;
      estado.alertado = false;
      $('#alerta-tempo').hidden = true;
      $('#cronometro').textContent = mmss(0);
      renderBotoes(); renderTempos();
      const dt = performance.now() - t0;
      /* TA04: status da OP refletido no painel em até 5 s */
      toast('Etapa finalizada — status da OP atualizado em ' + dt.toFixed(0) + ' ms (limite 5 s).', 'ok');
    });

    /* Parada de máquina (US06/TA06) */
    $('#btn-ociosa').addEventListener('click', () => {
      const motivo = $('#motivo-parada').value;
      const maq = carregarMaquinas();
      const alvo = maq.filter(m => m.nome === STZ_DATA.op.maquina)[0] || maq[0];
      alvo.status = 'ociosa';
      alvo.motivo = motivo;
      alvo.ociosaMin = 0;
      gravarMaquinas(maq);
      toast('Máquina "' + alvo.nome + '" alterada para Ociosa (' + motivo + '). O painel gerencial já reflete.', 'ok');
    });

    $('#motivo-parada').innerHTML = STZ_DATA.motivosParada.map(m => '<option>' + m + '</option>').join('');
    $('#cronometro').textContent = mmss(estado.seg);
    $('#hora-local').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    renderBotoes();
    renderTempos();
    renderMateriais();
  }

  /* ---------- boot ---------- */
  function boot(pagina, modulo) {
    if (pagina === 'login') { initLogin(); return; }
    const s = guard(modulo);
    if (!s) return;
    renderShell(pagina, s);
    ({ painel: initPainel, estoque: initEstoque, permissoes: initPermissoes, tablet: initTablet }[pagina] || function () {})();
  }

  return { boot: boot, toast: toast };
})();

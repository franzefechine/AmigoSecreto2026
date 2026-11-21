/* Amigo Secreto dos Mendoncinhas — site
 *
 * Telas:
 *   (sem nada)   cadastro, com o contador de participantes
 *   ?p=TOKEN     link pessoal: sugestões de presente e, depois, a revelação
 *   #admin       painel do administrador (pede a senha)
 *   #natal       revelação da noite de Natal, para a TV (pede a senha)
 */
'use strict';

// ---------- Utilidades ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ehLink = s => /^https?:\/\/\S+$/i.test(String(s || ''));
const dataBR = iso => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const celBR = d => (d && d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : esc(d));
const reais = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function mascaraCel(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? '(' + d : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const local = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } },
};
const sessao = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } },
};
const CHAVE_TOKEN = 'mendoncinhas:token';
const CHAVE_SENHA = 'mendoncinhas:senha';
const FASES = ['cadastro', 'sugestao', 'sorteio', 'revelacao'];
const NOME_FASE = { cadastro: 'Cadastro', sugestao: 'Sugestões', sorteio: 'Sorteio', revelacao: 'Revelação' };
const BASE = location.origin + location.pathname;
const linkPessoal = token => `${BASE}?p=${encodeURIComponent(token)}`;

// ---------- Estado ----------
const E = {
  status: null, eu: null, admin: null, token: null,
  cadastroFeito: null, caixaAberta: false,
  ui: { abertas: new Set(), editando: null, adicionando: false, mostrarResultado: false, confirmar: null },
  natal: { inicio: null, passo: 0, revelado: false },
  instalar: null,
};

// ---------- Servidor ----------
async function api(acao, dados = {}) {
  let resposta;
  try {
    const r = await fetch(window.CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ acao }, dados)),
    });
    resposta = await r.json();
  } catch (e) {
    throw Object.assign(new Error('Sem conexão com o servidor. Confira a internet e tente de novo.'), { rede: true });
  }
  if (!resposta.ok) throw Object.assign(new Error(resposta.erro || 'Algo deu errado.'), { senhaInvalida: !!resposta.senhaInvalida });
  return resposta;
}

/** Marca o botão como ocupado enquanto o pedido roda (evita clique duplo). */
async function ocupado(botao, tarefa) {
  if (botao) { if (botao.getAttribute('aria-busy') === 'true') return; botao.setAttribute('aria-busy', 'true'); botao.disabled = true; }
  try { return await tarefa(); } finally { if (botao && botao.isConnected) { botao.removeAttribute('aria-busy'); botao.disabled = false; } }
}

let avisoTimer;
function aviso(texto, erro = false) {
  const el = $('#aviso-flutuante');
  el.textContent = texto;
  el.classList.toggle('erro-flutuante', erro);
  el.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { el.hidden = true; }, erro ? 5000 : 2500);
}

// ---------- Blocos comuns ----------
// A estrela do cabeçalho é o atalho discreto para o painel do administrador.
const marca = sobre => `<header class="marca"><div class="neve" aria-hidden="true"></div><a class="estrela" href="${BASE}#admin" aria-label="Área do administrador">★</a><span class="sobre">${esc(sobre)} · Natal 2026</span><h1>Amigo Secreto dos <span>Mendoncinhas</span></h1><div class="pisca" aria-hidden="true">${'<i></i>'.repeat(14)}</div></header>`;
const contadorHTML = n => `<div class="contador"><span class="bola"><strong>${n}</strong></span><p>${n === 1 ? 'Mendoncinha já está' : 'Mendoncinhas já estão'} na roda do amigo secreto!</p></div>`;
function fasesHTML(fase) {
  const i = FASES.indexOf(fase);
  return `<ol class="fases" aria-label="Etapas do amigo secreto">${FASES.map((f, k) => `<li class="${k < i || (i === 3 && k === 3) ? 'feita' : k === i ? 'atual' : ''}">${NOME_FASE[f]}</li>`).join('')}</ol>`;
}
const regrasHTML = info => `<section class="cartao"><h2>Regras</h2><ul class="regras">
  <li>Ninguém tira a si mesmo.</li>
  <li>Mantenha segredo sobre quem você tirou.</li>
  <li>Valor mínimo do presente: <b>${reais(info.valorMinimo)}</b>.</li>
  <li>Troca de presentes em <b>${dataBR(info.prazos.troca)}</b>.</li></ul></section>`;
const regressivaHTML = info => `<section class="cartao"><h2>Contagem para a troca de presentes</h2><div class="regressiva" id="regressiva" data-alvo="${esc(info.prazos.troca)}"></div></section>`;
function atualizaRegressiva() {
  const el = $('#regressiva'); if (!el) return;
  const [a, m, d] = (el.dataset.alvo || '2026-12-24').split('-').map(Number);
  const ms = Math.max(new Date(a, m - 1, d) - new Date(), 0);
  const dias = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, min = Math.floor(ms / 6e4) % 60;
  el.innerHTML = `<div><b>${dias}</b><span>${dias === 1 ? 'dia' : 'dias'}</span></div><div><b>${h}</b><span>horas</span></div><div><b>${min}</b><span>minutos</span></div>`;
}
setInterval(atualizaRegressiva, 30000);

const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const instalarHTML = () => (instalado() ? '' : `<section class="cartao instalar"><span class="icone" aria-hidden="true">★</span>
  <div class="instalar-txt"><h2>Tenha no seu celular</h2><p class="sutil">Coloque um ícone na tela inicial e abra seu link sem procurar no WhatsApp.</p></div>
  <button class="btn claro" id="instalar">Adicionar à tela inicial</button></section>`);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); E.instalar = e; });
async function instalar() {
  if (E.instalar) {
    E.instalar.prompt();
    try { await E.instalar.userChoice; } catch (e) { /* ignorado */ }
    E.instalar = null;
    return;
  }
  abrirModal('Adicionar à tela inicial', `<div class="instalar-topo"><span class="icone" aria-hidden="true">★</span>
      <p>O ícone <b>Mendoncinhas</b> fica junto com seus aplicativos e abre direto o seu link pessoal.</p></div>
    <div><b>No iPhone</b><ol class="passos"><li>Abra este link no Safari.</li><li>Toque em Compartilhar (o quadrado com a seta para cima).</li><li>Escolha "Adicionar à Tela de Início".</li></ol></div>
    <div><b>No Android</b><ol class="passos"><li>Abra este link no Chrome.</li><li>Toque nos três pontinhos ⋮ no canto.</li><li>Escolha "Adicionar à tela inicial" ou "Instalar app".</li></ol></div>`);
}

function abrirModal(titulo, corpo) {
  $('#modal').innerHTML = `<div class="modal-fundo" id="fundo"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
    <h2 id="mt">${titulo}</h2>${corpo}<button class="btn" id="fecha">Fechar</button></div></div>`;
  $('#fecha').onclick = fecharModal;
  $('#fundo').onclick = e => { if (e.target.id === 'fundo') fecharModal(); };
  $('#fecha').focus();
}
function fecharModal() { $('#modal').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#fundo')) fecharModal(); });

function confete(x, y) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confete'; document.body.appendChild(c);
  const dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
  const cores = ['#F2CB62', '#B5223B', '#17573C', '#E45369', '#74B9FF'];
  const ps = Array.from({ length: 150 }, () => ({ x, y, vx: (Math.random() - .5) * 10, vy: -Math.random() * 12 - 4, r: Math.random() * 4 + 2,
    cor: cores[Math.random() * cores.length | 0], rot: Math.random() * 6, vr: (Math.random() - .5) * .3, bola: Math.random() < .35 }));
  let t = 0;
  (function passo() {
    g.clearRect(0, 0, W, H);
    ps.forEach(p => {
      p.vy += .28; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.cor;
      if (p.bola) { g.beginPath(); g.arc(0, 0, p.r, 0, 7); g.fill(); } else g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      g.restore();
    });
    if (++t < 160) requestAnimationFrame(passo); else c.remove();
  })();
}

function abrirWhatsApp(celular, texto) {
  // api.whatsapp.com em vez de wa.me: o redirecionamento do wa.me estraga alguns emojis (aparecem como �).
  const url = 'https://api.whatsapp.com/send?' + (celular ? 'phone=55' + celular + '&' : '') + 'text=' + encodeURIComponent(texto);
  // Sem "noopener" aqui: com ele o navegador sempre devolve null e não daria para saber se abriu.
  const janela = window.open(url, '_blank');
  if (janela) janela.opener = null;
  else location.href = url;
}

/** Troca o conteúdo da tela mantendo o foco no mesmo campo, quando existir. */
function mostrar(html, largo = false) {
  const app = $('#app');
  const foco = document.activeElement && document.activeElement.id;
  app.className = largo ? 'largo' : '';
  app.innerHTML = html;
  const ins = $('#instalar'); if (ins) ins.onclick = instalar;
  atualizaRegressiva();
  if (foco && document.getElementById(foco)) document.getElementById(foco).focus({ preventScroll: true });
}

function telaErro(mensagem, tentarDeNovo) {
  mostrar(`<div class="tela">${marca('Ops')}<section class="cartao"><div class="aviso alerta">${esc(mensagem)}</div>
    ${tentarDeNovo ? '<button class="btn" id="tentar">Tentar de novo</button>' : ''}</section></div>`);
  const b = $('#tentar'); if (b) b.onclick = tentarDeNovo;
}

// ---------- Cadastro ----------
async function iniciarCadastro() {
  try { E.status = await api('status'); } catch (e) { return telaErro(e.message, iniciarCadastro); }
  telaCadastro();
}

function telaCadastro() {
  const st = E.status;
  const meuToken = local.get(CHAVE_TOKEN);
  const meuLink = meuToken ? `<section class="cartao"><h2>Você já tem um link pessoal neste celular</h2>
    <a class="btn" href="${esc(linkPessoal(meuToken))}">Abrir meu link pessoal</a></section>` : '';

  if (E.cadastroFeito) {
    mostrar(`<div class="tela">${marca('Cadastro')}
      <section class="cartao"><div class="aviso ok">✓ Cadastro feito!</div>
      <h2>Bem-vindo à roda, ${esc(E.cadastroFeito)}!</h2>
      <p>Você vai receber pelo WhatsApp o seu <b>link pessoal</b>. É nele que você vai sugerir presentes e, depois do sorteio, descobrir quem tirou.</p>
      <button class="btn claro" id="outro">Cadastrar outra pessoa</button></section>
      ${contadorHTML(st.participantes)}${regrasHTML(st)}</div>`);
    $('#outro').onclick = () => { E.cadastroFeito = null; telaCadastro(); };
    return;
  }

  if (st.fase !== 'cadastro') {
    mostrar(`<div class="tela">${marca('Cadastro')}
      ${meuLink}
      <section class="cartao"><h2>O cadastro está encerrado</h2>
      <p>Se você já se cadastrou, use o link pessoal que chegou pelo WhatsApp. Se ficou de fora, fale com quem organiza o amigo secreto.</p></section>
      ${contadorHTML(st.participantes)}${regrasHTML(st)}</div>`);
    return;
  }

  mostrar(`<div class="tela">${marca('Cadastro')}
    ${contadorHTML(st.participantes)}
    ${meuLink}
    <form class="cartao" id="form-cad" novalidate>
      <h2>Entre na roda</h2>
      <p class="sutil">Cadastro aberto até ${dataBR(st.prazos.cadastro)}.</p>
      <div class="campo"><label for="cad-nome">Seu nome</label><input id="cad-nome" autocomplete="name" maxlength="40" placeholder="Como a família te chama"></div>
      <div class="campo"><label for="cad-cel">Celular com WhatsApp</label><input id="cad-cel" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="(31) 99999-9999"></div>
      <p class="erro" id="cad-erro" role="alert" hidden></p>
      <button class="btn" type="submit" id="cad-enviar">Entrar no amigo secreto</button>
    </form>
    ${regrasHTML(st)}</div>`);

  const cel = $('#cad-cel');
  cel.oninput = () => { cel.value = mascaraCel(cel.value); };
  $('#form-cad').onsubmit = e => {
    e.preventDefault();
    const erro = $('#cad-erro');
    const nome = $('#cad-nome').value.trim(), c = cel.value;
    const msg = !nome ? 'Escreva seu nome.' : c.replace(/\D/g, '').length !== 11 ? 'Confira o celular: DDD + 9 números.' : '';
    if (msg) { erro.textContent = msg; erro.hidden = false; return; }
    ocupado($('#cad-enviar'), async () => {
      try {
        const r = await api('cadastrar', { nome, celular: c });
        E.cadastroFeito = r.nome; E.status.participantes = r.participantes;
        telaCadastro();
        window.scrollTo(0, 0);
      } catch (err) { erro.textContent = err.message; erro.hidden = false; }
    });
  };
}

// ---------- Link pessoal ----------
async function iniciarPessoal(token) {
  E.token = token;
  try { E.eu = await api('eu', { token }); } catch (e) { return telaErro(e.message, e.rede ? () => iniciarPessoal(token) : null); }
  local.set(CHAVE_TOKEN, token);
  E.caixaAberta = local.get('mendoncinhas:aberta:' + token) === '1';
  telaPessoal();
}

function formSugestoesHTML(eu) {
  const s = eu.sugestoes.concat([{}, {}, {}]).slice(0, 3), x = eu.extras;
  return `<form class="cartao" id="form-sug" novalidate>
    <h2>Suas sugestões de presente</h2>
    <p class="sutil">Até 3 ideias. Quem te tirar vai ver esta lista. Você pode mudar até ${dataBR(eu.prazos.sugestao)}.</p>
    ${s.map((g, i) => `<div class="sugestao"><h3>Sugestão ${i + 1}${i ? ' (opcional)' : ''}</h3>
      <div class="campo"><label for="sug-${i}">O que é</label><input id="sug-${i}" maxlength="120" value="${esc(g.desc)}" placeholder="Ex.: livro, perfume, camisa…"></div>
      <div class="campo"><label for="sug-link-${i}">Link da loja (opcional)</label><input id="sug-link-${i}" type="url" inputmode="url" maxlength="400" value="${esc(g.link)}" placeholder="https://"></div></div>`).join('')}
    <div class="sugestao"><h3>Para ajudar quem te tirar</h3>
      <div class="dupla">
        <div class="campo"><label for="ex-roupa">Tamanho de roupa</label><input id="ex-roupa" maxlength="10" value="${esc(x.roupa)}"></div>
        <div class="campo"><label for="ex-calcado">Calçado</label><input id="ex-calcado" inputmode="numeric" maxlength="6" value="${esc(x.calcado)}"></div>
      </div>
      <div class="campo"><label for="ex-nao">Não gosto de…</label><input id="ex-nao" maxlength="120" value="${esc(x.naoGosta)}"></div>
    </div>
    <p class="erro" id="sug-erro" role="alert" hidden></p>
    <button class="btn" type="submit" id="sug-salvar">${eu.sugestoes.length ? 'Salvar alterações' : 'Salvar sugestões'}</button>
  </form>`;
}

function listaSugestoesHTML(sugestoes, extras) {
  const itens = sugestoes.length
    ? `<ul class="lista-sug">${sugestoes.map(s => `<li>${esc(s.desc)}${ehLink(s.link) ? `<br><a href="${esc(s.link)}" target="_blank" rel="noopener noreferrer">Ver na loja</a>` : ''}</li>`).join('')}</ul>`
    : '<p class="sutil">Nenhuma sugestão foi informada.</p>';
  const ficha = [['Roupa', extras.roupa], ['Calçado', extras.calcado], ['Não gosta de', extras.naoGosta]].filter(([, v]) => v);
  return itens + (ficha.length ? `<dl class="ficha">${ficha.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '');
}

function telaPessoal() {
  const eu = E.eu;
  const topo = `${marca('Seu link pessoal')}`;
  const rodape = `${instalarHTML()}${regressivaHTML(eu)}${regrasHTML(eu)}`;

  if (eu.fase === 'cadastro' || eu.fase === 'sugestao') {
    mostrar(`<div class="tela">${topo}
      <p class="saudacao">Oi, <b>${esc(eu.nome)}</b>! O que você gostaria de ganhar?</p>
      ${fasesHTML(eu.fase)}${contadorHTML(eu.participantes)}
      ${formSugestoesHTML(eu)}${rodape}</div>`);
    ligarSugestoes();
    return;
  }

  if (eu.fase === 'sorteio' || !eu.amigo) {
    mostrar(`<div class="tela">${topo}
      <p class="saudacao">Oi, <b>${esc(eu.nome)}</b>!</p>
      ${fasesHTML(eu.fase)}
      <section class="cartao"><h2>O sorteio está chegando</h2>
        <p>As sugestões estão fechadas. O sorteio está marcado para <b>${dataBR(eu.prazos.sorteio)}</b>. Quando acontecer, você recebe uma mensagem no WhatsApp e descobre aqui quem tirou.</p></section>
      <section class="cartao"><h2>Suas sugestões</h2>${listaSugestoesHTML(eu.sugestoes, eu.extras)}</section>
      ${contadorHTML(eu.participantes)}${rodape}</div>`);
    return;
  }

  const a = eu.amigo;
  mostrar(`<div class="tela">${topo}
    <p class="saudacao">Oi, <b>${esc(eu.nome)}</b>! Chegou a hora.</p>
    ${fasesHTML(eu.fase)}
    ${eu.presenteComprado ? '<div class="aviso presente">🎁 Seu presente já foi comprado! Quem te tirou já está preparado.</div>' : ''}
    <section class="cartao">
      <div class="palco">
        <button class="caixa ${E.caixaAberta ? 'aberta' : ''}" id="caixa" aria-label="${E.caixaAberta ? 'Você tirou ' + esc(a.nome) : 'Toque para abrir o presente'}">
          <span class="bilhete"><small>Você tirou</small><strong>${esc(a.nome)}</strong></span>
          <span class="tampa"><span class="laco"></span></span>
          <span class="corpo"></span>
        </button>
        <p class="dica-toque" id="dica">${E.caixaAberta ? 'Shhh… é segredo!' : 'Toque no presente para abrir'}</p>
      </div>
    </section>
    <div id="depois" class="tela" ${E.caixaAberta ? '' : 'hidden'}>
      <section class="cartao"><h2>O que ${esc(a.nome)} gostaria de ganhar</h2>${listaSugestoesHTML(a.sugestoes, a.extras)}</section>
      <section class="cartao">
        ${eu.euComprei
          ? `<div class="aviso ok">✓ Você marcou que já comprou. ${esc(a.nome)} vai ver "Seu presente já foi comprado!".</div><button class="btn claro" id="comprei">Desmarcar</button>`
          : `<h2>Já comprou o presente?</h2><p class="sutil">Quem você tirou vai ver um aviso, sem saber que foi você.</p><button class="btn berry" id="comprei">Já comprei o presente!</button>`}
      </section>
    </div>
    ${rodape}</div>`);

  $('#caixa').onclick = () => {
    if (E.caixaAberta) return;
    E.caixaAberta = true;
    local.set('mendoncinhas:aberta:' + E.token, '1');
    const caixa = $('#caixa');
    caixa.classList.add('aberta');
    caixa.setAttribute('aria-label', 'Você tirou ' + a.nome);
    $('#dica').textContent = 'Shhh… é segredo!';
    const r = caixa.getBoundingClientRect();
    setTimeout(() => confete(r.left + r.width / 2, r.top + 30), 450);
    setTimeout(() => { const d = $('#depois'); if (d) d.hidden = false; }, 900);
  };
  $('#comprei').onclick = e => ocupado(e.currentTarget, async () => {
    try {
      E.eu = await api('comprei', { token: E.token, comprou: !eu.euComprei });
      telaPessoal();
      aviso(E.eu.euComprei ? 'Marcado: presente comprado!' : 'Desmarcado.');
    } catch (err) { aviso(err.message, true); }
  });
}

function ligarSugestoes() {
  $('#form-sug').onsubmit = e => {
    e.preventDefault();
    const erro = $('#sug-erro');
    const sugestoes = [0, 1, 2].map(i => ({ desc: $('#sug-' + i).value.trim(), link: $('#sug-link-' + i).value.trim() }));
    const extras = { roupa: $('#ex-roupa').value, calcado: $('#ex-calcado').value, naoGosta: $('#ex-nao').value };
    const linkRuim = sugestoes.findIndex(s => s.link && !ehLink(s.link));
    if (!sugestoes.some(s => s.desc)) { erro.textContent = 'Escreva pelo menos uma sugestão de presente.'; erro.hidden = false; return; }
    if (linkRuim >= 0) { erro.textContent = `O link da sugestão ${linkRuim + 1} precisa começar com https://`; erro.hidden = false; return; }
    ocupado($('#sug-salvar'), async () => {
      try {
        E.eu = await api('salvarSugestoes', { token: E.token, sugestoes, extras });
        telaPessoal();
        aviso('✓ Sugestões salvas');
      } catch (err) { erro.textContent = err.message; erro.hidden = false; }
    });
  };
}

// ---------- Administrador ----------
const senha = () => sessao.get(CHAVE_SENHA);

async function iniciarAdmin(depois) {
  if (!senha()) return telaLogin(depois);
  if (!E.admin) {
    mostrar(`<div class="tela">${marca('Administrador')}<p class="carregando">Carregando…</p></div>`, true);
    try { E.admin = await api('adminDados', { senha: senha() }); } catch (e) {
      if (e.senhaInvalida) { sessao.del(CHAVE_SENHA); return telaLogin(depois); }
      return telaErro(e.message, () => iniciarAdmin(depois));
    }
  }
  depois();
}

function telaLogin(depois) {
  mostrar(`<div class="tela">${marca('Administrador')}
    <form class="cartao" id="form-login"><h2>Entrar no painel</h2>
      <div class="campo"><label for="adm-senha">Senha do administrador</label><input id="adm-senha" type="password" autocomplete="current-password"></div>
      <p class="erro" id="login-erro" role="alert" hidden></p>
      <button class="btn" type="submit" id="login-entrar">Entrar</button></form></div>`, true);
  $('#adm-senha').focus();
  $('#form-login').onsubmit = e => {
    e.preventDefault();
    const s = $('#adm-senha').value;
    ocupado($('#login-entrar'), async () => {
      try {
        E.admin = await api('adminDados', { senha: s });
        sessao.set(CHAVE_SENHA, s);
        depois();
      } catch (err) { const el = $('#login-erro'); el.textContent = err.message; el.hidden = false; }
    });
  };
}

/** Executa uma ação do administrador e redesenha o painel com os dados novos. */
async function adm(botao, acao, dados = {}, sucesso) {
  return ocupado(botao, async () => {
    try {
      E.admin = await api(acao, Object.assign({ senha: senha() }, dados));
      if (sucesso) sucesso();
      telaAdmin();
    } catch (err) {
      if (err.senhaInvalida) { sessao.del(CHAVE_SENHA); E.admin = null; return telaLogin(telaAdmin); }
      aviso(err.message, true);
    }
  });
}

// Mensagens do WhatsApp. Formatação do WhatsApp: *negrito* e _itálico_.
const PRAZOS = ['cadastro', 'sugestao', 'sorteio', 'troca'];
let timerPrazos;
/** Prazos para as mensagens: os que estão na tela do painel (mesmo que ainda salvando). */
function prazos() {
  const atuais = Object.assign({}, E.admin.prazos);
  PRAZOS.forEach(k => { const el = $('#pz-' + k); if (el && el.value) atuais[k] = el.value; });
  return atuais;
}
const diasAte = iso => {
  const [a, m, d] = iso.split('-').map(Number);
  return Math.max(Math.ceil((new Date(a, m - 1, d) - new Date()) / 864e5), 0);
};
const mensagens = {
  convite: () => [
    '🎄✨ *Amigo Secreto dos Mendoncinhas* ✨🎄',
    '_Natal 2026_',
    '',
    'Chegou a hora de entrar na roda! 🎁',
    '',
    `📝 Faça seu cadastro até *${dataBR(prazos().cadastro)}*:`,
    `👉 ${BASE}`,
    '',
    `💰 Presente de no mínimo *${reais(E.admin.valorMinimo)}*`,
    `📅 Troca de presentes em *${dataBR(prazos().troca)}*`,
    '',
    'Contamos com você! ❤️',
  ].join('\n'),
  link: p => [
    `Oi, *${p.nome}*! 👋🎄`,
    '',
    'Este é o seu *link pessoal* do *Amigo Secreto dos Mendoncinhas*:',
    `👉 ${linkPessoal(p.token)}`,
    '',
    'Por ele você vai:',
    `🎁 sugerir o presente que gostaria de ganhar (até *${dataBR(prazos().sugestao)}*)`,
    '🔍 descobrir quem você tirou, depois do sorteio',
    '',
    '📌 _Guarde esta mensagem! O link é só seu, não compartilhe._',
  ].join('\n'),
  lembrarSugestao: p => [
    `Oi, *${p.nome}*! 🎄`,
    '',
    'Ainda falta você *sugerir seu presente* no Amigo Secreto dos Mendoncinhas. 🎁',
    `⏰ O prazo vai até *${dataBR(prazos().sugestao)}*.`,
    '',
    'É rapidinho, é só abrir seu link:',
    `👉 ${linkPessoal(p.token)}`,
  ].join('\n'),
  revelacao: p => [
    `Oi, *${p.nome}*! 🎉`,
    '',
    'O *sorteio* do Amigo Secreto dos Mendoncinhas foi feito! 🎄',
    '',
    'Abra seu link e toque no presente para descobrir quem você tirou: 🎁',
    `👉 ${linkPessoal(p.token)}`,
    '',
    `💰 Presente de no mínimo *${reais(E.admin.valorMinimo)}*`,
    `📅 Troca de presentes em *${dataBR(prazos().troca)}*`,
    '🤫 _E bico calado: é segredo!_',
  ].join('\n'),
  lembrarCompra: p => {
    const dias = diasAte(prazos().troca);
    return [
      `Oi, *${p.nome}*! 🛍️`,
      '',
      'Já comprou o presente do seu amigo secreto? 🎁',
      '',
      'Quando comprar, abra seu link e toque em *"Já comprei o presente!"* ✅',
      'Assim quem você tirou fica sabendo que o presente está garantido _(sem saber que foi você)_. 😉',
      '',
      dias > 0 ? `⏳ ${dias === 1 ? '*Falta 1 dia*' : `*Faltam ${dias} dias*`} para a troca de presentes!` : '🎄 *É hoje a troca de presentes!*',
      `👉 ${linkPessoal(p.token)}`,
    ].join('\n');
  },
};

function telaAdmin() {
  const D = E.admin, P = D.pessoas, ui = E.ui, fase = D.fase, iFase = FASES.indexOf(fase);
  const porId = Object.fromEntries(P.map(p => [p.id, p]));
  const sugeriram = P.filter(p => p.sugeriu).length, compraram = P.filter(p => p.comprou).length;
  const nRestr = id => D.restricoes.filter(r => r[0] === id || r[1] === id).length;
  const restrito = (a, b) => D.restricoes.some(r => (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a));
  const antesSorteio = fase === 'cadastro' || fase === 'sugestao';

  const statusPessoa = p => {
    if (antesSorteio) return `${p.linkEnviado ? '<span class="pill sim">Link enviado</span>' : '<span class="pill neutro">Link não enviado</span>'}${p.sugeriu ? '<span class="pill sim">Sugeriu presente</span>' : '<span class="pill nao">Sem sugestão</span>'}`;
    if (fase === 'sorteio') return `${p.sugeriu ? '<span class="pill sim">Sugeriu presente</span>' : '<span class="pill nao">Sem sugestão</span>'}<span class="pill neutro">${nRestr(p.id)} ${nRestr(p.id) === 1 ? 'restrição' : 'restrições'}</span>`;
    const envio = p.revelacaoEnviada ? '<span class="pill sim">Enviado</span>' : '<span class="pill neutro">Não enviado</span>';
    if (!p.revelacaoEnviada) return envio;
    return envio + (p.comprou ? '<span class="pill sim">Comprou</span>' : '<span class="pill nao">Não comprou</span>');
  };
  const acaoPessoa = p => {
    const b = [];
    if (antesSorteio) {
      b.push(`<button class="btn" data-enviar-link="${p.id}">${p.linkEnviado ? 'Reenviar link' : 'Enviar link'}</button>`);
      if (p.linkEnviado && !p.sugeriu) b.push(`<button class="btn claro" data-lembrar="${p.id}">Lembrar</button>`);
    }
    if (fase === 'revelacao' && D.temSorteio) {
      b.push(`<button class="btn" data-enviar="${p.id}">${p.revelacaoEnviada ? 'Reenviar' : 'Enviar'}</button>`);
      // "Lembrar compra" só depois que a pessoa soube quem tirou.
      if (p.revelacaoEnviada && !p.comprou) b.push(`<button class="btn claro" data-lembrar-compra="${p.id}">Lembrar compra</button>`);
    }
    if (!D.temSorteio) b.push(`<button class="btn claro" data-restr="${p.id}" aria-expanded="${ui.abertas.has(p.id)}">Não pode tirar…</button>`);
    b.push(`<button class="btn claro" data-editar="${p.id}" aria-expanded="${ui.editando === p.id}">Editar</button>`);
    return b.join('');
  };
  const painelPessoa = p => {
    let html = '';
    if (ui.abertas.has(p.id) && !D.temSorteio) {
      html += `<div class="painel-extra restricoes"><b>${esc(p.nome)} não pode tirar (e não pode ser tirado por):</b><div class="grade">${P.filter(o => o.id !== p.id).map(o => `<label><input type="checkbox" data-a="${p.id}" data-b="${o.id}" ${restrito(p.id, o.id) ? 'checked' : ''}>${esc(o.nome)}</label>`).join('')}</div></div>`;
    }
    if (ui.editando === p.id) {
      const conf = ui.confirmar === 'remover:' + p.id;
      html += `<form class="painel-extra" data-form-editar="${p.id}">
        <div class="dupla">
          <div class="campo"><label for="ed-nome-${p.id}">Nome</label><input id="ed-nome-${p.id}" maxlength="40" value="${esc(p.nome)}"></div>
          <div class="campo"><label for="ed-cel-${p.id}">Celular</label><input id="ed-cel-${p.id}" type="tel" inputmode="numeric" value="${esc(mascaraCel(p.celular))}" data-mascara></div>
        </div>
        ${conf ? `<div class="confirma"><b>Remover ${esc(p.nome)}?</b><p>${D.temSorteio ? 'O sorteio atual será apagado e precisará ser refeito.' : 'A pessoa sai do amigo secreto.'}</p>
          <div class="btn-linha"><button type="button" class="btn berry" data-remover-sim="${p.id}">Sim, remover</button><button type="button" class="btn claro" data-cancelar-confirma>Cancelar</button></div></div>` : ''}
        <div class="btn-linha"><button class="btn" type="submit">Salvar</button><button type="button" class="btn claro" data-remover="${p.id}">Remover</button><button type="button" class="btn claro" data-fechar-editar>Fechar</button></div>
      </form>`;
    }
    return html;
  };

  const sorteioHTML = iFase >= 2 ? `<section class="cartao"><h2>Sorteio</h2>
    ${D.temSorteio ? `<div class="aviso ok">✓ Sorteio feito: uma roda única com ${P.length} pessoas.</div>
      <div class="btn-linha">
        <button class="btn claro" id="espiar">${ui.mostrarResultado ? 'Esconder resultado' : 'Ver resultado (espiar)'}</button>
        <button class="btn claro" id="refazer">Refazer sorteio</button>
        <button class="btn claro" id="apagar">Mudar restrições</button>
      </div>
      ${ui.mostrarResultado ? `<ol class="roda" aria-label="Roda do sorteio">${rodaOrdenada(P[0].id).map(id => `<li>${esc(porId[id].nome)}</li><li class="seta" aria-hidden="true">→</li>`).join('')}<li>${esc(P[0].nome)}</li></ol>` : ''}
      ${ui.confirmar === 'refazer' ? `<div class="confirma"><b>Refazer o sorteio?</b><p>O resultado atual será descartado. Quem já recebeu a mensagem vai precisar receber de novo, e as marcações de "já comprei" serão apagadas.</p>
        <div class="btn-linha"><button class="btn berry" id="sim-refazer">Sim, refazer</button><button class="btn claro" data-cancelar-confirma>Cancelar</button></div></div>` : ''}
      ${ui.confirmar === 'apagar' ? `<div class="confirma"><b>Apagar o sorteio para mudar as restrições?</b><p>Depois de ajustar, faça o sorteio de novo.${fase === 'revelacao' ? ' A etapa volta para Sorteio.' : ''}</p>
        <div class="btn-linha"><button class="btn berry" id="sim-apagar">Sim, apagar</button><button class="btn claro" data-cancelar-confirma>Cancelar</button></div></div>` : ''}`
    : `<p>Antes de sortear, confira em "Não pode tirar…" as restrições de cada pessoa. Elas valem nos dois sentidos.</p>
      <button class="btn berry" id="sortear">Fazer o sorteio</button>`}
  </section>` : '';

  mostrar(`<div class="tela">${marca('Administrador')}
    ${fasesHTML(fase)}
    <div class="resumo"><div><b>${P.length}</b><span>cadastrados</span></div><div><b>${sugeriram}</b><span>sugeriram presente</span></div><div><b>${compraram}</b><span>já compraram</span></div></div>

    <section class="cartao"><h2>Etapa atual: ${NOME_FASE[fase]}</h2>
      <p class="sutil">Você pode avançar antes do prazo, por exemplo se todos já se cadastraram.</p>
      ${iFase < 3 ? `<p>Próxima etapa: <b>${NOME_FASE[FASES[iFase + 1]]}</b></p>` : '<p>Esta é a última etapa.</p>'}
      <div class="etapas">
        <button class="btn claro" id="voltar" ${iFase === 0 ? 'disabled' : ''}>← Voltar</button>
        <button class="btn" id="avancar" ${iFase === 3 || (iFase === 2 && !D.temSorteio) ? 'disabled' : ''}>Avançar →</button>
      </div>
      ${iFase === 2 && !D.temSorteio ? '<p class="sutil">Faça o sorteio para liberar a revelação.</p>' : ''}
    </section>

    ${fase === 'cadastro' ? `<section class="cartao"><h2>Link de cadastro</h2>
      <p>Mande este link no grupo da família para cada um se cadastrar:</p>
      <p class="quebra"><a href="${esc(BASE)}" target="_blank" rel="noopener">${esc(BASE)}</a></p>
      <div class="btn-linha"><button class="btn" id="convite">Mandar no WhatsApp</button><button class="btn claro" id="copiar-convite">Copiar link</button></div>
    </section>` : ''}

    ${sorteioHTML}

    ${fase === 'revelacao' && D.temSorteio ? `<section class="cartao"><h2>Noite de Natal</h2>
      <p class="sutil">Na hora da troca de presentes, abra a revelação geral na TV. A roda aparece pessoa por pessoa.</p>
      <a class="btn berry" href="#natal">Abrir revelação da noite de Natal</a></section>` : ''}

    <section class="cartao"><h2>Participantes</h2>
      ${antesSorteio ? `<p class="sutil">Envie a cada pessoa o link pessoal dela. ${P.length - sugeriram} ${P.length - sugeriram === 1 ? 'pessoa ainda não sugeriu' : 'pessoas ainda não sugeriram'} presente.</p>` : ''}
      ${fase === 'revelacao' ? '<p class="sutil">Envie a mensagem de revelação para cada pessoa. Depois do envio aparece o botão "Lembrar compra" para quem ainda não marcou que comprou.</p>' : ''}
      ${ui.adicionando ? `<form class="painel-extra" id="form-add">
          <div class="dupla">
            <div class="campo"><label for="add-nome">Nome</label><input id="add-nome" maxlength="40"></div>
            <div class="campo"><label for="add-cel">Celular</label><input id="add-cel" type="tel" inputmode="numeric" placeholder="(31) 99999-9999" data-mascara></div>
          </div>
          ${D.temSorteio ? '<p class="erro">Atenção: adicionar alguém apaga o sorteio atual.</p>' : ''}
          <div class="btn-linha"><button class="btn" type="submit">Adicionar</button><button class="btn claro" type="button" id="fechar-add">Fechar</button></div>
        </form>` : '<div class="btn-linha"><button class="btn claro" id="abrir-add">+ Adicionar participante</button></div>'}
      ${P.length ? `<ul class="pessoas">${P.map(p => `<li class="pessoa">
        <div class="quem"><b>${esc(p.nome)}</b><span>${celBR(p.celular)}</span>${D.temSorteio && ui.mostrarResultado && porId[p.tirouId] ? `<span> · tirou ${esc(porId[p.tirouId].nome)}</span>` : ''}<div class="status">${statusPessoa(p)}</div></div>
        <div class="acoes">${acaoPessoa(p)}</div>
        ${painelPessoa(p)}
      </li>`).join('')}</ul>` : '<p class="sutil">Ninguém se cadastrou ainda.</p>'}
    </section>

    <section class="cartao"><h2>Prazos</h2>
      <p class="sutil">Aparecem para os participantes e nas mensagens do WhatsApp. Mudanças são salvas sozinhas.</p>
      <div class="prazos">
        <div class="campo"><label for="pz-cadastro">Cadastro até</label><input type="date" id="pz-cadastro" value="${esc(D.prazos.cadastro)}"></div>
        <div class="campo"><label for="pz-sugestao">Sugestões até</label><input type="date" id="pz-sugestao" value="${esc(D.prazos.sugestao)}"></div>
        <div class="campo"><label for="pz-sorteio">Sorteio em</label><input type="date" id="pz-sorteio" value="${esc(D.prazos.sorteio)}"></div>
        <div class="campo"><label for="pz-troca">Troca de presentes</label><input type="date" id="pz-troca" value="${esc(D.prazos.troca)}"></div>
      </div>
      <p id="prazos-estado" class="sutil" role="status">✓ Prazos salvos.</p>
      <button class="btn" id="salvar-prazos" hidden>Salvar prazos</button>
    </section>

    <div class="btn-linha"><button class="btn claro" id="atualizar">Atualizar dados</button><button class="btn claro" id="sair">Sair do painel</button></div>
  </div>`, true);

  ligarAdmin();
}

/** A roda na ordem de quem tira quem, começando por `inicio`. */
function rodaOrdenada(inicio) {
  const P = E.admin.pessoas, tira = Object.fromEntries(P.map(p => [p.id, p.tirouId]));
  const roda = [inicio];
  while (roda.length < P.length && tira[roda[roda.length - 1]] !== inicio) roda.push(tira[roda[roda.length - 1]]);
  return roda;
}

function ligarAdmin() {
  const D = E.admin, ui = E.ui, iFase = FASES.indexOf(D.fase);
  const pessoa = id => D.pessoas.find(p => p.id === id);
  const on = (sel, fn) => $$(sel).forEach(el => { el.onclick = e => fn(el, e); });

  on('#avancar', b => adm(b, 'adminConfig', { fase: FASES[iFase + 1] }, () => { ui.confirmar = null; aviso('Etapa: ' + NOME_FASE[FASES[iFase + 1]]); }));
  on('#voltar', b => adm(b, 'adminConfig', { fase: FASES[iFase - 1] }, () => { ui.confirmar = null; aviso('Etapa: ' + NOME_FASE[FASES[iFase - 1]]); }));
  // Prazos: salvos sozinhos pouco depois de mudar (e ao sair do campo). No iPhone o evento
  // "change" do campo de data nem sempre dispara, por isso ouvimos também "input" e "blur".
  const estadoPrazos = $('#prazos-estado'), botaoPrazos = $('#salvar-prazos');
  const pendentes = () => {
    const novos = {};
    PRAZOS.forEach(k => { const v = $('#pz-' + k).value; if (v && v !== D.prazos[k]) novos[k] = v; });
    return novos;
  };
  const salvarPrazos = () => {
    clearTimeout(timerPrazos);
    const novos = pendentes();
    if (!Object.keys(novos).length) return;
    estadoPrazos.textContent = 'Salvando…';
    adm(botaoPrazos, 'adminConfig', { prazos: novos }, () => aviso('✓ Prazos salvos'));
  };
  const marcarMudanca = () => {
    const mudou = Object.keys(pendentes()).length > 0;
    estadoPrazos.textContent = mudou ? 'Alterações ainda não salvas…' : '✓ Prazos salvos.';
    estadoPrazos.className = mudou ? 'erro' : 'sutil';
    botaoPrazos.hidden = !mudou;
    clearTimeout(timerPrazos);
    if (mudou) timerPrazos = setTimeout(salvarPrazos, 1200);
  };
  PRAZOS.forEach(k => {
    const el = $('#pz-' + k);
    el.oninput = marcarMudanca;
    el.onchange = marcarMudanca;
    el.onblur = () => { if (Object.keys(pendentes()).length) salvarPrazos(); };
  });
  botaoPrazos.onclick = salvarPrazos;

  on('#convite', () => abrirWhatsApp('', mensagens.convite()));
  on('#copiar-convite', async () => {
    try { await navigator.clipboard.writeText(BASE); aviso('Link copiado'); } catch (e) { aviso('Não consegui copiar. Toque no link e copie por lá.', true); }
  });

  on('#sortear', b => adm(b, 'adminSortear', {}, () => aviso('Sorteio feito!')));
  on('#espiar', () => { ui.mostrarResultado = !ui.mostrarResultado; telaAdmin(); });
  on('#refazer', () => { ui.confirmar = 'refazer'; telaAdmin(); });
  on('#apagar', () => { ui.confirmar = 'apagar'; telaAdmin(); });
  on('#sim-refazer', b => adm(b, 'adminSortear', {}, () => { ui.confirmar = null; aviso('Sorteio refeito. Reenvie as mensagens.'); }));
  on('#sim-apagar', b => adm(b, 'adminApagarSorteio', {}, () => { ui.confirmar = null; ui.mostrarResultado = false; aviso('Sorteio apagado'); }));
  on('[data-cancelar-confirma]', () => { ui.confirmar = null; telaAdmin(); });

  on('#abrir-add', () => { ui.adicionando = true; telaAdmin(); const n = $('#add-nome'); if (n) n.focus(); });
  on('#fechar-add', () => { ui.adicionando = false; telaAdmin(); });
  const add = $('#form-add');
  if (add) add.onsubmit = e => {
    e.preventDefault();
    adm(add.querySelector('[type=submit]'), 'adminAdicionar', { nome: $('#add-nome').value, celular: $('#add-cel').value }, () => { ui.adicionando = false; aviso('Participante adicionado'); });
  };
  $$('[data-mascara]').forEach(el => { el.oninput = () => { el.value = mascaraCel(el.value); }; });

  on('[data-restr]', b => { const id = b.dataset.restr; ui.abertas.has(id) ? ui.abertas.delete(id) : ui.abertas.add(id); telaAdmin(); });
  $$('.restricoes input[type=checkbox]').forEach(c => {
    c.onchange = () => adm(null, 'adminRestricao', { a: c.dataset.a, b: c.dataset.b, valor: c.checked });
  });

  on('[data-editar]', b => { ui.editando = ui.editando === b.dataset.editar ? null : b.dataset.editar; ui.confirmar = null; telaAdmin(); });
  on('[data-fechar-editar]', () => { ui.editando = null; ui.confirmar = null; telaAdmin(); });
  $$('[data-form-editar]').forEach(f => {
    f.onsubmit = e => {
      e.preventDefault();
      const id = f.dataset.formEditar;
      adm(f.querySelector('[type=submit]'), 'adminEditar', { id, nome: $('#ed-nome-' + id).value, celular: $('#ed-cel-' + id).value }, () => { ui.editando = null; aviso('Alterações salvas'); });
    };
  });
  on('[data-remover]', b => { ui.confirmar = 'remover:' + b.dataset.remover; telaAdmin(); });
  on('[data-remover-sim]', b => adm(b, 'adminRemover', { id: b.dataset.removerSim }, () => { ui.editando = null; ui.confirmar = null; aviso('Participante removido'); }));

  on('[data-enviar-link]', b => {
    const p = pessoa(b.dataset.enviarLink);
    abrirWhatsApp(p.celular, mensagens.link(p));
    adm(null, 'adminMarcar', { id: p.id, campo: 'linkEnviadoEm' });
  });
  on('[data-lembrar]', b => { const p = pessoa(b.dataset.lembrar); abrirWhatsApp(p.celular, mensagens.lembrarSugestao(p)); });
  on('[data-enviar]', b => {
    const p = pessoa(b.dataset.enviar);
    abrirWhatsApp(p.celular, mensagens.revelacao(p));
    adm(null, 'adminMarcar', { id: p.id, campo: 'revelacaoEnviadaEm' });
  });
  on('[data-lembrar-compra]', b => { const p = pessoa(b.dataset.lembrarCompra); abrirWhatsApp(p.celular, mensagens.lembrarCompra(p)); });

  on('#atualizar', b => adm(b, 'adminDados', {}, () => aviso('Dados atualizados')));
  on('#sair', () => { sessao.del(CHAVE_SENHA); E.admin = null; location.hash = ''; });
}

// ---------- Noite de Natal ----------
function telaNatal() {
  const D = E.admin, P = D.pessoas, N = E.natal;
  const porId = Object.fromEntries(P.map(p => [p.id, p]));
  const fs = !!document.fullscreenElement;
  const barra = `<div class="tv-barra"><a class="btn claro" href="#admin">← Painel</a>${N.inicio ? '<button class="btn claro" id="natal-recomeca">↺ Começar de novo</button>' : ''}<button class="btn claro" id="tela-cheia">${fs ? 'Sair da tela cheia' : '⛶ Tela cheia'}</button></div>`;
  const rodape = `<p class="sutil">Abra esta tela na TV na hora da troca. A família tenta adivinhar, você toca em "Revelar" e o presente é entregue. Quem recebeu é o próximo da roda.</p>
    <p class="sutil">No computador, a barra de espaço ou a seta → também avançam. Para sair da tela cheia, aperte Esc.</p>
    <p class="erro" id="aviso-tela" hidden>Este aparelho não permite tela cheia em sites; o iPhone, por exemplo, não permite. Para a TV, abra esta tela num computador ligado à TV, ou espelhe a tela do celular e deixe-o na horizontal.</p>`;
  const neve = '<div class="neve" aria-hidden="true"></div>';

  if (!D.temSorteio) {
    mostrar(`<div class="tela">${barra}<section class="tv">${neve}<span class="sobre">Noite de Natal</span><p class="tv-de">O sorteio ainda não foi feito.</p></section></div>`, true);
    return ligarNatal();
  }
  if (N.inicio && !porId[N.inicio]) N.inicio = null;
  const n = P.length;

  if (!N.inicio) {
    const porNome = P.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    mostrar(`<div class="tela">${barra}<section class="tv">${neve}
      <span class="sobre">Noite de Natal</span>
      <p class="tv-de">Quem vai começar?</p>
      <div class="tv-escolha">${porNome.map(p => `<button class="btn vidro" data-comeca="${p.id}">${esc(p.nome)}</button>`).join('')}</div>
      <div class="btn-linha"><button class="btn ouro" id="natal-sorteia-inicio">Sortear quem começa</button></div>
    </section>${rodape}</div>`, true);
    return ligarNatal();
  }

  const roda = rodaOrdenada(N.inicio);
  if (N.passo >= n) {
    mostrar(`<div class="tela">${barra}<section class="tv">${neve}
      <span class="sobre">Noite de Natal</span>
      <p class="tv-para">Feliz Natal!</p>
      <p class="tv-de">A roda dos Mendoncinhas</p>
      <ol class="roda tv-roda">${roda.map(id => `<li>${esc(porId[id].nome)}</li><li class="seta" aria-hidden="true">→</li>`).join('')}<li>${esc(porId[roda[0]].nome)}</li></ol>
    </section>${rodape}</div>`, true);
    return ligarNatal();
  }

  const de = porId[roda[N.passo]], para = porId[roda[(N.passo + 1) % n]];
  mostrar(`<div class="tela">${barra}<section class="tv">${neve}
    <span class="sobre">Noite de Natal · ${N.passo + 1} de ${n}</span>
    <p class="tv-de">${esc(de.nome)} tirou…</p>
    <p class="tv-para ${N.revelado ? '' : 'oculto'}" id="tv-para">${N.revelado ? esc(para.nome) : '?'}</p>
    <div class="btn-linha">${N.revelado
      ? `<button class="btn ouro" id="natal-prox">${N.passo + 1 === n ? 'Ver a roda completa' : 'Próximo →'}</button>`
      : '<button class="btn ouro" id="natal-revela">Revelar</button>'}</div>
  </section>${rodape}</div>`, true);
  ligarNatal();
}

function ligarNatal() {
  const N = E.natal;
  const rv = $('#natal-revela');
  if (rv) rv.onclick = () => { N.revelado = true; telaNatal(); const r = $('#tv-para').getBoundingClientRect(); confete(r.left + r.width / 2, r.top + r.height / 2); };
  const px = $('#natal-prox'); if (px) px.onclick = () => { N.passo++; N.revelado = false; telaNatal(); };

  // Recomeçar fica fora do quadro e pede um segundo toque, para não recomeçar sem querer.
  const ri = $('#natal-recomeca');
  if (ri) ri.onclick = () => {
    if (!ri.dataset.confirmar) {
      ri.dataset.confirmar = '1'; ri.textContent = 'Toque de novo para recomeçar';
      setTimeout(() => { if (ri.isConnected) { delete ri.dataset.confirmar; ri.textContent = '↺ Começar de novo'; } }, 3000);
      return;
    }
    E.natal = { inicio: null, passo: 0, revelado: false };
    telaNatal();
  };

  const escolher = id => { E.natal = { inicio: id, passo: 0, revelado: false }; telaNatal(); };
  const opcoes = $$('[data-comeca]');
  opcoes.forEach(b => { b.onclick = () => escolher(b.dataset.comeca); });
  const so = $('#natal-sorteia-inicio');
  if (so) so.onclick = () => {
    const alvo = Math.floor(Math.random() * opcoes.length);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return escolher(opcoes[alvo].dataset.comeca);
    so.disabled = true; opcoes.forEach(b => { b.disabled = true; });
    const voltas = opcoes.length * 2 + alvo; let passo = 0;
    (function gira() {
      opcoes.forEach(b => b.classList.remove('destaque'));
      opcoes[passo % opcoes.length].classList.add('destaque');
      if (passo < voltas) { passo++; setTimeout(gira, 40 + passo * 2.5); } else setTimeout(() => escolher(opcoes[alvo].dataset.comeca), 900);
    })();
  };

  $('#tela-cheia').onclick = async () => {
    const app = $('#app');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (app.requestFullscreen) await app.requestFullscreen();
      else if (app.webkitRequestFullscreen) app.webkitRequestFullscreen();
      else throw new Error('sem tela cheia');
    } catch (e) { const a = $('#aviso-tela'); if (a) a.hidden = false; }
  };
}
document.addEventListener('fullscreenchange', () => {
  if (location.hash === '#natal' && E.admin) telaNatal();
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
});
document.addEventListener('keydown', e => {
  if (location.hash !== '#natal' || !E.admin) return;
  const avancar = e.key === 'ArrowRight' || ((e.key === ' ' || e.key === 'Enter') && document.activeElement && document.activeElement.tagName !== 'BUTTON');
  if (!avancar) return;
  const b = $('#natal-revela') || $('#natal-prox');
  if (b) { e.preventDefault(); b.click(); }
});

// ---------- Início ----------
function iniciar() {
  const token = new URLSearchParams(location.search).get('p');
  if (token) return iniciarPessoal(token);
  if (location.hash === '#admin') return iniciarAdmin(telaAdmin);
  if (location.hash === '#natal') return iniciarAdmin(telaNatal);
  return iniciarCadastro();
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); iniciar(); });
iniciar();

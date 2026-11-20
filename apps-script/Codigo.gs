/**
 * Amigo Secreto dos Mendoncinhas — servidor (Google Apps Script)
 *
 * Guarda os dados na planilha à qual este script está ligado e responde
 * aos pedidos do site (GitHub Pages). Todos os pedidos chegam por POST,
 * com um JSON no corpo: { "acao": "...", ...dados }.
 *
 * Para atualizar: cole este arquivo inteiro no editor, salve e publique uma
 * NOVA VERSÃO em Implantar → Gerenciar implantações → Editar (lápis).
 */

const APP_NOME = 'Amigo Secreto dos Mendoncinhas';
const FASES = ['cadastro', 'sugestao', 'sorteio', 'revelacao'];

const ABAS = {
  Participantes: [
    'id', 'nome', 'celular', 'token', 'cadastradoEm',
    'sugestao1', 'link1', 'sugestao2', 'link2', 'sugestao3', 'link3',
    'tamanhoRoupa', 'tamanhoCalcado', 'naoGosta', 'sugestaoAtualizadaEm',
    'tirouId', 'comprouEm', 'revelacaoEnviadaEm', 'linkEnviadoEm',
  ],
  Restricoes: ['participanteId', 'naoPodeTirarId'],
  Config: ['chave', 'valor'],
};

const CONFIG_PADRAO = [
  ['fase', 'cadastro'],
  ['prazoCadastro', '2026-11-30'],
  ['prazoSugestao', '2026-12-07'],
  ['dataSorteio', '2026-12-08'],
  ['dataTroca', '2026-12-24'],
  ['valorMinimo', '150'],
];
const CHAVES_DATA = ['prazoCadastro', 'prazoSugestao', 'dataSorteio', 'dataTroca'];

// ---------------------------------------------------------------------------
// Preparação da planilha (rodar uma vez pelo editor; pode rodar de novo)
// ---------------------------------------------------------------------------

function configurar() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(ABAS).forEach(function (nome) { garantirAba_(planilha, nome); });

  const config = planilha.getSheetByName('Config');
  const existentes = config.getLastRow() > 1
    ? config.getRange(2, 1, config.getLastRow() - 1, 1).getValues().map(function (l) { return l[0]; })
    : [];
  const faltando = CONFIG_PADRAO.filter(function (par) { return existentes.indexOf(par[0]) < 0; });
  if (faltando.length) {
    const inicio = config.getLastRow() + 1;
    config.getRange(inicio, 1, faltando.length, 2).setNumberFormat('@').setValues(faltando);
  }

  const abaInicial = planilha.getSheetByName('Página1') || planilha.getSheetByName('Sheet1');
  if (abaInicial && abaInicial.getLastRow() === 0 && planilha.getSheets().length > 1) planilha.deleteSheet(abaInicial);

  const temSenha = !!PropertiesService.getScriptProperties().getProperty('ADMIN_SENHA');
  Logger.log('Planilha configurada. Senha do administrador definida: ' + (temSenha ? 'sim' : 'NÃO'));
}

/** Cria a aba se faltar e acrescenta colunas novas no fim, sem mexer nas antigas. */
function garantirAba_(planilha, nome) {
  let aba = planilha.getSheetByName(nome);
  if (!aba) aba = planilha.insertSheet(nome);
  const esperado = ABAS[nome];
  const colunas = Math.max(aba.getLastColumn(), 1);
  const atual = aba.getLastRow() >= 1 ? aba.getRange(1, 1, 1, colunas).getValues()[0].filter(String) : [];
  const novas = esperado.filter(function (c) { return atual.indexOf(c) < 0; });
  if (novas.length) {
    aba.getRange(1, atual.length + 1, 1, novas.length).setValues([novas]);
    aba.getRange(1, 1, 1, atual.length + novas.length).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

// ---------------------------------------------------------------------------
// Entrada dos pedidos
// ---------------------------------------------------------------------------

/** Teste rápido no navegador: abre a URL /exec e mostra a situação. */
function doGet() {
  return json_(tratar_({ acao: 'status' }));
}

function doPost(e) {
  let pedido;
  try {
    pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (erro) {
    return json_({ ok: false, erro: 'Pedido inválido.' });
  }
  return json_(tratar_(pedido));
}

function json_(dados) {
  return ContentService.createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}

const ACOES = {
  status: { fn: acaoStatus_ },
  novos: { fn: acaoNovos_ },
  cadastrar: { fn: acaoCadastrar_ },
  eu: { fn: acaoEu_ },
  salvarSugestoes: { fn: acaoSalvarSugestoes_ },
  comprei: { fn: acaoComprei_ },
  adminDados: { fn: acaoAdminDados_, admin: true },
  adminConfig: { fn: acaoAdminConfig_, admin: true },
  adminAdicionar: { fn: acaoAdminAdicionar_, admin: true },
  adminEditar: { fn: acaoAdminEditar_, admin: true },
  adminRemover: { fn: acaoAdminRemover_, admin: true },
  adminRestricao: { fn: acaoAdminRestricao_, admin: true },
  adminSortear: { fn: acaoAdminSortear_, admin: true },
  adminApagarSorteio: { fn: acaoAdminApagarSorteio_, admin: true },
  adminMarcar: { fn: acaoAdminMarcar_, admin: true },
};

function tratar_(pedido) {
  const acao = ACOES[pedido && pedido.acao];
  if (!acao) return { ok: false, erro: 'Ação desconhecida.' };

  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    if (acao.admin) {
      const senha = PropertiesService.getScriptProperties().getProperty('ADMIN_SENHA');
      if (!senha) return { ok: false, erro: 'A senha do administrador não foi definida no Apps Script.' };
      if (String(pedido.senha || '') !== String(senha)) return { ok: false, erro: 'Senha incorreta.', senhaInvalida: true };
    }
    const db = abrir_();
    const resposta = acao.fn(db, pedido);
    if (db.sujo) salvar_(db);
    return Object.assign({ ok: true }, resposta);
  } catch (erro) {
    if (erro && erro.usuario) return { ok: false, erro: erro.message };
    console.error(erro && erro.stack ? erro.stack : erro);
    return { ok: false, erro: 'Erro no servidor. Tente de novo em instantes.' };
  } finally {
    trava.releaseLock();
  }
}

function falha_(mensagem) {
  const erro = new Error(mensagem);
  erro.usuario = true;
  return erro;
}

// ---------------------------------------------------------------------------
// Leitura e gravação da planilha
// ---------------------------------------------------------------------------

function abrir_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const fuso = Session.getScriptTimeZone();

  const lerAba = function (nome) {
    const aba = garantirAba_(planilha, nome);
    const valores = aba.getDataRange().getValues();
    const cabecalho = valores[0].map(String);
    const linhas = valores.slice(1).filter(function (l) { return l.some(function (v) { return v !== '' && v !== null; }); });
    return { aba: aba, cabecalho: cabecalho, linhas: linhas };
  };

  const p = lerAba('Participantes');
  const pessoas = p.linhas.map(function (linha) {
    const obj = {};
    p.cabecalho.forEach(function (col, i) {
      if (!col) return;
      let v = linha[i];
      if (v instanceof Date) v = Utilities.formatDate(v, fuso, "yyyy-MM-dd'T'HH:mm:ss");
      obj[col] = v === null || v === undefined ? '' : String(v);
    });
    return obj;
  }).filter(function (pessoa) { return pessoa.id; });

  const r = lerAba('Restricoes');
  const ia = r.cabecalho.indexOf('participanteId'), ib = r.cabecalho.indexOf('naoPodeTirarId');
  const restricoes = r.linhas.map(function (l) { return [String(l[ia]), String(l[ib])]; })
    .filter(function (par) { return par[0] && par[1]; });

  const c = lerAba('Config');
  const config = {};
  CONFIG_PADRAO.forEach(function (par) { config[par[0]] = par[1]; });
  c.linhas.forEach(function (l) {
    let v = l[1];
    if (v instanceof Date) v = Utilities.formatDate(v, fuso, 'yyyy-MM-dd');
    if (l[0]) config[String(l[0])] = String(v);
  });

  return { pessoas: pessoas, restricoes: restricoes, config: config, abas: { p: p, r: r, c: c }, sujo: false };
}

function salvar_(db) {
  const escrever = function (info, linhas) {
    const aba = info.aba, largura = info.cabecalho.length;
    const antigas = Math.max(aba.getLastRow() - 1, 0);
    if (antigas) aba.getRange(2, 1, antigas, largura).clearContent();
    if (linhas.length) aba.getRange(2, 1, linhas.length, largura).setNumberFormat('@').setValues(linhas);
  };

  const cp = db.abas.p.cabecalho;
  escrever(db.abas.p, db.pessoas.map(function (pessoa) {
    return cp.map(function (col) { return col && pessoa[col] !== undefined ? pessoa[col] : ''; });
  }));

  const cr = db.abas.r.cabecalho;
  escrever(db.abas.r, db.restricoes.map(function (par) {
    return cr.map(function (col) { return col === 'participanteId' ? par[0] : col === 'naoPodeTirarId' ? par[1] : ''; });
  }));

  const cc = db.abas.c.cabecalho;
  escrever(db.abas.c, Object.keys(db.config).map(function (chave) {
    return cc.map(function (col) { return col === 'chave' ? chave : col === 'valor' ? db.config[chave] : ''; });
  }));
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function agora_() { return new Date().toISOString(); }
function novoId_() { return 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function novoToken_() { return Utilities.getUuid().replace(/-/g, ''); }

/** Texto limpo, com tamanho máximo e sem virar fórmula na planilha. */
function texto_(valor, maximo) {
  return String(valor === undefined || valor === null ? '' : valor)
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .replace(/^[=+\-@]+/, '')
    .trim()
    .slice(0, maximo);
}

function celular_(valor) {
  const d = String(valor || '').replace(/\D/g, '');
  const semPais = d.length === 13 && d.indexOf('55') === 0 ? d.slice(2) : d;
  if (!/^\d{2}9\d{8}$/.test(semPais)) throw falha_('Confira o celular: DDD + 9 números, por exemplo (31) 99999-9999.');
  return semPais;
}

function link_(valor, numero) {
  const v = String(valor || '').trim().slice(0, 400);
  if (!v) return '';
  if (!/^https?:\/\/[^\s]+$/i.test(v)) throw falha_('O link da sugestão ' + numero + ' precisa começar com https://');
  return v;
}

function chave_(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

function porId_(db, id) {
  for (let i = 0; i < db.pessoas.length; i++) if (db.pessoas[i].id === id) return db.pessoas[i];
  return null;
}

function porToken_(db, token) {
  const t = String(token || '');
  if (t.length >= 16) {
    for (let i = 0; i < db.pessoas.length; i++) if (db.pessoas[i].token === t) return db.pessoas[i];
  }
  throw falha_('Link pessoal não encontrado. Confira o link que você recebeu pelo WhatsApp ou fale com quem organiza.');
}

function sugestoesDe_(p) {
  const lista = [];
  for (let i = 1; i <= 3; i++) if (p['sugestao' + i]) lista.push({ desc: p['sugestao' + i], link: p['link' + i] || '' });
  return lista;
}

function extrasDe_(p) {
  return { roupa: p.tamanhoRoupa || '', calcado: p.tamanhoCalcado || '', naoGosta: p.naoGosta || '' };
}

function temSorteio_(db) {
  return db.pessoas.length >= 3 && db.pessoas.every(function (p) { return p.tirouId && porId_(db, p.tirouId); });
}

function limparSorteio_(db) {
  db.pessoas.forEach(function (p) { p.tirouId = ''; p.revelacaoEnviadaEm = ''; p.comprouEm = ''; });
  if (db.config.fase === 'revelacao') db.config.fase = 'sorteio';
  db.sujo = true;
}

function publico_(db) {
  const c = db.config;
  return {
    app: APP_NOME,
    fase: c.fase,
    prazos: { cadastro: c.prazoCadastro, sugestao: c.prazoSugestao, sorteio: c.dataSorteio, troca: c.dataTroca },
    valorMinimo: Number(c.valorMinimo) || 150,
    participantes: db.pessoas.length,
  };
}

// ---------------------------------------------------------------------------
// Sorteio: uma roda única (A→B→C→…→A) que respeita as restrições
// ---------------------------------------------------------------------------

/**
 * @param {string[]} ids participantes
 * @param {function(string,string):boolean} proibido true se a não pode tirar b
 * @return {string[]|null} a roda na ordem (cada um tira o próximo; o último tira o primeiro)
 */
function sortearRoda_(ids, proibido) {
  const n = ids.length;
  if (n < 3) return null;
  const pode = function (a, b) { return a !== b && !proibido(a, b); };
  const vizinhos = {};
  ids.forEach(function (a) { vizinhos[a] = ids.filter(function (b) { return pode(a, b) && pode(b, a); }); });
  // Numa roda, cada pessoa precisa de alguém para tirar e de alguém que a tire.
  if (ids.some(function (a) { return vizinhos[a].length < 2; })) return null;

  const embaralha = function (lista) {
    const c = lista.slice();
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = c[i]; c[i] = c[j]; c[j] = t;
    }
    return c;
  };

  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const inicio = ids[Math.floor(Math.random() * n)];
    const caminho = [inicio];
    const usado = {}; usado[inicio] = true;
    let passos = 0;

    const busca = function () {
      if (++passos > 20000) return false;
      const atual = caminho[caminho.length - 1];
      if (caminho.length === n) return pode(atual, inicio);
      // Primeiro quem tem menos opções livres (evita becos sem saída); empates ficam aleatórios.
      const livres = embaralha(ids.filter(function (b) { return !usado[b] && pode(atual, b); }));
      const grau = function (b) { return ids.filter(function (c) { return !usado[c] && c !== b && pode(b, c); }).length; };
      const ordem = livres.map(function (b) { return { b: b, g: grau(b) }; })
        .sort(function (x, y) { return x.g - y.g; })
        .map(function (x) { return x.b; });
      for (let k = 0; k < ordem.length; k++) {
        const prox = ordem[k];
        caminho.push(prox); usado[prox] = true;
        if (busca()) return true;
        caminho.pop(); delete usado[prox];
        if (passos > 20000) return false;
      }
      return false;
    };

    if (busca()) return caminho;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Ações públicas
// ---------------------------------------------------------------------------

function acaoStatus_(db) {
  return publico_(db);
}

/** Quantos se cadastraram desde um horário (só números, sem nomes): usado pelo alerta. */
function acaoNovos_(db, pedido) {
  const desde = new Date(pedido.desde);
  if (isNaN(desde.getTime())) throw falha_('Informe "desde" como data e hora, por exemplo 2026-11-20T11:00:00Z.');
  const novos = db.pessoas.filter(function (p) {
    const quando = new Date(p.cadastradoEm);
    return !isNaN(quando.getTime()) && quando > desde;
  }).length;
  return Object.assign(publico_(db), { desde: desde.toISOString(), novos: novos, total: db.pessoas.length });
}

function acaoCadastrar_(db, pedido) {
  if (db.config.fase !== 'cadastro') throw falha_('O cadastro está encerrado. Fale com quem organiza o amigo secreto.');
  const pessoa = novaPessoa_(db, pedido);
  return { nome: pessoa.nome, participantes: db.pessoas.length };
}

function novaPessoa_(db, pedido) {
  const nome = texto_(pedido.nome, 40);
  if (!nome) throw falha_('Escreva o nome.');
  const celular = celular_(pedido.celular);
  if (db.pessoas.some(function (p) { return p.celular === celular; })) {
    throw falha_('Este celular já está cadastrado. Se precisar de ajuda, fale com quem organiza.');
  }
  const pessoa = { id: novoId_(), nome: nome, celular: celular, token: novoToken_(), cadastradoEm: agora_() };
  db.pessoas.push(pessoa);
  db.sujo = true;
  return pessoa;
}

function acaoEu_(db, pedido) {
  const p = porToken_(db, pedido.token);
  const fase = db.config.fase;
  const doador = db.pessoas.filter(function (o) { return o.tirouId === p.id; })[0];
  const resposta = Object.assign(publico_(db), {
    nome: p.nome,
    sugestoes: sugestoesDe_(p),
    extras: extrasDe_(p),
    podeEditar: fase === 'cadastro' || fase === 'sugestao',
    presenteComprado: fase === 'revelacao' && !!(doador && doador.comprouEm),
  });
  if (fase === 'revelacao' && p.tirouId) {
    const amigo = porId_(db, p.tirouId);
    if (amigo) {
      resposta.amigo = { nome: amigo.nome, sugestoes: sugestoesDe_(amigo), extras: extrasDe_(amigo) };
      resposta.euComprei = !!p.comprouEm;
    }
  }
  return resposta;
}

function acaoSalvarSugestoes_(db, pedido) {
  const p = porToken_(db, pedido.token);
  if (['cadastro', 'sugestao'].indexOf(db.config.fase) < 0) throw falha_('O prazo para mudar as sugestões já terminou.');
  const recebidas = Array.isArray(pedido.sugestoes) ? pedido.sugestoes.slice(0, 3) : [];
  const limpas = [];
  recebidas.forEach(function (s, i) {
    const desc = texto_(s && s.desc, 120);
    const link = link_(s && s.link, i + 1);
    if (desc) limpas.push({ desc: desc, link: link });
    else if (link) throw falha_('Escreva o que é a sugestão ' + (i + 1) + ', além do link.');
  });
  if (!limpas.length) throw falha_('Escreva pelo menos uma sugestão de presente.');
  for (let i = 1; i <= 3; i++) {
    p['sugestao' + i] = limpas[i - 1] ? limpas[i - 1].desc : '';
    p['link' + i] = limpas[i - 1] ? limpas[i - 1].link : '';
  }
  const extras = pedido.extras || {};
  p.tamanhoRoupa = texto_(extras.roupa, 10);
  p.tamanhoCalcado = texto_(extras.calcado, 6);
  p.naoGosta = texto_(extras.naoGosta, 120);
  p.sugestaoAtualizadaEm = agora_();
  db.sujo = true;
  return acaoEu_(db, pedido);
}

function acaoComprei_(db, pedido) {
  const p = porToken_(db, pedido.token);
  if (db.config.fase !== 'revelacao' || !p.tirouId) throw falha_('O sorteio ainda não foi revelado.');
  p.comprouEm = pedido.comprou ? agora_() : '';
  db.sujo = true;
  return acaoEu_(db, pedido);
}

// ---------------------------------------------------------------------------
// Ações do administrador (todas exigem a senha)
// ---------------------------------------------------------------------------

function acaoAdminDados_(db) {
  return Object.assign(publico_(db), {
    temSorteio: temSorteio_(db),
    restricoes: db.restricoes,
    pessoas: db.pessoas.map(function (p) {
      return {
        id: p.id, nome: p.nome, celular: p.celular, token: p.token,
        sugeriu: !!p.sugestao1, sugestoes: sugestoesDe_(p), extras: extrasDe_(p),
        tirouId: p.tirouId || '', comprou: !!p.comprouEm,
        linkEnviado: !!p.linkEnviadoEm, revelacaoEnviada: !!p.revelacaoEnviadaEm,
      };
    }),
  });
}

function acaoAdminConfig_(db, pedido) {
  if (pedido.fase !== undefined) {
    if (FASES.indexOf(pedido.fase) < 0) throw falha_('Etapa desconhecida.');
    if (pedido.fase === 'revelacao' && !temSorteio_(db)) throw falha_('Faça o sorteio antes de liberar a revelação.');
    db.config.fase = pedido.fase;
  }
  if (pedido.prazos) {
    const mapa = { cadastro: 'prazoCadastro', sugestao: 'prazoSugestao', sorteio: 'dataSorteio', troca: 'dataTroca' };
    Object.keys(mapa).forEach(function (k) {
      const v = pedido.prazos[k];
      if (v === undefined) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw falha_('Data inválida.');
      db.config[mapa[k]] = String(v);
    });
  }
  if (pedido.valorMinimo !== undefined) {
    const v = Number(pedido.valorMinimo);
    if (!(v > 0)) throw falha_('Valor mínimo inválido.');
    db.config.valorMinimo = String(Math.round(v));
  }
  db.sujo = true;
  return acaoAdminDados_(db);
}

function acaoAdminAdicionar_(db, pedido) {
  novaPessoa_(db, pedido);
  if (db.pessoas.some(function (p) { return p.tirouId; })) limparSorteio_(db);
  return acaoAdminDados_(db);
}

function acaoAdminEditar_(db, pedido) {
  const p = porId_(db, pedido.id);
  if (!p) throw falha_('Participante não encontrado.');
  const nome = texto_(pedido.nome, 40);
  if (!nome) throw falha_('Escreva o nome.');
  const celular = celular_(pedido.celular);
  if (db.pessoas.some(function (o) { return o !== p && o.celular === celular; })) throw falha_('Outro participante já usa este celular.');
  p.nome = nome;
  p.celular = celular;
  db.sujo = true;
  return acaoAdminDados_(db);
}

function acaoAdminRemover_(db, pedido) {
  const p = porId_(db, pedido.id);
  if (!p) throw falha_('Participante não encontrado.');
  const tinhaSorteio = db.pessoas.some(function (o) { return o.tirouId; });
  db.pessoas = db.pessoas.filter(function (o) { return o !== p; });
  db.restricoes = db.restricoes.filter(function (par) { return par[0] !== p.id && par[1] !== p.id; });
  if (tinhaSorteio) limparSorteio_(db);
  db.sujo = true;
  return acaoAdminDados_(db);
}

function acaoAdminRestricao_(db, pedido) {
  const a = porId_(db, pedido.a), b = porId_(db, pedido.b);
  if (!a || !b || a === b) throw falha_('Participantes inválidos.');
  if (temSorteio_(db)) throw falha_('O sorteio já foi feito. Para mudar as restrições, apague o sorteio primeiro.');
  const k = chave_(a.id, b.id);
  // Guardada uma vez só; vale nos dois sentidos.
  db.restricoes = db.restricoes.filter(function (par) { return chave_(par[0], par[1]) !== k; });
  if (pedido.valor) db.restricoes.push([a.id, b.id]);
  db.sujo = true;
  return acaoAdminDados_(db);
}

function acaoAdminSortear_(db) {
  if (['sorteio', 'revelacao'].indexOf(db.config.fase) < 0) throw falha_('Avance para a etapa Sorteio antes de sortear.');
  if (db.pessoas.length < 3) throw falha_('São precisos pelo menos 3 participantes.');
  const proibidas = {};
  db.restricoes.forEach(function (par) { proibidas[chave_(par[0], par[1])] = true; });
  const roda = sortearRoda_(db.pessoas.map(function (p) { return p.id; }), function (a, b) { return !!proibidas[chave_(a, b)]; });
  if (!roda) throw falha_('Não dá para formar uma roda única com essas restrições. Tire algumas restrições e tente de novo.');
  db.pessoas.forEach(function (p) { p.revelacaoEnviadaEm = ''; p.comprouEm = ''; });
  roda.forEach(function (id, i) { porId_(db, id).tirouId = roda[(i + 1) % roda.length]; });
  db.sujo = true;
  return acaoAdminDados_(db);
}

function acaoAdminApagarSorteio_(db) {
  limparSorteio_(db);
  return acaoAdminDados_(db);
}

function acaoAdminMarcar_(db, pedido) {
  const p = porId_(db, pedido.id);
  if (!p) throw falha_('Participante não encontrado.');
  if (['linkEnviadoEm', 'revelacaoEnviadaEm'].indexOf(pedido.campo) < 0) throw falha_('Campo inválido.');
  p[pedido.campo] = agora_();
  db.sujo = true;
  return acaoAdminDados_(db);
}

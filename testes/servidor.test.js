const test = require('node:test');
const assert = require('node:assert');
const { carregarServidor } = require('./google-simulado');

const SENHA = 'segredo123';

function novoServidor() {
  const s = carregarServidor({ senha: SENHA });
  s.configurar();
  return s;
}

function cadastrarVarios(s, nomes) {
  nomes.forEach((nome, i) => {
    const r = s.pedir({ acao: 'cadastrar', nome, celular: `(31) 9${String(8000000 + i).padStart(8, '0')}` });
    assert.ok(r.ok, r.erro);
  });
  return s.pedir({ acao: 'adminDados', senha: SENHA }).pessoas;
}

test('configurar cria as abas e as configurações padrão', () => {
  const s = novoServidor();
  assert.deepStrictEqual(s.planilha.getSheets().map(a => a.nome), ['Participantes', 'Restricoes', 'Config']);
  const st = s.get();
  assert.strictEqual(st.ok, true);
  assert.strictEqual(st.fase, 'cadastro');
  assert.strictEqual(st.prazos.troca, '2026-12-24');
  assert.strictEqual(st.valorMinimo, 150);
  // Rodar de novo não duplica nada.
  s.configurar();
  assert.strictEqual(s.planilha.getSheetByName('Config').getLastRow(), 7);
});

test('cadastro valida nome, celular e duplicados', () => {
  const s = novoServidor();
  assert.match(s.pedir({ acao: 'cadastrar', nome: '', celular: '31999998888' }).erro, /nome/);
  assert.match(s.pedir({ acao: 'cadastrar', nome: 'Ana', celular: '3199999' }).erro, /celular/i);
  assert.ok(s.pedir({ acao: 'cadastrar', nome: 'Ana', celular: '(31) 99999-8888' }).ok);
  assert.match(s.pedir({ acao: 'cadastrar', nome: 'Outra', celular: '+55 31 99999-8888' }).erro, /já está cadastrado/);
  assert.strictEqual(s.pedir({ acao: 'status' }).participantes, 1);
});

test('texto que viraria fórmula na planilha é limpo', () => {
  const s = novoServidor();
  s.pedir({ acao: 'cadastrar', nome: '=HYPERLINK("x")', celular: '31999998888' });
  const p = s.pedir({ acao: 'adminDados', senha: SENHA }).pessoas[0];
  assert.strictEqual(p.nome, 'HYPERLINK("x")');
});

test('cadastro fecha fora da etapa de cadastro', () => {
  const s = novoServidor();
  s.pedir({ acao: 'adminConfig', senha: SENHA, fase: 'sugestao' });
  assert.match(s.pedir({ acao: 'cadastrar', nome: 'Ana', celular: '31999998888' }).erro, /encerrado/);
});

test('ações de administrador exigem a senha', () => {
  const s = novoServidor();
  const r = s.pedir({ acao: 'adminDados', senha: 'errada' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.senhaInvalida, true);
  assert.strictEqual(s.pedir({ acao: 'adminDados' }).ok, false);
});

test('link pessoal: sugestões salvas e validadas', () => {
  const s = novoServidor();
  const [ana] = cadastrarVarios(s, ['Ana']);
  assert.match(s.pedir({ acao: 'eu', token: 'invalido-invalido' }).erro, /não encontrado/);
  const eu = s.pedir({ acao: 'eu', token: ana.token });
  assert.strictEqual(eu.nome, 'Ana');
  assert.strictEqual(eu.podeEditar, true);
  assert.strictEqual(eu.amigo, undefined);

  assert.match(s.pedir({ acao: 'salvarSugestoes', token: ana.token, sugestoes: [{ desc: '' }] }).erro, /pelo menos uma/);
  assert.match(s.pedir({ acao: 'salvarSugestoes', token: ana.token, sugestoes: [{ desc: 'Livro', link: 'javascript:alert(1)' }] }).erro, /https/);

  const r = s.pedir({
    acao: 'salvarSugestoes', token: ana.token,
    sugestoes: [{ desc: '', link: '' }, { desc: 'Livro', link: 'https://loja.com/livro' }, { desc: 'Vinho' }],
    extras: { roupa: 'M', calcado: '37', naoGosta: 'Perfume doce' },
  });
  assert.ok(r.ok, r.erro);
  assert.deepStrictEqual(r.sugestoes, [{ desc: 'Livro', link: 'https://loja.com/livro' }, { desc: 'Vinho', link: '' }]);
  assert.deepStrictEqual(r.extras, { roupa: 'M', calcado: '37', naoGosta: 'Perfume doce' });
  assert.strictEqual(s.pedir({ acao: 'adminDados', senha: SENHA }).pessoas[0].sugeriu, true);
});

test('fluxo completo: restrições, sorteio, revelação e "já comprei"', () => {
  const s = novoServidor();
  const pessoas = cadastrarVarios(s, ['Vó', 'Vô', 'Carla', 'Beto', 'Júlia', 'Pedro']);
  const id = nome => pessoas.find(p => p.nome === nome).id;
  const token = nome => pessoas.find(p => p.nome === nome).token;

  // Casais não se tiram (vale nos dois sentidos, guardado uma vez).
  for (const [a, b] of [['Vó', 'Vô'], ['Carla', 'Beto'], ['Júlia', 'Pedro']]) {
    assert.ok(s.pedir({ acao: 'adminRestricao', senha: SENHA, a: id(a), b: id(b), valor: true }).ok);
  }
  s.pedir({ acao: 'adminRestricao', senha: SENHA, a: id('Vô'), b: id('Vó'), valor: true });
  assert.strictEqual(s.pedir({ acao: 'adminDados', senha: SENHA }).restricoes.length, 3);

  // Sortear só na etapa certa; revelar só com sorteio.
  assert.match(s.pedir({ acao: 'adminSortear', senha: SENHA }).erro, /etapa Sorteio/);
  assert.match(s.pedir({ acao: 'adminConfig', senha: SENHA, fase: 'revelacao' }).erro, /Faça o sorteio/);
  s.pedir({ acao: 'adminConfig', senha: SENHA, fase: 'sorteio' });
  assert.match(s.pedir({ acao: 'salvarSugestoes', token: token('Vó'), sugestoes: [{ desc: 'x' }] }).erro, /prazo/);

  const d = s.pedir({ acao: 'adminSortear', senha: SENHA });
  assert.ok(d.ok, d.erro);
  assert.strictEqual(d.temSorteio, true);
  const tira = Object.fromEntries(d.pessoas.map(p => [p.id, p.tirouId]));
  for (const [a, b] of [['Vó', 'Vô'], ['Carla', 'Beto'], ['Júlia', 'Pedro']]) {
    assert.notStrictEqual(tira[id(a)], id(b));
    assert.notStrictEqual(tira[id(b)], id(a));
  }
  assert.match(s.pedir({ acao: 'adminRestricao', senha: SENHA, a: id('Vó'), b: id('Carla'), valor: true }).erro, /apague o sorteio/);

  // Antes da revelação ninguém vê quem tirou.
  assert.strictEqual(s.pedir({ acao: 'eu', token: token('Vó') }).amigo, undefined);
  assert.match(s.pedir({ acao: 'comprei', token: token('Vó'), comprou: true }).erro, /revelado/);

  assert.ok(s.pedir({ acao: 'adminConfig', senha: SENHA, fase: 'revelacao' }).ok);
  const vo = s.pedir({ acao: 'eu', token: token('Vó') });
  const amigoDaVo = d.pessoas.find(p => p.id === tira[id('Vó')]);
  assert.strictEqual(vo.amigo.nome, amigoDaVo.nome);
  assert.strictEqual(vo.euComprei, false);

  // "Já comprei" aparece para quem vai receber, sem dizer quem comprou.
  assert.strictEqual(s.pedir({ acao: 'eu', token: amigoDaVo.token }).presenteComprado, false);
  assert.strictEqual(s.pedir({ acao: 'comprei', token: token('Vó'), comprou: true }).euComprei, true);
  const recebe = s.pedir({ acao: 'eu', token: amigoDaVo.token });
  assert.strictEqual(recebe.presenteComprado, true);
  assert.ok(!JSON.stringify(recebe).includes('"Vó"') || recebe.amigo.nome === 'Vó', 'não revela quem comprou');

  // Marcar envio.
  const m = s.pedir({ acao: 'adminMarcar', senha: SENHA, id: id('Vó'), campo: 'revelacaoEnviadaEm' });
  assert.strictEqual(m.pessoas.find(p => p.id === id('Vó')).revelacaoEnviada, true);
  assert.strictEqual(s.pedir({ acao: 'adminMarcar', senha: SENHA, id: id('Vó'), campo: 'token' }).ok, false);

  // Refazer o sorteio zera envios e compras.
  const r2 = s.pedir({ acao: 'adminSortear', senha: SENHA });
  assert.ok(r2.pessoas.every(p => !p.revelacaoEnviada && !p.comprou));
});

test('adicionar ou remover participante depois do sorteio apaga o sorteio', () => {
  const s = novoServidor();
  const pessoas = cadastrarVarios(s, ['A', 'B', 'C', 'D']);
  s.pedir({ acao: 'adminConfig', senha: SENHA, fase: 'sorteio' });
  s.pedir({ acao: 'adminSortear', senha: SENHA });
  s.pedir({ acao: 'adminConfig', senha: SENHA, fase: 'revelacao' });

  const r = s.pedir({ acao: 'adminRemover', senha: SENHA, id: pessoas[0].id });
  assert.strictEqual(r.temSorteio, false);
  assert.strictEqual(r.fase, 'sorteio', 'volta para a etapa Sorteio');
  assert.strictEqual(r.pessoas.length, 3);

  s.pedir({ acao: 'adminSortear', senha: SENHA });
  const r2 = s.pedir({ acao: 'adminAdicionar', senha: SENHA, nome: 'E', celular: '11988887777' });
  assert.ok(r2.ok, r2.erro);
  assert.strictEqual(r2.temSorteio, false);
});

test('editar participante e prazos', () => {
  const s = novoServidor();
  const [a] = cadastrarVarios(s, ['Ana', 'Bia']);
  const r = s.pedir({ acao: 'adminEditar', senha: SENHA, id: a.id, nome: 'Ana Maria', celular: '(21) 98888-7777' });
  assert.ok(r.ok, r.erro);
  assert.strictEqual(r.pessoas[0].nome, 'Ana Maria');
  assert.strictEqual(r.pessoas[0].celular, '21988887777');
  assert.match(s.pedir({ acao: 'adminEditar', senha: SENHA, id: a.id, nome: 'X', celular: r.pessoas[1].celular }).erro, /já usa/);

  const c = s.pedir({ acao: 'adminConfig', senha: SENHA, prazos: { cadastro: '2026-11-25' } });
  assert.strictEqual(c.prazos.cadastro, '2026-11-25');
  assert.match(s.pedir({ acao: 'adminConfig', senha: SENHA, prazos: { cadastro: '25/11' } }).erro, /inválida/);
});

test('dados continuam na planilha entre um pedido e outro', () => {
  const s = novoServidor();
  cadastrarVarios(s, ['Ana', 'Bia', 'Caio']);
  const linhas = s.planilha.getSheetByName('Participantes').getLastRow();
  assert.strictEqual(linhas, 4, 'cabeçalho + 3 pessoas');
  s.pedir({ acao: 'adminRemover', senha: SENHA, id: s.pedir({ acao: 'adminDados', senha: SENHA }).pessoas[1].id });
  assert.strictEqual(s.planilha.getSheetByName('Participantes').getLastRow(), 3);
  assert.deepStrictEqual(s.pedir({ acao: 'adminDados', senha: SENHA }).pessoas.map(p => p.nome), ['Ana', 'Caio']);
});

test('planilha antiga (sem a coluna linkEnviadoEm) ganha a coluna nova', () => {
  const s = carregarServidor({ senha: SENHA });
  const aba = s.planilha.insertSheet('Participantes');
  aba.getRange(1, 1, 1, 3).setValues([['id', 'nome', 'celular']]);
  s.configurar();
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  assert.ok(cab.includes('linkEnviadoEm'));
  assert.strictEqual(cab[0], 'id');
});

test('alerta: conta cadastros novos desde um horário, sem nomes', () => {
  const s = novoServidor();
  cadastrarVarios(s, ['Ana', 'Bia']);
  const aba = s.planilha.getSheetByName('Participantes');
  const col = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].indexOf('cadastradoEm');
  aba.dados[1][col] = '2026-11-01T10:00:00.000Z'; // Ana: cadastro antigo
  aba.dados[2][col] = '2026-11-01T10:00:00.000Z'; // Bia: cadastro antigo
  assert.ok(s.pedir({ acao: 'cadastrar', nome: 'Caio', celular: '21977776666' }).ok);
  const r = s.pedir({ acao: 'novos', desde: '2026-11-10T00:00:00Z' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.novos, 1);
  assert.strictEqual(r.total, 3);
  assert.ok(!JSON.stringify(r).includes('Caio'), 'não revela nomes');
  assert.strictEqual(s.pedir({ acao: 'novos', desde: '2099-01-01T00:00:00Z' }).novos, 0, 'nada novo depois de agora');
  assert.match(s.pedir({ acao: 'novos', desde: 'ontem' }).erro, /desde/);
});

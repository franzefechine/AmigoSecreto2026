// Teste de ponta a ponta do site: abre docs/index.html num navegador de verdade (Chromium)
// e responde aos pedidos do servidor com o Codigo.gs rodando sobre o Google simulado.
// Rodar com: node testes/site.e2e.js   (precisa do Playwright instalado)
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const { carregarServidor } = require('./google-simulado');

const SENHA = 'segredo123';
const SITE = 'file://' + path.join(__dirname, '..', 'docs', 'index.html');
const API = 'https://script.google.com/macros/s/**';
const PASTA_FOTOS = process.env.FOTOS || '';

(async () => {
  const servidor = carregarServidor({ senha: SENHA });
  servidor.configurar();
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  const whatsapp = [];
  await contexto.route('https://api.whatsapp.com/**', r => r.fulfill({ status: 200, body: 'whatsapp' }));
  await contexto.route(API, async rota => {
    const dados = JSON.parse(rota.request().postData() || '{}');
    await rota.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(servidor.pedir(dados)) });
  });
  const pagina = await contexto.newPage();
  pagina.on('popup', async p => { await p.waitForLoadState().catch(() => {}); whatsapp.push(p.url()); await p.close(); });
  const erros = [];
  pagina.on('pageerror', e => erros.push(e.message));
  const foto = async nome => { if (PASTA_FOTOS) await pagina.screenshot({ path: path.join(PASTA_FOTOS, nome + '.png'), fullPage: true }); };
  const passo = t => console.log('✓ ' + t);

  // 1. Cadastro
  await pagina.goto(SITE);
  await pagina.waitForSelector('#form-cad');
  await foto('1-cadastro');
  await pagina.click('#cad-enviar');
  assert.match(await pagina.textContent('#cad-erro'), /nome/);
  const nomes = ['Vó Lurdes', 'Vô Antônio', 'Tia Carla', 'Tio Beto', 'Júlia', 'Pedro'];
  for (const [i, nome] of nomes.entries()) {
    await pagina.fill('#cad-nome', nome);
    await pagina.fill('#cad-cel', '');
    await pagina.type('#cad-cel', `3199${String(1000000 + i).slice(-7)}`);
    await pagina.click('#cad-enviar');
    await pagina.waitForSelector('#outro');
    assert.match(await pagina.textContent('.bola strong'), new RegExp(String(i + 1)));
    await pagina.click('#outro');
  }
  await pagina.fill('#cad-nome', 'Repetido');
  await pagina.type('#cad-cel', '31991000000');
  await pagina.click('#cad-enviar');
  await pagina.waitForFunction(() => !document.querySelector('#cad-erro').hidden);
  assert.match(await pagina.textContent('#cad-erro'), /já está cadastrado/);
  passo('cadastro com contador e validações');

  // 2. Painel: login e envio dos links
  await pagina.goto(SITE + '#admin');
  await pagina.fill('#adm-senha', 'errada');
  await pagina.click('#login-entrar');
  await pagina.waitForFunction(() => !document.querySelector('#login-erro').hidden);
  await pagina.fill('#adm-senha', SENHA);
  await pagina.click('#login-entrar');
  await pagina.waitForSelector('.pessoas');
  assert.strictEqual(await pagina.locator('.pessoa').count(), 6);
  await pagina.locator('[data-enviar-link]').first().click();
  await pagina.waitForFunction(() => document.querySelector('.pessoa .status').textContent.includes('Link enviado'));
  await pagina.waitForTimeout(300);
  const msg = whatsapp.find(u => u.startsWith('https://api.whatsapp.com/send?phone=5531991000000&text='));
  assert.ok(msg, 'abriu o WhatsApp da Vó');
  const texto = new URL(msg).searchParams.get('text');
  assert.ok(texto.includes('Oi, *Vó Lurdes*! 👋🎄') && texto.includes('👉 ') && !texto.includes('\uFFFD'), 'emojis e negrito intactos');
  console.log('\n--- mensagem do link ---\n' + texto + '\n---');
  await foto('2-painel-cadastro');
  passo('login do administrador e envio do link pessoal');

  // 3. Link pessoal: sugestões
  const dados = servidor.pedir({ acao: 'adminDados', senha: SENHA });
  const token = nome => dados.pessoas.find(p => p.nome === nome).token;
  const id = nome => dados.pessoas.find(p => p.nome === nome).id;
  await pagina.goto(SITE + '?p=' + token('Tia Carla'));
  await pagina.waitForSelector('#form-sug');
  await pagina.fill('#sug-0', 'Livro "Torto Arado"');
  await pagina.fill('#sug-link-1', 'loja.com');
  await pagina.click('#sug-salvar');
  assert.match(await pagina.textContent('#sug-erro'), /https/);
  await pagina.fill('#sug-link-1', '');
  await pagina.fill('#ex-roupa', 'M');
  await pagina.click('#sug-salvar');
  await pagina.waitForSelector('text=Salvar alterações');
  assert.strictEqual(await pagina.inputValue('#sug-0'), 'Livro "Torto Arado"');
  await foto('3-sugestoes');
  passo('link pessoal salva sugestões');

  // 4. Painel: lembrete, restrições, sorteio
  await pagina.goto(SITE + '#admin');
  await pagina.waitForSelector('.pessoas');
  await pagina.locator(`[data-restr="${id('Tia Carla')}"]`).click();
  await pagina.locator(`input[data-a="${id('Tia Carla')}"][data-b="${id('Tio Beto')}"]`).check();
  await pagina.waitForFunction(() => document.body.textContent.includes('1 restrição') || document.querySelectorAll('.restricoes input:checked').length === 1);
  await pagina.waitForTimeout(200);
  assert.strictEqual(servidor.pedir({ acao: 'adminDados', senha: SENHA }).restricoes.length, 1);
  servidor.pedir({ acao: 'adminRestricao', senha: SENHA, a: id('Vó Lurdes'), b: id('Vô Antônio'), valor: true });
  servidor.pedir({ acao: 'adminRestricao', senha: SENHA, a: id('Júlia'), b: id('Pedro'), valor: true });
  await pagina.click('#atualizar');
  await pagina.click('#avancar'); // sugestões
  await pagina.waitForSelector('text=Etapa atual: Sugestões');
  await pagina.click('#avancar'); // sorteio
  await pagina.waitForSelector('#sortear');
  await pagina.click('#sortear');
  await pagina.waitForSelector('text=Sorteio feito');
  const sorteio = servidor.pedir({ acao: 'adminDados', senha: SENHA });
  const tira = Object.fromEntries(sorteio.pessoas.map(p => [p.id, p.tirouId]));
  assert.notStrictEqual(tira[id('Tia Carla')], id('Tio Beto'));
  assert.notStrictEqual(tira[id('Tio Beto')], id('Tia Carla'));
  await pagina.click('#avancar'); // revelação
  await pagina.waitForSelector('[data-enviar]');
  await pagina.locator(`[data-enviar="${id('Tia Carla')}"]`).click();
  await pagina.waitForSelector(`[data-lembrar-compra="${id('Tia Carla')}"]`);
  await pagina.click('#espiar');
  await foto('4-painel-revelacao');
  passo('restrições, sorteio em roda única e envio da revelação');

  // 5. Revelação no link pessoal
  await pagina.goto(SITE + '?p=' + token('Tia Carla'));
  await pagina.waitForSelector('#caixa');
  const amigo = sorteio.pessoas.find(p => p.id === tira[id('Tia Carla')]);
  assert.ok(await pagina.locator('#depois').isHidden());
  await pagina.click('#caixa');
  await pagina.waitForSelector('#depois:not([hidden])');
  assert.strictEqual(await pagina.textContent('.bilhete strong'), amigo.nome);
  await pagina.click('#comprei');
  await pagina.waitForSelector('text=Você marcou que já comprou');
  await foto('5-revelacao');
  await pagina.goto(SITE + '?p=' + amigo.token);
  await pagina.waitForSelector('text=Seu presente já foi comprado');
  passo('caixa revela o amigo, "já comprei" aparece para quem recebe');

  // 6. Noite de Natal
  await pagina.goto(SITE + '#natal');
  await pagina.waitForSelector('[data-comeca]');
  await pagina.locator('[data-comeca]', { hasText: 'Pedro' }).click();
  assert.match(await pagina.textContent('.tv-de'), /Pedro tirou/);
  for (let i = 0; i < 6; i++) { await pagina.click('#natal-revela'); await pagina.click('#natal-prox'); }
  await pagina.waitForSelector('.tv-roda');
  await foto('6-natal');
  await pagina.click('#natal-recomeca');
  await pagina.click('#natal-recomeca');
  await pagina.waitForSelector('[data-comeca]');
  passo('noite de Natal: escolher quem começa, revelar todos, recomeçar');

  // 7. Link inválido e largura de celular
  await pagina.goto(SITE + '?p=nao-existe-nao-existe');
  await pagina.waitForSelector('text=Link pessoal não encontrado');
  const largura = await pagina.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(largura <= 390, 'sem rolagem lateral no celular');
  passo('link inválido mostra mensagem clara');

  assert.deepStrictEqual(erros, [], 'sem erros de JavaScript');
  await navegador.close();
  console.log('\nTudo certo.');
})().catch(e => { console.error(e); process.exit(1); });

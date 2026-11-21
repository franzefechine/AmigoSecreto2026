const test = require('node:test');
const assert = require('node:assert');
const { carregarServidor } = require('./google-simulado');

const { sortearRoda } = carregarServidor();
const chave = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

/** Confere que a roda é única, completa e respeita as restrições. */
function conferir(ids, roda, proibidas) {
  assert.ok(roda, 'deveria haver solução');
  assert.strictEqual(roda.length, ids.length, 'todos na roda');
  assert.strictEqual(new Set(roda).size, ids.length, 'ninguém repetido');
  roda.forEach((a, i) => {
    const b = roda[(i + 1) % roda.length];
    assert.notStrictEqual(a, b, 'ninguém tira a si mesmo');
    assert.ok(!proibidas.has(chave(a, b)), `${a} não pode tirar ${b}`);
  });
  // Roda única: seguindo quem tira quem a partir de qualquer pessoa, passamos por todos.
  const tira = Object.fromEntries(roda.map((a, i) => [a, roda[(i + 1) % roda.length]]));
  let atual = ids[0], passos = 0;
  do { atual = tira[atual]; passos++; } while (atual !== ids[0] && passos <= ids.length);
  assert.strictEqual(passos, ids.length, 'uma roda só, sem rodas menores nem pares A↔B');
}

test('3 pessoas sem restrições formam uma roda', () => {
  const ids = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i++) conferir(ids, sortearRoda(ids, () => false), new Set());
});

test('menos de 3 pessoas não sorteia', () => {
  assert.strictEqual(sortearRoda(['a', 'b'], () => false), null);
  assert.strictEqual(sortearRoda([], () => false), null);
});

test('respeita grupos familiares nos dois sentidos', () => {
  const grupos = [['vo', 'va'], ['carla', 'beto', 'marina', 'rafael'], ['sonia', 'jorge', 'lucas', 'bia'], ['julia', 'pedro']];
  const ids = grupos.flat();
  const proibidas = new Set();
  grupos.forEach(g => g.forEach(a => g.forEach(b => { if (a !== b) proibidas.add(chave(a, b)); })));
  for (let i = 0; i < 200; i++) conferir(ids, sortearRoda(ids, (a, b) => proibidas.has(chave(a, b))), proibidas);
});

test('sorteio é variado (não favorece a ordem do cadastro)', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const vistos = new Set();
  for (let i = 0; i < 300; i++) {
    const roda = sortearRoda(ids, () => false);
    vistos.add(roda[(roda.indexOf('a') + 1) % roda.length]);
  }
  assert.strictEqual(vistos.size, 5, '"a" já tirou cada uma das outras 5 pessoas');
});

test('restrições impossíveis devolvem null em vez de travar', () => {
  // Metade de um grupo enorme: não há como fechar a roda.
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'x'];
  const grupo = new Set(['a', 'b', 'c', 'd', 'e']);
  const proibido = (p, q) => grupo.has(p) && grupo.has(q);
  const inicio = Date.now();
  assert.strictEqual(sortearRoda(ids, proibido), null);
  assert.ok(Date.now() - inicio < 5000, 'responde rápido');
});

test('pessoa sem ninguém possível devolve null', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const proibido = (p, q) => p === 'a' || q === 'a';
  assert.strictEqual(sortearRoda(ids, proibido), null);
});

test('40 pessoas com muitas restrições aleatórias', () => {
  const ids = Array.from({ length: 40 }, (_, i) => 'p' + i);
  for (let rodada = 0; rodada < 20; rodada++) {
    const proibidas = new Set();
    ids.forEach(a => ids.forEach(b => { if (a < b && Math.random() < 0.3) proibidas.add(chave(a, b)); }));
    conferir(ids, sortearRoda(ids, (a, b) => proibidas.has(chave(a, b))), proibidas);
  }
});

/**
 * Amigo Secreto dos Mendoncinhas — servidor (Google Apps Script)
 *
 * Versão inicial: cria as abas da planilha e responde a um teste de conexão.
 * As próximas versões deste arquivo trarão cadastro, sugestões, sorteio etc.
 */

const APP_NOME = 'Amigo Secreto dos Mendoncinhas';

const ABAS = {
  Participantes: [
    'id', 'nome', 'celular', 'token', 'cadastradoEm',
    'sugestao1', 'link1', 'sugestao2', 'link2', 'sugestao3', 'link3',
    'tamanhoRoupa', 'tamanhoCalcado', 'naoGosta', 'sugestaoAtualizadaEm',
    'tirouId', 'comprouEm', 'revelacaoEnviadaEm',
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

/** Rode esta função uma vez pelo editor para preparar a planilha. */
function configurar() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(ABAS).forEach(function (nomeAba) {
    let aba = planilha.getSheetByName(nomeAba);
    if (!aba) aba = planilha.insertSheet(nomeAba);
    const cabecalho = ABAS[nomeAba];
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
    aba.setFrozenRows(1);
  });

  const config = planilha.getSheetByName('Config');
  if (config.getLastRow() < 2) {
    config.getRange(2, 1, CONFIG_PADRAO.length, 2).setValues(CONFIG_PADRAO);
  }

  // Remove a aba vazia criada junto com a planilha, se existir.
  const abaInicial = planilha.getSheetByName('Página1') || planilha.getSheetByName('Sheet1');
  if (abaInicial && abaInicial.getLastRow() === 0) planilha.deleteSheet(abaInicial);

  const temSenha = !!PropertiesService.getScriptProperties().getProperty('ADMIN_SENHA');
  Logger.log('Planilha configurada. Senha do administrador definida: ' + (temSenha ? 'sim' : 'NÃO'));
}

/** Teste de conexão: abra a URL do app da Web no navegador. */
function doGet(e) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const participantes = planilha.getSheetByName('Participantes');
  const config = planilha.getSheetByName('Config');

  if (!participantes || !config) {
    return json_({ ok: false, erro: 'Planilha não configurada. Rode a função "configurar".' });
  }

  const fase = config.getDataRange().getValues()
    .filter(function (linha) { return linha[0] === 'fase'; })
    .map(function (linha) { return linha[1]; })[0];

  return json_({
    ok: true,
    app: APP_NOME,
    fase: fase,
    participantes: Math.max(participantes.getLastRow() - 1, 0),
    senhaAdminDefinida: !!PropertiesService.getScriptProperties().getProperty('ADMIN_SENHA'),
  });
}

function json_(dados) {
  return ContentService.createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}

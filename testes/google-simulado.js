// Simula o pedaço do Google Apps Script que o Codigo.gs usa (planilha, propriedades,
// trava etc.) para rodar o servidor no Node, sem tocar na planilha de verdade.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

class Intervalo {
  constructor(aba, linha, coluna, linhas, colunas) {
    Object.assign(this, { aba, linha, coluna, linhas, colunas });
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.linhas; r++) {
      const linha = this.aba.dados[this.linha - 1 + r] || [];
      const l = [];
      for (let c = 0; c < this.colunas; c++) {
        const v = linha[this.coluna - 1 + c];
        l.push(v === undefined ? '' : v);
      }
      out.push(l);
    }
    return out;
  }
  setValues(valores) {
    if (valores.length !== this.linhas || valores.some(l => l.length !== this.colunas)) {
      throw new Error(`setValues: tamanho ${valores.length}x${valores[0] && valores[0].length} diferente de ${this.linhas}x${this.colunas}`);
    }
    valores.forEach((l, r) => {
      const i = this.linha - 1 + r;
      while (this.aba.dados.length <= i) this.aba.dados.push([]);
      l.forEach((v, c) => { this.aba.dados[i][this.coluna - 1 + c] = v; });
    });
    return this;
  }
  clearContent() {
    this.setValues(Array.from({ length: this.linhas }, () => Array(this.colunas).fill('')));
    return this;
  }
  setFontWeight() { return this; }
  setNumberFormat() { return this; }
}

class Aba {
  constructor(nome) { this.nome = nome; this.dados = []; }
  getName() { return this.nome; }
  getLastRow() {
    for (let i = this.dados.length - 1; i >= 0; i--) if ((this.dados[i] || []).some(v => v !== '' && v !== undefined)) return i + 1;
    return 0;
  }
  getLastColumn() {
    let m = 0;
    this.dados.forEach(l => (l || []).forEach((v, i) => { if (v !== '' && v !== undefined) m = Math.max(m, i + 1); }));
    return m;
  }
  getRange(l, c, nl = 1, nc = 1) { return new Intervalo(this, l, c, nl, nc); }
  getDataRange() { return new Intervalo(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  setFrozenRows() {}
}

class Planilha {
  constructor() { this.abas = [new Aba('Página1')]; }
  getSheetByName(n) { return this.abas.find(a => a.nome === n) || null; }
  insertSheet(n) { const a = new Aba(n); this.abas.push(a); return a; }
  deleteSheet(a) { this.abas = this.abas.filter(x => x !== a); }
  getSheets() { return this.abas; }
}

/** Carrega o Codigo.gs num contexto isolado com o Google simulado. */
function carregarServidor({ senha = 'segredo123' } = {}) {
  const planilha = new Planilha();
  const props = { ADMIN_SENHA: senha };
  const logs = [];
  const contexto = {
    console: { log() {}, error: (...a) => logs.push(a.join(' ')) },
    SpreadsheetApp: { getActiveSpreadsheet: () => planilha },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (props[k] === undefined ? null : props[k]) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, _fuso, formato) => (formato === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 19)),
    },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    Logger: { log: m => logs.push(m) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: conteudo => ({ conteudo, setMimeType() { return this; } }),
    },
    Math, Date, JSON, Object, Array, String, Number, RegExp, Error,
  };
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Codigo.gs'), 'utf8');
  vm.runInContext(codigo + '\n;this.__exportar = { configurar, doGet, doPost, sortearRoda_, tratar_ };', contexto);
  const s = contexto.__exportar;
  return {
    planilha, props, logs,
    configurar: s.configurar,
    sortearRoda: s.sortearRoda_,
    /** Simula um POST do site e devolve o JSON da resposta. */
    pedir(dados) {
      const r = s.doPost({ postData: { contents: JSON.stringify(dados) } });
      return JSON.parse(r.conteudo);
    },
    get(dados) { return JSON.parse(s.doGet().conteudo); },
  };
}

module.exports = { carregarServidor };

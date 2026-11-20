# Amigo Secreto dos Mendoncinhas 2026

Site do amigo secreto da família Mendonça. Os participantes se cadastram, sugerem
presentes, descobrem quem tiraram numa caixa de presente animada e marcam quando
compraram. O administrador cuida de tudo por um painel, e no dia da troca a
roda é revelada pessoa por pessoa na TV.

## Como está organizado

| Pasta / arquivo | O que é |
|---|---|
| `docs/` | O site, publicado pelo GitHub Pages. |
| `docs/config.js` | Endereço do servidor do Google (a URL que termina em `/exec`). |
| `apps-script/Codigo.gs` | O servidor: roda no Google Apps Script e guarda os dados numa planilha do Google. |
| `testes/` | Testes automáticos do sorteio, do servidor e do site. |
| `prototipo/` | Simulação usada para validar o layout (dados fictícios). |
| `REQUISITOS.md` | O que o sistema faz. |
| `INSTRUCOES_GOOGLE.md` | Como configurar e atualizar o Google e publicar o site. |

Nomes, celulares, sugestões e o resultado do sorteio ficam **só na planilha do Google**,
que é privada. Nada disso vai para este repositório.

## Endereços do site

- Cadastro (para mandar no grupo da família): `https://franzefechine.github.io/AmigoSecreto2026/`
- Painel do administrador: `https://franzefechine.github.io/AmigoSecreto2026/#admin`
- Noite de Natal (TV): `https://franzefechine.github.io/AmigoSecreto2026/#natal`
- Link pessoal de cada um: gerado no painel, no formato `…/AmigoSecreto2026/?p=CODIGO`

## Testes

Precisa do Node 18 ou mais novo.

```bash
npm test        # sorteio e servidor (Google simulado)
npm run e2e     # site completo num navegador (precisa do Playwright)
```

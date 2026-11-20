# Requisitos — Amigo Secreto da Família Mendonça 2026

> **Status:** rascunho para discussão. Itens marcados com ❓ precisam de decisão.

## 1. Objetivo

Sortear os pares do amigo secreto da família Mendonça. Cada participante tira
exatamente uma pessoa e é tirado por exatamente uma pessoa. Ninguém, nem quem
organiza, pode ver o resultado dos outros.

## 2. Participantes

- **RF-01** Cadastrar participantes com nome (obrigatório) e um contato
  (opcional: e-mail ou WhatsApp).
- **RF-02** Não aceitar nomes repetidos. Exigir pelo menos 3 participantes.
- **RF-03** Editar ou remover participantes **antes** do sorteio.
- ❓ Quantas pessoas devem participar, mais ou menos? (Isso decide se vale a pena ter uma interface ou se basta uma lista num arquivo.)

## 3. Regras do sorteio

- **RF-04** Ninguém pode tirar a si mesmo.
- **RF-05** Cada pessoa dá e recebe exatamente um presente.
- **RF-06** *Restrições*: permitir dizer que A não pode tirar B. Por exemplo,
  casais, ou pais e filhos pequenos.
  - ❓ As restrições valem nos dois sentidos? Se A não pode tirar B, B também não pode tirar A?
  - ❓ Vamos agrupar por **núcleo familiar** (ninguém tira alguém da própria casa)?
- **RF-07** ❓ Evitar repetir o par do ano anterior (2025)? Se sim, alguém tem a lista de 2025?
- **RF-08** ❓ Fazer uma **roda única** (A→B→C→…→A, todos numa só corrente)
  ou aceitar pequenos ciclos fechados (A↔B)?
- **RF-09** Se as restrições tornarem o sorteio impossível, avisar com uma
  mensagem clara e não gerar resultado parcial.
- **RF-10** O sorteio deve ser aleatório de verdade, sem favorecer a ordem do cadastro.

## 4. Revelação do resultado (sigilo)

- **RF-11** Cada participante vê **somente** quem tirou.
- ❓ Como cada um fica sabendo? Opções:
  1. **Link ou código individual**, que cada pessoa abre no celular (recomendado).
  2. **Envio por e-mail** automático (precisa de um serviço de e-mail).
  3. **Mensagem de WhatsApp** pronta para o organizador copiar e enviar.
  4. **Tela "passa o celular"**, para usar quando todos estão juntos: cada um digita o nome e vê o resultado.
- **RF-12** O organizador também participa e não deve conseguir ver o
  resultado dos outros sem querer.
- **RF-13** ❓ Precisamos de um "envelope lacrado" para auditoria, ou seja, poder conferir
  o resultado se alguém esquecer quem tirou?

## 5. Informações extras (opcionais)

- **RF-14** ❓ Valor sugerido do presente, data e local da troca.
- **RF-15** ❓ Lista de desejos ou sugestões de presente de cada participante,
  visível para quem o tirou.

## 6. Requisitos não funcionais

- **RNF-01** Interface em português, simples o bastante para os avós usarem.
- **RNF-02** Funcionar no celular.
- **RNF-03** Sem custo de hospedagem, ou com custo mínimo.
- **RNF-04** Testes automatizados para as regras do sorteio (RF-04 a RF-09).
- ❓ Plataforma preferida:
  - **(a)** Página web estática (HTML/JS), hospedada de graça no GitHub Pages (recomendado).
  - **(b)** Script de linha de comando (Python) rodado pelo organizador.
  - **(c)** Aplicação web com servidor e banco de dados (mais trabalho, permite e-mail e login).

## 7. Fora do escopo (por enquanto)

- Login com senha e contas de usuário.
- Pagamentos e vaquinhas.
- Chat entre participantes.

## 8. Próximos passos

1. Responder os itens ❓.
2. Fechar a lista de participantes e as restrições.
3. Escolher a plataforma e começar a codificar.

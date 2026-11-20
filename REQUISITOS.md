# Requisitos — Amigo Secreto dos Mendoncinhas

> **Status:** v5. Requisitos fechados.

## 1. Objetivo

Organizar o amigo secreto da família em **fases**, para manter todo mundo
animado: cadastro → sugestão de presente → sorteio → revelação de quem cada um tirou.
A troca de presentes será na **véspera de Natal, 24/12/2026**.

## 2. Perfis

| Perfil | O que faz |
|---|---|
| **Administrador** | Também participa do sorteio. Acompanha as fases, define restrições, sorteia e envia as mensagens. Pode ver o resultado de todos. |
| **Participante** | Faz o cadastro, sugere um presente, vê quem tirou e marca quando já comprou o presente. |

## 3. Fases

| Fase | O que acontece | Quem age |
|---|---|---|
| **1. Cadastro** | O administrador divulga o **link de cadastro** no grupo da família. Cada pessoa informa nome e celular. | Participante |
| **2. Sugestão de presente** | Cada participante recebe pelo WhatsApp seu **link pessoal** e informa as sugestões de presente. | Participante |
| **3. Sorteio** | O administrador define as restrições e faz o sorteio. | Administrador |
| **4. Revelação** | No link pessoal, a caixa de presente abre e mostra quem a pessoa tirou. | Participante |

O administrador abre e fecha cada fase.

## 4. Fase 1: Cadastro

- **RF-01** Há um link público de cadastro com os campos **nome** e **celular**,
  ambos obrigatórios.
- **RF-02** Não aceitar celular repetido. Validar o formato: DDD + 9 dígitos.
- **RF-03** Ao se cadastrar, o participante vê uma confirmação e as regras básicas.
- **RF-04** O administrador pode editar, remover ou cadastrar pessoas manualmente.
- **RF-05** O cadastro não exige código. O administrador revisa a lista e remove
  cadastros indevidos.
- **RF-06** O cadastro só é aceito enquanto a Fase 1 estiver aberta.

## 5. Fase 2: Sugestão de presente

- **RF-07** Cada participante tem um **link pessoal** secreto, que funciona como a
  "senha" dele. O administrador o envia pelo WhatsApp com um clique.
- **RF-08** No link pessoal, o participante informa até **3 sugestões de presente**.
  Cada sugestão tem descrição e um link opcional de loja. O participante pode editar
  as sugestões até o sorteio.
- **RF-09** Campos opcionais: tamanho de roupa, tamanho de calçado, "não gosto de...".
- **RF-10** **Painel de pendências:** o administrador vê quem ainda **não sugeriu**
  presente. Ao lado de cada nome há um botão **"Lembrar"**, que abre o WhatsApp com
  uma mensagem de lembrete pronta.

## 6. Fase 3: Sorteio

- **RF-11** Para cada participante, o administrador marca quem ele **não pode tirar**,
  para evitar sorteio dentro do mesmo grupo familiar.
- **RF-12** As restrições valem **nos dois sentidos**: se Ana não pode tirar Bruno,
  Bruno também não pode tirar Ana. O sistema marca a restrição inversa automaticamente.
- **RF-13** Ninguém tira a si mesmo.
- **RF-14** **O amigo secreto não pode quebrar.** O sorteio forma uma **roda única**
  (A→B→C→…→A), com todos os participantes. Pares fechados, como A tira B e B tira A,
  e rodas menores são proibidos.
- **RF-15** O sorteio é aleatório e respeita todas as restrições. Se não houver
  solução possível, o sistema avisa o administrador e não sorteia.
- **RF-16** O administrador pode **refazer** o sorteio, com confirmação. O resultado
  anterior é descartado e as mensagens de revelação precisam ser reenviadas.
- **RF-17** O administrador participa do sorteio e pode ver o resultado completo.

## 7. Fase 4: Revelação

- **RF-18** O administrador libera a revelação. Para cada participante, o sistema
  mostra um botão **"Enviar"**, que abre o WhatsApp com uma mensagem pronta.
- **RF-19** No link pessoal, aparece uma **caixa de presente animada**. Ao tocar nela,
  a caixa se abre e revela o **nome de quem a pessoa tirou**.
- **RF-20** Depois da revelação, o participante vê as **sugestões de presente** e os
  tamanhos de quem tirou, além das regras.
- **RF-21** O painel mostra para quem a mensagem de revelação já foi enviada.

## 8. "Já comprei!"

- **RF-22** No link pessoal, depois da revelação, o participante pode marcar
  **"Já comprei o presente!"**.
- **RF-23** Quem vai **receber** o presente vê no próprio link a mensagem
  **"🎁 Seu presente já foi comprado!"**, sem revelar quem comprou.
- **RF-24** No painel, o administrador acompanha quantos presentes já foram comprados.
- **RF-24a** Depois que a mensagem de revelação foi enviada, o painel mostra o botão
  **"Lembrar compra"** ao lado de quem ainda não marcou a compra. Antes do envio
  o botão não aparece, porque a pessoa ainda não sabe quem tirou. Ele abre o WhatsApp com uma mensagem pronta que pede para
  a pessoa tocar em "Já comprei o presente!" no link pessoal.

## 9. Contador e contagem regressiva

- **RF-25** **Contador de Mendoncinhas:** a página de cadastro e o link pessoal mostram
  quantas pessoas já se cadastraram, por exemplo "23 Mendoncinhas já estão no amigo secreto!".
- **RF-26** **Contagem regressiva** em dias, horas e minutos até a troca de presentes
  na véspera de Natal (24/12/2026), visível no link pessoal.

## 10. Regras exibidas

- Ninguém tira a si mesmo.
- Mantenha segredo sobre quem você tirou.
- **Valor mínimo do presente: R$ 150,00.**
- Troca de presentes na **véspera de Natal (24/12/2026)**.

## 10a. Extras

- **RF-29** **Prévia do link no WhatsApp.** Todo link do site mostra no WhatsApp um cartão
  com imagem natalina, o título "Amigo Secreto dos Mendoncinhas" e uma frase convidativa.
  O site usa as meta tags Open Graph e uma imagem de 1200×630.
- **RF-30** **Confete na revelação.** Ao abrir a caixa de presente, confetes coloridos
  explodem na tela. Não aparecem para quem ativou "reduzir movimento" no celular.
- **RF-31** **Adicionar à tela inicial.** O site pode ser instalado como um ícone no celular.
  - No Android, o botão instala direto.
  - No iPhone, o botão mostra o passo a passo do Safari.
  - O ícone abre o link pessoal da pessoa.
- **RF-32** **Revelação da noite de Natal.** Na fase de revelação, o administrador abre
  uma tela para a TV que mostra a roda pessoa por pessoa:
  - aparece "Fulano tirou…" e o nome fica escondido até o administrador tocar em "Revelar", com confete;
  - quem recebeu o presente é o próximo da roda;
  - no final aparece "Feliz Natal!" com a roda completa.
  - botão **Tela cheia** para mostrar na TV. No computador, a barra de espaço ou a seta → avançam
    e Esc sai da tela cheia. Onde o aparelho não permite, por exemplo no iPhone, o site explica a alternativa.

## 11. Requisitos não funcionais

- **RNF-01** Interface em português, pensada para o celular e simples para todas as idades.
- **RNF-01a** O site aparece sempre no modo claro, mesmo com o celular no modo escuro.
- **RNF-02** Nome: **Amigo Secreto dos Mendoncinhas**.
- **RNF-03** Páginas hospedadas no **GitHub Pages**.
- **RNF-04** Dados armazenados no **Google Planilhas**, acessado por um **Google Apps Script**
  publicado como aplicativo web, que funciona como o servidor.
- **RNF-05** Os nomes e celulares não ficam no repositório do GitHub.
- **RNF-06** Envio de mensagens pelo **WhatsApp**: o administrador clica e confirma
  o envio de cada mensagem.
- **RNF-07** Testes automatizados para as regras do sorteio.
- **RNF-08** O acesso ao painel do administrador exige uma senha de administrador.

## 12. Prazos

| Fase | Prazo inicial |
|---|---|
| Cadastro | até 30/11/2026 |
| Sugestão de presente | até 07/12/2026 |
| Sorteio e revelação | 08/12/2026 |
| Troca de presentes | 24/12/2026 (véspera de Natal) |

- **RF-27** O administrador pode **alterar os prazos** a qualquer momento no painel.
- **RF-28** O administrador pode **avançar de fase antes do prazo**, por exemplo
  quando todos já tiverem se cadastrado. Os prazos aparecem para os participantes
  como referência e não bloqueiam nada automaticamente.

## 13. Fora do escopo

- SMS automático.
- Pagamentos e vaquinhas.
- Perguntas anônimas e dicas sobre o amigo secreto.

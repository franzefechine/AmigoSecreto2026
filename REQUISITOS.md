# Requisitos — Amigo Secreto dos Mendoncinhas

> **Status:** rascunho v3. Itens marcados com ❓ ainda precisam de decisão.

## 1. Objetivo

Organizar o amigo secreto da família em **fases**, para manter todo mundo
animado: cadastro → sugestão de presente → sorteio → revelação de quem cada um tirou.

## 2. Perfis

| Perfil | O que faz |
|---|---|
| **Administrador** | Também participa do sorteio. Acompanha as fases, define restrições, sorteia e envia mensagens. Pode ver o resultado de todos. |
| **Participante** | Faz o cadastro, sugere um presente e vê quem tirou. |

## 3. Fases

| Fase | O que acontece | Quem age |
|---|---|---|
| **1. Cadastro** | O administrador divulga um **link de cadastro** no grupo da família. Cada pessoa informa nome e celular. | Participante |
| **2. Sugestão de presente** | Cada participante recebe pelo WhatsApp um **link pessoal** para informar sua sugestão de presente. | Participante |
| **3. Sorteio** | O administrador define as restrições e sorteia. | Administrador |
| **4. Revelação** | Pelo mesmo link pessoal, cada um vê quem tirou e a sugestão de presente dessa pessoa. | Participante |

O administrador abre e fecha cada fase.

## 4. Fase 1: Cadastro

- **RF-01** Há um link público de cadastro com os campos **nome** e **celular**,
  ambos obrigatórios.
- **RF-02** Não aceitar celular repetido. Validar o formato: DDD + 9 dígitos.
- **RF-03** Ao se cadastrar, o participante vê uma confirmação e as regras básicas.
- **RF-04** O administrador pode editar, remover ou cadastrar pessoas manualmente.
- **RF-05** Para evitar cadastros de estranhos, exigir um **código da família**
  no cadastro, por exemplo `MENDONCA26`, informado no grupo.
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
  - ❓ A restrição vale automaticamente nos dois sentidos?
- **RF-12** Ninguém tira a si mesmo.
- **RF-13** **O amigo secreto não pode quebrar.** O sorteio forma uma **roda única**
  (A→B→C→…→A). Pares fechados, como A tira B e B tira A, são proibidos.
- **RF-14** O sorteio é aleatório e respeita todas as restrições. Se não houver
  solução possível, o sistema avisa o administrador.
- **RF-15** O sorteio **pode ser refeito** pelo administrador, com confirmação. Ao
  refazer, o resultado anterior é descartado e as mensagens precisam ser reenviadas.
- **RF-16** O administrador participa do sorteio e pode ver o resultado completo.

## 7. Fase 4: Revelação

- **RF-17** O administrador libera a revelação. O sistema gera para cada participante
  um botão "Enviar", que abre o WhatsApp com uma mensagem pronta.
- **RF-18** No link pessoal, o participante vê **quem tirou**, as **sugestões de
  presente** dessa pessoa e as **regras**.
- **RF-19** O painel mostra para quem a mensagem já foi enviada.
- **RF-20** Regras exibidas:
  - Ninguém tira a si mesmo.
  - Mantenha segredo sobre quem você tirou.
  - **Valor mínimo do presente: R$ 150,00.**
  - ❓ Data, horário e local da troca.

## 8. Requisitos não funcionais

- **RNF-01** Interface em português, pensada para o celular e simples para todas as idades.
- **RNF-02** Nome: **Amigo Secreto dos Mendoncinhas**.
- **RNF-03** O site fica hospedado no **GitHub Pages**.
- **RNF-04** Os dados ficam em um banco gratuito externo. Veja a seção 9.
- **RNF-05** Os nomes e celulares não ficam no repositório do GitHub.
- **RNF-06** Testes automatizados para as regras do sorteio.
- **RNF-07** Envio de mensagens pelo **WhatsApp**: o administrador clica e confirma
  o envio de cada mensagem.

## 9. Armazenamento de dados

O GitHub Pages só **exibe** páginas. Ele **não grava** dados enviados pelos
visitantes. Para o cadastro funcionar, as páginas ficam no GitHub e os dados vão
para um serviço gratuito:

| Opção | Prós | Contras |
|---|---|---|
| **Google Planilhas + Apps Script** (recomendado) | Gratuito. O administrador vê tudo numa planilha que já conhece. Não precisa cadastrar cartão. | Respostas um pouco mais lentas, de 1 a 2 segundos. |
| **Firebase** | Gratuito, rápido e robusto. | Configuração mais técnica no console do Google. |
| **Supabase** | Gratuito, com banco SQL. | O projeto gratuito é pausado após 7 dias sem uso. |

## 10. Ideias para deixar mais dinâmico (escolher quais entram)

- ❓ **Contador de participantes** na página inicial, por exemplo "18 Mendoncinhas já se cadastraram!".
- ❓ **Contagem regressiva** até o dia da troca.
- ❓ **Animação de revelação**: uma raspadinha ou caixa de presente que se abre ao mostrar o nome.
- ❓ **Pergunta anônima ao amigo secreto**: quem tirou alguém manda uma pergunta sem se identificar,
  por exemplo "prefere doce ou salgado?", e a pessoa responde na página dela.
- ❓ **"Já comprei!"**: o participante marca quando comprou o presente, e o administrador acompanha no painel.
- ❓ **Dicas para o dia da revelação**: cada um escreve 3 dicas sobre quem tirou, para usar na brincadeira da troca.
- ❓ **Prazos por fase**, exibidos na tela. Por exemplo: "sugestões até 05/12".

## 11. Fora do escopo

- SMS automático.
- Pagamentos e vaquinhas.

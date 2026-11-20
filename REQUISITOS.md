# Requisitos — Amigo Secreto dos Mendoncinhas

> **Status:** rascunho v2. Itens marcados com ❓ ainda precisam de decisão.

## 1. Objetivo

Sistema para o administrador cadastrar os participantes, definir restrições,
realizar o sorteio uma única vez e enviar a cada participante, pelo celular,
uma senha para ver quem ele tirou.

## 2. Perfis

| Perfil | O que faz |
|---|---|
| **Administrador** | Cadastra participantes e restrições, faz o sorteio e envia as mensagens. |
| **Participante** | Recebe a mensagem, digita a senha e vê **somente** quem tirou e as regras. |

## 3. Cadastro de participantes

- **RF-01** O administrador cadastra cada participante com **nome** e
  **celular**. Os dois campos são obrigatórios.
- **RF-02** Não aceitar nome nem celular repetido. Validar o formato do
  celular brasileiro: DDD + 9 dígitos.
- **RF-03** Antes do sorteio, o administrador pode editar ou remover participantes.
  Depois do sorteio, o cadastro fica bloqueado.
- **RF-04** Exigir no mínimo 3 participantes para sortear.

## 4. Restrições (grupo familiar)

- **RF-05** Para cada participante, o administrador marca as pessoas que ele
  **não pode tirar**. O objetivo é evitar sorteio dentro do mesmo grupo familiar.
- ❓ **RF-06** A restrição vale automaticamente nos dois sentidos?
  Ou seja: se Ana não pode tirar Bruno, Bruno também não pode tirar Ana?
- **RF-07** Antes de sortear, o sistema verifica se as restrições permitem um sorteio
  válido. Se não permitirem, avisa o administrador e não sorteia.

## 5. Regras do sorteio

- **RF-08** Ninguém tira a si mesmo.
- **RF-09** **O amigo secreto não pode quebrar.** O sorteio forma uma **roda única**
  (A→B→C→…→A), sem pares fechados. Exemplo do que é proibido: A tira B e B tira A.
- **RF-10** O sorteio respeita todas as restrições do RF-05.
- **RF-11** O sorteio é aleatório e não favorece a ordem do cadastro.
- **RF-12** O sorteio é feito **uma única vez** pelo administrador. Depois disso,
  o resultado fica gravado e não pode ser refeito.
  - ❓ E se houver um erro grave, por exemplo uma pessoa esquecida? Permitimos
    "cancelar e refazer o sorteio" com uma confirmação dupla, ou o sorteio
    é definitivo mesmo?

## 6. Envio do resultado

- **RF-13** Ao final do sorteio, o administrador vê a lista de participantes. Ao lado
  de cada um há um botão **"Enviar"**. Ao clicar, abre o WhatsApp com a mensagem
  pronta para o celular **daquele participante**. A mensagem traz o link de acesso e a
  senha pessoal dele.
- **RF-14** A senha é gerada pelo sistema, é única por participante e fácil de digitar,
  por exemplo 6 dígitos.
- **RF-15** O administrador pode **reenviar** a mensagem se o participante perder
  a senha. O reenvio não refaz o sorteio.
- **RF-16** Na lista, o sistema mostra quais mensagens já foram enviadas.
- ❓ **RF-17** O envio é por **WhatsApp** (gratuito; o administrador clica e
  confirma o envio de cada mensagem) ou por **SMS automático** (pago, precisa de
  um serviço externo)?

## 7. Tela do participante

- **RF-18** O participante abre o link, digita a senha e vê:
  - o **nome de quem tirou**;
  - as **regras do amigo secreto**.
- **RF-19** Uma senha errada não revela nada.
- **RF-20** Texto de regras exibido:
  - Ninguém tira a si mesmo.
  - Mantenha segredo sobre quem você tirou.
  - **Valor mínimo do presente: R$ 150,00.**
  - ❓ Data, horário e local da revelação.
  - ❓ Outras regras? Por exemplo: valor máximo, presente embrulhado, ou como será a revelação.

## 8. Sigilo

- **RF-21** O resultado completo do sorteio nunca aparece na tela do administrador.
- ❓ **RF-22** Ao enviar pelo WhatsApp, o administrador vê a senha de cada pessoa na
  mensagem e, em tese, poderia espiar o resultado. Isso é aceitável? O administrador
  também participa do sorteio?

## 9. Requisitos não funcionais

- **RNF-01** Interface em português, simples, pensada para o celular.
- **RNF-02** Nome do sistema: **Amigo Secreto dos Mendoncinhas**.
- **RNF-03** Testes automatizados para as regras do sorteio (RF-07 a RF-11).
- **RNF-04** Os celulares e nomes dos participantes **não** são gravados no
  repositório do GitHub.
- ❓ **RNF-05** Hospedagem e acesso do administrador. Veja a seção 10.

## 10. Decisão técnica pendente: onde ficam os dados?

O participante precisa abrir o link em outro celular e ver o resultado. Por isso,
o resultado precisa estar acessível fora do aparelho do administrador. Opções:

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **A. Link criptografado** (recomendado) | Site estático no GitHub Pages. O resultado de cada pessoa vai **dentro do link**, criptografado com a senha dela. | Gratuito e sem servidor. Nenhum dado fica guardado na internet. | Os dados do administrador ficam no navegador dele. Trocar de aparelho exige exportar e importar um arquivo. |
| **B. Servidor com banco de dados** | Por exemplo Firebase ou Supabase, no plano gratuito. | O administrador acessa de qualquer aparelho com login. | Mais complexo, depende de serviço externo e guarda dados pessoais na nuvem. |

## 11. Fora do escopo

- Lista de desejos dos participantes.
- Pagamentos e vaquinhas.
- Chat entre participantes.

# Instruções: configurar o Google Planilhas

Faça isso uma vez só, **no computador**. Leva uns 10 minutos.
Use a conta Google do administrador.

---

## Passo 1: Criar a planilha

1. Acesse **https://sheets.new**. Uma planilha em branco será criada.
2. Clique em "Planilha sem título", no canto superior esquerdo, e renomeie para
   **Amigo Secreto dos Mendoncinhas 2026**.
3. ⚠️ **Não compartilhe** a planilha com ninguém. Ela vai guardar os celulares de todos
   e o resultado do sorteio.

## Passo 2: Abrir o editor de script

1. Com a planilha aberta, vá no menu **Extensões → Apps Script**.
2. Uma nova aba vai abrir com um arquivo chamado `Código.gs`, que já tem um texto
   `function myFunction() { ... }`.
3. Clique em "Projeto sem título", no topo, e renomeie para **Mendoncinhas**.

## Passo 3: Colar o código

1. **Apague todo** o conteúdo de `Código.gs`.
2. Copie todo o conteúdo do arquivo
   [`apps-script/Codigo.gs`](apps-script/Codigo.gs) deste repositório e cole no editor.
3. Clique no ícone de **disquete (💾 Salvar)** ou aperte `Ctrl + S`.

## Passo 4: Definir a senha do administrador

1. No menu da esquerda, clique na **engrenagem ⚙️ (Configurações do projeto)**.
2. Role até o fim da página, até **Propriedades do script**, e clique em
   **Adicionar propriedade do script**.
3. Preencha:
   - **Propriedade:** `ADMIN_SENHA`
   - **Valor:** a senha que você vai usar para entrar no painel. Escolha uma senha
     que só você saiba.
4. Clique em **Salvar propriedades do script**.

> A senha fica guardada só no Google. Ela **não** vai para o GitHub.

## Passo 5: Preparar as abas da planilha

1. Volte ao editor clicando em **< > (Editor)**, no menu da esquerda.
2. No topo, ao lado do botão **▷ Executar**, selecione a função **`configurar`**.
3. Clique em **▷ Executar**.
4. O Google vai pedir autorização. Isso é normal:
   - Clique em **Revisar permissões** e escolha sua conta.
   - Vai aparecer **"O Google não verificou este app"**. Clique em **Avançado** e
     depois em **Acessar Mendoncinhas (não seguro)**. O "app" é o seu próprio
     script, então é seguro.
   - Clique em **Permitir**.
5. No **Registro de execução**, na parte de baixo, deve aparecer:
   `Planilha configurada. Senha do administrador definida: sim`
6. Volte à aba da planilha. Devem existir as abas **Participantes**, **Restricoes** e **Config**.

## Passo 6: Publicar como aplicativo da Web

1. No editor, clique no botão azul **Implantar**, no canto superior direito, e depois
   em **Nova implantação**.
2. Clique na **engrenagem ⚙️** ao lado de "Selecionar tipo" e escolha **App da Web**.
3. Preencha:
   - **Descrição:** `Mendoncinhas`
   - **Executar como:** **Eu** (seu e-mail)
   - **Quem pode acessar:** **Qualquer pessoa**
4. Clique em **Implantar**. Se pedir autorização de novo, repita o passo 5.4.
5. Copie a **URL do app da Web**. Ela termina em `/exec`, por exemplo:
   `https://script.google.com/macros/s/AKfy.../exec`

> "Qualquer pessoa" só permite **usar** o site. Ninguém consegue abrir a planilha.

## Passo 7: Testar

Cole a URL no navegador. Deve aparecer algo assim:

```json
{"ok":true,"app":"Amigo Secreto dos Mendoncinhas","fase":"cadastro","participantes":0,"senhaAdminDefinida":true}
```

✅ Funcionou? **Me envie a URL** que termina em `/exec`. Com ela eu ligo o site à planilha.

---

## Quando o código for atualizado

Nas próximas etapas eu vou mandar versões novas do `Codigo.gs`. Para atualizar
**sem mudar a URL**:

1. Cole o código novo no editor e salve.
2. Clique em **Implantar** e depois em **Gerenciar implantações**.
3. Clique no **lápis ✏️ (Editar)**.
4. Em **Versão**, escolha **Nova versão** e clique em **Implantar**.

⚠️ Não use "Nova implantação" para atualizar. Ela cria uma URL diferente.

## Problemas comuns

| Problema | Solução |
|---|---|
| `Planilha não configurada` ao testar a URL | Rode a função `configurar` (passo 5). |
| `senhaAdminDefinida: false` | Volte ao passo 4 e confira se o nome é exatamente `ADMIN_SENHA`. |
| Abre uma página pedindo login do Google | Em "Quem pode acessar", escolha **Qualquer pessoa** (passo 6.3). |
| Mudei o código, mas nada mudou | Publique uma **Nova versão** (veja "Quando o código for atualizado"). |

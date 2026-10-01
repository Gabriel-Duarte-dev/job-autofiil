# Job Autofill

Extensão para Chrome e Edge que lê o seu currículo em PDF, monta um perfil local e preenche formulários de candidatura em qualquer site — incluindo dropdowns, radios e botões que adicionam campos.

A chave da OpenAI e o PDF ficam no `chrome.storage` deste navegador. Na hora de preencher, só o perfil e o schema dos campos visíveis vão para a API.

## Requisitos

- Node.js 22 ou superior (há um `.nvmrc` com `24`)
- Conta e API key da [OpenAI](https://platform.openai.com/api-keys)

## Instalação (desenvolvimento)

```bash
nvm use
npm install
npm run dev
```

O WXT abre um Chrome com a extensão carregada. Alternativa manual:

```bash
npm run build
```

1. Abra `chrome://extensions`
2. Ative **Modo do desenvolvedor**
3. **Carregar sem compactação** e escolha a pasta `.output/chrome-mv3`

## Como usar

1. Clique no ícone da extensão → **Abrir opções / importar currículo**
2. Cole a API key, escolha o modelo (`gpt-4o-mini` é o padrão)
3. Envie o PDF do currículo e revise o perfil gerado
4. Abra o formulário da vaga e clique no botão flutuante **Preencher** (ou no popup)
5. Confira o painel do que será preenchido e confirme

## Página de demonstração

Com a extensão carregada:

```bash
npx --yes serve demo -p 4177
```

Abra [http://localhost:4177](http://localhost:4177). O formulário tem dropdown, radio, upload, textarea e **Adicionar experiência**.

## O que a extensão não faz

- CAPTCHA, SMS e alguns datepickers proprietários
- iframes de outro domínio
- 100% dos widgets de ATS muito customizados (Workday/Taleo). O scanner genérico cobre a maioria; dá para acrescentar um adapter depois

## Scripts

| Comando | Efeito |
| --- | --- |
| `npm run dev` | Desenvolvimento com recarga |
| `npm run build` | Build de produção em `.output/chrome-mv3` |
| `npm run compile` | Typecheck |

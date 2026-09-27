# WhatsApp Alerta Central

Extensão para **Google Chrome / Chromium (Manifest V3)** que monitora estados não lidos no WhatsApp Web e exibe um toast profissional na aba web ativa do navegador.

> **Versão atual:** `$11.2.15`

## Visão geral

O projeto foi criado para destacar mensagens e conversas não lidas sem depender da aba do WhatsApp estar em primeiro plano. O processamento ocorre localmente no navegador e não utiliza backend próprio, banco remoto ou analytics externo.

### O que gera alerta

A extensão considera como evento válido:

- mensagem nova recebida;
- conversa normal marcada manualmente como não lida;
- mensagem nova em conversa arquivada;
- conversa arquivada marcada manualmente como não lida;
- qualquer item ainda não lido encontrado ao abrir ou recarregar o WhatsApp Web.

## Recursos

- toast profissional sobre a aba web ativa;
- suporte a conversas normais e arquivadas;
- detecção por acessibilidade, badges numéricos e indicador visual de não lido;
- varredura inicial de itens não lidos;
- leitura silenciosa de Arquivadas quando necessário;
- prévia opcional da mensagem;
- som opcional;
- botão **Abrir conversa**;
- fallback por notificação do sistema em páginas nas quais o Chrome bloqueia injeção;
- deduplicação de eventos durante a mesma sessão;
- configurações salvas localmente com `chrome.storage`;
- sem envio de conteúdo para servidores próprios.

## Instalação para teste

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions`.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta raiz do projeto.
6. Abra ou recarregue `https://web.whatsapp.com/`.

Consulte o [Manual do Usuário](MANUAL_USUARIO.md) para detalhes.

## Estrutura do projeto

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── pull_request_template.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── GITHUB_SETUP.md
│   ├── RELEASE.md
│   └── TESTING.md
├── icons/
├── scripts/
│   └── validate.mjs
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── MANUAL_USUARIO.md
├── PRIVACIDADE.md
├── README.md
├── SECURITY.md
├── background.js
├── content-ui.css
├── content-ui.js
├── content-whatsapp.js
├── manifest.json
├── options.html
├── options.js
├── popup.html
├── popup.js
├── ui.css
└── package.json
```

## Arquitetura

A extensão é dividida em três responsabilidades principais:

- `content-whatsapp.js`: detecta estados não lidos no WhatsApp Web;
- `background.js`: coordena eventos, aba ativa, injeção e fallback de notificação;
- `content-ui.js` + `content-ui.css`: renderizam o toast na aba web ativa.

Mais detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Privacidade

O projeto processa os dados localmente no navegador. Nenhuma mensagem é enviada a um servidor próprio do projeto.

Leia [PRIVACIDADE.md](PRIVACIDADE.md).

## Desenvolvimento

Requisitos mínimos:

- Node.js 20+ para os scripts de validação;
- Chrome/Chromium compatível com Manifest V3.

Validação local:

```bash
npm run validate
```

O mesmo conjunto básico de verificações é executado automaticamente pelo GitHub Actions em `push` e `pull_request`.

Antes de alterar o código, consulte [AGENTS.md](AGENTS.md) e [CONTRIBUTING.md](CONTRIBUTING.md).

## Compatibilidade e limitações

O WhatsApp Web é uma aplicação de terceiros e pode alterar classes, atributos, estrutura DOM ou comportamento sem aviso. O projeto evita depender exclusivamente de classes CSS geradas e prioriza sinais semânticos e de acessibilidade, mas mudanças relevantes no WhatsApp podem exigir atualização do detector.

Páginas protegidas do Chrome, como `chrome://extensions`, `chrome://settings` e a Chrome Web Store, não permitem injeção de content scripts. Nesses casos, a extensão utiliza o fallback disponível.

## Segurança

Para relatar uma vulnerabilidade, veja [SECURITY.md](SECURITY.md). Não publique dados pessoais, mensagens, números de telefone ou capturas contendo conteúdo privado em issues públicas.

## Versionamento

O projeto usa versionamento no formato `MAJOR.MINOR.PATCH`. O fluxo de release está documentado em [docs/RELEASE.md](docs/RELEASE.md).

## Aviso sobre marcas

Este projeto é independente e **não é afiliado, patrocinado ou endossado pelo WhatsApp ou pela Meta**. “WhatsApp” é marca de seus respectivos proprietários e é utilizado aqui apenas para indicar compatibilidade/interoperabilidade.

## Licenciamento

Nenhuma licença de código aberto é concedida automaticamente por este repositório. Consulte [LICENSE.md](LICENSE.md).

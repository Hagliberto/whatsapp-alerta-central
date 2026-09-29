# WhatsApp Alerta Central

Extensão WebExtension para **Google Chrome, Microsoft Edge e Mozilla Firefox (Manifest V3)** que monitora estados não lidos no WhatsApp Web e exibe um toast profissional na aba web ativa do navegador.

> **Versão atual:** `1.4.2`

## Visão geral

O projeto foi criado para destacar mensagens e conversas não lidas sem depender da aba do WhatsApp estar em primeiro plano. O processamento ocorre localmente no navegador e não utiliza backend próprio, banco remoto ou analytics externo.

### Autor

**Hagliberto Alves de Oliveira** — autor e desenvolvedor do **WhatsApp Alerta Central**, criado para oferecer alertas locais, organização de mensagens pendentes e maior controle das notificações do WhatsApp Web, com foco em privacidade e praticidade.

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
- monitoramento passivo do contador de Arquivadas, sem abrir ou navegar automaticamente nessa área;
- prévia opcional da mensagem;
- som opcional;
- botão **Abrir conversa**;
- intervalo de verificação periódica configurável;
- reaviso automático de mensagens ainda pendentes;
- ações **Adiar**, **Silenciar** e **Marcar como lida** no toast;
- soneca rápida de **5, 15, 30 ou 60 minutos**;
- **Central de pendências** com pesquisa, filtros e ações por conversa;
- **horário de silêncio** configurável, inclusive atravessando a meia-noite;
- **regras por contato/grupo** usando o nome exato da conversa, com intervalo próprio, opção de não reavisar e exceção ao silêncio;
- **badge no ícone da extensão** com a quantidade de pendências;
- **diagnóstico local** com estado do monitor, última varredura, última detecção e próximo reaviso;
- encerramento automático do reaviso quando a conversa é aberta no WhatsApp Web;
- fallback por notificação do sistema em páginas nas quais o Chrome bloqueia injeção;
- deduplicação de eventos durante a mesma sessão;
- configurações salvas localmente com `chrome.storage`;
- sem envio de conteúdo para servidores próprios.

## Downloads por navegador

Cada GitHub Release publica dois pacotes independentes:

- **Chrome / Edge:** `whatsapp-alerta-central-chrome-edge-v1.4.2.zip`
- **Firefox:** `whatsapp-alerta-central-firefox-v1.4.2.zip`

O código funcional é compartilhado. A diferença principal fica no Manifest: Chrome/Edge usam `background.service_worker`; Firefox usa `background.scripts` e um identificador Gecko próprio.

## Instalação para teste

### Chrome / Edge

1. Baixe o pacote **Chrome / Edge**.
2. Extraia o ZIP.
3. Abra `chrome://extensions` no Chrome ou `edge://extensions` no Edge.
4. Ative **Modo do desenvolvedor**.
5. Clique em **Carregar sem compactação**.
6. Selecione a pasta extraída.
7. Abra ou recarregue `https://web.whatsapp.com/`.

### Firefox

1. Baixe o pacote **Firefox**.
2. Extraia o ZIP.
3. Abra `about:debugging#/runtime/this-firefox`.
4. Clique em **Carregar extensão temporária**.
5. Selecione o `manifest.json` da pasta extraída.
6. Abra ou recarregue `https://web.whatsapp.com/`.

Para instalação permanente no Firefox, o pacote precisa ser assinado pela Mozilla/AMO.

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
│   ├── validate.mjs
│   ├── validate-cross-browser.mjs
│   └── build-release.ps1
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── MANUAL_USUARIO.md
├── PRIVACIDADE.md
├── README.md
├── RELEASE_NAVEGADORES.md
├── SECURITY.md
├── background.js
├── content-ui.css
├── content-ui.js
├── content-whatsapp.js
├── manifest.json                 # Chrome / Edge
├── manifest.firefox.json         # Firefox
├── options.html
├── options.js
├── pending.html
├── pending.js
├── popup.html
├── popup.js
├── ui.css
└── package.json
```

## Arquitetura

A extensão é dividida em três responsabilidades principais:

- `content-whatsapp.js`: detecta estados não lidos no WhatsApp Web;
- `background.js`: coordena eventos, pendências, regras, horário de silêncio, badge, aba ativa, injeção e fallback de notificação;
- `content-ui.js` + `content-ui.css`: renderizam o toast na aba web ativa;
- `pending.html` + `pending.js`: exibem a Central de pendências;
- `options.html` + `options.js`: concentram preferências, regras por conversa e diagnóstico.

Mais detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Compatibilidade entre navegadores

- **Chrome / Edge:** mantém o comportamento atual, incluindo os botões de ação no fallback de notificação do sistema quando suportados.
- **Firefox:** mantém Central de Pendências, reavisos, soneca, silêncio, regras por conversa, badge e diagnóstico. No fallback nativo do sistema, o Firefox recebe uma notificação básica; as ações continuam disponíveis no toast central e na Central de Pendências.
- O Firefox usa `browser_specific_settings.gecko.data_collection_permissions.required = ["none"]`, declarando que a extensão não coleta nem transmite dados para fora do navegador.

## Privacidade

O projeto processa os dados localmente no navegador. Nenhuma mensagem é enviada a um servidor próprio do projeto.

Leia [PRIVACIDADE.md](PRIVACIDADE.md).

## Desenvolvimento

Requisitos mínimos:

- Node.js 20+ para os scripts de validação;
- Chrome/Edge compatível com Manifest V3 ou Firefox compatível com WebExtensions Manifest V3.

Validação local:

```bash
npm run validate
```

O mesmo conjunto básico de verificações é executado automaticamente pelo GitHub Actions em `push` e `pull_request`.

Antes de alterar o código, consulte [AGENTS.md](AGENTS.md) e [CONTRIBUTING.md](CONTRIBUTING.md).

## Compatibilidade e limitações

O WhatsApp Web é uma aplicação de terceiros e pode alterar classes, atributos, estrutura DOM ou comportamento sem aviso. O projeto evita depender exclusivamente de classes CSS geradas e prioriza sinais semânticos e de acessibilidade, mas mudanças relevantes no WhatsApp podem exigir atualização do detector.

Páginas internas protegidas do navegador, como `chrome://`, `edge://`, `about:` e as lojas de extensões, não permitem injeção comum de content scripts. Nesses casos, a extensão utiliza o fallback disponível.

## Segurança

Para relatar uma vulnerabilidade, veja [SECURITY.md](SECURITY.md). Não publique dados pessoais, mensagens, números de telefone ou capturas contendo conteúdo privado em issues públicas.

## Versionamento

O projeto usa versionamento no formato `MAJOR.MINOR.PATCH`. O fluxo de release está documentado em [docs/RELEASE.md](docs/RELEASE.md).

## Aviso sobre marcas

Este projeto é independente e **não é afiliado, patrocinado ou endossado pelo WhatsApp ou pela Meta**. “WhatsApp” é marca de seus respectivos proprietários e é utilizado aqui apenas para indicar compatibilidade/interoperabilidade.

## Licenciamento

Nenhuma licença de código aberto é concedida automaticamente por este repositório. Consulte [LICENSE.md](LICENSE.md).

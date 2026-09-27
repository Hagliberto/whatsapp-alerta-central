# Arquitetura

## Objetivo

Detectar estados não lidos no WhatsApp Web e apresentar um toast na aba web ativa do navegador, mesmo quando o usuário não está olhando para a aba do WhatsApp.

## Componentes

### `content-whatsapp.js`

Executa somente em `web.whatsapp.com` e concentra a detecção.

Responsabilidades:

- identificar conversas não lidas;
- distinguir badges numéricos, ponto verde e sinais de acessibilidade;
- monitorar Arquivadas;
- realizar varredura inicial;
- evitar interpretar horários, datas ou IDs como contadores;
- emitir eventos para o service worker.

### `background.js`

Service worker Manifest V3.

Responsabilidades:

- receber eventos do detector;
- aplicar deduplicação e configuração;
- localizar a aba ativa;
- injetar a interface quando necessário;
- usar notificação do sistema como fallback;
- coordenar alarmes de redundância.

### `content-ui.js` / `content-ui.css`

Responsáveis pelo toast exibido sobre a aba ativa.

O módulo visual não deve interpretar o DOM da página atual. Ele apenas recebe um payload já normalizado e renderiza a interface.

### `options.*`

Gerencia preferências persistidas em `chrome.storage`.

### `popup.*`

Interface compacta da extensão.

## Fluxo simplificado

```text
WhatsApp Web
    ↓
content-whatsapp.js
    ↓ runtime message
background.js
    ↓ identifica aba ativa
content-ui.js
    ↓
Toast
```

## Princípios de manutenção

- preferir ARIA, texto semântico e geometria estável a classes geradas;
- não coletar conteúdo desnecessário;
- não executar código remoto;
- manter detector e interface desacoplados;
- falhar de forma segura quando o DOM não for reconhecido.

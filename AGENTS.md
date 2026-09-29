# AGENTS.md — WhatsApp Alerta Central

## 1. Objetivo deste arquivo

Este documento define as regras obrigatórias para qualquer pessoa ou agente de IA que altere o projeto **WhatsApp Alerta Central**.

O objetivo é preservar a estabilidade, a segurança, a privacidade e a experiência do usuário em todas as evoluções da extensão.

> Regra principal: qualquer alteração deve ser entregue como uma versão completa e funcional da extensão. Não criar pacotes de atualização parcial, não manter versões antigas dentro do ZIP e não duplicar arquivos com sufixos como `old`, `backup`, `v2`, `final`, `corrigido` ou semelhantes.

---

## 2. Visão geral do projeto

O **WhatsApp Alerta Central** é uma extensão WebExtension para Chrome/Edge e Firefox baseada em **Manifest V3** que monitora o WhatsApp Web aberto no navegador e exibe um alerta visual central quando uma nova mensagem é detectada.

Principais objetivos:

- alertar mensagens novas do WhatsApp Web;
- exibir o aviso no centro da aba ativa do navegador;
- funcionar mesmo quando o usuário estiver navegando em outro site;
- detectar alterações no contador de conversas arquivadas;
- permitir configuração de som, prévia e duração do aviso;
- manter todo o processamento local, sem servidor externo;
- oferecer fallback por notificação do sistema quando a página ativa não permitir injeção de interface.

---

## 3. Arquitetura atual

### `manifest.json`
Arquivo principal da extensão.

Responsável por:

- Manifest V3;
- permissões;
- host permissions;
- service worker;
- content scripts;
- página de opções;
- popup da extensão;
- ícones.

### `background.js`
Service worker da extensão.

Responsabilidades:

- receber eventos do monitor do WhatsApp;
- controlar preferências armazenadas;
- identificar a aba ativa;
- encaminhar o alerta para o content script visual;
- abrir/focar o WhatsApp Web;
- usar notificação do Chrome como fallback quando necessário;
- evitar notificações duplicadas quando possível.

### `content-whatsapp.js`
Executado exclusivamente em `https://web.whatsapp.com/*`.

Responsabilidades:

- observar mudanças no DOM do WhatsApp Web;
- localizar conversas com estado de não lida;
- detectar novas mensagens visíveis;
- observar o contador de `Arquivadas`;
- normalizar os dados do alerta;
- comunicar eventos ao `background.js`.

### `content-ui.js`
Executado em páginas HTTP/HTTPS.

Responsabilidades:

- receber o evento do service worker;
- criar o toast;
- mostrar remetente, texto e origem do alerta;
- oferecer botão para abrir WhatsApp;
- remover o popup automaticamente;
- reproduzir sinal sonoro quando habilitado.

### `content-ui.css`
Estilos exclusivos do popup injetado nas páginas.

### `popup.html` / `popup.js`
Interface rápida acessível pelo ícone da extensão.

### `options.html` / `options.js`
Tela de configuração completa.

### `ui.css`
Folha de estilos das páginas internas da extensão.

### `icons/`
Ícones utilizados pelo Manifest e pela interface.

---

## 4. Regras obrigatórias para alterações

### 4.1. Não quebrar o fluxo principal

Antes de entregar qualquer versão, validar obrigatoriamente:

1. O Chrome consegue carregar a extensão sem erro de Manifest.
2. O WhatsApp Web abre normalmente.
3. O monitor é iniciado após o carregamento do WhatsApp Web.
4. Uma mensagem nova em conversa normal produz alerta.
5. O alerta é encaminhado para a aba ativa.
6. O botão `Abrir WhatsApp` funciona.
7. A tela de configurações carrega e salva preferências.
8. A extensão continua funcionando após recarregar o Chrome.
9. O monitor de `Arquivadas` não quebra quando o contador não existe.
10. Nenhum erro de sintaxe JavaScript permanece nos arquivos.

### 4.2. Não depender de classes CSS internas do WhatsApp

O WhatsApp Web altera nomes de classes com frequência.

Evitar seletores baseados em classes ofuscadas ou nomes aparentemente aleatórios.

Preferir, nesta ordem:

1. atributos `aria-*`;
2. `data-testid`, quando disponível e estável;
3. `role`;
4. atributos semânticos;
5. estrutura do DOM com fallback;
6. texto visível, apenas quando necessário.

Sempre implementar fallback quando um seletor for crítico.

### 4.3. Conversas arquivadas

O comportamento de arquivamento é controlado pelo próprio WhatsApp.

A extensão não deve:

- desarquivar automaticamente;
- abrir conversas sem ação do usuário;
- enviar mensagens;
- marcar mensagem como lida;
- manipular o banco interno do WhatsApp;
- tentar contornar criptografia ou autenticação.

A detecção das arquivadas deve ser passiva, baseada em informações disponíveis no DOM da própria sessão do usuário.

Quando o WhatsApp não expuser nome ou conteúdo da mensagem arquivada, mostrar um alerta genérico e verdadeiro, nunca inventar remetente ou conteúdo.

### 4.4. Privacidade

É proibido adicionar:

- servidor externo para receber conteúdo de mensagens;
- analytics de terceiros;
- telemetria contendo nomes, mensagens, números ou contatos;
- armazenamento remoto;
- envio de dados a APIs externas;
- scripts remotos carregados por CDN.

Preferências devem ficar na API WebExtensions de armazenamento (`chrome.storage`/compatível).

Conteúdo de mensagens deve existir somente em memória durante o processamento necessário para exibir o alerta.

### 4.5. Permissões

Não adicionar permissões sem necessidade funcional clara.

Qualquer nova permissão deve ser:

1. justificada no `README.md`;
2. descrita no `MANUAL_USUARIO.md` quando afetar o usuário;
3. registrada no `CHANGELOG.md`.

### 4.6. Interface

A interface deve permanecer:

- profissional;
- limpa;
- legível;
- responsiva;
- sem excesso de cores;
- com hierarquia visual clara;
- compatível com resoluções comuns de desktop;
- sem interferir na navegação da página ativa.

O alerta deve ter `z-index` suficientemente alto e todos os estilos devem ser prefixados/isolados para reduzir conflito com páginas externas.

### 4.7. Acessibilidade

Sempre que possível:

- usar `aria-label` em botões sem texto;
- manter contraste suficiente;
- suportar tecla `Escape` para fechar o alerta;
- evitar animações excessivas;
- respeitar `prefers-reduced-motion`.

---

## 5. Regras de versionamento

Usar versionamento semântico:

`MAJOR.MINOR.PATCH`

Exemplos:

- `1.1.0`: nova funcionalidade compatível;
- `1.1.1`: correção;
- `2.0.0`: mudança estrutural incompatível.

Ao alterar a versão:

1. atualizar `manifest.json`;
2. atualizar `README.md`;
3. atualizar `CHANGELOG.md`;
4. gerar um ZIP completo novo.

Não incluir o número da versão no nome dos arquivos internos da aplicação.

---

## 6. Estrutura de entrega

O ZIP final deve conter diretamente a pasta funcional do projeto com, no mínimo:

```text
whatsapp-alerta-central/
├── AGENTS.md
├── CHANGELOG.md
├── MANUAL_USUARIO.md
├── PRIVACIDADE.md
├── README.md
├── manifest.json
├── background.js
├── content-whatsapp.js
├── content-ui.js
├── content-ui.css
├── popup.html
├── popup.js
├── options.html
├── options.js
├── ui.css
└── icons/
```

Não incluir:

- `node_modules`;
- caches;
- arquivos temporários;
- versões antigas;
- ZIP dentro de ZIP;
- arquivos de backup;
- dumps de dados pessoais.

---

## 7. Checklist técnico antes de entregar

Executar no mínimo:

```bash
node --check background.js
node --check content-whatsapp.js
node --check content-ui.js
node --check popup.js
node --check options.js
```

Validar o JSON:

```bash
python -m json.tool manifest.json
```

Conferir se todos os arquivos referenciados pelo Manifest existem.

Também realizar teste manual no Chrome em modo desenvolvedor.

---

## 8. Cenários mínimos de teste manual

### Cenário A — Mensagem normal

- WhatsApp Web aberto.
- Usuário em outra aba.
- Receber mensagem.
- Esperado: toast com identificação disponível da conversa.

### Cenário B — WhatsApp em primeiro plano

- Permanecer no WhatsApp Web.
- Receber mensagem em outra conversa.
- Esperado: alerta sem impedir o funcionamento normal do WhatsApp.

### Cenário C — Conversa arquivada

- Arquivar uma conversa.
- Manter comportamento de arquivadas do WhatsApp ativo.
- Receber nova mensagem.
- Esperado: alteração do contador de arquivadas gera alerta.
- Se o remetente não estiver exposto no DOM, usar texto genérico.

### Cenário D — Página restrita

- Aba ativa em `chrome://extensions` ou página que não aceite content script.
- Receber mensagem.
- Esperado: usar notificação de sistema, se habilitada.

### Cenário E — Preferências

Testar separadamente:

- alertas desligados;
- arquivadas desligadas;
- som desligado;
- prévia desligada;
- diferentes tempos de exibição.

---

## 9. Tratamento de mudanças do WhatsApp Web

Se o WhatsApp alterar o DOM e a detecção parar:

1. reproduzir o problema;
2. inspecionar elementos semanticamente estáveis;
3. atualizar somente os seletores necessários;
4. manter fallback para estruturas anteriores quando seguro;
5. evitar `setInterval` agressivo;
6. preferir `MutationObserver` com debounce;
7. impedir duplicação de alertas;
8. testar conversas normais e arquivadas novamente.

Nunca implementar automação que viole o uso normal da sessão do usuário.

---

## 10. Segurança

Não utilizar `eval`, `new Function` ou execução de código remoto.

Não inserir HTML recebido diretamente da mensagem com `innerHTML` sem sanitização. Preferir `textContent`.

Não armazenar sessão, cookies, tokens, chaves ou credenciais do WhatsApp.

Não tentar acessar IndexedDB, Local Storage ou estruturas privadas do WhatsApp para extrair histórico.

---

## 11. Padrão de código

- JavaScript moderno compatível com Chrome/Edge e Firefox atuais.
- funções pequenas e específicas;
- nomes descritivos;
- constantes para valores reutilizados;
- tratamento explícito de erros esperados;
- evitar logs excessivos em produção;
- não silenciar erros críticos sem motivo;
- sem dependências externas quando não forem realmente necessárias.

---

## 12. Prioridade do projeto

Em caso de conflito entre uma nova funcionalidade e a estabilidade, a prioridade é:

1. privacidade;
2. segurança;
3. funcionamento do alerta;
4. compatibilidade com WhatsApp Web;
5. desempenho;
6. experiência visual;
7. novas funcionalidades.



## Atualização 1.2.6
O toast global usa injeção sob demanda pelo service worker para aparecer na aba web ativa, inclusive em abas abertas antes da instalação ou do recarregamento da extensão. Páginas internas do Chrome (`chrome://`) e a Chrome Web Store continuam protegidas pelo navegador e não aceitam injeção de conteúdo.


## Detecção de arquivadas em segundo plano — v1.2.7
Quando o WhatsApp Web está em outra aba, o aplicativo pode não atualizar o contador de **Arquivadas** no DOM principal. A extensão realiza uma leitura silenciosa periódica da pasta Arquivadas enquanto a aba está oculta e retorna automaticamente à tela anterior. Existe ainda um alarme de redundância do Manifest V3 para reduzir falhas causadas por throttling do Chrome.


## Atualização 1.2.9
Ao abrir ou recarregar o WhatsApp Web, se já existirem conversas arquivadas não lidas, a extensão exibe um toast-resumo imediatamente. Esse aviso inicial ocorre uma vez por carregamento da página e não depende de abrir manualmente a pasta Arquivadas.


## Regra de parsing de contadores
Nunca inferir quantidade de não lidas removendo caracteres não numéricos de textos genéricos. Horários, datas, IDs e conteúdo de mensagens não podem virar contadores. Preferir atributos semânticos de `unread/não lida` e badges numéricos compactos visualmente associados ao item monitorado.
## Regra funcional de não lidos

A lógica de negócio considera qualquer conversa em estado **não lido** como evento notificável: mensagem nova, marcação manual, arquivada ou não. A varredura inicial após abrir/recarregar o WhatsApp Web também deve notificar pendências já existentes. Alterações futuras não devem restaurar o comportamento antigo de ignorar itens não lidos na inicialização.


## Detecção refinada 1.2.13

- Priorize `aria-label`/nome acessível para identificar `Não lidas` e contagens explícitas.
- Trate badge numérico, ponto verde e semântica acessível como sinais distintos.
- Nunca converta horários, datas, IDs ou números de conteúdo em contadores de não lidas.
- Para `Arquivadas`, aceite apenas badge numérico compacto alinhado à direita do rótulo.
- Se houver estado não lido sem quantidade confiável, notifique sem fabricar uma contagem.

## GitHub e colaboração

- A branch estável é `main`.
- Todo Pull Request deve passar em `.github/workflows/validate.yml`.
- Não versionar ZIPs de releases dentro do repositório; anexá-los apenas em GitHub Releases.
- Não publicar dados pessoais, screenshots privadas, tokens, cookies ou credenciais.
- Tags de release devem usar o formato `vMAJOR.MINOR.PATCH`.

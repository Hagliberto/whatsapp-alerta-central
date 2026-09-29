## 1.4.2 — 2026-09-29

- Adiciona suporte oficial ao **Mozilla Firefox**, preservando a mesma base funcional usada no Chrome/Edge.
- Adiciona Manifest específico para Firefox com `background.scripts`, ID Gecko estável e declaração de coleta de dados como `none`.
- Mantém o Manifest atual de Chrome/Edge com `background.service_worker`.
- Adiciona detecção da família do navegador ao diagnóstico.
- Ajusta o fallback nativo do Firefox para notificação básica, mantendo as ações completas no toast central e na Central de Pendências.
- Adiciona geração de dois pacotes de release: **Chrome/Edge** e **Firefox**.
- Adiciona automação de GitHub Actions para publicar os dois ZIPs quando uma tag `v*` for enviada.
- Não adiciona servidor, telemetria nem coleta externa de dados.

## 1.4.1 — 2026-09-28

- Adiciona **Hagliberto Alves de Oliveira** como autor e desenvolvedor oficial da extensão.
- Inclui identificação de autoria no popup, na Central de pendências e em uma seção dedicada nas Configurações.
- Adiciona uma breve descrição do autor e do propósito da extensão no README e no Manual do Usuário.
- Não altera permissões, monitoramento, privacidade ou comportamento funcional da extensão.

## 1.4.0 — 2026-09-28

- Adiciona **Central de pendências** dedicada, com pesquisa, filtros e ações por conversa.
- Adiciona **horário de silêncio** configurável; alertas recebidos durante o período permanecem pendentes e são apresentados após o término.
- Adiciona **regras por contato/grupo** pelo nome exato da conversa, permitindo intervalo próprio, ausência de reaviso e exceção ao horário de silêncio.
- Adiciona **badge no ícone da extensão** com a quantidade atual de pendências.
- Adiciona **soneca rápida** de 5, 15, 30 e 60 minutos diretamente no toast e na Central de pendências.
- Adiciona **tela de diagnóstico** com versão, conexão do WhatsApp Web, heartbeat do monitor, última varredura, última mensagem detectada, próximo reaviso e estado do silêncio.
- Mantém o conteúdo/prévia das mensagens fora do armazenamento persistente; a central trabalha somente com metadados mínimos da pendência.
- Não adiciona novas permissões ao Manifest.

## 1.3.1 — 2026-09-28

- Corrige o monitoramento de conversas arquivadas para obedecer ao modo estritamente passivo definido pelo projeto.
- Remove a abertura automática da pasta **Arquivadas** e qualquer clique sintético usado para entrar/sair dessa área.
- O alarme de redundância em segundo plano agora apenas solicita uma nova leitura do DOM do WhatsApp Web.
- O contador de Arquivadas pode continuar gerando alerta genérico quando aumenta, inclusive com a aba em segundo plano, desde que o WhatsApp exponha esse contador no DOM.
- Quando o usuário abrir Arquivadas manualmente, a extensão continua podendo identificar as conversas não lidas visíveis.
- Reduz o risco de interferência no estado interno/navegação do WhatsApp Web.

## 1.3.0 — 2026-09-28

- Adiciona intervalo configurável para a varredura periódica de novas mensagens (5 a 300 segundos).
- Adiciona reaviso automático configurável para mensagens que continuam pendentes.
- Adiciona configuração do tempo do botão **Adiar**.
- O toast passa a oferecer **Adiar**, **Silenciar**, **Marcar como lida** e **Abrir**.
- **Silenciar** interrompe os reavisos da pendência atual até chegar nova mensagem na mesma conversa.
- **Marcar como lida** confirma a pendência somente na extensão e não altera o estado da conversa no WhatsApp.
- Abrir a conversa pelo toast ou diretamente no WhatsApp Web encerra os reavisos daquela pendência.
- O popup passa a informar a quantidade de pendências e pendências silenciadas.
- O fallback de notificação do sistema oferece ações de **Adiar** e **Marcar como lida**.
- Mantém processamento local e não adiciona novas permissões.

## 1.2.15 — 2026-09-27

- Corrige a organização do pacote de release: o ZIP completo é publicado como anexo da GitHub Release e não é incluído na branch main.
- Remove da branch o ZIP da v1.2.14, quando ainda estiver rastreado, preservando o arquivo local e o anexo da release existente.
- Não altera o comportamento da extensão.

## 1.2.14 â€” 2026-09-27

- Corrige o bloqueio de Ã¡udio do Chrome: o `AudioContext` agora sÃ³ Ã© criado ou retomado apÃ³s interaÃ§Ã£o do usuÃ¡rio com a pÃ¡gina.
- Se o alerta sonoro chegar antes da primeira interaÃ§Ã£o, ele fica pendente e toca apÃ³s o primeiro clique, toque ou tecla.
- Atualiza o manual para explicar esse comportamento.

## 1.2.13 â€” 2026-09-27

### Toast profissional e limpeza de textos tÃ©cnicos

- impede que identificadores internos do WhatsApp, como `ic-archive`, apareÃ§am como nome da conversa;
- prioriza tÃ­tulos humanos e ignora labels tÃ©cnicos de Ã­cones/componentes;
- traduz e padroniza todo o texto exibido pelo toast em portuguÃªs;
- novo layout mais robusto, com cabeÃ§alho, hierarquia visual, chips de contexto e rodapÃ© de aÃ§Ã£o;
- diferencia visualmente `Nova mensagem`, `Marcada como nÃ£o lida`, `Pendente ao abrir` e `Conversa arquivada`;
- quando a prÃ©via nÃ£o Ã© confiÃ¡vel, usa uma mensagem descritiva em portuguÃªs em vez de texto tÃ©cnico;
- mantÃ©m duraÃ§Ã£o de 10 segundos e todas as regras de detecÃ§Ã£o da v1.2.12.

# Changelog

## 1.2.12 â€” 2026-09-27

- Refina a detecÃ§Ã£o de nÃ£o lidos usando primeiro os nomes acessÃ­veis observados no WhatsApp Web, como `NÃ£o lidas` e `1 mensagem nÃ£o lida`.
- Separa explicitamente trÃªs fontes de estado nÃ£o lido: acessibilidade, badge numÃ©rico e ponto verde.
- Badges numÃ©ricos sÃ³ sÃ£o aceitos quando sÃ£o compactos e ficam na regiÃ£o direita da linha da conversa.
- HorÃ¡rios (`12:15`, `2:40 AM`), datas e outros nÃºmeros de conteÃºdo sÃ£o rejeitados antes de qualquer interpretaÃ§Ã£o como contador.
- O contador de **Arquivadas** passa a ser lido somente de um badge compacto alinhado horizontalmente ao rÃ³tulo `Arquivadas`, evitando varredura numÃ©rica ampla do container.
- Quando a quantidade nÃ£o Ã© confiÃ¡vel (por exemplo, somente ponto verde), a conversa continua sendo considerada nÃ£o lida, mas sem inventar uma contagem.
- Mantidas as cinco regras da v1.2.11: novas mensagens, marcaÃ§Ãµes manuais, arquivadas, marcaÃ§Ãµes manuais em arquivadas e varredura ao abrir/recarregar geram toast.

## 1.2.11 â€” 2026-09-27

- Toda conversa em estado **nÃ£o lido** passa a ser elegÃ­vel para toast, independentemente da origem do estado.
- Mensagem realmente recebida agora gera toast.
- Conversa marcada manualmente como nÃ£o lida gera toast.
- Mensagem nova em conversa arquivada gera toast.
- Conversa arquivada marcada manualmente como nÃ£o lida gera toast.
- Ao abrir/recarregar o WhatsApp Web, as conversas nÃ£o lidas jÃ¡ existentes tambÃ©m geram toast.
- A varredura inicial de conversas normais deixa de ignorar pendÃªncias anteriores ao carregamento.
- A varredura inicial de Arquivadas tenta gerar toast por conversa; quando a lista nÃ£o pode ser materializada, mantÃ©m fallback por resumo.
- A deduplicaÃ§Ã£o de inicializaÃ§Ã£o inclui um token da sessÃ£o, permitindo que uma conversa ainda nÃ£o lida volte a avisar apÃ³s recarregar a pÃ¡gina sem repetir continuamente na mesma sessÃ£o.
- Adicionada detecÃ§Ã£o semÃ¢ntica de `Marcar como lida / Mark as read` e fallback visual para o ponto verde de conversa nÃ£o lida.
- Quando a pasta Arquivadas estÃ¡ aberta, as linhas sÃ£o tratadas explicitamente como arquivadas, inclusive para marcaÃ§Ãµes manuais como nÃ£o lidas.

## 1.2.10 â€” 2026-09-27

- Corrige falso contador como `9411 mensagens nÃ£o lidas` em conversas arquivadas.
- O parser nÃ£o extrai mais nÃºmeros genÃ©ricos prÃ³ximos ao item Arquivadas.
- HorÃ¡rios como `9:41` sÃ£o ignorados na leitura de badges.
- Contadores sÃ³ sÃ£o aceitos quando sÃ£o badges numÃ©ricos compactos ou estÃ£o semanticamente associados a `nÃ£o lida/unread`.
- O toast de conversa arquivada deixa de exibir contagem de mensagens quando o valor nÃ£o Ã© necessÃ¡rio, evitando informaÃ§Ã£o enganosa.

## 1.2.9
- Corrige a inicializaÃ§Ã£o das conversas arquivadas jÃ¡ nÃ£o lidas.
- A detecÃ§Ã£o inicial de arquivadas agora possui estado prÃ³prio e nÃ£o depende do primeiro `scan()` geral.
- Aguarda atÃ© 20 segundos pela montagem progressiva da interface do WhatsApp Web.
- Se o contador de Arquivadas nÃ£o estiver acessÃ­vel, abre a pasta silenciosamente, contabiliza conversas nÃ£o lidas e retorna Ã  tela anterior.
- Evita perder o toast inicial quando `archiveUnread` ainda Ã© `null` nos primeiros segundos de carregamento.

## 1.2.8 - 2026-09-27
- Conversas arquivadas que jÃ¡ estavam nÃ£o lidas agora geram um toast-resumo ao abrir ou recarregar o WhatsApp Web.
- O primeiro scan nÃ£o ignora mais silenciosamente o contador inicial de Arquivadas.
- O alerta inicial recebe um token por sessÃ£o para aparecer uma vez por carregamento, sem repetir durante a mesma sessÃ£o.

# CHANGELOG

## 1.2.7
- Corrigida a detecÃ§Ã£o de mensagens arquivadas enquanto a aba do WhatsApp Web estÃ¡ em segundo plano.
- Adicionada verificaÃ§Ã£o silenciosa da pasta **Arquivadas**: a extensÃ£o abre a pasta somente quando o WhatsApp estÃ¡ oculto, lÃª as conversas nÃ£o lidas e retorna automaticamente Ã  tela anterior.
- A verificaÃ§Ã£o identifica conversa, prÃ©via, horÃ¡rio e aumento de nÃ£o lidas quando esses dados estÃ£o disponÃ­veis.
- Adicionado `chrome.alarms` como redundÃ¢ncia de 30 segundos para contornar o throttling de timers em abas ocultas.
- Mantido o polling local de 5 segundos para resposta rÃ¡pida quando o Chrome ainda permite execuÃ§Ã£o normal em segundo plano.
- Alertas genÃ©ricos pelo contador de arquivadas foram limitados Ã  aba visÃ­vel para evitar duplicidade com a leitura silenciosa da pasta.

## 1.2.6
- Corrigida a detecÃ§Ã£o do contador de conversas arquivadas no layout atual do WhatsApp Web.
- O detector agora procura o contador em atributos acessÃ­veis, elementos irmÃ£os e alinhamento visual do item â€œArquivadasâ€.
- Corrigida a deduplicaÃ§Ã£o de alertas arquivados para nÃ£o bloquear eventos futuros.
- Adicionado fallback pelo contador global de nÃ£o lidas quando nÃ£o hÃ¡ mudanÃ§a detectÃ¡vel em conversa normal.

# Changelog

## 1.2.5
- Corrigido o toast em abas diferentes do WhatsApp Web.
- O background agora injeta `content-ui.css` e `content-ui.js` sob demanda na aba ativa quando ela ainda nÃ£o possui o mÃ³dulo visual.
- Adicionada a permissÃ£o `scripting` necessÃ¡ria para a injeÃ§Ã£o segura via Manifest V3.
- O envio do toast agora tenta novamente apÃ³s a injeÃ§Ã£o, evitando falhas silenciosas em abas que jÃ¡ estavam abertas antes de instalar/recarregar a extensÃ£o.

## 1.2.4
- Corrige `TypeError: Cannot read properties of null (reading 'type')` na tela de configuraÃ§Ãµes.
- `options.js` agora ignora com seguranÃ§a configuraÃ§Ãµes sem elemento editÃ¡vel correspondente no `options.html`.
- A duraÃ§Ã£o do toast continua fixa em 10 segundos e Ã© persistida explicitamente, sem depender de um campo inexistente.
- Removida a dependÃªncia do acesso implÃ­cito ao elemento global `saved`; o elemento agora Ã© obtido com `getElementById`.
- Mantidas todas as funcionalidades da v1.2.3.

## 1.2.3
- ProteÃ§Ã£o contra `Extension context invalidated` apÃ³s recarregar/atualizar a extensÃ£o.
- Chamadas de `chrome.runtime.sendMessage` dos content scripts agora validam o contexto e consomem `runtime.lastError`.
- Mantidos TOAST de 10 segundos e deduplicaÃ§Ã£o de mensagens.

## 1.2.2
- Corrige erro do popup causado pelo conflito entre o id `status` e `window.status`.
- Passa a buscar explicitamente os elementos do popup com `getElementById`.
- Ignora mensagens nulas ou invÃ¡lidas nos listeners da extensÃ£o.
- MantÃ©m TOAST de 10 segundos e deduplicaÃ§Ã£o da mesma mensagem.

## 1.2.1
- A mesma mensagem nÃ£o Ã© mais notificada novamente.
- DeduplicaÃ§Ã£o em duas camadas: aba do WhatsApp Web + background da extensÃ£o.
- ImpressÃ£o digital da mensagem considera conversa, prÃ©via e horÃ¡rio exibido.
- HistÃ³rico recente de mensagens notificadas Ã© preservado por atÃ© 24 horas no armazenamento local da extensÃ£o.
- Mantido TOAST de 10 segundos e fallback nativo do Chrome desativado por padrÃ£o.

## 1.2.0

- alerta alterado para toast no canto superior direito;
- duraÃ§Ã£o fixa de 10 segundos;
- exibiÃ§Ã£o de conversa/remetente, prÃ©via, horÃ¡rio e tipo da mensagem;
- indicador de mensagens nÃ£o lidas quando disponÃ­vel;
- deduplicaÃ§Ã£o reforÃ§ada por 10 segundos para evitar alertas repetidos;
- fluxo interno padronizado em portuguÃªs.


Todas as alteraÃ§Ãµes relevantes do projeto devem ser registradas neste arquivo.

## 1.1.0 â€” 2026-09-25

### DocumentaÃ§Ã£o e profissionalizaÃ§Ã£o

- adicionado `AGENTS.md` com regras completas de arquitetura e manutenÃ§Ã£o;
- adicionado `MANUAL_USUARIO.md` com instalaÃ§Ã£o, uso, permissÃµes, testes e soluÃ§Ã£o de problemas;
- adicionado `README.md` profissional;
- adicionado `PRIVACIDADE.md`;
- documentada a estratÃ©gia para conversas arquivadas;
- documentadas permissÃµes e limitaÃ§Ãµes do Chrome/WhatsApp Web;
- definido checklist obrigatÃ³rio de testes e entrega;
- definido padrÃ£o de versionamento semÃ¢ntico;
- pacote preparado para evoluÃ§Ã£o futura sem acumular versÃµes antigas no ZIP.

## 1.0.0 â€” 2026-09-25

### Inicial

- monitoramento do WhatsApp Web;
- toast na aba ativa;
- alerta de conversas normais;
- monitoramento do contador de arquivadas;
- prÃ©via opcional;
- som opcional;
- botÃ£o para abrir WhatsApp;
- notificaÃ§Ã£o de sistema como fallback;
- painel de configuraÃ§Ãµes.

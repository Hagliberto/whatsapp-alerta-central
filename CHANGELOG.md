## 1.2.13 — 2026-09-27

### Toast profissional e limpeza de textos técnicos

- impede que identificadores internos do WhatsApp, como `ic-archive`, apareçam como nome da conversa;
- prioriza títulos humanos e ignora labels técnicos de ícones/componentes;
- traduz e padroniza todo o texto exibido pelo toast em português;
- novo layout mais robusto, com cabeçalho, hierarquia visual, chips de contexto e rodapé de ação;
- diferencia visualmente `Nova mensagem`, `Marcada como não lida`, `Pendente ao abrir` e `Conversa arquivada`;
- quando a prévia não é confiável, usa uma mensagem descritiva em português em vez de texto técnico;
- mantém duração de 10 segundos e todas as regras de detecção da v1.2.12.

# Changelog

## 1.2.12 — 2026-09-27

- Refina a detecção de não lidos usando primeiro os nomes acessíveis observados no WhatsApp Web, como `Não lidas` e `1 mensagem não lida`.
- Separa explicitamente três fontes de estado não lido: acessibilidade, badge numérico e ponto verde.
- Badges numéricos só são aceitos quando são compactos e ficam na região direita da linha da conversa.
- Horários (`12:15`, `2:40 AM`), datas e outros números de conteúdo são rejeitados antes de qualquer interpretação como contador.
- O contador de **Arquivadas** passa a ser lido somente de um badge compacto alinhado horizontalmente ao rótulo `Arquivadas`, evitando varredura numérica ampla do container.
- Quando a quantidade não é confiável (por exemplo, somente ponto verde), a conversa continua sendo considerada não lida, mas sem inventar uma contagem.
- Mantidas as cinco regras da v1.2.11: novas mensagens, marcações manuais, arquivadas, marcações manuais em arquivadas e varredura ao abrir/recarregar geram toast.

## 1.2.11 — 2026-09-27

- Toda conversa em estado **não lido** passa a ser elegível para toast, independentemente da origem do estado.
- Mensagem realmente recebida agora gera toast.
- Conversa marcada manualmente como não lida gera toast.
- Mensagem nova em conversa arquivada gera toast.
- Conversa arquivada marcada manualmente como não lida gera toast.
- Ao abrir/recarregar o WhatsApp Web, as conversas não lidas já existentes também geram toast.
- A varredura inicial de conversas normais deixa de ignorar pendências anteriores ao carregamento.
- A varredura inicial de Arquivadas tenta gerar toast por conversa; quando a lista não pode ser materializada, mantém fallback por resumo.
- A deduplicação de inicialização inclui um token da sessão, permitindo que uma conversa ainda não lida volte a avisar após recarregar a página sem repetir continuamente na mesma sessão.
- Adicionada detecção semântica de `Marcar como lida / Mark as read` e fallback visual para o ponto verde de conversa não lida.
- Quando a pasta Arquivadas está aberta, as linhas são tratadas explicitamente como arquivadas, inclusive para marcações manuais como não lidas.

## 1.2.10 — 2026-09-27

- Corrige falso contador como `9411 mensagens não lidas` em conversas arquivadas.
- O parser não extrai mais números genéricos próximos ao item Arquivadas.
- Horários como `9:41` são ignorados na leitura de badges.
- Contadores só são aceitos quando são badges numéricos compactos ou estão semanticamente associados a `não lida/unread`.
- O toast de conversa arquivada deixa de exibir contagem de mensagens quando o valor não é necessário, evitando informação enganosa.

## 1.2.9
- Corrige a inicialização das conversas arquivadas já não lidas.
- A detecção inicial de arquivadas agora possui estado próprio e não depende do primeiro `scan()` geral.
- Aguarda até 20 segundos pela montagem progressiva da interface do WhatsApp Web.
- Se o contador de Arquivadas não estiver acessível, abre a pasta silenciosamente, contabiliza conversas não lidas e retorna à tela anterior.
- Evita perder o toast inicial quando `archiveUnread` ainda é `null` nos primeiros segundos de carregamento.

## 1.2.8 - 2026-09-27
- Conversas arquivadas que já estavam não lidas agora geram um toast-resumo ao abrir ou recarregar o WhatsApp Web.
- O primeiro scan não ignora mais silenciosamente o contador inicial de Arquivadas.
- O alerta inicial recebe um token por sessão para aparecer uma vez por carregamento, sem repetir durante a mesma sessão.

# CHANGELOG

## 1.2.7
- Corrigida a detecção de mensagens arquivadas enquanto a aba do WhatsApp Web está em segundo plano.
- Adicionada verificação silenciosa da pasta **Arquivadas**: a extensão abre a pasta somente quando o WhatsApp está oculto, lê as conversas não lidas e retorna automaticamente à tela anterior.
- A verificação identifica conversa, prévia, horário e aumento de não lidas quando esses dados estão disponíveis.
- Adicionado `chrome.alarms` como redundância de 30 segundos para contornar o throttling de timers em abas ocultas.
- Mantido o polling local de 5 segundos para resposta rápida quando o Chrome ainda permite execução normal em segundo plano.
- Alertas genéricos pelo contador de arquivadas foram limitados à aba visível para evitar duplicidade com a leitura silenciosa da pasta.

## 1.2.6
- Corrigida a detecção do contador de conversas arquivadas no layout atual do WhatsApp Web.
- O detector agora procura o contador em atributos acessíveis, elementos irmãos e alinhamento visual do item “Arquivadas”.
- Corrigida a deduplicação de alertas arquivados para não bloquear eventos futuros.
- Adicionado fallback pelo contador global de não lidas quando não há mudança detectável em conversa normal.

# Changelog

## 1.2.5
- Corrigido o toast em abas diferentes do WhatsApp Web.
- O background agora injeta `content-ui.css` e `content-ui.js` sob demanda na aba ativa quando ela ainda não possui o módulo visual.
- Adicionada a permissão `scripting` necessária para a injeção segura via Manifest V3.
- O envio do toast agora tenta novamente após a injeção, evitando falhas silenciosas em abas que já estavam abertas antes de instalar/recarregar a extensão.

## 1.2.4
- Corrige `TypeError: Cannot read properties of null (reading 'type')` na tela de configurações.
- `options.js` agora ignora com segurança configurações sem elemento editável correspondente no `options.html`.
- A duração do toast continua fixa em 10 segundos e é persistida explicitamente, sem depender de um campo inexistente.
- Removida a dependência do acesso implícito ao elemento global `saved`; o elemento agora é obtido com `getElementById`.
- Mantidas todas as funcionalidades da v1.2.3.

## 1.2.3
- Proteção contra `Extension context invalidated` após recarregar/atualizar a extensão.
- Chamadas de `chrome.runtime.sendMessage` dos content scripts agora validam o contexto e consomem `runtime.lastError`.
- Mantidos TOAST de 10 segundos e deduplicação de mensagens.

## 1.2.2
- Corrige erro do popup causado pelo conflito entre o id `status` e `window.status`.
- Passa a buscar explicitamente os elementos do popup com `getElementById`.
- Ignora mensagens nulas ou inválidas nos listeners da extensão.
- Mantém TOAST de 10 segundos e deduplicação da mesma mensagem.

## 1.2.1
- A mesma mensagem não é mais notificada novamente.
- Deduplicação em duas camadas: aba do WhatsApp Web + background da extensão.
- Impressão digital da mensagem considera conversa, prévia e horário exibido.
- Histórico recente de mensagens notificadas é preservado por até 24 horas no armazenamento local da extensão.
- Mantido TOAST de 10 segundos e fallback nativo do Chrome desativado por padrão.

## 1.2.0

- alerta alterado para toast no canto superior direito;
- duração fixa de 10 segundos;
- exibição de conversa/remetente, prévia, horário e tipo da mensagem;
- indicador de mensagens não lidas quando disponível;
- deduplicação reforçada por 10 segundos para evitar alertas repetidos;
- fluxo interno padronizado em português.


Todas as alterações relevantes do projeto devem ser registradas neste arquivo.

## 1.1.0 — 2026-09-25

### Documentação e profissionalização

- adicionado `AGENTS.md` com regras completas de arquitetura e manutenção;
- adicionado `MANUAL_USUARIO.md` com instalação, uso, permissões, testes e solução de problemas;
- adicionado `README.md` profissional;
- adicionado `PRIVACIDADE.md`;
- documentada a estratégia para conversas arquivadas;
- documentadas permissões e limitações do Chrome/WhatsApp Web;
- definido checklist obrigatório de testes e entrega;
- definido padrão de versionamento semântico;
- pacote preparado para evolução futura sem acumular versões antigas no ZIP.

## 1.0.0 — 2026-09-25

### Inicial

- monitoramento do WhatsApp Web;
- toast na aba ativa;
- alerta de conversas normais;
- monitoramento do contador de arquivadas;
- prévia opcional;
- som opcional;
- botão para abrir WhatsApp;
- notificação de sistema como fallback;
- painel de configurações.

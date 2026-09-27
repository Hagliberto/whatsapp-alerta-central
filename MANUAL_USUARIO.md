# Manual do Usuário — WhatsApp Alerta Central

**Versão:** 1.1.0  
**Plataforma:** Google Chrome / navegadores Chromium compatíveis  
**Tipo:** Extensão local para WhatsApp Web

---

## 1. Apresentação

O **WhatsApp Alerta Central** foi criado para destacar a chegada de novas mensagens do WhatsApp Web enquanto você trabalha em outras páginas do navegador.

Em vez de depender apenas da pequena notificação padrão do navegador, a extensão exibe um aviso central e visível na aba que estiver em uso.

Ela também pode observar alterações no indicador de mensagens não lidas da área **Arquivadas** do WhatsApp Web.

Toda a operação da extensão é realizada localmente no navegador.

---

## 2. Principais recursos

- Toast para nova mensagem.
- Exibição do nome da conversa quando disponível.
- Prévia do texto da mensagem quando disponível e permitida nas configurações.
- Botão para abrir ou focar o WhatsApp Web.
- Aviso para novas mensagens em conversas arquivadas.
- Sinal sonoro opcional.
- Tempo de permanência configurável.
- Notificação do sistema como alternativa em páginas onde o Chrome não permite sobreposição.
- Preferências armazenadas localmente pelo Chrome.
- Nenhum servidor externo da extensão.

---

## 3. Requisitos

Para utilizar a extensão é necessário:

- Google Chrome atualizado ou navegador Chromium compatível;
- acesso ao WhatsApp Web;
- sessão do WhatsApp Web conectada;
- manter uma aba do WhatsApp Web aberta para a detecção baseada na página.

Endereço utilizado pelo WhatsApp Web:

`https://web.whatsapp.com/`

---

## 4. Instalação

### 4.1. Extrair o pacote

1. Localize o arquivo ZIP recebido.
2. Clique com o botão direito.
3. Escolha **Extrair tudo**.
4. Mantenha a pasta extraída em um local fixo do computador.

> Não apague nem mova a pasta depois de carregar a extensão no Chrome. O Chrome utiliza os arquivos diretamente dessa pasta quando a instalação é feita pelo modo do desenvolvedor.

### 4.2. Abrir a área de extensões

No Chrome, digite na barra de endereços:

`chrome://extensions`

Pressione **Enter**.

### 4.3. Ativar modo do desenvolvedor

No canto superior direito da página de extensões, ative:

**Modo do desenvolvedor**

### 4.4. Carregar a extensão

1. Clique em **Carregar sem compactação**.
2. Selecione a pasta extraída da extensão.
3. Confirme.

O Chrome deverá mostrar a extensão com o nome:

**WhatsApp Alerta Central**

---

## 5. Primeiro uso

1. Abra `https://web.whatsapp.com/`.
2. Faça login usando o QR Code, caso ainda não esteja conectado.
3. Aguarde o WhatsApp carregar completamente.
4. Abra outra aba comum do navegador.
5. Peça para outra pessoa enviar uma mensagem para sua conta.

Quando a mensagem for detectada, deverá aparecer um toast no centro da aba ativa.

---

## 6. Funcionamento do alerta

O alerta pode mostrar:

- indicação de nova mensagem;
- nome da conversa ou remetente, quando disponível;
- prévia da mensagem, quando disponível;
- indicação de que a origem é uma conversa arquivada;
- botão para abrir o WhatsApp;
- botão de fechamento.

A exibição é temporária e desaparece automaticamente de acordo com o tempo configurado.

---

## 7. Conversas arquivadas

O WhatsApp Web possui comportamento próprio para chats arquivados.

Quando uma nova mensagem chega em uma conversa arquivada e o WhatsApp mantém essa conversa dentro de **Arquivadas**, nem sempre os dados completos do remetente e do texto ficam disponíveis na tela principal.

A extensão observa o indicador de mensagens não lidas da seção **Arquivadas**.

### Possíveis resultados

#### Quando o WhatsApp expõe as informações

A extensão poderá mostrar o nome e outros dados disponíveis.

#### Quando o WhatsApp não expõe as informações

O aviso poderá ser apresentado como:

**Conversa arquivada**  
**Chegou uma nova mensagem em uma conversa arquivada.**

Isso é intencional. A extensão não inventa informações e não força a abertura da conversa para obter dados privados.

---

## 8. Configurações

Clique no ícone da extensão na barra do Chrome para acessar os controles.

A página de configurações permite ajustar os recursos disponíveis.

### 8.1. Ativar alertas

Controla o funcionamento geral dos avisos.

Desativado: nenhuma nova mensagem gera toast da extensão.

### 8.2. Avisar conversas arquivadas

Ativa ou desativa a observação do contador da seção **Arquivadas**.

### 8.3. Som

Define se o toast deve reproduzir um sinal sonoro. O Chrome libera o áudio após uma interação com a página (clique, toque ou tecla). Se um alerta chegar antes dessa interação, o som fica aguardando e toca quando você interagir com a página.

### 8.4. Mostrar prévia

Quando desativado, o conteúdo textual da mensagem não é exibido no toast.

Essa opção é útil para ambientes compartilhados ou telas visíveis para outras pessoas.

### 8.5. Tempo do toast

Define por quanto tempo o alerta permanece visível antes de desaparecer automaticamente.

### 8.6. Notificação de sistema

Pode ser utilizada como fallback quando a aba ativa não aceita a interface visual da extensão.

Exemplo de páginas restritas:

- `chrome://extensions`;
- `chrome://settings`;
- Chrome Web Store;
- algumas páginas internas protegidas do navegador.

---

## 9. Permissões utilizadas

### `storage`

Usada para salvar as configurações da extensão no Chrome.

### `tabs`

Usada para identificar a aba ativa e localizar/abrir a aba do WhatsApp Web.

### `notifications`

Usada para mostrar uma notificação do sistema quando o toast não puder ser exibido.

### Acesso a `web.whatsapp.com`

Necessário para observar a interface do WhatsApp Web e identificar alterações relacionadas a mensagens não lidas.

### Acesso a páginas HTTP/HTTPS

Necessário porque o toast deve poder aparecer na página que estiver ativa enquanto o usuário navega.

A extensão não envia o conteúdo dessas páginas para servidores externos.

---

## 10. Privacidade

O projeto foi desenhado para funcionar localmente.

A extensão não necessita de:

- cadastro;
- conta própria;
- servidor externo;
- banco de dados remoto;
- API de terceiros;
- analytics externo.

As configurações são armazenadas pelo mecanismo `chrome.storage` do navegador.

A extensão não foi desenvolvida para armazenar histórico de mensagens.

Leia também o arquivo `PRIVACIDADE.md` incluído no pacote.

---

## 11. Teste recomendado

Realize os testes abaixo após instalar ou atualizar a extensão.

### Teste 1 — Conversa normal

1. Abra o WhatsApp Web.
2. Vá para outro site.
3. Receba uma mensagem.
4. Confira se o toast aparece.

### Teste 2 — Conversa arquivada

1. Arquive uma conversa.
2. Certifique-se de que a opção de alertas para arquivadas está ativa.
3. Receba uma mensagem nessa conversa.
4. Observe se a extensão informa a nova mensagem arquivada.

### Teste 3 — Abrir WhatsApp

1. Receba um alerta.
2. Clique em **Abrir WhatsApp**.
3. A aba do WhatsApp deve ser aberta ou trazida para frente.

### Teste 4 — Privacidade da prévia

1. Desative **Mostrar prévia**.
2. Receba outra mensagem.
3. Confirme que o texto da mensagem não aparece no toast.

---

## 12. Solução de problemas

### O toast não aparece

Verifique:

1. se a extensão está ativa em `chrome://extensions`;
2. se o WhatsApp Web está aberto em alguma aba;
3. se o WhatsApp Web terminou de carregar;
4. se a opção de alertas está habilitada;
5. se a página atual é uma página interna do Chrome;
6. se houve alguma atualização recente na interface do WhatsApp Web.

Depois, recarregue:

- a extensão, pelo botão **Atualizar** em `chrome://extensions`;
- a página do WhatsApp Web.

### A mensagem arquivada gera alerta genérico

Esse comportamento pode ser normal.

O WhatsApp Web nem sempre mostra na tela principal qual conversa arquivada recebeu a mensagem. A extensão utiliza apenas as informações que o WhatsApp disponibiliza na própria interface.

### O alerta aparece duplicado

Recarregue a extensão e o WhatsApp Web. Se persistir, registre:

- se a conversa era normal ou arquivada;
- se o WhatsApp estava em primeiro plano;
- quantos alertas apareceram;
- se foram recebidas várias mensagens em sequência.

### O Chrome mostra erro ao carregar a extensão

Abra `chrome://extensions` e clique no botão **Erros** da extensão.

Copie a mensagem apresentada. Ela permitirá identificar o arquivo e a linha que precisam de correção.

---

## 13. Atualização da extensão

Quando receber uma nova versão completa:

1. feche ou remova a pasta antiga apenas depois de guardar suas configurações necessárias;
2. extraia a nova versão em pasta própria;
3. abra `chrome://extensions`;
4. remova a versão anterior ou utilize a nova pasta conforme orientação da versão;
5. carregue a nova pasta em **Carregar sem compactação**;
6. abra novamente o WhatsApp Web;
7. faça os testes básicos descritos neste manual.

---

## 14. Limitações conhecidas

O WhatsApp Web é uma aplicação de terceiros e sua estrutura pode mudar sem aviso.

Por isso:

- uma atualização do WhatsApp pode exigir atualização dos seletores da extensão;
- conversas arquivadas podem disponibilizar apenas o contador de não lidas;
- páginas internas do Chrome não permitem que extensões comuns injetem o toast;
- a detecção depende de uma aba do WhatsApp Web aberta e carregada;
- a extensão não substitui a notificação oficial do WhatsApp.

---

## 15. Uso responsável

O WhatsApp Alerta Central foi projetado como ferramenta pessoal de aviso visual.

Ele não deve ser utilizado para:

- capturar mensagens de terceiros sem autorização;
- contornar controles de acesso;
- automatizar envio em massa;
- extrair histórico oculto;
- obter credenciais ou tokens;
- interferir na segurança do WhatsApp.

---

## 16. Resumo rápido

Para usar diariamente:

1. deixe o Chrome aberto;
2. mantenha uma aba do WhatsApp Web conectada;
3. navegue normalmente;
4. ao receber mensagem, observe o toast;
5. clique em **Abrir WhatsApp** quando desejar responder.



## Atualização 1.2.6
O toast global usa injeção sob demanda pelo service worker para aparecer na aba web ativa, inclusive em abas abertas antes da instalação ou do recarregamento da extensão. Páginas internas do Chrome (`chrome://`) e a Chrome Web Store continuam protegidas pelo navegador e não aceitam injeção de conteúdo.


## Detecção de arquivadas em segundo plano — v1.2.7
Quando o WhatsApp Web está em outra aba, o aplicativo pode não atualizar o contador de **Arquivadas** no DOM principal. A extensão realiza uma leitura silenciosa periódica da pasta Arquivadas enquanto a aba está oculta e retorna automaticamente à tela anterior. Existe ainda um alarme de redundância do Manifest V3 para reduzir falhas causadas por throttling do Chrome.


## Atualização 1.2.9
Ao abrir ou recarregar o WhatsApp Web, se já existirem conversas arquivadas não lidas, a extensão exibe um toast-resumo imediatamente. Esse aviso inicial ocorre uma vez por carregamento da página e não depende de abrir manualmente a pasta Arquivadas.


## Contadores de arquivadas
A partir da v1.2.10, números de horários (ex.: `9:41`) e outros números da interface são ignorados. O toast não deve exibir contagens impossíveis derivadas do conteúdo visual do WhatsApp.
## O que gera toast

A partir da versão 1.2.11, o critério é o **estado não lido**. Gera toast quando:

1. uma mensagem nova chega;
2. uma conversa é marcada manualmente como não lida;
3. uma mensagem nova chega em conversa arquivada;
4. uma conversa arquivada é marcada manualmente como não lida;
5. o WhatsApp Web é aberto ou recarregado e já existem conversas não lidas normais ou arquivadas.

Ao recarregar a página, uma pendência que continua não lida pode avisar novamente. Durante a mesma sessão, a deduplicação evita repetição contínua do mesmo item.


## Detecção refinada 1.2.13

- Priorize `aria-label`/nome acessível para identificar `Não lidas` e contagens explícitas.
- Trate badge numérico, ponto verde e semântica acessível como sinais distintos.
- Nunca converta horários, datas, IDs ou números de conteúdo em contadores de não lidas.
- Para `Arquivadas`, aceite apenas badge numérico compacto alinhado à direita do rótulo.
- Se houver estado não lido sem quantidade confiável, notifique sem fabricar uma contagem.

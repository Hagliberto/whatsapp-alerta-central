# Privacidade — WhatsApp Alerta Central

## Princípio

O WhatsApp Alerta Central foi projetado para operar localmente no navegador do usuário.

**Autor e desenvolvedor:** Hagliberto Alves de Oliveira.

## Dados processados

Durante seu funcionamento, a extensão pode processar temporariamente informações visíveis na interface do WhatsApp Web, como:

- nome da conversa;
- indicação de não lida;
- prévia textual disponível;
- contador de conversas arquivadas não lidas.

Esses dados são utilizados exclusivamente para construir o alerta visual.

## Armazenamento

A extensão armazena configurações do usuário através de `chrome.storage`.

O projeto não foi desenvolvido para manter histórico permanente de mensagens.

## Transmissão externa

Esta versão não contém backend, endpoint de telemetria, analytics ou integração externa destinada a receber conteúdo de mensagens.

## Permissões

As permissões declaradas no Manifest são utilizadas para:

- salvar preferências;
- identificar/focar abas;
- exibir notificações do sistema;
- monitorar o WhatsApp Web;
- mostrar o popup na aba HTTP/HTTPS ativa.

## Compromissos de manutenção

Futuras versões não devem adicionar coleta ou transmissão externa de conteúdo de mensagens sem alteração explícita da documentação e ciência do usuário.

## Lembretes pendentes — v1.3.x e v1.4.x

Para permitir reavisos mesmo quando o service worker do Chrome é suspenso, a extensão mantém localmente apenas metadados mínimos da pendência (identificação da conversa, horário/contagem quando disponíveis, estado de adiamento/silenciamento e uma assinatura numérica de deduplicação).

O texto/prévia da mensagem **não é persistido** no armazenamento da extensão. Em um reaviso posterior, quando o conteúdo original já não estiver em memória, o toast pode exibir uma descrição genérica da pendência.


## Recursos locais — v1.4.0

A Central de pendências, o badge, o horário de silêncio, as regras por conversa e o diagnóstico funcionam localmente.

As regras podem armazenar o nome da conversa informado pelo próprio usuário e preferências como intervalo de reaviso ou autorização durante o silêncio. O diagnóstico mantém apenas horários e estados técnicos, como última varredura e último evento detectado.

O texto/prévia das mensagens continua sem ser persistido para a Central de pendências ou para o diagnóstico.

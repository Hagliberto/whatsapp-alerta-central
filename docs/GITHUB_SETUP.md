# Configuração Recomendada no GitHub

## Repositório

**Nome sugerido:** `whatsapp-alerta-central`

**Descrição sugerida:**

> Extensão Chrome Manifest V3 para alertas profissionais de conversas e mensagens não lidas no WhatsApp Web, inclusive Arquivadas.

## Visibilidade

Escolha conforme a finalidade:

- **Private**: recomendado enquanto o projeto ainda é de uso interno ou está em evolução frequente;
- **Public**: adequado se a intenção for disponibilizar o código publicamente. Observe que `LICENSE.md` não concede licença de código aberto.

## Topics sugeridos

```text
chrome-extension
manifest-v3
whatsapp-web
notifications
browser-extension
javascript
productivity
```

## Branch padrão

Use `main`.

## Proteção de branch recomendada

Para `main`:

- exigir Pull Request antes de merge;
- exigir status check `Validate Extension`;
- impedir force-push;
- impedir exclusão da branch;
- exigir que a branch esteja atualizada antes do merge quando houver colaboração de várias pessoas.

Para projeto individual, Pull Request obrigatório pode ser flexibilizado, mas o check automatizado deve continuar ativo.

## Releases

Use tags como:

```text
v1.2.13
v1.2.14
v1.3.0
```

O ZIP completo da extensão deve ser anexado ao **GitHub Release**, e não commitado no repositório.

## About / Website

Não definir website até existir uma página oficial do projeto.

## Issues

O repositório inclui templates para:

- bugs;
- melhorias.

Issues em branco ficam desabilitadas para manter relatos estruturados.

## Segurança e privacidade

Nunca publicar em issues:

- nomes/telefones de contatos reais;
- conteúdo de mensagens;
- cookies;
- tokens;
- dados de sessão;
- screenshots não anonimizadas.

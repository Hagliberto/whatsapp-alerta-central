# Plano de Testes

## Validação automatizada

Execute:

```bash
npm run validate
```

O script verifica:

- JSON válido no `manifest.json`;
- versão do manifest;
- presença dos arquivos obrigatórios;
- sintaxe JavaScript;
- referências básicas do Manifest V3.

## Testes manuais obrigatórios

### Conversa normal

- [ ] nova mensagem gera toast;
- [ ] mensagem marcada manualmente como não lida gera toast;
- [ ] toast aparece na aba web ativa;
- [ ] botão **Abrir conversa** funciona.

### Arquivadas

- [ ] nova mensagem arquivada gera toast;
- [ ] arquivada marcada como não lida gera toast;
- [ ] contador de Arquivadas não confunde horário com número;
- [ ] conversa arquivada pendente ao abrir o WhatsApp gera toast.

### Inicialização

- [ ] recarregar o WhatsApp com item não lido gera toast;
- [ ] a mesma sessão não entra em loop de repetição;
- [ ] recarregar de verdade permite novo aviso do estado ainda não lido.

### Interface

- [ ] não aparecem identificadores técnicos como `ic-archive`;
- [ ] português consistente;
- [ ] toast fecha corretamente;
- [ ] layout não quebra em resoluções menores.

### Fallback

- [ ] páginas `chrome://` não causam exceção;
- [ ] ausência de permissão de injeção não quebra o service worker.

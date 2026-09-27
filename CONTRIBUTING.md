# Contribuindo

Obrigado pelo interesse em melhorar o WhatsApp Alerta Central.

## Antes de começar

1. Leia `AGENTS.md`.
2. Leia `docs/ARCHITECTURE.md` e `docs/TESTING.md`.
3. Evite alterações que dependam exclusivamente de classes CSS efêmeras do WhatsApp Web.
4. Não inclua dados pessoais, números de telefone, nomes de contatos reais ou mensagens privadas em commits, issues, testes ou screenshots.

## Fluxo recomendado

1. Crie uma branch a partir de `main`.
2. Faça uma mudança pequena e focada.
3. Atualize a documentação quando houver mudança de comportamento.
4. Atualize `CHANGELOG.md` quando aplicável.
5. Execute:

```bash
npm run validate
```

6. Teste manualmente no Chrome.
7. Abra um Pull Request usando o template do repositório.

## Padrão de commits

Prefira mensagens curtas e objetivas, por exemplo:

```text
fix: corrige leitura do badge de arquivadas
feat: adiciona toast para não lidas ao recarregar
refactor: separa parser de estado não lido
 docs: atualiza manual de instalação
```

## Política de entrega

Cada release deve conter uma cópia completa e limpa da versão atual. Não inclua versões antigas, backups, arquivos `-old`, `-bak`, `copy`, `final2` ou similares dentro do pacote de release.

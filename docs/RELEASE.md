# Processo de Release

## 1. Atualizar versão

Atualize a versão em `manifest.json` seguindo `MAJOR.MINOR.PATCH`.

## 2. Atualizar documentação

- `CHANGELOG.md`;
- `README.md` se houver mudança funcional relevante;
- `MANUAL_USUARIO.md` quando o comportamento do usuário mudar.

## 3. Validar

```bash
npm run validate
```

Depois execute o checklist manual de `docs/TESTING.md`.

## 4. Commit e tag

Exemplo:

```bash
git add .
git commit -m "release: v1.2.13"
git tag -a v1.2.13 -m "WhatsApp Alerta Central v1.2.13"
git push origin main --tags
```

## 5. GitHub Release

Crie uma release para a tag e anexe **um único ZIP completo da versão atual**, sem versões antigas ou backups dentro do pacote.

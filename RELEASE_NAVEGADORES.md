# Releases por navegador

As releases oficiais devem oferecer dois arquivos em **Assets**:

- `whatsapp-alerta-central-chrome-edge-vX.Y.Z.zip`
- `whatsapp-alerta-central-firefox-vX.Y.Z.zip`

## Geração local no Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release.ps1
```

Os arquivos serão criados em `dist/`.

## Publicação automática no GitHub

Ao enviar uma tag no formato `vX.Y.Z`, o workflow `.github/workflows/release-browsers.yml`:

1. confere se a tag e os dois manifests usam a mesma versão;
2. valida a sintaxe JavaScript;
3. monta os pacotes separados;
4. cria a GitHub Release se ela ainda não existir;
5. publica os dois ZIPs em **Assets**.

Assim, quem abrir a Release escolhe diretamente **Chrome/Edge** ou **Firefox**.

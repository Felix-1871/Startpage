# Deployment

## Web (startpage)

The `web` service builds from [`Dockerfile`](Dockerfile) and serves static files on port 8080.

```bash
cd deploy
docker compose up --build web
```

## Optional services

- **Lute** — language learning reader on port 5001
- **Anki Desktop** — headless Anki with AnkiConnect on ports 3000/3001

Image tags in [`compose.yaml`](compose.yaml) are pinned where supported (e.g. Lute). Anki Desktop uses `:latest` because its image auto-fetches Anki releases.

## Security notes

### `seccomp=unconfined` on Anki Desktop

The Anki Desktop container uses `security_opt: seccomp=unconfined` because the packaged Anki runtime requires syscalls that the default Docker seccomp profile blocks. This reduces container isolation. Run Anki Desktop only on trusted machines and avoid exposing its ports publicly.

### Anki Desktop image tag

The `chrislongros/anki-desktop` image auto-fetches the latest Anki release and does not reliably support pinned version tags. The compose file uses `:latest` for this service intentionally.

### Discord webhooks

Webhook URLs are stored in browser `localStorage`. Treat the startpage origin as trusted; any script running on the page can read them.

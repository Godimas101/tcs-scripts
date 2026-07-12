# image-prep

Flask-based image composition service that takes a background + foreground pair and produces a centered composite ready for Instagram. Used by the **Social Posts** n8n workflow (`Pe0j6VgJWzvcrLnO`) and referenced by the TEST BED workflow.

## What it does

- Preserves background dimensions verbatim (no resize, no crop).
- Preserves foreground aspect ratio.
- Shrinks the foreground (never enlarges) to fit inside the background with at least 10 px margin on every side.
- Centers the foreground on both axes.
- Emits JPEG quality 90.

## Deployment

Runs as a Docker container `tcs-image-prep` inside the OVH n8n docker-compose network at `/opt/tcs/n8n/docker-compose.yml`. Bound internally to port 3001 only — no public port exposure, only reachable from other services on the same compose network via `http://image-prep:3001`.

See `docker-compose.snippet.yml` for the service block to include in the top-level compose file.

## Updating the deployed service

1. Edit source files here (`app.py`, `Dockerfile`, `requirements.txt`).
2. Commit + push to `tcs-scripts`.
3. SSH to OVH VPS, `cd /opt/tcs/image-prep`, `git pull` (if the deployed copy is git-cloned from this repo) OR `rsync` the updated files across.
4. Rebuild + restart: `sudo docker compose build image-prep && sudo docker compose up -d image-prep`.

**Note:** Currently the VPS copy at `/opt/tcs/image-prep/` is a manual clone dated 2026-05-19. Not automatically synced with this repo. If you want git-based deployment, `git clone` this subdir into `/opt/tcs/image-prep/` on the VPS instead of maintaining a parallel copy.

## Callers

- **`The Canadian Space - Social Posts`** — Instagram composite generation
- **`TEST BED`** — occasional integration testing

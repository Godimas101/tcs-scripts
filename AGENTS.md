# AGENTS.md — tcs-scripts

**Per-workflow Python/JS helpers + the `image-prep/` containerized service, all called by TCS n8n workflows.**

> **First-time context:** start with the top-level [AGENTS.md](../AGENTS.md) in the working directory. This file is repo-specific.

## What lives here

Each subdirectory corresponds to one V3 blog pipeline (or a shared service). Scripts here are called by n8n workflows via the Execute Workflow node or via SSH from a Code node.

| Directory | Purpose |
|---|---|
| `canada-from-orbit/` | CFO-specific article writers, feed helpers |
| `the-daily-broadcast/` | DB V3 scrapers + writers |
| `the-spacex-report/` | SpaceX-specific article scraping + writing |
| `the-commercial-space/` | Commercial Space source-specific helpers (Firefly, Stoked, Relativity, Axiom) |
| `the-nasa-overview/` | NASA-specific writers |
| `rocketlab-roundup/` | Rocket Lab article writers |
| `social-posts/` | Social media utilities (Instagram carousel, X post prep) |
| `llm-usage-tracker/` | Cost aggregation helpers |
| **`image-prep/`** | **Flask image composition service. LIVE. See below.** |
| `write_csa_articles.py`, `write_mls_articles.py` | Direct dependencies of Canada From Orbit V3 |

## image-prep — special notes

`image-prep/` is the source for a **live** Docker container (`tcs-image-prep`) running on OVH at `/opt/tcs/image-prep/`. Called by the Social Posts workflow via `http://image-prep:3001` on the compose network.

**Currently the VPS copy is a manual clone dated 2026-05-19, not auto-synced with this repo.** If you edit files here, you also need to sync to the VPS:

```bash
# Option A: rsync from local
rsync -av tcs-scripts/image-prep/ ubuntu@51.195.43.156:/opt/tcs/image-prep/

# Option B (better long-term): git clone this subdir onto the VPS at /opt/tcs/image-prep/
```

After sync, rebuild + restart:
```bash
ssh -i C:/Users/CHRISC~1/.ssh/ovh_vps ubuntu@51.195.43.156
cd /opt/tcs/n8n
sudo docker compose build image-prep
sudo docker compose up -d image-prep
```

## Working principles

1. **Read the caller before editing.** If you're modifying a script, find which workflow calls it (`grep -r <script_name>` on the tcs-workflows JSON backups) and understand the context.
2. **Preserve function signatures** if callers depend on them. Adding new args with defaults is safe; renaming positional args is not.
3. **Test locally when possible** before deploying. The scripts often depend on paths that only exist on the VPS (`/opt/tcs/n8n/local_files/`).
4. **Update the docs.** If you add a new script or change an interface, update the corresponding workflow doc in `tcs-docs/docs/workflows/`.
5. **Deploy path awareness.** Some scripts run on the VPS (SSH'd from n8n), others run inside n8n Python Code nodes. Which one matters for imports + filesystem paths.

## Related docs

- [Docs site](https://the-canadian-space.github.io/tcs-docs/)
- Top-level [AGENTS.md](../AGENTS.md) for env access

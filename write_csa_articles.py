#!/usr/bin/env python3
"""Write Canadian Space Agency official articles into the scraper run temp dir.

Called from the Write CSA Articles SSH node in the Canada From Orbit V3
workflow. Accepts a base64-encoded JSON payload listing multiple official
CSA articles scraped from asc-csa.gc.ca (the gov site blocks Crawl4AI's
Playwright via WAF; we fetch via plain HTTP in n8n and pass the parsed
markdown here for writing). Writes one markdown file per article into the
run dir, and upserts entries into index.json with the `csa-N` index scheme.

Usage:
    python3 write_csa_articles.py <BASE64_JSON>

Payload shape:
    {
      "run_id": str,
      "articles": [
        {
          "title": str,
          "url": str,
          "date": str,             # optional
          "thumbnail": str,        # optional
          "images": [str, ...],    # optional
          "content": str,          # markdown body
          "word_count": int,       # optional, computed if missing
          "character_count": int,  # optional, computed if missing
        },
        ...
      ]
    }

Emits the updated index.json to stdout.
"""
import base64
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_index import upsert_entries

SCRAPER_RUNS_ROOT = "/opt/tcs/n8n/local_files/scraper-runs"


def _safe_run_id(run_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9_\-]", "_", str(run_id)) or "default"


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing base64 payload arg"}))
        sys.exit(1)

    try:
        payload = json.loads(base64.b64decode(sys.argv[1]).decode("utf-8"))
    except Exception as e:
        print(json.dumps({"error": f"failed to decode payload: {e}"}))
        sys.exit(1)

    run_id = _safe_run_id(payload.get("run_id", "default"))
    articles = payload.get("articles") or []

    run_dir = os.path.join(SCRAPER_RUNS_ROOT, run_id)
    os.makedirs(run_dir, exist_ok=True)

    entries = []
    for i, art in enumerate(articles):
        content = art.get("content") or ""
        if not content:
            continue

        idx = f"csa-{i}"
        article_path = os.path.join(run_dir, f"article-{idx}.md")

        title = art.get("title") or f"Canadian Space Agency Article {i}"
        url = art.get("url") or ""
        date = art.get("date") or ""
        header_lines = [f"# {title}", ""]
        if url:
            header_lines.append(f"**Source:** {url}")
        if date:
            header_lines.append(f"**Date:** {date}")
        if url or date:
            header_lines.append("")
        body = "\n".join(header_lines) + content

        with open(article_path, "w", encoding="utf-8") as f:
            f.write(body)

        word_count = art.get("word_count") or len(body.split())
        char_count = art.get("character_count") or len(body)

        entries.append({
            "index": idx,
            "title": title,
            "url": url,
            "date": date,
            "thumbnail": art.get("thumbnail", ""),
            "images": art.get("images", []),
            "source": "Canadian Space Agency",
            "word_count": word_count,
            "character_count": char_count,
            "has_content": True,
            "content_file": article_path,
            "scrape_path": "csa_official",
            "category": "main",
        })

    if not entries:
        # No CSA official articles this month -- still emit a valid index.json so the
        # downstream Parse step doesn't error.
        index_path = os.path.join(run_dir, "index.json")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                print(f.read())
        else:
            print(json.dumps({"run_id": run_id, "articles": []}))
        return

    index = upsert_entries(run_dir, entries)
    print(json.dumps(index, ensure_ascii=False))


if __name__ == "__main__":
    main()

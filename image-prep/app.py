"""TCS image composition service.

Single-purpose Flask service that takes two images (background + foreground)
and produces a centered composite ready for Instagram.

Rules baked in:
  - Background dimensions are honored verbatim — never resized or cropped.
  - Foreground aspect ratio is preserved.
  - Foreground is shrunk (never enlarged) to fit inside the background with
    at least `padding` px of margin on every side (default 10px).
  - Foreground is centered on both axes.
  - If the foreground is already smaller than the available box, it is placed
    as-is at its native size.
  - Output is JPEG quality 90.

Bind: 127.0.0.1:3001 (localhost only — never expose to the public internet).
"""
from __future__ import annotations

import logging
import os
from io import BytesIO

from flask import Flask, jsonify, request, send_file
from PIL import Image, UnidentifiedImageError

DEFAULT_PADDING_PX = 10
JPEG_QUALITY = 90
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB per request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES

logging.basicConfig(
    level=os.environ.get("TCS_IMAGE_PREP_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("tcs-image-prep")


@app.get("/healthz")
def healthz():
    return jsonify(status="ok", service="tcs-image-prep")


@app.post("/composite")
def composite():
    bg_file = request.files.get("background")
    fg_file = request.files.get("foreground")
    if not bg_file or not fg_file:
        return jsonify(error="Both 'background' and 'foreground' file fields are required"), 400

    try:
        bg = Image.open(bg_file.stream)
        bg.load()
        bg = bg.convert("RGBA")
        fg = Image.open(fg_file.stream)
        fg.load()
        fg = fg.convert("RGBA")
    except UnidentifiedImageError as e:
        return jsonify(error=f"Could not parse image: {e}"), 400
    except Exception as e:  # noqa: BLE001 — surface unexpected decode errors to client
        log.exception("Failed to decode input images")
        return jsonify(error=f"Image decode error: {e}"), 400

    try:
        padding = int(request.form.get("padding", DEFAULT_PADDING_PX))
    except (TypeError, ValueError):
        padding = DEFAULT_PADDING_PX
    if padding < 0:
        padding = 0

    bg_w, bg_h = bg.size
    fg_w_in, fg_h_in = fg.size

    # Max box the foreground may occupy, respecting padding on all sides.
    max_w = max(1, bg_w - 2 * padding)
    max_h = max(1, bg_h - 2 * padding)

    # Pillow's thumbnail() preserves aspect AND never enlarges — exactly the
    # behavior we want. If the foreground is already smaller than max_box it
    # is left at its native size.
    fg.thumbnail((max_w, max_h), Image.LANCZOS)
    fg_w, fg_h = fg.size

    # Center the foreground on the background.
    pos_x = (bg_w - fg_w) // 2
    pos_y = (bg_h - fg_h) // 2

    # Paste with alpha mask so any foreground transparency composites cleanly.
    bg.paste(fg, (pos_x, pos_y), fg)

    out = BytesIO()
    bg.convert("RGB").save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    out.seek(0)

    log.info(
        "composite ok: bg=%dx%d, fg_in=%dx%d, fg_out=%dx%d, pad=%d, pos=(%d,%d)",
        bg_w, bg_h, fg_w_in, fg_h_in, fg_w, fg_h, padding, pos_x, pos_y,
    )

    return send_file(
        out,
        mimetype="image/jpeg",
        as_attachment=False,
        download_name="instagram.jpg",
    )


if __name__ == "__main__":
    # Dev runner only — production uses gunicorn via systemd.
    # Bind to 127.0.0.1 to keep the service unreachable from the public internet.
    app.run(host="127.0.0.1", port=3001, debug=False)

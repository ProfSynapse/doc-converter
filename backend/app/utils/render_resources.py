"""Offline PDF assets: inline raster images only; never fetch URLs or local files."""
import base64
import binascii
from io import BytesIO

from PIL import Image
from weasyprint.urls import URLFetcher, URLFetcherResponse

MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024
RASTER_TYPES = {"image/png": "PNG", "image/jpeg": "JPEG", "image/gif": "GIF", "image/webp": "WEBP"}


def inline_raster_fetcher(url, **kwargs):
    """WeasyPrint fetch hook, including recursive CSS/SVG resource requests.

    Check actual bytes as well as the declared MIME type so EPS cannot reach
    Pillow's Ghostscript dispatch under an image/png label. No default fetcher
    fallback is permitted. Links remain clickable; only fetched assets are limited.
    """
    if not isinstance(url, str) or not url.startswith("data:"):
        raise ValueError("PDF assets must be inline raster images")
    header, separator, encoded = url.partition(",")
    mime_type = header[5:].removesuffix(";base64").lower()
    if not separator or not header.endswith(";base64") or mime_type not in RASTER_TYPES:
        raise ValueError("Unsupported PDF asset type")
    if len(encoded) > 4 * ((MAX_INLINE_IMAGE_BYTES + 2) // 3):
        raise ValueError("Inline image is too large")
    try:
        data = base64.b64decode(encoded, validate=True)
        if len(data) > MAX_INLINE_IMAGE_BYTES:
            raise ValueError("Inline image is too large")
        with Image.open(BytesIO(data)) as image:
            if image.width * image.height > 16_000_000:
                raise ValueError("Inline image dimensions are too large")
            if image.format != RASTER_TYPES[mime_type]:
                raise ValueError("Inline image format does not match its type")
            image.verify()
    except (binascii.Error, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("Invalid inline raster image") from exc
    return {"string": data, "mime_type": mime_type}


class InlineRasterFetcher(URLFetcher):
    """WeasyPrint 70 response protocol for the offline raster policy."""

    def __init__(self):
        super().__init__(allowed_protocols={"data"}, allow_redirects=False)

    def fetch(self, url, headers=None):
        resource = inline_raster_fetcher(url)
        return URLFetcherResponse(url, resource["string"], {"Content-Type": resource["mime_type"]})

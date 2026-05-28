"""
CampusHub File Upload Security Utilities.

Provides:
- Magic-byte validation (actual file type vs extension)
- File size enforcement
- Filename sanitization
- Content sanitization via bleach
"""
import os
import re
import logging
import mimetypes
from pathlib import Path

import bleach
from django.conf import settings
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

# ── Allowed MIME types per upload category ────────────────────────────────────
ALLOWED_MIME_TYPES = {
    "note": {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "text/plain",
    },
    "resource": {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/x-zip-compressed",
    },
    "image": {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    },
    "avatar": {
        "image/jpeg",
        "image/png",
        "image/webp",
    },
}

# ── Magic bytes (file signatures) ─────────────────────────────────────────────
MAGIC_BYTES = {
    b"%PDF":                    "application/pdf",
    b"\xd0\xcf\x11\xe0":       "application/msword",          # OLE2 (doc, xls, ppt)
    b"PK\x03\x04":             "application/zip",              # ZIP-based (docx, xlsx, pptx, zip)
    b"\xff\xd8\xff":           "image/jpeg",
    b"\x89PNG\r\n\x1a\n":     "image/png",
    b"GIF87a":                 "image/gif",
    b"GIF89a":                 "image/gif",
    # WebP (RIFF....WEBP) is handled separately in detect_mime_from_magic
    # to avoid false-positives with WAV/AVI which also start with RIFF
}

# ZIP-based Office formats — need extension check since they share PK magic
ZIP_OFFICE_EXTENSIONS = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".zip":  "application/zip",
}

# Dangerous extensions — always reject
BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".js", ".jar",
    ".php", ".py", ".rb", ".pl", ".cgi", ".asp", ".aspx", ".jsp",
    ".dll", ".so", ".dylib", ".msi", ".dmg", ".app", ".com",
    ".scr", ".pif", ".reg", ".inf", ".lnk", ".url",
}

# Bleach allowed tags/attributes for user-supplied HTML-like text
BLEACH_ALLOWED_TAGS = [
    "b", "i", "u", "em", "strong", "p", "br", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span",
]
BLEACH_ALLOWED_ATTRS = {
    "*": ["class"],
    "a": ["href", "title", "rel"],
}


def sanitize_text(value: str, strip: bool = True) -> str:
    """
    Strip or escape HTML from user-supplied text.
    Use strip=True for plain-text fields, strip=False for rich-text.
    """
    if not value:
        return value
    if strip:
        return bleach.clean(value, tags=[], attributes={}, strip=True).strip()
    return bleach.clean(value, tags=BLEACH_ALLOWED_TAGS, attributes=BLEACH_ALLOWED_ATTRS, strip=True)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename: remove path traversal, null bytes, and dangerous chars.
    Returns a safe filename.
    """
    # Strip path components
    filename = os.path.basename(filename)
    # Remove null bytes
    filename = filename.replace("\x00", "")
    # Replace dangerous characters
    filename = re.sub(r"[^\w\s\-.]", "_", filename)
    # Collapse multiple dots (prevent double-extension tricks like file.php.pdf)
    parts = filename.rsplit(".", 1)
    if len(parts) == 2:
        name = re.sub(r"\.+", "_", parts[0])
        ext = parts[1].lower()
        filename = f"{name}.{ext}"
    # Limit length
    if len(filename) > 200:
        ext = Path(filename).suffix
        filename = filename[: 200 - len(ext)] + ext
    return filename or "upload"


def detect_mime_from_magic(file_obj) -> str | None:
    """
    Read the first 16 bytes of a file and match against known magic bytes.
    Returns detected MIME type or None.
    WebP is detected by checking both the RIFF header AND the WEBP marker at bytes 8-12.
    """
    try:
        file_obj.seek(0)
        header = file_obj.read(16)
        file_obj.seek(0)
    except Exception:
        return None

    # WebP: RIFF????WEBP — must check both markers to avoid matching WAV/AVI
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"

    for magic, mime in MAGIC_BYTES.items():
        if magic == b"RIFF":
            continue  # handled above
        if header.startswith(magic):
            return mime
    return None


def validate_upload(file_obj, category: str = "note") -> dict:
    """
    Validate an uploaded file for:
    1. Size limit
    2. Extension not in blocklist
    3. Magic-byte MIME detection
    4. MIME type allowed for category

    Returns dict with: filename, mime_type, file_type (note category)
    Raises ValidationError on failure.
    """
    max_size = getattr(settings, "MAX_UPLOAD_SIZE", 20 * 1024 * 1024)
    allowed_mimes = ALLOWED_MIME_TYPES.get(category, ALLOWED_MIME_TYPES["note"])

    # 1. Size check
    file_obj.seek(0, 2)  # seek to end
    size = file_obj.tell()
    file_obj.seek(0)
    if size > max_size:
        raise ValidationError(
            f"File too large. Maximum allowed size is {max_size // (1024 * 1024)} MB."
        )
    if size == 0:
        raise ValidationError("Empty file is not allowed.")

    # 2. Extension check
    original_name = getattr(file_obj, "name", "") or ""
    safe_name = sanitize_filename(original_name)
    ext = Path(safe_name).suffix.lower()

    if ext in BLOCKED_EXTENSIONS:
        logger.warning("Blocked upload attempt: extension=%s name=%s", ext, original_name)
        raise ValidationError(f"File type '{ext}' is not allowed.")

    # 3. Magic-byte detection
    detected_mime = detect_mime_from_magic(file_obj)

    # ZIP-based Office: refine by extension
    if detected_mime == "application/zip" and ext in ZIP_OFFICE_EXTENSIONS:
        detected_mime = ZIP_OFFICE_EXTENSIONS[ext]

    # OLE2 (legacy Office): refine by extension
    if detected_mime == "application/msword":
        ole_map = {
            ".doc":  "application/msword",
            ".xls":  "application/vnd.ms-excel",
            ".ppt":  "application/vnd.ms-powerpoint",
        }
        detected_mime = ole_map.get(ext, detected_mime)

    # Fallback: use mimetypes library if magic detection failed
    if not detected_mime:
        detected_mime, _ = mimetypes.guess_type(safe_name)

    if not detected_mime:
        raise ValidationError("Could not determine file type. Please upload a supported format.")

    # 4. MIME allowlist check
    if detected_mime not in allowed_mimes:
        logger.warning(
            "Blocked upload: mime=%s ext=%s category=%s name=%s",
            detected_mime, ext, category, original_name,
        )
        raise ValidationError(
            f"File type '{detected_mime}' is not allowed for {category} uploads."
        )

    # Derive note file_type category
    file_type = _mime_to_file_type(detected_mime, ext)

    logger.info(
        "File validated: name=%s mime=%s size=%d category=%s",
        safe_name, detected_mime, size, category,
    )

    return {
        "filename": safe_name,
        "mime_type": detected_mime,
        "file_type": file_type,
        "size": size,
    }


def _mime_to_file_type(mime: str, ext: str) -> str:
    """Map MIME type to our internal file_type category."""
    if mime == "application/pdf":
        return "pdf"
    if mime in ("application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"):
        return "docx"
    if mime in ("application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation"):
        return "ppt"
    if mime.startswith("image/"):
        return "image"
    return "other"

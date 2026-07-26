"""
Section B - NLP / OCR Text Extraction
=====================================

Extract structured customer information from the semi-structured OCR text in
``data/ocr_data.txt`` and return it as JSON.

Per the assessment, each person yields the following fields:
    first_name, last_name, middle_name (optional), email, phone_number,
    date_of_birth, address, marital_status

Rules implemented:
    * Handle multiple people in one file.
    * Split the full name into first / middle / last.
    * Missing fields are returned as ``null`` (JSON) rather than omitted.
    * Duplicate people (same email, or same name + DOB) are removed.

Approach: the OCR output is label-based ("Field: value"), so a regex layer
extracts each field precisely. spaCy NER is used only as a fallback to recover a
name when the "Name:" label is missing/garbled - it is optional and the module
runs without it.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "ocr_data.txt"
OUTPUT_FILE = ROOT / "outputs" / "section_b_extracted.json"

# Field label -> regex capturing the value on the same line.
_PATTERNS = {
    "name": re.compile(r"^\s*Name\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "date_of_birth": re.compile(r"^\s*DOB\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "email": re.compile(r"^\s*Email\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "phone_number": re.compile(r"^\s*Phone\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "address": re.compile(r"^\s*Address\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "marital_status": re.compile(r"^\s*Marital\s*Status\s*:\s*(.+?)\s*$",
                                 re.IGNORECASE | re.MULTILINE),
}

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_BLOCK_SPLIT_RE = re.compile(r"\n\s*\n+")
_DATE_FORMATS = ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d %b %Y", "%d %B %Y")

_nlp = None


def _get_nlp():
    """Lazily load spaCy; return None if unavailable (fallback is optional)."""
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
        except Exception:
            _nlp = False
    return _nlp or None


def _split_name(full_name: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Split a full name into (first, middle, last).

    2 tokens -> first + last (no middle).
    3+ tokens -> first + middle(everything between) + last.
    1 token  -> first only.
    """
    tokens = full_name.split()
    if not tokens:
        return None, None, None
    if len(tokens) == 1:
        return tokens[0], None, None
    if len(tokens) == 2:
        return tokens[0], None, tokens[1]
    return tokens[0], " ".join(tokens[1:-1]), tokens[-1]


def _normalise_dob(raw: str) -> Optional[str]:
    """Return the DOB as an ISO date string, or the raw value if unparseable."""
    from datetime import datetime
    raw = raw.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return raw or None


def _normalise_phone(raw: str) -> Optional[str]:
    cleaned = re.sub(r"[^\d+]", "", raw)
    return cleaned or None


def _clean_email(raw: str) -> Optional[str]:
    m = _EMAIL_RE.search(raw)
    return m.group(0).lower() if m else None


def extract_person(block: str) -> dict:
    """Extract one person's fields from a text block into the target schema."""
    raw = {field: (m.group(1).strip() if (m := pat.search(block)) else None)
           for field, pat in _PATTERNS.items()}

    full_name = raw.get("name")
    if not full_name:  # NER fallback for a missing name label
        nlp = _get_nlp()
        if nlp:
            for ent in nlp(block).ents:
                if ent.label_ == "PERSON":
                    full_name = ent.text.strip()
                    break

    first, middle, last = _split_name(full_name) if full_name else (None, None, None)

    return {
        "first_name": first,
        "middle_name": middle,        # optional -> null when absent
        "last_name": last,
        "email": _clean_email(raw["email"]) if raw["email"] else None,
        "phone_number": _normalise_phone(raw["phone_number"]) if raw["phone_number"] else None,
        "date_of_birth": _normalise_dob(raw["date_of_birth"]) if raw["date_of_birth"] else None,
        "address": raw["address"],
        "marital_status": raw["marital_status"].title() if raw["marital_status"] else None,
    }


def _dedup_key(person: dict) -> tuple:
    """Identity for duplicate detection: email, else full name + DOB."""
    if person.get("email"):
        return ("email", person["email"])
    name = " ".join(filter(None, [person.get("first_name"),
                                  person.get("middle_name"),
                                  person.get("last_name")])).lower()
    return ("name_dob", name, person.get("date_of_birth"))


def extract_all(text: str) -> list[dict]:
    """Extract every person from the OCR text, de-duplicated, order preserved."""
    text = text.lstrip("﻿")  # strip a leading BOM if present
    blocks = [b for b in _BLOCK_SPLIT_RE.split(text.strip()) if b.strip()]

    people, seen = [], set()
    for block in blocks:
        person = extract_person(block)
        if not any(person.values()):  # skip empty blocks
            continue
        key = _dedup_key(person)
        if key in seen:
            continue
        seen.add(key)
        people.append(person)
    return people


def extract_from_file(path: Path = DATA_FILE) -> list[dict]:
    text = Path(path).read_text(encoding="utf-8-sig")
    return extract_all(text)


def run() -> list[dict]:
    people = extract_from_file()
    OUTPUT_FILE.parent.mkdir(exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(people, indent=2), encoding="utf-8")
    return people


if __name__ == "__main__":
    people = run()
    print(f"Extracted {len(people)} unique people -> {OUTPUT_FILE}\n")
    print(json.dumps(people[:2], indent=2))
    print("... (see the JSON file for all records)")

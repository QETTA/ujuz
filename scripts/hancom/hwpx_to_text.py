#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


def localname(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[1]
    return tag


def extract_hwpx_text(hwpx_path: Path) -> str:
    if not hwpx_path.exists():
        raise FileNotFoundError(str(hwpx_path))
    if hwpx_path.suffix.lower() != ".hwpx":
        raise ValueError("Input must be a .hwpx file")

    parts: list[str] = []
    with zipfile.ZipFile(hwpx_path) as z:
        section_names = sorted(
            [n for n in z.namelist() if n.startswith("Contents/section") and n.endswith(".xml")]
        )
        if not section_names:
            raise ValueError("No section XML found in HWPX (expected Contents/section*.xml)")

        for name in section_names:
            raw = z.read(name)
            try:
                root = ET.fromstring(raw)
            except ET.ParseError as exc:
                raise ValueError(f"Failed to parse {name}: {exc}") from exc

            for elem in root.iter():
                ln = localname(elem.tag)
                if ln in ("p", "para", "paragraph"):
                    parts.append("\n")
                elif ln in ("lineBreak", "br"):
                    parts.append("\n")
                elif ln in ("tab",):
                    parts.append("\t")
                elif ln in ("t", "text") and elem.text:
                    parts.append(elem.text)

            parts.append("\n")

    text = "".join(parts)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{3,}", "  ", text)
    return text.strip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract plain text from a .hwpx file.")
    parser.add_argument("--in", dest="input_path", required=True, help="Input .hwpx path")
    parser.add_argument("--out", dest="output_path", required=True, help="Output .txt path")
    args = parser.parse_args()

    input_path = Path(args.input_path).expanduser().resolve()
    output_path = Path(args.output_path).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        text = extract_hwpx_text(input_path)
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 2

    output_path.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


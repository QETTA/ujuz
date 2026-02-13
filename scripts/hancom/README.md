# Hancom CLI convert (HWP/HWPX)

Local conversion using the installed Hancom Office engine on Windows.

## PDF (HWP/HWPX -> PDF)

WSL (bash):

```bash
bash scripts/hancom/convert.sh pdf ./input.hwp ./output.pdf
bash scripts/hancom/convert.sh pdf ./input.hwpx ./output.pdf
```

Windows (cmd):

```bat
C:\Progra~2\HNC\OFFICE~2\HOffice130\Bin\HpdfHwpConverter.exe "C:\path\in.hwp" "C:\path\out.pdf"
```

If PDF output is 0 bytes, install the Hancom PDF driver (Administrator required):

```bat
C:\Progra~2\HNC\OFFICE~2\HncUtils\HancomPDF\SetupDriver.exe
```

## Text

HWPX -> text (pure, no Hancom required):

```bash
bash scripts/hancom/convert.sh text ./input.hwpx ./output.txt
```

HWP -> text:

- This script attempts `HWP -> PDF` via Hancom first, then extracts text from PDF.
- Install `pdftotext` in WSL for reliable extraction:

```bash
sudo apt-get update
sudo apt-get install -y poppler-utils
```

Then:

```bash
bash scripts/hancom/convert.sh text ./input.hwp ./output.txt
```

## Config

- Override Hancom bin path (Windows path):
  - `HANCOM_BIN_WIN='C:\Progra~2\HNC\OFFICE~2\HOffice130\Bin'`

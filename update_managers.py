"""
update_managers.py — HMO Equipment Management System
=====================================================
Đồng bộ cột "CB quản lý hiện tại" từ HMO_Master_Equipment_Database.xlsx
vào field "manager" trong JSON của CẢ HAI landing page (index.html + QR_Landing_Page.html).

Lưu ý: từ 29/09/2026 landing page tự lấy cán bộ quản lý mới nhất từ Google Sheet qua API
khi mở chi tiết thiết bị. Script này chỉ cập nhật bản nhúng (dùng khi offline / chưa tải xong).

Cách dùng:
    python update_managers.py

Yêu cầu:
    pip install openpyxl

Script tự động:
    1. Đọc sheet Master_Data trong file .xlsx
    2. Trích xuất mapping: Mã QR → CB quản lý hiện tại
    3. Cập nhật field "manager" trong EQUIPMENT JSON của từng landing page
    4. Kiểm tra JSON còn hợp lệ, tạo backup, rồi mới ghi đè
    5. In báo cáo: bao nhiêu thiết bị được cập nhật, bao nhiêu không khớp
"""

import re
import json
import shutil
import openpyxl
from pathlib import Path
from datetime import datetime

# ── Cấu hình đường dẫn ──────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
XLSX_FILE   = BASE_DIR / "HMO_Master_Equipment_Database.xlsx"
# Hai file landing page phải giống hệt nhau (index.html là bản GitHub Pages phục vụ)
HTML_FILES  = [BASE_DIR / "index.html", BASE_DIR / "QR_Landing_Page.html"]
BACKUP_DIR  = BASE_DIR / "backups"

SHEET_NAME  = "Master_Data"
COL_QR      = "Mã QR"
COL_MANAGER = "CB quản lý hiện tại"

# ── Regex tìm EQUIPMENT JSON block trong HTML ────────────────────────────────
# Khớp: const EQUIPMENT = { ... };
EQUIPMENT_RE = re.compile(
    r'(const EQUIPMENT\s*=\s*)(\{.*?\n\})\s*;',
    re.DOTALL
)


# ── Regex cập nhật field "manager" theo từng QR code ────────────────────────
# Khớp: "HMO-XXX-YYYY": { ... "manager": "...", ... }
# Giá trị manager là chuỗi JSON: cho phép ký tự escape (\" \\) bên trong.
def make_manager_re(qr_code: str) -> re.Pattern:
    escaped = re.escape(qr_code)
    return re.compile(
        r'("' + escaped + r'"\s*:\s*\{[^}]*?"manager"\s*:\s*")((?:[^"\\]|\\.)*)(")',
        re.DOTALL
    )


def read_managers_from_xlsx(xlsx_path: Path) -> dict[str, str]:
    """Đọc sheet Master_Data, trả về dict {qr_code: manager_name}."""
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    if SHEET_NAME not in wb.sheetnames:
        raise ValueError(f"Không tìm thấy sheet '{SHEET_NAME}' trong file xlsx.")
    ws = wb[SHEET_NAME]

    headers = [cell.value for cell in next(ws.iter_rows(max_row=1))]
    try:
        qr_idx  = headers.index(COL_QR)
        mgr_idx = headers.index(COL_MANAGER)
    except ValueError as e:
        raise ValueError(f"Không tìm thấy cột: {e}") from e

    mapping = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        qr  = row[qr_idx]
        mgr = row[mgr_idx]
        if qr:  # bỏ qua dòng trống
            mgr_value = str(mgr).strip() if mgr else "Chưa phân công"
            mapping[str(qr).strip()] = mgr_value
    wb.close()
    return mapping


def backup_html(html_path: Path) -> Path:
    """Tạo bản backup trước khi chỉnh sửa."""
    BACKUP_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"{html_path.stem}_{ts}.html"
    shutil.copy2(html_path, backup_path)
    return backup_path


def update_managers_in_html(html_content: str, mapping: dict[str, str]) -> tuple[str, list, list]:
    """
    Cập nhật field manager trong HTML.
    Trả về: (html_mới, danh_sách_đã_cập_nhật, danh_sách_không_khớp)
    """
    updated  = []
    skipped  = []

    for qr_code, new_manager in mapping.items():
        pattern = make_manager_re(qr_code)
        match   = pattern.search(html_content)

        if not match:
            skipped.append(qr_code)
            continue

        old_manager = json.loads('"' + match.group(2) + '"').strip()
        if old_manager == new_manager:
            continue
        # Escape theo chuẩn JSON để tên có dấu " hoặc \ không làm hỏng dữ liệu;
        # dùng hàm thay thế để regex không diễn giải ký tự \ trong tên.
        encoded = json.dumps(new_manager, ensure_ascii=False)[1:-1]
        html_content = pattern.sub(lambda m: m.group(1) + encoded + m.group(3), html_content, count=1)
        updated.append((qr_code, old_manager, new_manager))

    return html_content, updated, skipped


def update_file(html_file: Path, mapping: dict[str, str]) -> tuple[list, list]:
    """Cập nhật một file; kiểm tra JSON EQUIPMENT còn hợp lệ TRƯỚC khi ghi đè."""
    print(f"📄 Đọc file: {html_file.name}")
    html_content = html_file.read_text(encoding="utf-8")
    new_html, updated, skipped = update_managers_in_html(html_content, mapping)

    block = EQUIPMENT_RE.search(new_html)
    if not block:
        raise ValueError(f"Không tìm thấy khối EQUIPMENT trong {html_file.name}")
    json.loads(block.group(2))  # ném lỗi nếu dữ liệu bị hỏng → không ghi file

    if updated:
        backup_path = backup_html(html_file)
        print(f"💾 Backup: backups/{backup_path.name}")
        html_file.write_text(new_html, encoding="utf-8")
    return updated, skipped


def report(updated: list, skipped: list) -> None:
    print(f"\n✅ Đã cập nhật: {len(updated)} thiết bị")
    if updated:
        print()
        print(f"  {'Mã QR':<22} {'Cũ':<35} {'Mới'}")
        print(f"  {'-'*22} {'-'*35} {'-'*35}")
        for qr, old, new in updated:
            old_display = (old[:33] + '..') if len(old) > 35 else old
            new_display = (new[:33] + '..') if len(new) > 35 else new
            print(f"  {qr:<22} {old_display:<35} {new_display}")

    if skipped:
        print(f"\n⚠️  Không tìm thấy trong HTML ({len(skipped)} thiết bị):")
        for qr in skipped:
            print(f"   - {qr}")


def main():
    print("=" * 60)
    print("  HMO Equipment — Đồng bộ Cán bộ Quản lý")
    print("=" * 60)

    print(f"\n📂 Đọc dữ liệu từ: {XLSX_FILE.name}")
    mapping = read_managers_from_xlsx(XLSX_FILE)
    print(f"   → {len(mapping)} thiết bị trong Master_Data")

    results = [update_file(html_file, mapping) for html_file in HTML_FILES]

    # Hai file giống hệt nhau nên kết quả như nhau — báo cáo theo file đầu tiên
    report(*results[0])
    print(f"\n🎉 Hoàn thành! Đã xử lý: {', '.join(f.name for f in HTML_FILES)}")
    print("=" * 60)


if __name__ == "__main__":
    main()

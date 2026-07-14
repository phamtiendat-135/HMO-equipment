"""
github_push.py — Đẩy các file đã sửa lên GitHub mà không cần git CLI
Chạy: python github_push.py
Nhập GitHub Personal Access Token khi được hỏi.

Tạo token tại: https://github.com/settings/tokens/new
  - Chọn: repo (Full control of private repositories)
  - Hoặc chỉ cần: public_repo nếu repo là public
"""

import base64, getpass, json, urllib.request, urllib.error
from pathlib import Path

OWNER = "phamtiendat-135"
REPO  = "HMO-equipment"
BRANCH = "main"

FILES_TO_PUSH = [
    "index.html",
    "QR_Landing_Page.html",
    "sw.js",
    "Kich_ban_video_HMO_Eq.docx",
    "Slide_intro_outro_HMO_Eq.pptx",
    "HMO_Master_Equipment_Database.xlsx",
    "update_managers.py",
]

BASE_DIR = Path(__file__).parent
API_BASE = f"https://api.github.com/repos/{OWNER}/{REPO}/contents"


def gh_request(path, method="GET", data=None, token=None):
    url = API_BASE + path
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"token {token}")
    req.add_header("Accept", "application/vnd.github.v3+json")
    req.add_header("User-Agent", "HMO-push-script")
    if data:
        req.data = json.dumps(data).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"HTTP {e.code}: {body}") from e


def push_file(filepath: Path, token: str) -> str:
    rel = filepath.name
    content_b64 = base64.b64encode(filepath.read_bytes()).decode()

    # Lấy SHA hiện tại (cần để update)
    try:
        existing = gh_request(f"/{rel}", token=token)
        sha = existing["sha"]
        action = "Cập nhật"
    except RuntimeError:
        sha = None
        action = "Tạo mới"

    payload = {
        "message": f"feat(thang 6): cap nhat {rel} - PWA + tai lieu video huong dan",
        "content": content_b64,
        "branch": BRANCH,
    }
    if sha:
        payload["sha"] = sha

    gh_request(f"/{rel}", method="PUT", data=payload, token=token)
    return action


def main():
    print("=" * 55)
    print("  HMO Equipment — Push files lên GitHub")
    print("=" * 55)
    print()
    print("Tạo Personal Access Token tại:")
    print("  https://github.com/settings/tokens/new")
    print("  (chọn scope: repo hoặc public_repo)")
    print()
    import sys
    if len(sys.argv) > 1:
        token = sys.argv[1].strip()
        print("Token nhận từ tham số.")
    else:
        token = input("Nhập GitHub Personal Access Token (paste rồi Enter): ").strip()
    if not token:
        print("Không có token. Thoát.")
        return
    print(f"Token length: {len(token)} ký tự — {'OK' if len(token) > 20 else 'Có vẻ thiếu ký tự!'}")

    # Hash kiểm tra (tính từ sandbox lúc fix)
    EXPECTED = {
        "index.html":          ("41a607c9eac0974de1898545e6889d06", 59527),
        "QR_Landing_Page.html":("41a607c9eac0974de1898545e6889d06", 59527),
        "sw.js":               ("1fc7369654efc6ddb941a3b99b51fa46", 1950),
    }

    print()
    ok = 0
    for fname in FILES_TO_PUSH:
        fpath = BASE_DIR / fname
        if not fpath.exists():
            print(f"  ⚠️  Không tìm thấy: {fname}")
            continue
        try:
            # Kiểm tra hash trước khi push
            import hashlib
            data = fpath.read_bytes()
            actual_md5 = hashlib.md5(data).hexdigest()
            actual_size = len(data)
            if fname in EXPECTED:
                exp_md5, exp_size = EXPECTED[fname]
                if actual_md5 != exp_md5 or actual_size != exp_size:
                    print(f"  ⚠️  {fname}: FILE KHÁC VỚI BẢN ĐÃ FIX!")
                    print(f"      Expected: {exp_md5} ({exp_size} bytes)")
                    print(f"      Got:      {actual_md5} ({actual_size} bytes)")
                    print(f"      Bỏ qua file này — liên hệ Claude để fix lại.")
                    continue
                else:
                    print(f"  ✅ Hash OK: {fname}")
            action = push_file(fpath, token)
            print(f"  ✅ Pushed: {fname}")
            ok += 1
        except Exception as e:
            print(f"  ❌ Lỗi {fname}: {e}")

    print()
    if ok:
        print(f"Đã push {ok} file lên GitHub.")
        print("GitHub Pages cập nhật trong 1-2 phút.")
        print(f"https://phamtiendat-135.github.io/HMO-equipment/")
    else:
        print("Không push được file nào. Kiểm tra lại token.")
    print()
    input("Nhấn Enter để thoát...")


if __name__ == "__main__":
    main()

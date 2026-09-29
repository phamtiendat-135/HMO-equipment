// Regression cho landing page (index.html) + service worker — chạy HTML thật trong jsdom, fetch giả.
// Chạy từ thư mục gốc repo:  node tests/frontend_regression.cjs [đường-dẫn-module-jsdom]
// (không truyền thì require('jsdom') theo node_modules thông thường)
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM } = require(process.argv[2] || 'jsdom');

const HTML = fs.readFileSync('index.html', 'utf8').replace(/navigator\.serviceWorker/g, 'undefined && navigator.serviceWorker');
const results = [];
async function test(name, fn) {
  try { await fn(); results.push([true, name]); }
  catch (e) { results.push([false, name, e.message]); }
}
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

/** Mở trang với URL + API giả. api(url) trả object JSON, hoặc ném lỗi để giả mất mạng. */
function openPage(search = '', api = () => ({})) {
  const calls = [];
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'https://example.test/HMO-equipment/' + search,
    beforeParse(w) {
      w.fetch = url => {
        calls.push(url);
        try {
          const body = api(new URL(url));
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
        } catch (e) {
          return Promise.reject(e);
        }
      };
    }
  });
  const w = dom.window;
  return { w, d: w.document, calls, content: () => w.document.getElementById('content').innerHTML };
}

(async () => {
  // ---------------- P1-01: XSS / tra cứu an toàn ----------------
  await test('P1-01 ?id= chứa HTML không được thực thi, hiển thị dạng chữ', async () => {
    const payload = '<img src=x onerror="window.__pwned=1">';
    const p = openPage('?id=' + encodeURIComponent(payload));
    await tick();
    assert.equal(p.w.__pwned, undefined);
    assert.equal(p.d.querySelector('#content img[src="x"]'), null);
    assert.ok(p.content().includes('&lt;img'));
  });
  await test('P1-01 ?id=constructor / __proto__ → "không tìm thấy", không render thiết bị ma', async () => {
    for (const key of ['constructor', '__proto__', 'toString']) {
      const p = openPage('?id=' + key);
      await tick();
      assert.match(p.content(), /Không tìm thấy thiết bị/, key);
    }
  });
  await test('P1-01 ô tìm kiếm gõ "constructor" không mở thiết bị ma', async () => {
    const p = openPage('');
    await tick();
    const input = p.d.getElementById('searchInput');
    input.value = 'constructor';
    input.dispatchEvent(new p.w.Event('input'));
    await tick(400);
    assert.ok(!/Object/.test(p.d.querySelector('#content h2')?.textContent || ''));
  });
  await test('Mã hợp lệ vẫn mở đúng thiết bị', async () => {
    const p = openPage('?id=HMO-OBS-8693', () => ({ _borrowStatus: { available: true, borrowedCount: 0 } }));
    await tick();
    assert.match(p.content(), /HMO-OBS-8693/);
    assert.ok(p.d.getElementById('manager-value'));
  });

  // ---------------- Lịch sử: lỗi ≠ rỗng ----------------
  const historyPage = async body => {
    const p = openPage('?id=HMO-OBS-8693', u => (u.searchParams.get('action') === 'history'
      ? (typeof body === 'function' ? body() : body) : { _borrowStatus: { available: true, borrowedCount: 0 } }));
    await tick();
    p.w.toggleUsageHistory('HMO-OBS-8693');
    await tick();
    return p.d.getElementById('history-list').innerHTML;
  };
  await test('Lịch sử: offline (service worker trả ok:false) → báo lỗi, KHÔNG "chưa có lượt"', async () => {
    const html = await historyPage({ ok: false, error: 'offline' });
    assert.match(html, /Không thể tải lịch sử/);
  });
  await test('Lịch sử: mất mạng hẳn → báo lỗi', async () => {
    const html = await historyPage(() => { throw new Error('network'); });
    assert.match(html, /Không thể tải lịch sử/);
  });
  await test('Lịch sử: rỗng thật → "chưa có lượt sử dụng"', async () => {
    const html = await historyPage({ ok: true, history: [] });
    assert.match(html, /Chưa có lượt sử dụng/);
  });
  await test('Lịch sử: tên đã che, không có dòng địa điểm, nhãn "Chờ duyệt"', async () => {
    const html = await historyPage({ ok: true, history: [
      { borrower: 'Phan H. N.', borrowDate: '20/09/2026', returnDate: '', usageHours: null, status: 'pending', isActive: true }] });
    assert.match(html, /Phan H\. N\./);
    assert.match(html, /Chờ duyệt/);
    assert.ok(!/Địa điểm/.test(html));
  });

  // ---------------- Trạng thái mượn + cán bộ từ API ----------------
  await test('Badge: yêu cầu chờ duyệt hiện "giữ chỗ", nút mượn bị khóa (thiết bị số lượng 1)', async () => {
    const p = openPage('?id=HMO-HPC-7879', () => ({ _borrowStatus:
      { available: false, borrowedCount: 1, borrower: 'Phan H. N.', dueDate: '', daysOverdue: 0, status: 'pending' } }));
    await tick();
    assert.match(p.d.getElementById('avail-badge').textContent, /giữ chỗ/);
    assert.ok(p.d.getElementById('borrow-btn').classList.contains('disabled'));
  });
  await test('Badge: API lỗi / offline → ẩn badge, không đoán "sẵn sàng"', async () => {
    const p = openPage('?id=HMO-OBS-8693', () => ({ ok: false, error: 'offline' }));
    await tick();
    assert.equal(p.d.getElementById('avail-badge').style.display, 'none');
  });
  await test('Cán bộ quản lý lấy theo Sheet live (API) thay cho dữ liệu nhúng', async () => {
    const p = openPage('?id=HMO-OBS-8693', () => ({ 'CB quản lý hiện tại': 'TS. Cán Bộ Mới',
      _borrowStatus: { available: true, borrowedCount: 0 } }));
    await tick();
    assert.equal(p.d.getElementById('manager-value').textContent, 'TS. Cán Bộ Mới');
  });
  await test('Cán bộ cập nhật cả với thiết bị KHÔNG hoạt động (không có badge)', async () => {
    const p = openPage('?id=HMO-HPC-7748', () => ({ 'CB quản lý hiện tại': 'TS. Cán Bộ Mới',
      _borrowStatus: { available: true, borrowedCount: 0 } }));
    await tick();
    assert.equal(p.d.getElementById('manager-value').textContent, 'TS. Cán Bộ Mới');
  });
  await test('Cán bộ từ API chứa HTML → hiển thị dạng chữ', async () => {
    const p = openPage('?id=HMO-OBS-8693', () => ({ 'CB quản lý hiện tại': '<b>X</b>',
      _borrowStatus: { available: true, borrowedCount: 0 } }));
    await tick();
    assert.equal(p.d.querySelector('#manager-value b'), null);
  });

  // ---------------- Đào tạo / NCKH chưa kết nối ----------------
  await test('Đào tạo/NCKH chưa có form: KHÔNG báo "Đã ghi nhận", giữ nội dung đã nhập', async () => {
    const p = openPage('?id=HMO-OBS-8693', () => ({ _borrowStatus: { available: true, borrowedCount: 0 } }));
    await tick();
    const input = p.d.getElementById('sec-train-input');
    assert.ok(input, 'có ô nhập đào tạo');
    input.value = 'HMO2001';
    p.w.submitInput('sec-train', 'HMO-OBS-8693', 'training');
    const msg = p.d.getElementById('sec-train-success').textContent;
    assert.ok(!/Đã ghi nhận/.test(msg), msg);
    assert.match(msg, /Chưa ghi nhận/);
    assert.equal(input.value, 'HMO2001');
  });

  // ---------------- Nhật ký toàn Khoa ----------------
  await test('Nhật ký: hiện nhãn "Từ chối" cho yêu cầu bị từ chối', async () => {
    const p = openPage('', u => (u.searchParams.get('key') === '12345678'
      ? { ok: true, entries: [{ qrCode: 'HMO-OBS-8693', equipName: 'Máy', borrower: 'A', unit: '', location: 'X',
          borrowDate: '20/09/2026', dueDate: '', returnDate: '', usageHours: null, status: 'rejected', isActive: false, isOverdue: false }] }
      : { ok: false, error: 'unauthorized', entries: [] }));
    await tick();
    p.w.showUsageLog();
    p.d.getElementById('log-code-input').value = '12345678';
    p.d.getElementById('log-code-form').dispatchEvent(new p.w.Event('submit', { cancelable: true }));
    await tick();
    assert.match(p.d.getElementById('log-list').innerHTML, /Từ chối/);
  });

  // ---------------- Service worker ----------------
  await test('Service worker: chỉ xóa cache cũ của dự án, giữ cache của app khác', async () => {
    const handlers = {};
    const deleted = [];
    const ctx = vm.createContext({
      self: { addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting() {}, clients: { claim: () => Promise.resolve() },
        location: { hostname: 'example.test' } },
      caches: { keys: () => Promise.resolve(['hmo-equipment-v9', 'hmo-equipment-v10', 'other-app-v1']),
        delete: k => { deleted.push(k); return Promise.resolve(true); } },
      URL, Response: class {}, JSON, Promise, fetch: () => Promise.reject(new Error('x'))
    });
    vm.runInContext(fs.readFileSync('sw.js', 'utf8'), ctx);
    let waited;
    handlers.activate({ waitUntil: p => { waited = p; } });
    await waited;
    assert.deepEqual(deleted, ['hmo-equipment-v9']);
  });
  await test('Service worker: tài nguyên không phải trang lỗi → không trả HTML thay thế', async () => {
    const handlers = {};
    const ctx = vm.createContext({
      self: { addEventListener: (t, f) => { handlers[t] = f; }, location: { hostname: 'example.test' } },
      caches: { match: url => Promise.resolve(url === '/HMO-equipment/index.html' ? 'INDEX_HTML' : undefined) },
      URL, Response: class {}, JSON, Promise, fetch: () => Promise.reject(new Error('offline'))
    });
    vm.runInContext(fs.readFileSync('sw.js', 'utf8'), ctx);
    // Bọc trong object để Promise không tự "mở gói" lỗi trước khi kiểm tra
    const respond = req => new Promise(resolve => handlers.fetch({ request: req, respondWith: p => resolve({ p }) }));
    const img = await respond({ url: 'https://example.test/HMO-equipment/icons/x.png', mode: 'no-cors', method: 'GET' });
    await assert.rejects(img.p);
    const nav = await respond({ url: 'https://example.test/HMO-equipment/', mode: 'navigate', method: 'GET' });
    assert.equal(await nav.p, 'INDEX_HTML');
  });

  // ---------------- P1-09: trang in tem ----------------
  await test('P1-09 trang tem: mọi tem nằm trực tiếp trong lưới, không tên mồ côi, đếm khớp tiêu đề', async () => {
    const d = new JSDOM(fs.readFileSync('QR_Labels_Print.html', 'utf8')).window.document;
    const cards = [...d.querySelectorAll('.qr-card')];
    assert.equal(cards.length, 54);
    assert.equal(new Set(cards.map(c => c.querySelector('img').alt)).size, 54, 'mã không trùng');
    assert.ok(cards.every(c => c.parentElement.classList.contains('qr-grid')), 'tem nằm ngoài lưới');
    assert.equal([...d.querySelectorAll('.qr-name')].filter(n => !n.closest('.qr-card')).length, 0, 'tên mồ côi');
    const expected = { 'P204-T3': 14, 'P206-T3': 18, 'P207-T3': 5, 'P401-T3': 8, 'T3': 9 };
    const sections = [...d.querySelectorAll('.room-section')];
    assert.equal(sections.length, 5);
    for (const sec of sections) {
      const inSec = [...sec.querySelectorAll('.qr-card')];
      const count = Number(sec.querySelector('.count').textContent.match(/\d+/)[0]);
      assert.equal(inSec.length, count, sec.querySelector('.room-title span').textContent);
      const locs = new Set(inSec.map(c => c.querySelector('.qr-meta').textContent.split('|').pop().trim()));
      assert.equal(locs.size, 1, 'một khu vực chỉ chứa tem của khu vực đó');
      assert.equal(expected[[...locs][0]], count);
    }
  });

  // ---------------- Hai file landing page đồng bộ ----------------
  await test('index.html và QR_Landing_Page.html giống hệt nhau', async () => {
    assert.equal(fs.readFileSync('index.html', 'utf8'), fs.readFileSync('QR_Landing_Page.html', 'utf8'));
  });

  let failed = 0;
  for (const [ok, name, err] of results) {
    console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n     → ' + err));
    if (!ok) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} pass`);
  process.exit(failed ? 1 : 0);
})();

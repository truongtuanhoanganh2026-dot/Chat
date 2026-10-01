const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 6e6 }); // ảnh tối đa ~6MB

app.use(express.json());
const HTML = "<!DOCTYPE html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n<title>Nhắn</title>\n<style>\n  :root {\n    --bg: #eef1ec; --panel: #ffffff; --ink: #17211d; --muted: #66726c; --line: #dde3dc;\n    --accent: #2f6b57; --accent-ink: #ffffff; --mine: #2f6b57; --mine-ink: #fff; --theirs: #e6ebe4;\n    --danger: #b3412f; --online: #3fae7d;\n  }\n  @media (prefers-color-scheme: dark) {\n    :root {\n      --bg: #101613; --panel: #18201c; --ink: #e7ede9; --muted: #8b9a92; --line: #26312b;\n      --accent: #5fb394; --accent-ink: #0c1511; --mine: #3d8a70; --mine-ink: #fff; --theirs: #222c26;\n    }\n  }\n  * { box-sizing: border-box; }\n  html, body { height: 100%; margin: 0; }\n  body { font-family: \"Be Vietnam Pro\", system-ui, -apple-system, \"Segoe UI\", sans-serif; background: var(--bg); color: var(--ink); font-size: 15px; }\n  button, input { font: inherit; color: inherit; }\n  button { cursor: pointer; }\n  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n  .hidden { display: none !important; }\n\n  /* Đăng nhập */\n  #auth { height: 100%; display: grid; place-items: center; padding: 20px; }\n  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 28px; width: min(380px, 100%); }\n  .card h1 { margin: 0 0 4px; font-size: 28px; letter-spacing: -0.02em; }\n  .card p { margin: 0 0 20px; color: var(--muted); }\n  .card input { width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); }\n  .row { display: flex; gap: 8px; }\n  .btn { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid var(--line); background: transparent; }\n  .btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; }\n  #err { color: var(--danger); min-height: 20px; margin: 4px 0 0; font-size: 14px; }\n\n  /* Khung chính */\n  #app { height: 100%; display: grid; grid-template-columns: 330px 1fr; }\n  #side { background: var(--panel); border-right: 1px solid var(--line); display: flex; flex-direction: column; min-height: 0; padding-top: env(safe-area-inset-top, 0px); }\n  .side-head { padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); }\n  .side-head b { font-size: 18px; }\n  .link { background: none; border: 0; color: var(--muted); padding: 4px; }\n  .search { padding: 12px 16px; border-bottom: 1px solid var(--line); }\n  .search input { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); }\n  #list { overflow-y: auto; flex: 1; }\n  .sec { padding: 12px 16px 4px; color: var(--muted); font-size: 13px; font-weight: 600; }\n  .item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; width: 100%; text-align: left; background: none; border: 0; }\n  .item:hover, .item.active { background: var(--bg); }\n  .av { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; font-weight: 700; flex: none; position: relative; }\n  .av.on::after { content: \"\"; position: absolute; right: -1px; bottom: -1px; width: 11px; height: 11px; border-radius: 50%; background: var(--online); border: 2px solid var(--panel); }\n  .grow { flex: 1; min-width: 0; }\n  .badge { background: var(--accent); color: var(--accent-ink); border-radius: 10px; padding: 1px 7px; font-size: 12px; font-weight: 700; }\n  .mini { padding: 6px 10px; border-radius: 6px; border: 1px solid var(--line); background: transparent; font-size: 13px; }\n  .mini.ok { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }\n\n  #chat { display: flex; flex-direction: column; min-height: 0; padding-top: env(safe-area-inset-top, 0px); }\n  .chat-head { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--line); }\n  #back { display: none; font-size: 22px; }\n  #msgs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 6px; }\n  .empty { margin: auto; color: var(--muted); text-align: center; padding: 20px; }\n  .b { max-width: min(75%, 520px); padding: 8px 12px; border-radius: 14px; background: var(--theirs); word-wrap: break-word; overflow-wrap: anywhere; line-height: 1.4; }\n  .b.me { align-self: flex-end; background: var(--mine); color: var(--mine-ink); }\n  .b a { color: inherit; text-decoration: underline; }\n  .b img { display: block; max-width: 100%; max-height: 320px; border-radius: 8px; cursor: zoom-in; }\n  .time { display: block; font-size: 11px; opacity: .6; margin-top: 2px; }\n  .composer { display: flex; gap: 8px; padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px)); background: var(--panel); border-top: 1px solid var(--line); align-items: center; }\n  .composer input[type=text] { flex: 1; padding: 11px 14px; border: 1px solid var(--line); border-radius: 22px; background: var(--bg); min-width: 0; }\n  .icon { width: 40px; height: 40px; border-radius: 50%; border: 0; background: transparent; font-size: 20px; flex: none; }\n  .icon:hover { background: var(--bg); }\n  .send { background: var(--accent); color: var(--accent-ink); }\n\n  /* Video call */\n  #call { position: fixed; inset: 0; background: #0b0f0d; z-index: 20; display: flex; flex-direction: column; }\n  #rv { flex: 1; width: 100%; min-height: 0; object-fit: cover; background: #0b0f0d; }\n  #lv { position: absolute; right: 14px; top: calc(14px + env(safe-area-inset-top, 0px)); width: 110px; aspect-ratio: 3/4; object-fit: cover; border-radius: 10px; background: #222; transform: scaleX(-1); }\n  #callInfo { position: absolute; left: 0; right: 0; top: calc(20px + env(safe-area-inset-top, 0px)); text-align: center; color: #fff; text-shadow: 0 1px 4px #000; }\n  .ctrls { position: absolute; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); left: 0; right: 0; display: flex; justify-content: center; gap: 16px; }\n  .ctrls .icon { background: #ffffff26; color: #fff; width: 56px; height: 56px; font-size: 22px; }\n  .ctrls .end { background: var(--danger); }\n  #incoming { position: fixed; left: 12px; right: 12px; top: calc(12px + env(safe-area-inset-top, 0px)); z-index: 30; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 10px; box-shadow: 0 8px 30px #0004; }\n  #viewer { position: fixed; inset: 0; background: #000d; z-index: 40; display: grid; place-items: center; }\n  #viewer img { max-width: 96%; max-height: 96%; }\n\n  @media (max-width: 720px) {\n    #app { grid-template-columns: 1fr; }\n    #chat { display: none; }\n    #app.in-chat #side { display: none; }\n    #app.in-chat #chat { display: flex; }\n    #back { display: block; }\n  }\n</style>\n</head>\n<body>\n\n<div id=\"auth\">\n  <div class=\"card\">\n    <h1>Nhắn</h1>\n    <p>Kết bạn và trò chuyện với bất kỳ ai.</p>\n    <input id=\"u\" placeholder=\"Tên người dùng (a–z, 0–9, _)\" autocomplete=\"username\" autocapitalize=\"none\">\n    <input id=\"p\" type=\"password\" placeholder=\"Mật khẩu (tối thiểu 6 ký tự)\" autocomplete=\"current-password\">\n    <div class=\"row\">\n      <button class=\"btn primary\" onclick=\"auth('login')\">Đăng nhập</button>\n      <button class=\"btn\" onclick=\"auth('register')\">Tạo tài khoản</button>\n    </div>\n    <div id=\"err\"></div>\n  </div>\n</div>\n\n<div id=\"app\" class=\"hidden\">\n  <aside id=\"side\">\n    <div class=\"side-head\"><b id=\"meName\"></b><button class=\"link\" onclick=\"logout()\">Đăng xuất</button></div>\n    <div class=\"search\"><input id=\"q\" placeholder=\"Tìm người dùng theo tên…\" autocapitalize=\"none\"></div>\n    <div id=\"list\"></div>\n  </aside>\n  <main id=\"chat\">\n    <div id=\"noChat\" class=\"empty\">Chọn một người bạn để bắt đầu trò chuyện,<br>hoặc tìm tên người dùng để kết bạn.</div>\n    <div id=\"chatBox\" class=\"hidden\" style=\"display:flex;flex-direction:column;flex:1;min-height:0\">\n      <div class=\"chat-head\">\n        <button id=\"back\" class=\"icon\" onclick=\"closeChat()\" aria-label=\"Quay lại\">‹</button>\n        <div class=\"av\" id=\"hAv\"></div>\n        <div class=\"grow\"><b id=\"hName\"></b><div id=\"hSt\" style=\"color:var(--muted);font-size:13px\"></div></div>\n        <button class=\"icon\" onclick=\"startCall()\" aria-label=\"Gọi video\">📹</button>\n      </div>\n      <div id=\"msgs\"></div>\n      <div class=\"composer\">\n        <button class=\"icon\" onclick=\"$('#file').click()\" aria-label=\"Gửi ảnh\">🖼️</button>\n        <input type=\"file\" id=\"file\" accept=\"image/*\" class=\"hidden\">\n        <input type=\"text\" id=\"text\" placeholder=\"Nhập tin nhắn…\" autocomplete=\"off\">\n        <button class=\"icon send\" onclick=\"sendText()\" aria-label=\"Gửi\">➤</button>\n      </div>\n    </div>\n  </main>\n</div>\n\n<div id=\"incoming\" class=\"hidden\">\n  <div class=\"grow\"><b id=\"inName\"></b> đang gọi video…</div>\n  <button class=\"mini\" onclick=\"declineCall()\">Từ chối</button>\n  <button class=\"mini ok\" onclick=\"acceptCall()\">Nghe</button>\n</div>\n\n<div id=\"call\" class=\"hidden\">\n  <video id=\"rv\" autoplay playsinline></video>\n  <video id=\"lv\" autoplay playsinline muted></video>\n  <div id=\"callInfo\"></div>\n  <div class=\"ctrls\">\n    <button class=\"icon\" id=\"bMic\" onclick=\"toggle('audio', this)\" aria-label=\"Tắt/bật mic\">🎤</button>\n    <button class=\"icon\" id=\"bCam\" onclick=\"toggle('video', this)\" aria-label=\"Tắt/bật camera\">📷</button>\n    <button class=\"icon end\" onclick=\"endCall(true)\" aria-label=\"Kết thúc\">📞</button>\n  </div>\n</div>\n\n<div id=\"viewer\" class=\"hidden\" onclick=\"this.classList.add('hidden')\"><img alt=\"\"></div>\n\n<script src=\"/socket.io/socket.io.js\"></script>\n<script>\nconst $ = (s) => document.querySelector(s);\nconst esc = (s) => s.replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\nconst linkify = (s) => esc(s).replace(/(https?:\\/\\/[^\\s<]+)/g, '<a href=\"$1\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>');\nconst hhmm = (t) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });\n\nlet socket, me, cur = null, friends = [], requests = [], unread = {}, results = null;\n\n/* ---------- Đăng nhập ---------- */\nasync function auth(kind) {\n  $('#err').textContent = '';\n  try {\n    const r = await fetch('/api/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ username: $('#u').value, password: $('#p').value }) });\n    const d = await r.json();\n    if (!r.ok) return ($('#err').textContent = d.error);\n    localStorage.setItem('tok', d.token); localStorage.setItem('me', d.username);\n    start(d.token, d.username);\n  } catch { $('#err').textContent = 'Không kết nối được máy chủ.'; }\n}\nfunction logout() { localStorage.clear(); location.reload(); }\n$('#p').addEventListener('keydown', (e) => e.key === 'Enter' && auth('login'));\n\nfunction start(token, name) {\n  me = name;\n  $('#auth').classList.add('hidden'); $('#app').classList.remove('hidden');\n  $('#meName').textContent = '@' + name;\n  socket = io({ auth: { token } });\n  socket.on('connect_error', (e) => { if (e.message === 'unauthorized') logout(); });\n  socket.on('lists', (d) => { friends = d.friends; requests = d.requests; renderList(); refreshHeader(); });\n  socket.on('presence', (p) => { const f = friends.find((x) => x.name === p.name); if (f) { f.online = p.online; renderList(); refreshHeader(); } });\n  socket.on('msg', (m) => {\n    const other = m.from === me ? m.to : m.from;\n    if (other === cur) { addBubble(m); scrollDown(); }\n    else if (m.from !== me) { unread[other] = (unread[other] || 0) + 1; renderList(); }\n  });\n  bindCall();\n}\nif (localStorage.getItem('tok')) start(localStorage.getItem('tok'), localStorage.getItem('me'));\n\n/* ---------- Danh sách bạn / tìm kiếm ---------- */\nlet sTimer;\n$('#q').addEventListener('input', (e) => {\n  clearTimeout(sTimer);\n  const v = e.target.value.trim();\n  if (!v) { results = null; return renderList(); }\n  sTimer = setTimeout(() => socket.emit('search', v, (r) => { results = r; renderList(); }), 250);\n});\n\nfunction avatar(n, on) { return `<div class=\"av ${on ? 'on' : ''}\">${esc(n[0].toUpperCase())}</div>`; }\n\nfunction renderList() {\n  const el = $('#list'); let h = '';\n  if (results) {\n    h += '<div class=\"sec\">Kết quả tìm kiếm</div>';\n    if (!results.length) h += '<div class=\"sec\" style=\"font-weight:400\">Không có ai khớp.</div>';\n    results.forEach((r) => {\n      h += `<div class=\"item\">${avatar(r.name)}<div class=\"grow\">@${esc(r.name)}</div>` +\n        (r.friend ? '<span style=\"color:var(--muted)\">Bạn bè</span>'\n          : r.pending ? '<span style=\"color:var(--muted)\">Đã mời</span>'\n          : `<button class=\"mini ok\" data-add=\"${esc(r.name)}\">Kết bạn</button>`) + '</div>';\n    });\n  } else {\n    if (requests.length) {\n      h += '<div class=\"sec\">Lời mời kết bạn</div>';\n      requests.forEach((n) => {\n        h += `<div class=\"item\">${avatar(n)}<div class=\"grow\">@${esc(n)}</div>` +\n          `<button class=\"mini\" data-no=\"${esc(n)}\">Bỏ</button><button class=\"mini ok\" data-yes=\"${esc(n)}\">Chấp nhận</button></div>`;\n      });\n    }\n    h += '<div class=\"sec\">Bạn bè</div>';\n    if (!friends.length) h += '<div class=\"sec\" style=\"font-weight:400\">Chưa có bạn. Tìm tên người dùng ở ô phía trên để kết bạn.</div>';\n    friends.forEach((f) => {\n      h += `<button class=\"item ${f.name === cur ? 'active' : ''}\" data-open=\"${esc(f.name)}\">${avatar(f.name, f.online)}` +\n        `<div class=\"grow\">@${esc(f.name)}</div>${unread[f.name] ? `<span class=\"badge\">${unread[f.name]}</span>` : ''}</button>`;\n    });\n  }\n  el.innerHTML = h;\n}\n$('#list').addEventListener('click', (e) => {\n  const b = e.target.closest('button'); if (!b) return;\n  if (b.dataset.add) socket.emit('friend:request', b.dataset.add, (r) => {\n    if (r.error) return alert(r.error);\n    socket.emit('search', $('#q').value.trim(), (x) => { results = x; renderList(); });\n  });\n  else if (b.dataset.yes) socket.emit('friend:accept', b.dataset.yes, () => {});\n  else if (b.dataset.no) socket.emit('friend:reject', b.dataset.no);\n  else if (b.dataset.open) openChat(b.dataset.open);\n});\n\n/* ---------- Phòng chat ---------- */\nfunction openChat(name) {\n  cur = name; unread[name] = 0;\n  $('#noChat').classList.add('hidden'); $('#chatBox').classList.remove('hidden');\n  $('#app').classList.add('in-chat');\n  $('#hName').textContent = '@' + name; $('#hAv').textContent = name[0].toUpperCase();\n  refreshHeader(); renderList();\n  $('#msgs').innerHTML = '';\n  socket.emit('history', name, (list) => {\n    if (cur !== name) return;\n    if (!list.length) $('#msgs').innerHTML = '<div class=\"empty\">Hãy gửi lời chào đầu tiên 👋</div>';\n    list.forEach(addBubble); scrollDown();\n  });\n}\nfunction closeChat() { cur = null; $('#app').classList.remove('in-chat'); $('#chatBox').classList.add('hidden'); $('#noChat').classList.remove('hidden'); renderList(); }\nfunction refreshHeader() {\n  if (!cur) return;\n  const f = friends.find((x) => x.name === cur);\n  $('#hSt').textContent = f && f.online ? 'Đang hoạt động' : 'Ngoại tuyến';\n}\nfunction scrollDown() { const m = $('#msgs'); m.scrollTop = m.scrollHeight; }\n\nfunction addBubble(m) {\n  const box = $('#msgs'); const empty = box.querySelector('.empty'); if (empty) empty.remove();\n  const d = document.createElement('div'); d.className = 'b' + (m.from === me ? ' me' : '');\n  if (m.type === 'image') {\n    const img = document.createElement('img'); img.src = m.data; img.alt = 'Ảnh';\n    img.onload = scrollDown;\n    img.onclick = () => { $('#viewer img').src = m.data; $('#viewer').classList.remove('hidden'); };\n    d.appendChild(img);\n  } else d.innerHTML = linkify(m.text);\n  const t = document.createElement('span'); t.className = 'time'; t.textContent = hhmm(m.t); d.appendChild(t);\n  box.appendChild(d);\n}\n\nfunction sendText() {\n  const v = $('#text').value; if (!v.trim() || !cur) return;\n  socket.emit('msg', { to: cur, type: 'text', text: v }, (r) => r && r.error && alert(r.error));\n  $('#text').value = '';\n}\n$('#text').addEventListener('keydown', (e) => e.key === 'Enter' && sendText());\n\n$('#file').addEventListener('change', (e) => {\n  const f = e.target.files[0]; e.target.value = ''; if (!f || !cur) return;\n  const img = new Image();\n  img.onload = () => {\n    const s = Math.min(1, 1280 / Math.max(img.width, img.height));\n    const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s;\n    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);\n    socket.emit('msg', { to: cur, type: 'image', data: c.toDataURL('image/jpeg', 0.8) }, (r) => r && r.error && alert(r.error));\n    URL.revokeObjectURL(img.src);\n  };\n  img.onerror = () => alert('Không đọc được ảnh này.');\n  img.src = URL.createObjectURL(f);\n});\n\n/* ---------- Video call (WebRTC) ---------- */\n// Với mạng khắt khe (4G/NAT chặt) nên thêm máy chủ TURN vào đây.\nconst ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };\nlet pc = null, localStream = null, peer = null, incoming = null, pendingIce = [];\n\nasync function getMedia() {\n  localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });\n  $('#lv').srcObject = localStream;\n}\nfunction makePC() {\n  pc = new RTCPeerConnection(ICE);\n  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));\n  pc.ontrack = (e) => { $('#rv').srcObject = e.streams[0]; $('#callInfo').textContent = '@' + peer; };\n  pc.onicecandidate = (e) => e.candidate && socket.emit('call:ice', { to: peer, candidate: e.candidate });\n  pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc && pc.connectionState)) endCall(false); };\n}\nasync function flushIce() { for (const c of pendingIce) await pc.addIceCandidate(c).catch(() => {}); pendingIce = []; }\n\nasync function startCall() {\n  if (!cur || pc) return;\n  peer = cur;\n  try { await getMedia(); } catch { peer = null; return alert('Cần cho phép camera và micro. Lưu ý: gọi video yêu cầu HTTPS (hoặc localhost).'); }\n  $('#call').classList.remove('hidden'); $('#callInfo').textContent = 'Đang gọi @' + peer + '…';\n  makePC();\n  const offer = await pc.createOffer(); await pc.setLocalDescription(offer);\n  socket.emit('call:offer', { to: peer, sdp: offer });\n}\nasync function acceptCall() {\n  if (!incoming) return;\n  const { from, sdp } = incoming; incoming = null; $('#incoming').classList.add('hidden');\n  peer = from;\n  try { await getMedia(); } catch { socket.emit('call:end', { to: from }); peer = null; return alert('Cần cho phép camera và micro.'); }\n  $('#call').classList.remove('hidden'); $('#callInfo').textContent = 'Đang kết nối…';\n  makePC();\n  await pc.setRemoteDescription(sdp); await flushIce();\n  const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);\n  socket.emit('call:answer', { to: from, sdp: ans });\n}\nfunction declineCall() { if (incoming) socket.emit('call:end', { to: incoming.from }); incoming = null; $('#incoming').classList.add('hidden'); }\nfunction endCall(notify) {\n  if (notify && peer) socket.emit('call:end', { to: peer });\n  if (pc) pc.close(); pc = null;\n  if (localStream) localStream.getTracks().forEach((t) => t.stop()); localStream = null;\n  $('#rv').srcObject = null; $('#lv').srcObject = null;\n  $('#call').classList.add('hidden'); peer = null; pendingIce = [];\n  ['bMic', 'bCam'].forEach((id) => ($('#' + id).style.opacity = 1));\n}\nfunction toggle(kind, btn) {\n  if (!localStream) return;\n  localStream.getTracks().filter((t) => t.kind === kind).forEach((t) => { t.enabled = !t.enabled; btn.style.opacity = t.enabled ? 1 : 0.4; });\n}\nfunction bindCall() {\n  socket.on('call:offer', ({ from, sdp }) => {\n    if (pc || incoming) return socket.emit('call:end', { to: from }); // đang bận\n    incoming = { from, sdp }; $('#inName').textContent = '@' + from; $('#incoming').classList.remove('hidden');\n  });\n  socket.on('call:answer', async ({ sdp }) => { if (pc) { await pc.setRemoteDescription(sdp); await flushIce(); } });\n  socket.on('call:ice', async ({ candidate }) => {\n    if (pc && pc.remoteDescription) pc.addIceCandidate(candidate).catch(() => {}); else pendingIce.push(candidate);\n  });\n  socket.on('call:end', ({ from }) => {\n    if (incoming && incoming.from === from) { incoming = null; $('#incoming').classList.add('hidden'); }\n    if (peer === from) endCall(false);\n  });\n}\n</script>\n</body>\n</html>\n";
app.get('/', (req, res) => res.type('html').send(HTML));

// ---------- "Database" bằng file JSON (demo; production nên dùng PostgreSQL/MongoDB) ----------
const DB_FILE = path.join(__dirname, 'data.json');
let db = { users: {}, messages: [] };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}
let saveTimer;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DB_FILE, JSON.stringify(db), () => {}), 300);
};

const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const tokens = {};                 // token -> username
const online = {};                 // username -> số socket đang mở
const NAME_RE = /^[a-z0-9_]{3,20}$/;
const IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

// ---------- Đăng ký / đăng nhập ----------
function issueToken(username) {
  const t = crypto.randomBytes(24).toString('hex');
  tokens[t] = username;
  return t;
}
app.post('/api/register', (req, res) => {
  const username = String(req.body.username || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  if (!NAME_RE.test(username)) return res.status(400).json({ error: 'Tên 3–20 ký tự: chữ thường, số, dấu gạch dưới.' });
  if (password.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự.' });
  if (db.users[username]) return res.status(409).json({ error: 'Tên này đã có người dùng.' });
  const salt = crypto.randomBytes(16).toString('hex');
  db.users[username] = { salt, hash: hashPw(password, salt), friends: [], requests: [] };
  save();
  res.json({ token: issueToken(username), username });
});
app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').toLowerCase().trim();
  const u = db.users[username];
  if (!u || hashPw(String(req.body.password || ''), u.salt) !== u.hash)
    return res.status(401).json({ error: 'Sai tên hoặc mật khẩu.' });
  res.json({ token: issueToken(username), username });
});

// ---------- Socket ----------
io.use((socket, next) => {
  const name = tokens[socket.handshake.auth && socket.handshake.auth.token];
  if (!name || !db.users[name]) return next(new Error('unauthorized'));
  socket.user = name;
  next();
});

const room = (n) => 'u:' + n;
const areFriends = (a, b) => db.users[a] && db.users[a].friends.includes(b);
const friendList = (n) => db.users[n].friends.map((f) => ({ name: f, online: !!online[f] }));
const pushLists = (n) => io.to(room(n)).emit('lists', { friends: friendList(n), requests: db.users[n].requests });

io.on('connection', (socket) => {
  const me = socket.user;
  socket.join(room(me));
  online[me] = (online[me] || 0) + 1;
  pushLists(me);
  db.users[me].friends.forEach((f) => io.to(room(f)).emit('presence', { name: me, online: true }));

  socket.on('search', (q, cb) => {
    q = String(q || '').toLowerCase().trim();
    if (!q || typeof cb !== 'function') return;
    const me_ = db.users[me];
    cb(Object.keys(db.users)
      .filter((n) => n !== me && n.startsWith(q))
      .slice(0, 10)
      .map((n) => ({ name: n, friend: me_.friends.includes(n), pending: db.users[n].requests.includes(me) })));
  });

  socket.on('friend:request', (to, cb) => {
    to = String(to || '').toLowerCase();
    const target = db.users[to];
    const reply = typeof cb === 'function' ? cb : () => {};
    if (!target || to === me) return reply({ error: 'Không tìm thấy người dùng.' });
    if (areFriends(me, to)) return reply({ error: 'Đã là bạn bè.' });
    const mine = db.users[me];
    if (mine.requests.includes(to)) return acceptFriend(to, reply); // họ đã mời mình trước → kết bạn luôn
    if (!target.requests.includes(me)) target.requests.push(me);
    save();
    pushLists(to);
    reply({ ok: true });
  });

  function acceptFriend(from, reply) {
    const mine = db.users[me];
    if (!mine.requests.includes(from)) return reply({ error: 'Không có lời mời.' });
    mine.requests = mine.requests.filter((x) => x !== from);
    if (!mine.friends.includes(from)) mine.friends.push(from);
    if (!db.users[from].friends.includes(me)) db.users[from].friends.push(me);
    save();
    pushLists(me);
    pushLists(from);
    reply({ ok: true });
  }
  socket.on('friend:accept', (from, cb) => acceptFriend(String(from), typeof cb === 'function' ? cb : () => {}));
  socket.on('friend:reject', (from) => {
    db.users[me].requests = db.users[me].requests.filter((x) => x !== String(from));
    save();
    pushLists(me);
  });

  socket.on('history', (withUser, cb) => {
    if (typeof cb !== 'function' || !areFriends(me, withUser)) return;
    cb(db.messages.filter((m) => (m.from === me && m.to === withUser) || (m.from === withUser && m.to === me)).slice(-200));
  });

  socket.on('msg', (p, cb) => {
    const reply = typeof cb === 'function' ? cb : () => {};
    if (!p || !areFriends(me, p.to)) return reply({ error: 'Chỉ nhắn được cho bạn bè.' });
    const m = { id: crypto.randomUUID(), from: me, to: p.to, type: 'text', t: Date.now() };
    if (p.type === 'image') {
      if (!IMG_RE.test(String(p.data || ''))) return reply({ error: 'Ảnh không hợp lệ.' });
      m.type = 'image';
      m.data = p.data;
    } else {
      m.text = String(p.text || '').slice(0, 4000);
      if (!m.text.trim()) return;
    }
    db.messages.push(m);
    save();
    io.to(room(me)).to(room(p.to)).emit('msg', m);
    reply({ ok: true });
  });

  // ---- Báo hiệu WebRTC cho video call (chỉ chuyển tiếp giữa bạn bè) ----
  ['call:offer', 'call:answer', 'call:ice', 'call:end'].forEach((ev) => {
    socket.on(ev, (p) => {
      if (!p || !areFriends(me, p.to)) return;
      io.to(room(p.to)).emit(ev, { ...p, from: me });
    });
  });

  socket.on('disconnect', () => {
    online[me] = (online[me] || 1) - 1;
    if (online[me] <= 0) {
      delete online[me];
      db.users[me].friends.forEach((f) => io.to(room(f)).emit('presence', { name: me, online: false }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Chat chạy tại http://localhost:' + PORT));

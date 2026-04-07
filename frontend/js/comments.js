/**
 * comments.js
 * Comment system: full section on read page + inline preview on chapter list
 */

const COMMENTS = {}; // Cache in-memory store for currently loaded comments
let cmtSortMode = 'new';
let openPreviewKey = null;
let replyTarget = null; // { id: 'c123', username: 'tiendao' }
let currentSse = null; // Quản lý EventSource cho comment thời gian thực

const previewSubmitLocks = {}; // key -> true khi đang gửi comment nhanh

const commentSubmitLocks = {}; // key -> true khi đang gửi comment thường/reply

function getCmts(sid, ci) {
  if (!COMMENTS[sid]) COMMENTS[sid] = {};
  if (!COMMENTS[sid][ci]) COMMENTS[sid][ci] = [];
  return COMMENTS[sid][ci];
}

function cmtKey(sid, ci) {
  return sid + '_' + ci;
}

function countCmts(sid, ci) {
  return getCmts(sid, ci).length;
}

function canonicalCmtId(rawId) {
  if (rawId === undefined || rawId === null) return '';
  const id = String(rawId).trim();
  if (/^c\d+$/i.test(id)) return id.slice(1);
  if (/^\d+$/.test(id)) return id;
  return id;
}

function upsertCmt(list, incomingCmt) {
  if (!incomingCmt) return false;
  const incomingKey = canonicalCmtId(incomingCmt.id);
  const idx = list.findIndex(c => canonicalCmtId(c.id) === incomingKey);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...incomingCmt };
    return false;
  }
  list.unshift(incomingCmt);
  return true;
}

function formatTime(ts) {
  const delta = Date.now() - ts;
  if (delta < 60000) return 'Vừa xong';
  if (delta < 3600000) return Math.floor(delta / 60000) + ' phút trước';
  if (delta < 86400000) return Math.floor(delta / 3600000) + ' giờ trước';
  return Math.floor(delta / 86400000) + ' ngày trước';
}

function getUserAvHtml(size = 34, cls = 'cmt-av') {
  const user = curUser;
  if (!user) return `<div class="${cls}" style="width:${size}px;height:${size}px;font-size:${size * 0.5}px">?</div>`;
  const initial = user.avatarEmoji || (user.firstname && user.firstname[0] ? user.firstname[0].toUpperCase() : '?');
  const photoHtml = user.avatarPhoto ? `<img src="${user.avatarPhoto}" alt="">` : '';
  return `<div class="${cls}" style="width:${size}px;height:${size}px;font-size:${size * 0.47}px">${initial}${photoHtml}</div>`;
}

function getCommentAvHtml(cmt, size = 34, cls = 'cmt-av') {
  const initial = cmt.avatarEmoji || (cmt.username && cmt.username.length > 0 ? cmt.username[0].toUpperCase() : '?');
  const photoHtml = cmt.avatarPhoto ? `<img src="${cmt.avatarPhoto}" alt="">` : '';
  return `<div class="${cls}" style="width:${size}px;height:${size}px;font-size:${size * 0.47}px">${initial}${photoHtml}</div>`;
}

function renderWriteBox(sid, ci) {
  const area = document.getElementById('cmt-write-area');
  if (!area) return;

  if (!curUser) {
    area.innerHTML = `<div class="cmt-login-prompt">
      <p>Đăng nhập để tham gia bình luận</p>
      <button class="cmt-login-btn" onclick="openModal('login')">Đăng nhập ngay</button>
    </div>`;
    return;
  }

  area.innerHTML = `
    <div class="cmt-write">
      <div class="cmt-write-top">
        ${getUserAvHtml(34, 'cmt-write-av')}
        <div><div class="cmt-write-name">${curUser.firstname || curUser.username}</div><div class="cmt-write-sub">@${curUser.username}</div></div>
      </div>
      <textarea class="cmt-textarea" id="cmt-input" rows="3" placeholder="Chia sẻ cảm nhận về chương này..." maxlength="500" oninput="updateCharCount()"></textarea>
      <div class="cmt-write-footer">
        <span class="cmt-char-count" id="cmt-char">0 / 500</span>
        <button class="cmt-submit" onclick="submitComment(${sid},${ci})">Gửi bình luận</button>
      </div>
    </div>`;
}

function updateCharCount() {
  const input = document.getElementById('cmt-input');
  const label = document.getElementById('cmt-char');
  if (input && label) label.textContent = input.value.length + ' / 500';
}

function setSortMode(mode) {
  cmtSortMode = mode;
  document.getElementById('sort-new').classList.toggle('active', mode === 'new');
  document.getElementById('sort-top').classList.toggle('active', mode === 'top');
  if (curStory && curCh !== undefined) renderCmtList(getStoryId(curStory), curCh);
}

function renderSingleComment(cmt, sid, ci, level) {
  const isOwner = curUser && curUser.username === cmt.username;
  const deletedClass = cmt.deleted ? 'cmt-deleted' : '';
  
  // Tính toán độ thụt lùi và kích cỡ chữ: Tối đa thụt lùi 5 cấp
  const actualLevel = Math.min(level, 5);
  // Thay vì 2.5 cố định, ta nhân nó lên theo cấp level để nó móc nối dần:
  const baseMargin = window.innerWidth > 600 ? 3 : 1.5; // màn hình nhỏ lùi ít hơn
  const marginLeft = actualLevel * baseMargin;
  
  const fontSize = actualLevel > 0 ? Math.max(0.85, 1 - actualLevel * 0.03) : 1;
  const childClass = actualLevel > 0 ? 'cmt-child' : '';
  
  const replyBoxId = `reply-box-${cmt.id}`;
  
  // Móc nối trực quan: Nếu là comment con, ta thêm 1 cái icon nhánh nhỏ
  const hookHtml = actualLevel > 0 ? `<div style="position:absolute; left:-${baseMargin - 0.7}rem; top:1.2rem; border-bottom: 2px solid #555; border-left: 2px solid #555; width: ${baseMargin - 1.2}rem; height: 1rem; border-bottom-left-radius: 6px;"></div>` : '';
  
  return `
    <div class="cmt-item ${childClass}" id="cmt-${cmt.id}" style="margin-left: ${marginLeft}rem; font-size: ${fontSize}em; position: relative;">
      ${hookHtml}
      ${getCommentAvHtml(cmt, 34, 'cmt-av')}
      <div class="cmt-body">
        <div class="cmt-meta">
          <span class="cmt-username">${cmt.username}</span>
          ${isOwner && !cmt.deleted ? '<span class="cmt-badge-op">Bạn</span>' : ''}
          <span class="cmt-time">${formatTime(cmt.time)}</span>
        </div>
        <div class="cmt-text ${deletedClass}">${escHtml(cmt.text)}</div>
        ${!cmt.deleted ? `
          <div class="cmt-actions">
            <!-- Mở khung trả lời inline ngay dưới cmt hiện tại -->
            <button class="cmt-reply-btn" onclick="openInlineReply('${cmt.id}', '${escHtml(cmt.username)}', ${sid}, ${ci})">Trả lời</button>
            ${isOwner ? `<button class="cmt-delete-btn" onclick="deleteCmt('${cmt.id}',${sid},${ci})">Xóa</button>` : ''}
            ${!isOwner && typeof isAdmin === 'function' && isAdmin() ? `<button class="cmt-delete-btn cmt-admin-del" onclick="adminDeleteCmtInline('${cmt.id}',${sid},${ci})" title="Xóa với quyền Admin">🗑 Xóa (Admin)</button>` : ''}
          </div>
        ` : ''}
        <!-- Khung điền trả lời (Mặc định ẩn) -->
        <div id="${replyBoxId}" class="cmt-inline-reply" style="display: none; margin-top: 0.5rem;"></div>
      </div>
    </div>`;
}

function renderCmtList(sid, ci) {
  const list = document.getElementById('cmt-list');
  const totalEl = document.getElementById('cmt-total');
  if (!list) return;

  const rawCmts = getCmts(sid, ci);
  if (totalEl) totalEl.textContent = rawCmts.length + ' bình luận';
  
  if (!rawCmts.length) {
    list.innerHTML = `<div class="cmt-empty"><span class="cmt-empty-ico">💬</span>Chưa có bình luận nào. Hãy là người đầu tiên!</div>`;
    return;
  }

  // Tách bình luận gốc (top-level) và bình luận con (replies)
  const topLevels = [];
  const childrenMap = {}; // parentId -> [childCmts]

  rawCmts.forEach(c => {
    // Để an toàn, nếu 1 cmt có parentId nhưng parent đó bị xoá sạch mất dấu vết, ta quy nó về top level 
    const hasParent = c.parentId && rawCmts.some(p => p.id === c.parentId);
    if (!hasParent) {
      topLevels.push(c);
    } else {
      if (!childrenMap[c.parentId]) childrenMap[c.parentId] = [];
      childrenMap[c.parentId].push(c);
    }
  });

  // Sắp xếp các bình luận top-level
  if (cmtSortMode === 'new') topLevels.sort((a, b) => b.time - a.time);
  else topLevels.sort((a, b) => b.likes - a.likes);

  // Hàm đệ quy vẽ cây
  function renderTree(cmts, level) {
    let treeHtml = '';
    // Các comment con thì flow tự nhiên (cũ trước, mới sau)
    const sortedCmts = level === 0 ? cmts : cmts.sort((a, b) => a.time - b.time);
    
    sortedCmts.forEach(cmt => {
      treeHtml += renderSingleComment(cmt, sid, ci, level);
      if (childrenMap[cmt.id]) {
        treeHtml += renderTree(childrenMap[cmt.id], level + 1);
      }
    });
    return treeHtml;
  }

  list.innerHTML = renderTree(topLevels, 0);
}

function escHtml(text) {
  return typeof text === 'string' ? text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;') : '';
}

// Chuyển chapterIndex thành chapterId dùng cho API
function resolveChapterId(ci) {
  if (curStory && curStory.chList && curStory.chList[ci]) {
    return curStory.chList[ci].id;
  }
  return null;
}

function openInlineReply(cid, username, sid, ci) {
  if (!curUser) { openModal('login'); return; }
  
  // Đóng tất cả các inline reply khác trước
  document.querySelectorAll('.cmt-inline-reply').forEach(el => {
    el.style.display = 'none';
    el.innerHTML = '';
  });
  
  const box = document.getElementById(`reply-box-${cid}`);
  if (!box) return;
  
  box.style.display = 'block';
  box.innerHTML = `
    <div style="display: flex; gap: 0.5rem; flex-direction: column;">
      <span style="font-size: 0.85em; color: #888;">Trả lời <b>@${username}</b></span>
      <textarea id="inline-input-${cid}" rows="2" style="width:100%; border-radius: 4px; border: 1px solid #ccc; padding: 0.5rem; font-family: inherit; font-size: inherit;" placeholder="Viết phản hồi..."></textarea>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
         <button style="padding: 0.3rem 0.6rem; border: none; background: transparent; cursor: pointer; color: #888;" onclick="this.parentElement.parentElement.parentElement.style.display='none'">Hủy</button>
         <button style="padding: 0.3rem 0.8rem; border: none; background: #fb2c36; color: #fff; cursor: pointer; border-radius: 4px;" onclick="submitInlineComment('${cid}', ${sid}, ${ci})">Gửi</button>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById(`inline-input-${cid}`).focus(), 50);
}

// Hàm quoteReply cũ trở thành gọi vào openInlineReply (dùng cho preview cmt panel nếu cần, hoặc bỏ qua)
function quoteReply(cid, username, sid, ci, overrideParentId) {
  openInlineReply(cid, username, sid, ci);
}

function cancelReply(sid, ci) {
  replyTarget = null;
  // Bỏ logic cũ, inline form không sử dụng cái này
}

async function submitInlineComment(parentId, sid, ci) {
  if (!curUser) return;
  const lockKey = `inline:${sid}:${ci}:${parentId}`;
  if (commentSubmitLocks[lockKey]) return;
  const input = document.getElementById(`inline-input-${parentId}`);
  const text = input ? input.value.trim() : '';
  if (!text) {
    showToast('Vui lòng nhập nội dung!');
    return;
  }
  
  const chapterId = resolveChapterId(ci);
  const token = localStorage.getItem('auth_token');
  commentSubmitLocks[lockKey] = true;
  try {
    const res = await fetch('http://localhost:8080/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ chapterId: Number(chapterId), text: text, parentId: parentId })
    });

    if (res.ok) {
      const newCmt = await res.json();
      upsertCmt(getCmts(sid, ci), newCmt);
      renderCmtList(sid, ci); // Render lại toàn bộ, hàm renderTree sẽ tự nhét đúng chỗ
      if (typeof renderChapterList === 'function') renderChapterList();
      showToast('Đã trả lời bình luận!');
    } else {
      showToast('Lỗi server!');
    }
  } catch (err) {
    showToast('Lỗi gửi phản hồi!');
  }
  commentSubmitLocks[lockKey] = false;
}

async function submitComment(sid, ci) {
  if (!curUser) { openModal('login'); return; }
  const lockKey = `main:${sid}:${ci}`;
  if (commentSubmitLocks[lockKey]) return;
  const input = document.getElementById('cmt-input');
  const text = input ? input.value.trim() : '';
  if (!text) {
    showToast('Vui lòng nhập nội dung bình luận!');
    return;
  }

  const chapterId = resolveChapterId(ci);
  if (!chapterId) {
    showToast('Không lấy được thông tin chương truyện!');
    return;
  }

  const token = localStorage.getItem('auth_token');
  commentSubmitLocks[lockKey] = true;
  try {
    const payload = { chapterId: Number(chapterId), text: text };
    
    const res = await fetch('http://localhost:8080/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const newCmt = await res.json();
      upsertCmt(getCmts(sid, ci), newCmt);
      replyTarget = null; // Reset
      renderCmtList(sid, ci);
      if (input) input.value = '';
      updateCharCount();
      if (typeof renderChapterList === 'function') renderChapterList();
      showToast('Đã đăng bình luận!');
    } else {
      showToast('Lỗi khi gửi bình luận: ' + await res.text());
    }
  } catch (err) {
    console.error(err);
    showToast('Lỗi kết nối server');
  }
  commentSubmitLocks[lockKey] = false;
}

async function deleteCmt(cid, sid, ci) {
  if (!curUser) return;
  if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
  
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch('http://localhost:8080/api/comments/' + cid, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (res.ok) {
      const list = getCmts(sid, ci);
      const cmt = list.find(item => item.id === cid);
      if (cmt) {
         cmt.deleted = true;
         cmt.text = "Bình luận này đã bị xóa hoặc ẩn.";
      }
      renderCmtList(sid, ci);
      if (typeof renderChapterList === 'function') renderChapterList();
      showToast('Đã xóa bình luận');
    } else {
      showToast('Lỗi server: Không thể xóa bình luận');
    }
  } catch (err) {
    showToast('Lỗi kết nối mạng');
  }
}

async function loadComments(sid, ci) {
  cancelReply(sid, ci); // Reset reply state when changing chapter
  renderWriteBox(sid, ci); // Render text area immediately
  const listEl = document.getElementById('cmt-list');
  if (listEl) listEl.innerHTML = '<div class="cmt-empty">Đang tải bình luận...</div>';
  
  const chapterId = resolveChapterId(ci);
  if (!chapterId) {
     renderCmtList(sid, ci);
     return;
  }

  try {
    const res = await fetch(`http://localhost:8080/api/comments/chapter/${chapterId}`);
    if (res.ok) {
      const data = await res.json();
      if (!COMMENTS[sid]) COMMENTS[sid] = {};
      COMMENTS[sid][ci] = data;
      renderCmtList(sid, ci);
      
      // Khởi tạo SSE lắng nghe comment mới hoặc cập nhật xóa (real-time)
      setupRealtimeComments(sid, ci, chapterId);
    } else {
      renderCmtList(sid, ci);
    }
  } catch (err) {
    console.error("Lỗi tải comments", err);
    renderCmtList(sid, ci);
  }
}

function setupRealtimeComments(sid, ci, chapterId) {
  if (currentSse) {
      currentSse.close();
      currentSse = null;
  }
  
  try {
      currentSse = new EventSource(`http://localhost:8080/api/comments/stream/${chapterId}`);
      
      currentSse.addEventListener('message', (event) => {
          try {
              const payload = JSON.parse(event.data);
              
              if (payload.type === 'COMMENT_NEW') {
                  const newCmt = payload.data;
                  const list = getCmts(sid, ci);
                  // Kiểm tra trùng lặp (trường hợp user tự gửi comment đã lưu vào mảng rồi)
                  const inserted = upsertCmt(list, newCmt);
                  if (inserted) {
                    renderCmtList(sid, ci);
                    if (typeof renderChapterList === 'function') renderChapterList();
                  }
              } else if (payload.type === 'COMMENT_DEL') {
                  const deletedId = 'c' + payload.data; // payload.data là Integer id
                  const list = getCmts(sid, ci);
                  const cmt = list.find(c => c.id === deletedId);
                  if (cmt) {
                      cmt.deleted = true;
                      cmt.text = 'Bình luận này đã bị xóa hoặc ẩn.';
                      renderCmtList(sid, ci);
                      if (typeof renderChapterList === 'function') renderChapterList();
                  }
              }
          } catch (e) {
              console.error('SSE Message Error', e);
          }
      });
      
      currentSse.onerror = () => {
          console.warn('Mất kết nối SSE cho bình luận.');
          // EventSource tự động reconnect, nên không tắt tay
      };
      
  } catch (err) {
      console.warn("Trình duyệt không hỗ trợ EventSource hoặc lỗi kết nối. Chức năng realtime comment bị tắt.");
  }
}

function toggleChPreview(e, sid, ci) {
  e.stopPropagation();
  const key = cmtKey(sid, ci);
  const panel = document.getElementById('cpanel-' + key);
  if (!panel) return;

  if (openPreviewKey && openPreviewKey !== key) {
    const prev = document.getElementById('cpanel-' + openPreviewKey);
    if (prev) prev.classList.remove('open');
  }

  const isOpen = panel.classList.toggle('open');
  openPreviewKey = isOpen ? key : null;
  if (isOpen) {
    if (getCmts(sid, ci).length === 0) {
      // Fetch nếu chưa cache
       const chapterId = resolveChapterId(ci);
       if (chapterId) {
         fetch(`http://localhost:8080/api/comments/chapter/${chapterId}`)
           .then(r => r.json())
           .then(data => {
              if (!COMMENTS[sid]) COMMENTS[sid] = {};
              COMMENTS[sid][ci] = data;
              renderPreviewPanel(sid, ci);
           })
           .catch(() => renderPreviewPanel(sid, ci));
         return;
       }
    }
    renderPreviewPanel(sid, ci);
  }
}

function renderPreviewPanel(sid, ci) {
  const key = cmtKey(sid, ci);
  const panel = document.getElementById('cpanel-' + key);
  if (!panel) return;

  const cmts = [...getCmts(sid, ci)].sort((a, b) => b.time - a.time).slice(0, 3);
  const total = getCmts(sid, ci).length;
  const cmtHtml = cmts.length
    ? cmts.map(cmt => `<div class="preview-cmt ${cmt.deleted ? 'cmt-deleted' : ''}">
        ${getCommentAvHtml(cmt, 24, 'preview-av')}
        <div class="preview-cmt-inner">
          <span class="preview-cmt-name">${cmt.username}</span><span class="preview-cmt-text">${escHtml(cmt.text.length > 80 ? cmt.text.substring(0, 80) + '...' : cmt.text)}</span>
          <div class="preview-cmt-time">${formatTime(cmt.time)}</div>
        </div>
      </div>`).join('')
    : `<div class="preview-empty">Chưa có bình luận nào cho chương này</div>`;

  const writeHtml = curUser
    ? `<div class="preview-write-mini">
        ${getUserAvHtml(24, 'preview-av')}
        <input class="preview-write-input" id="pinput-${key}" placeholder="Viết bình luận nhanh..." maxlength="300" onkeydown="if(event.key==='Enter' && !event.shiftKey && !event.isComposing){event.preventDefault();event.stopPropagation();submitPreviewCmt(${sid},${ci});return false;}">
        <button class="preview-send" onclick="submitPreviewCmt(${sid},${ci})">Gửi</button>
      </div>`
    : `<button class="cmt-login-btn" style="width:100%;font-size:.8rem;padding:.45rem" onclick="openModal('login')">Đăng nhập để bình luận</button>`;

  panel.innerHTML = `
    <div class="preview-cmt-list">${cmtHtml}</div>
    <div class="preview-footer">
      ${total > 3 ? `<button class="preview-see-all" onclick="goToChapterComments(${sid},${ci})">Xem tất cả ${total} bình luận →</button>` : '<span></span>'}
    </div>
    <div style="margin-top:.75rem">${writeHtml}</div>`;
}

async function submitPreviewCmt(sid, ci) {
  if (!curUser) { openModal('login'); return; }
  const key = cmtKey(sid, ci);
  if (previewSubmitLocks[key]) return;
  const input = document.getElementById('pinput-' + key);
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const chapterId = resolveChapterId(ci);
  if (!chapterId) {
     showToast('Không lấy được thông tin chương truyện!');
     return;
  }
  
  const token = localStorage.getItem('auth_token');
  previewSubmitLocks[key] = true;
  try {
    const res = await fetch('http://localhost:8080/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ chapterId: Number(chapterId), text: text })
    });
    if (res.ok) {
       const newCmt = await res.json();
       upsertCmt(getCmts(sid, ci), newCmt);
       renderPreviewPanel(sid, ci);
       if (typeof renderChapterList === 'function') renderChapterList();
       showToast('Đã đăng bình luận!');
    } else {
       showToast('Lỗi khi gửi bình luận nhanh: ' + await res.text());
    }
  } catch (err) {
     showToast('Lỗi mạng khi đăng bình luận');
  } finally {
     previewSubmitLocks[key] = false;
  }
}

function goToChapterComments(_sid, ci) {
  openPreviewKey = null;
  readChapter(ci);
  setTimeout(() => {
    document.querySelector('.cmt-section')?.scrollIntoView({ behavior: 'smooth' });
  }, 300);
}

/**
 * Admin xóa comment người khác ngay trên trang truyện/đọc truyện.
 * Sử dụng API /api/admin/comments/{id} (bypass ownership check).
 */
async function adminDeleteCmtInline(cid, sid, ci) {
  if (!confirm('Xóa bình luận này? (Quyền Admin)')) return;
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch('http://localhost:8080/api/admin/comments/' + cid, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const list = getCmts(sid, ci);
      const cmt = list.find(item => item.id === cid);
      if (cmt) {
        cmt.deleted = true;
        cmt.text = 'Bình luận này đã bị admin xóa.';
      }
      renderCmtList(sid, ci);
      if (typeof renderChapterList === 'function') renderChapterList();
      showToast('✅ Đã xóa bình luận.');
    } else {
      showToast('❌ Không xóa được: ' + (await res.text()));
    }
  } catch (err) {
    showToast('❌ Lỗi kết nối mạng.');
  }
}

/**
 * admin.js
 * Admin Panel: Dashboard stats, manage users/stories/comments
 * Tất cả function ở đây đều yêu cầu role ADMIN (kiểm tra trước khi gọi)
 */

const ADMIN_API = 'http://localhost:8080/api/admin';

// ===== Cache data để filter không cần gọi API lại =====
let _adminUsers = [];
let _adminStories = [];

// ===== NAVIGATION =====

function openAdminPage() {
  if (!isAdmin()) {
    showToast('⛔ Bạn không có quyền truy cập trang này.');
    return;
  }
  showPage('admin');
  // Hiện tên admin đang đăng nhập
  const hdUser = document.getElementById('admin-hd-user');
  if (hdUser) hdUser.textContent = '👤 ' + (curUser?.firstname || curUser?.username || 'Admin');

  // Load dashboard khi mở lần đầu
  loadAdminDashboard();
}

function switchAdminTab(tab) {
  // Cập nhật nav buttons
  ['dashboard', 'users', 'stories', 'comments'].forEach(t => {
    document.getElementById('anav-' + t)?.classList.toggle('active', t === tab);
  });
  // Cập nhật content panels
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('admin-tab-' + tab)?.classList.add('active');

  // Lazy-load khi chuyển tab
  if (tab === 'users')    loadAdminUsers();
  if (tab === 'stories')  loadAdminStories();
  if (tab === 'comments') loadAdminComments();
}

// ===== DASHBOARD =====

async function loadAdminDashboard() {
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`${ADMIN_API}/stats`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Lỗi ' + res.status);
    const stats = await res.json();

    setStatNum('stat-total-users',    stats.totalUsers);
    setStatNum('stat-total-stories',  stats.totalStories);
    setStatNum('stat-total-chapters', stats.totalChapters);
    setStatNum('stat-total-comments', stats.totalComments);

    // Cập nhật sidebar counts
    document.getElementById('anav-users-count')?.setAttribute('data-val', stats.totalUsers);
    document.getElementById('anav-stories-count')?.setAttribute('data-val', stats.totalStories);
    document.getElementById('anav-comments-count')?.setAttribute('data-val', stats.totalComments);
  } catch (err) {
    console.error('[admin] loadAdminDashboard error:', err);
    showToast('Không thể tải thống kê.');
  }
}

function setStatNum(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  // Animate count up
  const target = Number(value) || 0;
  let current = 0;
  const step = Math.max(1, Math.floor(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString('vi-VN');
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ===== USERS =====

async function loadAdminUsers() {
  const token = localStorage.getItem('auth_token');
  const tbody = document.getElementById('admin-users-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="admin-loading">⏳ Đang tải...</td></tr>';

  try {
    const res = await fetch(`${ADMIN_API}/users`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Lỗi ' + res.status);
    _adminUsers = await res.json();

    document.getElementById('admin-users-sub').textContent = `${_adminUsers.length} người dùng`;
    document.getElementById('anav-users-count').textContent = _adminUsers.length;

    renderAdminUsersTable(_adminUsers);
  } catch (err) {
    console.error('[admin] loadAdminUsers error:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="admin-loading">❌ Không tải được dữ liệu.</td></tr>';
  }
}

function renderAdminUsersTable(users) {
  const tbody = document.getElementById('admin-users-body');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="admin-empty"><span class="admin-empty-ico">👥</span><div class="admin-empty-t">Không có người dùng nào.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    const verifiedIcon = u.verified === false ? '<span style="color:var(--rd);font-size:0.75rem;margin-left:5px;" title="Chưa xác minh OTP (Có thể là email rác)">⚠️ Ảo</span>' : '';
    return `
      <tr data-uid="${u.id}">
        <td style="color:var(--txt3);font-size:.78rem">#${u.id}</td>
        <td style="font-weight:600;color:var(--txt)">${escapeHtml(u.username || '')}${verifiedIcon}</td>
        <td style="color:var(--txt2);font-size:.82rem">${escapeHtml(u.email || '')}</td>
        <td style="color:var(--txt2)">${escapeHtml(u.fullName || '–')}</td>
        <td><span class="role-badge ${u.role || 'USER'}">${getRoleLabel(u.role)}</span></td>
        <td>
          <div class="btn-admin-sm-row">
            <select class="role-select" onchange="changeUserRole(${u.id}, this.value, this)">
              <option value="USER"   ${u.role === 'USER'   ? 'selected' : ''}>📚 USER</option>
              <option value="AUTHOR" ${u.role === 'AUTHOR' ? 'selected' : ''}>✍️ AUTHOR</option>
              <option value="ADMIN"  ${u.role === 'ADMIN'  ? 'selected' : ''}>👑 ADMIN</option>
            </select>
            <button class="ch-cmt-btn" style="color:var(--rd); margin-left:8px;" onclick="adminDeleteUser(${u.id}, '${escapeHtml(u.username)}')">🗑 Xóa</button>
          </div>
        </td>
      </tr>
    `
  }).join('');
}

function filterAdminUsers() {
  const q = document.getElementById('admin-user-search')?.value.trim().toLowerCase() || '';
  if (!q) { renderAdminUsersTable(_adminUsers); return; }
  const filtered = _adminUsers.filter(u =>
    (u.username || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.fullName || '').toLowerCase().includes(q)
  );
  renderAdminUsersTable(filtered);
}

async function changeUserRole(userId, newRole, selectEl) {
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`${ADMIN_API}/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ role: newRole })
    });
    if (!res.ok) throw new Error(await res.text());

    // Cập nhật badge trong row
    const row = selectEl?.closest('tr');
    if (row) {
      const badge = row.querySelector('.role-badge');
      if (badge) {
        badge.className = 'role-badge ' + newRole;
        badge.textContent = getRoleLabel(newRole);
      }
    }
    // Cập nhật cache
    const user = _adminUsers.find(u => u.id === userId);
    if (user) user.role = newRole;

    showToast(`✅ Đã đổi role thành ${newRole}`);
  } catch (err) {
    console.error('[admin] changeUserRole error:', err);
    showToast('❌ Không đổi được role: ' + err.message);
    // Revert select
    if (selectEl) {
      const user = _adminUsers.find(u => u.id === userId);
      if (user) selectEl.value = user.role;
    }
  }
}

async function adminDeleteUser(userId, username) {
  if (!confirm(`⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TÀI KHOẢN: ${username}?\nHành động này sẽ xóa sổ hoàn toàn tài khoản và không thể khôi phục!`)) return;

  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`${ADMIN_API}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error(await res.text());

    // Xóa element khỏi bảng nhanh chóng
    _adminUsers = _adminUsers.filter(u => u.id !== userId);
    const row = document.querySelector(`tr[data-uid="${userId}"]`);
    if (row) row.remove();

    showToast(`✅ Đã xóa tài khoản ${username} thành công!`);
  } catch (err) {
    showToast(`❌ Lỗi xóa: ${err.message}`);
  }
}

// ===== STORIES =====

async function loadAdminStories() {
  const tbody = document.getElementById('admin-stories-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="admin-loading">⏳ Đang tải...</td></tr>';

  try {
    // Dùng public API (đã có sẵn, không cần token)
    const res = await fetch('http://localhost:8080/api/stories');
    if (!res.ok) throw new Error('Lỗi ' + res.status);
    _adminStories = await res.json();

    document.getElementById('admin-stories-sub').textContent = `${_adminStories.length} truyện`;
    document.getElementById('anav-stories-count').textContent = _adminStories.length;

    renderAdminStoriesTable(_adminStories);
  } catch (err) {
    console.error('[admin] loadAdminStories error:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="admin-loading">❌ Không tải được dữ liệu.</td></tr>';
  }
}

function renderAdminStoriesTable(stories) {
  const tbody = document.getElementById('admin-stories-body');
  if (!tbody) return;

  if (!stories.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="admin-empty"><span class="admin-empty-ico">📚</span><div class="admin-empty-t">Không có truyện nào.</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = stories.map(s => `
    <tr data-sid="${s.id || s.storyId}">
      <td style="color:var(--txt3);font-size:.78rem">#${s.id || s.storyId}</td>
      <td style="font-weight:600;color:var(--txt);max-width:220px">
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.title || '')}</div>
      </td>
      <td style="color:var(--txt2)">${escapeHtml(s.author || '–')}</td>
      <td><span style="font-size:.75rem;color:var(--txt3)">${escapeHtml(s.genre || '–')}</span></td>
      <td style="color:var(--gold);font-size:.85rem">${formatView(s.views)}</td>
      <td>
        <div class="btn-admin-sm-row">
          <button class="btn-admin-action" onclick="openStory(${s.id || s.storyId})" title="Xem truyện">👁</button>
          <button class="btn-admin-del" onclick="adminDeleteStory(${s.id || s.storyId}, '${escapeHtml(s.title || '')}')">🗑 Xóa</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterAdminStories() {
  const q = document.getElementById('admin-story-search')?.value.trim().toLowerCase() || '';
  if (!q) { renderAdminStoriesTable(_adminStories); return; }
  const filtered = _adminStories.filter(s =>
    (s.title || '').toLowerCase().includes(q) ||
    (s.author || '').toLowerCase().includes(q) ||
    (s.genre || '').toLowerCase().includes(q)
  );
  renderAdminStoriesTable(filtered);
}

async function adminDeleteStory(storyId, title) {
  const confirmed = confirm(`⚠️ Xóa truyện "${title}"?\n\nThao tác này sẽ xóa toàn bộ chương, bình luận và dữ liệu liên quan. KHÔNG THỂ HOÀN TÁC!`);
  if (!confirmed) return;

  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`${ADMIN_API}/stories/${storyId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error(await res.text());

    // Xóa khỏi cache và rerender
    _adminStories = _adminStories.filter(s => (s.id || s.storyId) !== storyId);
    renderAdminStoriesTable(_adminStories);
    document.getElementById('admin-stories-sub').textContent = `${_adminStories.length} truyện`;
    document.getElementById('anav-stories-count').textContent = _adminStories.length;

    showToast(`✅ Đã xóa truyện "${title}"`);
    // Cũng cập nhật STORIES global nếu có
    if (typeof STORIES !== 'undefined') {
      STORIES = STORIES.filter(s => (s.id || s.storyId) !== storyId);
    }
  } catch (err) {
    console.error('[admin] adminDeleteStory error:', err);
    showToast('❌ Xóa thất bại: ' + err.message);
  }
}

// ===== COMMENTS =====

async function loadAdminComments() {
  const token = localStorage.getItem('auth_token');
  const list = document.getElementById('admin-comments-list');
  if (!list) return;

  list.innerHTML = '<div class="admin-loading">⏳ Đang tải...</div>';

  try {
    const res = await fetch(`${ADMIN_API}/comments/recent`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Lỗi ' + res.status);
    const comments = await res.json();

    document.getElementById('anav-comments-count').textContent = comments.length;

    if (!comments.length) {
      list.innerHTML = '<div class="admin-empty"><span class="admin-empty-ico">💬</span><div class="admin-empty-t">Chưa có bình luận nào.</div></div>';
      return;
    }

    list.innerHTML = comments.map(c => `
      <div class="admin-cmt-item" id="admin-cmt-${c.id}">
        <div>
          <div class="admin-cmt-user">@${escapeHtml(c.username || '?')}</div>
          <div class="admin-cmt-meta">💬 Chapter #${c.chapterId} · 🕐 ${formatDateTime(c.createdAt)}</div>
          <div class="admin-cmt-content">${escapeHtml(c.content || '')}</div>
        </div>
        <button class="btn-admin-del" onclick="adminDeleteComment(${c.id})">🗑 Xóa</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('[admin] loadAdminComments error:', err);
    list.innerHTML = '<div class="admin-loading">❌ Không tải được bình luận.</div>';
  }
}

async function adminDeleteComment(commentId) {
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`${ADMIN_API}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error(await res.text());

    // Xóa element khỏi DOM ngay
    document.getElementById('admin-cmt-' + commentId)?.remove();
    showToast('✅ Đã xóa bình luận.');
  } catch (err) {
    console.error('[admin] adminDeleteComment error:', err);
    showToast('❌ Không xóa được: ' + err.message);
  }
}

// ===== HELPERS =====

function getRoleLabel(role) {
  return { 'ADMIN': '👑 ADMIN', 'AUTHOR': '✍️ AUTHOR', 'USER': '📚 USER' }[role] || '📚 USER';
}

function formatDateTime(isoStr) {
  if (!isoStr) return '–';
  try {
    return new Date(isoStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (_) { return isoStr; }
}

/**
 * profile.js
 * Profile page: render, avatar upload/emoji, settings, save
 */

function getProfileStory(id) {
  return findStoryById(id);
}

function getProfileReadTotal() {
  try {
    const data = typeof loadReadData === 'function'
      ? loadReadData()
      : JSON.parse(localStorage.getItem('read_data') || '{}');
    if (!data) return 0;
    return Object.values(data).reduce((sum, entry) => {
      const readCount = (entry && Array.isArray(entry.read)) ? entry.read.length : 0;
      return sum + readCount;
    }, 0);
  } catch (e) {
    console.error('Error calculating total chapters:', e);
    return 0;
  }
}

async function unfollowStory(storyId) {
  if (!curUser) return;
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`http://localhost:8080/api/auth/unfollow/${storyId}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      curUser.followed = curUser.followed.filter(id => id !== Number(storyId));
      localStorage.setItem('user_info', JSON.stringify(curUser));
      updateFollowButton(); // Cập nhật nút ở trang detail nếu đang mở
      renderProfile();
      showToast('✅ Đã bỏ theo dõi!');
    }
  } catch (err) {
    showToast('❌ Lỗi kết nối!');
  }
}

// ===== PROFILE =====
function renderProfile() {
  try {
    if (!curUser) { openModal('login'); return; }
    const user = curUser;

    renderAvatar();

    const pNm = document.getElementById('prof-nm'); if (pNm) pNm.textContent = user.firstname || '';
    const pHandle = document.getElementById('prof-handle'); if (pHandle) pHandle.textContent = '@' + user.username + ' · ' + user.email;
    const pBio = document.getElementById('prof-bio-disp'); if (pBio) pBio.textContent = user.bio || 'Chưa có giới thiệu bản thân.';

    const history = user.history || [];
    const followedIds = user.followed || [];
    const followStories = followedIds.map(getProfileStory).filter(Boolean);
    const historyStories = history.map(getProfileStory).filter(Boolean);
    const totalChapters = getProfileReadTotal();

    const psFollow = document.getElementById('ps-follow');
    if (psFollow) psFollow.textContent = followStories.length;
    const psHist = document.getElementById('ps-hist');
    if (psHist) psHist.textContent = historyStories.length;
    const psChapters = document.getElementById('ps-chapters');
    if (psChapters) psChapters.textContent = totalChapters || 0;

    const fcb = document.getElementById('follow-count-badge');
    if (fcb) fcb.textContent = followStories.length + ' truyện';
    const hcb = document.getElementById('hist-count-badge');
    if (hcb) hcb.textContent = historyStories.length + ' truyện';

    const snavFollowC = document.getElementById('snav-follow-c');
    if (snavFollowC) snavFollowC.textContent = followStories.length;
    const snavHistC = document.getElementById('snav-hist-c');
    if (snavHistC) snavHistC.textContent = historyStories.length;

    const sFn = document.getElementById('s-fn'); if (sFn) sFn.value = user.firstname || '';
    const sUn = document.getElementById('s-un'); if (sUn) sUn.value = user.username || '';
    const sEm = document.getElementById('s-em'); if (sEm) sEm.value = user.email || '';
    const sBio = document.getElementById('s-bio'); if (sBio) sBio.value = user.bio || '';

    const sAvInitial = document.getElementById('s-av-initial');
    const sAvPhoto = document.getElementById('s-av-photo');
    if (sAvInitial) sAvInitial.textContent = user.avatarEmoji || (user.firstname?.[0] || '?').toUpperCase();
    if (sAvPhoto) {
      if (user.avatarPhoto) {
        sAvPhoto.src = user.avatarPhoto;
        sAvPhoto.style.display = 'block';
        if (sAvInitial) sAvInitial.style.display = 'none';
      } else {
        sAvPhoto.style.display = 'none';
        if (sAvInitial) sAvInitial.style.display = '';
      }
    }

    document.querySelectorAll('.av-preset').forEach(el => {
      el.classList.toggle('selected', el.textContent === user.avatarEmoji);
    });

    const profCoins = document.getElementById('prof-coins');
    const profVipStatus = document.getElementById('prof-vip-status');
    if (profCoins) profCoins.textContent = (user.coins || 0) + ' Coins';
    if (profVipStatus) {
      if (user.vipExpiresAt && new Date(user.vipExpiresAt) > new Date()) {
        const expirationDate = new Date(user.vipExpiresAt);
        profVipStatus.textContent = '👑 VIP - Hết hạn: ' + expirationDate.toLocaleDateString('vi-VN');
        profVipStatus.style.color = 'var(--gold)';
        document.getElementById('prof-vip-crown')?.classList.remove('is-hidden');
        const avCircle = document.getElementById('prof-av-circle');
        if (avCircle) { avCircle.style.border = '4px solid var(--gold)'; avCircle.style.boxShadow = '0 0 20px var(--gold)'; }
      } else {
        profVipStatus.textContent = 'Thành viên thường';
        profVipStatus.style.color = 'var(--txt)';
        document.getElementById('prof-vip-crown')?.classList.add('is-hidden');
        const avCircle = document.getElementById('prof-av-circle');
        if (avCircle) { avCircle.style.border = 'none'; avCircle.style.boxShadow = 'none'; }
      }
    }

    const followBox = document.getElementById('follow-content');
    if (followBox) {
      if (!followStories.length) {
        followBox.innerHTML = `<div class="empty"><span class="empty-ico">🔔</span><div class="empty-t">Chưa theo dõi truyện nào</div></div>`;
      } else {
        followBox.innerHTML = '<div class="hist-list">' + followStories.map(renderFollowCard).join('') + '</div>';
      }
    }

    const histBox = document.getElementById('hist-content');
    if (histBox) {
      if (!historyStories.length) {
        histBox.innerHTML = `<div class="empty"><span class="empty-ico">🕐</span><div class="empty-t">Chưa có lịch sử đọc</div></div>`;
      } else {
        histBox.innerHTML = '<div class="hist-list">' + historyStories.map(renderHistCard).join('') + '</div>';
      }
    }
  } catch (err) {
    console.error('renderProfile error:', err);
    showToast('⚠️ Có lỗi xảy ra khi hiển thị thông tin cá nhân.');
  }
}

function renderFollowCard(story) {
  const storyId = getStoryId(story);
  return `<div class="hist-card" onclick="openStory(${storyId})">
    <div class="hist-mini-cover">
      <div class="hist-mini-t">${story.title}</div>
      <div class="hist-mini-g">${story.genre || ''}</div>
    </div>
    <div class="hist-info">
      <div class="hist-ttl">${story.title}</div>
      <div class="hist-aut">✍ ${story.author || 'Đang cập nhật'}</div>
      ${story.status ? `<div class="hist-last">${story.status}</div>` : ''}
    </div>
    <div class="hist-actions">
      <button type="button" class="hist-btn" onclick="event.stopPropagation();unfollowStory(${storyId})">✕ Bỏ theo dõi</button>
    </div>
  </div>`;
}

function renderAvatar() {
  if (!curUser) return;
  const user = curUser;
  const baseName = user.firstname || user.fullName || user.username || '?';
  const initialValue = user.avatarEmoji || (baseName[0] || '?').toUpperCase();
  const initial = document.getElementById('prof-av-initial');
  const photo = document.getElementById('prof-av-photo');
  const hdAv = document.getElementById('hd-av');
  if (!initial || !photo) return;

  if (user.avatarPhoto) {
    initial.style.display = 'none';
    photo.src = user.avatarPhoto;
    photo.style.display = 'block';
    if (hdAv) {
      hdAv.textContent = '';
      hdAv.style.backgroundImage = `url(${user.avatarPhoto})`;
      hdAv.style.backgroundSize = 'cover';
      hdAv.style.backgroundPosition = 'center';
    }
  } else {
    photo.style.display = 'none';
    initial.style.display = '';
    initial.textContent = initialValue;
    if (hdAv) {
      const firstChar = (user.firstname?.[0] || user.fullName?.[0] || user.username?.[0] || '?').toUpperCase();
      hdAv.textContent = firstChar;
      hdAv.style.backgroundImage = '';
    }
  }
}

// ===== AVATAR FUNCTIONS =====
function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file || !curUser) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Ảnh quá lớn! Tối đa 2MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    curUser.avatarPhoto = ev.target.result;
    curUser.avatarEmoji = null;
    localStorage.setItem('user_info', JSON.stringify(curUser));
    renderAvatar();

    const sAvPhoto = document.getElementById('s-av-photo');
    const sAvInitial = document.getElementById('s-av-initial');
    if (sAvPhoto) {
      sAvPhoto.src = ev.target.result;
      sAvPhoto.style.display = 'block';
    }
    if (sAvInitial) sAvInitial.style.display = 'none';

    document.querySelectorAll('.av-preset').forEach(el => el.classList.remove('selected'));
    showToast('Đã cập nhật ảnh đại diện!');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function setEmojiAvatar(emoji) {
  if (!curUser) return;
  curUser.avatarEmoji = emoji;
  curUser.avatarPhoto = null;
  localStorage.setItem('user_info', JSON.stringify(curUser));
  renderAvatar();

  const sAvPhoto = document.getElementById('s-av-photo');
  const sAvInitial = document.getElementById('s-av-initial');
  if (sAvPhoto) sAvPhoto.style.display = 'none';
  if (sAvInitial) {
    sAvInitial.style.display = '';
    sAvInitial.textContent = emoji;
  }
  document.querySelectorAll('.av-preset').forEach(el => {
    el.classList.toggle('selected', el.textContent === emoji);
  });
  showToast('Đã đổi avatar!');
}

function resetAvatar() {
  if (!curUser) return;
  curUser.avatarEmoji = null;
  curUser.avatarPhoto = null;
  localStorage.setItem('user_info', JSON.stringify(curUser));
  renderAvatar();

  const sAvPhoto = document.getElementById('s-av-photo');
  const sAvInitial = document.getElementById('s-av-initial');
  if (sAvPhoto) sAvPhoto.style.display = 'none';
  if (sAvInitial) {
    sAvInitial.style.display = '';
    sAvInitial.textContent = (curUser.firstname[0] || '?').toUpperCase();
  }
  document.querySelectorAll('.av-preset').forEach(el => el.classList.remove('selected'));
  showToast('Đã đặt lại avatar.');
}

function renderHistCard(story) {
  const storyId = getStoryId(story);
  const rd = getRD(storyId);
  const readCount = rd.set.size;
  const total = story.chList?.length || story.chapters || 1;
  const lastIdx = rd.last;
  const pct = readCount > 0 ? Math.round((readCount / total) * 100) : 0;
  const lastChTitle = lastIdx >= 0 && story.chList?.[lastIdx] ? story.chList[lastIdx].title : '';
  const statusLabel = pct >= 100 ? 'Hoàn thành' : pct > 0 ? `${pct}% hoàn thành` : 'Chưa đọc';

  return `<div class="hist-card" onclick="openStory(${storyId})">
    <div class="hist-mini-cover">
      <div class="hist-mini-t">${story.title}</div>
      <div class="hist-mini-g">${story.genre || ''}</div>
    </div>
    <div class="hist-info">
      <div class="hist-ttl">${story.title}</div>
      <div class="hist-aut">✍ ${story.author || 'Đang cập nhật'}</div>
      ${lastChTitle ? `<div class="hist-last">▶ ${lastChTitle}</div>` : ''}
      <div class="hist-bar-row">
        <div class="hist-bar"><div class="hist-bar-fill" style="width:${pct}%"></div></div>
        <span class="hist-pct">${readCount}/${total} chương</span>
      </div>
    </div>
    <div class="hist-actions">
      <button class="hist-btn" onclick="event.stopPropagation();continueReading(${storyId},${lastIdx})">
        ${lastIdx >= 0 ? '▶ Đọc tiếp' : '📖 Bắt đầu'}
      </button>
      <div class="hist-status">${statusLabel}</div>
    </div>
  </div>`;
}

function continueReading(storyId, lastIdx) {
  curStory = findStoryById(storyId);
  if (!curStory) return;
  if (lastIdx >= 0) readChapter(lastIdx);
  else openStory(storyId);
}

function showProfileTab(tab) {
  ['follows', 'history', 'settings', 'my-stories', 'wallet', 'transactions'].forEach(name => {
    const snav = document.getElementById('snav-' + name);
    const panel = document.getElementById('ptc-' + name);
    if (snav) snav.classList.toggle('active', name === tab);
    if (panel) panel.classList.toggle('active', name === tab);
  });
  // Lazy-load khi mở các tab cần dữ liệu từ server
  if (tab === 'my-stories') loadMyStories();
  if (tab === 'transactions') loadTransactionHistory();
}

async function saveSettings() {
  if (!curUser) return;
  const fullName = document.getElementById('s-fn').value.trim();
  const bio = document.getElementById('s-bio').value.trim();
  if (!fullName) {
    showToast('Vui lòng điền đầy đủ thông tin!');
    return;
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    return;
  }
  try {
    const response = await fetch('http://localhost:8080/api/auth/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ id: curUser.id, fullName })
    });

    if (!response.ok) {
      showToast('Lỗi khi lưu thông tin!');
      return;
    }

    curUser.firstname = fullName;
    curUser.fullName = fullName;
    curUser.bio = bio;
    localStorage.setItem('user_info', JSON.stringify(curUser));
    updateHdAuth();
    renderProfile();
    showToast('Đã lưu thay đổi thành công!');
  } catch (err) {
    showToast('Không kết nối được server!');
  }
}

async function savePassword() {
  if (!curUser) return;
  const oldPass = document.getElementById('s-op').value;
  const newPass = document.getElementById('s-np').value;
  const confirm = document.getElementById('s-cp').value;

  if (!oldPass) { showToast('Vui lòng nhập mật khẩu hiện tại!'); return; }
  if (newPass.length < 8) { showToast('Mật khẩu mới phải có ít nhất 8 ký tự!'); return; }
  if (newPass !== confirm) { showToast('Mật khẩu mới không khớp!'); return; }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    return;
  }
  try {
    const response = await fetch('http://localhost:8080/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ oldPass, newPass })
    });

    if (response.ok) {
      document.getElementById('s-op').value = '';
      document.getElementById('s-np').value = '';
      document.getElementById('s-cp').value = '';
      showToast('Đã đổi mật khẩu thành công!');
    } else {
      showToast(await response.text());
    }
  } catch (err) {
    showToast('Lỗi kết nối server!');
  }
}

// ===== AUTHOR: QUẢN LÝ TRUYỆN =====

let _addChapterStoryId = null;

function toggleNewStoryForm() {
  document.getElementById('author-new-form')?.classList.toggle('is-hidden');
}

async function loadMyStories() {
  if (!curUser) return;
  const container = document.getElementById('my-stories-list');
  if (!container) return;
  
  // Lọc truyện của user hiện tại từ danh sách STORIES global
  const myStories = STORIES.filter(s => s.userId === curUser.id);
  
  if (!myStories.length) {
    container.innerHTML = `<div class="empty"><span class="empty-ico">✍️</span><div class="empty-t">Bạn chưa đăng truyện nào</div><div class="empty-sub">Bấm nút "Đăng Truyện Mới" để bắt đầu</div></div>`;
    return;
  }
  
  container.innerHTML = '<div class="hist-list">' + myStories.map(story => {
    const storyId = getStoryId(story);
    return `<div class="hist-card">
      <div class="hist-mini-cover" onclick="openStory(${storyId})" style="cursor:pointer">
        <div class="hist-mini-t">${escapeHtml(story.title)}</div>
        <div class="hist-mini-g">${escapeHtml(story.genre || '')}</div>
      </div>
      <div class="hist-info">
        <div class="hist-ttl">${escapeHtml(story.title)}</div>
        <div class="hist-aut">📖 ${story.chapters || 0} chương · 👁 ${formatView(story.views || 0)} lượt xem</div>
        <div class="hist-last">${escapeHtml(story.status || 'Đang Ra')}</div>
      </div>
      <div class="hist-actions">
        <button class="hist-btn" onclick="event.stopPropagation();openEditStory(${storyId})">⚙️ Sửa Truyện</button>
        <button class="hist-btn" onclick="event.stopPropagation();openAddChapter(${storyId},'${escapeHtml(story.title)}')">📝 Thêm Chương</button>
        <button class="hist-btn" onclick="event.stopPropagation();openStory(${storyId})">👁 Xem</button>
      </div>
    </div>`;
  }).join('') + '</div>';
}

async function submitNewStory() {
  const title = document.getElementById('ns-title')?.value.trim();
  const author = document.getElementById('ns-author')?.value.trim();
  const genre = document.getElementById('ns-genre')?.value.trim();
  const status = document.getElementById('ns-status')?.value;
  const coverUrl = document.getElementById('ns-cover')?.value.trim();
  const description = document.getElementById('ns-desc')?.value.trim();
  
  if (!title) { showToast('Vui lòng nhập tên truyện!'); return; }
  
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch('http://localhost:8080/api/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ title, author: author || curUser.firstname, genre, status, coverUrl, description })
    });
    
    if (!res.ok) {
      showToast('❌ Lỗi: ' + await res.text());
      return;
    }
    
    const saved = await res.json();
    showToast('✅ Đã đăng truyện "' + title + '"!');
    
    // Reset form
    ['ns-title','ns-author','ns-genre','ns-cover','ns-desc'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    toggleNewStoryForm();
    
    // Reload danh sách truyện toàn hệ thống
    try {
      const allRes = await fetch('http://localhost:8080/api/stories');
      if (allRes.ok) STORIES = await allRes.json();
    } catch(e) {}
    
    loadMyStories();
  } catch (e) {
    showToast('❌ Lỗi kết nối server');
  }
}

function openAddChapter(storyId, storyTitle) {
  _addChapterStoryId = storyId;
  document.getElementById('ach-story-name').textContent = storyTitle;
  document.getElementById('ach-index').value = '';
  document.getElementById('ach-title').value = '';
  document.getElementById('ach-price').value = '0';
  document.getElementById('ach-content').value = '';
  document.getElementById('add-chapter-modal')?.classList.remove('is-hidden');
  
  // Auto-set chapter index
  const story = findStoryById(storyId);
  if (story) {
    document.getElementById('ach-index').value = (story.chapters || 0) + 1;
  }
}

function closeAddChapter() {
  _addChapterStoryId = null;
  document.getElementById('add-chapter-modal')?.classList.add('is-hidden');
}

async function submitNewChapter() {
  if (!_addChapterStoryId) return;
  
  const chapterIndex = parseInt(document.getElementById('ach-index')?.value);
  const title = document.getElementById('ach-title')?.value.trim();
  const price = parseInt(document.getElementById('ach-price')?.value) || 0;
  const content = document.getElementById('ach-content')?.value.trim();
  
  if (!chapterIndex || !title) { showToast('Vui lòng nhập số thứ tự và tiêu đề chương!'); return; }
  if (!content) { showToast('Vui lòng nhập nội dung chương!'); return; }
  
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch('http://localhost:8080/api/chapters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        storyId: _addChapterStoryId,
        chapterIndex: chapterIndex,
        title: title,
        content: content,
        price: price
      })
    });
    
    if (!res.ok) {
      showToast('❌ ' + await res.text());
      return;
    }
    
    showToast('✅ Đã đăng chương "' + title + '"!');
    closeAddChapter();
    
    // Reload stories
    try {
      const allRes = await fetch('http://localhost:8080/api/stories');
      if (allRes.ok) STORIES = await allRes.json();
    } catch(e) {}
    
    loadMyStories();
  } catch (e) {
    showToast('❌ Lỗi kết nối server');
  }
}

// ===== UPLOAD COVER & EDIT STORY =====

async function uploadCoverFile(inputEl, targetInputId) {
  const file = inputEl.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('❌ Ảnh quá lớn! Tối đa 5MB.');
    inputEl.value = '';
    return;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  showToast('⏳ Đang tải ảnh lên...');
  try {
    const res = await fetch('http://localhost:8080/api/upload/cover', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      showToast('❌ Lỗi khi tải ảnh: ' + await res.text());
      return;
    }
    
    const data = await res.json();
    const targetInput = document.getElementById(targetInputId);
    if (targetInput) {
      targetInput.value = 'http://localhost:8080' + data.url;
    }
    showToast('✅ Đã tải ảnh xong!');
  } catch (e) {
    showToast('❌ Lỗi mạng khi upload.');
  } finally {
    inputEl.value = '';
  }
}

function openEditStory(storyId) {
  const story = findStoryById(storyId);
  if (!story) return;
  
  document.getElementById('es-id').textContent = storyId;
  document.getElementById('es-display-title').textContent = story.title;
  document.getElementById('es-title').value = story.title;
  document.getElementById('es-author').value = story.author || '';
  document.getElementById('es-genre').value = story.genre || '';
  document.getElementById('es-status').value = story.status || 'Đang Ra';
  document.getElementById('es-cover').value = story.coverUrl || '';
  document.getElementById('es-desc').value = story.description || '';
  
  document.getElementById('author-edit-form')?.classList.remove('is-hidden');
  document.getElementById('author-new-form')?.classList.add('is-hidden');
  document.getElementById('ptc-my-stories').scrollIntoView({behavior: 'smooth'});
}

function closeEditStoryForm() {
  document.getElementById('author-edit-form')?.classList.add('is-hidden');
}

async function submitEditStory() {
  const storyId = document.getElementById('es-id')?.textContent;
  if (!storyId) return;
  
  const title = document.getElementById('es-title')?.value.trim();
  const author = document.getElementById('es-author')?.value.trim();
  const genre = document.getElementById('es-genre')?.value.trim();
  const status = document.getElementById('es-status')?.value;
  const coverUrl = document.getElementById('es-cover')?.value.trim();
  const description = document.getElementById('es-desc')?.value.trim();
  
  if (!title) { showToast('Vui lòng nhập tên truyện!'); return; }
  
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`http://localhost:8080/api/stories/${storyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ title, author, genre, status, coverUrl, description })
    });
    
    if (!res.ok) {
      showToast('❌ Lỗi: ' + await res.text());
      return;
    }
    
    showToast('✅ Đã sửa truyện!');
    closeEditStoryForm();
    
    try {
      const allRes = await fetch('http://localhost:8080/api/stories');
      if (allRes.ok) STORIES = await allRes.json();
    } catch(e) {}
    
    loadMyStories();
  } catch (e) {
    showToast('❌ Lỗi kết nối');
  }
}

// ===== SỬA CHƯƠNG =====
let _editChapterId = null;

function closeEditChapter() {
  _editChapterId = null;
  document.getElementById('edit-chapter-modal')?.classList.add('is-hidden');
}

async function submitEditChapter() {
  if (!_editChapterId) return;
  const index = parseInt(document.getElementById('ech-index')?.value);
  const title = document.getElementById('ech-title')?.value.trim();
  const price = parseInt(document.getElementById('ech-price')?.value) || 0;
  const content = document.getElementById('ech-content')?.value.trim();
  
  if (!index || !title || !content) { showToast('Vui lòng điền đủ thông tin chương!'); return; }
  
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`http://localhost:8080/api/chapters/${_editChapterId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ chapterIndex: index, title, content, price })
    });
    
    if (!res.ok) {
      showToast('❌ Lỗi: ' + await res.text());
      return;
    }
    showToast('✅ Đã sửa chương!');
    closeEditChapter();
    if (typeof loadMyStories === 'function') loadMyStories();
  } catch(e) {
    showToast('❌ Lỗi mạng!');
  }
}

/**
 * VÍ COIN & THANH TOÁN VNPAY
 */
let selectedTopUpCoins = 0;
let selectedTopUpVnd = 0;

function setActiveCoinPackage(coins) {
  document.querySelectorAll('.coin-pkg').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.coins === coins.toString()) {
      el.classList.add('active');
    }
  });
}

window.selectCoinPkg = function(coins, vnd) {
  selectedTopUpCoins = Number(coins) || 0;
  selectedTopUpVnd = Number(vnd) || 0;
  const customInput = document.getElementById('custom-coin-input');
  if (customInput) customInput.value = '';

  setActiveCoinPackage(selectedTopUpCoins);
  updateTopUpDisplay(selectedTopUpVnd);
};

window.updateTopUpVND = function() {
  const input = document.getElementById('custom-coin-input');
  const coins = parseInt(input?.value || '', 10);
  setActiveCoinPackage(-1);

  if (isNaN(coins) || coins <= 0) {
    selectedTopUpCoins = 0;
    selectedTopUpVnd = 0;
    updateTopUpDisplay(0);
    return;
  }

  selectedTopUpCoins = coins;
  selectedTopUpVnd = coins * 10;
  updateTopUpDisplay(selectedTopUpVnd);
};

function updateTopUpDisplay(vnd) {
  const display = document.getElementById('topup-vnd-display');
  if (display) {
    display.textContent = `Giá tiền: ${vnd.toLocaleString('vi-VN')} VNĐ`;
  }
}

window.executeTopUp = async function() {
  const coinsToCharge = selectedTopUpCoins;
  const vndToCharge = selectedTopUpVnd;

  if (coinsToCharge < 1000 || vndToCharge < 10000) {
    showToast('⚠️ Số tiền nạp tối thiểu là 10.000 VNĐ (tương đương 1.000 Coins).');
    return;
  }
  
  await topUpCoins(vndToCharge);
};

async function topUpCoins(amountVnd) {
  if (!curUser) { showToast('⚠️ Bạn cần đăng nhập để nạp tiền!'); return; }
  const token = localStorage.getItem('auth_token');
  
  const btn = document.getElementById('btn-topup-execute');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⌛ Đang chuyển hướng...';
  }

  try {
    const res = await fetch(`http://localhost:8080/api/payment/vnpay/create-payment`, {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer ' + token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ amount: amountVnd })
    });
    
    if (!res.ok) { 
      const errorText = await res.text();
      showToast('❌ Lỗi: ' + (errorText || 'Không thể tạo giao dịch.')); 
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💳 Nạp Coin Ngay';
      }
      return; 
    }
    
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      showToast('❌ Lỗi: Không nhận được link thanh toán từ server.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💳 Nạp Coin Ngay';
      }
    }
  } catch (err) { 
    showToast('❌ Lỗi kết nối máy chủ!'); 
    console.error('topUpCoins error:', err);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💳 Nạp Coin Ngay';
    }
  }
}

window.buyVip = async function() {
  if (!curUser) return;
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`http://localhost:8080/api/payment/buy-vip`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { showToast('❌ Lỗi: ' + await res.text()); return; }
    const nextUser = await res.json();
    curUser = typeof normalizeUserState === 'function' ? normalizeUserState(nextUser) : nextUser;
    localStorage.setItem('user_info', JSON.stringify(curUser));
    if (typeof updateHdAuth === 'function') updateHdAuth();
    renderProfile();
    showToast('✅ Đăng ký VIP thành công!');
  } catch (err) { showToast('❌ Lỗi kết nối máy chủ!'); }
};

/**
 * LỊCH SỬ GIAO DỊCH
 */
const TX_TYPE_MAP = {
  'TOPUP':          { label: 'Nạp Coin (Demo)',    icon: '💰', color: '#4a9068' },
  'TOPUP_VNPAY':    { label: 'Nạp Coin (VNPay)',   icon: '💳', color: '#4a9068' },
  'VIP':            { label: 'Mua VIP',             icon: '👑', color: '#c9a84c' },
  'UNLOCK_CHAPTER': { label: 'Mở khóa chương',     icon: '🔓', color: '#e07b39' },
};

window.loadTransactionHistory = async function() {
  const container = document.getElementById('tx-history-content');
  if (!container) return;
  if (!curUser) {
    container.innerHTML = '<div class="tx-empty">Bạn cần đăng nhập để xem lịch sử giao dịch.</div>';
    return;
  }

  container.innerHTML = '<div class="tx-empty">⏳ Đang tải...</div>';
  const token = localStorage.getItem('auth_token');

  try {
    const res = await fetch('http://localhost:8080/api/payment/transactions', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) {
      container.innerHTML = '<div class="tx-empty">❌ Không thể tải lịch sử. Vui lòng thử lại.</div>';
      return;
    }

    const txList = await res.json();

    if (!txList || txList.length === 0) {
      container.innerHTML = `
        <div class="tx-empty">
          <div style="font-size:3rem;margin-bottom:1rem;">📭</div>
          <div>Chưa có giao dịch nào.</div>
          <div style="font-size:0.85rem;margin-top:0.5rem;color:var(--txt3)">Hãy nạp Coin hoặc mở khóa chương để thấy lịch sử tại đây.</div>
        </div>`;
      return;
    }

    // Tính tổng thống kê
    const totalIn  = txList.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalOut = txList.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    container.innerHTML = `
      <div class="tx-summary">
        <div class="tx-sum-item tx-sum-in">
          <div class="tx-sum-label">Tổng Nạp</div>
          <div class="tx-sum-val">+${totalIn.toLocaleString('vi-VN')} <small>Coins</small></div>
        </div>
        <div class="tx-sum-item tx-sum-out">
          <div class="tx-sum-label">Tổng Chi</div>
          <div class="tx-sum-val">-${totalOut.toLocaleString('vi-VN')} <small>Coins</small></div>
        </div>
        <div class="tx-sum-item">
          <div class="tx-sum-label">Số Giao Dịch</div>
          <div class="tx-sum-val">${txList.length}</div>
        </div>
      </div>
      <div class="tx-table-wrap">
        <table class="tx-table">
          <thead>
            <tr>
              <th>Loại</th>
              <th>Mô tả</th>
              <th>Số Coin</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            ${txList.map(tx => {
              const info = TX_TYPE_MAP[tx.type] || { label: tx.type, icon: '🔄', color: 'var(--txt2)' };
              const amtSign = tx.amount > 0 ? '+' : '';
              const amtColor = tx.amount > 0 ? '#4a9068' : '#c44b3a';
              const date = tx.createdAt
                ? new Date(tx.createdAt).toLocaleString('vi-VN', { hour12: false })
                : '—';
              const chText = tx.chapterId ? `<div class="tx-sub">Chương #${tx.chapterId}</div>` : '';
              return `
                <tr class="tx-row">
                  <td>
                    <span class="tx-badge" style="background:${info.color}20;color:${info.color};border:1px solid ${info.color}40;">
                      ${info.icon} ${info.label}
                    </span>
                  </td>
                  <td>
                    <span class="tx-desc">${info.label}</span>
                    ${chText}
                  </td>
                  <td style="color:${amtColor};font-weight:700;font-size:1.05rem;">
                    ${amtSign}${tx.amount.toLocaleString('vi-VN')}
                  </td>
                  <td class="tx-date">${date}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error('loadTransactionHistory error:', err);
    container.innerHTML = '<div class="tx-empty">❌ Lỗi kết nối máy chủ!</div>';
  }
};

/* CSS nội tuyến cho bảng lịch sử giao dịch */
(function injectTxCSS() {
  const style = document.createElement('style');
  style.id = 'tx-history-styles';
  style.textContent = `
    .tx-empty { text-align:center; padding:3rem 1rem; color:var(--txt3); }
    .tx-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem; }
    .tx-sum-item { background:rgba(255,255,255,0.03); border:1px solid var(--bdr); border-radius:12px; padding:1rem 1.25rem; text-align:center; }
    .tx-sum-label { font-size:0.8rem; color:var(--txt3); margin-bottom:0.4rem; }
    .tx-sum-val { font-size:1.4rem; font-weight:700; color:var(--txt); }
    .tx-sum-val small { font-size:0.75rem; font-weight:400; color:var(--txt3); }
    .tx-sum-in .tx-sum-val { color:#4a9068; }
    .tx-sum-out .tx-sum-val { color:#c44b3a; }
    .tx-table-wrap { overflow-x:auto; border-radius:12px; border:1px solid var(--bdr); }
    .tx-table { width:100%; border-collapse:collapse; font-size:0.9rem; }
    .tx-table thead tr { background:rgba(201,168,76,0.08); }
    .tx-table th { padding:0.85rem 1rem; text-align:left; font-size:0.78rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--txt3); border-bottom:1px solid var(--bdr); white-space:nowrap; }
    .tx-row { border-bottom:1px solid var(--bdr); transition:background .2s; }
    .tx-row:last-child { border-bottom:none; }
    .tx-row:hover { background:rgba(255,255,255,0.02); }
    .tx-table td { padding:0.9rem 1rem; vertical-align:middle; }
    .tx-badge { display:inline-flex; align-items:center; gap:0.35rem; padding:0.25rem 0.6rem; border-radius:99px; font-size:0.78rem; font-weight:600; white-space:nowrap; }
    .tx-desc { font-weight:500; color:var(--txt); }
    .tx-sub { font-size:0.78rem; color:var(--txt3); margin-top:2px; }
    .tx-date { color:var(--txt3); font-size:0.82rem; white-space:nowrap; }
    @media(max-width:600px) {
      .tx-summary { grid-template-columns:1fr 1fr; }
      .tx-table th:nth-child(2), .tx-table td:nth-child(2) { display:none; }
    }
  `;
  if (!document.getElementById('tx-history-styles')) document.head.appendChild(style);
})();

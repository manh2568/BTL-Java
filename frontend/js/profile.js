/**
 * profile.js
 * Profile page: render, avatar upload/emoji, settings, save
 */

function getProfileStory(id) {
  return findStoryById(id);
}

function getProfileReadTotal() {
  const data = typeof loadReadData === 'function'
    ? loadReadData()
    : JSON.parse(localStorage.getItem('read_data') || '{}');
  return Object.values(data).reduce((sum, entry) => sum + (entry.read?.length || 0), 0);
}

// ===== PROFILE =====
function renderProfile() {
  if (!curUser) { openModal('login'); return; }
  const user = curUser;

  renderAvatar();

  document.getElementById('prof-nm').textContent = user.firstname;
  document.getElementById('prof-handle').textContent = '@' + user.username + ' · ' + user.email;
  document.getElementById('prof-bio-disp').textContent = user.bio || 'Chưa có giới thiệu bản thân.';

  const history = user.history || [];
  const followedIds = user.followed || [];
  const followStories = followedIds.map(getProfileStory).filter(Boolean);
  const historyStories = history.map(getProfileStory).filter(Boolean);
  const totalChapters = getProfileReadTotal();

  const psFollow = document.getElementById('ps-follow');
  if (psFollow) psFollow.textContent = followStories.length;
  document.getElementById('ps-hist').textContent = historyStories.length;
  document.getElementById('ps-chapters').textContent = totalChapters;
  const fcb = document.getElementById('follow-count-badge');
  if (fcb) fcb.textContent = followStories.length + ' truyện';
  const hcb = document.getElementById('hist-count-badge');
  if (hcb) hcb.textContent = historyStories.length + ' truyện';
  const snavFollowC = document.getElementById('snav-follow-c');
  if (snavFollowC) snavFollowC.textContent = followStories.length;
  document.getElementById('snav-hist-c').textContent = historyStories.length;

  document.getElementById('s-fn').value = user.firstname;
  document.getElementById('s-un').value = user.username;
  document.getElementById('s-em').value = user.email;
  document.getElementById('s-bio').value = user.bio || '';

  const sAvInitial = document.getElementById('s-av-initial');
  const sAvPhoto = document.getElementById('s-av-photo');
  if (sAvInitial) sAvInitial.textContent = user.avatarEmoji || (user.firstname[0] || '?').toUpperCase();
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

  const followBox = document.getElementById('follow-content');
  if (followBox) {
    if (!followStories.length) {
      followBox.innerHTML =
        `<div class="empty"><span class="empty-ico">🔔</span><div class="empty-t">Chưa theo dõi truyện nào</div><div class="empty-sub">Vào trang truyện và bấm 🔔 Theo dõi</div><button class="empty-cta" onclick="goHome()">🔍 Khám phá truyện</button></div>`;
    } else {
      followBox.innerHTML =
        '<div class="hist-list">' + followStories.map(renderFollowCard).join('') + '</div>';
    }
  }

  if (!historyStories.length) {
    document.getElementById('hist-content').innerHTML =
      `<div class="empty"><span class="empty-ico">🕐</span><div class="empty-t">Chưa có lịch sử đọc</div><div class="empty-sub">Bắt đầu đọc truyện để lưu lịch sử</div><button class="empty-cta" onclick="goHome()">📖 Đọc ngay</button></div>`;
  } else {
    document.getElementById('hist-content').innerHTML =
      '<div class="hist-list">' + historyStories.map(renderHistCard).join('') + '</div>';
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
  const initialValue = user.avatarEmoji || (user.firstname[0] || '?').toUpperCase();
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
      hdAv.textContent = (user.firstname[0] || '?').toUpperCase();
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
  ['follows', 'history', 'settings', 'my-stories'].forEach(name => {
    const snav = document.getElementById('snav-' + name);
    const panel = document.getElementById('ptc-' + name);
    if (snav) snav.classList.toggle('active', name === tab);
    if (panel) panel.classList.toggle('active', name === tab);
  });
  // Lazy-load khi mở tab "Truyện của tôi"
  if (tab === 'my-stories') loadMyStories();
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
        content: content
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
      body: JSON.stringify({ chapterIndex: index, title, content })
    });
    
    if (!res.ok) {
      showToast('❌ Lỗi: ' + await res.text());
      return;
    }
    showToast('✅ Đã sửa chương!');
    closeEditChapter();
  } catch(e) {
    showToast('❌ Lỗi mạng!');
  }
}

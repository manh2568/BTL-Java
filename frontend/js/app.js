/**
 * app.js
 * Core app: navigation, render cards, home, search, reading, chapter tracking
 */

let heroStories = [];
let heroIndex = 0;
let heroTimer = null;
const DEFAULT_STORY_COVER = 'image/kiem-lai.jpg';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ellipsize(text, maxLen = 140) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (raw.length <= maxLen) return raw;
  const cut = raw.slice(0, maxLen + 1);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > Math.floor(maxLen * 0.6)) {
    return cut.slice(0, lastSpace).trimEnd() + '...';
  }
  return raw.slice(0, maxLen).trimEnd() + '...';
}

function getStoryId(story) {
  return Number(story?.id ?? story?.storyId ?? -1);
}

function findStoryById(id) {
  const targetId = Number(id);
  return STORIES.find(story => getStoryId(story) === targetId) || null;
}

function normalizeUserState(user) {
  if (!user) return null;
  user.firstname = user.firstname || user.fullName || user.username || 'User';
  user.readData = user.readData || {};
  user.history = Array.isArray(user.history) ? user.history.map(Number) : [];
  user.followed = Array.isArray(user.followed)
    ? [...new Set(user.followed.map(Number))].filter(n => !Number.isNaN(n))
    : [];
  return user;
}

/** Xóa key localStorage cũ (trùng với user_info.followed) */
function removeLegacyFollowStorageKeys() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('javatruyen_followed_')) localStorage.removeItem(k);
    }
  } catch (_) {}
}

function restoreSession() {
  try {
    const rawUser = localStorage.getItem('user_info');
    if (!rawUser) return;
    curUser = normalizeUserState(JSON.parse(rawUser));
    if (typeof updateHdAuth === 'function') updateHdAuth();
    applyRoleUI(); // Áp dụng UI theo role ngay khi restore
  } catch (error) {
    console.warn('Không thể khôi phục user từ localStorage.', error);
  }
}

// ===== ROLE HELPERS =====

/** Lấy role hiện tại của user (Đối chiếu với enum backend: USER / AUTHOR / ADMIN) */
function getCurrentRole() {
  return curUser?.role || 'USER';
}

function isAdmin() {
  return getCurrentRole() === 'ADMIN';
}

function isAuthorOrAdmin() {
  const role = getCurrentRole();
  return role === 'AUTHOR' || role === 'ADMIN';
}

/**
 * Áp dụng ẩn/hiện UI theo role sau khi login hoặc restore session.
 * Gọi sau loginOK() và restoreSession().
 */
function applyRoleUI() {
  if (!curUser) return;

  // Badge role trong trang profile
  const roleBadgeEl = document.getElementById('prof-role-badge');
  if (roleBadgeEl) {
    const roleLabels = {
      'ADMIN': { text: '👑 Quản trị viên', cls: 'role-admin' },
      'AUTHOR': { text: '✍️ Tác giả', cls: 'role-author' },
      'USER':   { text: '📚 Độc giả',       cls: 'role-user' }
    };
    const rb = roleLabels[curUser.role] || roleLabels['USER'];
    roleBadgeEl.textContent = rb.text;
    roleBadgeEl.className = 'prof-role-badge ' + rb.cls;
  }

  // Section "Truyện của tôi" trong sidebar profile (chỉ AUTHOR + ADMIN)
  const authorSection = document.getElementById('snav-author-section');
  const authorDiv = document.getElementById('snav-author-div');
  if (authorSection) {
    if (isAuthorOrAdmin()) {
      authorSection.classList.remove('is-hidden');
      authorDiv?.classList.remove('is-hidden');
    } else {
      authorSection.classList.add('is-hidden');
      authorDiv?.classList.add('is-hidden');
    }
  }
}

/** Nút "Quản Trị" trong dropdown chỉ hiện với ADMIN — chuyển sang trang admin panel */
function goAdminPanel() {
  closeDD();
  if (typeof openAdminPage === 'function') {
    openAdminPage();
  } else {
    showToast('⏳ Trang quản trị đang tải...');
  }
}

// ===== NAV =====
function showPage(pg) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById('page-' + pg)?.classList.add('active');
  window.scrollTo(0, 0);
}

function goHome(push = true) {
  showPage('home');
  if (push) history.pushState({ page: 'home' }, '', '#home');
}
function goDetail() { if (curStory) openStory(getStoryId(curStory)); else showPage('detail'); }
function goProfile(push = true) {
  renderProfile(); showPage('profile'); showProfileTab('history');
  if (push) history.pushState({ page: 'profile' }, '', '#profile');
}
function goProfileTab(t) { renderProfile(); showProfileTab(t); showPage('profile'); }
function openFeaturedStory() {
  const featured = heroStories[heroIndex] || findStoryById(4) || STORIES[0];
  if (featured) openStory(getStoryId(featured));
}
function getStoryCover(story) {
  const cover = story && typeof story.coverUrl === 'string' ? story.coverUrl.trim() : '';
  return cover || DEFAULT_STORY_COVER;
}

function setCoverBackground(el, coverUrl) {
  if (!el) return;
  const main = (coverUrl || '').replace(/"/g, '\\"');
  const fallback = DEFAULT_STORY_COVER.replace(/"/g, '\\"');
  el.style.backgroundImage = `url("${main}"), url("${fallback}")`;
  el.classList.add('has-cover');
}

function formatLatestChaptersForCard(story) {
  const list = Array.isArray(story.latestChapters) ? story.latestChapters : [];
  if (!list.length) {
    return '<span class="latest-ch-line muted">Chưa có chương</span>';
  }
  return list.slice(0, 2).map(ch => {
    const ttl = escapeHtml(ch.title || 'Không tiêu đề');
    return `<span class="latest-ch-line">${ttl}</span>`;
  }).join('');
}

function renderHeroDots() {
  const dotsBox = document.getElementById('hero-dots');
  if (!dotsBox) return;
  dotsBox.innerHTML = heroStories.map((_, index) =>
    `<button class="hero-dot ${index === heroIndex ? 'active' : ''}" onclick="goHeroSlide(${index})" aria-label="Slide ${index + 1}"></button>`
  ).join('');
}

function renderHeroSlide() {
  if (!heroStories.length) return;
  const story = heroStories[heroIndex];
  if (!story) return;

  const titleEl = document.getElementById('hero-title');
  const descEl = document.getElementById('hero-desc');
  const genreEl = document.getElementById('hero-meta-genre');
  const chapterEl = document.getElementById('hero-meta-chapters');
  const viewsEl = document.getElementById('hero-meta-views');
  const coverEl = document.getElementById('hero-book-cv');
  const coverTitleEl = document.getElementById('book-cv-title');
  const coverAuthorEl = document.getElementById('book-cv-author');
  const coverMetaEl = document.getElementById('book-cv-meta');

  if (titleEl) titleEl.innerHTML = `${escapeHtml(story.title || 'Truyện mới')}<br><em>Đang cập nhật</em>`;
  if (descEl) {
    const fallback = 'Nội dung miêu tả của truyện đang được cập nhật.';
    descEl.textContent = ellipsize(story.description || fallback, 140);
  }
  if (genreEl) genreEl.textContent = story.genre || 'Đang cập nhật';
  if (chapterEl) chapterEl.textContent = String(story.chapters || 0);
  if (viewsEl) viewsEl.textContent = formatView(story.views || 0);

  if (coverEl) {
    const cover = getStoryCover(story);
    setCoverBackground(coverEl, cover);
    coverEl.onclick = () => openStory(getStoryId(story));
  }

  if (coverTitleEl) coverTitleEl.textContent = story.title || 'Truyện đã đăng';
  if (coverAuthorEl) coverAuthorEl.textContent = story.author || 'Đang cập nhật';
  if (coverMetaEl) coverMetaEl.textContent = `${story.genre || 'Đang cập nhật'} · ${story.chapters || 0} chương`;

  renderHeroDots();
}

function startHeroAutoSlide() {
  if (heroTimer) clearInterval(heroTimer);
  if (heroStories.length <= 1) return;
  heroTimer = setInterval(() => {
    nextHeroSlide();
  }, 5000);
}

function initHeroSlider() {
  heroStories = [...STORIES]
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .slice(0, 5);
  heroIndex = 0;
  renderHeroSlide();
  startHeroAutoSlide();
}

window.nextHeroSlide = function() {
  if (!heroStories.length) return;
  heroIndex = (heroIndex + 1) % heroStories.length;
  renderHeroSlide();
};

window.prevHeroSlide = function() {
  if (!heroStories.length) return;
  heroIndex = (heroIndex - 1 + heroStories.length) % heroStories.length;
  renderHeroSlide();
};

window.goHeroSlide = function(index) {
  if (!heroStories.length) return;
  const parsed = Number(index);
  heroIndex = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, heroStories.length - 1));
  renderHeroSlide();
};

function scrollToSection(id) {
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50);
}

// ===== RENDER CARD =====
function renderCard(story) {
  const storyId = getStoryId(story);
  const badgeText = story.badge === 'new' ? 'MỚI' : 'HOT';

  return `
    <div class="scard" onclick="openStory(${storyId})">
      <div class="sthumb">
        <img
          src="${getStoryCover(story)}"
          alt="${story.title}"
          style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0"
          onerror="this.onerror=null;this.src='image/kiem-lai.jpg'"
        >
        ${story.badge ? `<div class="sbadge ${story.badge}">${badgeText}</div>` : ''}
        <div style="position:relative;z-index:1;margin-top:auto;width:100%;padding:1rem;background:linear-gradient(to top, rgba(13,11,8,.92), rgba(13,11,8,.15))">
          <div class="sthumb-t">${story.title}</div>
          <div class="sthumb-d"></div>
          <div class="sthumb-g">${story.genre || 'Đang cập nhật'}</div>
        </div>
      </div>
      <div class="sname">${story.title}</div>
      <div class="sinfo">${story.author || 'Đang cập nhật'}</div>
      <div class="sinfo latest-ch">${formatLatestChaptersForCard(story)}</div>
    </div>
  `;
}

function renderStories() {
  const newBox = document.getElementById('new-stories');
  if (newBox && STORIES.length > 0) {
    const byUpdate = [...STORIES].sort((a, b) => {
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return db - da; // Mới nhất lên đầu
    });
    newBox.innerHTML = byUpdate.slice(0, 4).map(renderCard).join('');
  }

  const hotBox = document.getElementById('hot-stories');
  if (hotBox && STORIES.length > 0) {
    const hotList = [...STORIES].sort((a, b) => Number(b.views) - Number(a.views));
    hotBox.innerHTML = hotList.slice(0, 4).map(renderCard).join('');
  }

  const listBox = document.getElementById('list-stories');
  if (listBox && STORIES.length > 0) {
    listBox.innerHTML = STORIES.map(renderCard).join('');
  }
}

function renderRank(story, rank) {
  const cls = rank <= 3 ? ['t1', 't2', 't3'][rank - 1] : 'tx';
  return `<div class="rank-item" onclick="openStory(${getStoryId(story)})">
    <div class="rank-n ${cls}">${rank}</div>
    <div class="rank-info"><div class="rank-ttl">${story.title}</div><div class="rank-meta">${story.genre} · ${story.author}</div></div>
    <div class="rank-v">${formatView(story.views)}</div>
  </div>`;
}

// ===== HOME =====
function initHome() {
  const newStories = document.getElementById('new-stories');
  const hotStories = document.getElementById('hot-stories');
  const rankList = document.getElementById('rank-list');
  if (!newStories || !hotStories || !rankList) return;

  const byUpdate = [...STORIES].sort((a, b) => {
    const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return db - da;
  });
  const byViews = [...STORIES].sort((a, b) => Number(b.views) - Number(a.views));
  
  newStories.innerHTML = byUpdate.slice(0, 6).map(renderCard).join('');
  hotStories.innerHTML = byViews.slice(0, 4).map(renderCard).join('');
  rankList.innerHTML = byViews.slice(0, 6).map((story, index) => renderRank(story, index + 1)).join('');

  // Render động thể loại và đếm số truyện
  const homeGenres = document.getElementById('home-genres');
  if (homeGenres) {
    // Khởi tạo các thể loại mặc định với số lượng 0
    const defaultGenres = ['Tiên Hiệp', 'Kiếm Hiệp', 'Ngôn Tình', 'Trinh Thám', 'Dị Năng', 'Huyền Huyễn', 'Đô Thị', 'Lịch Sử'];
    const genreCounts = {};
    defaultGenres.forEach(g => genreCounts[g] = 0);

    // Đếm số truyện thực tế
    if (STORIES && STORIES.length > 0) {
      STORIES.forEach(s => {
        if (!s.genre) return;
        s.genre.split(',').forEach(g => {
          const catName = g.trim();
          if (catName) genreCounts[catName] = (genreCounts[catName] || 0) + 1;
        });
      });
    }

    // Lấy top 8 thể loại có nhiều truyện nhất (nếu bằng thì xếp theo bảng chữ cái)
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 8);
      
    homeGenres.innerHTML = topGenres.map(([catNm, count]) => `
      <div class="cat-btn" onclick="showCat('${escapeHtml(catNm)}')">
        <span class="cat-nm">${escapeHtml(catNm)}</span>
        <span class="cat-ct">${count.toLocaleString('vi-VN')} truyện</span>
      </div>
    `).join('');
  }
}

// ===== CATEGORIES / SEARCH =====
function showCat(cat, push = true) {
  const catLower = cat.trim().toLowerCase();
  const result = STORIES.filter(story => {
    if (!story.genre) return false;
    const genres = story.genre.split(',').map(g => g.trim().toLowerCase());
    return genres.includes(catLower);
  });
  document.getElementById('list-ttl').textContent = cat;
  document.getElementById('list-ct').textContent = result.length + ' truyện';
  document.getElementById('list-stories').innerHTML =
    result.map(renderCard).join('') ||
    '<p class="err-msg">Chưa có truyện.</p>';
  showPage('list');
  if (push) history.pushState({ page: 'cat', id: cat }, '', '#cat/' + encodeURIComponent(cat));
}

function doSearch(push = true) {
  const input = document.getElementById('search-input');
  const query = input?.value.trim().toLowerCase();
  
  // Nếu input rỗng (người dùng xóa hết text tìm kiếm), quay lại trang chủ
  if (!query) {
    goHome();
    return;
  }

  const result = STORIES.filter(story =>
    (story.title || '').toLowerCase().includes(query) ||
    (story.author || '').toLowerCase().includes(query) ||
    (story.genre || '').toLowerCase().includes(query)
  );

  document.getElementById('list-ttl').textContent = `Tìm: "${input.value}"`;
  document.getElementById('list-ct').textContent = result.length + ' kết quả';
  document.getElementById('list-stories').innerHTML =
    result.map(renderCard).join('') ||
    '<p class="err-msg">Không tìm thấy kết quả nào.</p>';
  showPage('list');
  if (push) history.pushState({ page: 'search', id: query }, '', '#search/' + encodeURIComponent(query));
}

// Gọi tìm kiếm từ bên ngoài (ấn vào tag tác giả v.v.)
window.forceSearch = function(query) {
  const input = document.getElementById('search-input');
  if (input) input.value = query;
  doSearch();
};

function showAll(type, push = true) {
  let result = [];
  let title = '';

  if (type === 'new') {
    result = [...STORIES].reverse();
    title = 'Mới Cập Nhật';
  } else if (type === 'hot') {
    result = [...STORIES].sort((a, b) => Number(b.views) - Number(a.views));
    title = 'Truyện Hot';
  }

  document.getElementById('list-ttl').textContent = title;
  document.getElementById('list-ct').textContent = result.length + ' truyện';
  document.getElementById('list-stories').innerHTML = result.map(renderCard).join('');
  showPage('list');
  if (push) history.pushState({ page: 'list', id: type }, '', '#list/' + type);
}

// ===== READ TRACKING =====

async function syncReadingProgress() {
  if (!curUser) return;
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  try {
    console.log('[sync] 🔄 Đang gọi GET /api/progress/me ...');
    const response = await fetch('http://localhost:8080/api/progress/me', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Cache-Control': 'no-cache, no-store'
      },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[sync] ✅ Dữ liệu từ server:', JSON.stringify(data));
      
      // MERGE dữ liệu server với local (không xóa trắng!)
      if (!curUser.readData) curUser.readData = {};
      if (!curUser.history) curUser.history = [];
      const localData = JSON.parse(localStorage.getItem('read_data') || '{}');

      data.forEach(item => {
        const key = String(item.novelId);
        const serverRead = item.read || [];
        const serverLast = item.last;
        
        // Lấy data local hiện tại (nếu có)
        const localRD = curUser.readData[key];
        const localArr = localRD ? (localRD.arr || []) : [];
        const localLast = localRD ? localRD.last : -1;
        
        // MERGE: hợp nhất mảng đã đọc, lấy last lớn nhất
        const mergedArr = [...new Set([...serverRead, ...localArr])].sort((a,b) => a - b);
        const mergedLast = Math.max(serverLast, localLast);
        
        curUser.readData[key] = { last: mergedLast, arr: mergedArr };
        localData[key] = { last: mergedLast, read: mergedArr };
        
        // Thêm novelId vào lịch sử truyện đã đọc
        if (!curUser.history.includes(item.novelId)) {
          curUser.history.push(item.novelId);
        }
      });

      localStorage.setItem('read_data', JSON.stringify(localData));
      localStorage.setItem('user_info', JSON.stringify(curUser));
      console.log('[sync] ✅ Đã MERGE curUser.readData:', JSON.stringify(curUser.readData));
      
      // Nếu đang mở trang profile ở tab lịch sử, hãy render lại
      if (typeof renderProfile === 'function' && document.getElementById('page-profile')?.classList.contains('active')) {
         renderProfile();
      }
      
      // Cập nhật UI trang detail nếu đang mở
      if (document.getElementById('page-detail')?.classList.contains('active') && curStory) {
        updateDetailProgress();
      }
      if (typeof renderChapterList === 'function') renderChapterList();
    }
  } catch (err) {
    console.error("[sync] Lỗi đồng bộ tiến độ đọc:", err);
  }
}

// Hàm cập nhật UI tiến độ trên trang Detail
function updateDetailProgress() {
  if (!curStory || !curStory.chList) return;
  const storyId = getStoryId(curStory);
  const rd = getRD(storyId);
  const total = curStory.chList.length;
  const readCount = rd.set.size;
  
  const progressWrap = document.getElementById('d-progress');
  const btnRead = document.getElementById('d-btn-read');
  if (!progressWrap || !btnRead) return;
  
  if (readCount > 0 && total > 0) {
    progressWrap.classList.remove('is-hidden');
    progressWrap.style.display = 'block';
    document.getElementById('d-prog-val').textContent = `${readCount} / ${total} chương`;
    document.getElementById('d-prog-fill').style.width = Math.round((readCount / total) * 100) + '%';
    const last = rd.last;
    btnRead.textContent = `▶ Đọc Tiếp (${last + 1})`;
    btnRead.onclick = () => readChapter(last);
  } else {
    progressWrap.classList.add('is-hidden');
    progressWrap.style.display = 'none';
    btnRead.textContent = '📖 Đọc Từ Đầu';
    btnRead.onclick = () => readChapter(0);
  }
}

function getRD(storyId) {
  // Chỉ có tiến độ khi đã đăng nhập (đồng bộ DB + read_data theo tài khoản)
  if (!curUser) {
    return { last: -1, set: new Set() };
  }
  const key = String(storyId);
  if (curUser.readData) {
    const rd = curUser.readData[key] || curUser.readData[storyId];
    if (rd) {
      return { last: rd.last, set: new Set(rd.arr || []) };
    }
  }
  const data = JSON.parse(localStorage.getItem('read_data') || '{}');
  const entry = data[key] || data[storyId];
  if (entry) {
    return { last: entry.last, set: new Set(entry.read || []) };
  }
  return { last: -1, set: new Set() };
}

function markRead(storyId, idx) {
  const key = String(storyId);

  // Chưa đăng nhập: không lưu local / không gọi API (tiến độ chỉ khi có tài khoản)
  if (!curUser) return;

  const data = JSON.parse(localStorage.getItem('read_data') || '{}');
  if (!data[key]) {
    data[key] = { last: -1, read: [] };
  }
  data[key].last = idx;
  if (!data[key].read.includes(idx)) {
    data[key].read.push(idx);
  }
  localStorage.setItem('read_data', JSON.stringify(data));

  if (!curUser.readData) curUser.readData = {};
  curUser.readData[key] = { last: idx, arr: [...data[key].read] };
  localStorage.setItem('user_info', JSON.stringify(curUser));

  const token = localStorage.getItem('auth_token');
  const ch = curStory && curStory.chList ? curStory.chList[idx] : null;
  const chapterId = ch != null && ch.id != null && ch.id !== '' ? Number(ch.id) : null;
  const dbChapterIndex = ch != null && ch.chapterIndex != null ? Number(ch.chapterIndex) : null;

  console.log('[markRead] storyId:', storyId, 'idx:', idx, 'chapterId:', chapterId, 'dbChapterIndex:', dbChapterIndex);

  if (token) {
    const body = {
      novelId: Number(storyId),
      chapterId: Number.isFinite(chapterId) ? chapterId : null,
      chapterIndex: Number.isFinite(dbChapterIndex) ? dbChapterIndex : Number(idx)
    };

    fetch('http://localhost:8080/api/progress/me', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(body)
    })
      .then(res => {
        console.log('[markRead] Response:', res.status);
        if (!res.ok) {
          res.text().then(text => console.error('[markRead] Server error:', text));
        }
      })
      .catch(err => console.error('[markRead] Network error:', err));
  }
}

// ===== OPEN STORY =====
window.openStory = async function(id, push = true) {
  curStory = findStoryById(id);
  if (!curStory) {
    console.error('Không tìm thấy truyện với id:', id);
    return;
  }

  const storyId = getStoryId(curStory);

  try {
    const headers = { 'cache': 'no-store' };
    const token = localStorage.getItem('auth_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const response = await fetch(`http://localhost:8080/api/chapters/${storyId}`, { headers });
    if (response.ok) {
      curStory.chList = await response.json();
      curStory.chapters = curStory.chList.length;
    }
  } catch (error) {
    console.error('Lỗi lấy chương:', error);
    if (!Array.isArray(curStory.chList)) curStory.chList = [];
  }
  
  // Nạp lại đồng bộ ngay lập tức để lấy dữ liệu mới nhất (chống lỗi khác tab/chưa update kịp)
  if (curUser) {
    await syncReadingProgress();
  }

  document.getElementById('d-cvttl').textContent = curStory.title;
  document.getElementById('d-cvgnr').textContent = curStory.genre || '';
  setCoverBackground(document.querySelector('.detail-cv'), getStoryCover(curStory));
  document.getElementById('d-ttl').textContent = curStory.title;
  
  const authorName = curStory.author || 'Đang cập nhật';
  document.getElementById('d-aut').innerHTML = `✍ <span style="cursor:pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color=''" onclick="forceSearch('${escapeHtml(authorName)}')">${escapeHtml(authorName)}</span>`;

  const rating = Number(curStory.rating || 0);
  document.getElementById('d-stars').innerHTML = renderStarRatingUI(rating, 0, null);
  
  // Load rating thật từ API
  loadStoryRating(storyId);

  document.getElementById('d-stats').innerHTML = `
    <span class="detail-stat">📖 <em>${curStory.chapters || 0}</em> chương</span>
    <span class="detail-stat">👁 <em>${formatView(curStory.views)}</em> lượt</span>
    <span class="detail-stat">📚 <em>${curStory.status || 'Đang cập nhật'}</em></span>`;

  document.getElementById('d-desc').textContent = curStory.description || 'Chưa có mô tả.';

  const genreList = curStory.genre ? curStory.genre.split(',').map(g => g.trim()) : [];
  const tagsHtml = genreList.map(tag => `<span class="tag" style="cursor:pointer; transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='var(--gold)'" onmouseout="this.style.transform='';this.style.borderColor=''" onclick="showCat('${escapeHtml(tag)}')">${escapeHtml(tag)}</span>`).join('');
  document.getElementById('d-tags').innerHTML = tagsHtml;

  // Sử dụng hàm chung để render tiến độ
  updateDetailProgress();
  
  // Cập nhật nút Theo dõi
  updateFollowButton();

  // Hiển thị nút Sửa Truyện nếu là Admin hoặc Chủ truyện
  const editBtn = document.getElementById('d-btn-edit-story');
  if (editBtn) {
    if (curUser && (isAdmin() || (isAuthorOrAdmin() && curStory.userId === curUser.id))) {
      editBtn.classList.remove('is-hidden');
    } else {
      editBtn.classList.add('is-hidden');
    }
  }

  renderChapterList();
  showPage('detail');
  if (push) history.pushState({ page: 'detail', id }, '', `#story/${id}`);

  // Gọi API ghi nhận 1 lượt xem mới
  try {
    fetch(`http://localhost:8080/api/stories/${storyId}/view`, { method: 'POST' })
      .then(res => {
         // Cập nhật số views trên giao diện ngay lập tức
         if (res.ok) {
           curStory.views = (curStory.views || 0) + 1;
           const statsEl = document.getElementById('d-stats');
           if (statsEl) {
             statsEl.innerHTML = `
                <span class="detail-stat">📖 <em>${curStory.chapters || 0}</em> chương</span>
                <span class="detail-stat">👁 <em>${formatView(curStory.views)}</em> lượt</span>
                <span class="detail-stat">📚 <em>${curStory.status || 'Đang cập nhật'}</em></span>`;
           }
         }
      })
      .catch(e => console.error("Lỗi tăng view", e));
  } catch(e) {}
}

function renderChapterList() {
  if (!curStory || !curStory.chList) return;

  const storyId = getStoryId(curStory);
  const rd = getRD(storyId);
  const container = document.getElementById('ch-grid');
  if (!container) return;

  container.innerHTML = curStory.chList.map((chapter, index) => {
    const isRead = rd.set.has(index);
    const isCurrent = rd.last === index && isRead;
    
    // Ưu tiên lấy từ cache frontend nếu người dùng vừa mới comment xong, nếu không lấy số thật từ Backend
    let commentCount = chapter.commentCount || 0;
    if (typeof countCmts === 'function') {
      const cacheCount = countCmts(storyId, index);
      if (cacheCount > commentCount) commentCount = cacheCount;
    }
    const commentClass = commentCount > 0 ? 'has-cmt' : '';

    let cls = 'ch-item';
    let badge = '';

    if (isCurrent) {
      cls += ' ch-cur';
      badge = '<span class="ch-badge cur">▶ Đang đọc</span>';
    } else if (isRead) {
      cls += ' ch-read';
      badge = '<span class="ch-badge done">✓ Đã đọc</span>';
    }

    let editBtn = '';
    if (curUser && isAuthorOrAdmin() && curUser.id === curStory.userId) {
      editBtn = `<button class="ch-cmt-btn" style="color:var(--gold); margin-right:5px;" onclick="event.stopPropagation();openDetailEditChapter(${storyId}, ${index})">⚙️ Sửa</button>`;
    }

    return `
      <div class="ch-item-wrap">
        <div class="${cls}" onclick="readChapter(${index})">
          <span class="ch-ttl">${chapter.title || 'Không có tiêu đề'}</span>
          ${editBtn}
          <button class="ch-cmt-btn ${commentClass}" onclick="toggleChPreview(event, ${storyId}, ${index})">💬 ${commentCount}</button>
          ${badge}
        </div>
        <div class="ch-preview-panel" id="cpanel-${storyId}_${index}"></div>
      </div>
    `;
  }).join('');

  setTimeout(() => {
    const activeChapter = container.querySelector('.ch-cur');
    if (activeChapter) {
      activeChapter.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// ===== READ CHAPTER =====
function readChapter(idx, push = true) {
  if (!curStory || !curStory.chList || !curStory.chList[idx]) return;

  curCh = Number(idx);
  const chapter = curStory.chList[curCh];
  const storyId = getStoryId(curStory);

  document.getElementById('read-bread').innerHTML =
    `<span style="cursor:pointer;color:var(--gold)" onclick="openStory(${storyId})"><em>${curStory.title}</em></span> · ${chapter.title}`;
  document.getElementById('ch-title').textContent = chapter.title;
  document.getElementById('ch-story-n').textContent = `${curStory.title} · ${curStory.author || 'Đang cập nhật'}`;

  let textHtml = '';
  if (chapter.isLocked) {
    const price = chapter.price || 50;
    textHtml = `
      <div class="locked-chapter-banner" style="text-align: center; padding: 40px; background: rgba(0,0,0,0.05); border-radius: 8px; margin: 20px 0;">
        <h3 style="color: var(--gold); margin-bottom: 10px;">🔒 Chương Này Đã Bị Khóa</h3>
        <p style="margin-bottom: 20px;">Bạn cần <strong>${price} Coins</strong> hoặc <strong>Tài khoản VIP</strong> để đọc tiếp.</p>
        <div>
          <button onclick="unlockChapter(${chapter.id}, ${price})" style="background: var(--gold); border: none; padding: 10px 20px; color: #fff; cursor: pointer; border-radius: 4px; font-weight: bold; margin-right: 10px;"> Mở khóa (${price} Coins)</button>
          <button onclick="window.location.hash='#profile'" style="background: transparent; border: 1px solid var(--gold); padding: 10px 20px; color: var(--gold); cursor: pointer; border-radius: 4px; font-weight: bold;">Nạp Thêm / Mua VIP</button>
        </div>
      </div>
    `;
  } else {
    const text = chapter.content || 'Nội dung chương này đang được cập nhật...';
    textHtml = text.split('\n').map(part => part.trim() ? `<p>${part}</p>` : '').join('');
  }
  
  document.getElementById('ch-text').innerHTML = textHtml;

  markRead(storyId, curCh);
  trackHistory(storyId);

  const rd = getRD(storyId);
  document.getElementById('ch-sel').innerHTML = curStory.chList.map((item, index) => {
    const label = (rd.set.has(index) ? '✓ ' : '') + (item.title || `Chương ${index + 1}`);
    return `<option value="${index}" ${index === curCh ? 'selected' : ''}>${label}</option>`;
  }).join('');

  const atStart = curCh === 0;
  const atEnd = curCh >= curStory.chList.length - 1;
  ['btn-prev', 'btn-prev2', 'btn-next', 'btn-next2'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (id.includes('prev')) btn.disabled = atStart;
    else btn.disabled = atEnd;
  });

  showPage('read');
  window.scrollTo(0, 0);
  if (push) history.pushState({ page: 'read', id: storyId, idx }, '', `#read/${storyId}/${idx}`);

  if (typeof loadComments === 'function') {
    loadComments(storyId, curCh);
  }
}

function prevCh() { if (curCh > 0) readChapter(curCh - 1); }
function nextCh() { if (curStory && curCh < curStory.chList.length - 1) readChapter(curCh + 1); }

window.unlockChapter = async function(chapterId, price) {
  if (!curUser) { openModal('login'); return; }
  const confirmUnlock = confirm(`Bạn có đồng ý dùng ${price} Coins để mở khóa chương này?`);
  if (!confirmUnlock) return;

  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`http://localhost:8080/api/payment/unlock-chapter/${chapterId}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const msg = await res.text();
    if (!res.ok) {
      showToast('❌ Lỗi: ' + msg);
      return;
    }
    showToast('✅ Mở khóa thành công!');
    // Cập nhật lại số dư user locally for UI
    curUser.coins = (curUser.coins || 0) - price;
    localStorage.setItem('user_info', JSON.stringify(curUser));
    // Tải lại chương
    const storyId = getStoryId(curStory);
    await openStory(storyId, false);
    readChapter(curCh, false);
  } catch (err) {
    showToast('❌ Lỗi kết nối máy chủ!');
  }
};

function trackHistory(storyId) {
  if (!curUser) return;
  if (!curUser.history) curUser.history = [];
  curUser.history = curUser.history.filter(id => id !== storyId);
  curUser.history.unshift(storyId);
  localStorage.setItem('user_info', JSON.stringify(curUser));
}

function updateFollowButton() {
  const btn = document.getElementById('btn-follow');
  if (!btn || !curStory) return;
  const sid = getStoryId(curStory);
  const isFollowing = curUser && curUser.followed && curUser.followed.includes(sid);
  if (isFollowing) {
    btn.textContent = '✓ Đang theo dõi';
    btn.style.backgroundColor = '#4caf50'; // Màu xanh lá cho trạng thái đã theo dõi
    btn.style.color = '#fff';
    btn.style.borderColor = '#4caf50';
  } else {
    btn.textContent = '🔔 Theo Dõi';
    btn.style.backgroundColor = ''; // Trả về mặc định
    btn.style.color = '';
    btn.style.borderColor = '';
  }
}

async function toggleFollow() {
  if (!curUser) { openModal('login'); return; }
  if (!curStory) {
    showToast('Hãy mở trang chi tiết truyện trước.');
    return;
  }
  const sid = getStoryId(curStory);
  if (!Number.isFinite(sid) || sid < 0) return;
  
  if (!curUser.followed) curUser.followed = [];
  if (curUser.followed.includes(sid)) {
    await unfollowStory(sid);
  } else {
    await followStory();
  }
}

async function followStory() {
  if (!curUser) { openModal('login'); return; }
  if (!curStory) {
    showToast('Hãy mở trang chi tiết truyện trước.');
    return;
  }
  const sid = getStoryId(curStory);
  if (!Number.isFinite(sid) || sid < 0) return;
  if (!curUser.followed) curUser.followed = [];
  if (curUser.followed.includes(sid)) {
    showToast('Bạn đã theo dõi truyện này.');
    return;
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    showToast('Vui lòng đăng nhập lại để lưu theo dõi lên tài khoản.');
    return;
  }

  try {
    const res = await fetch('http://localhost:8080/api/favorites/me', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ novelId: sid })
    });
    if (!res.ok) {
      const msg = await res.text();
      showToast(msg || 'Không thể theo dõi truyện này.');
      return;
    }
    curUser.followed.push(sid);
    localStorage.setItem('user_info', JSON.stringify(curUser));
    showToast('Đã thêm vào mục Theo dõi trong hồ sơ!');
    updateFollowButton();
  } catch (err) {
    console.error('[follow] Network error:', err);
    showToast('Không kết nối được máy chủ.');
  }
}

window.unfollowStory = async function(storyId) {
  if (!curUser) return;
  const id = Number(storyId);
  const token = localStorage.getItem('auth_token');

  if (token) {
    try {
      const res = await fetch(`http://localhost:8080/api/favorites/me/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) {
        const msg = await res.text();
        showToast(msg || 'Không bỏ theo dõi được.');
        return;
      }
    } catch (err) {
      console.error('[unfollow] Network error:', err);
      showToast('Không kết nối được máy chủ.');
      return;
    }
  }

  if (!curUser.followed) curUser.followed = [];
  curUser.followed = curUser.followed.filter(x => Number(x) !== id);
  localStorage.setItem('user_info', JSON.stringify(curUser));
  if (typeof renderProfile === 'function') renderProfile();
  showToast('Đã bỏ theo dõi.');
  updateFollowButton();
};

// Đồng bộ theo dõi: server là nguồn đúng (tránh “ghost” khác DB)
async function syncFollowedStories() {
  if (!curUser) return;
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  try {
    const response = await fetch('http://localhost:8080/api/favorites/me', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Cache-Control': 'no-cache, no-store'
      },
      cache: 'no-store'
    });

    if (response.ok) {
      const raw = await response.json();
      const serverIds = Array.isArray(raw) ? raw : [];
      curUser.followed = [...new Set(serverIds.map(Number))].filter(
        n => Number.isFinite(n) && n > 0
      );
      localStorage.setItem('user_info', JSON.stringify(curUser));

      if (typeof renderProfile === 'function' && document.getElementById('page-profile')?.classList.contains('active')) {
        renderProfile();
      }
      if (document.getElementById('page-detail')?.classList.contains('active')) {
        updateFollowButton();
      }
    }
  } catch (err) {
    console.error('[syncFollow] Error:', err);
  }
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = '✓ ' + msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

async function fetchStories() {
  try {
    const response = await fetch('http://localhost:8080/api/stories');
    if (!response.ok) {
      console.error('Lỗi khi tải truyện từ server');
      return;
    }

    STORIES = await response.json();
    STORIES.forEach(story => {
      story.chapters = story.chapters || 50;
      story.chList = [];
      for (let index = 0; index < story.chapters; index += 1) {
        story.chList.push({
          idx: index,
          title: 'Chương ' + (index + 1),
          isNew: index >= story.chapters - 4
        });
      }
    });

    initHeroSlider();
    initHome();
  } catch (error) {
    console.error('Không kết nối được tới Backend:', error);
    const newStories = document.getElementById('new-stories');
    if (newStories) {
      newStories.innerHTML = '<p class="err-msg">Không thể tải dữ liệu. Vui lòng bật Java Backend!</p>';
    }
  }
}

function formatView(num) {
  const value = Number(num || 0);
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
  return String(value);
}

// ===== NAVIGATION HISTORY API =====
window.addEventListener('popstate', async () => {
  await handleHashNavigation(window.location.hash);
});

async function handleHashNavigation(hash) {
  if (!hash || hash === '' || hash === '#home') {
    goHome(false);
  } else if (hash === '#profile') {
    goProfile(false);
  } else if (hash.startsWith('#story/')) {
    const id = hash.split('/')[1];
    if (id) await window.openStory(Number(id), false);
  } else if (hash.startsWith('#read/')) {
    const parts = hash.split('/');
    const id = parts[1];
    const idx = parts[2];
    if (id && idx) {
      if (!curStory || getStoryId(curStory) !== Number(id)) {
        await window.openStory(Number(id), false); 
      }
      readChapter(Number(idx), false);
    }
  } else if (hash.startsWith('#cat/')) {
    const cat = decodeURIComponent(hash.split('/')[1]);
    if (cat) showCat(cat, false);
  } else if (hash.startsWith('#list/')) {
    const type = hash.split('/')[1];
    if (type) showAll(type, false);
  }
}

// ===== INIT =====
async function boot() {
  removeLegacyFollowStorageKeys();
  restoreSession();
  // Khách không dùng read_data (tránh tiến độ cũ dính vào phiên không đăng nhập)
  if (!curUser) {
    try {
      localStorage.removeItem('read_data');
    } catch (_) {}
  }
  await syncReadingProgress();
  await syncFollowedStories();
  await fetchStories();
  if (window.location.hash) {
    handleHashNavigation(window.location.hash);
  } else {
    // replace state to setup base home hash for history back tracking
    history.replaceState({ page: 'home' }, '', '#home');
  }
}

// ===== STAR RATING =====

function renderStarRatingUI(avg, totalRatings, userRating) {
  const avgDisplay = avg > 0 ? avg.toFixed(1) : '–';
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    const filled = userRating ? (i <= userRating) : (i <= Math.round(avg));
    const hoverClass = curUser ? 'star-hover' : '';
    const clickAction = curUser ? `onclick="submitStarRating(${i})"` : `onclick="openModal('login')"`;
    starsHtml += `<span class="star-btn ${filled ? 'star-filled' : 'star-empty'} ${hoverClass}" 
                        ${clickAction}
                        onmouseover="previewStars(${i})" 
                        onmouseout="resetStarPreview()">★</span>`;
  }
  
  const userLabel = userRating 
    ? `<span class="rating-user-label">Bạn đã chấm ${userRating}⭐</span>` 
    : (curUser ? '<span class="rating-user-label">Bấm để đánh giá</span>' : '');
    
  return `
    <div class="star-rating-wrap" id="star-rating-wrap">
      <div class="star-rating-stars" id="star-btns">${starsHtml}</div>
      <span class="star-rating-avg">${avgDisplay}</span>
      <span class="star-rating-count">(${totalRatings} đánh giá)</span>
    </div>
    <div class="star-rating-sub">${userLabel}</div>`;
}

async function loadStoryRating(storyId) {
  try {
    const headers = {};
    const token = localStorage.getItem('auth_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    const res = await fetch(`http://localhost:8080/api/ratings/${storyId}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    
    const el = document.getElementById('d-stars');
    if (el) {
      el.innerHTML = renderStarRatingUI(
        data.averageRating || 0, 
        data.totalRatings || 0, 
        data.userRating
      );
    }
    // Cập nhật curStory.rating
    if (curStory) curStory.rating = data.averageRating;
  } catch (e) {
    console.error('Lỗi tải rating:', e);
  }
}

async function submitStarRating(stars) {
  if (!curUser) { openModal('login'); return; }
  const storyId = getStoryId(curStory);
  const token = localStorage.getItem('auth_token');
  
  try {
    const res = await fetch(`http://localhost:8080/api/ratings/${storyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ stars })
    });
    
    if (!res.ok) {
      showToast('❌ Không đánh giá được: ' + await res.text());
      return;
    }
    
    const data = await res.json();
    const el = document.getElementById('d-stars');
    if (el) {
      el.innerHTML = renderStarRatingUI(data.averageRating, data.totalRatings, data.userRating);
    }
    if (curStory) curStory.rating = data.averageRating;
    showToast(`⭐ Đã đánh giá ${stars} sao!`);
  } catch (e) {
    showToast('❌ Lỗi kết nối');
  }
}

function previewStars(n) {
  if (!curUser) return;
  const btns = document.querySelectorAll('#star-btns .star-btn');
  btns.forEach((btn, i) => {
    btn.classList.toggle('star-filled', i < n);
    btn.classList.toggle('star-empty', i >= n);
  });
}

function resetStarPreview() {
  // Reload lại rating hiện tại khi chuột rời khỏi
  if (curStory) loadStoryRating(getStoryId(curStory));
}

// ===== EDITOR CHƯƠNG CHI TIẾT =====
function openDetailEditChapter(storyId, index) {
  const story = findStoryById(storyId);
  if (!story || !story.chList || !story.chList[index]) return;
  const chapter = story.chList[index];
  
  document.getElementById('de-ech-id').textContent = chapter.id;
  document.getElementById('de-ech-index').value = chapter.chapterIndex || (index + 1);
  document.getElementById('de-ech-title').value = chapter.title;
  document.getElementById('de-ech-price').value = chapter.price || 0;
  document.getElementById('de-ech-content').value = chapter.content || '';
  
  document.getElementById('detail-edit-chapter-modal').classList.remove('is-hidden');
  document.getElementById('detail-edit-chapter-modal').scrollIntoView({behavior: 'smooth'});
}

function closeDetailEditChapter() {
  document.getElementById('detail-edit-chapter-modal').classList.add('is-hidden');
}

async function submitDetailEditChapter() {
  const chapterId = document.getElementById('de-ech-id').textContent;
  if (!chapterId) return;
  
  const index = parseInt(document.getElementById('de-ech-index').value);
  const title = document.getElementById('de-ech-title').value.trim();
  const price = parseInt(document.getElementById('de-ech-price').value) || 0;
  const content = document.getElementById('de-ech-content').value.trim();
  
  if (!index || !title || !content) { showToast('Vui lòng điền đủ thông tin chương!'); return; }
  
  const token = localStorage.getItem('auth_token');
  try {
    const res = await fetch(`http://localhost:8080/api/chapters/${chapterId}`, {
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
    showToast('✅ Đã sửa chương thành công!');
    closeDetailEditChapter();
    
    // Tải lại chi tiết truyện
    const updatedCh = await res.json();
    const storyId = getStoryId(curStory);
    try {
      const storyRes = await fetch(`http://localhost:8080/api/stories`); // Load all to refresh
      if (storyRes.ok) {
        STORIES = await storyRes.json();
        curStory = findStoryById(storyId);
        renderChapterList();
      }
    } catch(e) {}
  } catch(e) {
    showToast('❌ Lỗi mạng!');
  }
}

// ===== EDITOR TRUYỆN CHI TIẾT (TỪ DETAIL PAGE) =====
function openDetailEditStory() {
  if (!curStory) return;
  document.getElementById('de-es-title').value = curStory.title || '';
  document.getElementById('de-es-author').value = curStory.author || '';
  document.getElementById('de-es-genre').value = curStory.genre || '';
  document.getElementById('de-es-status').value = curStory.status || 'Đang Ra';
  document.getElementById('de-es-cover').value = curStory.coverUrl || '';
  document.getElementById('de-es-desc').value = curStory.description || '';
  
  document.getElementById('detail-edit-story-modal').classList.remove('is-hidden');
  document.getElementById('detail-edit-story-modal').scrollIntoView({behavior: 'smooth'});
}

function closeDetailEditStory() {
  document.getElementById('detail-edit-story-modal').classList.add('is-hidden');
}

async function submitDetailEditStory() {
  const storyId = getStoryId(curStory);
  if (!storyId) return;
  
  const title = document.getElementById('de-es-title').value.trim();
  const author = document.getElementById('de-es-author').value.trim();
  const genre = document.getElementById('de-es-genre').value.trim();
  const status = document.getElementById('de-es-status').value;
  const coverUrl = document.getElementById('de-es-cover').value.trim();
  const description = document.getElementById('de-es-desc').value.trim();
  
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
      showToast('❌ Lỗi xử lý: ' + await res.text());
      return;
    }
    
    showToast('✅ Đã sửa truyện thành công!');
    closeDetailEditStory();
    
    // Tải lại chi tiết truyện
    try {
      const storyRes = await fetch(`http://localhost:8080/api/stories`); // Load all
      if (storyRes.ok) {
        STORIES = await storyRes.json();
        curStory = findStoryById(storyId);
        openStory(storyId, false); // re-render
      }
    } catch(e) {}
  } catch(e) {
    showToast('❌ Lỗi mạng!');
  }
}

window.addEventListener('partials:loaded', boot, { once: true });
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('page-home')) boot();
});

// ==========================================
// SCROLL TO TOP BTN LOGIC
// ==========================================
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollToTopBtn');
  if (!btn) return;
  if (window.scrollY > 300) {
    btn.classList.add('show');
  } else {
    btn.classList.remove('show');
  }
});

/**
 * auth.js
 * Authentication: login, register, forgot password, session management
 */

/** Sau khi gửi OTP: giữ username/email/password để bước xác thực */
let pendingRegister = null;

// ===== AUTH =====
function openModal(tab) {
  document.getElementById('auth-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchTab(tab || 'login');
}

function closeModal() {
  document.getElementById('auth-modal').classList.remove('open');
  document.body.style.overflow = '';
  clearErrors();
  hideAlert();
}

function ovClick(e) {
  if (e.target === document.getElementById('auth-modal')) closeModal();
}

function hideVerifyForm() {
  const v = document.getElementById('frm-verify');
  if (!v) return;
  v.style.display = 'none';
  v.classList.add('is-hidden');
}

function switchTab(tab) {
  pendingRegister = null;
  hideVerifyForm();
  ['login', 'register'].forEach(name => {
    const el = document.getElementById('frm-' + name);
    document.getElementById('mtab-' + name).classList.toggle('active', name === tab);
    if (el) {
      el.style.display = name === tab ? 'block' : 'none';
      el.classList.toggle('is-hidden', name !== tab);
    }
  });
  const forgot = document.getElementById('frm-forgot');
  if (forgot) {
    forgot.style.display = 'none';
    forgot.classList.add('is-hidden');
  }
  document.getElementById('modal-sub').textContent =
    tab === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản miễn phí';
  clearErrors();
  hideAlert();
}

function showForgot() {
  pendingRegister = null;
  hideVerifyForm();
  ['login', 'register'].forEach(name => {
    const el = document.getElementById('frm-' + name);
    if (el) {
      el.style.display = 'none';
      el.classList.add('is-hidden');
    }
  });
  const forgot = document.getElementById('frm-forgot');
  if (forgot) {
    forgot.classList.remove('is-hidden');
    forgot.style.display = 'block';
  }
  document.getElementById('modal-sub').textContent = 'Quên mật khẩu?';
  clearErrors();
  hideAlert();
}

/** Chuyển sang màn nhập OTP sau khi send-otp thành công */
function showRegisterVerifyStep(displayEmail) {
  pendingRegister = {
    username: document.getElementById('r-un').value.trim(),
    email: document.getElementById('r-em').value.trim(),
    password: document.getElementById('r-pw').value
  };
  ['frm-login', 'frm-register', 'frm-forgot'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    el.classList.add('is-hidden');
  });
  document.getElementById('mtab-login')?.classList.remove('active');
  document.getElementById('mtab-register')?.classList.remove('active');
  const v = document.getElementById('frm-verify');
  if (v) {
    v.classList.remove('is-hidden');
    v.style.display = 'block';
  }
  const disp = document.getElementById('v-email-disp');
  if (disp) disp.textContent = displayEmail;
  const otpIn = document.getElementById('v-otp');
  if (otpIn) otpIn.value = '';
  document.getElementById('modal-sub').textContent = 'Xác thực email';
  clearErrors();
  hideAlert();
}

function showAlert(msg, type) {
  const box = document.getElementById('alert-bx');
  box.textContent = msg;
  box.className = 'alert-bx show ' + type;
}

function hideAlert() {
  const box = document.getElementById('alert-bx');
  box.className = 'alert-bx';
  box.textContent = '';
}

function clearErrors() {
  document.querySelectorAll('.ferr').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.fi').forEach(el => el.classList.remove('err'));
}

function showErr(errorId, inputId) {
  document.getElementById(errorId).classList.add('show');
  if (inputId) document.getElementById(inputId).classList.add('err');
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toggleEye(id, btn) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}

function pwStrength() {
  const pw = document.getElementById('r-pw').value;
  const el = document.getElementById('pw-str');
  if (!pw) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'block';
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  const colors = ['#e24b4a', '#e86e4a', '#e8c97a', '#4a9068', '#2e7d58'];
  el.innerHTML = `<span style="color:${colors[score - 1] || colors[0]}">Độ mạnh: ${labels[score - 1] || labels[0]}</span>`;
}

async function doLogin() {
  clearErrors();
  hideAlert();
  const id = document.getElementById('l-id').value.trim();
  const pw = document.getElementById('l-pw').value;

  let ok = true;
  if (!id) { showErr('e-lid', 'l-id'); ok = false; }
  if (!pw) { showErr('e-lpw', 'l-pw'); ok = false; }
  if (!ok) return;

  try {
    const response = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: id, password: pw })
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      showAlert(errorMsg || 'Sai thông tin đăng nhập!', 'fail');
      return;
    }

    const loginData = await response.json();
    const user = normalizeUserState(loginData.user);
    if (loginData.token) {
      localStorage.setItem('auth_token', loginData.token);
    }
    loginOK(user);
  } catch (error) {
    showAlert('Không thể kết nối đến Backend! Hãy chắc chắn Java đang chạy.', 'fail');
    console.error(error);
  }
}

async function doRegister() {
  clearErrors();
  hideAlert();
  const username = document.getElementById('r-un').value.trim();
  const email = document.getElementById('r-em').value.trim();
  const pw = document.getElementById('r-pw').value;
  const confirm = document.getElementById('r-cf').value;
  const agreed = document.getElementById('agree').checked;

  let ok = true;
  if (username.length < 3) { showErr('e-run', 'r-un'); ok = false; }
  if (!validEmail(email)) { showErr('e-rem', 'r-em'); ok = false; }
  if (pw.length < 8) { showErr('e-rpw', 'r-pw'); ok = false; }
  if (pw !== confirm) { showErr('e-rcf', 'r-cf'); ok = false; }
  if (!agreed) { showErr('e-agree', null); ok = false; }
  if (!ok) return;

  try {
    const response = await fetch('http://localhost:8080/api/auth/register/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    });
    const msg = await response.text();
    if (!response.ok) {
      showAlert(msg || 'Không gửi được mã OTP.', response.status === 503 ? 'fail' : 'fail');
      return;
    }
    showRegisterVerifyStep(email);
    showAlert(msg || 'Đã gửi mã OTP. Kiểm tra email (và thư mục spam).', 'ok');
  } catch (error) {
    showAlert('Không thể kết nối đến Backend!', 'fail');
    console.error(error);
  }
}

async function doVerifyOTP() {
  clearErrors();
  hideAlert();
  if (!pendingRegister) {
    showAlert('Hết phiên đăng ký. Vui lòng điền form đăng ký lại.', 'fail');
    switchTab('register');
    return;
  }
  const otp = document.getElementById('v-otp').value.replace(/\D/g, '');
  if (otp.length !== 6) {
    showErr('e-votp', 'v-otp');
    return;
  }
  const { username, email, password } = pendingRegister;
  try {
    const response = await fetch('http://localhost:8080/api/auth/register/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        fullName: username,
        otp
      })
    });
    if (!response.ok) {
      showAlert((await response.text()) || 'Xác thực thất bại.', 'fail');
      return;
    }
    const savedUser = normalizeUserState(await response.json());
    pendingRegister = null;
    hideVerifyForm();
    showAlert('Đăng ký thành công! Đang đăng nhập...', 'ok');

    setTimeout(async () => {
      try {
        const loginRes = await fetch('http://localhost:8080/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          const user = normalizeUserState(loginData.user);
          if (loginData.token) {
            localStorage.setItem('auth_token', loginData.token);
          }
          loginOK(user);
        } else {
          loginOK(savedUser);
        }
      } catch (err) {
        loginOK(savedUser);
      }
    }, 600);
  } catch (error) {
    showAlert('Không thể kết nối đến Backend!', 'fail');
    console.error(error);
  }
}

async function doResendOTP() {
  hideAlert();
  if (!pendingRegister) {
    showAlert('Quay lại form đăng ký và nhấn Đăng ký.', 'fail');
    return;
  }
  const { username, email } = pendingRegister;
  try {
    const response = await fetch('http://localhost:8080/api/auth/register/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    });
    const msg = await response.text();
    if (!response.ok) {
      showAlert(msg || 'Không gửi lại được mã.', 'fail');
      return;
    }
    showAlert(msg || 'Đã gửi lại mã OTP.', 'ok');
  } catch (error) {
    showAlert('Không thể kết nối đến Backend!', 'fail');
    console.error(error);
  }
}

function doForgot() {
  clearErrors();
  hideAlert();
  const email = document.getElementById('fg-em').value.trim();
  if (!validEmail(email)) {
    showErr('e-fg', 'fg-em');
    return;
  }

  showAlert(`Nếu email ${email} tồn tại, link đặt lại mật khẩu sẽ được gửi tới bạn.`, 'ok');
}

function socialMsg(provider) {
  showAlert('Đăng nhập bằng ' + provider + ' đang được phát triển!', 'fail');
}

async function loginOK(user) {
  curUser = normalizeUserState(user);
  // Xóa sạch readData cũ trước khi sync từ server (tránh lẫn user)
  curUser.readData = {};
  curUser.history = [];
  curUser.followed = []; // Reset followed, sẽ load từ DB
  localStorage.setItem('user_info', JSON.stringify(curUser));
  closeModal();
  updateHdAuth();
  applyRoleUI(); // Áp dụng ẩn/hiện UI theo role
  showToast('Chào mừng, ' + curUser.firstname + '!');

  // Đồng bộ tiến độ đọc và danh sách theo dõi từ Database
  if (typeof syncReadingProgress === 'function') {
    await syncReadingProgress();
  }
  if (typeof syncFollowedStories === 'function') {
    await syncFollowedStories();
  }

  if (curStory !== null && curStory !== undefined && document.getElementById('page-read')?.classList.contains('active')) {
    loadComments(getStoryId(curStory), curCh);
  }
}

function doLogout() {
  curUser = null;
  localStorage.removeItem('user_info');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('read_data'); // Dọn sạch rác khi thoát
  updateHdAuth();
  goHome();
  closeDD();
  showToast('Đã đăng xuất!');
}

function updateHdAuth() {
  const guest = document.getElementById('auth-guest');
  const userMenu = document.getElementById('auth-user');
  if (!guest || !userMenu) return;

  if (curUser) {
    guest.style.display = 'none';
    userMenu.style.display = 'flex';

    const initial = (curUser.firstname?.[0] || '?').toUpperCase();
    const avatar = document.getElementById('hd-av');
    avatar.textContent = initial;
    avatar.style.backgroundImage = curUser.avatarPhoto ? `url(${curUser.avatarPhoto})` : '';
    avatar.style.backgroundSize = curUser.avatarPhoto ? 'cover' : '';
    avatar.style.backgroundPosition = curUser.avatarPhoto ? 'center' : '';

    document.getElementById('hd-nm').textContent = curUser.firstname;
    document.getElementById('dd-nm').textContent = curUser.firstname;
    document.getElementById('dd-em').textContent = curUser.email || '';

    // Hiện badge Role trong dropdown
    const roleEl = document.getElementById('dd-role');
    if (roleEl) {
      const role = curUser.role || 'USER';
      const roleBadge = {
        'ADMIN': '👑 Quản trị viên',
        'AUTHOR': '✍️ Tác giả',
        'USER': '📚 Độc giả'
      };
      roleEl.textContent = roleBadge[role] || '📚 Độc giả';
      roleEl.className = 'dd-role dd-role--' + role.toLowerCase();
    }

    // Cập nhật Wallet & VIP trong dropdown
    const ddCoins = document.getElementById('dd-coins');
    const ddVip = document.getElementById('dd-vip');
    if (ddCoins) ddCoins.textContent = (curUser.coins || 0) + ' Coins';
    if (ddVip) {
      if (curUser.vipExpiresAt && new Date(curUser.vipExpiresAt) > new Date()) {
        ddVip.textContent = '👑 VIP';
        ddVip.style.color = 'var(--gold)';
        document.getElementById('hd-vip-crown')?.classList.remove('is-hidden');
        const hdAv = document.getElementById('hd-av');
        if (hdAv) { hdAv.style.boxShadow = '0 0 8px var(--gold)'; hdAv.style.border = '2px solid var(--gold)'; }
      } else {
        ddVip.textContent = 'Thường';
        ddVip.style.color = 'var(--txt)';
        document.getElementById('hd-vip-crown')?.classList.add('is-hidden');
        const hdAv = document.getElementById('hd-av');
        if (hdAv) { hdAv.style.boxShadow = 'none'; hdAv.style.border = 'none'; }
      }
    }

    // Ẩn/Hiện nút Quản Trị
    const adminBtn = document.getElementById('dd-admin-btn');
    if (adminBtn) {
      if (curUser.role === 'ADMIN') {
        adminBtn.classList.remove('is-hidden');
      } else {
        adminBtn.classList.add('is-hidden');
      }
    }
  } else {
    guest.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

function toggleDD() {
  document.getElementById('user-dd').classList.toggle('open');
}

function closeDD() {
  document.getElementById('user-dd').classList.remove('open');
}

document.addEventListener('click', e => {
  const menu = document.getElementById('auth-user');
  if (menu && !menu.contains(e.target)) closeDD();
});

// Phím Enter tự động Đăng nhập / Đăng ký
document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const modal = document.getElementById('auth-modal');
    if (modal && modal.classList.contains('open')) {
      event.preventDefault(); // Ngăn chặn nổi bọt submit form mặc định
      const frmLogin = document.getElementById('frm-login');
      const frmRegister = document.getElementById('frm-register');
      const frmVerify = document.getElementById('frm-verify');
      const frmForgot = document.getElementById('frm-forgot');
      
      if (frmLogin && frmLogin.style.display !== 'none' && !frmLogin.classList.contains('is-hidden')) {
        login();
      } else if (frmRegister && frmRegister.style.display !== 'none' && !frmRegister.classList.contains('is-hidden')) {
        register();
      } else if (frmVerify && !frmVerify.classList.contains('is-hidden')) {
        verifyOtp();
      } else if (frmForgot && !frmForgot.classList.contains('is-hidden')) {
        resetPassword();
      }
    }
  }
});

// =========================================================
// 账号系统（纯前端演示版）
// 说明：本应用没有真实后端服务器，用户数据保存在浏览器本地 localStorage 中，
// 邮箱验证码也无法通过真实邮件发送，而是直接显示在页面上做"演示"。
// 密码经过简单哈希处理，避免明文存储，但这不等同于真实生产环境的安全强度。
// =========================================================

const USERS_KEY = 'ru_app_users_v1';
const SESSION_KEY = 'ru_app_session_v1';
const CODE_TTL_MS = 10 * 60 * 1000; // 验证码有效期 10 分钟

// ---------- 简单哈希（非真实加密，仅用于避免明文存储） ----------
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16);
}

function hashPassword(username, password) {
  return simpleHash('ru_salt::' + username.toLowerCase() + '::' + password);
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------- 用户数据存取 ----------
function loadUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fallthrough */ }
  }
  return {};
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function ensureAdminSeed() {
  const users = loadUsers();
  if (!users['admin']) {
    users['admin'] = {
      username: 'admin',
      email: 'admin@local',
      passwordHash: hashPassword('admin', '123456'),
      role: 'admin',
      verified: true,
      createdAt: Date.now()
    };
    saveUsers(users);
  }
}
ensureAdminSeed();

function findUserByUsernameOrEmail(input) {
  const users = loadUsers();
  const key = input.trim().toLowerCase();
  if (users[key]) return users[key];
  for (const uname in users) {
    if (users[uname].email && users[uname].email.toLowerCase() === key) {
      return users[uname];
    }
  }
  return null;
}

// ---------- 会话 ----------
function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function setSession(username, role) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, role, loginAt: Date.now() }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ---------- 注册 ----------
function registerUser(username, email, password) {
  username = username.trim();
  email = email.trim();
  if (!username || !email || !password) {
    return { ok: false, error: '请填写完整信息' };
  }
  if (username.toLowerCase() === 'admin') {
    return { ok: false, error: '该用户名不可用' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: '邮箱格式不正确' };
  }
  if (password.length < 6) {
    return { ok: false, error: '密码长度至少 6 位' };
  }
  const users = loadUsers();
  const key = username.toLowerCase();
  if (users[key]) {
    return { ok: false, error: '用户名已被注册' };
  }
  for (const uname in users) {
    if (users[uname].email && users[uname].email.toLowerCase() === email.toLowerCase()) {
      return { ok: false, error: '该邮箱已被绑定其他账号' };
    }
  }
  const code = genCode();
  users[key] = {
    username,
    email,
    passwordHash: hashPassword(username, password),
    role: 'user',
    verified: false,
    pendingCode: code,
    pendingCodeExpiry: Date.now() + CODE_TTL_MS,
    createdAt: Date.now()
  };
  saveUsers(users);
  return { ok: true, code };
}

function verifyRegistrationCode(username, code) {
  const users = loadUsers();
  const key = username.trim().toLowerCase();
  const user = users[key];
  if (!user) return { ok: false, error: '用户不存在' };
  if (user.verified) return { ok: false, error: '该账号已完成验证' };
  if (!user.pendingCode || Date.now() > user.pendingCodeExpiry) {
    return { ok: false, error: '验证码已过期，请重新发送' };
  }
  if (user.pendingCode !== code.trim()) {
    return { ok: false, error: '验证码不正确' };
  }
  user.verified = true;
  delete user.pendingCode;
  delete user.pendingCodeExpiry;
  saveUsers(users);
  return { ok: true };
}

function resendRegistrationCode(username) {
  const users = loadUsers();
  const key = username.trim().toLowerCase();
  const user = users[key];
  if (!user) return { ok: false, error: '用户不存在' };
  if (user.verified) return { ok: false, error: '该账号已完成验证' };
  const code = genCode();
  user.pendingCode = code;
  user.pendingCodeExpiry = Date.now() + CODE_TTL_MS;
  saveUsers(users);
  return { ok: true, code };
}

// ---------- 登录 ----------
function loginUser(usernameOrEmail, password) {
  const user = findUserByUsernameOrEmail(usernameOrEmail);
  if (!user) return { ok: false, error: '账号不存在' };
  if (user.passwordHash !== hashPassword(user.username, password)) {
    return { ok: false, error: '密码不正确' };
  }
  if (!user.verified) {
    return { ok: false, error: 'NEED_VERIFY', username: user.username };
  }
  setSession(user.username, user.role);
  return { ok: true, username: user.username, role: user.role };
}

function logoutUser() {
  clearSession();
}

// ---------- 找回密码 ----------
function requestPasswordReset(usernameOrEmail) {
  const user = findUserByUsernameOrEmail(usernameOrEmail);
  if (!user) return { ok: false, error: '未找到对应账号或邮箱' };
  const users = loadUsers();
  const key = user.username.toLowerCase();
  const code = genCode();
  users[key].pendingCode = code;
  users[key].pendingCodeExpiry = Date.now() + CODE_TTL_MS;
  users[key].pendingType = 'reset';
  saveUsers(users);
  return { ok: true, code, username: user.username, email: user.email };
}

function resetPassword(username, code, newPassword) {
  if (newPassword.length < 6) {
    return { ok: false, error: '密码长度至少 6 位' };
  }
  const users = loadUsers();
  const key = username.trim().toLowerCase();
  const user = users[key];
  if (!user) return { ok: false, error: '用户不存在' };
  if (!user.pendingCode || Date.now() > user.pendingCodeExpiry) {
    return { ok: false, error: '验证码已过期，请重新获取' };
  }
  if (user.pendingCode !== code.trim()) {
    return { ok: false, error: '验证码不正确' };
  }
  user.passwordHash = hashPassword(user.username, newPassword);
  delete user.pendingCode;
  delete user.pendingCodeExpiry;
  delete user.pendingType;
  saveUsers(users);
  return { ok: true };
}

window.Auth = {
  getSession,
  registerUser,
  verifyRegistrationCode,
  resendRegistrationCode,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  findUserByUsernameOrEmail
};

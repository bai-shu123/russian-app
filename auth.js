// Supabase 云端认证：账号、会话和用户资料不再保存在单个浏览器中。
const APP_URL = 'https://bai-shu123.github.io/russian-app/';
let currentUserId = null;
const supabaseClient = window.supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.publishableKey
);

function authErrorMessage(error) {
  const message = error && error.message ? error.message : '操作失败，请稍后重试';
  if (/invalid login credentials/i.test(message)) return '邮箱或密码不正确';
  if (/user already registered/i.test(message)) return '该邮箱已经注册';
  if (/password should be at least/i.test(message)) return '密码长度至少 6 位';
  if (/email not confirmed/i.test(message)) return '请先检查邮箱并点击确认链接';
  return message;
}

async function getProfile(user) {
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureProfile(user) {
  if (!user) return null;
  let profile = await getProfile(user);
  if (profile) return profile;
  const username = user.user_metadata && user.user_metadata.username
    ? user.user_metadata.username
    : (user.email || '').split('@')[0];
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username, role: 'user' }, { onConflict: 'id' })
    .select('id, username, role, created_at')
    .single();
  if (error) throw error;
  profile = data;
  return profile;
}

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  if (!data.session) return null;
  currentUserId = data.session.user.id;
  window.Auth.currentUserId = currentUserId;
  const profile = await ensureProfile(data.session.user);
  return {
    user: data.session.user,
    username: profile ? profile.username : data.session.user.email,
    role: profile ? profile.role : 'user'
  };
}

async function registerUser(username, email, password) {
  username = username.trim();
  email = email.trim().toLowerCase();
  if (!username || !email || !password) return { ok: false, error: '请填写完整信息' };
  if (password.length < 6) return { ok: false, error: '密码长度至少 6 位' };
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { username }, emailRedirectTo: APP_URL }
  });
  if (error) return { ok: false, error: authErrorMessage(error) };
  if (data.session && data.user) await ensureProfile(data.user);
  return { ok: true, email, needsConfirmation: !data.session };
}

async function resendConfirmation(email) {
  const { error } = await supabaseClient.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: APP_URL }
  });
  if (error) return { ok: false, error: authErrorMessage(error) };
  return { ok: true };
}

async function loginUser(email, password) {
  email = email.trim().toLowerCase();
  if (!email.includes('@')) return { ok: false, error: '云端登录请使用注册邮箱' };
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: authErrorMessage(error) };
  currentUserId = data.user.id;
  window.Auth.currentUserId = currentUserId;
  const profile = await ensureProfile(data.user);
  return { ok: true, username: profile.username, role: profile.role, user: data.user };
}

async function logoutUser() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

async function requestPasswordReset(email) {
  email = email.trim().toLowerCase();
  if (!email.includes('@')) return { ok: false, error: '请输入注册邮箱' };
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, error: authErrorMessage(error) };
  return { ok: true, email };
}

async function resetPassword(password) {
  if (password.length < 6) return { ok: false, error: '密码长度至少 6 位' };
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) return { ok: false, error: authErrorMessage(error) };
  return { ok: true };
}

async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

window.Auth = {
  supabase: supabaseClient,
  currentUserId,
  getSession,
  ensureProfile,
  registerUser,
  loginUser,
  resendConfirmation,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  listProfiles
};
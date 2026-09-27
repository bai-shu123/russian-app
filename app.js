// ---------- 工具函数 ----------
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const spokenText = String(text).normalize('NFD').replace(/[\u0301]/g, '');
  const utter = new SpeechSynthesisUtterance(spokenText);
  utter.lang = 'ru-RU';
  utter.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const ruVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ru'));
  if (ruVoice) utter.voice = ruVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ===================================================================
// 俄语正文通常省略重音符号，学习界面在词汇处补充重音。
const stressMarks = {
  'здравствуйте': 'здра́вствуйте', 'привет': 'приве́т', 'меня зовут…': 'меня́ зову́т…',
  'как тебя зовут?': 'как тебя́ зову́т?', 'очень приятно': 'о́чень прия́тно',
  'студент / студентка': 'студе́нт / студе́нтка', 'друг / подруга': 'дру́г / подру́га',
  'да / нет': 'да́ / не́т', 'спасибо': 'спаси́бо', 'пожалуйста': 'пожа́луйста',
  'семья': 'семья́', 'мама / папа': 'ма́ма / па́па', 'сын / дочь': 'сын / дочь',
  'брат / сестра': 'бра́т / сестра́', 'бабушка / дедушка': 'ба́бушка / де́душка',
  'муж / жена': 'муж / жена́', 'большой / маленький': 'большо́й / ма́ленький',
  'мой / моя / моё': 'мо́й / моя́ / моё́', 'один, два, три': 'оди́н, два́, три́',
  'четыре, пять, шесть': 'четы́ре, пять, шесть', 'семь, восемь, девять, десять': 'семь, во́семь, де́вять, де́сять',
  'сколько тебе лет?': 'ско́лько тебе́ лет?', 'мне … год / года / лет': 'мне … го́д / го́да / лет',
  'старше / младше': 'ста́рше / мла́дше', 'утро / день / вечер / ночь': 'у́тро / де́нь / ве́чер / ночь',
  'вставать': 'встава́ть', 'завтракать / обедать / ужинать': 'за́втракать / обе́дать / у́жинать',
  'работать / учиться': 'рабо́тать / учи́ться', 'отдыхать': 'отдыха́ть', 'ложиться спать': 'ложи́ться спать',
  'дом / квартира': 'дом / кварти́ра', 'комната / кухня': 'ко́мната / ку́хня', 'улица / город': 'у́лица / го́род',
  'магазин / школа / парк': 'магази́н / шко́ла / парк', 'жить': 'жить', 'находиться': 'находи́ться',
  'магазин / рынок': 'магази́н / ры́нок', 'хлеб / молоко / яблоко': 'хлеб / молоко́ / я́блоко',
  'сколько стоит?': 'ско́лько сто́ит?', 'рубль / рубля / рублей': 'ру́бль / рубля́ / рубле́й',
  'покупать / купить': 'покупа́ть / купи́ть', 'дорого / дёшево': 'до́рого / дёшево',
  'весна / лето / осень / зима': 'весна́ / ле́то / о́сень / зима́', 'тепло / холодно / жарко': 'тепло́ / хо́лодно / жа́рко',
  'идёт дождь / идёт снег': 'идёт до́ждь / идёт сне́г', 'солнце / небо / ветер': 'со́лнце / не́бо / ве́тер',
  'какая сегодня погода?': 'кака́я сего́дня пого́да?', 'сегодня / вчера / завтра': 'сего́дня / вчера́ / за́втра',
  'неделя / месяц / год': 'неде́ля / ме́сяц / год', 'быть': 'быть', 'буду': 'бу́ду', 'ходить / пойти': 'ходи́ть / пойти́'
};

function addStressMarks(text) {
  return stressMarks[text] || text;
}

function removeStressMarks(text) {
  return String(text).replace(/\u0301/g, '');
}
// 登录 / 注册 / 邮箱验证 / 找回密码 逻辑
// ===================================================================
let pendingRegisterUsername = null;
let pendingResetUsername = null;

function showAuthForm(formId) {
  ['loginForm', 'registerForm', 'verifyForm', 'forgotForm', 'resetForm'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== formId);
  });
  document.querySelectorAll('.auth-error').forEach(el => el.textContent = '');
}

document.getElementById('showRegisterLink').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('registerForm');
});
document.getElementById('showForgotLink').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('forgotForm');
});
document.getElementById('backToLoginFromRegister').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('loginForm');
});
document.getElementById('backToLoginFromVerify').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('loginForm');
});
document.getElementById('backToLoginFromForgot').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('loginForm');
});
document.getElementById('backToLoginFromReset').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('loginForm');
});

// ---- 登录 ----
document.getElementById('loginSubmitBtn').addEventListener('click', async () => {
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  try {
    const email = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const result = await window.Auth.loginUser(email, password);
    if (!result.ok) {
      errorEl.textContent = result.error;
      return;
    }
    await enterApp(result.username, result.role);
  } catch (error) {
    errorEl.textContent = error.message || '登录失败，请稍后重试';
  }
});

// ---- 注册 ----
document.getElementById('registerSubmitBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('registerError');
  errEl.textContent = '';
  try {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const password2 = document.getElementById('registerPassword2').value;
    if (password !== password2) {
      errEl.textContent = '两次输入的密码不一致';
      return;
    }
    const result = await window.Auth.registerUser(username, email, password);
    if (!result.ok) {
      errEl.textContent = result.error;
      return;
    }
    showAuthForm('verifyForm');
    document.getElementById('verifyEmailTarget').textContent = result.email;
    document.getElementById('demoCodeBox').textContent = '注册成功，请打开最新确认邮件并点击其中的链接。这里不需要输入验证码。';
  } catch (error) {
    errEl.textContent = error.message || '注册失败，请稍后重试';
  }
});

document.getElementById('verifySubmitBtn').addEventListener('click', () => {
  showAuthForm('loginForm');
  document.getElementById('loginError').textContent = '确认邮件链接打开成功后，请使用注册邮箱和密码登录';
});

document.getElementById('resendCodeLink').addEventListener('click', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('verifyError');
  errorEl.textContent = '';
  try {
    const email = document.getElementById('verifyEmailTarget').textContent.trim();
    const result = await window.Auth.resendConfirmation(email);
    errorEl.className = result.ok ? 'auth-success' : 'auth-error';
    errorEl.textContent = result.ok
      ? '新的确认邮件已发送，请只使用最新邮件中的链接。若收不到，请检查垃圾邮件。'
      : result.error;
  } catch (error) {
    errorEl.textContent = error.message || '邮件发送失败，请稍后重试';
  }
});

// ---- 忘记密码 ----
document.getElementById('forgotSubmitBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('forgotError');
  errEl.textContent = '';
  try {
    const result = await window.Auth.requestPasswordReset(document.getElementById('forgotInput').value);
    if (!result.ok) {
      errEl.textContent = result.error;
      return;
    }
    showAuthForm('resetForm');
    document.getElementById('resetEmailTarget').textContent = result.email;
    document.getElementById('resetDemoCodeBox').textContent = '重置邮件已发送，请点击邮件中的链接后返回此页面设置新密码。';
  } catch (error) {
    errEl.textContent = error.message || '发送失败，请稍后重试';
  }
});

document.getElementById('resetSubmitBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('resetError');
  errEl.textContent = '';
  try {
    const result = await window.Auth.resetPassword(document.getElementById('resetNewPassword').value);
    if (!result.ok) {
      errEl.textContent = result.error;
      return;
    }
    showAuthForm('loginForm');
    document.getElementById('loginError').textContent = '密码重置成功，请使用新密码登录';
  } catch (error) {
    errEl.textContent = error.message || '重置失败，请稍后重试';
  }
});
// ---- 登出 ----
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await updateLearningPresence(false);
  stopLearningPresence();
  await window.Auth.logoutUser();
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('authOverlay').classList.remove('hidden');
  showAuthForm('loginForm');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
});

// ---------- 学习进度（按用户隔离存储） ----------
let currentUsername = null;
let currentRole = null;
let progress = null;
let presenceTimer = null;

function progressKey(username) {
  return 'ru_learning_progress_v1::' + username.toLowerCase();
}

function loadProgress(username) {
  const raw = localStorage.getItem(progressKey(username));
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fallthrough */ }
  }
  return {
    lastVisit: null,
    streak: 0,
    quizzesCompleted: 0,
    bestScore: 0,
    wordsLearned: []
  };
}

function saveProgress(p) {
  localStorage.setItem(progressKey(currentUsername), JSON.stringify(p));
  syncLearningProgress();
}

function learningProgressPayload(isOnline = true) {
  return {
    user_id: window.Auth.currentUserId,
    username: currentUsername,
    streak: Number(progress && progress.streak) || 0,
    quizzes_completed: Number(progress && progress.quizzesCompleted) || 0,
    best_score: Number(progress && progress.bestScore) || 0,
    words_learned_count: progress && Array.isArray(progress.wordsLearned) ? progress.wordsLearned.length : 0,
    lessons_viewed_count: progress && Array.isArray(progress.lessonsViewed) ? progress.lessonsViewed.length : 0,
    last_visit: progress && progress.lastVisit ? progress.lastVisit : null,
    last_seen_at: new Date().toISOString(),
    is_online: isOnline,
    current_book_id: currentBookId,
    updated_at: new Date().toISOString()
  };
}

async function updateLearningPresence(isOnline = true) {
  if (!currentUsername || !window.Auth.currentUserId || !progress) return;
  try {
    await window.Auth.supabase
      .from('learning_progress')
      .upsert(learningProgressPayload(isOnline), { onConflict: 'user_id' });
  } catch (error) {
    // The table may not exist until the Supabase migration is run.
  }
}

function syncLearningProgress() {
  updateLearningPresence(true);
}

function startLearningPresence() {
  stopLearningPresence();
  updateLearningPresence(true);
  presenceTimer = window.setInterval(() => updateLearningPresence(true), 60000);
}

function stopLearningPresence() {
  if (presenceTimer) {
    window.clearInterval(presenceTimer);
    presenceTimer = null;
  }
}

function updateStreak(p) {
  const today = new Date().toDateString();
  if (p.lastVisit === today) return p;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (p.lastVisit === yesterday.toDateString()) {
    p.streak += 1;
  } else {
    p.streak = 1;
  }
  p.lastVisit = today;
  saveProgress(p);
  return p;
}

function refreshHeaderAndStats() {
  document.getElementById('streakBadge').textContent = '🔥 连续学习 ' + progress.streak + ' 天';
  document.getElementById('statStreak').textContent = progress.streak;
  document.getElementById('statQuizzes').textContent = progress.quizzesCompleted;
  document.getElementById('statBestScore').textContent = progress.bestScore;
  document.getElementById('statWordsLearned').textContent = progress.wordsLearned.length;
}

function markWordLearned(ru) {
  if (!progress.wordsLearned.includes(ru)) {
    progress.wordsLearned.push(ru);
    saveProgress(progress);
    refreshHeaderAndStats();
  }
}

// ---------- 留言反馈 ----------
const FEEDBACK_KEY = 'ru_learning_feedback_v1';
function escapeFeedbackHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function formatFeedbackTime(timestamp) { return new Date(timestamp).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatAdminTime(timestamp) {
  if (!timestamp) return '暂无记录';
  return new Date(timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
async function loadFeedback() {
  const { data, error } = await window.Auth.supabase.from('feedback').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
function renderFeedbackCard(item, isAdminView) {
  const replied = Boolean(item.reply);
  const replyHtml = replied ? '<div class="feedback-reply"><strong>管理员回复</strong><p>' + escapeFeedbackHtml(item.reply) + '</p><time>' + formatFeedbackTime(item.replied_at) + '</time></div>' : '<div class="feedback-waiting">我们会认真阅读你的留言。</div>';
  const adminReplyHtml = isAdminView && !replied ? '<div class="admin-reply-box"><textarea class="admin-reply-input" data-feedback-id="' + item.id + '" rows="3" maxlength="500" placeholder="写下给用户的回复"></textarea><button class="reply-btn" data-feedback-id="' + item.id + '">发送回复</button></div>' : '';
  return '<article class="feedback-item"><div class="feedback-item-top"><div><span class="feedback-type">' + escapeFeedbackHtml(item.feedback_type) + '</span><h4>' + escapeFeedbackHtml(item.title) + '</h4></div><span class="feedback-badge ' + (replied ? 'replied' : 'pending') + '">' + (replied ? '已回复' : '待回复') + '</span></div><p class="feedback-content">' + escapeFeedbackHtml(item.content) + '</p><div class="feedback-meta"><span>' + (isAdminView ? '来自 ' + escapeFeedbackHtml(item.username) : '提交于') + '</span><time>' + formatFeedbackTime(item.created_at) + '</time></div>' + replyHtml + adminReplyHtml + '</article>';
}
async function renderFeedback() {
  const myList = document.getElementById('myFeedbackList');
  if (!myList || !currentUsername) return;
  try {
    const all = await loadFeedback();
    const mine = all.filter(item => item.user_id === window.Auth.currentUserId || item.username === currentUsername);
    document.getElementById('feedbackCount').textContent = mine.length + ' 条';
    document.getElementById('feedbackStatus').textContent = mine.length ? '已留言 ' + mine.length + ' 条' : '欢迎反馈';
    myList.innerHTML = mine.length ? mine.map(item => renderFeedbackCard(item, false)).join('') : '<div class="feedback-empty"><strong>还没有留言</strong><span>你的第一条反馈会出现在这里。</span></div>';
  } catch (error) {
    myList.innerHTML = '<div class="feedback-empty"><strong>反馈服务暂时不可用</strong><span>' + escapeFeedbackHtml(error.message) + '</span></div>';
  }
}
function initFeedback() {
  const form = document.getElementById('feedbackForm');
  const content = document.getElementById('feedbackContent');
  const counter = document.getElementById('feedbackContentCount');
  content.addEventListener('input', () => { counter.textContent = content.value.length; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const title = document.getElementById('feedbackTitle').value.trim();
    const text = content.value.trim();
    if (!title || !text || !window.Auth.currentUserId) return;
    const { error } = await window.Auth.supabase.from('feedback').insert({ user_id: window.Auth.currentUserId, username: currentUsername, feedback_type: document.getElementById('feedbackType').value, title, content: text });
    const message = document.getElementById('feedbackFormMessage');
    if (error) { message.textContent = error.message; return; }
    form.reset();
    counter.textContent = '0';
    message.textContent = '留言已发送，感谢你的反馈！';
    await renderFeedback();
    window.setTimeout(() => { message.textContent = ''; }, 3000);
  });
}
// ---------- 标签切换 ----------
const tabBtns = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'admin') renderAdminPanel();
    if (btn.dataset.tab === 'feedback') renderFeedback();
  });
});


// ---------- 课程模块 ----------
let currentCourseIndex = 0;
let currentBookId = courseBooks[0].id;

function currentBook() {
  return courseBooks.find(book => book.id === currentBookId) || courseBooks[0];
}

function courseBookSelectionKey() {
  return 'ru_course_book_selection::' + currentUsername.toLowerCase();
}

function setCourseBook(bookId, persist = true) {
  const nextBook = courseBooks.find(book => book.id === bookId) || courseBooks[0];
  currentBookId = nextBook.id;
  courseData = nextBook.lessons;
  currentCourseIndex = 0;
  if (persist && currentUsername) localStorage.setItem(courseBookSelectionKey(), currentBookId);
  renderBookSelectors();
  renderCourseList();
  renderCourseDetail();
  initVocabUnitSelector();
  refreshVocabWords();
  initQuizUnitSelector();
  syncLearningProgress();
}

function loadCourseBookSelection() {
  const saved = currentUsername ? localStorage.getItem(courseBookSelectionKey()) : null;
  setCourseBook(saved || courseBooks[0].id, false);
}

function renderBookSelector(containerId, compact) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  courseBooks.forEach(book => {
    const btn = document.createElement('button');
    btn.className = (compact ? 'book-mini-btn' : 'book-selector-btn') + (book.id === currentBookId ? ' active' : '');
    btn.type = 'button';
    btn.textContent = compact ? book.shortTitle : book.title;
    btn.title = book.title + '：' + book.lessons.length + ' 课';
    btn.addEventListener('click', () => setCourseBook(book.id));
    container.appendChild(btn);
  });
}

function renderBookSelectors() {
  const book = currentBook();
  const titleEl = document.getElementById('currentBookTitle');
  const descEl = document.getElementById('currentBookDesc');
  if (titleEl) titleEl.textContent = book.title;
  if (descEl) descEl.textContent = book.description + ' 当前共 ' + book.lessons.length + ' 课。';
  const vocabTitle = document.getElementById('vocabUnitSelectorTitle');
  const quizTitle = document.getElementById('quizUnitSelectorTitle');
  if (vocabTitle) vocabTitle.textContent = '📚 选择要学习的单元（' + book.title + '，可多选）';
  if (quizTitle) quizTitle.textContent = '📚 选择要测验的单元（' + book.title + '，可多选）';
  renderBookSelector('courseBookSelectorButtons', false);
  renderBookSelector('vocabBookSelectorButtons', true);
  renderBookSelector('quizBookSelectorButtons', true);
}

function renderCourseList() {
  const listEl = document.getElementById('courseList');
  listEl.innerHTML = '';
  if (courseData.length === 0) {
    listEl.innerHTML = '<div class="course-list-empty">这个分类还没有课程</div>';
    return;
  }
  courseData.forEach((lesson, idx) => {
    const item = document.createElement('div');
    item.className = 'course-list-item' + (idx === currentCourseIndex ? ' active' : '');
    item.innerHTML = '<span class="course-num">' + lesson.id + '</span><span class="course-name">' + lesson.title + '</span>';
    item.addEventListener('click', () => {
      currentCourseIndex = idx;
      renderCourseList();
      renderCourseDetail();
    });
    listEl.appendChild(item);
  });
}

function renderCourseDetail() {
  const lesson = courseData[currentCourseIndex];
  const detailEl = document.getElementById('courseDetail');
  if (!lesson) {
    const book = currentBook();
    detailEl.innerHTML =
      '<div class="course-empty-detail">' +
      '<h3>' + book.title + '</h3>' +
      '<p>' + book.description + '</p>' +
      '<p>这个大类已经创建好，后续可以直接添加课程、词汇和测验题。</p>' +
      '</div>';
    return;
  }

  let vocabHtml = '<table class="vocab-table">';
  vocabHtml += '<tr><th>俄语</th><th>词性</th><th>释义</th><th></th></tr>';
  lesson.vocab.forEach(w => {
    vocabHtml += '<tr><td class="vocab-ru">' + addStressMarks(w.ru) + '</td><td class="vocab-pos">' + w.pos + '</td><td>' + w.zh + '</td><td><button class="mini-speak-btn" data-word="' + w.ru.replace(/"/g, '&quot;') + '">🔊</button></td></tr>';
  });
  vocabHtml += '</table>';

  let grammarHtml = '';
  lesson.grammar.forEach(g => {
    grammarHtml += '<div class="grammar-block">';
    grammarHtml += '<h4>' + g.title + '</h4>';
    grammarHtml += '<p class="grammar-explain">' + g.explain + '</p>';
    grammarHtml += '<ul class="grammar-examples">';
    g.examples.forEach(ex => {
      grammarHtml += '<li><span class="ex-ru">' + ex.ru + '</span><span class="ex-zh">' + ex.zh + '</span></li>';
    });
    grammarHtml += '</ul></div>';
  });

  let textHtml = '<h4 class="text-title">' + lesson.text.title + '</h4>';
  lesson.text.lines.forEach(line => {
    textHtml += '<div class="text-line"><span class="text-ru">' + line.ru + '</span><span class="text-zh">' + line.zh + '</span></div>';
  });

  detailEl.innerHTML =
    '<h3 class="course-title">' + lesson.title + '</h3>' +
    '<p class="course-subtitle">' + lesson.subtitle + '</p>' +
    '<div class="course-section"><h3>📖 生词表</h3>' + vocabHtml + '</div>' +
    '<div class="course-section"><h3>📐 语法讲解</h3>' + grammarHtml + '</div>' +
    '<div class="course-section"><h3>📝 课文</h3><div class="course-text">' + textHtml + '</div></div>';

  detailEl.querySelectorAll('.mini-speak-btn').forEach(btn => {
    btn.addEventListener('click', () => speak(btn.dataset.word));
  });
  detailEl.querySelectorAll('.text-ru').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => speak(el.textContent));
  });

  if (currentUsername) markLessonViewed(lesson.id);
}

function markLessonViewed(lessonId) {
  if (!progress.lessonsViewed) progress.lessonsViewed = [];
  const scopedLessonId = currentBookId + ':' + lessonId;
  if (!progress.lessonsViewed.includes(scopedLessonId)) {
    progress.lessonsViewed.push(scopedLessonId);
    saveProgress(progress);
    refreshHeaderAndStats();
  }
}

// ---------- 单词查询 ----------
let externalDictionaryPromise = null;
let externalDictionaryEntries = null;
let externalDictionaryMeta = null;

function normalizeSearchText(value) {
  return removeStressMarks(String(value || '').toLowerCase().trim());
}

function getSearchableEntries() {
  const entries = [];
  courseBooks.forEach(book => {
    book.lessons.forEach(lesson => {
      lesson.vocab.forEach(word => {
        entries.push({ ...word, bookId: book.id, bookTitle: book.title, lessonId: lesson.id, lessonTitle: lesson.title, lesson });
      });
    });
  });
  return entries;
}

function searchWords(query) {
  const needle = normalizeSearchText(query);
  if (!needle) return [];
  return getSearchableEntries()
    .filter(entry => {
      const ru = normalizeSearchText(entry.ru);
      const zh = normalizeSearchText(entry.zh);
      return ru.includes(needle) || zh.includes(needle);
    })
    .sort((a, b) => {
      const aRu = normalizeSearchText(a.ru);
      const bRu = normalizeSearchText(b.ru);
      const aExact = aRu === needle ? 0 : 1;
      const bExact = bRu === needle ? 0 : 1;
      return aExact - bExact || aRu.length - bRu.length;
    })
    .slice(0, 12);
}

async function loadExternalDictionary() {
  if (externalDictionaryEntries) return externalDictionaryEntries;
  if (!externalDictionaryPromise) {
    externalDictionaryPromise = Promise.all([
      fetch('assets/dictionary/ru-zh-dictionary.json').then(response => {
        if (!response.ok) throw new Error('大型字典加载失败');
        return response.json();
      }),
      fetch('assets/dictionary/ru-zh-dictionary-meta.json').then(response => response.ok ? response.json() : null)
    ]).then(([entries, meta]) => {
      externalDictionaryMeta = meta;
      externalDictionaryEntries = entries.map(entry => ({
        ru: entry.ru,
        zh: Array.isArray(entry.zh) ? entry.zh.join('；') : String(entry.zh || ''),
        pos: mapDictionaryPos(entry.pos),
        source: 'FreeDict',
        dictionaryZh: entry.zh || []
      }));
      return externalDictionaryEntries;
    });
  }
  return externalDictionaryPromise;
}

function mapDictionaryPos(posValues) {
  const labels = {
    n: '名词',
    pn: '专名',
    v: '动词',
    adj: '形容词',
    adv: '副词'
  };
  const values = Array.isArray(posValues) ? posValues : [];
  return values.map(value => labels[value] || value).filter(Boolean).join(' / ') || '词条';
}

function searchExternalDictionary(entries, query, limit) {
  const needle = normalizeSearchText(query);
  if (!needle) return [];
  const exact = [];
  const prefix = [];
  const contains = [];
  const zhMatches = [];
  for (const entry of entries) {
    const ru = normalizeSearchText(entry.ru);
    const zh = normalizeSearchText(entry.zh);
    if (ru === needle) exact.push(entry);
    else if (ru.startsWith(needle)) prefix.push(entry);
    else if (ru.includes(needle)) contains.push(entry);
    else if (zh.includes(needle)) zhMatches.push(entry);
    if (exact.length >= limit) break;
  }
  return [...exact, ...prefix, ...contains, ...zhMatches]
    .filter((entry, index, list) => list.findIndex(item => normalizeSearchText(item.ru) === normalizeSearchText(entry.ru)) === index)
    .slice(0, limit);
}

async function searchWordsLarge(query) {
  const courseResults = searchWords(query).map(entry => ({ ...entry, source: 'course' }));
  const dictionary = await loadExternalDictionary();
  const dictionaryResults = searchExternalDictionary(dictionary, query, Math.max(0, 18 - courseResults.length));
  return [...courseResults, ...dictionaryResults].slice(0, 18);
}

function isSingleRussianWord(value) {
  return /^[а-яё-]+$/i.test(normalizeSearchText(value));
}

function stemForAEnding(word) {
  return word.slice(0, -1);
}

function softAfterStem(stem) {
  return /[гкхжчшщц]$/i.test(stem);
}

function nounCaseRows(word) {
  const lower = normalizeSearchText(word);
  if (!isSingleRussianWord(lower)) return null;
  const last = lower.slice(-1);
  const rows = [];
  const push = (label, value) => rows.push([label, value]);

  if (last === 'а') {
    const stem = stemForAEnding(lower);
    const gen = stem + (softAfterStem(stem) ? 'и' : 'ы');
    push('第一格 主格', lower);
    push('第二格 属格', gen);
    push('第三格 与格', stem + 'е');
    push('第四格 宾格', stem + 'у');
    push('第五格 工具格', stem + 'ой');
    push('第六格 前置格', stem + 'е');
    push('复数第一格', gen);
    push('复数第二格（基础）', stem);
    return { title: '名词单数变格（规则基础）', rows };
  }
  if (last === 'я') {
    const stem = lower.slice(0, -1);
    push('第一格 主格', lower);
    push('第二格 属格', stem + 'и');
    push('第三格 与格', stem + 'е');
    push('第四格 宾格', stem + 'ю');
    push('第五格 工具格', stem + 'ей');
    push('第六格 前置格', stem + 'е');
    push('复数第一格', stem + 'и');
    push('复数第二格（基础）', stem + 'ь');
    return { title: '名词单数变格（规则基础）', rows };
  }
  if (last === 'о') {
    const stem = lower.slice(0, -1);
    push('第一格 主格', lower);
    push('第二格 属格', stem + 'а');
    push('第三格 与格', stem + 'у');
    push('第四格 宾格', lower);
    push('第五格 工具格', stem + 'ом');
    push('第六格 前置格', stem + 'е');
    push('复数第一格', stem + 'а');
    push('复数第二格（基础）', stem);
    return { title: '名词单数变格（规则基础）', rows };
  }
  if (last === 'е') {
    const stem = lower.slice(0, -1);
    push('第一格 主格', lower);
    push('第二格 属格', stem + 'я');
    push('第三格 与格', stem + 'ю');
    push('第四格 宾格', lower);
    push('第五格 工具格', stem + 'ем');
    push('第六格 前置格', stem + 'е');
    push('复数第一格', stem + 'я');
    push('复数第二格（基础）', stem + 'й');
    return { title: '名词单数变格（规则基础）', rows };
  }
  if (last === 'ь') {
    const stem = lower.slice(0, -1);
    push('第一格 主格', lower);
    push('第二格 属格', stem + 'я / ' + stem + 'и');
    push('第三格 与格', stem + 'ю / ' + stem + 'и');
    push('第四格 宾格', lower + ' / ' + stem + 'ь');
    push('第五格 工具格', stem + 'ем / ' + stem + 'ью');
    push('第六格 前置格', stem + 'е / ' + stem + 'и');
    push('复数第一格', stem + 'и');
    push('复数第二格（基础）', stem + 'ей');
    return { title: '名词变格（软音符号需按性别确认）', rows };
  }
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(last)) {
    const stem = lower;
    push('第一格 主格', stem);
    push('第二格 属格', stem + 'а');
    push('第三格 与格', stem + 'у');
    push('第四格 宾格', stem + ' / ' + stem + 'а');
    push('第五格 工具格', stem + 'ом');
    push('第六格 前置格', stem + 'е');
    push('复数第一格', stem + (softAfterStem(stem) ? 'и' : 'ы'));
    push('复数第二格（基础）', stem + 'ов');
    return { title: '名词单数变格（规则基础）', rows };
  }
  return null;
}

function adjectiveRows(word) {
  const lower = normalizeSearchText(word);
  if (!isSingleRussianWord(lower)) return null;
  let stem = null;
  let soft = false;
  if (lower.endsWith('ый') || lower.endsWith('ой')) stem = lower.slice(0, -2);
  if (lower.endsWith('ий')) { stem = lower.slice(0, -2); soft = true; }
  if (lower.endsWith('ая')) stem = lower.slice(0, -2);
  if (lower.endsWith('яя')) { stem = lower.slice(0, -2); soft = true; }
  if (lower.endsWith('ое') || lower.endsWith('ые')) stem = lower.slice(0, -2);
  if (lower.endsWith('ее') || lower.endsWith('ие')) { stem = lower.slice(0, -2); soft = true; }
  if (!stem) return null;
  const m = stem + (soft ? 'ий' : 'ый');
  const rows = [
    ['阳性 第一格', m],
    ['阴性 第一格', stem + (soft ? 'яя' : 'ая')],
    ['中性 第一格', stem + (soft ? 'ее' : 'ое')],
    ['复数 第一格', stem + (soft ? 'ие' : 'ые')],
    ['阳性 第二格', stem + (soft ? 'его' : 'ого')],
    ['阳性 第三格', stem + (soft ? 'ему' : 'ому')],
    ['阳性 第五格', stem + (soft ? 'им' : 'ым')],
    ['阳性 第六格', stem + (soft ? 'ем' : 'ом')]
  ];
  return { title: '形容词变格（阳性基础形式）', rows };
}

function verbRows(word) {
  const lower = normalizeSearchText(word);
  if (!isSingleRussianWord(lower)) return null;
  const reflexive = lower.endsWith('ться');
  const infinitive = reflexive ? lower.slice(0, -4) + 'ть' : lower;
  if (!infinitive.endsWith('ть')) return null;
  const base = infinitive.slice(0, -2);
  const reflexiveSuffix = reflexive ? 'ся' : '';
  let rows = null;
  if (infinitive.endsWith('ить')) {
    const stem = infinitive.slice(0, -3);
    rows = [
      ['я', stem + 'ю' + reflexiveSuffix],
      ['ты', stem + 'ишь' + reflexiveSuffix],
      ['он/она', stem + 'ит' + reflexiveSuffix],
      ['мы', stem + 'им' + reflexiveSuffix],
      ['вы', stem + 'ите' + reflexiveSuffix],
      ['они', stem + 'ят' + reflexiveSuffix]
    ];
  } else if (infinitive.endsWith('ать') || infinitive.endsWith('ять')) {
    const stem = infinitive.slice(0, -2);
    rows = [
      ['я', stem + 'ю' + reflexiveSuffix],
      ['ты', stem + 'ешь' + reflexiveSuffix],
      ['он/она', stem + 'ет' + reflexiveSuffix],
      ['мы', stem + 'ем' + reflexiveSuffix],
      ['вы', stem + 'ете' + reflexiveSuffix],
      ['они', stem + 'ют' + reflexiveSuffix]
    ];
  }
  const pastBase = base.slice(0, -1);
  const pastRows = [
    ['过去时 阳性', pastBase + 'л' + reflexiveSuffix],
    ['过去时 阴性', pastBase + 'ла' + reflexiveSuffix],
    ['过去时 中性', pastBase + 'ло' + reflexiveSuffix],
    ['过去时 复数', pastBase + 'ли' + reflexiveSuffix]
  ];
  return { title: rows ? '动词现在时与过去时（规则基础）' : '动词过去时（规则基础）', rows: rows ? [...rows, ...pastRows] : pastRows };
}

const pronounCaseForms = {
  'я': [['第一格', 'я'], ['第二格', 'меня'], ['第三格', 'мне'], ['第四格', 'меня'], ['第五格', 'мной'], ['第六格', 'обо мне']],
  'ты': [['第一格', 'ты'], ['第二格', 'тебя'], ['第三格', 'тебе'], ['第四格', 'тебя'], ['第五格', 'тобой'], ['第六格', 'о тебе']],
  'он': [['第一格', 'он'], ['第二格', 'его'], ['第三格', 'ему'], ['第四格', 'его'], ['第五格', 'им'], ['第六格', 'о нём']],
  'она': [['第一格', 'она'], ['第二格', 'её'], ['第三格', 'ей'], ['第四格', 'её'], ['第五格', 'ей'], ['第六格', 'о ней']],
  'мы': [['第一格', 'мы'], ['第二格', 'нас'], ['第三格', 'нам'], ['第四格', 'нас'], ['第五格', 'нами'], ['第六格', 'о нас']],
  'вы': [['第一格', 'вы'], ['第二格', 'вас'], ['第三格', 'вам'], ['第四格', 'вас'], ['第五格', 'вами'], ['第六格', 'о вас']],
  'они': [['第一格', 'они'], ['第二格', 'их'], ['第三格', 'им'], ['第四格', 'их'], ['第五格', 'ими'], ['第六格', 'о них']]
};

function getFormTable(entry) {
  const lower = normalizeSearchText(entry.ru);
  if (pronounCaseForms[lower]) return { title: '人称代词各格', rows: pronounCaseForms[lower] };
  if (entry.pos.includes('动词')) return verbRows(entry.ru);
  if (entry.pos.includes('形容词')) return adjectiveRows(entry.ru);
  if (entry.pos.includes('代词')) return adjectiveRows(entry.ru);
  if (entry.pos.includes('名词') || entry.pos.includes('专名')) return nounCaseRows(entry.ru);
  return null;
}

function findExamplesForEntry(entry) {
  const target = normalizeSearchText(entry.ru).split(/[,\s/]+/).filter(Boolean)[0];
  const examples = [];
  if (!target) return examples;
  if (entry.lesson) {
    entry.lesson.grammar.forEach(item => {
      item.examples.forEach(example => {
        if (normalizeSearchText(example.ru).includes(target)) examples.push(example);
      });
    });
    entry.lesson.text.lines.forEach(line => {
      if (normalizeSearchText(line.ru).includes(target)) examples.push(line);
    });
  }
  if (examples.length === 0 && isSingleRussianWord(entry.ru)) {
    examples.push({ ru: 'Я повторяю слово "' + entry.ru + '".', zh: '我在复习“' + entry.zh + '”这个词。' });
  }
  return examples.slice(0, 3);
}

function renderFormTable(formTable) {
  if (!formTable) {
    return '<div class="word-form-note">这个词是短语、功能词或不适合自动变格的词。请结合例句记忆。</div>';
  }
  return '<div class="word-form-table"><h4>' + escapeFeedbackHtml(formTable.title) + '</h4>' +
    formTable.rows.map(row =>
      '<div class="word-form-row"><span>' + escapeFeedbackHtml(row[0]) + '</span><strong>' + escapeFeedbackHtml(row[1]) + '</strong></div>'
    ).join('') +
    '<p class="word-form-note">自动生成的是规则基础形式，少数不规则词以教材和词典为准。</p></div>';
}

function renderWordSearchResults(results, query) {
  const container = document.getElementById('wordSearchResults');
  if (!query.trim()) {
    container.innerHTML = '<div class="word-search-empty">输入一个词，查询结果会显示在这里。</div>';
    return;
  }
  if (results.length === 0) {
    container.innerHTML = '<div class="word-search-empty">没有找到相关单词。可以试试俄语原形、中文释义或课程里的关键词。</div>';
    return;
  }
  container.innerHTML = results.map(entry => {
    const formTable = getFormTable(entry);
    const examples = findExamplesForEntry(entry);
    const exampleHtml = examples.map(example =>
      '<li><span class="ex-ru">' + escapeFeedbackHtml(example.ru) + '</span><span class="ex-zh">' + escapeFeedbackHtml(example.zh) + '</span></li>'
    ).join('');
    const sourceMeta = entry.lesson
      ? escapeFeedbackHtml(entry.bookTitle) + ' · 第 ' + entry.lessonId + ' 课'
      : '大型字典 · FreeDict';
    return '<article class="word-result-card">' +
      '<div class="word-result-top"><div><h3>' + escapeFeedbackHtml(addStressMarks(entry.ru)) + '</h3><p>' + escapeFeedbackHtml(entry.zh) + '</p></div>' +
      '<button class="mini-speak-btn word-result-speak" data-word="' + escapeFeedbackHtml(entry.ru) + '">🔊</button></div>' +
      '<div class="word-result-meta"><span>' + escapeFeedbackHtml(entry.pos) + '</span><span>' + sourceMeta + '</span></div>' +
      renderFormTable(formTable) +
      '<div class="word-examples"><h4>例句</h4><ul class="grammar-examples">' + exampleHtml + '</ul></div>' +
      '</article>';
  }).join('');
  if (externalDictionaryMeta) {
    container.innerHTML += '<p class="dictionary-source-note">大型字典数据来源：FreeDict/WikDict，基于 Wiktionary/DBnary，许可协议 CC BY-SA 3.0。当前离线俄语索引约 ' + externalDictionaryMeta.russianEntries.toLocaleString('zh-CN') + ' 条。</p>';
  }
  container.querySelectorAll('.word-result-speak').forEach(btn => {
    btn.addEventListener('click', () => speak(btn.dataset.word));
  });
}

function renderWordSearchLoading() {
  document.getElementById('wordSearchResults').innerHTML = '<div class="word-search-empty">正在加载大型字典，请稍候...</div>';
}

async function runWordSearch() {
  const input = document.getElementById('wordSearchInput');
  const query = input.value;
  if (!query.trim()) {
    renderWordSearchResults([], query);
    return;
  }
  renderWordSearchLoading();
  try {
    renderWordSearchResults(await searchWordsLarge(query), query);
  } catch (error) {
    const courseResults = searchWords(query);
    renderWordSearchResults(courseResults, query);
    document.getElementById('wordSearchResults').innerHTML += '<div class="word-search-empty">大型字典暂时加载失败，当前只显示课程词库结果。</div>';
  }
}

document.getElementById('wordSearchBtn').addEventListener('click', runWordSearch);
document.getElementById('wordSearchInput').addEventListener('keydown', event => {
  if (event.key === 'Enter') runWordSearch();
});
document.getElementById('wordSearchInput').addEventListener('input', event => {
  const query = event.target.value.trim();
  if (query.length === 0) renderWordSearchResults([], query);
  if (query.length >= 2) runWordSearch();
});

// ---------- 字母表 ----------
function renderAlphabet() {
  const grid = document.getElementById('alphabetGrid');
  grid.innerHTML = '';
  alphabetData.forEach(letter => {
    const card = document.createElement('div');
    card.className = 'letter-card';
    card.innerHTML =
      '<span class="letter-upper">' + letter.upper + '</span>' +
      '<span class="letter-lower">' + letter.lower + '</span>' +
      '<span class="letter-sound">[' + letter.sound + ']</span>' +
      '<span class="letter-example">' + letter.example + ' · ' + letter.exampleMeaning + '</span>';
    card.addEventListener('click', () => speak(letter.example));
    grid.appendChild(card);
  });
}

// ---------- 单元选择（走遍俄罗斯 1，词汇卡片 & 测验通用） ----------
let vocabSelectedUnits = [];
let quizSelectedUnits = [];

function unitSelectionKey(type) {
  return 'ru_unit_selection_' + type + '::' + currentBookId + '::' + currentUsername.toLowerCase();
}

function legacyUnitSelectionKey(type) {
  return 'ru_unit_selection_' + type + '::' + currentUsername.toLowerCase();
}

function loadUnitSelection(type) {
  const raw = localStorage.getItem(unitSelectionKey(type)) || (currentBookId === courseBooks[0].id ? localStorage.getItem(legacyUnitSelectionKey(type)) : null);
  const availableIds = courseData.map(l => l.id);
  if (availableIds.length === 0) return [];
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        const validIds = arr.filter(id => availableIds.includes(id));
        const hadAllOriginalEight = [1, 2, 3, 4, 5, 6, 7, 8].every(id => validIds.includes(id));
        if (hadAllOriginalEight && courseData.length > validIds.length) return availableIds;
        return validIds.length > 0 ? validIds : availableIds;
      }
    } catch (e) { /* fallthrough */ }
  }
  return courseData.map(l => l.id);
}

function saveUnitSelection(type, unitIds) {
  localStorage.setItem(unitSelectionKey(type), JSON.stringify(unitIds));
}

function getWordsForUnits(unitIds) {
  const words = [];
  courseData.forEach(lesson => {
    if (unitIds.includes(lesson.id)) {
      lesson.vocab.forEach(w => words.push({ ru: w.ru, displayRu: addStressMarks(w.ru), zh: w.zh, lessonId: lesson.id }));
    }
  });
  return words;
}

function renderUnitCheckboxes(containerId, countId, type, selectedUnits, onChange) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  courseData.forEach(lesson => {
    const label = document.createElement('label');
    label.className = 'unit-checkbox-item';
    const checked = selectedUnits.includes(lesson.id);
    label.innerHTML =
      '<input type="checkbox" data-lesson-id="' + lesson.id + '"' + (checked ? ' checked' : '') + ' />' +
      '<span>第 ' + lesson.id + ' 课</span>';
    container.appendChild(label);
  });
  container.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.lessonId);
      if (cb.checked) {
        if (!selectedUnits.includes(id)) selectedUnits.push(id);
      } else {
        const i = selectedUnits.indexOf(id);
        if (i !== -1) selectedUnits.splice(i, 1);
      }
      saveUnitSelection(type, selectedUnits);
      updateUnitCount(countId, selectedUnits);
      onChange();
    });
  });
  updateUnitCount(countId, selectedUnits);
}

function updateUnitCount(countId, selectedUnits) {
  const wordCount = getWordsForUnits(selectedUnits).length;
  document.getElementById(countId).textContent =
    '已选 ' + selectedUnits.length + ' / ' + courseData.length + ' 个单元，共 ' + wordCount + ' 个词汇';
}

// ---------- 词汇卡片 ----------
let currentVocabWords = [];
let currentCardIndex = 0;

function initVocabUnitSelector() {
  vocabSelectedUnits = loadUnitSelection('vocab');
  renderUnitCheckboxes('vocabUnitCheckboxes', 'vocabUnitCount', 'vocab', vocabSelectedUnits, refreshVocabWords);
}

document.getElementById('vocabSelectAllBtn').addEventListener('click', () => {
  vocabSelectedUnits = courseData.map(l => l.id);
  saveUnitSelection('vocab', vocabSelectedUnits);
  renderUnitCheckboxes('vocabUnitCheckboxes', 'vocabUnitCount', 'vocab', vocabSelectedUnits, refreshVocabWords);
  refreshVocabWords();
});

document.getElementById('vocabSelectNoneBtn').addEventListener('click', () => {
  vocabSelectedUnits = [];
  saveUnitSelection('vocab', vocabSelectedUnits);
  renderUnitCheckboxes('vocabUnitCheckboxes', 'vocabUnitCount', 'vocab', vocabSelectedUnits, refreshVocabWords);
  refreshVocabWords();
});

function refreshVocabWords() {
  currentVocabWords = getWordsForUnits(vocabSelectedUnits);
  currentCardIndex = 0;
  const emptyState = document.getElementById('vocabEmptyState');
  const cardArea = document.getElementById('vocabCardArea');
  if (currentVocabWords.length === 0) {
    emptyState.classList.remove('hidden');
    cardArea.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    cardArea.classList.remove('hidden');
    renderFlashcard();
  }
}

function renderFlashcard() {
  if (currentVocabWords.length === 0) return;
  const word = currentVocabWords[currentCardIndex];
  const flashcard = document.getElementById('flashcard');
  const handwriting = document.getElementById('cardHandwriting');
  const displayWord = word.displayRu || addStressMarks(word.ru);
  const handwritingWord = removeStressMarks(displayWord);
  document.getElementById('cardRu').textContent = displayWord;
  handwriting.textContent = handwritingWord;
  handwriting.setAttribute('aria-label', '标准俄语手写体：' + handwritingWord);
  document.getElementById('cardZh').textContent = word.zh;
  document.getElementById('cardCounter').textContent = (currentCardIndex + 1) + ' / ' + currentVocabWords.length;
  flashcard.classList.remove('flipped', 'showing-handwriting');
  flashcard.dataset.state = 'front';
  document.getElementById('flashcardHint').textContent = '点击一次查看中文，再点击一次查看俄语手写体';
  markWordLearned(word.ru);
}

function advanceFlashcardState() {
  const flashcard = document.getElementById('flashcard');
  const hint = document.getElementById('flashcardHint');
  const state = flashcard.dataset.state || 'front';
  if (state === 'front') {
    flashcard.classList.add('flipped');
    flashcard.classList.remove('showing-handwriting');
    flashcard.dataset.state = 'meaning';
    hint.textContent = '再点击一次查看俄语手写体';
  } else if (state === 'meaning') {
    flashcard.classList.remove('flipped');
    flashcard.classList.add('showing-handwriting');
    flashcard.dataset.state = 'handwriting';
    hint.textContent = '再点击一次回到俄语单词';
  } else {
    flashcard.classList.remove('flipped', 'showing-handwriting');
    flashcard.dataset.state = 'front';
    hint.textContent = '点击一次查看中文，再点击一次查看俄语手写体';
  }
}

document.getElementById('flashcard').addEventListener('click', advanceFlashcardState);
document.getElementById('flashcard').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    advanceFlashcardState();
  }
});

document.getElementById('prevCardBtn').addEventListener('click', () => {
  if (currentVocabWords.length === 0) return;
  currentCardIndex = (currentCardIndex - 1 + currentVocabWords.length) % currentVocabWords.length;
  renderFlashcard();
});

document.getElementById('nextCardBtn').addEventListener('click', () => {
  if (currentVocabWords.length === 0) return;
  currentCardIndex = (currentCardIndex + 1) % currentVocabWords.length;
  renderFlashcard();
});

document.getElementById('speakAllBtn').addEventListener('click', () => {
  if (currentVocabWords.length === 0) return;
  speak(currentVocabWords[currentCardIndex].ru);
});

// ---------- 测验 ----------
const QUIZ_LENGTH = 10;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let answered = false;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initQuizUnitSelector() {
  quizSelectedUnits = loadUnitSelection('quiz');
  renderUnitCheckboxes('quizUnitCheckboxes', 'quizUnitCount', 'quiz', quizSelectedUnits, () => {});
  document.getElementById('quizArea').classList.add('hidden');
  document.getElementById('quizResult').classList.add('hidden');
  document.getElementById('quizEmptyState').classList.add('hidden');
}

document.getElementById('quizSelectAllBtn').addEventListener('click', () => {
  quizSelectedUnits = courseData.map(l => l.id);
  saveUnitSelection('quiz', quizSelectedUnits);
  renderUnitCheckboxes('quizUnitCheckboxes', 'quizUnitCount', 'quiz', quizSelectedUnits, () => {});
});

document.getElementById('quizSelectNoneBtn').addEventListener('click', () => {
  quizSelectedUnits = [];
  saveUnitSelection('quiz', quizSelectedUnits);
  renderUnitCheckboxes('quizUnitCheckboxes', 'quizUnitCount', 'quiz', quizSelectedUnits, () => {});
});

document.getElementById('startQuizBtn').addEventListener('click', buildQuiz);

function buildQuiz() {
  const allWords = getWordsForUnits(quizSelectedUnits);
  const emptyState = document.getElementById('quizEmptyState');
  const quizArea = document.getElementById('quizArea');
  const quizResult = document.getElementById('quizResult');
  if (allWords.length < 4) {
    emptyState.classList.remove('hidden');
    emptyState.querySelector('p').textContent =
      allWords.length === 0 ? '请至少选择一个单元才能开始测验' : '所选单元词汇量太少（至少需要 4 个词），请多选几个单元';
    quizArea.classList.add('hidden');
    quizResult.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  quizQuestions = buildMixedQuiz(allWords, getQuizQuestionCount());
  quizIndex = 0;
  quizScore = 0;
  quizResult.classList.add('hidden');
  quizArea.classList.remove('hidden');
  renderQuizQuestion();
}

function getQuizQuestionCount() {
  const input = document.getElementById('quizQuestionCount');
  const value = input ? Number(input.value) : QUIZ_LENGTH;
  const safeValue = Number.isFinite(value) ? value : QUIZ_LENGTH;
  const count = Math.max(10, Math.min(100, Math.round(safeValue)));
  if (input) input.value = count;
  return count;
}

const CASE_QUESTIONS = [
  { units: [1, 2], type: '选择正确词格', prompt: 'У меня нет ___（弟弟）.', answer: 'брата', options: ['брат', 'брата', 'брату', 'братом'], explanation: 'нет 后接属格：брат → брата。' },
  { units: [1, 2], type: '选择正确词格', prompt: 'Я звоню ___（妈妈）.', answer: 'маме', options: ['мама', 'маму', 'маме', 'мамой'], explanation: 'звонить кому? 使用与格：мама → маме。' },
  { units: [1, 2], type: '选择正确词格', prompt: 'Это ___（我的） книга.', answer: 'моя', options: ['мой', 'моя', 'моё', 'мои'], explanation: 'книга 是阴性单数，所以用 моя。' },
  { units: [3], type: '选择正确词格', prompt: 'Мне ___ года.', answer: 'два', options: ['два', 'двух', 'двум', 'двумя'], explanation: '年龄表达“我两岁”：мне два года。' },
  { units: [4], type: '选择正确词格', prompt: 'Я ___ утром.', answer: 'работаю', options: ['работать', 'работаю', 'работает', 'работают'], explanation: 'я 的第一变位现在时词尾是 -ю：работаю。' },
  { units: [5], type: '选择正确词格', prompt: 'Я живу ___ городе.', answer: 'в', options: ['в', 'из', 'к', 'с'], explanation: '表示“在城市里”使用 в + 前置格：в городе。' },
  { units: [6], type: '选择正确词格', prompt: 'Я покупаю ___（面包）.', answer: 'хлеб', options: ['хлеб', 'хлеба', 'хлебу', 'хлебом'], explanation: '无生命阳性名词的宾格与主格相同：хлеб。' },
  { units: [7], type: '选择正确词格', prompt: 'Сегодня ___ холодно.', answer: 'очень', options: ['очень', 'оченью', 'оченьм', 'оченьи'], explanation: 'очень 是副词，形式不变。' },
  { units: [8], type: '选择正确词格', prompt: 'Вчера она ___ дома.', answer: 'была', options: ['был', 'была', 'были', 'будет'], explanation: 'она 的过去时形式是 была。' },
  { units: [5, 6], type: '选择正确词格', prompt: 'Мы говорим ___ школе.', answer: 'о', options: ['о', 'из', 'к', 'у'], explanation: 'говорить о ком? о чём?：говорим о школе。' }
];

const FILL_QUESTIONS = [
  { units: [1], type: '选择正确单词', prompt: '___ зовут Анна.', answer: 'Меня', options: ['Меня', 'Моя', 'Мне', 'Мой'], explanation: '“我叫安娜”是 Меня зовут Анна。' },
  { units: [2], type: '选择正确单词', prompt: 'Это ___ брат.', answer: 'мой', options: ['мой', 'моя', 'моё', 'мои'], explanation: 'брат 是阳性单数，使用 мой。' },
  { units: [3], type: '选择正确单词', prompt: 'Мне двадцать ___ .', answer: 'лет', options: ['год', 'года', 'лет', 'году'], explanation: '20 后使用 лет。' },
  { units: [4], type: '选择正确单词', prompt: 'Вечером я ___ дома.', answer: 'отдыхаю', options: ['отдыхать', 'отдыхаю', 'отдыхает', 'отдыхают'], explanation: 'я 的现在时形式是 отдыхаю。' },
  { units: [5], type: '选择正确单词', prompt: 'Рядом с домом есть ___ .', answer: 'парк', options: ['парк', 'парка', 'парку', 'парком'], explanation: 'есть 后这里使用主格：парк。' },
  { units: [6], type: '选择正确单词', prompt: 'Сколько ___ молоко?', answer: 'стоит', options: ['стоить', 'стоит', 'стоят', 'стоял'], explanation: '单数 молоко 搭配 стоит。' },
  { units: [7], type: '选择正确单词', prompt: 'Зимой часто идёт ___ .', answer: 'снег', options: ['снег', 'снега', 'снегу', 'снегом'], explanation: 'идёт снег 表示“下雪”。' },
  { units: [8], type: '选择正确单词', prompt: 'Завтра я ___ работать.', answer: 'буду', options: ['был', 'была', 'буду', 'были'], explanation: '第一人称简单将来时使用 буду + 原形。' }
];

const CORE_GRAMMAR_QUESTIONS = [
  { units: [1, 2], type: '名词性别', prompt: 'словарь 是 ___ 名词。', answer: '阳性', options: ['阳性', '阴性', '中性', '复数'], explanation: '以软音符结尾的 словарь 是阳性名词。' },
  { units: [1, 2], type: '名词性别', prompt: 'окно 是 ___ 名词。', answer: '中性', options: ['阳性', '阴性', '中性', '动物名词'], explanation: '以 -о 结尾的名词通常是中性。' },
  { units: [1, 2], type: '动物/非动物名词', prompt: 'Я вижу ___（学生）.', answer: 'студента', options: ['студент', 'студента', 'студенту', 'студентом'], explanation: '有生命阳性名词宾格同属格：студент → студента。' },
  { units: [5, 6], type: '动物/非动物名词', prompt: 'Я вижу ___（桌子）.', answer: 'стол', options: ['стол', 'стола', 'столу', 'столом'], explanation: '无生命阳性名词宾格同主格：стол。' },
  { units: [1, 2], type: '第二格 属格', prompt: 'У Анны нет ___（书）.', answer: 'книги', options: ['книга', 'книги', 'книгу', 'книгой'], explanation: 'нет 后使用第二格：книга → книги。' },
  { units: [3, 6], type: '第二格 属格', prompt: 'два ___（卢布）', answer: 'рубля', options: ['рубль', 'рубля', 'рублей', 'рублём'], explanation: '2-4 后常用名词单数第二格：рубля。' },
  { units: [5], type: '第二格 属格', prompt: 'Мы приехали из ___（城市）.', answer: 'города', options: ['город', 'города', 'городу', 'городом'], explanation: 'из 后接第二格：из города。' },
  { units: [2, 5], type: '第三格 与格', prompt: 'Мне нравится эта ___ .', answer: 'книга', options: ['книга', 'книги', 'книгу', 'книгой'], explanation: 'нравится 的喜欢对象是主语：эта книга。' },
  { units: [2, 5], type: '第三格 与格', prompt: '___ нравится музыка.（我喜欢音乐）', answer: 'Мне', options: ['Я', 'Меня', 'Мне', 'Мной'], explanation: 'кому нравится? 使用与格：мне。' },
  { units: [4, 6], type: '第五格 工具格', prompt: 'Я еду ___（公共汽车）.', answer: 'автобусом', options: ['автобус', 'автобуса', 'автобусом', 'автобусе'], explanation: '乘坐交通工具常用工具格：автобусом。' },
  { units: [8], type: '第五格 工具格', prompt: 'Он был ___（学生）.', answer: 'студентом', options: ['студент', 'студента', 'студентом', 'студенте'], explanation: 'быть 表示“曾经是”时，身份常用工具格。' },
  { units: [5], type: '第六格 前置格', prompt: 'Мы живём в ___（公寓）.', answer: 'квартире', options: ['квартира', 'квартиры', 'квартиру', 'квартире'], explanation: 'в + 第六格表示地点：в квартире。' },
  { units: [5], type: '第六格 前置格', prompt: 'Я думаю о ___（朋友）.', answer: 'друге', options: ['друг', 'друга', 'другу', 'друге'], explanation: 'о + 第六格：о друге。' },
  { units: [2, 5], type: '名词复数', prompt: 'мама 的复数第一格是 ___ .', answer: 'мамы', options: ['мамы', 'мам', 'мамам', 'мамами'], explanation: '阴性 -а 名词复数主格常变 -ы。' },
  { units: [5, 6], type: '复数第二格', prompt: 'пять ___（书）', answer: 'книг', options: ['книга', 'книги', 'книг', 'книгам'], explanation: '5 以上后接复数第二格：книг。' },
  { units: [1], type: '人称代词', prompt: 'Я говорю с ___（你）.', answer: 'тобой', options: ['ты', 'тебя', 'тебе', 'тобой'], explanation: 'с + 第五格：с тобой。' },
  { units: [1], type: '人称代词', prompt: 'Она ждёт ___（我）.', answer: 'меня', options: ['я', 'меня', 'мне', 'мной'], explanation: 'ждать кого? 常用第四/第二格形式 меня。' },
  { units: [2], type: '物主代词', prompt: 'Это ___ окно.', answer: 'моё', options: ['мой', 'моя', 'моё', 'мои'], explanation: 'окно 是中性单数，使用 моё。' },
  { units: [2], type: '物主代词', prompt: 'Это ___ родители.', answer: 'мои', options: ['мой', 'моя', 'моё', 'мои'], explanation: 'родители 是复数，使用 мои。' },
  { units: [2], type: '物主代词', prompt: '___ дом большой.（他的房子很大）', answer: 'Его', options: ['Его', 'Ему', 'Им', 'О нём'], explanation: 'его 作物主代词时不变格。' },
  { units: [1, 5], type: '指示代词', prompt: '___ книга интересная.', answer: 'Эта', options: ['Этот', 'Эта', 'Это', 'Эти'], explanation: 'книга 是阴性单数：эта книга。' },
  { units: [1, 5], type: '指示代词', prompt: 'Я читаю ___ книгу.', answer: 'эту', options: ['этот', 'эта', 'эту', 'эти'], explanation: '阴性名词宾格：эта → эту。' },
  { units: [1], type: '疑问代词', prompt: '___ это? Это Анна.', answer: 'Кто', options: ['Кто', 'Что', 'Где', 'Куда'], explanation: '问人是谁用 кто。' },
  { units: [5], type: '疑问代词', prompt: '___ ты идёшь? В школу.', answer: 'Куда', options: ['Где', 'Куда', 'Откуда', 'Какой'], explanation: '问“到哪里去”用 куда。' },
  { units: [5], type: '疑问代词', prompt: '___ ты приехал? Из Москвы.', answer: 'Откуда', options: ['Где', 'Куда', 'Откуда', 'Когда'], explanation: '问“从哪里来”用 откуда。' },
  { units: [2, 5], type: '形容词一致', prompt: '___ дом', answer: 'большой', options: ['большой', 'большая', 'большое', 'большие'], explanation: 'дом 是阳性单数：большой дом。' },
  { units: [2, 5], type: '形容词一致', prompt: '___ семья', answer: 'большая', options: ['большой', 'большая', 'большое', 'большие'], explanation: 'семья 是阴性单数：большая семья。' },
  { units: [5], type: '形容词格变化', prompt: 'в ___ городе', answer: 'большом', options: ['большой', 'большого', 'большом', 'большим'], explanation: 'в + 第六格：в большом городе。' },
  { units: [6], type: '形容词格变化', prompt: 'Я покупаю ___ книгу.', answer: 'новую', options: ['новая', 'новую', 'новой', 'новые'], explanation: '阴性单数宾格：новую книгу。' },
  { units: [4], type: '第一变位', prompt: 'мы ___（работать）', answer: 'работаем', options: ['работаю', 'работаешь', 'работаем', 'работают'], explanation: 'мы 的第一变位词尾是 -ем。' },
  { units: [4], type: '第一变位', prompt: 'они ___（читать）', answer: 'читают', options: ['читаю', 'читает', 'читаем', 'читают'], explanation: 'они 的第一变位词尾是 -ют。' },
  { units: [4], type: '第二变位', prompt: 'ты ___（говорить）', answer: 'говоришь', options: ['говорю', 'говоришь', 'говорит', 'говорят'], explanation: 'ты 的第二变位词尾是 -ишь。' },
  { units: [4], type: '第二变位', prompt: 'они ___（любить）', answer: 'любят', options: ['люблю', 'любит', 'любим', 'любят'], explanation: 'они 的第二变位词尾是 -ят。' },
  { units: [8], type: '过去时', prompt: 'Вчера он ___ книгу.', answer: 'читал', options: ['читал', 'читала', 'читали', 'читать'], explanation: 'он 的过去时阳性：читал。' },
  { units: [8], type: '过去时', prompt: 'Вчера она ___ дома.', answer: 'была', options: ['был', 'была', 'было', 'были'], explanation: 'она 对应 была。' },
  { units: [8], type: '复合将来时', prompt: 'Завтра мы ___ читать.', answer: 'будем', options: ['буду', 'будешь', 'будем', 'будут'], explanation: 'мы 的 быть 将来时是 будем。' },
  { units: [8], type: '完成体将来时', prompt: 'Завтра я ___ письмо.（写完）', answer: 'напишу', options: ['пишу', 'писал', 'напишу', 'писать'], explanation: '完成体表示一次性且有结果的动作。' },
  { units: [4, 8], type: '动词体', prompt: 'Каждый день я ___ русский язык.', answer: 'учу', options: ['учу', 'выучу', 'прочитаю', 'куплю'], explanation: '每天重复、习惯动作常用未完成体。' },
  { units: [6, 8], type: '动词体', prompt: 'Сегодня я ___ хлеб и молоко.（买完）', answer: 'куплю', options: ['покупаю', 'куплю', 'покупал', 'покупать'], explanation: '一次性有结果的将来动作可用完成体：куплю。' },
  { units: [4, 5], type: '运动动词', prompt: 'Сейчас я ___ в школу.', answer: 'иду', options: ['иду', 'хожу', 'ехал', 'ездил'], explanation: '现在正朝一个方向步行去，用 идти。' },
  { units: [4, 5], type: '运动动词', prompt: 'Я часто ___ в парк.', answer: 'хожу', options: ['иду', 'хожу', 'пойду', 'приду'], explanation: '经常往返或习惯性步行，用 ходить。' },
  { units: [5, 8], type: '运动动词', prompt: 'Завтра мы ___ в Москву на поезде.', answer: 'поедем', options: ['едем', 'ездим', 'поедем', 'приедем'], explanation: '将要乘交通工具出发，用 поехать 的变位。' },
  { units: [5, 8], type: '运动动词', prompt: 'Когда ты ___ домой?（到达）', answer: 'приедешь', options: ['поедешь', 'приедешь', 'ездишь', 'едешь'], explanation: '到达某地用 приехать：приедешь。' },
  { units: [4], type: '命令式', prompt: '___, пожалуйста!（请读）', answer: 'Читайте', options: ['Читаешь', 'Читайте', 'Читал', 'Читают'], explanation: '对“您/你们”使用命令式 читайте。' },
  { units: [4], type: '命令式', prompt: '___ сюда!（你过来）', answer: 'Иди', options: ['Иду', 'Иди', 'Идёшь', 'Идут'], explanation: 'ты 形式命令式：иди。' },
  { units: [4, 8], type: '反身动词', prompt: 'Я ___ домой вечером.', answer: 'возвращаюсь', options: ['возвращаю', 'возвращаюсь', 'возвращает', 'возвращаются'], explanation: '-ся 反身动词第一人称：возвращаюсь。' },
  { units: [3], type: '基数词', prompt: '64 读作 ___ .', answer: 'шестьдесят четыре', options: ['шестнадцать четыре', 'шестьдесят четыре', 'сорок шесть', 'шестьсот четыре'], explanation: '64 = шестьдесят четыре。' },
  { units: [3], type: '数词搭配名词', prompt: 'три ___（苹果）', answer: 'яблока', options: ['яблоко', 'яблока', 'яблок', 'яблоком'], explanation: '2-4 后用单数第二格：яблока。' },
  { units: [3, 6], type: '数词搭配名词', prompt: 'семь ___（卢布）', answer: 'рублей', options: ['рубль', 'рубля', 'рублей', 'рублём'], explanation: '5 以上后用复数第二格：рублей。' },
  { units: [3, 4], type: '时间表达', prompt: 'Сейчас два ___ .', answer: 'часа', options: ['час', 'часа', 'часов', 'часом'], explanation: 'два 后用单数第二格：два часа。' },
  { units: [3, 4], type: '时间表达', prompt: 'Встреча ___ понедельник.', answer: 'в', options: ['в', 'на', 'из', 'с'], explanation: '星期几常用 в + 第四格：в понедельник。' },
  { units: [5], type: '前置词 в/на', prompt: 'Я иду ___ школу.', answer: 'в', options: ['в', 'на', 'из', 'с'], explanation: '到学校去：идти в школу，в + 第四格。' },
  { units: [5], type: '前置词 в/на', prompt: 'Я учусь ___ университете.', answer: 'в', options: ['в', 'на', 'к', 'из'], explanation: '在哪里学习：в + 第六格。' },
  { units: [5], type: '前置词 из/от', prompt: 'Он приехал ___ Москвы.', answer: 'из', options: ['в', 'из', 'к', 'о'], explanation: '从城市来用 из + 第二格。' },
  { units: [2, 5], type: '前置词 к', prompt: 'Я иду ___ врачу.', answer: 'к', options: ['к', 'с', 'из', 'о'], explanation: '到某人那里/面前用 к + 第三格。' },
  { units: [2, 4], type: '前置词 с', prompt: 'Я говорю ___ другом.', answer: 'с', options: ['в', 'на', 'с', 'к'], explanation: '和某人一起/交谈用 с + 第五格。' },
  { units: [1], type: '基础句型', prompt: '___ студент.', answer: 'Это', options: ['Это', 'Эта', 'Эти', 'Есть'], explanation: '介绍“这是……”常用 Это，不随性数变化。' },
  { units: [1], type: '疑问句', prompt: '___ это? Это книга.', answer: 'Что', options: ['Кто', 'Что', 'Где', 'Куда'], explanation: '问物品是什么用 что。' },
  { units: [4], type: '主谓一致', prompt: 'Студенты ___ в аудитории.', answer: 'сидят', options: ['сидит', 'сидят', 'сижу', 'сидишь'], explanation: '复数主语 студенты 搭配复数谓语 сидят。' },
  { units: [4, 8], type: '时间从句', prompt: 'Я позвоню, ___ приду домой.', answer: 'когда', options: ['когда', 'потому что', 'что', 'куда'], explanation: '表示“当……时候”用 когда。' },
  { units: [4, 8], type: '原因从句', prompt: 'Я дома, ___ сегодня холодно.', answer: 'потому что', options: ['когда', 'потому что', 'что', 'откуда'], explanation: '说明原因用 потому что。' },
  { units: [1, 8], type: '说明从句', prompt: 'Я знаю, ___ он студент.', answer: 'что', options: ['что', 'когда', 'почему', 'куда'], explanation: '说明“知道……这件事”用 что。' },
  { units: [1, 2], type: '否定句', prompt: 'У меня нет ___（问题）.', answer: 'вопроса', options: ['вопрос', 'вопроса', 'вопросу', 'вопросом'], explanation: 'нет 后用第二格：вопроса。' },
  { units: [9], type: '运动动词', prompt: 'Каждый день я ___ в университет пешком.', answer: 'хожу', options: ['иду', 'хожу', 'пойду', 'приду'], explanation: '每天习惯性往返步行用不定向 ходить：я хожу。' },
  { units: [9], type: '运动动词', prompt: 'Сейчас мы ___ на вокзал на такси.', answer: 'едем', options: ['едем', 'ездим', 'поедем', 'ездили'], explanation: '现在正朝一个方向乘车去，用 ехать：мы едем。' },
  { units: [9], type: '方向表达', prompt: 'Поверните ___, пожалуйста.（向右转）', answer: 'направо', options: ['направо', 'справа', 'правый', 'право'], explanation: '表示动作方向“向右”用 направо。' },
  { units: [10], type: '第二格 属格', prompt: 'У туриста нет ___（护照）.', answer: 'паспорта', options: ['паспорт', 'паспорта', 'паспорту', 'паспортом'], explanation: 'нет 后接第二格：паспорт → паспорта。' },
  { units: [10], type: '第三格 与格', prompt: 'Администратор помогает ___（游客）.', answer: 'туристу', options: ['турист', 'туриста', 'туристу', 'туристом'], explanation: 'помогать кому? 后用第三格：туристу。' },
  { units: [10], type: '选择正确单词', prompt: 'В гостинице нужно ___ анкету.', answer: 'заполнить', options: ['заполнить', 'заполняю', 'заполнял', 'заполненный'], explanation: 'нужно 后接动词原形：нужно заполнить。' },
  { units: [11], type: '天气表达', prompt: 'Сегодня ___ и идёт снег.', answer: 'холодно', options: ['холодно', 'холодный', 'холодная', 'холодные'], explanation: '天气状态常用无人称副词：холодно。' },
  { units: [11], type: '形容词格变化', prompt: 'Я покупаю ___ куртку.', answer: 'тёплую', options: ['тёплая', 'тёплую', 'тёплой', 'тёплый'], explanation: '阴性单数名词 куртка 的宾格：тёплую куртку。' },
  { units: [11], type: '选择正确单词', prompt: 'Осенью часто идёт ___ .', answer: 'дождь', options: ['дождь', 'дождя', 'дождю', 'дождём'], explanation: '固定天气表达：идёт дождь。' },
  { units: [12], type: '反身动词', prompt: 'Она хорошо ___ себя.', answer: 'чувствует', options: ['чувствует', 'чувствуешь', 'чувствую', 'чувствуют'], explanation: 'она 对应第三人称单数：чувствует себя。' },
  { units: [12], type: '情态词', prompt: 'Вам ___ отдыхать.', answer: 'нужно', options: ['нужно', 'нужный', 'нужна', 'нужны'], explanation: 'нужно + 动词原形表示“需要做某事”。' },
  { units: [12], type: '身体部位', prompt: 'У меня болит ___（头）.', answer: 'голова', options: ['голова', 'голову', 'головы', 'головой'], explanation: '在“某处疼”结构中，疼的部位作主语：болит голова。' },
  { units: [13], type: '过去时', prompt: 'Вчера Анна ___ письмо.', answer: 'писала', options: ['писал', 'писала', 'писали', 'писать'], explanation: 'Анна 是阴性，过去时用 -ла：писала。' },
  { units: [13], type: '复合将来时', prompt: 'Завтра они ___ готовиться к экзамену.', answer: 'будут', options: ['буду', 'будешь', 'будет', 'будут'], explanation: 'они 的 быть 将来时是 будут。' },
  { units: [13], type: '动词体', prompt: 'Я уже ___ письмо.（已经写完）', answer: 'написал', options: ['писал', 'пишу', 'написал', 'писать'], explanation: 'уже 和“写完”强调结果，用完成体 написал。' },
  { units: [14], type: '第五格 工具格', prompt: 'Мы идём в театр с ___（朋友们）.', answer: 'друзьями', options: ['друзья', 'друзей', 'друзьям', 'друзьями'], explanation: 'с + 第五格：с друзьями。' },
  { units: [14], type: '第五格 工具格', prompt: 'Она занимается ___（音乐）.', answer: 'музыкой', options: ['музыка', 'музыку', 'музыкой', 'музыке'], explanation: 'заниматься чем? 后用第五格：музыкой。' },
  { units: [14], type: '选择正确单词', prompt: 'Он хорошо играет ___ гитаре.', answer: 'на', options: ['в', 'на', 'с', 'к'], explanation: '演奏乐器常用 играть на + 前置格。' },
  { units: [15], type: '说明从句', prompt: 'Я думаю, ___ русский язык интересный.', answer: 'что', options: ['что', 'когда', 'потому что', 'если'], explanation: '说明“我认为……这件事”用 что。' },
  { units: [15], type: '原因从句', prompt: 'Я не иду гулять, ___ болею.', answer: 'потому что', options: ['когда', 'потому что', 'что', 'куда'], explanation: '说明原因用 потому что。' },
  { units: [15], type: '否定句', prompt: 'У меня нет ___（时间）.', answer: 'времени', options: ['время', 'времени', 'временем', 'времена'], explanation: 'нет 后用第二格：время → времени。' },
  { bookId: 'russian-road-2', units: [1], type: '动词体', prompt: 'Я весь вечер ___ новые слова.', answer: 'запоминал', options: ['запоминал', 'запомнил', 'запомню', 'запомнить'], explanation: '强调整晚的过程，用未完成体过去时：запоминал。' },
  { bookId: 'russian-road-2', units: [1], type: '动词体', prompt: 'Наконец я ___ это правило.', answer: 'запомнил', options: ['запоминал', 'запомнил', 'запоминаю', 'запоминать'], explanation: '强调结果“记住了”，用完成体：запомнил。' },
  { bookId: 'russian-road-2', units: [1], type: '选择正确单词', prompt: 'Завтра у нас важный ___ .', answer: 'зачёт', options: ['зачёт', 'конспект', 'пример', 'ошибка'], explanation: 'зачёт 是“结课考核”。' },
  { bookId: 'russian-road-2', units: [2], type: '运动动词', prompt: 'Мы ___ до центра на метро.', answer: 'доехали', options: ['дошли', 'доехали', 'вошли', 'ушли'], explanation: '乘交通工具到达某地用 доехать：доехали。' },
  { bookId: 'russian-road-2', units: [2], type: '路线表达', prompt: 'Идите ___ площадь.', answer: 'через', options: ['через', 'до', 'из', 'к'], explanation: 'через 表示“穿过”：через площадь。' },
  { bookId: 'russian-road-2', units: [2], type: '运动动词', prompt: 'Он ___ из метро и пошёл пешком.', answer: 'вышел', options: ['вошёл', 'вышел', 'подошёл', 'заехал'], explanation: '从地铁出来用 выйти：вышел из метро。' },
  { bookId: 'russian-road-2', units: [3], type: '间接引语', prompt: 'Анна сказала, ___ она занята.', answer: 'что', options: ['что', 'чтобы', 'если', 'когда'], explanation: '转述陈述内容用 что。' },
  { bookId: 'russian-road-2', units: [3], type: 'чтобы 结构', prompt: 'Он попросил, ___ я позвонил вечером.', answer: 'чтобы', options: ['что', 'чтобы', 'потому что', 'где'], explanation: '表示请求内容常用 чтобы + 过去时形式。' },
  { bookId: 'russian-road-2', units: [3], type: '选择正确单词', prompt: 'Она ___, что завтра будет тест.', answer: 'сообщила', options: ['сообщила', 'совет', 'согласие', 'мнение'], explanation: 'сообщить 表示“通知/告诉”。' },
  { bookId: 'russian-road-2', units: [4], type: '地点与方向', prompt: 'Вчера мы были ___ музее.', answer: 'в', options: ['в', 'на', 'из', 'к'], explanation: 'где? 在博物馆里：в музее。' },
  { bookId: 'russian-road-2', units: [4], type: '地点与方向', prompt: 'Сегодня мы идём ___ музей.', answer: 'в', options: ['в', 'из', 'о', 'с'], explanation: 'куда? 去博物馆：в музей。' },
  { bookId: 'russian-road-2', units: [4], type: '第五格 工具格', prompt: 'Я интересуюсь русской ___ .', answer: 'культурой', options: ['культура', 'культуру', 'культурой', 'культуре'], explanation: 'интересоваться чем? 后接第五格：культурой。' },
  { bookId: 'russian-road-2', units: [5], type: '条件句', prompt: '___ я сдам экзамен, я поеду домой.', answer: 'Если', options: ['Если', 'Что', 'Чтобы', 'Поэтому'], explanation: '条件句用 если。' },
  { bookId: 'russian-road-2', units: [5], type: '目的从句', prompt: 'Я учу русский язык, ___ работать переводчиком.', answer: 'чтобы', options: ['что', 'чтобы', 'если', 'когда'], explanation: '表达目的“为了”用 чтобы。' },
  { bookId: 'russian-road-2', units: [5], type: '选择正确单词', prompt: 'Перед собеседованием нужно подготовить ___ .', answer: 'резюме', options: ['резюме', 'зарплата', 'отдел', 'успех'], explanation: 'резюме 是“简历”。' },
  { bookId: 'russian-road-2', units: [6], type: '情态表达', prompt: 'Вам ___ записаться к врачу.', answer: 'нужно', options: ['нужно', 'нужная', 'нужный', 'нужны'], explanation: 'нужно + 动词原形表示“需要”。' },
  { bookId: 'russian-road-2', units: [6], type: '时间第四格', prompt: 'Я ждал врача ___ .', answer: 'час', options: ['час', 'часа', 'часу', 'часом'], explanation: '表示持续多久可用第四格：ждал час。' },
  { bookId: 'russian-road-2', units: [6], type: '选择正确单词', prompt: 'Врач выписал ___ .', answer: 'рецепт', options: ['рецепт', 'очередь', 'талон', 'услуга'], explanation: 'выписать рецепт 表示“开处方”。' },
  { bookId: 'russian-road-2', units: [7], type: '复合句', prompt: 'Я выбрал текст, ___ мы читали вчера.', answer: 'который', options: ['который', 'потому что', 'если', 'чтобы'], explanation: 'который 引导定语从句，说明“我们昨天读过的课文”。' },
  { bookId: 'russian-road-2', units: [7], type: '间接引语', prompt: 'Она сказала, ___ тест был трудный.', answer: 'что', options: ['что', 'чтобы', 'который', 'если'], explanation: '转述陈述内容用 что。' },
  { bookId: 'russian-road-2', units: [7], type: '选择正确单词', prompt: 'Сначала прочитайте ___ к заданию.', answer: 'инструкцию', options: ['инструкцию', 'результат', 'балл', 'уровень'], explanation: '做题前要读 инструкцию（说明）。' }
];

function questionMatchesUnits(question) {
  if (!question.bookId && currentBookId !== courseBooks[0].id) return false;
  if (question.bookId && question.bookId !== currentBookId) return false;
  return question.units.some(unit => quizSelectedUnits.includes(unit));
}

function buildMixedQuiz(allWords, count) {
  const grammarQuestions = shuffle([...FILL_QUESTIONS, ...CASE_QUESTIONS, ...CORE_GRAMMAR_QUESTIONS].filter(questionMatchesUnits));
  const vocabularyQuestions = shuffle(allWords).map(word => {
    const wrongPool = shuffle(allWords.filter(item => item.ru !== word.ru)).slice(0, 3).map(item => item.zh);
    return { type: '选择正确单词', prompt: word.ru, answer: word.zh, options: shuffle([word.zh, ...wrongPool]), explanation: word.ru + '：' + word.zh };
  });
  return shuffle([...grammarQuestions, ...vocabularyQuestions]).slice(0, Math.min(count, grammarQuestions.length + vocabularyQuestions.length));
}

function renderQuizQuestion() {
  answered = false;
  const q = quizQuestions[quizIndex];
  document.getElementById('quizProgress').textContent = '第 ' + (quizIndex + 1) + ' / ' + quizQuestions.length + ' 题';
  document.getElementById('quizScore').textContent = '得分：' + quizScore;
  document.getElementById('quizType').textContent = q.type || '选择正确单词';
  document.getElementById('quizQuestion').textContent = q.prompt || q.question;
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('nextQuestionBtn').classList.add('hidden');

  const optionsEl = document.getElementById('quizOptions');
  optionsEl.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('div');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(btn, opt, q.answer));
    optionsEl.appendChild(btn);
  });
}

function handleAnswer(btn, chosen, correctAnswer) {
  if (answered) return;
  answered = true;
  const allOptions = document.querySelectorAll('.quiz-option');
  allOptions.forEach(opt => {
    if (opt.textContent === correctAnswer) opt.classList.add('correct');
    if (opt === btn && chosen !== correctAnswer) opt.classList.add('wrong');
  });
  if (chosen === correctAnswer) {
    quizScore += 1;
    document.getElementById('quizFeedback').textContent = '✅ 回答正确！';
    document.getElementById('quizFeedback').style.color = '#2fa84f';
  } else {
    document.getElementById('quizFeedback').textContent = '❌ 正确答案：' + correctAnswer + (quizQuestions[quizIndex].explanation ? '（' + quizQuestions[quizIndex].explanation + '）' : '');
    document.getElementById('quizFeedback').style.color = '#d52b1e';
  }
  document.getElementById('quizScore').textContent = '得分：' + quizScore;
  document.getElementById('nextQuestionBtn').classList.remove('hidden');
}

document.getElementById('nextQuestionBtn').addEventListener('click', () => {
  quizIndex += 1;
  if (quizIndex < quizQuestions.length) {
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  document.getElementById('quizArea').classList.add('hidden');
  document.getElementById('quizResult').classList.remove('hidden');
  document.getElementById('quizFinalScore').textContent =
    '你答对了 ' + quizScore + ' / ' + quizQuestions.length + ' 题';

  progress.quizzesCompleted += 1;
  if (quizScore > progress.bestScore) progress.bestScore = quizScore;
  saveProgress(progress);
  refreshHeaderAndStats();
}

document.getElementById('restartQuizBtn').addEventListener('click', () => {
  document.getElementById('quizResult').classList.add('hidden');
  document.getElementById('quizArea').classList.add('hidden');
});
// ---------- 进度重置 ----------
document.getElementById('resetProgressBtn').addEventListener('click', () => {
  if (confirm('确定要重置所有学习记录吗？此操作不可恢复。')) {
    localStorage.removeItem(progressKey(currentUsername));
    progress = updateStreak(loadProgress(currentUsername));
    syncLearningProgress();
    refreshHeaderAndStats();
  }
});

// ---------- 管理员面板 ----------
async function renderAdminPanel() {
  const listEl = document.getElementById('adminUserList');
  const feedbackEl = document.getElementById('adminFeedbackList');
  const accessMessage = document.getElementById('adminAccessMessage');
  const dashboardContent = document.getElementById('adminDashboardContent');
  if (currentRole !== 'admin') {
    accessMessage.textContent = '当前账号不是管理员。请先在 Supabase 的 profiles 表中将该账号 role 设置为 admin，然后退出并重新登录。';
    accessMessage.classList.remove('hidden');
    dashboardContent.classList.add('hidden');
    return;
  }
  accessMessage.classList.add('hidden');
  dashboardContent.classList.remove('hidden');
  listEl.innerHTML = '<p class="section-desc">正在加载账号...</p>';
  feedbackEl.innerHTML = '<p class="section-desc">正在加载反馈...</p>';
  try {
    const [users, feedbackItems, progressResult] = await Promise.all([
      window.Auth.listProfiles(),
      loadFeedback(),
      window.Auth.listLearningProgress().then(data => ({ ok: true, data })).catch(error => ({ ok: false, error, data: [] }))
    ]);
    const progressByUser = new Map(progressResult.data.map(item => [item.user_id, item]));
    const now = Date.now();
    const isUserOnline = item => Boolean(item && item.is_online && item.last_seen_at && now - new Date(item.last_seen_at).getTime() < 120000);
    const onlineCount = users.filter(user => isUserOnline(progressByUser.get(user.id))).length;
    const pendingCount = feedbackItems.filter(item => !item.reply).length;
    document.getElementById('adminUserTotal').textContent = users.length;
    document.getElementById('adminOnlineTotal').textContent = onlineCount;
    document.getElementById('adminFeedbackTotal').textContent = feedbackItems.length;
    document.getElementById('adminPendingTotal').textContent = pendingCount;
    document.getElementById('adminUserCount').textContent = users.length + ' 个账号';
    document.getElementById('adminFeedbackCount').textContent = pendingCount + ' 条待处理';
    listEl.innerHTML = users.length ? users.map(u => {
      const createdDate = new Date(u.created_at).toLocaleString('zh-CN');
      const learning = progressByUser.get(u.id);
      const online = isUserOnline(learning);
      const bookTitle = learning && learning.current_book_id
        ? (courseBooks.find(book => book.id === learning.current_book_id) || {}).title || learning.current_book_id
        : '暂无记录';
      return '<div class="admin-user-card">' +
        '<div class="row"><span class="label">用户名</span><span>' + escapeFeedbackHtml(u.username) + (u.role === 'admin' ? '<span class="admin-badge role-admin">管理员</span>' : '') + '</span></div>' +
        (u.email ? '<div class="row"><span class="label">注册邮箱</span><span>' + escapeFeedbackHtml(u.email) + '</span></div>' : '') +
        '<div class="row"><span class="label">账号 ID</span><span>' + escapeFeedbackHtml(u.id.slice(0, 8)) + '...</span></div>' +
        '<div class="row"><span class="label">账号角色</span><span>' + (u.role === 'admin' ? '管理员' : '普通用户') + '</span></div>' +
        '<div class="row"><span class="label">在线状态</span><span><span class="admin-badge ' + (online ? 'online' : 'offline') + '">' + (online ? '在线' : '离线') + '</span></span></div>' +
        '<div class="admin-learning-grid">' +
        '<div><strong>' + (learning ? learning.streak : 0) + '</strong><span>连续天数</span></div>' +
        '<div><strong>' + (learning ? learning.quizzes_completed : 0) + '</strong><span>测验次数</span></div>' +
        '<div><strong>' + (learning ? learning.best_score : 0) + '</strong><span>最佳成绩</span></div>' +
        '<div><strong>' + (learning ? learning.words_learned_count : 0) + '</strong><span>已学词汇</span></div>' +
        '<div><strong>' + (learning ? learning.lessons_viewed_count : 0) + '</strong><span>看过课程</span></div>' +
        '</div>' +
        '<div class="row"><span class="label">当前教材</span><span>' + escapeFeedbackHtml(bookTitle) + '</span></div>' +
        '<div class="row"><span class="label">最后活跃</span><span>' + formatAdminTime(learning && learning.last_seen_at) + '</span></div>' +
        '<div class="row"><span class="label">注册时间</span><span>' + createdDate + '</span></div></div>';
    }).join('') : '<p class="section-desc">暂无注册账号</p>';
    if (!progressResult.ok) {
      listEl.innerHTML += '<p class="admin-warning">学习情况表尚未启用：请在 Supabase SQL Editor 执行最新版 supabase-schema.sql 或 admin-setup.sql。</p>';
    }
    feedbackEl.innerHTML = feedbackItems.length
      ? feedbackItems.map(item => renderFeedbackCard(item, true)).join('')
      : '<div class="feedback-empty"><strong>暂时没有用户反馈</strong><span>用户提交的留言会显示在这里。</span></div>';
    feedbackEl.querySelectorAll('.reply-btn').forEach(btn => btn.addEventListener('click', async () => {
      const input = feedbackEl.querySelector('.admin-reply-input[data-feedback-id="' + btn.dataset.feedbackId + '"]');
      const reply = input.value.trim();
      if (!reply) { input.focus(); return; }
      btn.disabled = true;
      btn.textContent = '发送中...';
      const { error } = await window.Auth.supabase
        .from('feedback')
        .update({ reply, replied_at: new Date().toISOString() })
        .eq('id', btn.dataset.feedbackId);
      if (error) {
        btn.disabled = false;
        btn.textContent = '发送回复';
        input.value = error.message;
        return;
      }
      await renderAdminPanel();
    }));
  } catch (error) {
    listEl.innerHTML = '<p class="section-desc">用户列表加载失败：' + escapeFeedbackHtml(error.message) + '</p>';
    feedbackEl.innerHTML = '<p class="section-desc">反馈列表加载失败：' + escapeFeedbackHtml(error.message) + '</p>';
  }
}

document.getElementById('refreshAdminBtn').addEventListener('click', renderAdminPanel);
// ---------- 进入应用 ----------
async function enterApp(username, role) {
  currentUsername = username;
  currentRole = role;
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('userBadge').textContent = '👤 ' + username + (role === 'admin' ? ' (管理员)' : '');
  document.getElementById('adminTabBtn').classList.toggle('hidden', role !== 'admin');

  progress = updateStreak(loadProgress(username));
  loadCourseBookSelection();
  await renderFeedback();
  renderAlphabet();
  refreshHeaderAndStats();
  startLearningPresence();
}

// ---------- 初始化 ----------
function showAuthCallbackError() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error = params.get('error_description') || params.get('error');
  if (error) {
    const loginError = document.getElementById('loginError');
    loginError.textContent = '邮箱确认失败：' + decodeURIComponent(error.replace(/\+/g, ' '));
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
async function init() {
  showAuthCallbackError();
  initFeedback();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
  const session = await window.Auth.getSession();
  if (session && session.username) {
    await enterApp(session.username, session.role);
  } else {
    showAuthForm('loginForm');
  }
}

init().catch(error => {
  document.getElementById('loginError').textContent = error.message;
});

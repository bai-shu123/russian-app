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

function renderCourseList() {
  const listEl = document.getElementById('courseList');
  listEl.innerHTML = '';
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
  if (!progress.lessonsViewed.includes(lessonId)) {
    progress.lessonsViewed.push(lessonId);
    saveProgress(progress);
    refreshHeaderAndStats();
  }
}

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
  return 'ru_unit_selection_' + type + '::' + currentUsername.toLowerCase();
}

function loadUnitSelection(type) {
  const raw = localStorage.getItem(unitSelectionKey(type));
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
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
  { units: [1, 2], type: '否定句', prompt: 'У меня нет ___（问题）.', answer: 'вопроса', options: ['вопрос', 'вопроса', 'вопросу', 'вопросом'], explanation: 'нет 后用第二格：вопроса。' }
];

function questionMatchesUnits(question) {
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
    const [users, feedbackItems] = await Promise.all([
      window.Auth.listProfiles(),
      loadFeedback()
    ]);
    const pendingCount = feedbackItems.filter(item => !item.reply).length;
    document.getElementById('adminUserTotal').textContent = users.length;
    document.getElementById('adminFeedbackTotal').textContent = feedbackItems.length;
    document.getElementById('adminPendingTotal').textContent = pendingCount;
    document.getElementById('adminUserCount').textContent = users.length + ' 个账号';
    document.getElementById('adminFeedbackCount').textContent = pendingCount + ' 条待处理';
    listEl.innerHTML = users.length ? users.map(u => {
      const createdDate = new Date(u.created_at).toLocaleString('zh-CN');
      return '<div class="admin-user-card">' +
        '<div class="row"><span class="label">用户名</span><span>' + escapeFeedbackHtml(u.username) + (u.role === 'admin' ? '<span class="admin-badge role-admin">管理员</span>' : '') + '</span></div>' +
        (u.email ? '<div class="row"><span class="label">注册邮箱</span><span>' + escapeFeedbackHtml(u.email) + '</span></div>' : '') +
        '<div class="row"><span class="label">账号 ID</span><span>' + escapeFeedbackHtml(u.id.slice(0, 8)) + '...</span></div>' +
        '<div class="row"><span class="label">账号角色</span><span>' + (u.role === 'admin' ? '管理员' : '普通用户') + '</span></div>' +
        '<div class="row"><span class="label">状态</span><span><span class="admin-badge verified">正常</span></span></div>' +
        '<div class="row"><span class="label">注册时间</span><span>' + createdDate + '</span></div></div>';
    }).join('') : '<p class="section-desc">暂无注册账号</p>';
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
  renderCourseList();
  renderCourseDetail();
  await renderFeedback();
  renderAlphabet();
  initVocabUnitSelector();
  refreshVocabWords();
  initQuizUnitSelector();
  refreshHeaderAndStats();
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

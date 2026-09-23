// ---------- 工具函数 ----------
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ru-RU';
  utter.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const ruVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ru'));
  if (ruVoice) utter.voice = ruVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ===================================================================
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
document.getElementById('loginSubmitBtn').addEventListener('click', () => {
  const usernameOrEmail = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const result = window.Auth.loginUser(usernameOrEmail, password);
  if (result.ok) {
    enterApp(result.username, result.role);
  } else if (result.error === 'NEED_VERIFY') {
    pendingRegisterUsername = result.username;
    const resend = window.Auth.resendRegistrationCode(result.username);
    showVerifyStep(result.username, resend.code);
  } else {
    document.getElementById('loginError').textContent = result.error;
  }
});

// ---- 注册 ----
document.getElementById('registerSubmitBtn').addEventListener('click', () => {
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const password2 = document.getElementById('registerPassword2').value;
  const errEl = document.getElementById('registerError');

  if (password !== password2) {
    errEl.textContent = '两次输入的密码不一致';
    return;
  }
  const result = window.Auth.registerUser(username, email, password);
  if (!result.ok) {
    errEl.textContent = result.error;
    return;
  }
  pendingRegisterUsername = username.trim();
  showVerifyStep(username.trim(), result.code, email.trim());
});

function showVerifyStep(username, code, email) {
  showAuthForm('verifyForm');
  const user = window.Auth.findUserByUsernameOrEmail(username);
  document.getElementById('verifyEmailTarget').textContent = email || (user && user.email) || '';
  document.getElementById('demoCodeBox').innerHTML =
    '📩 演示模式：真实验证码已"发送"至邮箱，此处为方便测试直接显示：<strong>' + code + '</strong>';
  document.getElementById('verifyCodeInput').value = '';
}

document.getElementById('verifySubmitBtn').addEventListener('click', () => {
  const code = document.getElementById('verifyCodeInput').value;
  const result = window.Auth.verifyRegistrationCode(pendingRegisterUsername, code);
  const errEl = document.getElementById('verifyError');
  if (!result.ok) {
    errEl.textContent = result.error;
    return;
  }
  const loginResult = window.Auth.loginUser(pendingRegisterUsername, document.getElementById('registerPassword').value || '');
  if (loginResult.ok) {
    enterApp(loginResult.username, loginResult.role);
  } else {
    showAuthForm('loginForm');
    document.getElementById('loginError').textContent = '验证成功，请重新登录';
  }
});

document.getElementById('resendCodeLink').addEventListener('click', (e) => {
  e.preventDefault();
  const result = window.Auth.resendRegistrationCode(pendingRegisterUsername);
  if (result.ok) {
    document.getElementById('demoCodeBox').innerHTML =
      '📩 新验证码已"发送"：<strong>' + result.code + '</strong>';
  } else {
    document.getElementById('verifyError').textContent = result.error;
  }
});

// ---- 忘记密码 ----
document.getElementById('forgotSubmitBtn').addEventListener('click', () => {
  const input = document.getElementById('forgotInput').value;
  const result = window.Auth.requestPasswordReset(input);
  const errEl = document.getElementById('forgotError');
  if (!result.ok) {
    errEl.textContent = result.error;
    return;
  }
  pendingResetUsername = result.username;
  showAuthForm('resetForm');
  document.getElementById('resetEmailTarget').textContent = result.email;
  document.getElementById('resetDemoCodeBox').innerHTML =
    '📩 演示模式：真实验证码已"发送"至邮箱，此处为方便测试直接显示：<strong>' + result.code + '</strong>';
});

document.getElementById('resetSubmitBtn').addEventListener('click', () => {
  const code = document.getElementById('resetCodeInput').value;
  const newPassword = document.getElementById('resetNewPassword').value;
  const result = window.Auth.resetPassword(pendingResetUsername, code, newPassword);
  const errEl = document.getElementById('resetError');
  if (!result.ok) {
    errEl.textContent = result.error;
    return;
  }
  showAuthForm('loginForm');
  document.getElementById('loginError').textContent = '密码重置成功，请使用新密码登录';
});

// ---- 登出 ----
document.getElementById('logoutBtn').addEventListener('click', () => {
  window.Auth.logoutUser();
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
function loadFeedback() { const raw = localStorage.getItem(FEEDBACK_KEY); if (raw) { try { const data = JSON.parse(raw); if (Array.isArray(data)) return data; } catch (e) {} } return []; }
function saveFeedback(items) { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items)); }
function escapeFeedbackHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function formatFeedbackTime(timestamp) { return new Date(timestamp).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function renderFeedbackCard(item, isAdminView) {
  const replied = Boolean(item.reply);
  const replyHtml = replied ? '<div class="feedback-reply"><strong>管理员回复</strong><p>' + escapeFeedbackHtml(item.reply) + '</p><time>' + formatFeedbackTime(item.repliedAt) + '</time></div>' : '<div class="feedback-waiting">我们会认真阅读你的留言。</div>';
  const adminReplyHtml = isAdminView && !replied ? '<div class="admin-reply-box"><textarea class="admin-reply-input" data-feedback-id="' + item.id + '" rows="3" maxlength="500" placeholder="写下给用户的回复"></textarea><button class="reply-btn" data-feedback-id="' + item.id + '">发送回复</button></div>' : '';
  return '<article class="feedback-item"><div class="feedback-item-top"><div><span class="feedback-type">' + escapeFeedbackHtml(item.type) + '</span><h4>' + escapeFeedbackHtml(item.title) + '</h4></div><span class="feedback-badge ' + (replied ? 'replied' : 'pending') + '">' + (replied ? '已回复' : '待回复') + '</span></div><p class="feedback-content">' + escapeFeedbackHtml(item.content) + '</p><div class="feedback-meta"><span>' + (isAdminView ? '来自 ' + escapeFeedbackHtml(item.username) : '提交于') + '</span><time>' + formatFeedbackTime(item.createdAt) + '</time></div>' + replyHtml + adminReplyHtml + '</article>';
}
function renderFeedback() {
  const all = loadFeedback(); const mine = all.filter(item => item.username === currentUsername); const myList = document.getElementById('myFeedbackList'); const allList = document.getElementById('allFeedbackList'); const adminPanel = document.getElementById('adminFeedbackPanel'); if (!myList) return;
  const pendingCount = all.filter(item => !item.reply).length; document.getElementById('feedbackCount').textContent = mine.length + ' 条'; document.getElementById('feedbackStatus').textContent = mine.length ? '已留言 ' + mine.length + ' 条' : '欢迎反馈'; document.getElementById('adminFeedbackCount').textContent = pendingCount + ' 条待处理';
  myList.innerHTML = mine.length ? mine.slice().reverse().map(item => renderFeedbackCard(item, false)).join('') : '<div class="feedback-empty"><strong>还没有留言</strong><span>你的第一条反馈会出现在这里。</span></div>';
  if (currentRole === 'admin') { adminPanel.classList.remove('hidden'); allList.innerHTML = all.length ? all.slice().reverse().map(item => renderFeedbackCard(item, true)).join('') : '<div class="feedback-empty"><strong>暂时没有用户留言</strong><span>新的留言会显示在这里。</span></div>'; allList.querySelectorAll('.reply-btn').forEach(btn => btn.addEventListener('click', () => { const input = allList.querySelector('.admin-reply-input[data-feedback-id="' + btn.dataset.feedbackId + '"]'); const reply = input.value.trim(); if (!reply) { input.focus(); return; } const updated = loadFeedback(); const target = updated.find(item => item.id === btn.dataset.feedbackId); if (!target) return; target.reply = reply; target.repliedAt = Date.now(); saveFeedback(updated); renderFeedback(); })); } else { adminPanel.classList.add('hidden'); }
}
function initFeedback() { const form = document.getElementById('feedbackForm'); const content = document.getElementById('feedbackContent'); const counter = document.getElementById('feedbackContentCount'); content.addEventListener('input', () => { counter.textContent = content.value.length; }); form.addEventListener('submit', event => { event.preventDefault(); const title = document.getElementById('feedbackTitle').value.trim(); const text = content.value.trim(); if (!title || !text || !currentUsername) return; const items = loadFeedback(); items.push({ id: 'feedback_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), username: currentUsername, type: document.getElementById('feedbackType').value, title, content: text, createdAt: Date.now(), reply: '', repliedAt: null }); saveFeedback(items); form.reset(); counter.textContent = '0'; document.getElementById('feedbackFormMessage').textContent = '留言已发送，感谢你的反馈！'; renderFeedback(); window.setTimeout(() => { document.getElementById('feedbackFormMessage').textContent = ''; }, 3000); }); }

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
    vocabHtml += '<tr><td class="vocab-ru">' + w.ru + '</td><td class="vocab-pos">' + w.pos + '</td><td>' + w.zh + '</td><td><button class="mini-speak-btn" data-word="' + w.ru.replace(/"/g, '&quot;') + '">🔊</button></td></tr>';
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
      lesson.vocab.forEach(w => words.push({ ru: w.ru, zh: w.zh, lessonId: lesson.id }));
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
  document.getElementById('cardRu').textContent = word.ru;
  document.getElementById('cardZh').textContent = word.zh;
  document.getElementById('cardCounter').textContent = (currentCardIndex + 1) + ' / ' + currentVocabWords.length;
  document.getElementById('flashcard').classList.remove('flipped');
  markWordLearned(word.ru);
}

document.getElementById('flashcard').addEventListener('click', function () {
  this.classList.toggle('flipped');
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
  const shuffled = shuffle(allWords);
  const pickCount = Math.min(QUIZ_LENGTH, allWords.length);
  quizQuestions = shuffled.slice(0, pickCount).map(word => {
    const wrongPool = shuffle(allWords.filter(w => w.ru !== word.ru)).slice(0, 3).map(w => w.zh);
    const options = shuffle([word.zh, ...wrongPool]);
    return { question: word.ru, answer: word.zh, options };
  });
  quizIndex = 0;
  quizScore = 0;
  quizResult.classList.add('hidden');
  quizArea.classList.remove('hidden');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  answered = false;
  const q = quizQuestions[quizIndex];
  document.getElementById('quizProgress').textContent = '第 ' + (quizIndex + 1) + ' / ' + quizQuestions.length + ' 题';
  document.getElementById('quizScore').textContent = '得分：' + quizScore;
  document.getElementById('quizQuestion').textContent = q.question;
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
    document.getElementById('quizFeedback').textContent = '❌ 正确答案：' + correctAnswer;
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
function renderAdminPanel() {
  const listEl = document.getElementById('adminUserList');
  const raw = localStorage.getItem('ru_app_users_v1');
  const users = raw ? JSON.parse(raw) : {};
  listEl.innerHTML = '';
  const usernames = Object.keys(users);
  if (usernames.length === 0) {
    listEl.innerHTML = '<p class="section-desc">暂无注册用户</p>';
    return;
  }
  usernames.forEach(uname => {
    const u = users[uname];
    const card = document.createElement('div');
    card.className = 'admin-user-card';
    const createdDate = new Date(u.createdAt).toLocaleString();
    card.innerHTML =
      '<div class="row"><span class="label">用户名</span><span>' + u.username +
        (u.role === 'admin' ? '<span class="admin-badge role-admin">管理员</span>' : '') + '</span></div>' +
      '<div class="row"><span class="label">邮箱</span><span>' + (u.email || '未绑定') + '</span></div>' +
      '<div class="row"><span class="label">状态</span><span>' +
        (u.verified
          ? '<span class="admin-badge verified">已验证</span>'
          : '<span class="admin-badge unverified">待验证</span>') +
      '</span></div>' +
      '<div class="row"><span class="label">注册时间</span><span>' + createdDate + '</span></div>';
    listEl.appendChild(card);
  });
}

// ---------- 进入应用 ----------
function enterApp(username, role) {
  currentUsername = username;
  currentRole = role;
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('userBadge').textContent = '👤 ' + username + (role === 'admin' ? ' (管理员)' : '');
  document.getElementById('adminTabBtn').classList.toggle('hidden', role !== 'admin');

  progress = updateStreak(loadProgress(username));
  renderCourseList();
  renderCourseDetail();
  renderFeedback();
  renderAlphabet();
  initVocabUnitSelector();
  refreshVocabWords();
  initQuizUnitSelector();
  refreshHeaderAndStats();
}

// ---------- 初始化 ----------
function init() {
  initFeedback();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
  const session = window.Auth.getSession();
  if (session && session.username) {
    enterApp(session.username, session.role);
  } else {
    showAuthForm('loginForm');
  }
}

init();

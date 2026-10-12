/* Active recall training: local-first, Supabase-synced when the migration is installed. */
(function () {
  'use strict';

  const DAY = 86400000;
  const ROOT = () => document.getElementById('trainingApp');
  const ADMIN_ROOT = () => document.getElementById('trainingAdminApp');
  const nowIso = () => new Date().toISOString();
  const uid = () => window.Auth && window.Auth.currentUserId;
  const esc = value => String(value == null ? '' : value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'local-' + Date.now() + '-' + Math.random().toString(16).slice(2));

  let account = null;
  let exercises = [];
  let profile = null;
  let session = null;
  let cloudAvailable = true;
  let onlineHandlerInstalled = false;

  function key(name, shared) {
    return shared ? 'ru_training_v2::' + name : 'ru_training_v2::' + (account ? account.username.toLowerCase() : 'guest') + '::' + name;
  }

  function read(name, fallback, shared) {
    try {
      const value = localStorage.getItem(key(name, shared));
      return value ? JSON.parse(value) : fallback;
    } catch (_) { return fallback; }
  }

  function write(name, value, shared) {
    localStorage.setItem(key(name, shared), JSON.stringify(value));
  }

  function emptyProfile() {
    return {
      attempts: [], mastery: {}, favorites: {}, collections: {}, pendingSync: [],
      settings: { dailySize: 12, newWords: 4, reminders: false, showStreak: true, autoPlay: true },
      featureFlags: { ai: true, tts: true, offline: true, prerequisites: true, reminders: true },
      lastSession: null, trainingDays: [], longestStreak: 0
    };
  }

  function loadProfile() {
    profile = Object.assign(emptyProfile(), read('profile', {}));
    profile.settings = Object.assign(emptyProfile().settings, profile.settings || {});
    profile.featureFlags = Object.assign(emptyProfile().featureFlags, profile.featureFlags || {});
    profile.attempts = profile.attempts || [];
    profile.mastery = profile.mastery || {};
    profile.favorites = profile.favorites || {};
    profile.collections = profile.collections || {};
    profile.pendingSync = profile.pendingSync || [];
    profile.aiReviewCache = profile.aiReviewCache || {};
  }

  function saveProfile() {
    write('profile', profile);
  }

  function cleanLine(text) {
    return String(text || '').replace(/^[—–-]+\s*/, '').trim();
  }

  function difficultyFor(bookIndex, lessonIndex) {
    if (bookIndex === 0) return lessonIndex < 8 ? 'A2 基础' : 'A2 巩固';
    return lessonIndex < 3 ? 'A2 巩固' : 'A2→B1';
  }

  function knowledgeTags(lesson, source) {
    const tags = [];
    (lesson.grammar || []).slice(0, 3).forEach(item => tags.push({ type: '语法', name: item.title }));
    if (source === 'dialogue') tags.push({ type: '句型', name: lesson.subtitle || lesson.title });
    tags.push({ type: '词汇', name: lesson.title.replace(/^第\s*\d+\s*课[:：]?\s*/, '') });
    return tags;
  }

  function seedFromCourses() {
    const seeded = [];
    if (typeof courseBooks === 'undefined') return seeded;
    courseBooks.forEach((book, bookIndex) => {
      book.lessons.forEach((lesson, lessonIndex) => {
        const examples = [];
        (lesson.grammar || []).forEach(group => (group.examples || []).forEach(item => examples.push({ item, source: 'grammar', group: group.title })));
        if (lesson.text && lesson.text.lines) lesson.text.lines.forEach(item => examples.push({ item, source: 'dialogue', group: lesson.text.title }));
        examples.forEach(({ item, source, group }, index) => {
          const ru = cleanLine(item.ru);
          const zh = cleanLine(item.zh);
          if (!ru || !zh || ru.length < 2) return;
          ['translation', 'dictation'].forEach(type => seeded.push({
            id: ['seed', book.id, lesson.id, source, index, type].join('-'),
            version: 1, status: 'draft', visibility: 'public', type,
            prompt_zh: zh, answer_ru: ru, accepted_answers: [], explanation: group || '',
            book_id: book.id, book_title: book.title, lesson_id: String(lesson.id), lesson_title: lesson.title,
            difficulty: difficultyFor(bookIndex, lessonIndex), knowledge_tags: knowledgeTags(lesson, source),
            source: 'course', created_at: nowIso(), updated_at: nowIso(), archived_at: null
          }));
        });
      });
    });
    return seeded;
  }

  function mergeExercises(base, incoming) {
    const map = new Map(base.map(item => [item.id, item]));
    incoming.forEach(item => map.set(item.id, Object.assign({}, map.get(item.id) || {}, item)));
    return Array.from(map.values());
  }

  async function loadExercises() {
    const seeded = seedFromCourses();
    const local = read('exercises', [], true);
    exercises = mergeExercises(seeded, local);
    if (!uid()) return;
    try {
      const { data, error } = await window.Auth.supabase.from('training_exercises').select('*').is('deleted_at', null);
      if (error) throw error;
      if (data && data.length) exercises = mergeExercises(exercises, data);
      cloudAvailable = true;
    } catch (_) {
      cloudAvailable = false;
    }
    persistExercises();
  }

  async function loadCloudProgress() {
    if (!uid() || !cloudAvailable || !window.Auth || !window.Auth.supabase) return;
    try {
      const [attemptsResult, masteryResult] = await Promise.all([
        window.Auth.supabase.from('training_attempts').select('*').eq('user_id', uid()).order('created_at', { ascending: false }).limit(1000),
        window.Auth.supabase.from('training_mastery').select('*').eq('user_id', uid())
      ]);
      if (attemptsResult.error) throw attemptsResult.error;
      if (masteryResult.error) throw masteryResult.error;
      const localIds = new Set(profile.attempts.map(item => item.client_id));
      (attemptsResult.data || []).forEach(item => {
        if (!localIds.has(item.client_id)) profile.attempts.push(Object.assign({}, item, { synced: true }));
      });
      profile.attempts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      profile.attempts = profile.attempts.slice(0, 1000);
      (masteryResult.data || []).forEach(item => {
        profile.mastery[item.exercise_id] = {
          state: item.state, interval: Number(item.interval_days) || 0, ease: Number(item.ease) || 2.3,
          dueAt: item.due_at ? new Date(item.due_at).getTime() : 0, correct: item.correct_count || 0,
          wrong: item.wrong_count || 0, hints: item.hint_count || 0, updatedAt: item.updated_at
        };
      });
      saveProfile();
    } catch (_) {
      cloudAvailable = false;
    }
  }

  function persistExercises() {
    write('exercises', exercises.filter(item => item.source !== 'course' || item.status !== 'draft' || item.updated_at !== item.created_at), true);
  }

  function normalizeAnswer(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0301]/g, '').normalize('NFC')
      .toLowerCase().replace(/ё/g, 'е').replace(/[.,!?;:«»„“”"'()[\]{}—–-]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function judgeLocal(exercise, answer) {
    const normalized = normalizeAnswer(answer);
    const answers = [exercise.answer_ru].concat(exercise.accepted_answers || []).map(normalizeAnswer);
    if (!normalized) return { status: 'empty', message: '请先输入答案。' };
    if (answers.includes(normalized)) return { status: 'correct', message: '表达正确。' };
    const target = answers[0];
    const aWords = normalized.split(' '), tWords = target.split(' ');
    const sameWords = aWords.length === tWords.length && aWords.slice().sort().join('|') === tWords.slice().sort().join('|');
    if (sameWords) return { status: 'review', message: '词汇基本正确，但词序与参考答案不同，可以申请 AI 复核。' };
    const prefix = tWords.findIndex((word, index) => word !== aWords[index]);
    return { status: 'wrong', message: prefix >= 0 ? '请检查第 ' + (prefix + 1) + ' 个词附近的拼写、词形或搭配。' : '请检查拼写、词形和语法。' };
  }

  function aiReviewCacheKey(exercise, answer) {
    return [exercise.id, exercise.version || 1, normalizeAnswer(answer)].join('::');
  }

  function applyAiReviewResult(exercise, answer, result) {
    if (!result) return false;
    if (result.verdict === 'correct') {
      if (!exercise.accepted_answers.includes(answer)) exercise.accepted_answers.push(answer);
      persistExercises();
      finishQuestion(exercise, answer, 'correct', Math.max(1, session.hints), result.cached ? '已使用之前的 AI 复核结果。' : 'AI 复核为合理表达，已加入本地可接受答案。');
      return true;
    }
    if (result.verdict === 'partial') {
      setFeedback('基本正确，但需要修改：' + esc(result.explanation || ''), 'review');
      return true;
    }
    setFeedback('复核结果：' + esc(result.explanation || '当前表达仍需修改。'), 'wrong', true);
    return true;
  }

  function masteryFor(id) {
    return profile.mastery[id] || { state: '尚未评估', interval: 0, dueAt: 0, ease: 2.3, correct: 0, wrong: 0, hints: 0 };
  }

  function updateMastery(exercise, result, usedHints) {
    const current = masteryFor(exercise.id);
    if (result === 'correct') {
      current.correct += 1;
      current.interval = usedHints ? Math.max(1, Math.min(3, current.interval || 1)) : Math.max(1, Math.round((current.interval || 1) * current.ease));
      current.ease = Math.min(3, current.ease + (usedHints ? -0.05 : 0.08));
      current.state = usedHints ? '正在巩固' : current.correct >= 4 && current.interval >= 8 ? '稳定掌握' : '正在巩固';
    } else {
      current.wrong += 1;
      current.interval = result === 'skipped' ? 1 : 0.2;
      current.ease = Math.max(1.3, current.ease - 0.18);
      current.state = current.correct > 2 ? '需要唤醒' : '不稳定';
    }
    if (usedHints) current.hints += 1;
    current.dueAt = Date.now() + current.interval * DAY;
    current.updatedAt = nowIso();
    profile.mastery[exercise.id] = current;
    syncMastery(exercise.id, current);
  }

  async function syncMastery(exerciseId, mastery) {
    if (!navigator.onLine || !uid() || !cloudAvailable || !window.Auth || !window.Auth.supabase) return;
    try {
      const { error } = await window.Auth.supabase.from('training_mastery').upsert({
        user_id: uid(), exercise_id: exerciseId, state: mastery.state,
        interval_days: mastery.interval, ease: mastery.ease, due_at: mastery.dueAt ? new Date(mastery.dueAt).toISOString() : null,
        correct_count: mastery.correct, wrong_count: mastery.wrong, hint_count: mastery.hints, updated_at: nowIso()
      }, { onConflict: 'user_id,exercise_id' });
      if (error) throw error;
    } catch (_) { /* local mastery remains authoritative until the next sync */ }
  }

  function recordAttempt(exercise, answer, result, hints, extra) {
    const attempt = Object.assign({
      client_id: uuid(), exercise_id: exercise.id, exercise_version: exercise.version || 1,
      answer_text: answer, result, hint_level: hints, response_ms: session ? Date.now() - session.questionStarted : 0,
      created_at: nowIso(), synced: false
    }, extra || {});
    profile.attempts.unshift(attempt);
    profile.attempts = profile.attempts.slice(0, 1000);
    profile.pendingSync.push(attempt.client_id);
    const today = new Date().toISOString().slice(0, 10);
    if (!profile.trainingDays.includes(today)) profile.trainingDays.push(today);
    saveProfile();
    syncPending();
  }

  async function syncPending() {
    if (!navigator.onLine || !uid() || !profile.pendingSync.length || !cloudAvailable) return;
    const pending = profile.attempts.filter(item => profile.pendingSync.includes(item.client_id));
    if (!pending.length) return;
    try {
      const payload = pending.map(item => ({
        client_id: item.client_id, user_id: uid(), exercise_id: item.exercise_id,
        exercise_version: item.exercise_version || 1, answer_text: item.answer_text || '',
        result: item.result, hint_level: item.hint_level || 0, response_ms: item.response_ms || 0,
        review_status: item.review_status || null, created_at: item.created_at
      }));
      const { error } = await window.Auth.supabase.from('training_attempts').upsert(payload, { onConflict: 'client_id' });
      if (error) throw error;
      const done = new Set(pending.map(item => item.client_id));
      profile.pendingSync = profile.pendingSync.filter(id => !done.has(id));
      profile.attempts.forEach(item => { if (done.has(item.client_id)) item.synced = true; });
      saveProfile();
      renderSyncBadge();
    } catch (_) { /* stay queued */ }
  }

  function published() {
    return exercises.filter(item => item.status === 'published' && !item.archived_at && (!item.owner_id || item.owner_id === uid()));
  }

  function priority(exercise) {
    const m = masteryFor(exercise.id);
    const bookBoost = exercise.book_id === 'russian-road-2' ? 2000 : 0;
    const overdue = m.dueAt ? Math.max(0, Date.now() - m.dueAt) / 100000 : 500;
    return bookBoost + overdue + m.wrong * 60 - m.correct * 8 + (profile.favorites[exercise.id] ? 120 : 0);
  }

  function queueStats() {
    const list = published();
    const overdue = list.filter(item => masteryFor(item.id).dueAt && masteryFor(item.id).dueAt <= Date.now()).length;
    const newCount = list.filter(item => masteryFor(item.id).state === '尚未评估').length;
    return { total: list.length, overdue, newCount };
  }

  function buildQueue(size, backlogExtra, mode, lessonId, bookId) {
    let pool = published();
    if (lessonId) pool = pool.filter(item => item.lesson_id === String(lessonId));
    if (bookId) pool = pool.filter(item => item.book_id === String(bookId));
    if (mode === 'translation') pool = pool.filter(item => item.type === 'translation');
    if (mode === 'dictation') pool = pool.filter(item => item.type === 'dictation');
    if (mode === 'favorites') pool = pool.filter(item => profile.favorites[item.id]);
    pool.sort((a, b) => priority(b) - priority(a));
    if (mode === 'mixed') {
      const targetCount = Math.max(1, size + backlogExtra);
      const translationTarget = Math.ceil(targetCount * .6);
      pool = pool.filter(item => item.type === 'translation').slice(0, translationTarget)
        .concat(pool.filter(item => item.type === 'dictation').slice(0, targetCount - translationTarget))
        .sort((a, b) => priority(b) - priority(a));
    }
    const due = pool.filter(item => masteryFor(item.id).dueAt && masteryFor(item.id).dueAt <= Date.now());
    const unseen = pool.filter(item => masteryFor(item.id).state === '尚未评估');
    const stable = pool.filter(item => !due.includes(item) && !unseen.includes(item));
    const target = Math.max(1, size + backlogExtra);
    const queue = [];
    const take = (source, count) => source.slice(0, count).forEach(item => { if (!queue.includes(item)) queue.push(item); });
    take(due, Math.min(due.length, Math.ceil(target * .65) + backlogExtra));
    take(unseen, Math.min(unseen.length, Math.max(0, target - queue.length)));
    take(stable, Math.max(0, target - queue.length));
    if (profile.featureFlags.prerequisites && queue.some(item => item.book_id === 'russian-road-2')) {
      const weak = Object.values(profile.mastery).filter(item => item.state === '不稳定' || item.state === '需要唤醒').length;
      const prerequisiteCount = Math.min(5, Math.max(0, Math.ceil(weak / 4)));
      const basics = published().filter(item => item.book_id === 'russian-road-1' && !queue.includes(item)).sort((a, b) => priority(b) - priority(a)).slice(0, prerequisiteCount);
      queue.splice(Math.min(2, queue.length), 0, ...basics);
    }
    return queue.slice(0, target + 5);
  }

  function renderSyncBadge() {
    const el = document.getElementById('trainingSyncState');
    if (!el) return;
    const pending = profile ? profile.pendingSync.length : 0;
    el.textContent = navigator.onLine ? (pending ? pending + ' 条待同步' : '已同步') : '离线模式 · ' + pending + ' 条待同步';
    el.classList.toggle('offline', !navigator.onLine || pending > 0);
  }

  function recentSummary() {
    const items = profile.attempts.slice(0, 50);
    const correct = items.filter(item => item.result === 'correct').length;
    const hinted = items.filter(item => item.hint_level > 0).length;
    return { count: items.length, correct, hinted, rate: items.length ? Math.round(correct / items.length * 100) : 0 };
  }

  function renderHome() {
    if (!ROOT() || !account || !profile) return;
    session = null;
    const stats = queueStats();
    const recent = recentSummary();
    const hasContent = stats.total > 0;
    ROOT().innerHTML = `
      <div class="training-hero">
        <div><p class="eyebrow">ACTIVE RECALL</p><h2>今日训练</h2><p>把认识的俄语变成能够主动写出和听出的俄语。</p></div>
        <span id="trainingSyncState" class="training-sync"></span>
      </div>
      <div class="training-dashboard-grid">
        <article class="training-card training-start-card">
          <span class="training-card-label">今日建议</span><strong>${profile.settings.dailySize} 题 · 约 15–20 分钟</strong>
          <div class="training-mini-stats"><span>到期 ${stats.overdue}</span><span>未学 ${stats.newCount}</span><span>可用 ${stats.total}</span></div>
          ${hasContent ? `
            <label class="training-field">今天额外消化积压
              <select id="trainingBacklog"><option value="0">按推荐</option><option value="5">5 题</option><option value="10">10 题</option><option value="20">20 题</option><option value="999">全部</option></select>
            </label>
            <div class="training-actions"><button class="primary-action" id="startDailyTraining">开始今日训练</button><button class="mini-btn" data-training-mode="translation">只练中译俄</button><button class="mini-btn" data-training-mode="dictation">只练听写</button></div>
          ` : `<p class="training-empty">目前还没有已发布题目。管理员可在后台审核并发布教材草稿。</p>`}
        </article>
        <article class="training-card"><span class="training-card-label">最近 50 次作答</span><strong>${recent.rate}% 独立正确</strong><p>${recent.correct} 次正确 · ${recent.hinted} 次使用提示</p></article>
        <article class="training-card"><span class="training-card-label">重点与积压</span><strong>${Object.keys(profile.favorites).length} 道重点题</strong><p>${stats.overdue} 道到期题等待复习</p><button class="mini-btn" data-training-mode="favorites">练习重点题</button><button class="text-action" id="startDiagnostic">水平诊断</button></article>
      </div>
      ${profile.lastSession && profile.lastSession.ids && profile.lastSession.ids.length ? `<div class="training-resume"><span>上次训练停在第 ${Math.min(profile.lastSession.index + 1, profile.lastSession.ids.length)} / ${profile.lastSession.ids.length} 题</span><button class="mini-btn" id="resumeTraining">继续上次训练</button><button class="text-action" id="discardTraining">放弃这次训练</button></div>` : ''}
      ${renderMasteryPanel()}
      <details class="training-settings"><summary>训练设置与功能开关</summary>${renderSettings()}</details>`;
    renderSyncBadge();
    document.getElementById('startDailyTraining')?.addEventListener('click', () => startTraining('mixed'));
    document.getElementById('resumeTraining')?.addEventListener('click', resumeTraining);
    document.getElementById('startDiagnostic')?.addEventListener('click', startDiagnostic);
    document.getElementById('discardTraining')?.addEventListener('click', () => { profile.lastSession = null; saveProfile(); renderHome(); });
    ROOT().querySelectorAll('[data-training-mode]').forEach(btn => btn.addEventListener('click', () => startTraining(btn.dataset.trainingMode)));
    bindSettings();
  }

  function renderMasteryPanel() {
    const counts = {};
    Object.values(profile.mastery).forEach(item => { counts[item.state] = (counts[item.state] || 0) + 1; });
    const states = ['尚未评估', '正在学习', '不稳定', '正在巩固', '稳定掌握', '需要唤醒'];
    return `<div class="training-card mastery-panel"><div class="panel-heading"><h3>掌握状态</h3><span>状态用于安排下一次复习，不是假精确分数</span></div><div class="mastery-grid">${states.map(state => `<div><strong>${counts[state] || 0}</strong><span>${state}</span></div>`).join('')}</div></div>`;
  }

  function renderSettings() {
    const flag = (id, label) => `<label class="training-toggle"><input type="checkbox" data-training-flag="${id}" ${profile.featureFlags[id] ? 'checked' : ''}> ${label}</label>`;
    return `<div class="training-settings-grid"><label class="training-field">每日默认题量<input id="dailyTrainingSize" type="number" min="5" max="40" value="${profile.settings.dailySize}"></label><label class="training-field">每日新词上限<input id="dailyNewWords" type="number" min="0" max="20" value="${profile.settings.newWords}"></label>${flag('ai', 'AI 争议复核')}${flag('tts', 'TTS 听写')}${flag('offline', '离线缓存')}${flag('prerequisites', '自动基础补强')}${flag('reminders', '每日提醒')}</div>`;
  }

  function bindSettings() {
    document.getElementById('dailyTrainingSize')?.addEventListener('change', event => { profile.settings.dailySize = Math.max(5, Math.min(40, Number(event.target.value) || 12)); saveProfile(); renderHome(); });
    document.getElementById('dailyNewWords')?.addEventListener('change', event => { profile.settings.newWords = Math.max(0, Math.min(20, Number(event.target.value) || 0)); saveProfile(); });
    ROOT().querySelectorAll('[data-training-flag]').forEach(input => input.addEventListener('change', () => { profile.featureFlags[input.dataset.trainingFlag] = input.checked; saveProfile(); }));
  }

  function startTraining(mode) {
    const selected = Number(document.getElementById('trainingBacklog')?.value || 0);
    const stats = queueStats();
    const extra = selected === 999 ? stats.overdue : selected;
    const queue = buildQueue(profile.settings.dailySize, extra, mode);
    if (!queue.length) { ROOT().insertAdjacentHTML('afterbegin', '<p class="training-notice">当前筛选条件下没有可练习题目。</p>'); return; }
    session = { id: uuid(), queue, index: 0, results: [], mode, hints: 0, revealed: false, retryRequired: false, questionStarted: Date.now() };
    profile.lastSession = { ids: queue.map(item => item.id), index: 0, mode, savedAt: nowIso() };
    saveProfile();
    renderQuestion();
  }

  function resumeTraining() {
    const saved = profile.lastSession;
    if (!saved || !saved.ids) return renderHome();
    const byId = new Map(exercises.map(item => [item.id, item]));
    const queue = saved.ids.map(id => byId.get(id)).filter(Boolean);
    if (!queue.length) { profile.lastSession = null; saveProfile(); return renderHome(); }
    session = { id: uuid(), queue, index: Math.min(saved.index || 0, queue.length - 1), results: [], mode: saved.mode || 'mixed', hints: 0, revealed: false, retryRequired: false, questionStarted: Date.now() };
    renderQuestion();
  }

  function startDiagnostic() {
    const basics = published().filter(item => item.book_id === 'russian-road-1').sort((a, b) => priority(b) - priority(a)).slice(0, 6);
    const target = published().filter(item => item.book_id === 'russian-road-2').sort((a, b) => priority(b) - priority(a)).slice(0, 6);
    const queue = basics.concat(target).sort(() => Math.random() - .5);
    if (!queue.length) { window.alert('发布训练题后才能开始诊断。'); return; }
    session = { id: uuid(), queue, index: 0, results: [], mode: 'diagnostic', hints: 0, revealed: false, retryRequired: false, questionStarted: Date.now() };
    profile.lastSession = { ids: queue.map(item => item.id), index: 0, mode: 'diagnostic', savedAt: nowIso() };
    saveProfile(); renderQuestion();
  }

  function startForLesson(bookId, lessonId) {
    if (!account || !profile) return;
    const queue = buildQueue(profile.settings.dailySize, 0, 'mixed', lessonId, bookId);
    if (!queue.length) {
      window.alert('这节课还没有已发布的训练题。管理员可以先在后台发布对应草稿。');
      return;
    }
    document.querySelector('.tab-btn[data-tab="training"]')?.click();
    session = { id: uuid(), queue, index: 0, results: [], mode: 'lesson', hints: 0, revealed: false, retryRequired: false, questionStarted: Date.now() };
    profile.lastSession = { ids: queue.map(item => item.id), index: 0, mode: 'lesson', savedAt: nowIso() };
    saveProfile();
    renderQuestion();
  }

  function currentExercise() { return session && session.queue[session.index]; }

  function renderQuestion(message) {
    const exercise = currentExercise();
    if (!exercise) return renderSummary();
    session.questionStarted = Date.now();
    session.hints = 0;
    session.revealed = false;
    session.retryRequired = false;
    const isDictation = exercise.type === 'dictation';
    ROOT().innerHTML = `
      <div class="training-session-head"><button class="mini-btn" id="pauseTraining">暂停并保存</button><div><strong>${session.index + 1} / ${session.queue.length}</strong><span>${isDictation ? '俄语听写' : '中译俄'} · ${esc(exercise.difficulty)}</span></div><button class="icon-action ${profile.favorites[exercise.id] ? 'active' : ''}" id="favoriteExercise" aria-label="标记重点">★</button></div>
      <div class="training-progress"><i style="width:${Math.round(session.index / session.queue.length * 100)}%"></i></div>
      <article class="training-question">
        <div class="training-source">${esc(exercise.book_title)} · ${esc(exercise.lesson_title)}</div>
        ${isDictation ? `<div class="dictation-stage"><button class="audio-main" id="playDictation">▶ 播放音频</button><button class="mini-btn" id="slowDictation">0.75× 慢速</button><button class="mini-btn" id="showTranscript">显示原文</button><p id="transcriptText" class="hidden"></p></div>` : `<h2>${esc(exercise.prompt_zh)}</h2>`}
        <label class="training-answer-label" for="trainingAnswer">请输入俄语答案</label>
        <textarea id="trainingAnswer" class="training-answer" rows="3" autocomplete="off" spellcheck="false"></textarea>
        <div id="trainingFeedback" class="training-feedback">${message ? esc(message) : ''}</div>
        <div class="training-actions"><button class="primary-action" id="submitTrainingAnswer">提交答案</button><button class="mini-btn" id="requestHint">提示</button><button class="mini-btn" id="markUnfamiliar">仍不熟</button><button class="text-action" id="reportExercise">报告问题</button></div>
      </article>`;
    bindQuestion(exercise);
    if (isDictation && profile.settings.autoPlay) playAudio(exercise, 1);
    document.getElementById('trainingAnswer').focus();
  }

  function bindQuestion(exercise) {
    document.getElementById('pauseTraining').addEventListener('click', () => { profile.lastSession.index = session.index; saveProfile(); renderHome(); });
    document.getElementById('favoriteExercise').addEventListener('click', event => { if (profile.favorites[exercise.id]) delete profile.favorites[exercise.id]; else profile.favorites[exercise.id] = { note: '', createdAt: nowIso() }; saveProfile(); event.currentTarget.classList.toggle('active'); });
    document.getElementById('submitTrainingAnswer').addEventListener('click', () => submitAnswer(exercise));
    document.getElementById('trainingAnswer').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submitAnswer(exercise); });
    document.getElementById('requestHint').addEventListener('click', () => showHint(exercise));
    document.getElementById('markUnfamiliar').addEventListener('click', () => finishQuestion(exercise, '', 'wrong', session.hints, '已标记为仍不熟，将更早复习。'));
    document.getElementById('reportExercise').addEventListener('click', () => reportExercise(exercise));
    document.getElementById('playDictation')?.addEventListener('click', () => playAudio(exercise, 1));
    document.getElementById('slowDictation')?.addEventListener('click', () => { session.hints = Math.max(session.hints, 1); playAudio(exercise, .75); });
    document.getElementById('showTranscript')?.addEventListener('click', () => { session.hints = Math.max(session.hints, 2); session.revealed = true; session.retryRequired = true; const text = document.getElementById('transcriptText'); text.textContent = exercise.answer_ru; text.classList.remove('hidden'); setFeedback('已显示原文。请隐藏辅助后重新独立输入。', 'hint'); });
  }

  function playAudio(exercise, rate) {
    if (!profile.featureFlags.tts || !('speechSynthesis' in window)) { setFeedback('音频暂不可用，可以跳过，本题不会被判错。', 'warning'); return; }
    const utter = new SpeechSynthesisUtterance(String(exercise.answer_ru).normalize('NFD').replace(/[\u0301]/g, ''));
    utter.lang = 'ru-RU'; utter.rate = rate === .75 ? .7 : .88;
    const voice = speechSynthesis.getVoices().find(item => item.lang && item.lang.toLowerCase().startsWith('ru'));
    if (voice) utter.voice = voice;
    speechSynthesis.cancel(); speechSynthesis.speak(utter);
  }

  function setFeedback(text, kind, html) {
    const el = document.getElementById('trainingFeedback');
    if (!el) return;
    el.className = 'training-feedback ' + (kind || '');
    if (html) el.innerHTML = text; else el.textContent = text;
  }

  function showHint(exercise) {
    session.hints += 1;
    if (session.hints === 1) {
      const tags = (exercise.knowledge_tags || []).map(item => item.name).slice(0, 2).join('、');
      setFeedback('错误方向提示：注意' + (tags || '词形、格和动词形式') + '。', 'hint');
    } else if (session.hints === 2) {
      const words = normalizeAnswer(exercise.answer_ru).split(' ');
      setFeedback('位置提示：答案共 ' + words.length + ' 个词，开头是“' + esc(words[0].slice(0, 2)) + '…”', 'hint', true);
    } else {
      session.revealed = true; session.retryRequired = true;
      setFeedback('参考答案：<strong>' + esc(exercise.answer_ru) + '</strong><br>请理解后重新独立输入。' + (exercise.explanation ? '<br>' + esc(exercise.explanation) : ''), 'answer', true);
    }
  }

  function submitAnswer(exercise) {
    const answer = document.getElementById('trainingAnswer').value.trim();
    const judged = judgeLocal(exercise, answer);
    if (judged.status === 'empty') return setFeedback(judged.message, 'warning');
    if (judged.status === 'correct') {
      if (session.retryRequired && session.hints < 1) session.hints = 1;
      finishQuestion(exercise, answer, 'correct', session.hints, session.hints ? '辅助后重新答对，已安排较早复习。' : '独立答对！');
      return;
    }
    session.hints += 1;
    session.retryRequired = true;
    if (session.hints >= 3) {
      session.revealed = true;
      setFeedback(judged.message + '<br>参考答案：<strong>' + esc(exercise.answer_ru) + '</strong><br>请重新独立输入后再提交。' + aiReviewButton(exercise, answer), 'wrong', true);
    } else {
      setFeedback(judged.message + aiReviewButton(exercise, answer), judged.status === 'review' ? 'review' : 'wrong', true);
    }
    document.getElementById('aiReviewAnswer')?.addEventListener('click', () => requestAiReview(exercise, answer));
  }

  function aiReviewButton(exercise, answer) {
    return profile.featureFlags.ai ? `<br><button class="text-action" id="aiReviewAnswer" data-answer="${esc(answer)}">我认为答案正确，申请复核</button>` : '';
  }

  async function requestAiReview(exercise, answer) {
    const cacheKey = aiReviewCacheKey(exercise, answer);
    const cached = profile.aiReviewCache[cacheKey];
    if (cached) {
      applyAiReviewResult(exercise, answer, Object.assign({}, cached, { cached: true }));
      return;
    }
    setFeedback('正在复核表达…', 'review');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const { data, error } = await window.Auth.supabase.functions.invoke('judge-answer', { body: { exerciseId: exercise.id, prompt: exercise.prompt_zh, reference: exercise.answer_ru, accepted: exercise.accepted_answers || [], answer }, signal: controller.signal });
      if (error) throw error;
      if (!data || !data.verdict) throw new Error('AI 未返回有效审核结果');
      profile.aiReviewCache[cacheKey] = { verdict: data.verdict, explanation: String(data.explanation || ''), cachedAt: nowIso() };
      saveProfile();
      applyAiReviewResult(exercise, answer, data);
    } catch (error) {
      let detail = '';
      try {
        if (error && error.context && typeof error.context.json === 'function') {
          const payload = await error.context.json();
          detail = payload && (payload.explanation || payload.error || payload.message) || '';
        }
      } catch (_) {}
      if (error && (error.name === 'AbortError' || /aborted|aborterror/i.test(String(error.message || error.cause || '')))) detail = 'AI 审核超过 60 秒未返回，请稍后重试';
      if (!detail && error && error.message && !/edge function returned a non-2xx/i.test(error.message)) detail = error.message;
      recordAttempt(exercise, answer, 'pending_review', session.hints, { review_status: 'pending' });
      setFeedback('AI 复核失败：' + esc(detail || '服务暂不可用或额度已满。') + '<br>本次答案已进入待复核，不降低掌握度。', 'review', true);
    } finally {
      clearTimeout(timeout);
    }
  }

  function finishQuestion(exercise, answer, result, hints, message) {
    updateMastery(exercise, result, hints > 0);
    recordAttempt(exercise, answer, result, hints);
    session.results.push({ exercise, result, hints });
    setFeedback(esc(message) + `<div class="answer-reference"><strong>${esc(exercise.answer_ru)}</strong><span>${esc(exercise.explanation || '')}</span></div><button class="primary-action" id="nextTrainingQuestion">下一题</button>`, result === 'correct' ? 'correct' : 'wrong', true);
    document.getElementById('submitTrainingAnswer').disabled = true;
    document.getElementById('nextTrainingQuestion').addEventListener('click', () => { session.index += 1; if (profile.lastSession) profile.lastSession.index = session.index; saveProfile(); renderQuestion(); });
  }

  async function reportExercise(exercise) {
    const type = window.prompt('问题类型：标准答案有误 / 判题不合理 / 翻译不自然 / 音频有问题 / 解释有误 / 题目重复 / 其他', '判题不合理');
    if (!type) return;
    const detail = window.prompt('请补充说明（可选）', '') || '';
    const answer = document.getElementById('trainingAnswer')?.value || '';
    const payload = { user_id: uid(), username: account.username, feedback_type: '题目问题', title: type + ' · ' + exercise.lesson_title, content: detail + '\n\n题目：' + exercise.prompt_zh + '\n参考：' + exercise.answer_ru + '\n作答：' + answer + '\n题目ID：' + exercise.id + '\n版本：' + exercise.version };
    try {
      const { error } = await window.Auth.supabase.from('feedback').insert(payload);
      if (error) throw error;
      setFeedback('问题已提交，可以在留言反馈中查看处理状态。', 'correct');
    } catch (_) { setFeedback('当前离线，问题报告暂未提交。请联网后重试。', 'warning'); }
  }

  function renderSummary() {
    const results = session.results;
    const correct = results.filter(item => item.result === 'correct').length;
    const independent = results.filter(item => item.result === 'correct' && item.hints === 0).length;
    const hinted = results.filter(item => item.result === 'correct' && item.hints > 0).length;
    const review = results.length - correct;
    profile.lastSession = null; saveProfile();
    ROOT().innerHTML = `<div class="training-summary"><p class="eyebrow">SESSION COMPLETE</p><h2>本次训练完成</h2><div class="summary-grid"><div><strong>${results.length}</strong><span>完成题数</span></div><div><strong>${independent}</strong><span>独立答对</span></div><div><strong>${hinted}</strong><span>提示后答对</span></div><div><strong>${review}</strong><span>需要复习</span></div></div><p>${review ? '本次不稳定内容已提前进入复习队列。' : '表现稳定，可以结束今天的训练。'}</p><div class="training-actions"><button class="primary-action" id="finishTraining">结束今天</button><button class="mini-btn" id="trainFiveMore">再练 5 题</button><button class="mini-btn" id="reviewMistakes">练习本次错误</button></div></div>`;
    document.getElementById('finishTraining').addEventListener('click', renderHome);
    document.getElementById('trainFiveMore').addEventListener('click', () => { profile.settings.dailySize = Math.max(5, profile.settings.dailySize); const queue = buildQueue(5, 0, 'mixed'); session = { id: uuid(), queue, index: 0, results: [], mode: 'extra', hints: 0, questionStarted: Date.now() }; renderQuestion(); });
    document.getElementById('reviewMistakes').addEventListener('click', () => { const queue = results.filter(item => item.result !== 'correct' || item.hints).map(item => item.exercise); if (!queue.length) return renderHome(); session = { id: uuid(), queue, index: 0, results: [], mode: 'mistakes', hints: 0, questionStarted: Date.now() }; renderQuestion(); });
  }

  function adminCounts() {
    return exercises.reduce((out, item) => { out[item.status] = (out[item.status] || 0) + 1; return out; }, {});
  }

  function renderAdmin() {
    if (!ADMIN_ROOT() || !account || account.role !== 'admin') return;
    const counts = adminCounts();
    document.getElementById('trainingAdminSummary').textContent = `${counts.draft || 0} 草稿 · ${counts.published || 0} 已发布`;
    const visible = exercises.slice().sort((a, b) => (a.book_id === 'russian-road-2' ? -1 : 1) - (b.book_id === 'russian-road-2' ? -1 : 1)).slice(0, 200);
    const books = Array.from(new Map(exercises.filter(item => item.book_id).map(item => [item.book_id, item.book_title])).entries());
    ADMIN_ROOT().innerHTML = `
      <div class="training-admin-toolbar"><button class="primary-action" id="publishRecommended">发布第二册前 60 道草稿</button><button class="mini-btn" id="publishSelected">发布勾选题目</button><button class="mini-btn" id="archiveSelected">停用勾选题目</button><button class="mini-btn" id="addManualExercise">手动添加</button><label>状态 <select id="adminExerciseFilter"><option value="all">全部</option><option value="draft">草稿</option><option value="published">已发布</option><option value="archived">已停用</option></select></label><label>教材 <select id="adminExerciseBook"><option value="all">全部</option>${books.map(([id, title]) => `<option value="${esc(id)}">${esc(title)}</option>`).join('')}</select></label><input id="adminExerciseSearch" type="search" placeholder="搜索中文、俄语或课次"></div>
      <div class="training-admin-list">${visible.map(item => renderAdminExercise(item)).join('')}</div>`;
    document.getElementById('publishRecommended').addEventListener('click', () => bulkRecommended());
    document.getElementById('publishSelected').addEventListener('click', () => bulkStatus('published'));
    document.getElementById('archiveSelected').addEventListener('click', () => bulkStatus('archived'));
    document.getElementById('addManualExercise').addEventListener('click', addManualExercise);
    document.getElementById('adminExerciseFilter').addEventListener('change', filterAdminRows);
    document.getElementById('adminExerciseBook').addEventListener('change', filterAdminRows);
    document.getElementById('adminExerciseSearch').addEventListener('input', filterAdminRows);
    ADMIN_ROOT().querySelectorAll('[data-edit-exercise]').forEach(btn => btn.addEventListener('click', () => editExercise(btn.dataset.editExercise)));
  }

  function renderAdminExercise(item) {
    const search = [item.prompt_zh, item.answer_ru, item.book_title, item.lesson_title].join(' ').toLowerCase();
    return `<article class="training-admin-row" data-status="${esc(item.status)}" data-book="${esc(item.book_id)}" data-search="${esc(search)}"><input type="checkbox" class="exercise-select" value="${esc(item.id)}"><div><strong>${item.type === 'dictation' ? '听写' : '中译俄'} · ${esc(item.prompt_zh)}</strong><span>${esc(item.answer_ru)} · ${esc(item.book_title)} ${esc(item.lesson_title)}</span></div><span class="exercise-status ${esc(item.status)}">${item.status === 'published' ? '已发布' : item.status === 'archived' ? '已停用' : '草稿'}</span><button class="text-action" data-edit-exercise="${esc(item.id)}">编辑</button></article>`;
  }

  function filterAdminRows() {
    const status = document.getElementById('adminExerciseFilter')?.value || 'all';
    const book = document.getElementById('adminExerciseBook')?.value || 'all';
    const search = (document.getElementById('adminExerciseSearch')?.value || '').trim().toLowerCase();
    ADMIN_ROOT().querySelectorAll('.training-admin-row').forEach(row => row.classList.toggle('hidden', (status !== 'all' && row.dataset.status !== status) || (book !== 'all' && row.dataset.book !== book) || (search && !row.dataset.search.includes(search))));
  }

  async function saveExerciseCloud(item) {
    persistExercises();
    if (!uid() || !cloudAvailable) return;
    try {
      const payload = Object.assign({}, item, { knowledge_tags: item.knowledge_tags || [], accepted_answers: item.accepted_answers || [] });
      const { error } = await window.Auth.supabase.from('training_exercises').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (_) { cloudAvailable = false; }
  }

  async function bulkRecommended() {
    const items = exercises.filter(item => item.status === 'draft' && item.book_id === 'russian-road-2').slice(0, 60);
    if (!items.length) return;
    if (!window.confirm('确认发布第二册优先级最高的 ' + items.length + ' 道草稿？')) return;
    for (const item of items) { item.status = 'published'; item.published_at = nowIso(); item.updated_at = nowIso(); await saveExerciseCloud(item); }
    renderAdmin(); renderHome();
  }

  async function bulkStatus(status) {
    const ids = Array.from(ADMIN_ROOT().querySelectorAll('.exercise-select:checked')).map(item => item.value);
    if (!ids.length) return;
    if (!window.confirm('确认修改 ' + ids.length + ' 道题？历史学习记录会保留。')) return;
    for (const item of exercises.filter(exercise => ids.includes(exercise.id))) {
      item.status = status; item.archived_at = status === 'archived' ? nowIso() : null; item.published_at = status === 'published' ? nowIso() : item.published_at; item.updated_at = nowIso(); await saveExerciseCloud(item);
    }
    renderAdmin(); renderHome();
  }

  function editExercise(id) {
    const item = exercises.find(exercise => exercise.id === id);
    if (!item) return;
    const prompt = window.prompt('中文题目', item.prompt_zh); if (prompt == null) return;
    const answer = window.prompt('标准俄语答案', item.answer_ru); if (answer == null || !answer.trim()) return;
    const accepted = window.prompt('可接受答案（每行一个）', (item.accepted_answers || []).join('\n')); if (accepted == null) return;
    const major = normalizeAnswer(answer) !== normalizeAnswer(item.answer_ru);
    item.prompt_zh = prompt.trim(); item.answer_ru = answer.trim(); item.accepted_answers = accepted.split('\n').map(value => value.trim()).filter(Boolean); item.updated_at = nowIso();
    if (major) item.version = (item.version || 1) + 1;
    saveExerciseCloud(item).then(renderAdmin);
  }

  function addManualExercise() {
    const zh = window.prompt('中文句子（可以先只填一侧）', '') || '';
    const ru = window.prompt('俄语句子（可以先只填一侧）', '') || '';
    if (!zh && !ru) return;
    const item = { id: uuid(), version: 1, status: 'draft', visibility: 'private', owner_id: uid(), type: 'translation', prompt_zh: zh, answer_ru: ru, accepted_answers: [], explanation: '个人手动添加', book_id: '', book_title: '个人内容', lesson_id: '', lesson_title: '手动添加', difficulty: 'A2 巩固', knowledge_tags: [], source: 'manual', created_at: nowIso(), updated_at: nowIso(), archived_at: null };
    exercises.unshift(item); saveExerciseCloud(item).then(renderAdmin);
  }

  async function enter(nextAccount) {
    account = nextAccount;
    loadProfile();
    await loadExercises();
    await loadCloudProgress();
    if (!onlineHandlerInstalled) {
      window.addEventListener('online', () => { syncPending(); renderSyncBadge(); });
      window.addEventListener('offline', renderSyncBadge);
      onlineHandlerInstalled = true;
    }
    renderHome();
    if (account.role === 'admin') renderAdmin();
    syncPending();
  }

  window.Training = { enter, renderHome, renderAdmin, startForLesson, normalizeAnswer, judgeLocal };
})();

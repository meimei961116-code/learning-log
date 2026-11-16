(() => {
  const $ = (selector) => document.querySelector(selector);
  const setupNotice = $('#setup-notice');
  const authView = $('#auth-view');
  const appView = $('#app-view');
  const authForm = $('#auth-form');
  const authMessage = $('#auth-message');
  const logMessage = $('#log-message');
  const recordsMessage = $('#records-message');
  const recordsList = $('#records-list');
  const placeholder = '貼上你的 Supabase';
  let supabase;
  let authMode = 'login';

  function setMessage(element, message = '', kind = '') {
    element.textContent = message;
    element.className = `form-message${kind ? ` ${kind}` : ''}`;
  }

  function setMode(mode) {
    authMode = mode;
    const signup = mode === 'signup';
    $('#auth-title').textContent = signup ? '建立帳號' : '登入帳號';
    $('#auth-description').textContent = signup ? '建立帳號，開始記錄你的學習旅程。' : '登入後繼續累積你的學習足跡。';
    $('#auth-submit').textContent = signup ? '建立帳號' : '登入';
    $('#auth-password').autocomplete = signup ? 'new-password' : 'current-password';
    $('#login-tab').classList.toggle('active', !signup);
    $('#signup-tab').classList.toggle('active', signup);
    $('#login-tab').setAttribute('aria-selected', String(!signup));
    $('#signup-tab').setAttribute('aria-selected', String(signup));
    setMessage(authMessage);
  }

  function showAuth() {
    authView.hidden = false;
    appView.hidden = true;
  }

  function showApp(user) {
    authView.hidden = true;
    appView.hidden = false;
    $('#account-email').textContent = user.email || '';
    $('#log-date').value = new Date().toLocaleDateString('en-CA');
    loadLogs();
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  }

  function renderLogs(logs) {
    recordsList.replaceChildren();
    $('#record-count').textContent = `${logs.length} 筆`;
    if (!logs.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const icon = document.createElement('span');
      icon.className = 'empty-icon';
      icon.textContent = '✳';
      const title = document.createElement('strong');
      title.textContent = '還沒有學習紀錄';
      const hint = document.createElement('p');
      hint.textContent = '寫下第一筆，為今天的努力留下記號。';
      empty.append(icon, title, hint);
      recordsList.append(empty);
      return;
    }
    for (const log of logs) {
      const article = document.createElement('article');
      article.className = 'record-card';
      const top = document.createElement('div');
      top.className = 'record-topline';
      const date = document.createElement('time');
      date.className = 'record-date';
      date.dateTime = log.log_date;
      date.textContent = formatDate(log.log_date);
      const duration = document.createElement('span');
      duration.className = 'duration-pill';
      duration.textContent = `${log.minutes} 分鐘`;
      top.append(date, duration);
      const content = document.createElement('p');
      content.className = 'record-content';
      content.textContent = log.content;
      article.append(top, content);
      if (log.stuck) {
        const stuck = document.createElement('div');
        stuck.className = 'record-stuck';
        const label = document.createElement('strong');
        label.textContent = '卡關筆記';
        const text = document.createElement('p');
        text.textContent = log.stuck;
        stuck.append(label, text);
        article.append(stuck);
      }
      const actions = document.createElement('div');
      actions.className = 'record-actions';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-button';
      remove.textContent = '刪除紀錄';
      remove.setAttribute('aria-label', `刪除 ${formatDate(log.log_date)} 的紀錄`);
      remove.addEventListener('click', () => deleteLog(log.id, remove));
      actions.append(remove);
      article.append(actions);
      recordsList.append(article);
    }
  }

  async function loadLogs() {
    setMessage(recordsMessage, '正在載入紀錄…');
    const { data, error } = await supabase.from('learning_logs').select('id, log_date, content, minutes, stuck, created_at').order('log_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) {
      renderLogs([]);
      setMessage(recordsMessage, `讀取失敗：${error.message}`, 'error');
      return;
    }
    setMessage(recordsMessage);
    renderLogs(data || []);
  }

  async function deleteLog(id, button) {
    button.disabled = true;
    setMessage(recordsMessage, '正在刪除…');
    const { error } = await supabase.from('learning_logs').delete().eq('id', id);
    if (error) {
      button.disabled = false;
      setMessage(recordsMessage, `刪除失敗：${error.message}`, 'error');
      return;
    }
    setMessage(recordsMessage, '紀錄已刪除。', 'success');
    await loadLogs();
  }

  $('#login-tab').addEventListener('click', () => setMode('login'));
  $('#signup-tab').addEventListener('click', () => setMode('signup'));

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('#auth-submit');
    button.disabled = true;
    setMessage(authMessage, authMode === 'signup' ? '正在建立帳號…' : '正在登入…');
    const email = $('#auth-email').value.trim();
    const password = $('#auth-password').value;
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    button.disabled = false;
    if (result.error) {
      setMessage(authMessage, result.error.message, 'error');
      return;
    }
    if (authMode === 'signup' && !result.data.session) {
      setMessage(authMessage, '註冊成功！請查看 Email 並點擊確認連結，再回來登入。', 'success');
      return;
    }
    setMessage(authMessage, '登入成功。', 'success');
  });

  $('#log-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('#save-button');
    button.disabled = true;
    setMessage(logMessage, '正在儲存…');
    const payload = {
      log_date: $('#log-date').value,
      content: $('#log-content').value.trim(),
      minutes: Number($('#log-minutes').value),
      stuck: $('#log-stuck').value.trim()
    };
    const { error } = await supabase.from('learning_logs').insert(payload);
    button.disabled = false;
    if (error) {
      setMessage(logMessage, `儲存失敗：${error.message}`, 'error');
      return;
    }
    $('#log-content').value = '';
    $('#log-minutes').value = '';
    $('#log-stuck').value = '';
    setMessage(logMessage, '已儲存，做得好！', 'success');
    await loadLogs();
  });

  $('#signout-button').addEventListener('click', async () => {
    const button = $('#signout-button');
    button.disabled = true;
    const { error } = await supabase.auth.signOut();
    button.disabled = false;
    if (error) setMessage(recordsMessage, `登出失敗：${error.message}`, 'error');
  });

  const configured = window.supabase && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes(placeholder) && !SUPABASE_PUBLISHABLE_KEY.includes(placeholder);
  if (!configured) {
    setupNotice.hidden = false;
    authView.hidden = true;
    appView.hidden = true;
    return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) showApp(session.user);
    else showAuth();
  });
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) setMessage(authMessage, `無法取得登入狀態：${error.message}`, 'error');
    if (data.session?.user) showApp(data.session.user);
    else showAuth();
  });
})();

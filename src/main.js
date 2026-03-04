import './style.css';

const app = document.querySelector('#app');

console.log('app:', app);
if (!app) throw new Error('#app が見つかりませんでした。');

// 今日の日付（YYYY-MM-DD 形式）
const today = new Date().toISOString().split('T')[0];

/* 日付を日本語表記に */
function formatDateJP(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

// localStorage に保存されている全日付を取得
const allDates = Object.keys(localStorage)
  .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
  .sort()
  .reverse();

// 今日の質問数（最初は1問）
let questionCount = 1;

// 保存済みデータを取得
const savedEntry = localStorage.getItem(today);

/* 質問一覧（カテゴリ１：今日を振り返る系質問）*/
const CATEGORY_1 = [
  "今日１日で１番記憶に残っていることは？",
  "明日待ち受けている予定・出来事は何？",
  "今１番頑張っている/夢中になっていることは？",
  "人生の中で特に思い出に残っていることは？",
  "尊敬する/憧れている人は？"
];

const CATEGORY_2 = [
  "その時の感情・気持ちは？",
  "その出来事に向けて、今どんな気持ち？",
  "頑張れる/夢中になれる理由は？",
  "その出来事から考えた/学んだことは？",
  "その人との出会いはどんな風だった？"
];

const CATEGORY_3 = [
  "その出来事を踏まえて考えた/学んだことは何？",
  "明日に向けてどんな準備してる/する必要がある？",
  "それに取り組んでいる時の自分の感情は？",
  "その出来事の前と後で自分にどんな変化があった？",
  "その人のどんなところを尊敬する/憧れる？"
];

// ========== 質問セット方式 ==========

// n番目の要素を各カテゴリから取ってきてセットを構成
function getQuestionSetByIndex(n) {
  if (n < 0 || n >= CATEGORY_1.length) {
    console.error(`Invalid set index: ${n}`);
    return null;
  }
  return [
    CATEGORY_1[n],
    CATEGORY_2[n],
    CATEGORY_3[n]
  ];
}

// 初回用：n = 1 or 2 をランダムに選出
function generateInitialSetIndex() {
  return Math.floor(Math.random() * 2); // 0 or 1
}

// 追加用：n = 3, 4, 5 からランダムに選出
function generateAdditionalSetIndex() {
  return 2 + Math.floor(Math.random() * 3); // 2, 3, 4
}

/* 画面状態 */
let screen = 'home'; // 'home' or 'history'
let selectedDate = today; // 履歴で選んだ日付

let questionSetIndices = [];  // セットの インデックス配列 [ 0, 3, 4 ] など
let questionSets = [];        // 実際の質問セット [ [Q1, Q2, Q3], [Q4, Q5, Q6], ... ]
let draftAnswers = [];        // 入力の下書き（フラット配列）
let isSavedToday = false;

/* 質問をランダムにセレクト */
if (savedEntry) {
  // すでに今日の分が保存されている場合
  const parsed = JSON.parse(savedEntry);

  isSavedToday = true;
  questionSetIndices = parsed.setIndices; // インデックスを復元
  questionSets = questionSetIndices.map(idx => getQuestionSetByIndex(idx)); // セットを再構成
  draftAnswers = parsed.answers.map(a => a.answer);
} else {
  // 今日初めて開いた場合
  const initialIndex = generateInitialSetIndex();
  questionSetIndices = [initialIndex];
  questionSets = [getQuestionSetByIndex(initialIndex)];
}

// 下書きを保存
function captureDraft() {
  const textareas = [...document.querySelectorAll('textarea')];
  textareas.forEach((ta, i) => {
    draftAnswers[i] = ta.value;
  });
}

/* 画面切り替え用 */
function renderApp() {
  app.innerHTML = `
    <main class="container">
      <header class="topbar">
        <button id="tab-home" ${screen === 'home' ? 'disabled' : ''}>今日</button>
        <button id="tab-history" ${screen === 'history' ? 'disabled' : ''}>履歴</button>
      </header>

      <section id="content"></section>
    </main>
  `;

  document.querySelector('#tab-home').addEventListener('click', () => {
    screen = 'home';
    renderApp();
  });

  document.querySelector('#tab-history').addEventListener('click', () => {
    screen = 'history';
    renderApp();
  });

  if (screen === 'home') renderHome();
  if (screen === 'history') renderHistory();
}

/* 履歴画面 */
function renderHistory() {
  const content = document.querySelector('#content');

  const dates = Object.keys(localStorage)
    .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort()
    .reverse();

  const selected = localStorage.getItem(selectedDate);
  const entry = selected ? JSON.parse(selected) : null;

  content.innerHTML = `
    <h1>履歴</h1>

    <div class="history-layout">
      <ul class="history-list">
        ${dates.map(d => `
          <li>
            <button class="history-item ${d === selectedDate ? 'active' : ''}" data-date="${d}">
              ${formatDateJP(d)}
            </button>
          </li>
        `).join('')}
      </ul>

      <div class="history-detail">
        ${entry ? `
          <h2>${formatDateJP(selectedDate)}</h2>
          ${entry.answers.map((a, i) => `
            <section class="card">
              <p><strong>Q${i+1}.</strong> ${a.question}</p>
              <p>${(a.answer || '').replaceAll('\n','<br>')}</p>
            </section>
          `).join('')}
        ` : `
          <p>この日の記録はありません。</p>
        `}
      </div>
    </div>
  `;

  // 日付クリックで詳細を切り替え
  document.querySelectorAll('.history-item').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDate = btn.dataset.date;
      renderApp(); // 履歴画面を再描画
    });
  });
}


/* 画面描画 */
function renderHome() {
  const content = document.querySelector('#content');
  content.innerHTML = `
      <h1>今日の質問</h1>

      ${currentQuestions.map((q, i) => `
        <section class="card">
          <p class="question">Q${i + 1}. ${q}</p>
          <textarea data-index="${i}" placeholder="ここに入力">${draftAnswers[i] ?? ''}</textarea>

        </section>
      `).join('')}

      <div class="actions">
        <button id="add"
          ${currentQuestions.length >= 3 || isSavedToday ? 'disabled' : ''}>
          質問を増やす
        </button>
        <button id="save">保存</button>
      </div>
      <p id="status" class="status"></p>
  `;

  bindEvents();
}

function bindEvents() {
  const addButton = document.querySelector('#add');
  const saveButton = document.querySelector('#save');

  // 追加：既存を固定したまま、次のカテゴリだけ足す
  addButton.addEventListener('click', () => {
    captureDraft();

    if (currentQuestions.length === 1) {
      currentQuestions.push(pickOne(CATEGORY_2)); // Q2だけ追加
    } else if (currentQuestions.length === 2) {
      currentQuestions.push(pickOne(CATEGORY_3)); // Q3だけ追加
    } else {
      return; // 3問以上にはしない
    }
    renderApp(); // 再描画（Q1/Q2はそのまま）
  });

  // 保存：表示されている質問数ぶんだけ保存
  saveButton.addEventListener('click', () => {
    captureDraft();
    const textareas = [...document.querySelectorAll('textarea')];

    const answers = textareas.map((ta, i) => ({
      index: i + 1,
      category: i + 1,            // 1,2,3（あとで文字列にしてもOK）
      question: currentQuestions[i],
      answer: ta.value
    }));

    const entry = {
      date: today,
      questionCount: currentQuestions.length,
      answers
    };

    localStorage.setItem(today, JSON.stringify(entry));
    draftAnswers = answers.map(a => a.answer);  // 画面復元用の下書きも、保存内容で更新
    isSavedToday = true;
    
    const status = document.querySelector('#status');
    if (status) {
      status.textContent = '保存しました！';
      setTimeout(() => (status.textContent = ''), 1500);
    }

  });
}

renderApp();

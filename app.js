/* app.js — SPA + Quiz engine (MA Mock Test 1) */
/* Uses mock_test_1.json in root */
(async function(){
  // Basic state
  const pages = {
    home: document.getElementById('page-home'),
    acca: document.getElementById('page-acca'),
    ma: document.getElementById('page-ma'),
    'ma-mock1': document.getElementById('page-ma-mock1')
  };
  // Menu toggles
  document.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=> navigate(btn.dataset.nav));
  });
  document.querySelectorAll('[data-toggle]').forEach(t=>{
    t.addEventListener('click', ()=> {
      const id = t.dataset.toggle;
      const el = document.getElementById(id);
      if(!el) return;
      el.style.display = (el.style.display === 'flex' || el.style.display === 'block') ? 'none' : 'flex';
    });
  });
  // Also sidebar child toggles (to show nested)
  // ensure ACCA children visible initially collapsed
  // Navigation
  function navigate(name){
    Object.values(pages).forEach(p=> p.classList.add('hidden'));
    const target = pages[name] || pages.home;
    target.classList.remove('hidden');
    window.scrollTo(0,0);
    if(name === 'ma-mock1') {
      showDisclaimer();
    }
  }
  // initial
  navigate('home');

  // Load questions
  const qUrl = 'mock_test_1.json';
  let questions = [];
  try{
    const res = await fetch(qUrl + '?t=' + Date.now());
    questions = await res.json();
  }catch(e){
    console.error('Failed to load questions.json', e);
    questions = [];
  }

  /* QUIZ ENGINE */
  const quizArea = document.getElementById('quizArea');
  const nextBtn = document.getElementById('nextBtn');
  const endBtn = document.getElementById('endBtn');
  const progressText = document.getElementById('progressText');
  const liveScore = document.getElementById('liveScore');
  const maxScoreEl = document.getElementById('maxScore');
  const timeElapsed = document.getElementById('timeElapsed');
  const summaryArea = document.getElementById('summaryArea');

  const STORAGE_KEY = 'youraccafriend_ma_mock1_v1';
  let attempts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); // key: question id -> {selected, marks, idx, ts}
  const totalMarks = questions.reduce((s,q)=> s + (q.marks || 0), 0);
  maxScoreEl.textContent = totalMarks;
  let currentIdx = findNextIdx();
  let startedAt = attempts.__startedAt || null;
  let timerInterval = null;

  function findNextIdx(){
    for(let i=0;i<questions.length;i++){
      if(!attempts[questions[i].id]) return i;
    }
    return questions.length;
  }

  function formatTime(s){ const m=Math.floor(s/60); const sec = s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

  function updateStatus(){
    progressText.textContent = `${Math.min(currentIdx+1, questions.length)} / ${questions.length}`;
    const score = Object.values(attempts).reduce((a,b)=> a + (b.marks || 0), 0);
    liveScore.textContent = score;
  }

  function renderQuestion(idx){
    quizArea.innerHTML = '';
    if(idx >= questions.length){ finishQuiz(); return; }
    const q = questions[idx];
    const box = document.createElement('div'); box.className = 'qbox';
    box.innerHTML = `<div class="marks-badge">${q.marks || 2} marks</div>
      <div class="question-text">${idx+1}. ${q.question}</div>
      <div class="options" id="opts"></div>
      <div id="explain" class="explain hidden"></div>`;
    quizArea.appendChild(box);
    const opts = box.querySelector('#opts');
    q.options.forEach((opt,i)=>{
      const d = document.createElement('div');
      d.className = 'option';
      d.tabIndex = 0;
      d.dataset.i = i;
      d.innerHTML = `<strong>${String.fromCharCode(65+i)}.</strong> ${opt}`;
      d.addEventListener('click', ()=> handleSelect(i, d));
      opts.appendChild(d);
    });
    nextBtn.disabled = true;
    updateStatus();
    // start timer if not started
    if(!startedAt){ startedAt = Date.now(); attempts.__startedAt = startedAt; saveAttempts(); }
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(()=> {
      const seconds = Math.floor((Date.now() - startedAt)/1000);
      timeElapsed.textContent = formatTime(seconds);
    }, 1000);
  }

  function handleSelect(selIdx, dom){
    const q = questions[currentIdx];
    // prevent double answer
    if(attempts[q.id]) return;
    // highlight correct/wrong
    const optNodes = Array.from(document.querySelectorAll('.option'));
    optNodes.forEach((n,i)=>{
      n.classList.remove('correct','wrong');
      if(i === q.correct) n.classList.add('correct');
      if(i === selIdx && i !== q.correct) n.classList.add('wrong');
    });
    // show explanation
    const ex = document.getElementById('explain');
    ex.classList.remove('hidden');
    ex.innerHTML = `<strong>${selIdx === q.correct ? 'Correct ✅' : 'Wrong ❌'}</strong>
      <div style="margin-top:8px;">${q.explanation || 'No explanation provided.'}</div>`;

    // save attempt
    attempts[q.id] = { selected: selIdx, correct: q.correct, marks: (selIdx === q.correct ? q.marks : 0), idx: currentIdx, ts: Date.now() };
    saveAttempts();
    updateStatus();
    nextBtn.disabled = false;
  }

  nextBtn.addEventListener('click', ()=> {
    // go to next unattempted question
    currentIdx++;
    while(currentIdx < questions.length && attempts[questions[currentIdx].id]) currentIdx++;
    if(currentIdx >= questions.length) { finishQuiz(); return; }
    renderQuestion(currentIdx);
  });

  endBtn.addEventListener('click', ()=> {
    if(confirm('End test now and view summary?')) finishQuiz();
  });

  function finishQuiz(){
    if(timerInterval) clearInterval(timerInterval);
    // compute results
    const attemptedArray = Object.values(attempts).filter(a=> a.idx !== undefined).sort((a,b)=> a.idx - b.idx);
    const obtained = attemptedArray.reduce((s,a)=> s + (a.marks || 0), 0);
    const correctCount = attemptedArray.filter(a=> a.marks>0).length;
    const wrongCount = attemptedArray.length - correctCount;
    const percent = Math.round((obtained/totalMarks)*100);
    const seconds = startedAt ? Math.floor((Date.now() - startedAt)/1000) : 0;
    summaryArea.innerHTML = `<h3>Test Summary</h3>
      <p><strong>Your score: ${obtained} / ${totalMarks}</strong> — ${percent}%</p>
      <p>Attempted: ${attemptedArray.length} &nbsp; Correct: ${correctCount} &nbsp; Wrong: ${wrongCount} &nbsp; Time: ${formatTime(seconds)}</p>
      <div class="small">Attempted questions (only these are shown):</div>
      <ol id="attemptedList"></ol>
      <div style="margin-top:12px;">
        <button id="retryBtn" class="btn">Retake (clear progress)</button>
        <button id="gotoMa" class="btn secondary">Back to MA</button>
      </div>`;
    // populate attempted list
    const ol = document.getElementById('attemptedList');
    attemptedArray.forEach(a=>{
      const q = questions[a.idx];
      const li = document.createElement('li');
      li.textContent = `${a.idx+1}. ${q.question} — Answer: ${String.fromCharCode(65 + q.correct)}`;
      ol.appendChild(li);
    });
    // show summary, hide quiz
    quizArea.classList.add('hidden');
    nextBtn.classList.add('hidden');
    endBtn.classList.add('hidden');
    summaryArea.classList.remove('hidden');

    document.getElementById('retryBtn').addEventListener('click', ()=> {
      if(confirm('Clear progress and restart?')) {
        localStorage.removeItem(STORAGE_KEY);
        attempts = {};
        startedAt = null;
        currentIdx = findNextIdx();
        location.reload();
      }
    });
    document.getElementById('gotoMa').addEventListener('click', ()=> navigate('ma'));
  }

  function saveAttempts(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts)); }

  // When user opens Mock Test page, show disclaimer first
  const disclaimer = document.getElementById('disclaimerModal');
  const startAccept = document.getElementById('startAccept');
  const startCancel = document.getElementById('startCancel');
  function showDisclaimer(){ disclaimer.classList.remove('hidden'); }
  startCancel.addEventListener('click', ()=> { disclaimer.classList.add('hidden'); navigate('ma'); });
  startAccept.addEventListener('click', ()=> {
    disclaimer.classList.add('hidden');
    // show quiz area and render question
    quizArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    endBtn.classList.remove('hidden');
    currentIdx = findNextIdx();
    if(currentIdx >= questions.length){ finishQuiz(); return; }
    renderQuestion(currentIdx);
  });

  // If there is saved progress and all done, show summary immediately
  if(Object.keys(attempts).length > 0 && findNextIdx() >= questions.length){
    // user finished earlier, let them open mock page to see summary
  }

  // update live status every 2 seconds
  setInterval(updateStatus, 1500);

})();

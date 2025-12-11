
/* app.js — SPA + Quiz engine (MA Mock Test 1) */
(async function(){
  const pages = {
    home: document.getElementById('page-home'),
    acca: document.getElementById('page-acca'),
    ma: document.getElementById('page-ma'),
    'ma-mock1': document.getElementById('page-ma-mock1')
  };

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

  function navigate(name){
    Object.values(pages).forEach(p=> p.classList.add('hidden'));
    const target = pages[name] || pages.home;
    target.classList.remove('hidden');
    window.scrollTo(0,0);
    if(name === 'ma-mock1') showDisclaimer();
  }

  navigate('home');

  const qUrl = 'mock_test_1.json';
  let questions = [];
  try{
    const res = await fetch(qUrl + '?t=' + Date.now());
    questions = await res.json();
  }catch(e){
    console.error('Failed to load mock_test_1.json', e);
  }

  const quizArea = document.getElementById('quizArea');
  const nextBtn = document.getElementById('nextBtn');
  const endBtn = document.getElementById('endBtn');
  const progressText = document.getElementById('progressText');
  const liveScore = document.getElementById('liveScore');
  const maxScoreEl = document.getElementById('maxScore');
  const timeElapsed = document.getElementById('timeElapsed');
  const summaryArea = document.getElementById('summaryArea');

  const STORAGE_KEY = 'youraccafriend_ma_mock1_v1';
  let attempts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
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

  function updateStatus(){
    progressText.textContent = `${Math.min(currentIdx+1, questions.length)} / ${questions.length}`;
    const score = Object.values(attempts).reduce((a,b)=> a + (b.marks || 0), 0);
    liveScore.textContent = score;
  }

  function formatTime(s){
    const m=Math.floor(s/60); const sec=s%60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function renderQuestion(idx){
    quizArea.innerHTML = '';
    if(idx >= questions.length){ finishQuiz(); return; }
    const q = questions[idx];

    const box = document.createElement('div');
    box.className = 'qbox';
    box.innerHTML = `
      <div class="marks-badge">${q.marks || 2} marks</div>
      <div class="question-text">${idx+1}. ${q.question}</div>
      <div class="options" id="opts"></div>
      <div id="explain" class="explain hidden"></div>
    `;
    quizArea.appendChild(box);

    const opts = box.querySelector('#opts');
    q.options.forEach((opt,i)=>{
      const d = document.createElement('div');
      d.className = 'option';
      d.dataset.i = i;
      d.innerHTML = `<strong>${String.fromCharCode(65+i)}.</strong> ${opt}`;
      d.addEventListener('click', ()=> handleSelect(i));
      opts.appendChild(d);
    });

    nextBtn.disabled = true;
    updateStatus();

    if(!startedAt){
      startedAt = Date.now();
      attempts.__startedAt = startedAt;
      saveAttempts();
    }

    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(()=>{
      const seconds = Math.floor((Date.now() - startedAt)/1000);
      timeElapsed.textContent = formatTime(seconds);
    },1000);
  }

  function handleSelect(selIdx){
    const q = questions[currentIdx];
    if(attempts[q.id]) return;

    const optNodes = Array.from(document.querySelectorAll('.option'));
    optNodes.forEach((n,i)=>{
      n.classList.remove('correct','wrong');
      if(i === q.correct) n.classList.add('correct');
      if(i === selIdx && i !== q.correct) n.classList.add('wrong');
    });

    const ex = document.getElementById('explain');
    ex.classList.remove('hidden');
    ex.innerHTML = `
      <strong>${selIdx === q.correct ? 'Correct ✅' : 'Wrong ❌'}</strong>
      <div style="margin-top:8px;">${q.explanation || 'No explanation provided.'}</div>
    `;

    attempts[q.id] = {
      selected: selIdx,
      correct: q.correct,
      marks: (selIdx === q.correct ? q.marks : 0),
      idx: currentIdx,
      ts: Date.now()
    };
    saveAttempts();
    updateStatus();
    nextBtn.disabled = false;
  }

  nextBtn.addEventListener('click', ()=>{
    currentIdx++;
    while(currentIdx < questions.length && attempts[questions[currentIdx].id]) currentIdx++;
    if(currentIdx >= questions.length){ finishQuiz(); return; }
    renderQuestion(currentIdx);
  });

  endBtn.addEventListener('click', ()=>{
    if(confirm('End test now and view summary?')) finishQuiz();
  });

  function finishQuiz(){
    if(timerInterval) clearInterval(timerInterval);

    const attemptedArray = Object.values(attempts)
      .filter(a=> a.idx !== undefined)
      .sort((a,b)=> a.idx - b.idx);

    const obtained = attemptedArray.reduce((s,a)=> s + (a.marks || 0), 0);
    const correctCount = attemptedArray.filter(a=> a.marks > 0).length;
    const wrongCount = attemptedArray.length - correctCount;
    const percent = Math.round((obtained/totalMarks)*100);
    const seconds = startedAt ? Math.floor((Date.now() - startedAt)/1000) : 0;

    summaryArea.innerHTML = `
      <h3>Test Summary</h3>
      <p><strong>Your score: ${obtained} / ${totalMarks}</strong> — ${percent}%</p>
      <p>Attempted: ${attemptedArray.length} | Correct: ${correctCount} | Wrong: ${wrongCount} | Time: ${formatTime(seconds)}</p>
      <div class="small">Attempted questions:</div>
      <ol id="attemptedList"></ol>
      <div style="margin-top:12px;">
        <button id="retryBtn" class="btn">Retake</button>
        <button id="gotoMa" class="btn secondary">Back to MA</button>
      </div>
    `;

    const ol = document.getElementById('attemptedList');
    attemptedArray.forEach(a=>{
      const q = questions[a.idx];
      const li = document.createElement('li');
      li.textContent = `${a.idx+1}. ${q.question} — Answer: ${String.fromCharCode(65 + q.correct)}`;
      ol.appendChild(li);
    });

    quizArea.classList.add('hidden');
    nextBtn.classList.add('hidden');
    endBtn.classList.add('hidden');
    summaryArea.classList.remove('hidden');

    document.getElementById('retryBtn').addEventListener('click', ()=>{
      if(confirm('Clear progress and restart?')){
        localStorage.removeItem(STORAGE_KEY);
        attempts = {};
        startedAt = null;
        currentIdx = findNextIdx();
        location.reload();
      }
    });

    document.getElementById('gotoMa').addEventListener('click', ()=> navigate('ma'));
  }

  function saveAttempts(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  }

  const disclaimer = document.getElementById('disclaimerModal');
  const startAccept = document.getElementById('startAccept');
  const startCancel = document.getElementById('startCancel');

  function showDisclaimer(){
    disclaimer.classList.remove('hidden');
    disclaimer.style.display = "flex";
  }

  startCancel.addEventListener('click', ()=>{
    disclaimer.classList.add('hidden');
    disclaimer.style.display = "none";
    navigate('ma');
  });

  startAccept.addEventListener('click', ()=>{
    disclaimer.classList.add('hidden');
    disclaimer.style.display = "none";
    quizArea.classList.remove('hidden');
    summaryArea.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    endBtn.classList.remove('hidden');
    currentIdx = findNextIdx();
    if(currentIdx >= questions.length){ finishQuiz(); return; }
    renderQuestion(currentIdx);
  });

  setInterval(updateStatus,1500);
})();

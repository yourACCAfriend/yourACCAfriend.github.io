(async function () {

  const pages = {
    home: page('page-home'),
    ma: page('page-ma'),
    mock: page('page-ma-mock1')
  };

  function page(id){ return document.getElementById(id); }

  document.querySelectorAll('[data-nav]').forEach(b =>
    b.onclick = () => navigate(b.dataset.nav)
  );

  function navigate(p){
    Object.values(pages).forEach(x => x.classList.add('hidden'));
    if(p === 'ma-mock1') pages.mock.classList.remove('hidden');
    else pages[p]?.classList.remove('hidden');
  }

  navigate('home');

  // LOAD QUESTIONS
  const questions = await fetch('mock_test_1.json').then(r => r.json());

  const quizArea = document.getElementById('quizArea');
  const summaryArea = document.getElementById('summaryArea');
  const controls = document.getElementById('quizControls');

  const nextBtn = document.getElementById('nextBtn');
  const endBtn = document.getElementById('endBtn');

  const progressText = document.getElementById('progressText');
  const liveScore = document.getElementById('liveScore');
  const maxScore = document.getElementById('maxScore');
  const timeEl = document.getElementById('timeElapsed');

  maxScore.textContent = questions.length * 2;

  let idx = 0, score = 0, startTime = null;
  let attempts = [];

  const disclaimer = document.getElementById('disclaimerBox');

  document.getElementById('startCancel').onclick = () => navigate('ma');

  document.getElementById('startAccept').onclick = () => {
    disclaimer.classList.add('hidden');
    quizArea.classList.remove('hidden');
    controls.classList.remove('hidden');
    startTime = Date.now();
    render();
  };

  function render(){
    const q = questions[idx];
    progressText.textContent = `${idx+1} / ${questions.length}`;
    quizArea.innerHTML = `
      <div class="qbox">
        <div class="marks">${q.marks} marks</div>
        <h3>${idx+1}. ${q.question}</h3>
        ${q.options.map((o,i)=>`
          <button class="option" onclick="window.pick(${i})">
            ${String.fromCharCode(65+i)}. ${o}
          </button>
        `).join('')}
        <div id="explain"></div>
      </div>
    `;
    nextBtn.disabled = true;
  }

  window.pick = function(i){
    const q = questions[idx];
    const explain = document.getElementById('explain');
    const correct = q.correct === i;

    if(correct) score += q.marks;

    explain.innerHTML = `
      <p><strong>${correct ? 'Correct ✅' : 'Wrong ❌'}</strong></p>
      <p>${q.explanation}</p>
    `;

    attempts.push(idx);
    liveScore.textContent = score;
    nextBtn.disabled = false;
  };

  nextBtn.onclick = () => {
    idx++;
    if(idx >= questions.length) finish();
    else render();
  };

  endBtn.onclick = () => finish();

  function finish(){
    quizArea.classList.add('hidden');
    controls.classList.add('hidden');

    const percent = Math.round((score / (questions.length*2))*100);
    const time = Math.floor((Date.now()-startTime)/1000);

    summaryArea.innerHTML = `
      <h2>Test Summary</h2>
      <p><strong>Score:</strong> ${score}/100 (${percent}%)</p>
      <p><strong>Attempted:</strong> ${attempts.length}</p>
      <p><strong>Time:</strong> ${Math.floor(time/60)}:${time%60}</p>
    `;
    summaryArea.classList.remove('hidden');
  }

  setInterval(()=>{
    if(startTime){
      const t = Math.floor((Date.now()-startTime)/1000);
      timeEl.textContent = `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
    }
  },1000);

})();

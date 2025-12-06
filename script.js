async function loadQuiz() {
  const res = await fetch('questions.json');
  const data = await res.json();

  const box = document.getElementById("quizBox");

  data.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "quiz-box";
    
    let html = `<h3>${i+1}. ${q.question}</h3>`;
    
    q.options.forEach(opt => {
      html += `<p><input type="radio" name="q${i}"> ${opt}</p>`;
    });

    html += `<p><strong>Answer:</strong> ${q.answer}</p>`;

    div.innerHTML = html;
    box.appendChild(div);
  });
}

loadQuiz();

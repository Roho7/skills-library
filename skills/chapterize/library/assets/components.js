// Reusable lesson components.
//
// Multiple choice quiz:
//   <div class="quiz" data-answer="1">          (0-based index of the correct option)
//     <p class="q">Question</p>
//     <div class="options"><button>A</button><button>B</button></div>
//     <div class="explain">Why the answer is what it is.</div>
//   </div>
//
// Free recall (answer from memory, then self-check):
//   <div class="recall">
//     <p class="q">Prompt</p>
//     <textarea></textarea>
//     <button>Reveal</button>
//     <div class="reveal">Model answer</div>
//   </div>
//
// Put <p class="score" id="score"></p> anywhere to show a running quiz score.

(function () {
  var quizzes = Array.prototype.slice.call(document.querySelectorAll(".quiz"));
  var answered = 0;
  var right = 0;

  function updateScore() {
    var el = document.getElementById("score");

    if (!el) return;

    el.textContent = right + " of " + quizzes.length + " correct" +
      (answered < quizzes.length ? " · " + (quizzes.length - answered) + " to go" : " · done");
  }

  quizzes.forEach(function (quiz, qi) {
    var answer = Number(quiz.dataset.answer);
    var buttons = Array.prototype.slice.call(quiz.querySelectorAll(".options button"));
    var explain = quiz.querySelector(".explain");
    var q = quiz.querySelector(".q");

    if (q) {
      var num = document.createElement("span");

      num.className = "num";
      num.textContent = (qi + 1) + ".";
      q.prepend(num);
    }

    buttons.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        var ok = i === answer;

        buttons.forEach(function (b) { b.disabled = true; });
        btn.classList.add(ok ? "is-correct" : "is-wrong");
        buttons[answer].classList.add("is-correct");

        if (explain) {
          var verdict = document.createElement("span");

          verdict.className = "verdict " + (ok ? "ok" : "no");
          verdict.textContent = ok ? "Correct. " : "Not quite. ";
          explain.prepend(verdict);
        }

        quiz.classList.add("answered");
        answered += 1;
        if (ok) right += 1;
        updateScore();
      });
    });
  });

  document.querySelectorAll(".recall").forEach(function (box) {
    var btn = box.querySelector("button");

    btn.addEventListener("click", function () {
      box.classList.toggle("revealed");
      btn.textContent = box.classList.contains("revealed") ? "Hide" : "Reveal";
    });
  });

  updateScore();
})();

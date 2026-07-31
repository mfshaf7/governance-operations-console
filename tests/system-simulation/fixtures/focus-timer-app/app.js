const DEFAULT_SECONDS = 25 * 60;

const timer = document.querySelector("#timer");
const toggle = document.querySelector("#toggle");
const reset = document.querySelector("#reset");
const status = document.querySelector("#status");

let remainingSeconds = DEFAULT_SECONDS;
let intervalId = null;

function render() {
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  timer.textContent = `${minutes}:${seconds}`;
}

function stopTimer(message) {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  toggle.textContent = "Start";
  status.textContent = message;
}

function startTimer() {
  intervalId = window.setInterval(() => {
    remainingSeconds -= 1;
    render();
    if (remainingSeconds <= 0) {
      stopTimer("Interval complete.");
    }
  }, 1000);
  toggle.textContent = "Pause";
  status.textContent = "Focus interval running.";
}

toggle.addEventListener("click", () => {
  if (intervalId === null) {
    startTimer();
  } else {
    stopTimer("Focus interval paused.");
  }
});

reset.addEventListener("click", () => {
  remainingSeconds = DEFAULT_SECONDS;
  stopTimer("Ready for a focused interval.");
  render();
});

render();

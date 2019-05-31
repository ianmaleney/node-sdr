let body = document.body;
let b = document.querySelector("#tune");
let a = document.querySelector("audio");
let s = document.querySelector("input");
let p = document.querySelector("#slider-value");
const stream_url = "http://206.189.18.163:8000/vorbis";

let svgString = '<svg><path d="M10,10 L50,100 L90,50"></path></svg>';

// Events
var updatePlayState = new Event("update_play_state");
var updateFrequency = new Event("update_frequency");
var updateStarted = new Event("update_started");

// State
let prevState = {};
let state = {
  frequency: "",
  playState: "off",
  started: false
};

// Utilities
const dispatchPlayState = function(
  new_playstate,
  el = b,
  callback = updatePlayState
) {
  el.dataset.playstate = new_playstate;
  body.dispatchEvent(callback);
};

const dispatchFrequency = function(
  new_freq,
  el = s,
  callback = updateFrequency
) {
  console.log(new_freq);
  el.dataset.frequency = new_freq;
  el.value = new_freq;
  body.dispatchEvent(callback);
};

// Update Button Text
const updateButton = function(button_state) {
  switch (button_state) {
    case "off":
      b.textContent = "Tune In";
      b.disabled = false;
      break;
    case "closed":
      b.textContent = "Hang On";
      b.disabled = true;
      break;
    case "retuned":
      b.textContent = "Retune";
      b.disabled = false;
      break;
    case "tuning":
      b.textContent = "Tuning...";
      b.disabled = true;
      break;
    case "playing":
      b.textContent = "Pause";
      b.disabled = false;
      break;
    case "paused":
      b.textContent = "Play";
      b.disabled = false;
      break;
    default:
      b.textContent = "Tune In";
      b.disabled = false;
      break;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  body.dispatchEvent(updateFrequency);
});

body.addEventListener("update_started", e => {
  if (state.started) return;
  state.started = true;
});

body.addEventListener("update_play_state", e => {
  let new_play_state = b.dataset.playstate;
  prevState = state;
  state.playState = new_play_state;
  updateButton(new_play_state);
});

body.addEventListener("update_frequency", e => {
  let new_frequency = s.dataset.frequency;
  prevState = state;
  state.frequency = new_frequency;
  console.log({ state });
  p.textContent = `${new_frequency}Mhz`;
});

a.addEventListener("loadeddata", () => {
  console.log("loadeddata");
  let data = {
    ready: true
  };
  fetch("/state", {
    method: "post",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(server_state => {
      console.log({ server_state });
      setTimeout(() => {
        dispatchPlayState("playing");
      }, 5000);
    });
});

a.addEventListener("ended", () => {
  console.log("ended");
  dispatchPlayState("tuning");
  setTimeout(() => {
    a.src = null;
    a.src = stream_url;
    a.play();
    dispatchFrequency(server_state.freq);
  }, 3500);
});

s.addEventListener("change", () => {
  dispatchFrequency(s.value);
  if (state.started) {
    dispatchPlayState("retuned");
  }
});

const start = function() {
  dispatchPlayState("tuning");
  a.src = null;
  a.src = stream_url;
  a.play();
  dispatchPlayState("closed");
};

const pause = function() {
  dispatchPlayState("paused");
  a.muted = true;
};

const play = function() {
  dispatchPlayState("playing");
  a.muted = false;
};

b.addEventListener("click", () => {
  switch (state.playState) {
    case "off":
      start();
      break;
    case "playing":
      pause();
      break;
    case "paused":
      play();
      break;
    case "retuned":
      start();
      break;

    default:
      pause();
      break;
  }
});

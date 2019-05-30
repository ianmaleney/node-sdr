let body = document.body;
let b = document.querySelector("#tune");
let a = document.querySelector("audio");
let s = document.querySelector("input");
let p = document.querySelector("#slider-value");

// Audio
(function() {
  // An array of all contexts to resume on the page
  const audioContextList = [];

  // An array of various user interaction events we should listen for
  const userInputEventNames = [
    "click",
    "contextmenu",
    "auxclick",
    "dblclick",
    "mousedown",
    "mouseup",
    "pointerup",
    "touchend",
    "keydown",
    "keyup"
  ];

  // A proxy object to intercept AudioContexts and
  // add them to the array for tracking and resuming later
  self.AudioContext = new Proxy(self.AudioContext, {
    construct(target, args) {
      const result = new target(...args);
      audioContextList.push(result);
      return result;
    }
  });

  // To resume all AudioContexts being tracked
  function resumeAllContexts(event) {
    let count = 0;

    audioContextList.forEach(context => {
      if (context.state !== "running") {
        context.resume();
      } else {
        count++;
      }
    });

    // If all the AudioContexts have now resumed then we
    // unbind all the event listeners from the page to prevent
    // unnecessary resume attempts
    if (count == audioContextList.length) {
      userInputEventNames.forEach(eventName => {
        document.removeEventListener(eventName, resumeAllContexts);
      });
    }
  }

  // We bind the resume function for each user interaction
  // event on the page
  userInputEventNames.forEach(eventName => {
    document.addEventListener(eventName, resumeAllContexts);
  });
})();

const stream_url = "http://206.189.18.163:8000/vorbis";
var context = new (window.AudioContext || window.webkitAudioContext)();
var audioStack = [];
var nextTime = 0;

const scheduleBuffers = function() {
  if (context.state === "suspended") {
    context.resume();
    console.log("Context Resumed");
  }
  while (audioStack.length) {
    var buffer = audioStack.shift();
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    if (nextTime == 0) nextTime = context.currentTime + 0.01; /// add 50ms latency
    source.start(nextTime);
    nextTime += source.buffer.duration; // Make the next buffer wait the length of the last buffer playing
  }
};

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
  fetch("/state")
    .then(res => res.json())
    .then(server_state => {
      console.log(server_state);
      if (server_state.ready) {
        a.src = null;
        a.src = stream_url;
        a.play();
        dispatchFrequency(server_state.freq);
      }
    });
});

s.addEventListener("change", () => {
  dispatchFrequency(s.value);
  if (state.started) {
    dispatchPlayState("retuned");
  }
});

document.querySelector("#play").addEventListener("click", () => {
  if (audioStack.length) {
    scheduleBuffers();
  }
});

const start = function() {
  dispatchPlayState("tuning");

  const url = `ws://${window.location.hostname}:3000/radio`;
  const connection = new WebSocket(url);

  connection.binaryType = "arraybuffer";

  connection.onopen = () => {
    connection.send(state.frequency);
  };

  connection.onmessage = e => {
    // console.log(e);
    new Response(e.data)
      .arrayBuffer()
      .then(array_buffer => {
        console.log(array_buffer);
        return array_buffer;
      })
      .then(array_buffer => context.decodeAudioData(array_buffer))
      .then(audio_buffer => {
        audioStack.push(audio_buffer);
        console.log(audio_buffer);
      });
  };

  //   fetch(`/radio`, {
  //     method: "post",
  //     headers: {
  //       "Content-Type": "application/json"
  //     },
  //     cache: "no-store",
  //     body: JSON.stringify(data)
  //   })
  //     .then(res => res.json())
  //     .then(server_state => {
  //       dispatchFrequency(server_state.freq);
  //       console.log(server_state);
  //       if (server_state.message === "ready") {
  //         if (!state.started) body.dispatchEvent(updateStarted);
  //         a.src = null;
  //         a.src = stream_url;
  //         a.play();
  //         dispatchPlayState("closed");
  //       }
  //     });
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

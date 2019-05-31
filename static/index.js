let body = document.body;
let b = document.querySelector("#tune");
let a = document.querySelector("audio");

const stream_url = "http://206.189.18.163:8000/vorbis";
const url = `ws://${window.location.hostname}:3000/socket`;

function formatTime(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

const time_until_switch = function(time_started, total_length) {
  let now = new Date().getTime();
  let elapsed = now - time_started;
  let remaining = total_length - elapsed;
  return `${formatTime(remaining)} until new frequency`;
};

a.addEventListener("ended", () => {
  console.log("ended");
  setTimeout(() => {
    start();
  }, 3500);
});

b.addEventListener("click", () => {
  start();
});

const start = function() {
  a.src = null;
  a.src = stream_url;
  a.play();
};

document.addEventListener("DOMContentLoaded", () => {
  a.src = stream_url;
  let connection = new WebSocket(url);

  connection.onopen = () => {
    console.log("Socket Open");
    connection.send("get_freq");
  };

  connection.onerror = error => {
    console.log(`WebSocket error: ${error}`);
  };

  connection.onmessage = e => {
    let server_state = JSON.parse(e.data);
    console.log(server_state);
    document.querySelector("#freq").textContent = `You're tuned to ${
      server_state.frequency
    }Mhz`;
  };
});

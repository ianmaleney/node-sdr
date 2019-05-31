const express = require("express");
const app = express();
const port = 3000;
var expressWs = require("express-ws")(app);
const EventEmitter = require("events");
const { spawn } = require("child_process");
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(express.static("static"));

var state = {
  first_time: true,
  frequency: 0,
  time_start: 0
};

class passMessage extends EventEmitter {}
const message = new passMessage();

message.on("update", (freq, time) => {
  state.frequency = freq;
  state.time_start = time;
});

const ranges = [
  [20, 30],
  [30, 70],
  [70, 88],
  [88, 118],
  [118, 137],
  [156, 174]
];

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const getFreq = function(ranges) {
  let random_range = Math.floor(Math.random() * ranges.length);
  let [min, max] = ranges[random_range];
  let random_freq = randomIntFromInterval(min, max);
  return random_freq;
};

const tune = async function() {
  let freq = getFreq(ranges);
  var sdr = await spawn("bash", [__dirname + "/sdr.sh", freq]);
  let now = new Date().getTime();
  message.emit("update", freq, now);

  sdr.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
  });

  sdr.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
};

app.get("/", function(req, res) {
  res.sendFile("static/index.html", { root: __dirname });
});

app.ws("/socket", function(ws, req) {
  ws.on("message", function(msg) {
    if (msg === "get_freq") {
      ws.send(JSON.stringify(state));
    }
  });
});

tune();
setInterval(() => {
  console.log("Tuning");
  tune();
}, 1000 * 60);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

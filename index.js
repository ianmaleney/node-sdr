const express = require("express");
const app = express();
const port = 3000;
const { spawn } = require("child_process");
const bodyParser = require("body-parser");
const EventEmitter = require("events");
app.use(bodyParser.json());
app.use(express.static("static"));

var state = {
  first_time: true,
  ready: true,
  open: true,
  freq: 0,
  message: ""
};

class SetOpenState extends EventEmitter {}
const setOpenState = new SetOpenState();

setOpenState.on("access", () => {
  setTimeout(() => {
    state.open = true;
    console.log("Open to new requests");
  }, 10000);
});

setOpenState.on("ready", () => {
  setTimeout(() => {
    state.ready = true;
    console.log("Ready");
  }, 2000);
});

const play = async function(req, res) {
  var freq = await req.body.freq.toString();
  var sdr = await spawn("bash", [__dirname + "/sdr.sh", freq]);

  state.freq = freq;
  state.ready = false;
  state.open = false;
  console.log("Closed to Requests");

  sdr.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
    if (data.includes("Output at")) {
      state.message = "ready";
      res.send(state);
    }
  });

  sdr.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
};

app.get("/state", (req, res) => {
  res.send(state);
});

app.post("/state", (req, res) => {
  var playing = req.body.ready;
  if (playing) {
    setOpenState.emit("ready");
    setOpenState.emit("access");
  }
  res.send(state);
});

const check_if_ready = function(open_state, req, res) {
  if (open_state) {
    console.log("Ready to Play");
    play(req, res);
  } else {
    console.log("Not Ready Yet");
    setTimeout(() => {
      check_if_ready(state.open, req, res);
    }, 1000);
  }
};

app.post("/radio", (req, res) => {
  const kill = spawn("bash", [__dirname + "/kill.sh"]);
  kill.on("close", code => {
    if (code === 0 || state.first_time) {
      state.first_time = false;
      check_if_ready(state.open, req, res);
    } else {
      res.send("Failed to kill the rtl_fm process.");
      console.log("Failed to kill the rtl_fm process.");
    }
  });
});

app.get("/", function(req, res) {
  res.sendFile("static/index.html", { root: __dirname });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

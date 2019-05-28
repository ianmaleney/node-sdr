const express = require("express");
const app = express();
const port = 3000;
const { spawn } = require("child_process");
const bodyParser = require("body-parser");
const compression = require("compression");
const EventEmitter = require("events");
app.use(bodyParser.json());
app.use(compression());
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();

var state = {
  first_time: true
};

myEmitter.on("radio_ready", res => {
  res.send("ready");
});

const play = async function(req, res) {
  var freq = await req.body.freq.toString();
  var sdr = await spawn("bash", [__dirname + "/sdr.sh", freq]);

  sdr.stdout.on("data", data => {
    res.send(data);
  });

  sdr.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
    if (data.includes("Output at")) {
      myEmitter.emit("radio_ready", res);
    }
  });

  sdr.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
};

app.post("/radio", (req, res) => {
  const kill = spawn("bash", [__dirname + "/kill.sh"]);
  kill.on("close", code => {
    if (state.first_time) {
      res.setHeader("Content-Type", "text/html");
    }
    if (code === 0 || state.first_time) {
      state.first_time = false;
      setTimeout(() => {
        play(req, res);
      }, 100);
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

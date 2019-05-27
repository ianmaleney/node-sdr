const express = require("express");
const app = express();
const expressWs = require("express-ws")(app);
var cors = require("cors");
const port = 3000;
const { spawn } = require("child_process");

app.use(
  cors({
    allowedHeaders: ["sessionId", "Content-Type"],
    exposedHeaders: ["sessionId"],
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false
  })
);

var state = {
  first_time: true
};

const play = function(req, res) {
  var freq = req.query.freq.toString();
  var sdr = spawn("bash", [__dirname + "/sdr.sh", freq]);

  sdr.stdout.on("data", data => {
    res.send(data);
  });

  sdr.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
  });

  sdr.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
};

const playSocket = function(ws, freq) {
  var sdr = spawn("bash", [__dirname + "/sdr.sh", freq]);

  sdr.stdout.on("data", data => {
    ws.send(`You are listening on: ${freq}Mhz`);
    ws.send(data);
  });

  sdr.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
    ws.send(`stderr: ${data}`);
  });

  sdr.on("close", code => {
    console.log(`child process exited with code ${code}`);
    ws.send(`child process exited with code ${code}`);
  });
};

app.get("/radio", (req, res) => {
  const kill = spawn("bash", [__dirname + "/kill.sh"]);
  kill.on("close", code => {
    if (code === 0 || state.first_time) {
      state.first_time = false;
      setTimeout(() => {
        play(req, res);
      }, 500);
    } else {
      res.send("Failed to kill the rtl_fm process.");
      console.log("Failed to kill the rtl_fm process.");
    }
  });
});

app.ws("/echo", function(ws, req) {
  ws.on("message", function(msg) {
    const kill = spawn("bash", [__dirname + "/kill.sh"]);
    kill.on("close", code => {
      if (code === 0 || state.first_time) {
        state.first_time = false;
        setTimeout(() => {
          playSocket(ws, msg);
        }, 500);
      } else {
        ws.send("Failed to kill the rtl_fm process.");
        console.log("Failed to kill the rtl_fm process.");
        state.first_time = true;
      }
    });
  });
});

app.get("/", function(req, res) {
  res.sendFile("static/index.html", { root: __dirname });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

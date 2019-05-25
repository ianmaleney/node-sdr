const express = require("express");
const app = express();
const port = 3000;
const { spawn } = require("child_process");

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

app.get("/", function(req, res) {
  res.sendFile("static/index.html", { root: __dirname });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

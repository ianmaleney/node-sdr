const express = require("express");
const app = express();
const port = 3000;
const { spawn } = require("child_process");
const bodyParser = require("body-parser");
var expressWs = require("express-ws")(app);
const RtlSdr = require("rtlsdrjs");
var Readable = require("stream").Readable;
var rs = Readable();
app.use(bodyParser.json());
app.use(express.static("static"));
let readSamples = true;

async function start(freq, ws) {
  //
  // request a device
  // RtlSdr.getDevices() can be used to get a list of all RTL SDR's attached to system
  //
  const sdr = await RtlSdr.requestDevice();
  var ez = await spawn("bash", [__dirname + "/ez.sh"], {
    stdio: [process.stdin, process.stdout, process.stderr]
  });

  //
  // open the device
  //
  // supported options are:
  // - ppm: frequency correction factor, in parts per million (defaults to 0)
  // - gain: optional gain in dB, auto gain is used if not specified
  //
  await sdr.open({
    ppm: 5
  });

  //
  // set sample rate and center frequency in Hz
  // - returns the actual values set
  //
  const actualSampleRate = await sdr.setSampleRate(2000000);
  const convertFreq = await function(raw_freq) {
    return raw_freq * 10000000;
  };
  const actualCenterFrequency = await sdr.setCenterFrequency(convertFreq(freq));

  //
  // reset the buffer
  //
  await sdr.resetBuffer();

  var rs = new Readable();

  while (readSamples) {
    //
    // read some samples
    // - returns an ArrayBuffer with the specified number of samples,
    //   data is interleaved in IQ format
    //
    const samples = await sdr.readSamples(16 * 16384);
    const buffer = Buffer.from(samples);
    rs._read = () => {};
    rs.push(buffer);
    rs.pipe(process.stdout);
  }
}

app.ws("/radio", (ws, req) => {
  ws.on("message", function(msg) {
    start(msg, ws);
  });
});

app.get("/", function(req, res) {
  res.sendFile("static/index.html", { root: __dirname });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

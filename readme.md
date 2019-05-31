# Install Dependencies

### Install Node
Download this and install: https://nodejs.org/dist/v10.16.0/node-v10.16.0.pkg

### Install Git – paste this into a terminal window, follow the prompts. (All commands from here are to be typed/pasted into the terminal.)
git --version

### Install ngrok
npm i -g ngrok

### Install Homebrew – Follow the prompts, just do the default for everything.
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

### Install rtl_sdr & SOX – type each of these lines into the terminal and press enter. Do one line at a time, might take a while.
brew install cmake

brew install libusb

brew install pkgconfig

brew install sox

git clone git://git.osmocom.org/rtl-sdr.git

cd rtl-sdr/

mkdir build

cd build/

cmake ../

make

sudo make install

### Test to see if rtl_sdr has been installed – make sure the SDR is plugged in.
rtl_test -t

### Install Ezstream
brew install ezstream


## Download the code
git clone https://github.com/ianmaleney/node-sdr.git

### Install the modules
cd node-sdr && npm i

### Start the server
npm run start
#!/bin/bash

rtl_fm -M wbfm -f $1\M | play -r 32k -t raw -e s -b 16 -c 1 -V1 - -q
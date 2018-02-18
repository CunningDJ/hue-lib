# Hue Library

This tool was made to simplify the process of connecting to your Hue API, providing convenience functions for interacting with it.

## Setup Instructions:
1. `npm install hue-lib`
2. Follow the command line instructions for initial setup.  You'll need physical access to your Hue Bridge.
3. `let hue = require('hue-lib')`;

## Overview
* All `hue.*Data()` functions follow the (err, data) callback structure, each aligning with the different core API endpoints (see https://www.developers.meethue.com/documentation/core-concepts):
    * `/lights` resource which contains all the light resources
    * `/groups` resource which contains all the groups
    * `/config` resource which contains all the configuration items
    * `/schedules` which contains all the schedules
    * `/scenes` which contains all the scenes
    * `/sensors` which contains all the sensors
    * `/rules` which contains all the rules
* `hue.switchLights()` or `hue.switchLight()` will accept a boolean for whether all lights or a designated light address should be on or off

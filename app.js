'use strict';

const rq = require('request');
const { red, green } = require('chalk');

let cfg = require('./config.json');
let userCfg = require('./userConfig');


/*

MAJOR resources:

/lights resource which contains all the light resources
/groups resource which contains all the groups
/config resource which contains all the configuration items
/schedules which contains all the schedules
/scenes which contains all the scenes
/sensors which contains all the sensors
/rules which contains all the rules

*/


// main
function main() {
  let args = getArgs();

  console.log('turn', args.turnOn ? "ON" : "OFF");
  switchLights(args.turnOn);
}

function getArgs() {
  let argv = process.argv.slice(2);
  if (argv.length === 1) {
    let args = {
      turnOn: argv[0]
    };

    // validation
    if (args.turnOn === "on" || args.turnOn === "off" ) {
      if (args.turnOn === "on") {
        args.turnOn = true;
      } else {
        args.turnOn = false;
      }
    } else {
      throw new Error('format: node app.js [on|off]');
    }

    return args;

  } else {
    throw new Error('format: node app.js [on|off]');
  }
}

// init & install
function _checkInit() {
  if (userCfg.username === undefined) {
    throw new Error(red('[ERR] userConfig.json needs username.  Run initUser() if you haven\'t done so.'));
  }
}

function _install() {
    //  * TODO: *

    // check if config.json and userconfig.json copied from templates/
    // if not, copy them
    //   ask if user wants to input manually, or with the prompt
    //     if prompt, continue
    //     if not, print manual insert instructions and exit

    // check if bridgeIP is set
    // if not, 
    //   find the bridges in the network, 
    //   list them by number, 
    //   and ask user which (if multiple) they would like to use
    //   if not multiple, just insert the bridge IP
    //   IF THERE ISN'T A GOOD WAY TO DO THIS:
    //     Give basic instructions for finding the bridge IP, ask them to enter it [stdin]

    // check if deviceType set
    // if not,
    //   give template for devicetype name,
    //   ask for deviceType if not [stdin]
    

    // check if username is set
    //   if not, tell them to press the bridge button, and then to press [enter]
    //   run the api to get the user key, insert the user key in userConfig.json 

    // if an exit is given before the process is finished, return false
    // else, return true
}

// * TODO: * Put initUser code into _install()?  Rework some of it?
function initUser(cb) {
  let ERRTYPE = 101;

  if (!userCfg.deviceType) {
    throw new Error(red('[ERR] userConfig.json needs deviceType. Format: "[my_app_name]#[device] [your name]"'));
  }

  rq.post(apiBaseAddr(), reqBody({ devicetype: userCfg.deviceType }), function(err, res, body) {
    if (body.error) {
      console.error(red('[ERR] ' + body.error.description));
      if (cb) {
        return cb(err, null);
      }
    } else {
      console.log(green('User initialized:'), body.success.username);
      if(cb) {
        return cb(null, body.success.username);
      }
    }
  });
}


// util

function reqBody(options) {
  return { body: options, json: true };
}

// util: base addresses
function apiBaseAddr() {
  if (cfg.bridgeIP) {
    return 'http://' + cfg.bridgeIP + '/api';
  } else {
    console.error('No bridgeIP in config.json');
    return null;
  }
}

function _baseAddr(extension) {
  _checkInit();

  let baseAddr = apiBaseAddr() +'/' + userCfg.username;
  return baseAddr + extension;
}


function lightsBaseAddr() {
  return _baseAddr('/lights');
}

function configBaseAddr() {
  return _baseAddr('/config');
}

function groupsBaseAddr() {
  return _baseAddr('/lights');
}

function schedulesBaseAddr() {
  return _baseAddr('/schedules');
}

function scenesBaseAddr() {
  return _baseAddr('/scenes');
}

function sensorsBaseAddr() {
  return _baseAddr('/sensors');
}

function rulesBaseAddr() {
  return _baseAddr('/rules');
}


// api: get data
function _getData(baseAddr, cb) {
  rq.get(
    baseAddr, 
    reqBody({ devicetype: cfg.deviceType }), 
    function(err, res, body) {
      return cb(err, body);
    }
  );
}

function lightsData(cb) {
  _getData(lightsBaseAddr(), cb)
}

function configData(cb) {
  _getData(configBaseAddr(), cb)
}

function groupsData(cb) {
  _getData(configBaseAddr(), cb)
}

function schedulesData(cb) {
  _getData(schedulesBaseAddr(), cb)
}

function scenesData(cb) {
  _getData(scenesBaseAddr(), cb)
}

function sensorsData(cb) {
  _getData(sensorsBaseAddr(), cb)
}

function rulesData(cb) {
  _getData(rulesBaseAddr(), cb)
}


// api: LIGHTS
function lightAddr(num) {
  num = new String(num);
  return lightsBaseAddr() + '/' + num + '/state';
}

function switchLights(turnOn, options) {
    lightsData(function(err, data) {
        if (err) {
            return console.error(err);
        }
        Object.keys(data).map((num) => {
            switchLight(num, turnOn, options);
        });
    });
}

function switchLight(id, turnOn, options) {
    options = Object.assign({}, { on: turnOn }, options);
    changeState(id, options);
}

function changeState(id, options) {
  rq.put(lightAddr(id), reqBody(options), function(err, res, body) {
      if (err) {
          return console.error(err);
      }
  });
}

if ( require.main === module ) {
  main();

} else {
  module.exports = {
    lightAddr,
    initUser,
    lightsData,
    configData,
    groupsData,
    schedulesData,
    scenesData,
    rulesData,
    switchLights,
    switchLight,
    changeState
  }
}

'use strict';

const rq = require('request');
const { red, green } = require('chalk');

let cfg = require('./config.json');
let userCfg = require('./userConfig');


// main
function main() {
  let args = getArgs();

  console.log('turn', args.turnOn ? "ON" : "OFF");
  switchLights(args.turnOn);
}

function getArgs() {
  //let turnOn = false;
  //let arg = process.argv[2];

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
      return console.error(red('[ERR]'), 'format: node app.js [on|off]');
    }

    return args;

  } else {
    return console.error(red('[ERR]'), 'format: node app.js [on|off]');
  }
}

// user
function initUser(cb) {
  let ERRTYPE = 101;

  if (!userCfg.deviceType) {
    return console.error(red('[ERR] userConfig.json needs deviceType. Format: "[my_app_name]#[device] [your name]"'));
  }

  rq.post(hueAddr(), reqBody({ devicetype: userCfg.deviceType }), function(err, res, body) {
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
function hueAddr() {
  if (cfg.bridgeIP) {
    return 'http://' + cfg.bridgeIP + '/api';
  } else {
    console.error('No bridgeIP in config.json');
    return null;
  }
}

function lightsBaseAddr() {
  if (userCfg.username) {
    let baseAddr = hueAddr() +'/' + userCfg.username;
    return baseAddr + '/lights'
  } else {
    console.error(red('[ERR] userConfig.json needs username.  Run initUser() if you haven\'t done so.'));
    return null;
  }
}

function lightAddr(num) {
  num = new String(num);
  return lightsBaseAddr() + '/' + num + '/state';
}

function reqBody(options) {
  return { body: options, json: true };
}

// lights alter
function lightsData(cb) {
  rq.get(
    lightsBaseAddr(), 
    reqBody({ devicetype: cfg.deviceType }), 
    function(err, res, body) {
      return cb(err, body);
    }
  );
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

function switchLight(num, turnOn, options) {
    options = Object.assign({}, { on: turnOn }, options);
    rq.put(lightAddr(num), reqBody(options), function(err, res, body) {
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
    switchLights,
    switchLight,
    lightsData
  }
}

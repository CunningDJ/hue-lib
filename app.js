'use strict';

const { existsSync, copyFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const os = require('os');

const Promise = require('promise');
const rq = require('request');
const { red, green, yellow } = require('chalk');
const { isV4Format } = require('ip');

// constants
const pwd = __dirname;

const CHECK_HUE_BRIDGES_URL = 'https://www.meethue.com/api/nupnp';

const CFG_FN = 'config.json';
const USER_CFG_FN = 'userConfig.json';
const CFG_FP = join(pwd, CFG_FN);
const USER_CFG_FP = join(pwd, USER_CFG_FN);

let cfg = {};
let userCfg = {};

if (existsSync(CFG_FP) && existsSync(USER_CFG_FP)) {
  cfg = require('./config.json');
  userCfg = require('./userConfig');
}

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
  console.log('checkinit:', userCfg)
  if (userCfg.username === undefined) {
    throw new Error(red('[ERR] userConfig.json needs username.  Run initUser() if you haven\'t done so.'));
  }
}


function _install() {
  const { prompt } = require('inquirer');
  console.log(green('Installing hue-lib...'));

  //  * TODO: *

  // check if config.json and userconfig.json copied from templates/
  let templateFiles = [CFG_FN, USER_CFG_FN];

  templateFiles.forEach(fn => {
    let templFP = join(pwd, 'templates', fn);
    let copyFP = join(pwd, fn);
    
    if (!existsSync(copyFP)) {
      console.log(yellow('Initializing template:'), fn);
      copyFileSync(templFP, copyFP);
    }
  });

  cfg = require('./config.json');
  userCfg = require('./userConfig.json');

  let questions = [];

  // check if bridgeIP is set, else prompt
  
  if (!isV4Format(cfg.bridgeIP)) {
    let bridgeIPs = getBridgeIPs();
    questions.push({
      type: 'list',
      name: 'bridgeIP',
      message: 'Choose the Hue bridge IP address (listed: Hue bridges IPs on network): ',
      //validate: _validateBridgeIP,
      default: bridgeIPs[0],
      choices: bridgeIPs
    });
  }

  // check if deviceType set, else prompt

  if (userCfg.deviceType === '') {
    questions.push({
      type: 'input',
      name: 'deviceType',
      message: 'Give deviceType.  Format: [app_name (arbitrary)]#[device (e.g. iphone)] [your name].',
      validate: _validateDeviceType, 
      default: "my_app#" + os.platform() + ' ' + os.userInfo().username
    });
  }

  if (userCfg.username === '') {
    questions.push({
      name: 'bridgePressed',
      type: 'confirm',
      message: 'Press the button on the chosen Hue bridge, and then press enter.'
    });
  }
  

  // check if username is set
  prompt(questions).then(answers => {
    let newConfig = cfg;
    if (answers.bridgeIP) {
      newConfig.bridgeIP = answers.bridgeIP;
    }

    if (answers.deviceType) {
      newConfig.deviceType = answers.deviceType;
    }

    // Set username
    _initUser(newConfig.deviceType, function(err, username) {
      if (err) {
        throw err;
      } else {
        let newUserConfig = { username };
        newUserConfig.username = username;
        console.log('username', username);

        writeFileSync(CFG_FP, JSON.stringify(newConfig, null, '\t'));
        writeFileSync(USER_CFG_FP, JSON.stringify(newUserConfig, null, '\t'));
        console.log(green('hue-lib installed successfully!'));
      }
    });
  });
  
}


// validate configuration inputs
function _validateBridgeIP(input)  {
  return new Promise(function(resolve, reject) {
    if (isV4Format(input)) {
      return resolve(true);
    } else {
      return reject('Hue Bridge IP must be ipv4 format.');
    }
  });
}

function _validateDeviceType(input) {
  return new Promise(function(resolve, reject) {
    if (/\w+#\w+/.test(input)) {
      return resolve(true);
    } else {
      return reject('Must follow format: [my_app_name (arbitrary)]#[device (e.g. iphone)] [your name]');
    }
  });
}


// * TODO: * Put initUser code into _install()?  Rework some of it?
function _initUser(deviceType, cb) {
  //let ERRTYPE = 101;

  /*if (!userCfg.deviceType) {
    throw new Error(red('[ERR] userConfig.json needs deviceType. Format: "[my_app_name]#[device] [your name]"'));
  }*/

  rq.post(apiBaseAddr(), reqBody({ devicetype: deviceType }), function(err, res, body) {
    body = body[0];
    console.log('bod:', body);
    if (err) {
      console.error(red('[ERR:RQ] ' + body.error.description));
      if (cb) {
        return cb(err, null);
      }
    } else if (body.error) {
      console.error(red('[ERR:Username] ' + body.error.description));
      if (cb) {
        var error = new Error(body.error.description);
        return cb(error, null);
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
function getBridgeIPs() {
  let syncRQ = require('sync-request');
  let res = syncRQ('GET', CHECK_HUE_BRIDGES_URL);
  let addresses = JSON.parse(res.getBody('utf8'));
  addresses = addresses.map(addr => { return addr.internalipaddress; });
  return addresses
}

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
    getBridgeIPs,
    lightAddr,
    //initUser,
    lightsData,
    configData,
    groupsData,
    schedulesData,
    scenesData,
    rulesData,
    switchLights,
    switchLight,
    changeState,
    _install,
    _checkInit
  }
}

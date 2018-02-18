'use strict';

/*
 * hue-lib MAIN
 */

const app = require('./app');

// check that the dependencies are initialized
try {
    app._checkInit();
} catch (e) {
    app._install();
} finally {
    module.exports = app;
}
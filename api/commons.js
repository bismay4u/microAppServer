//All common and global utilities and functions can be defined here

// Rolling log buffer — captured before anything else loads
const _util = require('util');
global._LOG_BUFFER = [];
const _LOG_MAX = 500;
const _origConsole = {};
['log', 'warn', 'error', 'info'].forEach(level => {
    _origConsole[level] = console[level].bind(console);
    console[level] = (...args) => {
        _origConsole[level](...args);
        const line = _util.format(...args).replace(/\x1b\[[0-9;]*m/g, '');
        global._LOG_BUFFER.push({ ts: new Date().toISOString(), level, line });
        if (global._LOG_BUFFER.length > _LOG_MAX) global._LOG_BUFFER.shift();
    };
});

const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 300 });

module.exports = function(app) {

}

global._CACHE = {
    set: function(key, value, ttl) {
        myCache.set(key,value,ttl);
    },

    get: function(key) {
        return myCache.get(key);
    },

    has: function(key) {
        const result =  myCache.has(key);
        return result;
    }
}
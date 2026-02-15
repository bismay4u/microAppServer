//All common and global utilities and functions can be defined here

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
assert = require('assert');

util = require('util');

amino = require('amino')
  .use(require('../'))
  .init();

inArray = function inArray (val, arr) {
  var i = arr.length;
  while (i--) {
    if (arr[i] === val) {
      return true;
    }
  }
  return false;
};
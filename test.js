"use strict";

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');

var osxh = require('./osxh');

var TESTCASES_DIR = path.join(__dirname, 'testcases');
function _readTestFile(fn) {
    return fs.readFileSync(path.join(TESTCASES_DIR, fn), 'utf8');
}

var testFuncs = {
render: function(testName) {
    var inputs = _readTestFile(testName + '.input');
    var outputs = _readTestFile(testName + '.dom');
    var dom = jsdom.level(3, 'core');
    var doc = new dom.Document('<html><body></body></html>');
    var resultNodes = osxh().render(inputs, doc);
}
};

var tests = [
    'render-basic1',
    'render-basic1'
];

var suites = {};
tests.forEach(function(tname) {
	var m = tname.match(/^([^-]+)-([^-]+)$/);
	var testType = m[1];
	if (! (testType in suites)) {
		suites[testType] = [];
	}
	suites[testType].push(m[2]);
});

for (var suiteName in suites) {
	describe(suiteName, function() {
		suites[suiteName].forEach(function(specificName) {
			it(specificName, function() {
				var testName = suiteName + '-' + specificName;
				testFuncs[suiteName](testName);
			});
		});
	});
}

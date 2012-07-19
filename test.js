"use strict";

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var simplesets = require('simplesets');

var osxh = require('./osxh');

// Trivial runner
var _describe = ((typeof describe == 'undefined') ?
	function(s, f) {f();} :
	describe
);
var _it = ((typeof it == 'undefined') ?
	function(s, f) {f();} :
	it
);


var TESTCASES_DIR = path.join(__dirname, 'testcases');
function _readTestFile(fn) {
    return fs.readFileSync(path.join(TESTCASES_DIR, fn), 'utf8');
}

function _findTests() {
	var allFiles = fs.readdirSync(TESTCASES_DIR);
	var res = new simplesets.Set();
	var inputFiles = allFiles.forEach(function (fn) {
		var m = fn.match(/^([^.].*)\.[a-z]+$/);
		if (m) {
			res.add(m[1]);
		}
	});
	res = res.array().sort();
	return res;
}

var testFuncs = {
render: function(testName) {
    var inputs = _readTestFile(testName + '.input');
    var outputs = _readTestFile(testName + '.dom');
    var dom = jsdom.level(3, 'core');
    var doc = jsdom.jsdom('<html>\n<body></body>\n</html>');
    var win = doc.createWindow();
    var body = win.document.getElementsByTagName('body')[0];
    
    osxh().renderInto(inputs, body);
    assert.equal(win.document.innerHTML, outputs);
}
};


var tests = _findTests();
assert.ok(tests.length >= 1);

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
	_describe(suiteName, function() {
		suites[suiteName].forEach(function(specificName) {
			_it(specificName, function() {
				var testName = suiteName + '-' + specificName;
				testFuncs[suiteName](testName);
			});
		});
	});
}

_describe('Specification should match default configuration', function() {
	var readmeText = fs.readFileSync(__dirname + '/README.md', 'utf-8');
	var config = osxh().config;
	
	_it('elements', function() {
		var m = readmeText.match(/elements must be one of (.*)\./);
		assert.ok(m);
		var docElements = m[1].split(', ').map(function (s) {
			var m = s.match(/^`([a-z0-9]+)`$/);
			assert.ok(m);
			return m[1];
		});
		assert.ok(docElements.length >= 2);

		assert.deepEqual(config.elements, docElements);

		var allElemsTest = _readTestFile('render-allelements.input', 'utf-8');
		docElements.forEach(function(el) {
			assert.ok(allElemsTest.indexOf('<' + el) >= 0);
		});
	});

	_it('attributes', function() {
		var attrRe = '`([a-z0-9]+)`(?: attribute| and `([a-z0-9]+)` attributes)',
		    matches = readmeText.match(new RegExp(attrRe, 'g')),
		    docAttrs = [];

		matches.forEach(function(matchedText) {
			var m = matchedText.match(new RegExp(attrRe));
			assert.ok(m[1]);
			docAttrs.push(m[1]);
			if (m[2]) {
				docAttrs.push(m[2]);
			}
		});
		docAttrs.sort();
		assert.ok(docAttrs.length >= 2);

		var implAttrs = Object.keys(config.specialAttributes);
		implAttrs.push.apply(implAttrs, config.attributes);
		implAttrs.sort();
		
		assert.deepEqual(implAttrs, docAttrs);
	});
});

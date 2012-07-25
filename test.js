"use strict";

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var simplesets = require('simplesets');
var vm = require('vm');
var xmldom = require('xmldom');

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
    var m = fn.match(/^([^.]+)\.[a-z.]+$/);
    if (m) {
      res.add(m[1]);
    }
  });
  res = res.array().sort();
  return res;
}

var _domNodesToHTML = function(nodes, doc) {
  var html = '';
  nodes.forEach(function(node) {
    var container = doc.createElement('container');
    container.appendChild(node);
    html += container.innerHTML;
  });
  return html;
};

var _unambiguousHTML = function(html) {
  return html.replace(/(<[a-z]+|")\/>/g, '$1 />')
};

var _loadTestcase = function(testName, requireOutputs, createDoc) {
  if (typeof createDoc === 'undefined') {
    createDoc = true;
  }
  var tc = {};

  tc.inputs = _readTestFile(testName + '.input');
  
  if (requireOutputs) {
    tc.outputs = _readTestFile(testName + '.output');
  }


  var configs = undefined;
  tc.config = {};
  try {
    configs = _readTestFile(testName + '.config.json');
  } catch(e) {
    ; // No special config, ignore
  }
  if (configs !== undefined) {
    tc.config = JSON.parse(configs);
  } else {
    try {
      configs = _readTestFile(testName + '.config.js');
    } catch(e) {
      ; // No special config, ignore
    }
    if (configs !== undefined) {
      tc.config = vm.runInNewContext('(' + configs + ')', {}, testName + '.config.js');
    }
  }
  

  if (createDoc) {
    tc.doc = jsdom.jsdom('<html>\n<body></body>\n</html>');
    tc.win = tc.doc.createWindow();
    tc.win.XMLSerializer = xmldom.XMLSerializer;
    tc.win.DOMParser = xmldom.DOMParser;
  }

  return tc;
};

var testFuncs = {
render: function(testName) {
  var tc = _loadTestcase(testName, true);
    var body = tc.win.document.getElementsByTagName('body')[0];
    var rendered,html;

    // Render with window
    rendered = osxh(tc.config, tc.win).render(tc.inputs);
    html = _domNodesToHTML(rendered, tc.doc);
    html = _unambiguousHTML(html);
    assert.equal(html, tc.outputs);

    // Render with document
    rendered = osxh(tc.config).render(tc.inputs, tc.doc);
    html = _domNodesToHTML(rendered, tc.doc);
    html = _unambiguousHTML(html);
    assert.equal(html, tc.outputs);

    // Render into an element
    osxh(tc.config).renderInto(tc.inputs, body);
    html = _unambiguousHTML(body.innerHTML);
    assert.equal(html, tc.outputs);

    // Render into an xmldom document
    var xmlDoc = (new xmldom.DOMParser()).parseFromString('<html>\n<body></body>\n</html>', 'text/xml');
    var xmlBody = xmlDoc.documentElement.getElementsByTagName('body')[0];
    rendered = osxh(tc.config).renderInto(tc.inputs, xmlBody);
    html = (new xmldom.XMLSerializer()).serializeToString(xmlBody).replace(/^<body>|<\/body>$/g, '');
    html = _unambiguousHTML(html);
    assert.equal(html, tc.outputs);
},
renderFail: function(testName) {
  var tc = _loadTestcase(testName);

  var o = osxh(tc.config);
  assert.throws(function() {
    o.render(tc.inputs, tc.doc);
  }, function(err) {
    return err.name == 'OSXHError';
  });
},
disabled: function(testName) {
  ; // Test temporarily disabled
},
serialize: function(testName) {
  var tc = _loadTestcase(testName, true, false);
  var html = '<html><body>' + tc.inputs + '</body></html>';
  var doc = jsdom.jsdom(html);
  var win = doc.createWindow();
  var body = win.document.getElementsByTagName('body')[0];
  if (tc.inputs.length > 0) {
    assert.ok(body.childNodes.length > 0);
  }
  var xml = osxh(tc.config).serialize(body.childNodes);

  assert.equal(xml, tc.outputs);
}

};


var tests = _findTests();
assert.ok(tests.length >= 1);

var suites = {};
tests.forEach(function(tname) {
  var m = tname.match(/^([^-]+)-([^\.]+)$/);
  assert.ok(m, 'Invalid test name ' + tname);
  var testType = m[1];
  if (! (testType in suites)) {
    suites[testType] = [];
  }
  suites[testType].push(m[2]);
});

// mocha does some magic with describe and its. Therefore, wrap the following in a function instead of using for ( .. in)
Object.keys(suites).forEach(function(suiteName) {
  _describe(suiteName, function() {
    suites[suiteName].forEach(function(specificName) {
      _it(specificName, function() {
        var testName = suiteName + '-' + specificName;
        assert.ok(testFuncs[suiteName], 'Invalid test type name ' + suiteName);
        testFuncs[suiteName](testName);
      });
    });
  });
});

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

    // Do we test all of them?
    var allElemsTest = _readTestFile('render-allelements.input', 'utf-8');
    docElements.forEach(function(el) {
      assert.ok(allElemsTest.indexOf('<' + el) >= 0);
    });
  });

  _it('attributes', function() {
    var attrTextMatch = readmeText.match(/Attributes must be one of:[\s\S]+?\n(?!  )/m),
      attrRe = '^ {2}[*] `([a-z0-9]+)`(?: and `([a-z0-9]+)`)?',
      matches = attrTextMatch[0].match(new RegExp(attrRe, 'gm')),
      docAttrs = [];

    assert.ok(matches, 'regexp should match something');
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

    var implAttrs = Object.keys(config.attributes);
    implAttrs.sort();
    
    assert.deepEqual(docAttrs, implAttrs);
  });
});

_describe('Error conditions:', function() {
  _it('Missing DOMParser', function() {
    var fakeWin = {
      XMLSerializer: xmldom.XMLSerializer
    };
    assert.throws(function() {
      osxh({}, fakeWin);
    }, function(err) {
      return err.name == 'OSXHError' && /DOMParser/.test(err.message);
    });
  });

  _it('Missing XMLSerializer', function() {
    var fakeWin = {
      DOMParser: xmldom.DOMParser
    };
    assert.throws(function() {
      osxh({}, fakeWin);
    }, function(err) {
      return err.name == 'OSXHError' && /XMLSerializer/.test(err.message);
    });
  });

  _it('Rendering without a document', function() {
    var fakeWin = {
      DOMParser: xmldom.DOMParser,
      XMLSerializer: xmldom.XMLSerializer
    };
    var o = osxh({}, fakeWin);
    assert.throws(function() {
      o.render('<osxh></osxh>');
    }, function(err) {
      return err.name == 'OSXHError' && /document/.test(err.message);
    });
  });
});

_describe('Test in a virtual browser context', function() {
  _it('with a static basic document', function() {
    var fakeWin = {
      DOMParser: xmldom.DOMParser,
      XMLSerializer: xmldom.XMLSerializer,
      document: jsdom.jsdom('<html>\n<body></body>\n</html>')
    };

    var osxhCode = fs.readFileSync(__dirname + '/osxh.js', 'utf-8');
    var code = (osxhCode + '\n\n' +
            'var exc;try{\n' +
            'var rendered = osxh().render("<osxh>a</osxh>");\n' + 
            '_assert(rendered.length == 1);\n' +
            '_assert(rendered[0].data == "a");' +
            '} catch(e) {exc = e;}; exc;');
    var r = vm.runInNewContext(code, {window: fakeWin, console: console, _assert: assert.ok});
    assert.ok(r === undefined, r);

    // Must also work without console
    var r = vm.runInNewContext(code, {window: fakeWin, _assert: assert.ok});
    assert.ok(r === undefined, r);
  });
});

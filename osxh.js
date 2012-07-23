"use strict";

/**
* @param addCfg The OSXH configuration. Entries amend or overwrite the default configuration (see below). optional.
* @param glbls The global window object to use. (optional, required in non-browser environments).
*/
var osxh = (function(addCfg, glbls) {
  // The following block accesses an unbound variable.
  // This is fine (and even desired) in a browser context
  if (typeof glbls === "undefined") {
    if (typeof window !== "undefined") {
      glbls = window; // Tested in a vm context // pragma: nocover
    }
  }
  if (typeof glbls === "undefined") {
    // load XML tools from dependency management
    var xmldom = require("xmldom");
    glbls = {
      XMLSerializer: xmldom.XMLSerializer,
      DOMParser: xmldom.DOMParser,
      document: null
    };
  }
  
  function OSXHError(message) {
    this.name = "OSXHError";
    this.message = (message || "");
  }
  OSXHError.prototype = new Error();
  
  if (! glbls.DOMParser) {
    throw new OSXHError("DOMParser not available. Ancient browser?");
  }
  if (! glbls.XMLSerializer) {
    throw new OSXHError("XMLSerializer not available. Ancient browser?");
  }

  var _DOM_ELEMENT_NODE = 1,
    _DOM_ATTRIBUTE_NODE = 2,
    _DOM_TEXT_NODE = 3,
    _DOM_DOCUMENT_NODE = 9,
    cfg = {
      "elements": ["a", "b", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6", "i", "img", "li", "ol", "p", "span", "strong", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"],
      "attributes": ["title"],
      "specialAttributes": {
        "href": function(tagName, val) {
          return tagName === "a" && /^(?:https?:\/\/|mailto:)/.test(val);
        },
        "src": function(tagName, val) {
          return tagName === "img" && /^data:image\/(gif|jpeg|png);/.test(val);
        },
        "colspan": function(tagName, val) {
          return (tagName === "td" || tagName === "th") && /^[0-9]+$/.test(val);
        },
        "rowspan": function(tagName, val) {
          return (tagName === "td" || tagName === "th") && /^[0-9]+$/.test(val);
        },
        "alt": function(tagName, val) {
          return tagName === "img";
        }
    }
  };

  // Merge configuration
  if (addCfg) {
    ["elements", "attributes"].forEach(function(arrayKey) {
      if (addCfg[arrayKey]) {
        cfg[arrayKey].push.apply(cfg[arrayKey], addCfg[arrayKey]);
      }
    });
    ["specialAttributes"].forEach(function(objKey) {
      if (addCfg[objKey]) {
        var newVals = addCfg[objKey];
        for (var k in newVals) {
          if (newVals.hasOwnProperty(k)) {
            cfg[objKey][k] = newVals[k];
          }
        }
      }
    });
  }

  var _serializeXML = function(xmlDoc) {
    return (new glbls.XMLSerializer()).serializeToString(xmlDoc);
  };
  var _parseXML = function(str) {
    return (new glbls.DOMParser()).parseFromString(str, "text/xml");
  };
  var _renderNodes = function(nodes, doc, fixTagName) {
    fixTagName = fixTagName || function(tn) {return tn;};

    var _renderElement = function(tagName, attrs) {
      var outEl = doc.createElement(tagName);
      for (var i = 0;i < attrs.length;i++) {
        var at = attrs[i];

        var testFunc = cfg.specialAttributes[at.name];
        if (typeof testFunc !== "undefined") {
          if (testFunc(tagName, at.value)) {
            outEl.setAttribute(at.name, at.value);
          }
        } else {
          if (cfg.attributes.indexOf(at.name) >= 0) {
            outEl.setAttribute(at.name, at.value);
          }
        }
      }
      return outEl;
    };

    var render_walkTree = function(xmlNodeList, nodeList) {
      for (var i = 0;i < xmlNodeList.length;i++) {
        var n = xmlNodeList[i];

        if (n.nodeType === _DOM_TEXT_NODE) {
          var tn = doc.createTextNode(n.data);
          nodeList.push(tn);
          continue;
        }

        if (n.nodeType === _DOM_ELEMENT_NODE) {
          var tagName = fixTagName(n.tagName);
          if (cfg.elements.indexOf(tagName) >= 0) {
            var outEl = _renderElement(tagName, n.attributes);
            var myChildren = [];
            render_walkTree(n.childNodes, myChildren);
            myChildren.forEach(function (c) {
              outEl.appendChild(c);
            });
            nodeList.push(outEl);
          } else {
            // Unsupported element, render its contents
            render_walkTree(n.childNodes, nodeList);
          }
        }
      }
    };

    var res = [];
    render_walkTree(nodes, res);
    return res;
  };
  var _render = function(str, doc) {
    var xmlDoc = _parseXML(str);
    var rootNode = xmlDoc.documentElement;
    if (rootNode.tagName !== "osxh") {
      throw new OSXHError("Not an osxh element (root element name is not 'osxh')");
    }
    return _renderNodes(rootNode.childNodes, doc);
  };

  var _vdoc = function(namespace, rootTagName) {
    var res = {
      nodeType: _DOM_DOCUMENT_NODE,
      createElement: function(tagName) {
          var children = [];
          var attributes = [];
          attributes.item = function(i) {return attributes[i];}
          var el = {
            _impl: "osxh",
            nodeType: _DOM_ELEMENT_NODE,
            tagName: tagName,
            childNodes: children,
            attributes: attributes,
            setAttribute: function(name, value) {
              for (var i = 0;i < attributes.length;i++) {
                if (attributes[i].name === name) {
                  attributes[i].value = value;
                  return;
                }
              }
              attributes.push({
                nodeType: _DOM_ATTRIBUTE_NODE,
                name: name,
                value: value
              });
            }
          };
          el.appendChild = function(c) {
            if (c._impl != "osxh") {
              throw new OSXHError("Invalid DOM construction");
            }
            if (children.length === 0) {
              el.firstChild = c;
            } else {
              children[children.length - 1].nextSibling = c;
            }
            children.push(c);
          };
          return el;
      },
      createTextNode: function(data) {
        return {
          _impl: "osxh",
          nodeType: _DOM_TEXT_NODE,
          data: data,
          childNodes: []
        };
      }
    };
    
    res.documentElement = res.createElement(rootTagName);
    res.firstChild = res.documentElement;
    return res;
  }

  return {
  /**
  * @param str The OSXH string to render
  * @param doc The document to render it in. (optional. glbls.document by default)
  * @returns An array of rendered DOM nodes.
  */
  render: function(str, doc) {
    if (typeof doc === "undefined") {
      doc = glbls.document;
    }
    if (!doc) {
      throw new OSXHError("Cannot render; no output document. Check the doc parameter.");
    }
    return _render(str, doc);
  },

  /**
  * Renders the OSXH string str into the DOM element container.
  */
  renderInto: function(str, container) {
    var nodes = _render(str, container.ownerDocument);
    nodes.forEach(function(n) {
      container.appendChild(n);
    });
  },
  config: cfg,
  /**
  * Virtual XML DOM implementation. Required for rendering, since some DOM implementations (notably jsdom) mess with capitalizatoin.
  */
  _vdoc: _vdoc,
  /**
  * Serialize a node list to an OSXH string.
  * @param nodes A NodeList object or an array of Node
  */
  serialize: function(nodes) {
    var doc = _vdoc(null, "osxh");
    var resNodes = _renderNodes(nodes, doc, function(tn) {return tn.toLowerCase();});
    resNodes.forEach(function(n) {
      doc.documentElement.appendChild(n);
    });

    var xml = _serializeXML(doc);
    return xml;
  }
  };
});

// Simplify usage in node.js
if (typeof module !== "undefined") {
  module.exports = osxh;
}

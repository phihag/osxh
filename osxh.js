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
      "attributes": {
        "href":   {"tagName": "^a$",     "value": "^(?:https?:\/\/|mailto:)"},
        "src":    {"tagName": "^img$",   "value": "^data:image\/(?:gif|jpeg|png);"},
        "colspan":{"tagName": "^td|th$", "value": "^[0-9]+$"},
        "rowspan":{"tagName": "^td|th$", "value": "^[0-9]+$"},
        "alt":    {"tagName": "^img$",   "value": "^"},
        "title":  {"tagName": "^.*$",    "value": "^"},
        "class": function(tagName, value, config) {
          return value.split(/\s+/).filter(function(c) {
            return /^osxh_[a-zA-Z0-9-_]+$/.test(c);
          }).join(' ');
        },
        "style": function(tagName, value, config) {
          if (!config.allowCSS) {
            return false;
          }

          var res = "";
          value.split(";").forEach(function (p) {
            var m = p.match(/^\s*([a-z\-]+)\s*:\s*(.*?)\s*$/);
            if (!m) {
              return;
            }
            switch (m[1]) {
            case "position":
              if (/^(?:auto|absolute|relative|static)$/.test(m[2])) {
                res += m[1] + ": " + m[2] + "; ";
              }
              break;
            case "width":
            case "height":
            case "top":
            case "left":
            case "right":
            case "bottom":
              if (/^(?:auto|0|-?[0-9]+(?:\.[0-9]*)?(?:%|em|ex|ch|cm|mm|in|px|pt|pc))$/.test(m[2])) {
                res += m[1] + ": " + m[2] + "; ";
              }
              break;
            }
          });
         
          return res.substr(0, res.length-1);
        }
    },
  };

  // Merge configuration
  if (addCfg) {
    if (addCfg.elements) {
      cfg.elements.push.apply(cfg.elements, addCfg.elements);
    }
    if (addCfg.attributes) {
      var newVals = addCfg.attributes;
      for (var k in newVals) {
        if (newVals.hasOwnProperty(k)) {
          cfg.attributes[k] = newVals[k];
        }
      }
    }
    if (typeof addCfg.allowCSS !== "undefined") {
      cfg.allowCSS = addCfg.allowCSS;
    }
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

        var testSpec = cfg.attributes[at.name];
        if (typeof testSpec === "object") {
          if ((new RegExp(testSpec["tagName"])).test(tagName) && (new RegExp(testSpec["value"])).test(at.value)) {
            outEl.setAttribute(at.name, at.value);
          }
        } else if (typeof testSpec === "function") {
          var r = testSpec(tagName, at.value, cfg);
          if (typeof r === "string") {
            outEl.setAttribute(at.name, r);
          } else if (r === true) {
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
  * Serialize a node list to an OSXH string.
  * @param nodes A NodeList object or an array of Node
  */
  serialize: function(nodes, doc) {
    var doc = _parseXML("<osxh></osxh>");
    var resNodes = _renderNodes(nodes, doc, function(tn) {return tn.toLowerCase();});
    resNodes.forEach(function(n) {
      doc.documentElement.appendChild(n);
    });
    return _serializeXML(doc);
  }
  };
});

// Simplify usage in node.js
if (typeof module !== "undefined") {
  module.exports = osxh;
}

"use strict";


/**
* @param cfg The OSXH configuration. Entries overwrite the default configuration (see below). optional.
* @param glbls The global window object to use. (optional, required in non-browser environments).
*/
var osxh = (function(cfg, glbls) {
	var _DOM_ELEMENT_NODE = 1;
	var _DOM_TEXT_NODE = 3;

	if (typeof cfg == "undefined") {
		cfg = {};
	}
	
	// The following block accesses an unbound variable.
	// This is fine (and even desired) in a browser context
	if (typeof glbls == "undefined") {
		if (typeof window != "undefined") {
			glbls = window;
		}
	}
	if (typeof glbls == "undefined") {
		// load XML tools from dependency management
		var xmlshim = require('xmlshim');
		glbls = {
			XMLSerializer: xmlshim.XMLSerializer,
			DOMParser: xmlshim.DOMParser,
			document: null
		};
	}

	var DEFAULT_CONFIG = {
		"elements": ["a", "b", "br", "code", "div", "em", "img", "li", "ol", "p", "span", "strong", "u", "ul"],
		"attributes": [],
		"specialAttributes": {
			"href": function(tagName, val) {
				return tagName == "a" && /^https?:\/\//.test(val);
			},
			"src": function(tagName, val) {
				return tagName == "img" && /^data:image\/(png|jpeg);/.test(val);
			}
		}
	};
	// Merge configuration
	for (var p in DEFAULT_CONFIG) {
		if (typeof cfg[p] == "undefined") {
			cfg[p] = DEFAULT_CONFIG[p];
		}
	}

	var _serializeXML = function(xmlDoc) {
		return (new glbls.XMLSerializer()).serializeToString(xmlDoc);
	};
	var _parseXML = function(str) {
		return (new glbls.DOMParser()).parseFromString(str, "text/xml");
	};
	var _render = function(str, doc) {
		var _renderElement = function(tagName, attrs) {
			var outEl = doc.createElement(tagName);
			for (var i = 0;i < attrs.length;i++) {
				var at = attrs[i];

				var testFunc = cfg.specialAttributes[at.name];
				if (typeof testFunc != "undefined") {
					if (testFunc(n.tagName, at.value)) {
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

		var render_walkTree = function(xmlNodeList, outContainer) {
			for (var i = 0;i < xmlNodeList.length;i++) {
				var n = xmlNodeList[i];

				if (n.nodeType == _DOM_TEXT_NODE) {
					var tn = doc.createTextNode(n.data);
					outContainer.appendChild(tn);
					continue;
				}

				if (n.nodeType == _DOM_ELEMENT_NODE) {
					if (cfg.elements.indexOf(n.tagName) >= 0) {
						var outEl = _renderElement(n.tagName, n.attributes);
						render_walkTree(n.childNodes, outEl);
					} else {
						// Unsupported element, render its contents
						render_walkTree(n.childNodes, outContainer);
					}
				}
			}
		};

		var xmlDoc = _parseXML(str);
		var rootNode = xmlDoc.documentElement;
		if (rootNode.tagName != "osxh") {
			throw {
				"name": "OSXHException",
				"message": "Not an osxh element (incorrect root element name)"
			};
		}
		var outRoot = doc.createElement("osxh");
		render_walkTree(rootNode.childNodes, outRoot);
		return outRoot.childNodes;
	};

	return {
	/**
	* @param str The OSXH string to render
	* @param doc The document to render it in. (optional. glbls.document by default)
	* @returns An NodeList of rendered DOM nodes.
	*/
	render: function(str, doc) {
		if (typeof doc == "undefined") {
			doc = glbls.document;
		}
		if (!doc) {
			throw {
				"name": "OSXHException",
				"message": "Cannot render; no output document. Check the doc parameter."
			}
		}
		return _render(str, doc);
	},

	/**
	* Renders the OSXH string str into the DOM element container.
	*/
	renderInto: function(str, container) {
		var nodes = _render(str, container.ownerDocument);
		for (var i = 0;i < nodes.length;i++) {
			container.appendChild(nodes[i]);
		}
	},

	};
});

// Simplify usage in node.js
if (typeof module != "") {
	module.exports = osxh;
}

{
  "attributes": {
    "forbidden": function() {return false;},
    "forbidden2": function() {},
    "allowed": function(tagName) {return tagName == "a";},
    "allowed2": {"tagName": ".*", value:".*"},
    "passthru": function(tagName, val) {return val;},
    "changed": function(tagName, val) {return val.split("").reverse().join("");}
  }
}
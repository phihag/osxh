For OSXH 2.0 , we may allow certain CSS properties, by altering the spec as follows:

* The `style` attribute may contain a selected subset of CSS. Values are explicitely whitelisted. Aside from avoiding web bugs and 
  * [`color`](http://www.w3.org/TR/css3-color/#colorunits)
  * [`font-weight`](http://www.w3.org/TR/css3-fonts/#propdef-font-weight)
  * [`font-style`](http://www.w3.org/TR/css3-fonts/#propdef-font-style)
  * [`white-space`](http://www.w3.org/TR/CSS21/text.html#white-space-prop)

The main problem is keeping the balance between:

* How the input can restyle the document (for example, background colors/blink may be a bad idea)
* 
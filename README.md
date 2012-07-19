Obviously Safe XHTML
====================

OSXH is an XHTML dialect that's obviously safe to include in a website. It is intended to represent a user-formatted document, similar to [markdown](http://daringfireball.net/projects/markdown/). However, unlike markdown, OSXH is easy to extend with custom attributes (for example `data-example`).

In contrast to [Caja](https://github.com/theSmaw/Caja-HTML-Sanitizer) or [IE's toStaticHTML](http://msdn.microsoft.com/en-us/library/ie/cc848922.aspx), OSXH comes with an explicit specification of which code is valid. This means that the result is *reproducible*. Additionally, the result can always be rendered without downloading anything (this prevents [web bugs](http://en.wikipedia.org/wiki/Web_bug)).

The [numerous ways to defeat blacklists](http://ha.ckers.org/xss.html) are defeated by a white-list approach. OSXH and its implementations shouldn't only be safe, it should be obvious that they are.

Specification
=============

OSXH is an application of [XML](http://www.w3.org/TR/REC-xml/), with the following restrictions:

* The root element must have the tag name `osxh`.
* By default, all other elements must be one of `a`, `b`, `br`, `code`, `div`, `em`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `i`, `img`, `li`, `ol`, `p`, `span`, `strong`, `table`, `tbody`, `td`, `tfoot`, `th`, `thead`, `tr`, `u`, `ul`.
* Attributes must be one of:
	* `href`(only on `a`) may contain URLs starting with `http://`, `https://`, or `mailto:`.
	* `src` (only on `img`) must start with either `data:image/png;` or `data:image/jpeg;`.
	* `alt` is allowed on `img`.
	* `colspan` and `rowspan` are allowed on table cells, with integer values only.
	* `title` is allowed everywhere.
* XML nodes that are not elements, attributes or text nodes are ignored.

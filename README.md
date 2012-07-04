Obviously Safe XHTML
====================

OSXH is an XHTML dialect that''s obviously safe to include in a website. It is intended to represent a user-formatted document, similar to [markdown](http://daringfireball.net/projects/markdown/). However, unlike markdown, OSXH is easy to extend with custom attributes (for example `data-example`).

In contrast to [Caja](https://github.com/theSmaw/Caja-HTML-Sanitizer) or [IE''s toStaticHTML](http://msdn.microsoft.com/en-us/library/ie/cc848922.aspx), OSXH specifies which code is valid. This means that the result is *reproducible*. The [numerous ways to defeat blacklists](http://ha.ckers.org/xss.html) are defeated by a white-list approach. Additionally, the result can always be rendered without downloading anything (this prevents [web bugs](http://en.wikipedia.org/wiki/Web_bug)). OSXH and its implementations shouldn''t only be safe, it should be obvious that they are.

Document Format
===============

OSXH is an application of [XML](http://www.w3.org/TR/REC-xml/), with the following restrictions:

* The root element must have the tag `osxh`.
* By default, all other elements must be one of `a`, `b`, `br`, `code`, `div`, `em`, `li`, `ol`, `p`, `span`, `strong`, `u`, `ul`.
* The `href` attribute (only on `a`) may contain URLs starting with `http://` or `https://`.
* The `src` attribute (only on `img`) must start with either `data:image/png;` or `data:image/jpeg;`.
* All other attributes are ignored by default.


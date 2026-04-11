## jargon.xml

This is a copy of the docbook file (2003-12-29) from ESR's
`jargsrc.tar`. The only thing that was modified in it is 2 markup
errors for `<informaltable>` (a table should not be inside a ¶).

`jargon.catalog.xml` file is required for parsing XML entities like
`&ecirc;`. It depends on `docbook-dtds` Fedora package. (`docbook-xml`
in Debian, but you'll need to edit `uri=` attribute.)

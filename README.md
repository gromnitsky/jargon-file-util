## How it works

1. Nokogiri converts DocBook into HTML.
2. `w3m` converts the HTML to text.
3. `jargon` util prints dictionary entries, searches through them, and
   assists Bash with completions.

No XSLT or Java is used for anything.

~~~
$ scc jargon | grep '^[LR]'
Language  Files  Lines  Blanks  Comments  Code  Complexity
Ruby      1      178    31      2         145   10
~~~

## Reqs

    # dnf install rubygem-nokogiri w3m docbook-dtds

## jargon.xml

This is an original, unmodified (v4.4.7, 2003-12-29) file in the
ancient DocBook 4.1.2 format from ESR's `jargsrc.tar`.

`jargon.catalog.xml` is required for parsing XML entities like
`&ecirc;`. It depends on files from `docbook-dtds` Fedora
package. (`docbook-xml` in Debian, but you'll need to edit `uri=`
attribute.)

## License

`jargon.xml` is public domain. The rest is MIT.

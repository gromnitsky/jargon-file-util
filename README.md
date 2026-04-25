23 sec CLI demo:

[![clip](https://img.youtube.com/vi/o8tMoiRHgog/maxresdefault.jpg)](https://www.youtube.com/watch?v=o8tMoiRHgog)

## CLI Usage

~~~
$ jargon
Usage: jargon pattern [fimh]

  f       search inside defs too
  i       print terms only
  mNUM    stop after NUM matches
  h       html output
~~~

List entries that contain pattern *sloppy* (matches are always
case-insensitive):

~~~
$ jargon sloppy fi
blue wire
fat electrons
memory leak
to a zeroth approximation
vaxocentrism
~~~

Print all entries for *optical*:

~~~
$ jargon optical
:optical diff: n.

See {vdiff}.

:optical grep: n.

See {vgrep}.
~~~

Make a text version of the whole dictionary, akin to `jarg447.txt`:

    $ jargon . > lol.txt

Provide your own dictionary in the same format as `jargon.xml`:

    $ JARGON=file.xml jargon ...

`MANWIDTH` env var controls the max line length.

## CLI Install

Fedora 43:

    # dnf install rubygem-nokogiri rubygem-io-console w3m docbook-dtds

Debian 13:

    # apt-get install ruby-nokogiri w3m docbook-xml

1. Clone the repo.
2. Symlink `jargon.rb` as `jargon` in your PATH.
3. Add to `.bashrc`:

        . /path/to/repo/jargon-completion.bash

See a note about `jargon.xml` if on a non-standard distro or macOS.

## How CLI works

1. Nokogiri converts DocBook into HTML.
2. `w3m` converts HTML to text.
3. `jargon.rb` prints entries, searches them, & supplies Bash
   completions.

No XSLT or Java is used for anything.

## Web

Do "CLI Install" section first, then type

    $ cd tools
    $ npm i
    $ cd ..
    $ make

This should generate all that is necessary for the web version.

The web interface requires only a static HTTP server. FTS works via
loading its `index.json` (~2.6MB uncompressed) on demand.

To add another dictionary in the same XML format as the Jargon File,
edit `web/dicts.json`.

## `jargon.xml`

Original unmodified file (v4.4.7, 2003-12-29, DocBook 4.1.2 format),
from ESR's `jargsrc.tar`.

One of `jargon.catalog.*.xml` is required to resolve entities like
`&ecirc;`.  They depend on legacy DocBook XML DTDs. If your distro is
not Fedora/Debian/Ubuntu, copy `jargon.catalog.fedora.xml` to
`jargon.catalog.unknown.xml`, edit the `uri=` attribute, & run

~~~
$ jargon autobogotiphobia | head -1
:autobogotiphobia: /aw´toh·boh·got`@·foh´bee·@/
~~~

to test.

## Alternatives

* [rdubar/jargon](https://github.com/rdubar/jargon) - Jargon File CLI
  Utility.
* [esr/vh](https://gitlab.com/esr/vh) - Pre-Web hypertext browser for the Jargon File.

## License

`jargon.xml` is public domain. The rest is MIT.

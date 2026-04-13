## Usage

~~~
$ jargon
Usage: jargon pattern [fimh]

  f       search inside defs too
  i       print terms only
  mNUM    stop after NUM matches
  h       html output
~~~

List entries that contain pattern *sloppy* (match is always
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

Provide your own dictionary in the same format as `jargon.xml`:

    $ JARGON=file.xml jargon ...

## Install

    # dnf install rubygem-nokogiri w3m docbook-dtds

1. Clone the repo.
2. Symlink `jargon.rb` as `jargon` in your PATH.
3. Add to `.bashrc`:

        . /path/to/repo/jargon-completion.bash

See a note about `jargon.xml` if on Debian.

## How it works

1. Nokogiri converts DocBook into HTML.
2. `w3m` converts HTML to text.
3. `jargon.rb` prints entries, searches them, and supplies Bash
   completions.

No XSLT or Java is used for anything.

## jargon.xml

Original unmodified file (v4.4.7, 2003-12-29, DocBook 4.1.2 format),
from ESR's `jargsrc.tar`.

`jargon.catalog.xml` is required to resolve entities like `&ecirc;`.
It depends on `docbook-dtds` (Fedora). On Debian (`docbook-xml`), edit
the `uri=` attribute, and run

~~~
$ jargon support | grep -o têete-à-têete
têete-à-têete
~~~

to test.

## License

`jargon.xml` is public domain. The rest is MIT.

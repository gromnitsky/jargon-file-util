SHELL := bash -o pipefail

out := web/dicts
dicts := $(wildcard $(out)/*)
all := $(foreach D, $(dicts), $(D)/index.txt $(D)/index.json $(D)/glossentries/.target) web/node_modules/lunr/lunr.min.js

all: $(all)

clean:
	rm -f $(out)/*/index.{txt,json} $(out)/*/dict.xml.sorted
	rm -rf $(out)/*/glossentries web/node_modules

$(out)/%/dict.xml.sorted: $(out)/%/dict.xml
	$(mkdir)
	tools/sort.rb < $< > $@

jargon = JARGON=$(out)/$*/dict.xml.sorted ./jargon.rb

$(out)/%/glossentries/.target: $(out)/%/dict.xml.sorted
	$(mkdir)
	$(jargon) . h | nokogiri -E UTF-8 -e "$$extract_ge_as_html"
	@touch $@

export define extract_ge_as_html =
$$_.css('body > div.glossentry').each do |ge|
  File.open("$(dir $@)/#{ge["id"]}.html", 'w+') {|f| f.write(ge.to_s) }
end
endef

$(out)/%/index.txt: $(out)/%/dict.xml.sorted
	$(mkdir)
	$(jargon) . i > $@

$(out)/%/index.json: $(out)/%/dict.xml.sorted
	$(mkdir)
	$(jargon) . h | nokogiri -E UTF-8 -e "$$extract_ge_as_json" | tools/mkindex.js > $@

export define extract_ge_as_json =
require 'json'
$$_.css('body > div.glossentry').each_with_index do |ge, idx|
  entry = {
    term: ge.at_css(".glossterm__term").text,
    def: ge.css('.glossdef').map {|v| v.text}.join("\n"),
    idx: idx
  }
  puts entry.to_json
end
endef

web/node_modules/%: tools/node_modules/%
	$(mkdir)
	cp $< $@

upload: $(all)
	rsync -Pal web/ alex@sigwait.org:/home/alex/public_html/demo/jargon-file-util/

mkdir = @mkdir -p $(dir $@)
.DELETE_ON_ERROR:

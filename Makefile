SHELL := bash -o pipefail

out := web/dicts
dicts := $(wildcard $(out)/*)
all := $(foreach D, $(dicts), $(D)/index.txt $(D)/index.json $(D)/glossentries/.target) web/node_modules/lunr/lunr.min.js

all: $(all)

clean:
	rm -f $(out)/*/index.{txt,json}
	rm -rf $(out)/*/glossentries web/node_modules

jargon = JARGON=$(out)/$*/dict.xml ./jargon.rb

$(out)/%/glossentries/.target: $(out)/%/dict.xml
	$(mkdir)
	$(jargon) . h | nokogiri -E UTF-8 -e "$$extract_ge_as_html"
	@touch $@

export define extract_ge_as_html =
$$_.css('body > div.glossentry').each do |ge|
  File.open("$(dir $@)/#{ge["id"]}.html", 'w+') {|f| f.write(ge.to_s) }
end
endef

$(out)/%/index.txt: $(out)/%/dict.xml
	$(mkdir)
	$(jargon) . i > $@

$(out)/%/index.json: $(out)/%/dict.xml
	$(mkdir)
	$(jargon) . h | nokogiri -E UTF-8 -e "$$extract_ge_as_json" | fts/mkindex.js > $@

export define extract_ge_as_json =
require 'json'
$$_.css('body > div.glossentry').each_with_index do |ge, idx|
  entry = {
    term: ge.at_css(".glossterm__term").text,
    def: ge.at_css('.glossdef').text,
    idx: idx
  }
  puts entry.to_json
end
endef

web/node_modules/%: fts/node_modules/%
	$(mkdir)
	cp $< $@

mkdir = @mkdir -p $(dir $@)
.DELETE_ON_ERROR:

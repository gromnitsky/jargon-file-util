out := web/dicts/jargon-file
SHELL := bash -o pipefail

all: $(addprefix $(out)/, glossentries/ge_zorkmid_2306.html index.txt index.json) web/node_modules/lunr/lunr.min.js

clean:
	rm $(out)/index.{txt,json}
	rm -rf $(out)/glossentries web/node_modules

$(out)/glossentries/ge_zorkmid_2306.html:
	$(mkdir)
	./jargon.rb . h | nokogiri -e "$$extract_ge_as_html"

export define extract_ge_as_html =
$$_.css('body > div.glossentry').each do |ge|
  File.open("$(dir $@)/#{ge["id"]}.html", 'w+') {|f| f.write(ge.to_s) }
end
endef

$(out)/index.txt:
	$(mkdir)
	./jargon.rb . i > $@

$(out)/index.json:
	$(mkdir)
	./jargon.rb . h | nokogiri -e "$$extract_ge_as_json" | fts/mkindex.js > $@

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

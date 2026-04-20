all: web/index.txt web/glossentries/ge_zorkmid_2306.html

web/glossentries/ge_zorkmid_2306.html:
	$(mkdir)
	./jargon.rb . h | nokogiri -e "$$extract_ge"

export define extract_ge =
$$_.css('body > div.glossentry').each do |ge|
  File.open("$(dir $@)/#{ge["id"]}.html", 'w+') {|f| f.write(ge.to_s) }
end
endef

web/index.txt:
	$(mkdir)
	./jargon.rb . i > $@

mkdir = @mkdir -p $(dir $@)

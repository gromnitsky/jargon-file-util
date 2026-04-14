#!/usr/bin/env ruby

require 'io/console'
require 'nokogiri'

def term_match pattern, glossentry
  glossentry.at_css('glossterm').text.downcase =~ pattern
end

def full_text_match pattern, glossentry
  [glossentry.at_css('glossterm').text,
   glossentry.at_css('glossdef').text].join("\n").downcase =~ pattern
end

def term_fmt glossentry, _dummy1, _dummy2
  glossentry.at_css('glossterm').text
end

class Glossentry
  def initialize node, idx, opt
    @opt = opt
    @term = term_parse node
    raise "invalid glossentry: no <glossterm>" unless @term[:term]

    @id = 'ge_' + @term[:term].strip.gsub(/[^A-Za-z0-9_-]+/, '_') + "_#{idx}"

    @defs = node.css('glossdef').map do |d|
      glossentry_to_html d      # in-place
      d.name = 'div'
      d.add_class 'glossdef'
    end
  end

  def fmt
    [
      ':' + @term[:term] + ': ' + [@term[:pronunciation], @term[:grammar]]
                                    .filter {|v| v}.join(', '),
      @defs.map do |d|
        html = d.to_html(encoding: 'utf-8')
        html_to_text(html, @opt[:word_wrap]).rstrip
      end,
    ].flatten.join("\n\n")
  end

  def term_parse node
    p = node.css('abbrev [role="pronunciation"]')&.map {|v| v.text}&.join(', ')
    {
      term: node.at_css('glossterm')&.text,
      pronunciation: p.size > 0 ? p : nil,
      grammar: node.at_css('abbrev [role="grammar"]')&.text,
    }
  end
end

class GlossentryHTML < Glossentry
  def fmt
    glossterm = lambda do
      builder = Nokogiri::HTML5::Builder.new do |h|
        h.div(class: 'glossterm') {
          h.span(@term[:term], class: 'glossterm__term')
          h.span(@term[:pronunciation], class: 'glossterm__pronunciation') if @term[:pronunciation]
          h.span(@term[:grammar], class: 'glossterm__grammar') if @term[:grammar]
        }
      end
      builder.doc.root.to_html
    end

    [
      "<div class='glossentry' id='#{@id}'>",
      glossterm.call,
      @defs.map { |d| d.to_html(encoding: 'utf-8') },
      "</div>"
    ].flatten.join("\n")
  end
end

def entry_fmt glossentry, idx, opt
  klass = opt[:mode_html] ? GlossentryHTML : Glossentry
  ge = klass.new glossentry, idx, opt
  ge.fmt + "\n\n"
end



def glossterm_to_text node
  node.content = "{#{node.text}}"
  node.name = 'span'
  node.add_class 'glossterm_link'
end

def ulink_to_a node
  node.name = 'a'
  node['href'] = node['url']
  node.remove_attribute('url')
end

def mediaobject_to_img node
  imagedata = node.at_css('imagedata')
  desc = node.at_css('caption')&.text&.strip

  if imagedata
    div = Nokogiri::XML::Node.new("div", Nokogiri::XML::Document.new)
    if desc
      div.content = "(#{desc})"
      div.prepend_child "<br/>"
    end

    img = Nokogiri::XML::Node.new("img", div)
    img['src'] = node.at_css('imagedata')['fileref']
    div.prepend_child img

    node.swap(div)
  end
end

def citerefentry_to_text node
  title = node.at_css('refentrytitle')&.text
  section = node.at_css('manvolnum')&.text
  if title
    node.content = "#{title}(#{section})"
    node.name = 'span'
    node.add_class 'citerefentry'
  end
end

def xref_to_text node           # jarg-specifig
  node.content = "[#{node['linkend']}]"
  node.name = 'span'
end

def quote_to_text node
  node.content = "\"#{node.text}\""
  node.name = 'cite'
end

def glossentry_to_html glossentry
  {
    'informaltable'  => 'table',
    'tgroup'         => nil,    # unwrap (remove but keep children)
    'row'            => 'tr',
    'entry'          => 'td',

    'para'           => 'p',
    'programlisting' => 'pre',
    'screen'         => 'pre',
    'literallayout'  => 'pre',
    'emphasis'       => 'em',
    'ulink'          => :ulink_to_a,
    'glossterm'      => :glossterm_to_text,
    'mediaobject'    => :mediaobject_to_img,
    'citerefentry'   => :citerefentry_to_text,
    'xref'           => :xref_to_text,
    'quote'          => :quote_to_text,

    'itemizedlist'   => 'ul',
    'orderedlist'    => 'ol',
    'listitem'       => 'li',
  }.each do |from, to|
    glossentry.css(from).each do |node|
      if to
        if to.is_a?(Symbol)
          method(to).call(node) # transform in-place
        else
          node.name = to
        end
      else
        node.replace(node.children) # unwrap
      end
    end
  end
end

def html_to_text html, word_wrap
  IO.popen([
             'w3m', '-T', 'text/html', '-dump', '-I', 'UTF-8',
             '-O', 'UTF-8', '-cols', word_wrap.to_s,
             '-o', 'display_link_number=1', '-o', 'display_borders=1',
           ], 'w+') do |pipe|
    pipe.write html
    pipe.close_write
    pipe.read
  end
end



def sigint_handler; proc {|s| exit 128+s }; end

def os_id
  begin
    r = File.read('/etc/os-release').scan(/^id=(.+)/i) && $1
    return 'debian' if r == 'ubuntu'
    r || raise
  rescue
    'unknown'
  end
end

def main
  Encoding.default_external = 'utf-8'

  abort "Usage: jargon pattern [fimh]\n
  f       search inside defs too
  i       print terms only
  mNUM    stop after NUM matches
  h       html output" if ARGV.length < 1

  pattern = Regexp.new(ARGV[0], 'i', timeout: 1) rescue abort("invalid pattern: #{$!}")
  db = ENV['JARGON'] || (__dir__ + '/jargon.xml')

  opt = {
    mode_indices: ARGV[1] =~ /i/,
    mode_full_text: ARGV[1] =~ /f/,
    mode_html: ARGV[1] =~ /h/,
    limit: (ARGV[1] =~ /m([0-9]+)/ && $1.to_i) || Float::INFINITY,
    word_wrap: ENV['MANWIDTH'].to_i
  }
  opt[:word_wrap] = 76 if opt[:word_wrap] <= 0
  cols = IO.console.winsize[1]
  opt[:word_wrap] = cols if cols < opt[:word_wrap]

  Signal.trap 'SIGINT', sigint_handler
  Signal.trap 'SIGPIPE', sigint_handler

  ENV['XML_CATALOG_FILES'] = __dir__ + "/jargon.catalog.#{os_id}.xml"
  ENV['XML_DEBUG_CATALOG'] = '1' if $VERBOSE

  doc = Nokogiri::XML(File.read db) {|o| o.dtdload.noent }
  doc.errors.each { |error| puts "libxml2 error: #{error.message}" } if $VERBOSE
  abort "#{db}: no <glossentry>" unless doc.at_css('glossentry')

  grep = opt[:mode_full_text] ? :full_text_match : :term_match
  fmt = opt[:mode_indices] ? :term_fmt : :entry_fmt

  status = 1
  doc.css('glossentry').each_with_index do |glossentry, idx|
    if send(grep, pattern, glossentry)
      opt[:limit] -= 1
      puts send(fmt, glossentry, idx, opt)
      status = 0
      break if opt[:limit] == 0
    end
  end

  exit status
end

main unless defined?(Minitest) || defined?(Test)

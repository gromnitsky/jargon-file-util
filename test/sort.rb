#!/usr/bin/env ruby

# Usage: sort.rb < jargon.xml

require 'nokogiri'
require_relative '../jargon.rb'

doc = parse_xml $stdin.read
parent = doc.at_css 'glossary'

ge = parent.css('glossentry').remove
ge_sorted = ge.sort_by { |node| node.at_css('glossterm').text.downcase }

ge_sorted.each { |node| parent.add_child(node) }
puts doc.to_xml

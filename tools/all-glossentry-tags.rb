#!/usr/bin/env ruby

require 'nokogiri'

doc = Nokogiri::XML File.read ARGV[0]

def print_nodes node
  node.traverse do |node|
    puts node.name if node.instance_of?(Nokogiri::XML::Element)
  end
end

doc.css('glossentry').each do |glossentry|
  print_nodes glossentry
end

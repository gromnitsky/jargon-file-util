#!/usr/bin/env node

import * as readline from 'readline/promises';
import lunr from 'lunr'

let lb = new lunr.Builder()

lb.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer)
lb.searchPipeline.add(lunr.stemmer)

lb.ref('idx')
lb.field('term')
lb.field('def')
//lb.metadataWhitelist = ['position']

let rl = readline.createInterface({ input: process.stdin })

for await (let line of rl) {
    if (0 === line.trim().length) continue
    let entry = JSON.parse(line)
    lb.add(entry)
}

let index = lb.build()
console.log(JSON.stringify(index))

#!/usr/bin/env node

// Usage: mkindex.js [en] [uk] < file.jsonl

import * as readline from 'readline/promises';
import lunr from 'lunr'

import * as languages from '../web/lunr-languages.js'

async function main() {
    let lb = new lunr.Builder()

    let args = process.argv.slice(2).filter( v => v !== 'en')
    args.forEach( v => languages.setup(lunr, v))

    if (args.length) {
        lb.use(lunr.multiLanguage('en', ...args))
    } else {
        lb.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer)
        lb.searchPipeline.add(lunr.stemmer)
    }

    lb.ref('idx')
    lb.field('term')
    lb.field('def')

    let rl = readline.createInterface({ input: process.stdin })

    for await (let line of rl) {
        if (0 === line.trim().length) continue
        let entry = JSON.parse(line)
        lb.add(entry)
    }

    let index = lb.build()
    console.log(JSON.stringify(index))
    return 0
}

if (import.meta.main) process.exit(await main())

// ---[ mocha tests ]-------------------
import assert from 'assert/strict'
import {spawnSync} from 'child_process'
import {fileURLToPath} from 'url'

let __FILE__ = fileURLToPath(import.meta.url)

suite('index', function() {
    setup(function() {
        this.sample1 = `
{"term":"буткемп","def": "то є гамериканські курмси", "idx": 0}
{"term":"foobar", "def": "this is a short entry", "idx": 1}
`
    })

    test('en', function() {
        let r = spawnSync(__FILE__, {
            input: this.sample1
        })
        assert.equal(r.status, 0)
        let json = JSON.parse(r.stdout)
//        console.log(r.stdout.toString())
        assert.deepEqual(json, {"version":"2.3.9","fields":["term","def"],"fieldVectors":[["term/0",[0,0.182]],["def/0",[0,0.292]],["term/1",[1,0.693]],["def/1",[2,0.803,3,0.803]]],"invertedIndex":[["",{"_index":0,"term":{"0":{}},"def":{"0":{}}}],["entri",{"_index":3,"term":{},"def":{"1":{}}}],["foobar",{"_index":1,"term":{"1":{}},"def":{}}],["short",{"_index":2,"term":{},"def":{"1":{}}}]],"pipeline":["stemmer"]})
    })

    test('en,ua', function() {
        let r = spawnSync(__FILE__, ['en', 'uk'], {
            input: this.sample1
        })
        assert.equal(r.status, 0)
        let json = JSON.parse(r.stdout)
        assert.deepEqual(json, {"version":"2.3.9","fields":["term","def"],"fieldVectors":[["term/0",[0,0.693]],["def/0",[1,0.693,2,0.693]],["term/1",[3,0.693]],["def/1",[4,0.693,5,0.693]]],"invertedIndex":[["entri",{"_index":5,"term":{},"def":{"1":{}}}],["foobar",{"_index":3,"term":{"1":{}},"def":{}}],["short",{"_index":4,"term":{},"def":{"1":{}}}],["буткемп",{"_index":0,"term":{"0":{}},"def":{}}],["гамериканськ",{"_index":1,"term":{},"def":{"0":{}}}],["курм",{"_index":2,"term":{},"def":{"0":{}}}]],"pipeline":["stemmer","stemmer-uk"]})
    })
})

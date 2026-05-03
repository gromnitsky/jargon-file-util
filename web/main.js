/* global lunr */

import * as languages from './lunr-languages.js'

function efetch(url, opt) {
    let check_for_2xx = r => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`)
        return r
    }
    return fetch(url, opt).then(check_for_2xx)
}

function fetch_text(u, o) { return efetch(u, o).then(r => r.text()) }
function fetch_json(u, o) { return efetch(u, o).then(r => r.json()) }

function debounce(fn, ms = 20) {
    let timeout_id
    return function(...args) {
        clearTimeout(timeout_id)
        timeout_id = setTimeout(() => fn.apply(this, args), ms)
    }
}

class Glossentry {
    constructor(dict, idx, parent_node) {
        this.state = { idx }
        this.dict = dict
        this.parent_node = parent_node
        this.fetch_abort_ctrl = null
    }

    set idx(value) {
        if (this.state.idx !== value) {
            this.state.idx = value
            this.render()
        }
    }

    name() {
        let term = this.dict.index[this.state.idx]
        if (!term) throw new Error(`invalid idx: ${this.state.idx}`)
        return 'ge_' + term.trim().replaceAll(/[^\p{L}\p{N}-]/gu, '_') +
            `_${this.state.idx}`
    }

    render() {
        this.fetch_abort_ctrl?.abort()

        let error = e => {
            let div = document.createElement('div')
            div.classList.add('error')
            div.innerText = e
            return div
        }

        let url; try {
            url = `${this.dict.path}/glossentries/${this.name()}.html`
        } catch (e) {
            return this.parent_node.replaceChildren(error(e))
        }

        let spinner = document.createElement('div')
        spinner.classList.add('spinner')
        spinner.innerText = `Loading ${this.name()}...`
        this.parent_node.replaceChildren(spinner)

        this.fetch_abort_ctrl = new AbortController()
        fetch_text(url, {signal: this.fetch_abort_ctrl.signal}).then( html => {
            let doc = Document.parseHTMLUnsafe(html)
            // correct external resources
            doc.querySelectorAll('img').forEach( img => {
                if (/^https?:/.test(img.src)) return
                img.loading = 'lazy'
                img.src = this.dict.path + '/' + img.src
            })
            doc.querySelectorAll('a').forEach( a => {
                if (/^https?:/.test(a.href)) return
                let url = new URL(a.href, 'http://example.com')
                url.searchParams.set('dict', this.dict.name)
                a.href = '?'+url.searchParams.toString()
            })
            let ge = doc.querySelector(".glossentry")
            ge.dataset.idx = this.state.idx
            spinner.replaceWith(ge)

        }).catch( e => {
            spinner.replaceWith(error(e))

        }).finally( () => {
            delete this.fetch_abort_ctrl
        })
    }
}

class Glossentries {
    constructor(dict, parent_node) {
        this.dict = dict
        this.state = { list: [], render_from: 0 }
        this.parent_node = parent_node
        this.glossentries_max = dict.options?.glossentries_max || 4

        let slots = Array.from({ length: this.glossentries_max }).map( () => {
            return document.createElement('div')
        })
        this.defs = slots.map( slot => new Glossentry(dict, -1, slot))
        this.parent_node.replaceChildren(...slots)

        this.render_later = debounce(this.render)
    }

    set list(value) {
        let a = JSON.stringify(this.state.list)
        let b = JSON.stringify(value)
        if (a !== b) {
            this.state.list = value
            this.state.render_from = 0
            this.render_later()
        }
    }

    set render_from(value) {
        value = Number(value)
        if (value >= this.state.list.length) value = this.state.list.length-1
        if (value < 0) value = 0
        if (this.state.render_from !== value) {
            this.state.render_from = value
            this.render_later()
        }
    }

    render() {
        let list_idx = this.state.render_from
        let list_entry = i => this.state.list[i]

        this.defs.forEach( (ge, ge_idx) => {
            if (this.dict.index[list_entry(list_idx)] == null
                || ge_idx >= this.state.list.length) {
                ge.parent_node.classList.add('hidden')
            } else {
                ge.parent_node.classList.remove('hidden')
                ge.idx = list_entry(list_idx)
            }
            list_idx++
        })
    }
}

class Index {
    constructor(dict, parent_node) {
        this.state = {
            list: [],
            highlight_from: 0,
        }
        this.dict = dict
        this.parent_node = parent_node

        this.render_later = debounce(this.render)
        this.highlight_later = debounce(this.highlight)
    }

    set list(value) {
        let upd = () => {
            this.state.list = value
            this.state.highlight_from = 0
            this.render_later()
        }
        if (this.state.list.length !== value.length) {
            upd()
            return
        }
        let a = JSON.stringify(this.state.list)
        let b = JSON.stringify(value)
        if (a !== b) upd()
    }

    set highlight_from(value) {
        value = Number(value)
        if (value >= this.state.list.length) value = this.state.list.length-1
        if (value < 0) value = 0
        if (this.state.highlight_from !== value) {
            this.state.highlight_from = value
            this.highlight_later()
        }
    }

    render() {
        let anchors = this.state.list.map( idx => {
            let term = this.dict.index[idx]
            let a = document.createElement('a')
            a.innerText = term
            let params = new URLSearchParams()
            params.set('q', term)
            params.set('t', 'exact')
            params.set('dict', this.dict.name)
            a.href = '?' + params.toString()
            return a
        })
        this.parent_node.replaceChildren(...anchors)
        this.highlight_later()
    }

    highlight() {
        this.parent_node.querySelectorAll('a.highlighted').forEach( a => {
            a.classList.remove('highlighted')
        })
        let a = this.parent_node.children
        let start = this.state.highlight_from
        let end = start + (this.dict.options?.glossentries_max || 4)
        for (let i = start; i < end; ++i) {
            if (!a[i]) break
            a[i].classList.add('highlighted')
        }
        a[start]?.scrollIntoView({block: "center", container: "nearest"})
    }
}

function index_fetch(url) {
    return fetch_text(url).then( r => r.split("\n").filter(Boolean))
}

function search(dict, query = '', type = 'regex') {
    if (query.length === 0) return dict.index.map( (_, idx) => idx)

    type = ['exact', 'regex', 'fts'].includes(type) ? type : 'regex'

    if (type === 'fts') {
        if (!dict.index_fts) throw new Error('fts: no index')
        let r; try {
            r = dict.index_fts.search(query)
        } catch (_) {
            throw new Error('fts: invalid query')
        }
        return r.map( found => parseInt(found.ref))

    } else if (type === 'exact') {
        let r = dict.index.findIndex( v => v === query)
        return r === -1 ? [] : [r]
    }

    let pattern = new RegExp(query, 'i')
    return dict.index.reduce( (acc, val, idx) => {
        if (pattern.test(val)) acc.push(idx);
        return acc;
    }, [])
}

class Status {
    constructor(parent_node) {
        this.state = { message: '', type: 'info' }
        this.parent_node = parent_node
        this.render_later = debounce(this.render)
    }

    set_prop(prop, value) {
        if (this.state[prop] !== value) {
            this.state[prop] = value
            this.render_later()
        }
    }

    set message(value) { this.set_prop('message', value) }
    set type(value) { this.set_prop('type', value) }

    render() {
        if (this.state.type === 'error') {
            this.parent_node.classList.remove('info')
            this.parent_node.classList.add('error')
            console.error(this.state.message)
        } else {
            this.parent_node.classList.remove('error')
            this.parent_node.classList.add('info')
        }
        this.parent_node.innerText = this.state.message
    }
}

class Navigator {
    constructor(ges, parent_node) {
        this.ges = ges
        this.parent_node = parent_node

        this.btn_prev = this.parent_node.querySelector('#prev')
        this.btn_next = this.parent_node.querySelector('#next')
        this.render()
    }

    get prev() { return this.ges.state.render_from > 0 }
    get next() {
        return (this.ges.state.list.length - this.ges.state.render_from) >
            this.ges.glossentries_max
    }

    render() {
        this.btn_prev.disabled = !this.prev
        this.btn_next.disabled = !this.next
        let op = (this.prev || this.next) ? 'remove' : 'add'
        this.parent_node.classList[op]('hidden')
    }
}

class About {
    constructor(dict, parent_node) {
        this.state = { disabled: true }
        this.dict = dict
        this.parent_node = parent_node
        this.fetch_abort_ctrl = null
    }

    set disabled(value) {
        if (this.state.disabled !== value) {
            this.state.disabled = value
            this.render()
        }
    }

    static str(template, obj) {
        return template.replace(/\$\{(\w+)\}/g, (match, key) =>
            (key in obj) ? obj[key] : ''
        )
    }

    render() {
        let op = this.state.disabled ? 'add' : 'remove'
        this.parent_node.classList[op]('hidden')
        if (this.state.disabled) return

        this.fetch_abort_ctrl?.abort()
        this.fetch_abort_ctrl = new AbortController()
        this.parent_node.innerText = `Loading about page...`
        fetch_text(this.dict.path + '/about.html',
                   {signal: this.fetch_abort_ctrl.signal})
            .then( html => {
                this.parent_node.innerHTML = About.str(html, this.dict)
            }).catch( () => {
                this.disabled = true
            }).finally( () => delete this.fetch_abort_ctrl)
    }
}

class Form {
    constructor(dicts, node) {
        this.dicts = dicts
        this.form = node
        this.populate_dict()
        this.url_to_state()
        node.querySelector('fieldset').disabled = false
    }

    url_to_state() {
        let params = new URLSearchParams(location.search)
        this.query = params.get('q')
        this.type = params.get('t')
        this.render_from = params.get('render_from')
        this.dict = params.get('dict')
    }

    state_to_url() {
        let u = new URL(location.href)
        u.searchParams.set('q', this.query)
        u.searchParams.set('t', this.type)
        u.searchParams.set('render_from', this.render_from)
        u.searchParams.set('dict', this.dict)
        window.history.pushState({dict: this.dict}, '', u.toString())
        let s = this.query ? `:: ${this.query} :: ${this.render_from}` : ''
        document.title = `${this.dict}${s}`
    }

    populate_dict() {
        let node = this.form.elements.dict
        node.innerHTML = ''
        node.append(...this.dicts.map( v => {
            let o = document.createElement('option')
            o.value = v.name

            let info = ['updated', 'languages'].map ( s => v[s]).filter(Boolean)
            if (info.length) info = ` [${info.join("; ")}]`

            o.innerText = v.name + info
            return o
        }))
    }

    set query(value) { this.form.elements.query.value = value }
    get query() { return this.form.elements.query.value }

    set type(value) {
        value = ['exact', 'regex', 'fts'].includes(value) ? value : 'regex'
        this.form.elements.type.value = value
    }
    get type() { return this.form.elements.type.value }

    set render_from(value) {
        value = Number(value)
        if (value < 0 || isNaN(value)) value = 0
        this.form.elements.render_from.value = value
    }
    get render_from() { return Number(this.form.elements.render_from.value) }

    set dict(value) {
        let def = this.dicts[0].name
        value = this.dicts.map( d => d.name).includes(value) ? value : def
        this.form.elements.dict.value = value
    }
    get dict() { return this.form.elements.dict.value }
}

class App {
    constructor(dict, gui) {
        this.dict = dict
        this.gui = gui

        this.gui.form.form.onsubmit = this.onsubmit.bind(this)
        this.gui.form.form.onreset = this.onreset.bind(this)
        this.gui.form.form.elements.dict.onchange = this.ondict.bind(this)
        this.gui.form.form.elements.type.onchange = this.ontype.bind(this)
        this.gui.ges.parent_node.onclick = this.ges_onclick.bind(this)
        this.gui.index.parent_node.onclick = this.index_onlick.bind(this)
        this.gui.nav.btn_prev.onclick = this.nav_onclink.bind(this, true)
        this.gui.nav.btn_next.onclick = this.nav_onclink.bind(this, false)
        window.addEventListener('popstate', this.onpopstate.bind(this))
    }

    index_onlick(evt) {
        let a = evt.target
        if (a.tagName !== 'A') return
        evt.preventDefault()

        let anchors = Array.from(a.parentElement.children)
        let idx = anchors.indexOf(a)
        this.gui.index.highlight_from = idx
        this.gui.ges.render_from = idx
        this.gui.form.render_from = idx
        this.gui.nav.render()
        this.gui.about.disabled = true
        this.gui.form.state_to_url()
    }

    nav_onclink(prev) {
        let render_from = this.gui.ges.state.render_from
        let step = this.gui.ges.glossentries_max
        if (prev) step *= -1
        let index_anchors = this.gui.index.parent_node.children
        let idx = render_from + step
        if (idx < 0) idx = 0
        index_anchors[idx].click()
    }

    ges_onclick(evt) {
        let a = evt.target
        if (a.tagName !== 'A') return
        if (!a.classList.contains('glossterm_link')) return
        evt.preventDefault()

        this.gui.form.type = 'exact'
        this.gui.form.query = a.innerText
        this.gui.form.render_from = 0
        this.search()
    }

    search(save_state_to_url = true) {
        let indices; try {
            indices = search(this.dict, this.gui.form.query, this.gui.form.type)
            this.gui.status.type = 'info'
            this.gui.status.message = `Found: ${indices.length}`
        } catch (e) {
            this.gui.status.type = 'error'
            this.gui.status.message = e
            indices = []
        }

        this.gui.about.disabled = !(this.gui.form.query.trim() === ''
                                    && this.gui.form.render_from === 0)

        this.gui.index.list = indices
        this.gui.index.highlight_from = this.gui.form.render_from
        this.gui.ges.list = indices
        this.gui.ges.render_from = this.gui.form.render_from
        this.gui.nav.render()

        if (save_state_to_url) this.gui.form.state_to_url()
    }

    async ontype() {
        if (this.gui.form.type !== 'fts') return
        if (this.dict.index_fts) return

        this.gui.fts_dialog.showModal()
        try {
            let json = await fetch_json(this.dict.path + '/index.json')
            let non_en_lang = this.dict.languages?.filter( v => v !== 'en')
            if (non_en_lang?.length) {
                non_en_lang.forEach( v => languages.setup(lunr, v))
                lunr.multiLanguage('en', ...non_en_lang)
            }
            this.dict.index_fts = lunr.Index.load(json)
        } catch(e) {
            e.message = `FTS index fetch failed: ${e.message}`
            this.gui.status.type = 'error'
            this.gui.status.message = e
        } finally {
            this.gui.fts_dialog.close()
        }
    }

    ondict() {
        this.gui.form.state_to_url()
        location.reload()
    }

    onpopstate(evt) {
        if (evt.state.dict
            && evt.state.dict !== this.dict.name) return location.reload()
        this.gui.form.url_to_state()
        this.search()
    }

    onsubmit(evt) {
        evt.preventDefault()
        this.gui.form.render_from = 0
        this.search()
    }

    onreset(evt) {
        evt.preventDefault()
        this.gui.form.query = ''
        this.gui.form.type = 'regex'
        this.gui.form.render_from = 0
        this.search()
    }
}

async function dicts_load() {
    let dicts = await fetch_json('dicts.json')

    // validate
    if ( !(Array.isArray(dicts) && dicts.length > 0))
        throw new Error('dict: invalid array')
    dicts.forEach( (cur, idx) => {
        ['name', 'path'].forEach( v => {
            if ( !(v in cur)) throw new Error(`dict ${idx}: no ${v} specified`)
        })
    })

    return dicts
}

async function main() {
    let gui = {
        status: new Status(document.querySelector('#status')),
        fts_dialog: document.querySelector('#fts_dialog')
    }

    let early_error = e => {
        window.addEventListener('popstate', () => location.reload())
        gui.status.type = 'error'
        gui.status.message = e
    }

    let dicts; try {
        dicts = await dicts_load()
    } catch (e) {
        return early_error(e)
    }

    gui.form = new Form(dicts, document.querySelector('form'))
    let dict = dicts.find( v => v.name === gui.form.dict)
    try {
        dict.index = await index_fetch(dict.path + '/index.txt')
    } catch (e) {
        return early_error(e)
    }

    gui.index =  new Index(dict, document.querySelector('#index'))
    gui.ges = new Glossentries(dict, document.querySelector('main'))
    gui.nav = new Navigator(gui.ges, document.querySelector('nav'))
    gui.about = new About(dict, document.querySelector('#about'))

    let app = new App(dict, gui)
    app.search(false)
}

main()

/* global lunr */

function efetch(url, opt) {
    let check_for_2xx = r => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`)
        return r
    }
    return fetch(url, opt).then(check_for_2xx)
}

function glossentry_append_child(path, id, parent_node) {
    let url = `${path}/glossentries/${id}.html`

    let spinner = document.createElement('div')
    spinner.innerText = `Loading ${id}...`
    parent_node.appendChild(spinner)

    fetch(url).then( r => {
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
        return r.text()
    }).then( html => {
        let doc = Document.parseHTMLUnsafe(html)
        doc.querySelectorAll('img').forEach( node => {
            node.src = path + '/' + node.src
        })
        spinner.replaceWith(doc.querySelector(".glossentry"))
    }).catch( e => {
        let div = document.createElement('div')
        div.classList.add('glossentry', 'error')
        div.innerText = e
        spinner.replaceWith(div)
    })
}

function index_fetch(url) {
    return efetch(url).then( r => r.text()).then( r => {
        return r.split("\n").filter(Boolean).map( (v, idx) => {
            return [v, idx]
        })
    })
}

function gen_id(term, idx) {
    return 'ge_' + term.trim().replaceAll(/[^A-Za-z0-9_-]+/g, '_') + `_${idx}`
}

function show_error(node, e) {
    let div = document.createElement('div')
    div.classList.add('error')
    div.innerText = e
    node.replaceChildren(div)
    console.error(e)
}

class App {
    constructor(index, meta) {
        this.gui = {
            form   : document.querySelector('header form'),
            search : document.querySelector('header form input[type="search"]'),
            status : document.querySelector('#status'),
            index  : document.querySelector('#index'),
            defs   : document.querySelector('main'),
            nav: {
                itself : document.querySelector('nav'),
                prev   : document.querySelector('#prev'),
                next   : document.querySelector('#next'),
            },
            fts: {
                checkbox : document.querySelector('#form__fts'),
                dialog   : document.querySelector('#fts_dialog'),
            },
            about: document.querySelector('#about'),
        }
        this.index = index
        this.terms = []
        this.index_fts = null   // loaded separately

        this.meta = meta
        this.GLOSSENTRIES_MAX = meta.options.glossentries_max || 4
    }

    form_toggle() {
        let fieldset = this.gui.form.querySelector('fieldset')
        fieldset.disabled = !fieldset.disabled
    }

    find() {
        let q = this.gui.form.elements.q.value.trim()
        let fts = this.gui.form.elements.fts.checked
        if (0 === q.length) return this.index

        if (this.index_fts && fts) {
            let r = this.index_fts.search(q)
            return r.map( found => this.index[parseInt(found.ref)])

        } else {
            let simple = v => v[0] === q
            let regex  = v => {
                let pattern = new RegExp(q, 'i')
                return pattern.test(v[0].toLowerCase())
            }

            let fixed_string = this.gui.form.elements.f.checked
            let grep = fixed_string ? simple : regex
            return this.index.filter( v => grep(v))
        }
    }

    terms_render() {
        let anchors = this.terms.map( v => {
            let a = document.createElement('a')
            a.innerHTML = v[0]
            a.dataset.orig_idx = v[1]
            let params = new URLSearchParams()
            params.set('q', v[0])
            params.set('f', 1)
            a.href = '?' + params.toString()
            return a
        })
        this.gui.index.replaceChildren(...anchors)
    }

    terms_highlight(start, end, opt = {}) {
        this.gui.index.querySelectorAll('a.rendered').forEach( node => {
            node.classList.remove('rendered')
        })
        let idx_nodes = this.gui.index.children
        for (let i = start; i < end; ++i) {
            if (!idx_nodes[i]) break
            idx_nodes[i].classList.add('rendered')
        }
        if (!opt.do_not_scroll_index)
            idx_nodes[start].scrollIntoView({block: "center", container: "nearest"})
    }

    defs_render(opt) {
        this.gui.defs.innerHTML = ''
        this.gui.nav.itself.classList.add('hidden')
        this.gui.nav.prev.disabled = true
        this.gui.nav.next.disabled = true
        if (!this.terms.length) return

        let slice_from = Number(this.gui.form.elements.slice_from.value)
        if (slice_from > this.terms.length)
            slice_from = this.terms.length - this.GLOSSENTRIES_MAX
        let start = slice_from < 0 ? 0 : slice_from
        let end = start + this.GLOSSENTRIES_MAX
//        console.log(start, end)

        this.terms_highlight(start, end, opt)

        this.terms.slice(start, end).forEach( v => {
            glossentry_append_child(this.meta.path,
                                    gen_id(v[0], v[1]), this.gui.defs)
        })

        this.gui.nav.itself.classList.remove('hidden')
        if (start > 0) this.gui.nav.prev.disabled = false
        if (end < this.terms.length) this.gui.nav.next.disabled = false
    }

    defs_view_slice(step, opt) {
        let slice_from = Number(this.gui.form.elements.slice_from.value)
        if (slice_from > this.terms.length)
            slice_from = this.terms.length - this.GLOSSENTRIES_MAX
        let start = (slice_from < 0 ? 0 : slice_from) + step
        this.gui.form.elements.slice_from.value = start
        this.defs_render(opt)
    }

    defs_render_prev() { this.defs_view_slice(-this.GLOSSENTRIES_MAX) }
    defs_render_next() { this.defs_view_slice(this.GLOSSENTRIES_MAX) }

    form_search() {
        this.terms = this.find()
        this.terms_render()
        this.gui.status.innerText = `Matched: ${this.terms.length}`

        let q = this.gui.form.elements.q.value.trim()
        let slice_from = Number(this.gui.form.elements.slice_from.value)
        if (0 === q.length && slice_from <= 0) return this.about_render()

        this.defs_render()
    }

    about_render() {
        let str = (template, obj) => {
            return template.replace(/\$\{(\w+)\}/g, (match, key) =>
                (key in obj) ? obj[key] : ''
            )
        }

        this.gui.defs.innerHTML = ''
        this.gui.nav.itself.classList.add('hidden')

        let spinner = document.createElement('div')
        spinner.innerText = `Loading about page...`
        this.gui.defs.appendChild(spinner)

        efetch(this.meta.path + '/about.html').then( r => r.text())
            .then( html => {
                let div = document.createElement('div')
                div.classList.add('about')
                div.innerHTML = str(html, this.meta)
                spinner.replaceWith(div)
            })
    }
}

async function dict_load_metadata() {
    let dicts = await efetch('dicts.json').then( r => r.json())
    if ( !(Array.isArray(dicts) && dicts.length > 0))
        throw new Error('metadata: invalid array')

    let params = new URLSearchParams(location.search)
    let cur = dicts?.find( v => params.get('dict') === v.name) || dicts[0]
    ;['name', 'path'].forEach( v => {
        if ( !(v in cur)) throw new Error(`metadata: no ${v} specified`)
    })
    cur.path = `dicts/${cur.path}`
    return cur
}

async function main() {
    let meta, index
    try {
        meta = await dict_load_metadata()
        index = await index_fetch(meta.path + '/index.txt')
    } catch (e) {
        return show_error(document.querySelector('#status'), e)
    }

    let app = new App(index, meta)
    app.form_toggle()
    app.gui.form.reset() // otherwise firefox displays 'cached' form values

    let update_url = is_push => {
        let u = new URL(location.href)
        let form = app.gui.form
        let q = form.elements.q.value
        u.searchParams.set('q', q)
        u.searchParams.set('slice_from', form.elements.slice_from.value)
        u.searchParams.set('fts', form.elements.fts.checked ? 1 : '')
        u.searchParams.set('f', form.elements.f.checked ? 1 : '')
        let op = is_push ? 'pushState' : 'replaceState'
        window.history[op]({}, '', u.toString())
        document.title = meta.name + (q.length ? `:: ${q}` : '')
    }

    let url_to_form = is_popstate => {
        let params = new URLSearchParams(location.search)
        app.gui.form.elements.q.value          = params.get('q')
        app.gui.form.elements.slice_from.value = params.get('slice_from')
        app.gui.form.elements.f.checked        = params.get('f')
        if (is_popstate) {
            app.gui.form.elements.fts.checked = params.get('fts')
        } else {
            // no `app.gui.form.elements.fts` here, for we can't do an
            // FTS query before a (potentially) huge index.json is
            // fetched, and we fetch it only on an explicit user
            // request (a user must click on "FTS" checkbox)
        }
    }

    url_to_form()

    app.gui.form.onsubmit = function(evt) {
        evt.preventDefault()
        app.gui.form.elements.slice_from.value = 0
        app.gui.form.elements.f.checked = false
        app.form_search()
        update_url(true)
    }

    app.gui.form.onreset = function(evt) {
        evt.preventDefault()
        app.gui.form.elements.q.value = ''
        app.gui.form.elements.slice_from.value = 0
        app.gui.form.elements.f.checked = false
        app.form_search()
        update_url()
    }

    app.gui.nav.next.onclick = function() {
        app.defs_render_next()
        update_url()
    }

    app.gui.nav.prev.onclick = function() {
        app.defs_render_prev()
        update_url()
    }

    app.gui.search.onfocus = function() {
        app.gui.form.elements.f.checked = false
    }

    app.gui.index.onclick = function(evt) {
        let a = evt.target
        if (a.tagName !== 'A') return
        evt.preventDefault()

        let anchors = a.parentElement.children
        let orig_idx = a.dataset.orig_idx
        let local_idx = Array.from(anchors)
            .findIndex( v => v.dataset.orig_idx === orig_idx)

        app.gui.form.elements.slice_from.value = 0
        app.defs_view_slice(local_idx, {do_not_scroll_index: true})
        update_url()
    }

    app.gui.defs.onclick = function(evt) {
        let a = evt.target
        if (a.tagName !== 'A') return
        if (!a.classList.contains('glossterm_link')) return
        evt.preventDefault()

        app.gui.form.elements.f.checked = true
        app.gui.form.elements.fts.checked = false
        app.gui.form.elements.q.value = a.innerText
        app.gui.form.elements.slice_from.value = 0
        app.form_search()
        update_url(true)
    }

    app.gui.fts.checkbox.onclick = async function() {
        if (app.index_fts) return

        app.gui.fts.dialog.showModal()
        try {
            let json = await efetch(meta.path + '/index.json')
                .then( r => r.json())
            app.index_fts = lunr.Index.load(json)
        } catch(e) {
            e.message = `FTS index fetch failed: ${e.message}`
            return show_error(document.querySelector('#status'), e)
        } finally {
            app.gui.fts.dialog.close()
        }
    }

    app.form_search()

    window.addEventListener('popstate', function() {
        url_to_form(true)
        app.form_search()
    })
}

main()

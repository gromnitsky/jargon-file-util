const GLOSSENTRIES_MAX = 4

function glossentry_append_child(id, parent_node) {
    let url = `glossentries/${id}.html`
    fetch(url).then( r => {
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
        return r.text()
    }).then( html => {
        parent_node.appendChild(Document.parseHTMLUnsafe(html)
                                .querySelector(".glossentry"))
    }).catch( e => {
        let div = document.createElement('div')
        div.classList.add('glossentry', 'error')
        div.innerText = e
        parent_node.appendChild(div)
    })
}

function index_fetch(url) {
    return fetch(url).then( r => {
        if (!r.ok) throw new Error(`failed to fetch index: HTTP ${r.status}`)
        return r.text()
    }).then( r => {
        return r.split("\n").filter(Boolean).map( (v, idx) => {
            return [v, idx]
        })
    })
}

function gen_id(term, idx) {
    return 'ge_' + term.trim().replaceAll(/[^A-Za-z0-9_-]+/g, '_') + `_${idx}`
}

function update_url(form) {
    let url = new URL(location.href)
    url.searchParams.set('q', form.elements.q.value)
    url.searchParams.set('slice_from', form.elements.slice_from.value)
    url.searchParams.set('fts', form.elements.fts.checked ? 1 : '')
    url.searchParams.set('f', form.elements.f.checked ? 1 : '')
    window.history.replaceState({}, '', url.toString())
}

function show_error(node, e) {
    let div = document.createElement('div')
    div.classList.add('error')
    div.innerText = e
    node.replaceChildren(div)
    console.error(e)
}

class App {
    constructor(index) {
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
        }
        this.index = index
        this.terms = []
    }

    form_toggle() {
        let fieldset = this.gui.form.querySelector('fieldset')
        fieldset.disabled = !fieldset.disabled
    }

    find() {
        let q = this.gui.form.elements.q.value.trim()
        if (0 === q.length) return this.index

        // FIXME: let fts = form.elements.fts.value

        let simple = v => v[0] === q
        let regex  = v => {
            let pattern = new RegExp(q, 'i')
            return pattern.test(v[0].toLowerCase())
        }

        let fixed_string = this.gui.form.elements.f.checked
        let grep = fixed_string ? simple : regex
        return this.index.filter( v => grep(v))
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
            slice_from = this.terms.length - GLOSSENTRIES_MAX
        let start = slice_from < 0 ? 0 : slice_from
        let end = start + GLOSSENTRIES_MAX
//        console.log(start, end)

        this.terms_highlight(start, end, opt)

        this.terms.slice(start, end).forEach( v => {
            glossentry_append_child(gen_id(v[0], v[1]), this.gui.defs)
        })

        this.gui.nav.itself.classList.remove('hidden')
        if (start > 0) this.gui.nav.prev.disabled = false
        if (end < this.terms.length) this.gui.nav.next.disabled = false
    }

    defs_view_slice(step, opt) {
        let slice_from = Number(this.gui.form.elements.slice_from.value)
        if (slice_from > this.terms.length)
            slice_from = this.terms.length - GLOSSENTRIES_MAX
        let start = (slice_from < 0 ? 0 : slice_from) + step
        this.gui.form.elements.slice_from.value = start
        this.defs_render(opt)
    }

    defs_render_prev() { this.defs_view_slice(-GLOSSENTRIES_MAX) }
    defs_render_next() { this.defs_view_slice(GLOSSENTRIES_MAX) }

    form_search() {
        this.terms = this.find()
        this.terms_render()
        this.gui.status.innerText = `Matched: ${this.terms.length}`
        this.defs_render()
    }
}

async function main() {
    let index
    try {
        index = await index_fetch('index.txt')
    } catch(e) {
        return show_error(document.querySelector('#status'), e)
    }

    let app = new App(index)
    app.form_toggle()

    let params = new URLSearchParams(location.search)
    app.gui.form.elements.q.value          = params.get('q')
    app.gui.form.elements.fts.checked      = params.get('fts')
    app.gui.form.elements.slice_from.value = params.get('slice_from')
    app.gui.form.elements.f.checked        = params.get('f')

    app.gui.form.onsubmit = function(evt) {
        evt.preventDefault()
        app.gui.form.elements.slice_from.value = 0
        app.gui.form.elements.f.checked = false
        app.form_search()
        update_url(app.gui.form)
    }

    app.gui.nav.next.onclick = function() {
        app.defs_render_next()
        update_url(app.gui.form)
    }

    app.gui.nav.prev.onclick = function() {
        app.defs_render_prev()
        update_url(app.gui.form)
    }

    app.gui.search.onfocus = function() {
        app.gui.form.elements.f.checked = false
    }

    app.gui.index.onclick = function(evt) {
        let a = evt.target
        if (a.nodeName !== 'A') return
        evt.preventDefault()

        let anchors = a.parentElement.children
        let orig_idx = a.dataset.orig_idx
        let local_idx = Array.from(anchors)
            .findIndex( v => v.dataset.orig_idx === orig_idx)

        app.gui.form.elements.slice_from.value = 0
        app.defs_view_slice(local_idx, {do_not_scroll_index: true})
        update_url(app.gui.form)
    }

    app.form_search()
}

main()

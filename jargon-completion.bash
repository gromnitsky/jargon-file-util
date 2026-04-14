_jargon_module() {
    [ "$COMP_CWORD" = 1 ] || return
    compopt -o nosort -o fullquote 2>/dev/null # 'fullquote' is bash-5.3
    local cur="${COMP_WORDS[COMP_CWORD]}"
    mapfile -t COMPREPLY < <(jargon "$cur" i 2>/dev/null)
}

complete -F _jargon_module jargon

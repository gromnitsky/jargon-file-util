#!/usr/bin/awk -f

function eh(s) { print s > "/dev/stderr"; exit 1 }

BEGIN {
    if (ARGC < 2) eh("Usage: jargon pattern [fi]\n\n" \
                     "  f    search inside defs too\n" \
                     "  i    print terms only")
    if ( !("JARGON" in ENVIRON)) eh("JARGON env var must point to jarg447.txt")

    pattern = ARGV[1]
    indices_mode = ARGV[2] ~ /i/
    full_text_mode = ARGV[2] ~ /f/
    ARGV[1] = ENVIRON["JARGON"]
    ARGC = 2

    RS = "[^:]\n\n:"
    ORS = indices_mode ? "\n" : "\n\n"
    status = 1
}

function term() {
    if ($0 ~ /^#=/) return ""
    return substr($0, 0, index($0, ":")-1)
}

function def() {
    if ($0 ~ /^#=/) return ""
    non_entry = match($0, /\n\n([A-Z]|Appendices)\n\n/)
    return non_entry ? substr($0, 0, non_entry-1) : $0
}

tolower(full_text_mode ? def() : term()) ~ tolower(pattern) {
    print indices_mode ? term() : def()
    status = 0
}

END { exit status }

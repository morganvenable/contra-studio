#!/bin/sh
# sh qa/shots/run.sh <out-dir>  (shoots every line of qa/shots/list.txt)
out=$1; set --; while IFS= read -r l; do [ -n "$l" ] && set -- "$@" "$l"; done < qa/shots/list.txt
node qa/shots/shoot.mjs "$out" "$@"

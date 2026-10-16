#!/bin/bash
# usage: run.sh <logname> <cwd> <cmd...>
OUT=/workspace/work/aidean/out/gates-v05
name=$1; shift; dir=$1; shift
cd "$dir"
s=$(date +%s.%N)
{ echo "\$ $*"; echo "cwd=$dir  start=$(date -Is)"; } > $OUT/$name.log
bash -c "$*" >> $OUT/$name.log 2>&1
rc=$?
e=$(date +%s.%N)
secs=$(python3 -c "print(round($e-$s,1))")
echo "exit=$rc secs=$secs" >> $OUT/$name.log
echo "$name|$rc|$secs" >> $OUT/_timings.txt
echo "exit=$rc secs=$secs"

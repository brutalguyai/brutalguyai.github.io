#!/bin/bash
# Reproduces the two cli-anything-libreoffice bugs. Needs: cli-anything-libreoffice on PATH, LibreOffice (soffice).
set -e; mkdir -p repro && cd repro; P=$PWD/p.json; C=cli-anything-libreoffice
$C document new --type calc -n t -o $P >/dev/null
$C --project $P calc set-cell A1 100 --type float >/dev/null; $C --project $P calc set-cell A2 250 --type float >/dev/null
$C --project $P calc set-cell A3 "" --formula "=SUM(A1:A2)" >/dev/null; $C --project $P calc set-cell A4 "" --formula "=1+2" >/dev/null
$C --project $P calc set-cell A5 "" --formula "SUM(A1:A2)" >/dev/null; $C --project $P calc set-cell A6 "" --formula "of:=SUM([.A1:.A2])" >/dev/null; $C --project $P calc set-cell A7 "" --formula "1+2" >/dev/null
echo "--- bug 2: export without -p"; for f in a.ods a.xlsx a.pdf; do $C --project $P export render $PWD/$f --overwrite >/dev/null 2>&1; done; file a.ods a.xlsx a.pdf
echo "--- with -p"; for f in ods xlsx pdf; do $C --project $P export render $PWD/b.$f -p $f --overwrite >/dev/null 2>&1; done; file b.ods b.xlsx b.pdf
echo "--- bug 1: formulas after LibreOffice recalculates (A3..A7)"; unzip -p b.ods content.xml | grep -o 'table:formula="[^"]*"'
soffice -env:UserInstallation=file:///tmp/lo_repro --headless --convert-to csv --outdir out b.ods >/dev/null 2>&1; cat out/b.csv

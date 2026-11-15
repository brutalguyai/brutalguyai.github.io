#!/bin/bash
cd $HOME/work/${2:-target}
export OCR_LLM_URL=https://api.anthropic.com/v1/messages OCR_LLM_MODEL=claude-sonnet-5-5 OCR_LLM_PROTOCOL=anthropic OCR_LLM_AUTH_HEADER=x-api-key
export OCR_LLM_TOKEN=$(grep '^ANTHROPIC_API_KEY=' $HOME/mnt/brutal-guy-ai/.env | cut -d= -f2-)
start=$(date +%s); timeout 165 $HOME/work/ocr/node_modules/.bin/ocr review --from main --to feature --format json --output $HOME/work/runs/ocr$1.json > $HOME/work/runs/ocr$1.log 2>&1; echo exit=$? secs=$(( $(date +%s)-start ))
python3 -c "
import json;d=json.load(open('$HOME/work/runs/ocr$1.json'));s=d['summary'];print('tokens',s['total_tokens'],'in',s['input_tokens'],'out',s['output_tokens'],'cr',s['cache_read_tokens'],'cw',s['cache_write_tokens'],s['elapsed'])
for c in d['comments']: print(c['path'],c['start_line'],c['category'],'|',c['content'][:90])"

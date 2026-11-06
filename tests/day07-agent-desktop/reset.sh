. /home/claude/d7/env.sh
pkill -x mousepad; sleep 1; rm -f /home/claude/d7/out/*.txt; rm -rf ~/.config/Mousepad
(mousepad >/dev/null 2>&1 &); sleep 3
W=$(xdotool search --class mousepad | tail -1); xdotool windowsize $W 1280 800; xdotool windowmove $W 0 0; sleep 1

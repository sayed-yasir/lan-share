#!/data/data/com.termux/files/usr/bin/sh
# Python version. Pure-Python builds avoid compiling C extensions on Termux.
cd "$(dirname "$0")" || exit 1
pkg list-installed 2>/dev/null | grep -q '^python/' || pkg install -y python
export AIOHTTP_NO_EXTENSIONS=1 MULTIDICT_NO_EXTENSIONS=1 YARL_NO_EXTENSIONS=1 FROZENLIST_NO_EXTENSIONS=1
python -c "import aiohttp, segno" 2>/dev/null || pip install -r requirements.txt || exit 1
if [ -z "$LAN_IP" ]; then
  LAN_IP=$( (ip -4 addr show wlan0 2>/dev/null || ifconfig wlan0 2>/dev/null) | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | grep -v '^255' | head -n1)
fi
[ -n "$LAN_IP" ] && export LAN_IP && echo "Using LAN IP: $LAN_IP"
exec python server.py

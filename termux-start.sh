#!/data/data/com.termux/files/usr/bin/sh
# Starts YASIR SHARE in Termux. Detects the Wi-Fi IP if possible.
cd "$(dirname "$0")" || exit 1
[ -d node_modules ] || npm install || exit 1
if [ -z "$LAN_IP" ]; then
  LAN_IP=$( (ip -4 addr show wlan0 2>/dev/null || ifconfig wlan0 2>/dev/null) | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | grep -v '^255' | head -n1)
fi
[ -n "$LAN_IP" ] && export LAN_IP && echo "Using LAN IP: $LAN_IP" || echo "LAN IP not detected. Run: LAN_IP=192.168.x.x sh termux-start.sh"
exec node server.js

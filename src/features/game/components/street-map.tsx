import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { StreetMapColors } from '@/constants/theme';

export interface StreetPin {
  key: string;
  lat: number;
  lng: number;
  emoji: string;
}

const html = (lat: number, lng: number, zoom: number) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: ${StreetMapColors.tileBackground}; }
  .emoji-marker { background: none; border: none; }
  .emoji-marker div { font-size: 32px; line-height: 40px; text-align: center; text-shadow: 2px 2px 4px ${StreetMapColors.pinShadow}; }
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true, touchZoom: true, doubleClickZoom: true, dragging: true }).setView([${lat}, ${lng}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var me = null;
  window.setPins = function (pins) {
    layer.clearLayers();
    pins.forEach(function (p) {
      var icon = L.divIcon({ html: '<div>' + p.emoji + '</div>', className: 'emoji-marker', iconSize: [40, 40], iconAnchor: [20, 20] });
      L.marker([p.lat, p.lng], { icon: icon }).addTo(layer).on('click', function () {
        window.ReactNativeWebView.postMessage(p.key);
      });
    });
  };
  window.setMe = function (p) {
    if (!p) return;
    if (me) { me.setLatLng([p.lat, p.lng]); return; }
    me = L.marker([p.lat, p.lng]).addTo(map).bindPopup('You are here');
  };
  window.center = function (lat, lng, zoom) { map.setView([lat, lng], zoom); };
</script>
</body></html>`;

/** The web version's Leaflet + OpenStreetMap map: pinch, drag and double-tap like any street map. */
export function StreetMap({
  center,
  zoom,
  me,
  pins,
  onPinPress,
}: {
  center: { lat: number; lng: number };
  zoom: number;
  /** The "You are here" marker. */
  me?: { lat: number; lng: number };
  pins: StreetPin[];
  onPinPress?: (key: string) => void;
}) {
  const web = useRef<WebView>(null);
  const initial = useRef({ html: html(center.lat, center.lng, zoom), baseUrl: 'https://flikkables.app/' });
  const loaded = useRef(false);
  const last = useRef({ pins: '', me: '', center: `${center.lat},${center.lng}` });

  const sync = () => {
    if (!loaded.current) return;
    const p = JSON.stringify(pins);
    const m = JSON.stringify(me ?? null);
    const c = `${center.lat},${center.lng}`;
    let js = '';
    if (p !== last.current.pins) js += `window.setPins(${p});`;
    if (m !== last.current.me) js += `window.setMe(${m});`;
    if (c !== last.current.center) js += `window.center(${center.lat}, ${center.lng}, ${zoom});`;
    last.current = { pins: p, me: m, center: c };
    if (js) web.current?.injectJavaScript(`${js}true;`);
  };
  useEffect(sync);

  return (
    <View className="h-96 w-full overflow-hidden rounded-2xl bg-surface" accessibilityLabel="Map. Pinch to zoom, drag to move.">
      <WebView
        ref={web}
        source={initial.current}
        originWhitelist={['*']}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        nestedScrollEnabled
        bounces={false}
        javaScriptEnabled
        onLoadEnd={() => {
          loaded.current = true;
          last.current = { pins: '', me: '', center: last.current.center };
          sync();
        }}
        onMessage={(e: WebViewMessageEvent) => onPinPress?.(e.nativeEvent.data)}
      />
    </View>
  );
}

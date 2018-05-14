import L from 'leaflet'
import 'leaflet-toolbar'
import 'leaflet-toolbar/dist/leaflet.toolbar.css'
import './DrawAction'
import './DrawSubAction'

L.Toolbar2.DrawToolbar = L.Toolbar2.Control.extend({
    options: {
        actions: [
            L.Toolbar2.DrawAction.Polyline,
            L.Toolbar2.DrawAction.Polygon,
            L.Toolbar2.DrawAction.Rectangle,
            L.Toolbar2.DrawAction.Circle,
            L.Toolbar2.DrawAction.Marker
        ],
        className: 'draw-toolbar'
    }
});

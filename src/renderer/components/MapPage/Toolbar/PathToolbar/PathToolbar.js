import L from "leaflet";
import 'leaflet-toolbar'
import 'leaflet-toolbar/dist/leaflet.toolbar.css'
import './PathAction'

L.Toolbar2.PathToolbar = L.Toolbar2.Control.extend({
    options: {
        actions: [
            L.Toolbar2.PathAction.StartPoint,
            L.Toolbar2.PathAction.EndPoint
        ],
        className: 'mb-0'
    }
});
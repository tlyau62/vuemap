import L from "leaflet";
import 'leaflet-toolbar'
import 'leaflet-toolbar/dist/leaflet.toolbar.css'
import './QueryAction'

L.Toolbar2.QueryToolbar = L.Toolbar2.Control.extend({
    options: {
        actions: [
            L.Toolbar2.QueryAction.Place,
            L.Toolbar2.QueryAction.Elavtion
        ],
        className: 'mb-0'
    }
});


import L from 'leaflet'
import 'leaflet-toolbar'
import 'leaflet-toolbar/dist/leaflet.toolbar.css'
import './EditAction'

L.Toolbar2.EditToolbar = L.Toolbar2.Popup.extend({
    options: {
        actions: [
            L.Toolbar2.EditAction.Detail,
            L.Toolbar2.EditAction.Edit,
            L.Toolbar2.EditAction.Save,
            L.Toolbar2.EditAction.Delete,
            L.Toolbar2.EditAction.Discard
        ],
        className: 'edit-toolbar'
    },
});

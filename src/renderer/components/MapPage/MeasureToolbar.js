L.Toolbar2.MeasureAction = {
    Place: L.Toolbar2.Action.extend({
        initialize: function (map) {
            this._map = map;
            this._mouseMarker = null;
            this.popup = null;
        },
        options: {
            toolbarIcon: {
                html: '&#9873;',
                tooltip: 'Go to the Eiffel Tower'
            }
        },
        addHooks() {
            if (!this._mouseMarker) {
                this._mouseMarker = L.marker(this._map.getCenter(), {
                    icon: L.divIcon({
                        className: 'leaflet-mouse-marker',
                        iconAnchor: [20, 20],
                        iconSize: [40, 40]
                    }),
                    // opacity: 0,
                    zIndexOffset: 9999
                });
            }

            if (!this._popup) {
                this._popup = L.popup();
            }

            this._mouseMarker
                .on('click', this._onClick, this)
                .addTo(this._map);
            this._map.on('mousemove', this._onMouseMove, this);
            this._map.on('click', this._onTouch, this);
        },
        removeHooks() {
            this._map.removeLayer(this._mouseMarker);
            delete this._mouseMarker;
            this._map.off('mousemove', this._onMouseMove, this);
        },
        _onMouseMove: function (e) {
            this._mouseMarker.setLatLng(e.latlng);
        },
        _onClick: function (e) {
            this._popup.setLatLng(e.latlng).setContent($(`<div><p>${e.latlng}</p></div>`)[0]);
            this._map.openPopup(this._popup);
            this.disable();
        }
    })
};

L.Toolbar2.MeasureToolbar = L.Toolbar2.Control.extend({
    options: {
        actions: [
            L.Toolbar2.MeasureAction.Place
            // L.Toolbar2.DrawAction.Polyline,
            // L.Toolbar2.DrawAction.Marker,
            // L.Toolbar2.DrawAction.Rectangle,
            // L.Toolbar2.DrawAction.Circle
        ],
        className: 'mb-0'
    }
});






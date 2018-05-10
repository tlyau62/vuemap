import axios from "axios/index";

L.Toolbar2.QueryAction = {};

L.Toolbar2.QueryAction.Place = L.Toolbar2.Action.extend({

    initialize: function (map, options) {
        this._map = map;
        this._mouseMarker = null;
        this._popup = null;
        this._handlers = [];

        L.Toolbar2.Action.prototype.initialize.call(this, options);
    },
    options: {
        toolbarIcon: {
            html: '?'
        }
    },
    addHooks() {
        if (!this._mouseMarker) {
            this._mouseMarker = L.marker(this._map.getCenter(), {
                icon: L.divIcon({
                    className: 'mouse-marker',
                    iconAnchor: [20, 20],
                    iconSize: [40, 40]
                }),
                opacity: 0,
                zIndexOffset: 9999
            });
        }

        if (!this._popup) {
            this._popup = L.popup();
        }

        this._mouseMarker.addTo(this._map);

        this._registerEvent(
            this._mouseMarker,
            'click',
            (e) => {
                axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
                    .then((response) => {
                        const {address, addresstype, category, display_name} = response.data;
                        const names = display_name.split(', ');
                        const mappedName = names.map(name => {
                            for (let key in address) {
                                if (!address.hasOwnProperty(key)) continue;

                                if (name === address[key]) {
                                    const result = {};
                                    result.type = key;
                                    result.name = name;
                                    return result;
                                }
                            }
                            return null;
                        });

                        let template = '';
                        mappedName.forEach(addr => {
                            if (addr) {
                                template += `<div>${addr.type}: ${addr.name}</div>`;
                            }
                        });

                        this._popup.setContent(`
                            <div>
                                <div>${e.latlng}</div>
                                ${template}
                            </div>
                        `);
                    })
                    .catch((error) => {
                        console.log(error);
                    });

                this._popup
                    .setLatLng(e.latlng)
                    .setContent($(`<div><p>${e.latlng}</p></div>`)[0]);

                this._map.openPopup(this._popup);
                this.disable();
            }
        )._registerEvent(
            this._map,
            'mousemove',
            (e) => this._mouseMarker.setLatLng(e.latlng)
        );

    },

    removeHooks() {
        this._map.removeLayer(this._mouseMarker);
        this._destroyEvents();
    },

    _registerEvent(layer, name, handler) {
        this._handlers.push({layer, name, handler});
        layer.on(name, handler);
        return this;
    },

    _destroyEvents() {
        this._handlers.forEach(event => {
            event.layer.off(event.name, event.handler);
        });
    }

});


L.Toolbar2.QueryAction.Elavtion = L.Toolbar2.Action.extend({

    initialize: function (map, options) {
        this._map = map;
        this._mouseMarker = null;
        this._popup = null;
        this._handlers = [];

        L.Toolbar2.Action.prototype.initialize.call(this, options);
    },
    options: {
        toolbarIcon: {
            html: 'E'
        }
    },
    addHooks() {
        if (!this._mouseMarker) {
            this._mouseMarker = L.marker(this._map.getCenter(), {
                icon: L.divIcon({
                    className: 'mouse-marker',
                    iconAnchor: [20, 20],
                    iconSize: [40, 40]
                }),
                opacity: 0,
                zIndexOffset: 9999
            });
        }

        if (!this._popup) {
            this._popup = L.popup();
        }

        this._mouseMarker.addTo(this._map);

        this._registerEvent(
            this._mouseMarker,
            'click',
            (e) => {
                axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${e.latlng.lat + ',' + e.latlng.lng}`)
                    .then((response) => {
                        const {elevation} = response.data.results[0];
                        this._popup.setContent(`
                            <div>
                                <div>${e.latlng}</div>
                                <div><span>Elevation:</span> ${elevation} m</div>
                            </div>
                        `);
                    })
                    .catch((error) => {
                        console.log(error);
                    });

                this._popup
                    .setLatLng(e.latlng)
                    .setContent($(`<div><p>${e.latlng}</p></div>`)[0]);

                this._map.openPopup(this._popup);
                this.disable();
            }
        )._registerEvent(
            this._map,
            'mousemove',
            (e) => this._mouseMarker.setLatLng(e.latlng)
        );

    },

    removeHooks() {
        this._map.removeLayer(this._mouseMarker);
        this._destroyEvents();
    },

    _registerEvent(layer, name, handler) {
        this._handlers.push({layer, name, handler});
        layer.on(name, handler);
        return this;
    },

    _destroyEvents() {
        this._handlers.forEach(event => {
            event.layer.off(event.name, event.handler);
        });
    }

});


import L from "leaflet";
import axios from "axios";
import StartIcon from '../../../../assets/marker-icon-2x-green.png';
import EndIcon from '../../../../assets/marker-icon-2x-red.png';
import ShadowIcon from '../../../../assets/marker-shadow.png';
import db from 'db/db'

const action = L.Toolbar2.Action.extend({
    initialize(map, shape, options) {
        this._map = map;
        this._handlers = [];
        this._mouseMarker = null;
        map.path = {
            startMarker: null,
            endMarker: null
        };
        L.Toolbar2.Action.prototype.initialize.call(this, map, shape, options);
    },

    removeHooks() {
        if (this._mouseMarker) {
            this._map.removeLayer(this._mouseMarker);
        }
        this._destroyEvents();
    },

    async _analyze() {
        const map = this._map;
        const {startMarker, endMarker} = map.path;

        if (startMarker && endMarker) {
            const startLatlng = startMarker.getLatLng();
            const endLatlng = endMarker.getLatLng();
            const midLatlng = map.road.roadStartMarker.getLatLng();
            const dists = await this._getMinDistances(map, startLatlng, endLatlng);

            let realStart, realEnd, realStartLatlng, realEndLatlng;
            realStart = (dists[0].dist !== null && (dists[0].dist < dists[2].dist)) ? dists[0] : dists[2];
            realEnd = (dists[1].dist !== null && (dists[1].dist < dists[3].dist)) ? dists[1] : dists[3];

            if (realStart === dists[0] && realEnd === dists[1]) {
                this._calPath('google', realStart.latlng, realEnd.latlng);
            } else if (realStart === dists[0] && realEnd === dists[3]) {
                this._calPath('mix1', realStart.latlng, realEnd.latlng, midLatlng);
            } else if (realStart === dists[2] && realEnd === dists[1]) {
                this._calPath('mix2', realStart.latlng, realEnd.latlng, midLatlng);
            } else {
                this._calPath('pg', realStart.latlng, realEnd.latlng);
            }

            /**
             * distG1 = getMinDistance(startLatlng, gStartLatlng)
             * distG2 = getMinDistance(endLatlng, gEndLatlng)
             * distP1 = getMinDistance(startLatlng)
             * distP2 = getMinDistance(endLatlng)
             * realStart = detMinDist(distG1, distP1)
             * realEnd = detMinDist(distG2, distP2)
             * if (realStart == gStartLatlng && realEnd == gEndLatlng) {
                     *    calPath(google api, gStartLatlng, gEndLatlng);
                     * } else if (realStart == pStartLatlng && realEnd == gEndLatlng) {
                     *    calPath(mix1, pStartLatlng, gEndLatlng, midLatlng);
                     * } else if (realStart == gStartLatlng && realEnd == pEndLatlng) {
                     *    calPath(mix2, gStartLatlng, pEndLatlng, midLatlng);
                     * } else {
                     *    calPath(pgroute);
                     * }
             */
        }
    },

    async _getMinDistances(map, startLatlng, endLatlng) {
        let dists = []; // [gstart, gend, pgstart, pgend]
        let response;
        let endpt;

        // google: start
        endpt = startLatlng;
        response = await axios.get(`https://roads.googleapis.com/v1/snapToRoads?path=${endpt.lat.toFixed(5)},${endpt.lng.toFixed(5)}`, {
            params: {
                interpolate: 'false',
                key: 'AIzaSyAcqUBLHpKUJGpweX8uDtDLOkTKmLDXFew'
            }
        });

        console.log(response);

        if (response.data.snappedPoints) {
            const locations = response.data.snappedPoints;
            const latlng = L.latLng([locations[0].location.latitude, locations[0].location.longitude]);
            dists.push({
                latlng,
                dist: L.GeometryUtil.distance(map, startLatlng, latlng)
            });
        } else {
            dists.push({
                latlng: null,
                dist: null
            });
        }

        // google: end
        endpt = endLatlng;
        response = await axios.get(`https://roads.googleapis.com/v1/snapToRoads?path=${endpt.lat.toFixed(5)},${endpt.lng.toFixed(5)}`, {
            params: {
                interpolate: 'false',
                key: 'AIzaSyAcqUBLHpKUJGpweX8uDtDLOkTKmLDXFew'
            }
        });

        if (response.data.snappedPoints) {
            const locations = response.data.snappedPoints;
            const latlng = L.latLng([locations[0].location.latitude, locations[0].location.longitude]);
            dists.push({
                latlng,
                dist: L.GeometryUtil.distance(map, endLatlng, latlng)
            });
        } else {
            dists.push({
                latlng: null,
                dist: null
            });
        }

        // pg: start
        endpt = startLatlng;
        response = await db.query(eval('`' + require('db/script/query_snap_point.sql') + '`'));

        dists.push({
            latlng: L.latLng([response.rows[0].lat, response.rows[0].lng]),
            dist: response.rows[0].dist
        });

        // pg: end
        endpt = endLatlng;
        response = await db.query(eval('`' + require('db/script/query_snap_point.sql') + '`'));

        dists.push({
            latlng: L.latLng([response.rows[0].lat, response.rows[0].lng]),
            dist: response.rows[0].dist
        });

        return dists;
    },

    _insertEndPoint(endpt) {
        return db.query(eval('`' + require('db/script/insert_end_pt.sql') + '`'));
    },

    _calPath(mode, startLatlng, endLatlng, midLatlng) {
        if (mode === 'google') {
            this._calPathExt(startLatlng, endLatlng);
        } else if (mode === 'mix1') {
            this._calPathExt(startLatlng, midLatlng);
            this._calPathPG(midLatlng, endLatlng);
        } else if (mode === 'mix2') {
            this._calPathPG(startLatlng, midLatlng);
            this._calPathExt(midLatlng, endLatlng);
        } else if (mode === 'pg') {
            this._calPathPG(startLatlng, endLatlng);
        } else {
            console.log('error: _calPath');
        }
    },

    async _calPathPG(startLatlng, endLatlng) {
        await db.query('BEGIN;');
        await this._insertEndPoint(startLatlng);
        await this._insertEndPoint(endLatlng);
        const results = (await db.query(eval('`' + require('db/script/dij.sql') + '`'))).rows;
        results.forEach((path) => {
            L.geoJSON(JSON.parse(path.geojson)).addTo(this._map);
        });
        await db.query(`ROLLBACK;`);
    },

    async _calPathExt(startLatlng, endLatlng) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startLatlng.lng.toFixed(5) + ',' + startLatlng.lat.toFixed(5)};${endLatlng.lng.toFixed(5) + ',' + endLatlng.lat.toFixed(5)}`;
        const response = await axios.get(url, {
            params: {
                steps: 'true',
                geometries: 'geojson',
                access_token: 'pk.eyJ1IjoieWF1cmZ1IiwiYSI6ImNqODN0cjluNzAxeTMzMnM1c3JibGc0YXEifQ.0zWpVkFinm53OG6zU3mgHw'
            }
        });
        let geom = response.data.routes[0].geometry.coordinates;
        geom = geom.map(latlng => [latlng[1], latlng[0]]);
        L.polyline(geom).addTo(this._map);
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

L.Toolbar2.PathAction = {};

L.Toolbar2.PathAction.StartPoint = action.extend({

    options: {
        toolbarIcon: {
            html: 'S'
        }
    },

    addHooks() {
        const map = this._map;
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

        this._mouseMarker.addTo(this._map);

        this._registerEvent(
            this._mouseMarker,
            'click',
            (e) => {
                if (map.path.startMarker) {
                    map.removeLayer(map.path.startMarker);
                }
                map.path.startMarker = L.marker(e.latlng, {
                    icon: L.icon({
                        iconUrl: StartIcon,
                        shadowUrl: ShadowIcon,
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }).addTo(map);

                action.prototype._analyze.call(this);

                this.disable();
            }
        )._registerEvent(
            this._map,
            'mousemove',
            (e) => this._mouseMarker.setLatLng(e.latlng)
        );
    }

});

L.Toolbar2.PathAction.EndPoint = action.extend({

    options: {
        toolbarIcon: {
            html: 'E'
        }
    },

    addHooks() {
        const map = this._map;
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

        this._mouseMarker.addTo(this._map);

        this._registerEvent(
            this._mouseMarker,
            'click',
            (e) => {
                if (map.path.endMarker) {
                    map.removeLayer(map.path.endMarker);
                }
                map.path.endMarker = L.marker(e.latlng, {
                    icon: L.icon({
                        iconUrl: EndIcon,
                        shadowUrl: ShadowIcon,
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }).addTo(map);

                action.prototype._analyze.call(this);

                this.disable();
            }
        )._registerEvent(
            this._map,
            'mousemove',
            (e) => this._mouseMarker.setLatLng(e.latlng)
        );
    }

});


L.Toolbar2.PathAction.GenRoad = action.extend({

    options: {
        toolbarIcon: {
            html: 'G'
        }
    },

    addHooks() {
        db.query(require('db/script/analyze_road_network'));
        alert('finish');
    }

});


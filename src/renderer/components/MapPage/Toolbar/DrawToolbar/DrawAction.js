import {Save, Undo, Redo, Discard} from './DrawSubAction'
import Vue from 'vue'
import L from 'leaflet'
import 'leaflet-geometryutil/src/leaflet.geometryutil'
import 'leaflet-snap/leaflet.snap'
import 'leaflet-draw'
import 'leaflet-tooltip/dist/L.Tooltip'
import 'leaflet-tooltip/dist/tooltip.css'
import 'leaflet-toolbar'
import 'leaflet-toolbar/dist/leaflet.toolbar.css'
import DrawNewLayer from './DrawNewLayer.vue'
import db from 'db/db'

const action = L.Toolbar2.Action.extend({
    initialize(map, options) {
        this._map = map;
        this._shape = null;
        this._tooltip = null;
        this._redoBuffer = [];
        this._handlers = [];

        L.Toolbar2.Action.prototype.initialize.call(this, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;

        // commit
        this._registerEvent(
            map,
            'editable:drawing:commit',
            (e) => {
                this.disable();
                map.fire('DRAW_ACTION.COMMIT', {layer: e.layer});
            }
        );

        // tooltip
        this._createTooltip();
    },

    removeHooks() {
        const map = this._map;

        // disable edit
        if (this._shape) {
            this._shape.disableEdit();
        }

        // remove tooltip
        if (this._tooltip) {
            map.removeLayer(this._tooltip);
        }

        // remove handlers
        this._destroyEvents();

    },

    _createTooltip() {
        const map = this._map;
        const bounds = map.getBounds().pad(0.25);
        const tooltip = this._tooltip = L.tooltip({
            position: 'left',
            noWrap: true
        });

        tooltip
            .addTo(map)
            .setContent(getTooltipText(this._shape))
            .setLatLng(new L.LatLng(bounds.getNorth(), bounds.getCenter().lng));

        this._registerEvent(
            map,
            'mousemove',
            (e) => tooltip
                .setContent(getTooltipText(this._shape, true, e.latlng))
                .updatePosition(e.layerPoint)
        )._registerEvent(
            map,
            'editable:drawing:clicked',
            (e) => tooltip.setContent(getTooltipText(this._shape, true, e.latlng))
        );

        function getTooltipText(layer, started, mouseLatlng) {
            let text;

            if (layer instanceof L.Circle) {
                if (started && layer._point) {
                    let radius, area, bearing;
                    radius = Math.round(layer.getRadius());
                    area = Math.round(Math.PI * (radius * radius));
                    bearing = Math.round(L.GeometryUtil.bearing(layer._latlng, mouseLatlng));

                    text = `
                        <div>
                            <div><span>Radius:</span> ${radius} m</div>
                            <div><span>Area:</span> ${area} m</div>
                            <div><span>Bearing:</span> ${bearing}° (${getDirection(bearing)})</div>
                            <div>---</div>
                            <div>Release to <span style="color: #B3E5FC">finish</span> drawing</div>
                        </div>
                    `;
                } else {
                    text = 'Click and drag to draw a circle';
                }
            } else if ((layer instanceof L.Polyline) && !(layer instanceof L.Polygon)) {
                const shapeLatlngs = layer._latlngs;
                if (started && shapeLatlngs.length > 0) {
                    let lastShapeLatlng = shapeLatlngs[shapeLatlngs.length - 1];
                    let length, bearing;

                    length = Math.round(L.GeometryUtil.length(shapeLatlngs.concat([mouseLatlng])));
                    bearing = Math.round(L.GeometryUtil.bearing(lastShapeLatlng, mouseLatlng));

                    text = `
                        <div>
                            <div><span>Length:</span> ${length} m</div>
                            <div><span>Bearing:</span> ${bearing}° (${getDirection(bearing)})</div>
                            <div>---</div>
                            <div>Click last point to <span style="color: #B3E5FC">finish</span> drawing</div>
                        </div>`;
                } else {
                    text = 'Click on the map to start drawing';
                }
            } else if ((layer instanceof L.Polygon) && !(layer instanceof L.Rectangle)) {
                const shapeLatlngs = layer._latlngs[0];
                if (started && shapeLatlngs.length > 0) {
                    const firstShapeLatlng = shapeLatlngs[0];
                    const lastShapeLatlng = shapeLatlngs[shapeLatlngs.length - 1];
                    let area, perimeter, bearing;

                    if (shapeLatlngs.length === 1) {
                        perimeter = Math.round(L.GeometryUtil.length(shapeLatlngs.concat([mouseLatlng])));
                    } else {
                        // including 1st and last point of current shape
                        perimeter = Math.round(L.GeometryUtil.length(shapeLatlngs.concat([mouseLatlng, firstShapeLatlng])));
                    }
                    area = Math.round(L.GeometryUtil.geodesicArea(shapeLatlngs.concat([mouseLatlng])));
                    bearing = Math.round(L.GeometryUtil.bearing(lastShapeLatlng, mouseLatlng));

                    text = `
                        <div>
                            <div><span>Area:</span> ${area} m</div>
                            <div><span>Parameter:</span> ${perimeter} m</div>
                            <div><span>Bearing:</span> ${bearing}° (${getDirection(bearing)})</div>
                            <div>---</div>
                            <div>Click last point to <span style="color: #B3E5FC">finish</span> drawing</div>
                        </div>`;
                } else {
                    text = 'Click on the map to start drawing';
                }
            } else if (layer instanceof L.Rectangle) {
                const shapeLatlngs = layer._latlngs[0];

                // index
                // L.marker([22.400575192777087, 114.14365768432619]).addTo(map);
                // L.marker([22.400575192777087, 114.14040350450921]).addTo(map);
                // L.marker([22.397816430619542, 114.14040350450921]).addTo(map);
                // L.marker([22.397816430619542, 114.14365768432619]).addTo(map);

                if (started && shapeLatlngs.length === 4) {
                    let area, perimeter, bearing;

                    perimeter = Math.round(L.GeometryUtil.length(shapeLatlngs.concat([shapeLatlngs[0]])));
                    area = Math.round(L.GeometryUtil.geodesicArea(shapeLatlngs));
                    bearing = Math.round(L.GeometryUtil.bearing(shapeLatlngs[1], shapeLatlngs[3]));

                    text = `
                        <div>
                            <div><span>Area:</span> ${area} m</div>
                            <div><span>Parameter:</span> ${perimeter} m</div>
                            <div><span>Bearing:</span> ${bearing}° (${getDirection(bearing)})</div>
                            <div>---</div>
                            <div>Release to <span style="color: #B3E5FC">finish</span> drawing</div>
                        </div>
                    `;
                } else {
                    text = 'Click and drag to draw a rectangle';
                }
            } else if (layer instanceof L.Marker) {
                text = 'Click to drop a marker';
            } else {
                text = undefined;
                console.log('error: getTooltipText');
            }

            return text;
        }

        function getDirection(degree) {
            let dir;
            if (degree > -22.5 && degree <= 22.5) {
                dir = '↑';
            } else if (degree > 22.5 && degree <= 67.5) {
                dir = '↗';
            } else if (degree > 67.5 && degree <= 112.5) {
                dir = '→';
            } else if (degree > 112.5 && degree <= 157.5) {
                dir = '↘';
            } else if (degree > -157.5 && degree <= -112.5) {
                dir = '↙';
            } else if (degree > -112.5 && degree <= -67.5) {
                dir = '←';
            } else if (degree > -67.5 && degree <= -22.5) {
                dir = '↖';
            } else {
                dir = '↓';
            }
            return dir;
        }

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
    },

    _createForm(geom_type, callback) {
        const modalWrapper = $('<div id="modal"></div>');
        modalWrapper.appendTo('body');

        const form = Vue.extend(DrawNewLayer);
        let formVm = new form({
            propsData: {geom_type}
        });
        formVm.$mount('#modal');
        formVm.$on('FORM_SEND', (formData) => {

            // remove modal
            formVm.$destroy();
            modalWrapper.remove();

            // embed form
            if (formData !== 'cancel') {
                callback(formData.feature);
            } else {
                callback();
            }
        });
    }

});

L.Toolbar2.DrawAction = {};

L.Toolbar2.DrawAction.Polyline = action.extend({
    options: {
        toolbarIcon: {html: '<div style="color: black">↝</div>'},
        subToolbar: new L.Toolbar2({
            actions: [Save, Undo, Redo, Discard]
        })
    },

    initialize(map, options) {
        this._snap = null;
        this._snapMarker = null;
        action.prototype.initialize.call(this, map, options);
    },

    addHooks() {
        const map = this._map;
        const startDraw = (form) => {
            if (!form) {
                this.disable();
                return;
            }

            if (form.type === 'stream') {
                this._shape = this._map.editTools.startPolyline();
                this._shape.info = form;
                action.prototype.addHooks.call(this);

                return;
            }

            // add snap
            let snap, snapMarker;
            const drawnItemsLayers = map.road.drawnItems._layers;
            const roadLayers = [];

            for (let id in drawnItemsLayers) {
                if (!drawnItemsLayers.hasOwnProperty(id)) continue;
                const currentLayer = drawnItemsLayers[id];
                if ((currentLayer instanceof L.Polyline) && !(currentLayer instanceof L.Polygon)) {
                    roadLayers.push(currentLayer);
                }
            }

            const roadGuideLayers = L.featureGroup([map.road.roadStartMarker].concat(roadLayers));

            if (this._snapMarker) {
                snapMarker = this._snapMarker;
            } else {
                snapMarker = this._snapMarker = L.marker(map.getCenter(), {
                    icon: map.editTools.createVertexIcon({className: 'leaflet-div-icon leaflet-drawing-icon'}),
                    opacity: 1,
                    zIndexOffset: 1000
                });
            }

            snap = this._snap = new L.Handler.MarkerSnap(map);
            snap.addGuideLayer(roadGuideLayers);
            snap.watchMarker(snapMarker);

            this._registerEvent(
                snapMarker,
                'snap',
                (e) => snapMarker.addTo(map)
            )._registerEvent(
                snapMarker,
                'unsnap',
                (e) => snapMarker.remove()
            )._registerEvent(
                snapMarker,
                'click',
                (e) => {
                    if (this._shape && this._shape.editEnabled()) {
                        this._shape.addLatLng(e.latlng);
                        return;
                    }
                    this._shape = this._map.editTools.startPolyline(e.latlng);
                    this._shape.info = form;
                    action.prototype.addHooks.call(this);
                }
            )._registerEvent(
                map,
                'mousemove',
                (e) => snapMarker.setLatLng(e.latlng)
            );

        };

        action.prototype._createForm.call(this, 'polyline', startDraw);
    },

    removeHooks() {
        if (this._snap) {
            this._snap.disable();
            this._snap = null;
        }

        action.prototype.removeHooks.call(this);
    }
});

L.Toolbar2.DrawAction.Polygon = action.extend({
    options: {
        toolbarIcon: {html: '<div style="color: black">★</div>'},
        subToolbar: new L.Toolbar2({
            actions: [Save, Undo, Redo, Discard]
        })
    },
    addHooks() {
        const startDraw = (form) => {
            if (!form) {
                this.disable();
                return;
            }

            this._shape = this._map.editTools.startPolygon();
            this._shape.info = form;
            action.prototype.addHooks.call(this);
        };

        action.prototype._createForm.call(this, 'polygon', startDraw);
    }
});

L.Toolbar2.DrawAction.Rectangle = action.extend({
    options: {
        toolbarIcon: {html: '<div style="color: black">▮</div>'},
        subToolbar: new L.Toolbar2({
            actions: [Discard]
        })
    },
    addHooks() {
        const startDraw = (form) => {
            if (!form) {
                this.disable();
                return;
            }

            this._shape = this._map.editTools.startRectangle();
            this._shape.info = form;
            action.prototype.addHooks.call(this);
        };

        action.prototype._createForm.call(this, 'rectangle', startDraw);
    }
});

L.Toolbar2.DrawAction.Circle = action.extend({
    options: {
        toolbarIcon: {html: '<div style="color: black">●</div>'},
        subToolbar: new L.Toolbar2({
            actions: [Discard]
        })
    },
    addHooks() {
        const startDraw = (form) => {
            if (!form) {
                this.disable();
                return;
            }

            this._shape = this._map.editTools.startCircle();
            this._shape.info = form;
            action.prototype.addHooks.call(this);
        };

        action.prototype._createForm.call(this, 'circle', startDraw);
    }
});

L.Toolbar2.DrawAction.Marker = action.extend({
    options: {
        toolbarIcon: {html: '<div style="color: black">⚐</div>'},
        subToolbar: new L.Toolbar2({
            actions: [Discard]
        })
    },
    addHooks() {
        const startDraw = (form) => {
            if (!form) {
                this.disable();
                return;
            }

            this._shape = this._map.editTools.startMarker();
            this._shape.info = form;
            action.prototype.addHooks.call(this);
        };

        action.prototype._createForm.call(this, 'marker', startDraw);
    }
});

L.Toolbar2.DrawAction.AutoRoad = action.extend({
    options: {
        toolbarIcon: {html: '<div style="color: black">⚐</div>'},
        subToolbar: new L.Toolbar2({
            actions: [Discard]
        })
    },
    addHooks() {
        const map = this._map;
        const selection_geom = this._map.editTools.startPolygon();

        this._registerEvent(
            map,
            'editable:drawing:commit',
            (e) => {
                const startDraw = async (form) => {
                    if (!form) {
                        this.disable();
                        return;
                    }

                    const latlngs = selection_geom._latlngs;
                    let geomText = latlngs[0]
                        .map(latlng => `${latlng.lng} ${latlng.lat}`).join();
                    geomText += (',' + latlngs[0][0].lng + ' ' + latlngs[0][0].lat);
                    geomText = '(' + geomText + ')';
                    geomText = `ST_GeomFromText('POLYGON(${geomText})', 4326)`;

                    const response = await db.query(`
                    with samplepoints as (
                        select *, ST_GeneratePoints(geom, ceiling(st_area(geom::geography) / 1)::int) as pts
                        from feature
                        where geometrytype(geom) = 'POLYGON'
                    ), vor as (
                        select (st_dump(ST_VoronoiPolygons(st_collect(pts)))).geom as geom
                        from samplepoints
                    ), dump_vor as (
                        select (st_dump(vor.geom)).geom as geom
                        from vor
                    ), road_polygon as (
                        select b.id, st_union(a.geom) as vor_geom
                        from dump_vor a inner join samplepoints b on (st_intersects(a.geom, b.geom))
                        group by b.id
                    ), road_line as (
                        select st_intersection(a.vor_geom, b.vor_geom) as road_geom
                        from road_polygon a inner join road_polygon b on (a.id != b.id and st_intersects(a.vor_geom, b.vor_geom))
                    ), road_line_clean as (
                        select (st_dump(st_linemerge(st_union(road_geom)))).geom
                        from road_line
                    )
                    select ST_AsGeoJSON(st_intersection(geom, ${geomText})) as geojson
                    from road_line_clean
                    `);

                    selection_geom.remove();

                    response.rows.forEach((row) => {
                        const reverse = JSON.parse(row.geojson).coordinates.map((latlng) => [latlng[1], latlng[0]]);
                        const layer = L.polyline(reverse);
                        layer.info = form;
                        map.fire('DRAW_ACTION.COMMIT', {layer});
                    });
                };

                action.prototype._createForm.call(this, 'polyline', startDraw);
            }
        );
    }
});
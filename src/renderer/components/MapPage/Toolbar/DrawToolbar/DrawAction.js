import {Save, Undo, Redo, Discard} from './DrawSubAction'
import L from 'leaflet'
import 'leaflet-geometryutil/src/leaflet.geometryutil'
import 'leaflet-draw'
import 'leaflet-tooltip/dist/L.Tooltip'
import 'leaflet-tooltip/dist/tooltip.css'
import 'leaflet-toolbar'
import 'leaflet-toolbar/dist/leaflet.toolbar.css'

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
            'editable:drawing:commit',
            (e) => {
                this.removeHooks();
                map.fire('DRAW_ACTION.COMMIT', {layer: e.layer});
            }
        );

        // tooltip
        this._createTooltip();
    },

    removeHooks() {
        const map = this._map;

        // disable edit
        this._shape.disableEdit();

        // remove tooltip
        map.removeLayer(this._tooltip);

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
            'mousemove',
            (e) => tooltip
                .setContent(getTooltipText(this._shape, true, e.latlng))
                .updatePosition(e.layerPoint)
        )._registerEvent(
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

    _registerEvent(name, handler) {
        this._handlers.push({name, handler});
        this._map.on(name, handler);
        return this;
    },

    _destroyEvents() {
        const map = this._map;
        this._handlers.forEach(event => {
            map.off(event.name, event.handler);
        });
    }

});

L.Toolbar2.DrawAction = {};

L.Toolbar2.DrawAction.Polyline = action.extend({
    options: {
        toolbarIcon: {html: 'L'},
        subToolbar: new L.Toolbar2({
            actions: [Save, Undo, Redo, Discard]
        })
    },

    addHooks() {
        this._shape = this._map.editTools.startPolyline();
        action.prototype.addHooks.call(this);
    }
});


L.Toolbar2.DrawAction.Polygon = action.extend({
    options: {
        toolbarIcon: {html: 'P'},
        subToolbar: new L.Toolbar2({
            actions: [Save, Undo, Redo, Discard]
        })
    },

    addHooks() {
        this._shape = this._map.editTools.startPolygon();
        action.prototype.addHooks.call(this);
    }
});

L.Toolbar2.DrawAction.Rectangle = action.extend({
    options: {
        toolbarIcon: {html: 'R'},
        subToolbar: new L.Toolbar2({
            actions: [Discard]
        })
    },

    addHooks() {
        this._shape = this._map.editTools.startRectangle();
        action.prototype.addHooks.call(this);
    }
});

L.Toolbar2.DrawAction.Circle = action.extend({
    options: {
        toolbarIcon: {html: 'C'},
        subToolbar: new L.Toolbar2({
            actions: [Discard]
        })
    },
    addHooks() {
        this._shape = this._map.editTools.startCircle();
        action.prototype.addHooks.call(this);
    }
});
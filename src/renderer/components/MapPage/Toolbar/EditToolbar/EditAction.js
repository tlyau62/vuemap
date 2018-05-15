import {LayerDetail} from './EditUtil'
import L from "leaflet";
import 'leaflet-geometryutil/src/leaflet.geometryutil'
import 'leaflet-snap/leaflet.snap'

const action = L.Toolbar2.Action.extend({
    initialize(map, shape, options) {
        this._map = map;
        this._shape = shape;
        this._handlers = [];
        L.Toolbar2.Action.prototype.initialize.call(this, map, shape, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        this.disable();
    },

    removeHooks() {
        // remove toolbar
        this._map.removeLayer(this.toolbar);
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

L.Toolbar2.EditAction = {};

L.Toolbar2.EditAction.Edit = action.extend({
    options: {
        toolbarIcon: {html: 'Edit'}
    },

    initialize(map, shape, options) {
        this._tooltip = null;
        this._snap = null;
        action.prototype.initialize.call(this, map, shape, options);
    },

    addHooks() {
        const roadStartLatLng = this._map.road.roadStartMarker.getLatLng();

        this._shape.originalLatlng = this._backupOriginalLatlng();
        this._shape.enableEdit();

        this._registerEvent(
            this._shape,
            'editable:vertex:dragstart',
            (e) => {
                if (L.GeometryUtil.distance(this._map, e.vertex.latlng, roadStartLatLng) === 0) {
                    this._shape.editor.reset();
                }
            }
        );

        // add snap
        const map = this._map;
        let snap, snapMarker;
        const drawnItemsLayers = map.road.drawnItems._layers;
        const roadLayers = [];

        for (let id in drawnItemsLayers) {
            if (!drawnItemsLayers.hasOwnProperty(id)) continue;
            const currentLayer = drawnItemsLayers[id];
            if ((currentLayer instanceof L.Polyline) && !(currentLayer instanceof L.Polygon) && this._shape !== currentLayer) {
                roadLayers.push(currentLayer);
            }
        }

        const roadGuideLayers =
            roadLayers.length === 0 ?
                map.road.roadStartMarker : L.featureGroup(roadLayers);

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

        let snapLatlng;

        this._registerEvent(
            snapMarker,
            'snap',
            (e) => {
                snapLatlng = snapMarker.getLatLng();
                snapMarker.addTo(map);
            }
        )._registerEvent(
            snapMarker,
            'unsnap',
            (e) => {
                snapLatlng = null;
                snapMarker.remove();
            }
        )._registerEvent(
            map,
            'mousemove',
            (e) => snapMarker.setLatLng(e.latlng)
        )._registerEvent(
            this._shape,
            'editable:vertex:dragend',
            (e) => {
                if (snapLatlng) {
                    this._shape.addLatLng(snapLatlng);
                    this._shape.editor.reset();
                }
            }
        );


        this._createTooltip();
        this._map.removeLayer(this.toolbar);
    },

    removeHooks() {
        if (this._snap) {
            this._snap.disable();
            this._snap = null;
        }

        this._map.removeLayer(this._tooltip);
        this._destroyEvents();
    },

    _backupOriginalLatlng() {
        const layer = this._shape;
        let originalLatlng;

        if ((layer instanceof L.Polyline) && !(layer instanceof L.Polygon)) {
            originalLatlng = layer.getLatLngs().slice().map((latlng) => L.latLng([latlng.lat, latlng.lng]));
        } else if ((layer instanceof L.Polygon) && !(layer instanceof L.Rectangle)) {
            originalLatlng = layer.getLatLngs()[0].slice().map((latlng) => L.latLng([latlng.lat, latlng.lng]));
        } else if (layer instanceof L.Rectangle) {
            originalLatlng = layer.getLatLngs()[0].slice().map((latlng) => L.latLng([latlng.lat, latlng.lng]));
        } else if (layer instanceof L.Marker || layer instanceof L.Circle) {
            const latlng = layer.getLatLng();
            originalLatlng = L.latLng([latlng.lat, latlng.lng]);
        } else {
            originalLatlng = undefined;
            console.log('error: backupOriginalLatlng');
        }
        return originalLatlng;
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
            (e) => tooltip.updatePosition(e.layerPoint)
        )._registerEvent(
            map,
            'editable:vertex:drag',
            (e) => tooltip
                .setContent(getTooltipText(this._shape, true, e.latlng))
        )._registerEvent(
            map,
            'editable:vertex:dragend',
            (e) => {
                tooltip
                    .setContent(getTooltipText(this._shape))
            }
        )._registerEvent(
            map,
            'editable:disable',
            (e) => this.removeHooks()
        );

        function getTooltipText(layer, started) {

            if (!started) {
                if (layer instanceof L.Marker) {
                    return `
                        <div>
                            <div>Move the marker by dragging</div>
                            <div>Remember to save the changes</div>
                        </div>`;
                } else {
                    return `
                    <div>
                        <div>Create/remove a vertex by clicking</div>
                        <div>Move a vertex/feature by dragging</div>
                        <div>Remember to save the changes</div>
                    </div>`;
                }
            }

            let text;
            const layerDetail = new LayerDetail(layer);

            if (layer instanceof L.Circle) {
                text = `
                    <div>
                        ${layerDetail.detailTemplate}
                        <div>---</div>
                        <div>Release to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else if ((layer instanceof L.Polyline) && !(layer instanceof L.Polygon)) {
                text = `
                    <div>
                        ${layerDetail.detailTemplate}
                        <div>---</div>
                        <div>Click last point to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else if ((layer instanceof L.Polygon) && !(layer instanceof L.Rectangle)) {
                text = `
                    <div>
                        ${layerDetail.detailTemplate}
                        <div>---</div>
                        <div>Click last point to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else if (layer instanceof L.Rectangle) {
                text = `
                    <div>
                        ${layerDetail.detailTemplate}
                        <div>---</div>
                        <div>Release to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else if (layer instanceof L.Marker) {
                text = `
                    <div>
                        ${layerDetail.detailTemplate}
                        <div>---</div>
                        <div>Click to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else {
                text = undefined;
                console.log('error: getTooltipText');
            }

            return text;
        }

    }

});

L.Toolbar2.EditAction.Save = action.extend({
    options: {
        toolbarIcon: {html: 'Save'}
    },

    addHooks() {
        const map = this._map;
        const shape = this._shape;

        shape.disableEdit();
        map.fire('EDIT_ACTION.SAVE', {layers: L.layerGroup([shape])});

        action.prototype.addHooks.call(this);
    }
});

L.Toolbar2.EditAction.Delete = action.extend({
    options: {
        toolbarIcon: {html: 'Delete'}
    },

    addHooks() {
        const map = this._map;
        const shape = this._shape;

        map.fire('EDIT_ACTION.DELETE', {layers: L.layerGroup([shape])});

        action.prototype.addHooks.call(this);
    }
});

L.Toolbar2.EditAction.Discard = action.extend({
    options: {
        toolbarIcon: {html: 'Discard'}
    },

    addHooks() {
        // const map = this._map;
        const shape = this._shape;

        if (shape.editEnabled()) {
            shape.disableEdit();

            if (shape instanceof L.Marker) {
                shape.setLatLng(this._shape.originalLatlng);
            } else {
                shape.setLatLngs(this._shape.originalLatlng);
            }
        }

        action.prototype.addHooks.call(this);
    }
});

L.Toolbar2.EditAction.Detail = action.extend({
    options: {
        toolbarIcon: {html: 'Detail'}
    },

    addHooks() {
        const map = this._map;
        const shape = this._shape;
        const detail = new LayerDetail(shape);
        const popup = L.popup().setContent(detail.detailTemplateWithChart);

        shape.bindPopup(popup, {className: 'detail-popup', maxWidth: 500}).openPopup();

        this._registerEvent(
            map,
            'popupclose',
            (e) => {
                this._destroyEvents();
                shape.unbindPopup();
            }
        );

        action.prototype.addHooks.call(this);
    }
});


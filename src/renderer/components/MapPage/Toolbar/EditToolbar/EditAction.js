import {LayerDetail} from './EditUtil'

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

L.Toolbar2.EditAction = {};

L.Toolbar2.EditAction.Edit = action.extend({
    options: {
        toolbarIcon: {html: 'Edit'}
    },

    initialize(map, shape, options) {
        this._tooltip = null;
        action.prototype.initialize.call(this, map, shape, options);
    },

    addHooks() {
        this._shape.enableEdit();
        this._createTooltip();
        this._map.removeLayer(this.toolbar);
    },

    removeHooks() {
        this._map.removeLayer(this._tooltip);
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
            (e) => tooltip.updatePosition(e.layerPoint)
        )._registerEvent(
            'editable:vertex:drag',
            (e) => tooltip
                .setContent(getTooltipText(this._shape, true, e.latlng))
        )._registerEvent(
            'editable:vertex:dragend',
            (e) => {
                tooltip
                    .setContent(getTooltipText(this._shape))
            }
        )._registerEvent(
            'editable:disable',
            (e) => this.removeHooks()
        );

        function getTooltipText(layer, started) {

            if (!started) {
                return `
                    <div>
                        <div>Create/remove a vertex by clicking</div>
                        <div>Move a vertex/feature by dragging</div>
                    </div>`;
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

        map.removeLayer(shape);
        map.fire('EDIT_ACTION.DELETE', {layers: L.layerGroup([shape])});

        action.prototype.addHooks.call(this);
    }
});

L.Toolbar2.EditAction.Cancel = action.extend({
    options: {
        toolbarIcon: {html: 'Cancel'}
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

        // markerdata.bindPopup(popup, { offset: L.Point(0,16) }).addTo(m);

        shape.bindPopup(popup, {className: 'detail-popup', maxWidth: 500}).openPopup();

        this._registerEvent(
            'popupclose',
            (e) => {
                this._destroyEvents();
                shape.unbindPopup();
            }
        );

        action.prototype.addHooks.call(this);
    }
});


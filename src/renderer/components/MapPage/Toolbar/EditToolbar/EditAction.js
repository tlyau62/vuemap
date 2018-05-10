const action = L.Toolbar2.Action.extend({
    initialize(map, shape, options) {
        this._map = map;
        this._shape = shape;
        this._handlers = [];
        L.Toolbar2.Action.prototype.initialize.call(this, map, shape, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        this.removeHooks();
    },

    removeHooks() {
        // remove toolbar
        this._map.removeLayer(this.toolbar);
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

        function getTooltipText(layer, started, mouseLatlng) {
            let text;

            if (!started) {
                return `
                    <div>
                        <div>Create/remove a vertex by clicking</div>
                        <div>Move a vertex/feature by dragging</div>
                    </div>`;
            }

            if (layer instanceof L.Circle) {
                let radius, area;
                radius = Math.round(layer.getRadius());
                area = Math.round(Math.PI * (radius * radius));

                text = `
                    <div>
                        <div><span>Radius:</span> ${radius} m</div>
                        <div><span>Area:</span> ${area} m</div>
                        <div>---</div>
                        <div>Release to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else if ((layer instanceof L.Polyline) && !(layer instanceof L.Polygon)) {
                const shapeLatlngs = layer._latlngs;
                let length;

                length = Math.round(L.GeometryUtil.length(shapeLatlngs.concat([mouseLatlng])));

                text = `
                    <div>
                        <div><span>Length:</span> ${length} m</div>
                        <div>---</div>
                        <div>Click last point to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else if ((layer instanceof L.Polygon) && !(layer instanceof L.Rectangle)) {
                const shapeLatlngs = layer._latlngs[0];
                const firstShapeLatlng = shapeLatlngs[0];
                const lastShapeLatlng = shapeLatlngs[shapeLatlngs.length - 1];
                let area, perimeter;

                if (shapeLatlngs.length === 1) {
                    perimeter = Math.round(L.GeometryUtil.length(shapeLatlngs.concat([mouseLatlng])));
                } else {
                    // including 1st and last point of current shape
                    perimeter = Math.round(L.GeometryUtil.length(shapeLatlngs.concat([mouseLatlng, firstShapeLatlng])));
                }
                area = Math.round(L.GeometryUtil.geodesicArea(shapeLatlngs.concat([mouseLatlng])));

                text = `
                    <div>
                        <div><span>Area:</span> ${area} m</div>
                        <div><span>Parameter:</span> ${perimeter} m</div>
                        <div>---</div>
                        <div>Click last point to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else if (layer instanceof L.Rectangle) {
                const shapeLatlngs = layer._latlngs[0];

                let area, perimeter;

                perimeter = Math.round(L.GeometryUtil.length(shapeLatlngs.concat([shapeLatlngs[0]])));
                area = Math.round(L.GeometryUtil.geodesicArea(shapeLatlngs));

                text = `
                    <div>
                        <div><span>Area:</span> ${area} m</div>
                        <div><span>Parameter:</span> ${perimeter} m</div>
                        <div>---</div>
                        <div>Release to <span style="color: #B3E5FC">finish</span> drawing</div>
                    </div>`;
            } else {
                text = undefined;
                console.log('error: getTooltipText');
            }

            return text;
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

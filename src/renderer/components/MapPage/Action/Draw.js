L.Toolbar2.DrawAction = {};

L.Toolbar2.DrawAction.Polyline = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'L'}
    },

    initialize(map, options) {
        this._map = map;

        L.Toolbar2.Action.prototype.initialize.call(this, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;

        map.editTools.startPolyline();
        map.on('editable:drawing:commit', onCommit);

        function onCommit(e) {
            const shape = e.layer;
            shape.disableEdit();
            map.off('editable:drawing:commit', onCommit);
            map.fire('DRAW_ACTION.COMMIT', {layer: shape});
        }
    }
});

L.Toolbar2.DrawAction.Polygon = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'P'}
    },

    initialize(map, options) {
        this._map = map;

        L.Toolbar2.Action.prototype.initialize.call(this, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;

        map.editTools.startPolygon();
        map.on('editable:drawing:commit', onCommit);

        function onCommit(e) {
            const shape = e.layer;
            shape.disableEdit();
            map.off('editable:drawing:commit', onCommit);
            map.fire('DRAW_ACTION.COMMIT', {layer: shape});
        }
    }
});

L.Toolbar2.DrawAction.Rectangle = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'R'}
    },

    initialize(map, options) {
        this._map = map;

        L.Toolbar2.Action.prototype.initialize.call(this, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;

        map.editTools.startRectangle();
        map.on('editable:drawing:commit', onCommit);

        function onCommit(e) {
            const shape = e.layer;
            shape.disableEdit();
            map.off('editable:drawing:commit', onCommit);
            map.fire('DRAW_ACTION.COMMIT', {layer: shape});
        }
    }
});

L.Toolbar2.DrawAction.Circle = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'C'}
    },

    initialize(map, options) {
        this._map = map;

        L.Toolbar2.Action.prototype.initialize.call(this, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;

        map.editTools.startCircle();
        map.on('editable:drawing:commit', onCommit);

        function onCommit(e) {
            const shape = e.layer;
            shape.disableEdit();
            map.off('editable:drawing:commit', onCommit);
            map.fire('DRAW_ACTION.COMMIT', {layer: shape});
        }
    }
});
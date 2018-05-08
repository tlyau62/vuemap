L.Toolbar2.DrawAction = {};
L.Toolbar2.DrawAction.SubAction = {};

L.Toolbar2.DrawAction.SubAction.Save = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {
            html: 'Save'
        }
    },
    initialize: function (map, action) {
        this._map = map;
        this._action = action;
    },
    addHooks() {
        this._action.disable();
    }
});

L.Toolbar2.DrawAction.SubAction.Undo = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {
            html: 'Undo'
        }
    },
    initialize: function (map, action) {
        this._map = map;
        this._action = action;
    },
    addHooks() {
        const action = this._action;
        let point = action._shape.editor.pop();
        if (point) {
            action._redoBuffer.push(point);
        }
    }
});

L.Toolbar2.DrawAction.SubAction.Redo = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {
            html: 'Redo'
        }
    },
    initialize: function (map, action) {
        this._map = map;
        this._action = action;
    },
    addHooks() {
        const action = this._action;
        const shape = action._shape;
        const redoBuffer = action._redoBuffer;
        if (redoBuffer.length > 0) {
            shape.editor.push(redoBuffer.pop());
        }
    }
});

L.Toolbar2.DrawAction.SubAction.Discard = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {
            html: 'Discard'
        }
    },
    initialize: function (map, action) {
        this._map = map;
        this._action = action;
    },
    addHooks() {
        this._map.removeLayer(this._action._shape);
        this._action.disable();
    }
});

L.Toolbar2.DrawAction.Polyline = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'L'},
        subToolbar: new L.Toolbar2({
            actions: [
                L.Toolbar2.DrawAction.SubAction.Save,
                L.Toolbar2.DrawAction.SubAction.Undo,
                L.Toolbar2.DrawAction.SubAction.Redo,
                L.Toolbar2.DrawAction.SubAction.Discard
            ]
        })
    },

    initialize(map, options) {
        this._map = map;
        this._shape = null;
        this._onCommit = null;
        this._redoBuffer = [];

        L.Toolbar2.Action.prototype.initialize.call(this, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;

        this._shape = map.editTools.startPolyline();

        this._onCommit = (e) => {
            const shape = e.layer;
            this.removeHooks();
            map.fire('DRAW_ACTION.COMMIT', {layer: shape});
        };

        map.on('editable:drawing:commit', this._onCommit);
    },

    removeHooks() {
        console.log('removeHooks');
        this._shape.disableEdit();
        this._map.off('editable:drawing:commit', this._onCommit);
    },


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



import {Save, Undo, Redo, Discard} from './DrawSubAction'

const action = L.Toolbar2.Action.extend({
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

        this._onCommit = (e) => {
            const shape = e.layer;
            this.removeHooks();
            map.fire('DRAW_ACTION.COMMIT', {layer: shape});
        };

        map.on('editable:drawing:commit', this._onCommit);
    },

    removeHooks() {
        this._shape.disableEdit();
        this._map.off('editable:drawing:commit', this._onCommit);
    },

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
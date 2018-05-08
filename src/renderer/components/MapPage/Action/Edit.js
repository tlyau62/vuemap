L.Toolbar2.EditAction = {};

L.Toolbar2.EditAction.Edit = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'Edit'}
    },

    initialize(map, shape, options) {
        this._map = map;
        this._shape = shape;
        L.Toolbar2.Action.prototype.initialize.call(this, map, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;
        const shape = this._shape;

        shape.enableEdit();

        map.removeLayer(this.toolbar);
    }
});

L.Toolbar2.EditAction.Save = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'Save'}
    },

    initialize(map, shape, options) {
        this._map = map;
        this._shape = shape;
        L.Toolbar2.Action.prototype.initialize.call(this, map, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;
        const shape = this._shape;

        shape.disableEdit();

        map.removeLayer(this.toolbar);
        map.fire('EDIT_ACTION.SAVE', {layers: L.layerGroup([shape])});
    }
});

L.Toolbar2.EditAction.Delete = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'Delete'}
    },

    initialize(map, shape, options) {
        this._map = map;
        this._shape = shape;
        L.Toolbar2.Action.prototype.initialize.call(this, map, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;
        const shape = this._shape;

        map.removeLayer(shape);

        map.removeLayer(this.toolbar);
        map.fire('EDIT_ACTION.DELETE', {layers: L.layerGroup([shape])});
    }
});

L.Toolbar2.EditAction.Cancel = L.Toolbar2.Action.extend({
    options: {
        toolbarIcon: {html: 'Cancel'}
    },

    initialize(map, shape, options) {
        this._map = map;
        this._shape = shape;
        L.Toolbar2.Action.prototype.initialize.call(this, map, options);
    },

    // Called when the handler is enabled, should add event hooks.
    addHooks() {
        const map = this._map;
        map.removeLayer(this.toolbar);
    }
});

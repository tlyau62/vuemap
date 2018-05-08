const subAction = L.Toolbar2.Action.extend({
    initialize(map, action) {
        this._map = map;
        this._action = action;
    },
    addHooks() {
        this._action.disable(); // trigger action's method removeHook
    }
});

const Save = subAction.extend({
    options: {
        toolbarIcon: {
            html: 'Save'
        }
    }
});

const Undo = subAction.extend({
    options: {
        toolbarIcon: {
            html: 'Undo'
        }
    },
    addHooks() {
        const action = this._action;
        let point = action._shape.editor.pop();
        if (point) {
            action._redoBuffer.push(point);
        }
    }
});

const Redo = subAction.extend({
    options: {
        toolbarIcon: {
            html: 'Redo'
        }
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

const Discard = subAction.extend({
    options: {
        toolbarIcon: {
            html: 'Discard'
        }
    },
    addHooks() {
        this._map.removeLayer(this._action._shape);
        this._action.disable();
    }
});

export {Save, Undo, Redo, Discard};
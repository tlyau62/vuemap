L.NewLineControl = L.Control.extend({

    // options: {
    //     position: 'topleft',
    //     callback: null,
    //     kind: '',
    //     html: ''
    // },

    // _map: null,
    //
    options: {
        position: 'topleft',
        kind: 'line',
        html: '\\/\\'
    },

    onAdd(map) {
        this._map = map;

        map.on('editable:drawing:commit', (e) => {
           console.log(e);
            e.layer.disableEdit();
        });

        console.log(map);
        console.log(this._map);
        // console.log(this.options);

        var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
            link = L.DomUtil.create('a', '', container);
        var link2 = L.DomUtil.create('a', '', container),
            link3 = L.DomUtil.create('a', '', container),
            link4 = L.DomUtil.create('a', '', container);

        link.href = '#';
        link.title = 'Create a new ' + this.options.kind;
        link.innerHTML = this.options.html;
        L.DomEvent
            .on(link, 'click', L.DomEvent.stop)
            .on(link, 'click', function () {
                window.LAYER = this.callback(map.editTools);
            }, this);

        return container;
    },

    callback(editTools) {
        // console.log(editTools);
        this._map.editTools.startPolyline();
        // console.log(this.options);
        // this._map.editTools.startPolyline();
    }
});
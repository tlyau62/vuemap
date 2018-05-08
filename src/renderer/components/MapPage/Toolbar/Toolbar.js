L.ToolbarControl = L.Control.extend({

    options: {
        type: 'polyline'
    },

    onAdd(map) {
        this._map = map;

        // var road = L.polyline([
        //     [22.40398739746067, 114.0963666173916],
        //     [22.400254829083615, 114.1015185554015]
        // ], {color: 'red'}).addTo(map);

        var road = L.marker(
            [22.40398739746067, 114.0963666173916]
            , {color: 'red'}).addTo(map);

        this._snap(road);


        map.on('editable:drawing:commit', (e) => {

            const layer = e.layer;

            if (layer instanceof L.Rectangle) {
                console.log('im an instance of L rectangle');
            }

            if (layer instanceof L.Polygon) {
                console.log('im an instance of L polygon');
            }

            if (layer instanceof L.Polyline) {
                console.log('im an instance of L polyline');
            }

            e.layer.disableEdit();

            console.log(layer);
        });

        const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
        const polyline = L.DomUtil.create('a', '', container);

        polyline.href = '#';
        polyline.title = 'Create a new new';
        polyline.innerHTML = '\\/\\';
        L.DomEvent
            .on(polyline, 'click', L.DomEvent.stop)
            .on(polyline, 'click', function () {
                const layer = map.editTools.startPolyline();

                // rec.enableEdit();
                layer.on('click', L.DomEvent.stop)
                    .on('click', function (e) {
                        console.log(e);
                        console.log(layer);
                        map.flyTo(layer.getCenter());
                        const popup = L.popup()
                            .setLatLng(e.latlng)
                            .setContent("edit / save")
                            .openOn(map);

                        // const container = L.DomUtil.create('div', '');
                        // const polyline = L.DomUtil.create('button', '', container);


                        // .setLatLng([51.5, -0.09])
                        //         .setContent("I am a standalone popup.");
                    });

                // layer.on('dblclick', L.DomEvent.stop).on('dblclick', layer.toggleEdit);
            }, this);

        return container;
    },

    _snap(guideLayers) {
        const map = this._map;
        const snap = new L.Handler.MarkerSnap(map);
        const snapMarker = L.marker(map.getCenter(), {
            icon: map.editTools.createVertexIcon({className: 'leaflet-div-icon leaflet-drawing-icon'}),
            opacity: 1,
            zIndexOffset: 1000
        });

        snap.addGuideLayer(guideLayers);
        snap.watchMarker(snapMarker);

        map.on('editable:vertex:dragstart', function (e) {
            snap.watchMarker(e.vertex);
        });
        map.on('editable:vertex:dragend', function (e) {
            snap.unwatchMarker(e.vertex);
        });
        map.on('editable:drawing:start', function () {
            this.on('mousemove', followMouse);
        });
        map.on('editable:drawing:end', function () {
            this.off('mousemove', followMouse);
            snapMarker.remove();
        });
        map.on('editable:drawing:click', function (e) {
            // Leaflet copy event data to another object when firing,
            // so the event object we have here is not the one fired by
            // Leaflet.Editable; it's not a deep copy though, so we can change
            // the other objects that have a reference here.
            var latlng = snapMarker.getLatLng();
            e.latlng.lat = latlng.lat;
            e.latlng.lng = latlng.lng;
        });
        snapMarker.on('snap', function (e) {
            snapMarker.addTo(map);
        });
        snapMarker.on('unsnap', function (e) {
            snapMarker.remove();
        });

        function followMouse(e) {
            snapMarker.setLatLng(e.latlng);
        }
    }

});
import Vue from "vue";
import MapInfo from './MapInfo.vue'

L.Control.MapInfo = L.Control.extend({
    onAdd: function (map) {
        const wrapper = $('<div id="mapWrapper"></div>')[0];
        const info = Vue.extend(MapInfo);
        const vm = new info({
            propsData: {map}
        }).$mount();

        wrapper.appendChild(vm.$el);

        return wrapper;
    },

    onRemove: function (map) {
        // Nothing to do here
    }
});

L.control.mapInfo = function (opts) {
    return new L.Control.MapInfo(opts);
};
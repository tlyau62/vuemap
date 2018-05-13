import Vue from "vue";
import PathInfo from './PathInfo'

L.Control.PathInfo = L.Control.extend({
    onAdd: function (map) {
        const wrapper = $('<div id="infoWrapper"></div>')[0];
        const info = Vue.extend(PathInfo);
        const formVm = new info({
            propsData: {
                map
            }
        }).$mount();

        wrapper.appendChild(formVm.$el);

        return wrapper;
    },

    onRemove: function (map) {
        // Nothing to do here
    }
});

L.control.pathInfo = function (opts) {
    return new L.Control.PathInfo(opts);
};
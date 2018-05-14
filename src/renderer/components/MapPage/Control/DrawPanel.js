import Vue from "vue";
import DrawPanel from './DrawPanel.vue'

L.Control.DrawPanel = L.Control.extend({
    onAdd: function (map) {
        const wrapper = $('<div id="draw-panel-wrapper"></div>')[0];
        const info = Vue.extend(DrawPanel);
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

L.control.drawPanel = function (opts) {
    return new L.Control.DrawPanel(opts);
};
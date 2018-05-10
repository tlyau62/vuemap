# vuemap

> An electron-vue project

## first page
- create a new map
    - map name
    - select location
    - create new db
    - go to main page
- choose existing map
    - go to main page

## main page
draw

## new map page
- import google map
- draw, edit
    - draw toolbar
    - layers (line, polygon, marker)
        - point/marker (mark name)
        - line (create road)
        - polygon (create building)
    - state
        - save
        - undo
- query
    - place
    - elevation
- plugin
    - *auto draw road
- analysis
    - *distance matrix
    - *shortest path
    - distance
    - bearing
    - *elevation profile

# db schema
- map: (db_name, starting location)
- db_name: (layer, priority, text, geom)

#### Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:9080
npm run dev

# build electron application for production
npm run build


```

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue)@[7c4e3e9](https://github.com/SimulatedGREG/electron-vue/tree/7c4e3e90a772bd4c27d2dd4790f61f09bae0fcef) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).

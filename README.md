# vuemap

> An electron-vue project

#### Build Setup
for application
``` bash
# install dependencies
npm install

# serve with hot reload at localhost:9080
npm run dev

# build electron application for production
npm run build
```

for database setup
- database username: postgres, password: admin
- make sure a table mapdb is created under database postgres
```
-- Table: public.mapdb

-- DROP TABLE public.mapdb;

CREATE TABLE public.mapdb
(
    id bigint NOT NULL DEFAULT nextval('mapdb_id_seq'::regclass),
    name character varying COLLATE pg_catalog."default",
    locat_geom geometry(Geometry,4326),
    CONSTRAINT mapdb_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.mapdb
    OWNER to postgres;
```


#### Deploy
- software needs
    - postgis + postgres
    - tillmill
- steps
    1. clone this resp
    2. open tillmill
    3. npm run dev

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue)@[7c4e3e9](https://github.com/SimulatedGREG/electron-vue/tree/7c4e3e90a772bd4c27d2dd4790f61f09bae0fcef) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).

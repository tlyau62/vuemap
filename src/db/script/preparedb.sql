-- create ext
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
CREATE EXTENSION postgis_sfcgal;
CREATE EXTENSION fuzzystrmatch;
CREATE EXTENSION address_standardizer;
CREATE EXTENSION address_standardizer_data_us;
CREATE EXTENSION postgis_tiger_geocoder;
CREATE EXTENSION pgrouting;
CREATE EXTENSION dblink;

-- create tables
CREATE TABLE feature (
    id bigserial NOT NULL,
    layer varchar,
    priority integer,
    text varchar,
    geom geometry(Geometry,4326),
    CONSTRAINT feature_pkey PRIMARY KEY (id)
)
WITH (
    OIDS=FALSE
);
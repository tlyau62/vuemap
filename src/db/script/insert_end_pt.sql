with endpt as (
  select ST_GeomFromText('POINT(${endpt.lng} ${endpt.lat})', 4326) as geom
), edge as (
  select road.id, road.geom
  from road, endpt
  order by st_distance(endpt.geom, road.geom)
  limit 1
), joint_line as (
  select st_shortestline(endpt.geom, edge.geom) as geom
  from endpt, edge
)
insert into road(geom, topo_geom)
select geom, topology.toTopoGeom(geom, 'road_topo', 1, 5e-5) as topo_geom
from joint_line;
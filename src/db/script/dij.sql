with startpt_id as (
  select node_id
  from road_topo.node
  order by st_distance(ST_GeomFromText('POINT(${startLatlng.lng} ${startLatlng.lat})', 4326), node.geom)
  limit 1
), endpt_id as (
  select node_id
  from road_topo.node
  order by st_distance(ST_GeomFromText('POINT(${endLatlng.lng} ${endLatlng.lat})', 4326), node.geom)
  limit 1
), dijpath as (
  SELECT *
  FROM pgr_dijkstra(
    'SELECT edge_id as id, start_node as source, end_node as target, st_length(geom::geography) as cost, st_length(geom::geography) as reverse_cost FROM road_topo.edge',
    (select node_id from startpt_id),
    (select node_id from endpt_id)
  ) dij inner join road_topo.edge edge on (dij.edge = edge.edge_id)
)
select *, ST_AsGeoJSON(geom) as geojson
from dijpath
where seq is not null
order by seq asc
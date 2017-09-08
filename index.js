const TileServer = require("./server");

const stopsQuery = `
    SELECT ST_AsMVT('stops', 4096, 'geom', rows)
    FROM (
        SELECT
            stop_id AS stopId,
            short_id AS shortId,
            name_fi AS nameFi,
            name_se AS nameSe,
            jore.stop_modes(stop.*, $5) AS mode,
            ST_AsMVTGeom(ST_Transform(point, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, false) AS geom
        FROM jore.stop stop
        WHERE point && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    ) AS rows`;

const routesQuery = `
    SELECT ST_AsMVT('routes', 4096, 'geom', rows)
    FROM (
        SELECT
            direction,
            route_id AS routeId,
            date_begin AS dateBegin,
            date_end AS dateEnd,
            mode,
            ST_AsMVTGeom(ST_Transform(geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.geometry geometry
        WHERE $5 between date_begin and date_end and ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    ) AS rows`;

const tileServer = new TileServer({ connectionString: process.env.PG_CONNECTION_STRING });

tileServer.addLayer({ name: "stops", query: stopsQuery });
tileServer.addLayer({ name: "routes", query: routesQuery });

tileServer.listen(3000);

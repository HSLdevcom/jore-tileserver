const TileServer = require('./server');

const regularStopsQuery = `
    SELECT ST_AsMVT(rows, 'stops', 4096, 'geom')
    FROM (
        SELECT
            stop.stop_id AS "stopId",
            stop.short_id AS "shortId",
            stop.name_fi AS "nameFi",
            stop.name_se AS "nameSe",
            jore.stop_modes(stop.*, $5) AS mode,
            ST_AsMVTGeom(ST_Transform(stop.point, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, false) AS geom
        FROM jore.stop stop
        WHERE EXISTS (
            SELECT departure.stop_id
            FROM jore.departure departure
            INNER JOIN jore.route route
            ON departure.route_id = route.route_id
            WHERE stop.stop_id = departure.stop_id
            AND route.type != '21'
        )
        AND stop.point && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    ) AS rows`;

const stopsQuery = `
    SELECT ST_AsMVT(rows, 'stops', 4096, 'geom')
    FROM (
        SELECT
            stop_id AS "stopId",
            short_id AS "shortId",
            name_fi AS "nameFi",
            name_se AS "nameSe",
            terminal_id AS "terminalId",
            jore.stop_modes(stop.*, $5) AS mode,
            ST_AsMVTGeom(ST_Transform(point, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, false) AS geom
        FROM jore.stop 
        WHERE point && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    ) AS rows`;

const regularRoutesQuery = `
    SELECT ST_AsMVT(rows, 'routes', 4096, 'geom')
    FROM (
        SELECT
            geometry.direction,
            geometry.route_id AS "routeId",
            geometry.date_begin AS "dateBegin",
            geometry.date_end AS "dateEnd",
            geometry.mode,
            jore.route_has_regular_day_departures(
              (
                select route
                from jore.route route
                where geometry.route_id = route.route_id
                  and geometry.direction = route.direction
                  and route.date_begin <= geometry.date_end
                  and route.date_end >= geometry.date_begin
              ),
              $5
          ) as "hasRegularDayDepartures",
            ST_AsMVTGeom(ST_Transform(geometry.geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.geometry geometry
        LEFT JOIN jore.route route
        ON geometry.route_id = route.route_id
        WHERE
            $5 between geometry.date_begin and geometry.date_end
            AND ST_Intersects(geometry.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
            AND route.type != '21'
    ) AS rows`;

const routesQuery = `
    SELECT ST_AsMVT(rows, 'routes', 4096, 'geom')
    FROM (
        SELECT
            direction,
            route_id AS "routeId",
            date_begin AS "dateBegin",
            date_end AS "dateEnd",
            mode,
            jore.route_has_regular_day_departures(
              (
                select route
                from jore.route route
                where geometry.route_id = route.route_id
                  and geometry.direction = route.direction
                  and route.date_begin <= geometry.date_end
                  and route.date_end >= geometry.date_begin
              ),
              $5
          ) as "hasRegularDayDepartures",
            ST_AsMVTGeom(ST_Transform(geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.geometry geometry
        WHERE $5 between date_begin and date_end and ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    ) AS rows`;

const terminalsQuery = `
    SELECT ST_AsMVT(rows, 'terminals', 4096, 'geom')
    FROM (
        SELECT
            terminal_id AS "terminalId",
            name_fi AS "nameFi",
            name_se AS "nameSe",
            jore.terminal_modes(terminal, $5) AS mode,
            ST_AsMVTGeom(ST_Transform(point, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, false) AS geom
        FROM
            jore.terminal terminal
        WHERE
            ST_Intersects(point, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    ) as rows`;

const tileServer = new TileServer({ connectionString: process.env.PG_CONNECTION_STRING });

tileServer.addLayer({ name: 'stops', query: stopsQuery });
tileServer.addLayer({ name: 'routes', query: routesQuery });
tileServer.addLayer({ name: 'terminals', query: terminalsQuery });
tileServer.addLayer({ name: 'regular-routes', query: regularRoutesQuery });
tileServer.addLayer({ name: 'regular-stops', query: regularStopsQuery });

tileServer.listen(3000);

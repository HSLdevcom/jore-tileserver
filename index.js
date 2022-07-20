const TileServer = require('./server');
const { PG_CONNECTION_STRING } = require('./constants');

const nearBusStopsQuery = `
    SELECT ST_AsMVT(rows, 'stops', 4096, 'geom')
    FROM (
        SELECT
            stop.stop_id AS "stopId",
            stop.short_id AS "shortId",
            stop.name_fi AS "nameFi",
            stop.name_se AS "nameSe",
            terminal_id AS "terminalId",
            stop.platform AS "platform",
            jore.stop_modes(stop.*, $5) AS mode,
            EXISTS(
                SELECT rs.stop_id
                FROM jore.route_segment rs
                INNER JOIN jore.route r ON r.route_id = rs.route_id AND r.date_begin = rs.date_begin AND r.date_end = rs.date_end AND r.direction = rs.direction
                INNER JOIN jore.line l ON r.line_id = l.line_id
                WHERE
                    l.trunk_route = '1' AND
                    rs.stop_id = stop.stop_id AND
                    CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs.date_begin AND rs.date_end END AND
                    CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN l.date_begin AND l.date_end END
            ) AS "isTrunkStop",
            ST_AsMVTGeom(ST_Transform(stop.point, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, false) AS geom
        FROM jore.stop stop
        WHERE EXISTS (
            SELECT departure.stop_id
            FROM jore.departure departure
            INNER JOIN jore.route route
            ON departure.route_id = route.route_id
            WHERE stop.stop_id = departure.stop_id
            AND route.type = '21'
        )
        AND stop.point && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    ) AS rows`;

const regularStopsQuery = `
    SELECT ST_AsMVT(rows, 'stops', 4096, 'geom')
    FROM (
        SELECT
            stop.stop_id AS "stopId",
            stop.short_id AS "shortId",
            stop.name_fi AS "nameFi",
            stop.name_se AS "nameSe",
            terminal_id AS "terminalId",
            stop.platform AS "platform",
            jore.stop_modes(stop.*, $5) AS mode,
            EXISTS(
                SELECT rs.stop_id
                FROM jore.route_segment rs
                INNER JOIN jore.route r ON r.route_id = rs.route_id AND r.date_begin = rs.date_begin AND r.date_end = rs.date_end AND r.direction = rs.direction
                INNER JOIN jore.line l ON r.line_id = l.line_id
                WHERE
                    l.trunk_route = '1' AND
                    rs.stop_id = stop.stop_id AND
                    CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs.date_begin AND rs.date_end END AND
                    CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN l.date_begin AND l.date_end END
            ) AS "isTrunkStop",
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
            stop.platform AS "platform",
            jore.stop_modes(stop.*, $5) AS mode,
            EXISTS(
                SELECT rs.stop_id
                FROM jore.route_segment rs
                INNER JOIN jore.route r ON r.route_id = rs.route_id AND r.date_begin = rs.date_begin AND r.date_end = rs.date_end AND r.direction = rs.direction
                INNER JOIN jore.line l ON r.line_id = l.line_id
                WHERE
                    l.trunk_route = '1' AND
                    rs.stop_id = stop.stop_id AND
                    CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs.date_begin AND rs.date_end END AND
                    CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN l.date_begin AND l.date_end END
            ) AS "isTrunkStop",
            ST_AsMVTGeom(ST_Transform(point, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, false) AS geom
        FROM jore.stop stop
        WHERE point && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    ) AS rows`;

const stopsByRoutesQuery = `
    SELECT ST_AsMVT(rows, 'stops', 4096, 'geom')
    FROM (
        SELECT
            s.stop_id AS "stopId",
            s.short_id AS "shortId",
            s.name_fi AS "nameFi",
            s.name_se AS "nameSe",
            s.terminal_id AS "terminalId",
            s.platform AS "platform",
            jore.stop_modes(s.*, $5) AS mode,
            EXISTS(
                SELECT rs.stop_id
                FROM jore.route_segment rs
                INNER JOIN jore.route r2 ON r2.route_id = rs.route_id AND r2.date_begin = rs.date_begin AND r2.date_end = rs.date_end AND r2.direction = rs.direction
                INNER JOIN jore.line l ON r2.line_id = l.line_id
                WHERE
                    l.trunk_route = '1' AND
                    rs.stop_id = s.stop_id AND
                    CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs.date_begin AND rs.date_end END AND
                    CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN l.date_begin AND l.date_end END AND
                    rs.route_id = r.route_id 
            ) AS "isTrunkStop",
            r.route_id AS "routeId",
            r.direction AS "direction",
            r.stop_index AS "stopIndex",
            r.timing_stop_type AS "timingStopType",
            ST_AsMVTGeom(ST_Transform(point, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, false) AS geom
        FROM jore.stop s
        LEFT JOIN jore.route_segment r ON r.stop_id = s.stop_id
        WHERE s.point && ST_MakeEnvelope($1, $2, $3, $4, 4326) AND CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN r.date_begin AND r.date_end END
    ) AS rows`;

const nearBusRoutesQuery = `
    SELECT ST_AsMVT(rows, 'routes', 4096, 'geom')
    FROM (
        SELECT
            r.direction,
            r.route_id AS "routeId",
            r.route_id_parsed AS "routeIdParsed",
            r.date_begin AS "dateBegin",
            r.date_end AS "dateEnd",
            g.mode,
            l.trunk_route,
            jore.route_has_regular_day_departures(r, $5) as "hasRegularDayDepartures",
            ST_AsMVTGeom(ST_Transform(g.geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.route r
        INNER JOIN jore.geometry g
        ON r.route_id = g.route_id AND r.route_id_parsed = g.route_id_parsed AND r.direction = g.direction AND r.date_begin = g.date_begin AND r.date_end = g.date_end
        LEFT JOIN jore.line l
        ON r.line_id = l.line_id AND $5 BETWEEN l.date_begin AND l.date_end
        WHERE
            $5 BETWEEN r.date_begin AND r.date_end
            AND ST_Intersects(g.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
            AND r.type = '21'
    ) AS rows`;

const regularRoutesQuery = `
    SELECT ST_AsMVT(rows, 'routes', 4096, 'geom')
    FROM (
        SELECT
            r.direction,
            r.route_id AS "routeId",
            r.route_id_parsed AS "routeIdParsed",
            r.date_begin AS "dateBegin",
            r.date_end AS "dateEnd",
            g.mode,
            l.trunk_route,
            jore.route_has_regular_day_departures(r, $5) as "hasRegularDayDepartures",
            ST_AsMVTGeom(ST_Transform(g.geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.route r
        INNER JOIN jore.geometry g
        ON r.route_id = g.route_id AND r.route_id_parsed = g.route_id_parsed AND r.direction = g.direction AND r.date_begin = g.date_begin AND r.date_end = g.date_end
        LEFT JOIN jore.line l
        ON r.line_id = l.line_id AND $5 BETWEEN l.date_begin AND l.date_end
        WHERE
            $5 between r.date_begin and r.date_end
            AND ST_Intersects(g.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
            AND r.type != '21'
    ) AS rows`;

const routesQuery = `
    SELECT ST_AsMVT(rows, 'routes', 4096, 'geom')
    FROM (
        SELECT
            r.direction,
            r.route_id AS "routeId",
            r.route_id_parsed AS "routeIdParsed",
            r.date_begin AS "dateBegin",
            r.date_end AS "dateEnd",
            g.mode,
            l.trunk_route,
            jore.route_has_regular_day_departures(r, $5) as "hasRegularDayDepartures",
            ST_AsMVTGeom(ST_Transform(geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.route r
        INNER JOIN jore.geometry g
        ON r.route_id = g.route_id AND r.route_id_parsed = g.route_id_parsed AND r.direction = g.direction AND r.date_begin = g.date_begin AND r.date_end = g.date_end
        LEFT JOIN jore.line l
        ON r.line_id = l.line_id AND $5 BETWEEN l.date_begin AND l.date_end
        WHERE
            $5 BETWEEN r.date_begin AND r.date_end
            AND ST_Intersects(g.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
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

const tileServer = new TileServer({ connectionString: PG_CONNECTION_STRING });

tileServer.addLayer({ name: 'stops', query: stopsQuery });
tileServer.addLayer({ name: 'routes', query: routesQuery });
tileServer.addLayer({ name: 'terminals', query: terminalsQuery });
tileServer.addLayer({ name: 'regular-routes', query: regularRoutesQuery });
tileServer.addLayer({ name: 'regular-stops', query: regularStopsQuery });
tileServer.addLayer({ name: 'near-bus-routes', query: nearBusRoutesQuery });
tileServer.addLayer({ name: 'near-bus-stops', query: nearBusStopsQuery });
tileServer.addLayer({ name: 'stops-by-routes', query: stopsByRoutesQuery });

tileServer.listen(3000);

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
                SELECT rs1.stop_id
                FROM jore.route_segment rs1
                INNER JOIN jore.route r ON r.route_id = rs1.route_id AND r.date_begin = rs1.date_begin AND r.date_end = rs1.date_end AND r.direction = rs1.direction
                INNER JOIN jore.line l ON r.line_id = l.line_id AND r.date_begin >= l.date_begin AND r.date_end <= l.date_end
                WHERE l.trunk_route = '1' AND rs1.stop_id = stop.stop_id AND CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs1.date_begin AND rs1.date_end END
            ) AS "isTrunkStop",
            TO_JSON(ARRAY(
                SELECT JSONB_BUILD_OBJECT('routeId', rs2.route_id, 'direction', rs2.direction, 'stopIndex', rs2.stop_index, 'isTimingStop', rs2.timing_stop_type != 0 )
                FROM jore.route_segment rs2
                WHERE rs2.stop_id = stop.stop_id AND CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs2.date_begin AND rs2.date_end END
           )) AS routes,
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
                SELECT rs1.stop_id
                FROM jore.route_segment rs1
                INNER JOIN jore.route r ON r.route_id = rs1.route_id AND r.date_begin = rs1.date_begin AND r.date_end = rs1.date_end AND r.direction = rs1.direction
                INNER JOIN jore.line l ON r.line_id = l.line_id AND r.date_begin >= l.date_begin AND r.date_end <= l.date_end
                WHERE l.trunk_route = '1' AND rs1.stop_id = stop.stop_id AND CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs1.date_begin AND rs1.date_end END
            ) AS "isTrunkStop",
            TO_JSON(ARRAY(
                SELECT JSONB_BUILD_OBJECT('routeId', rs2.route_id, 'direction', rs2.direction, 'stopIndex', rs2.stop_index, 'isTimingStop', rs2.timing_stop_type != 0 )
                FROM jore.route_segment rs2
                WHERE rs2.stop_id = stop.stop_id AND CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs2.date_begin AND rs2.date_end END
           )) AS routes,
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
                SELECT rs1.stop_id
                FROM jore.route_segment rs1
                INNER JOIN jore.route r ON r.route_id = rs1.route_id AND r.date_begin = rs1.date_begin AND r.date_end = rs1.date_end AND r.direction = rs1.direction
                INNER JOIN jore.line l ON r.line_id = l.line_id AND r.date_begin >= l.date_begin AND r.date_end <= l.date_end
                WHERE l.trunk_route = '1' AND rs1.stop_id = stop.stop_id AND CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs1.date_begin AND rs1.date_end END
            ) AS "isTrunkStop",
            TO_JSON(ARRAY(
                SELECT JSONB_BUILD_OBJECT('routeId', rs2.route_id, 'direction', rs2.direction, 'stopIndex', rs2.stop_index, 'isTimingStop', rs2.timing_stop_type != 0 )
                FROM jore.route_segment rs2
                WHERE rs2.stop_id = stop.stop_id AND CASE WHEN $5 IS NULL THEN TRUE ELSE $5 BETWEEN rs2.date_begin AND rs2.date_end END
           )) AS routes,
            ST_AsMVTGeom(ST_Transform(point, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, false) AS geom
        FROM jore.stop 
        WHERE point && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    ) AS rows`;

const nearBusRoutesQuery = `
    SELECT ST_AsMVT(rows, 'routes', 4096, 'geom')
    FROM (
        SELECT
            r.direction,
            r.route_id AS "routeId",
            r.date_begin AS "dateBegin",
            r.date_end AS "dateEnd",
            g.mode,
            l.trunk_route,
            jore.route_has_regular_day_departures(r, $5) as "hasRegularDayDepartures",
            ST_AsMVTGeom(ST_Transform(g.geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.route r
        INNER JOIN jore.geometry g
        ON r.route_id = g.route_id AND r.direction = g.direction AND r.date_begin = g.date_begin AND r.date_end = g.date_end
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
            r.date_begin AS "dateBegin",
            r.date_end AS "dateEnd",
            g.mode,
            l.trunk_route,
            jore.route_has_regular_day_departures(r, $5) as "hasRegularDayDepartures",
            ST_AsMVTGeom(ST_Transform(g.geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.route r
        INNER JOIN jore.geometry g
        ON r.route_id = g.route_id AND r.direction = g.direction AND r.date_begin = g.date_begin AND r.date_end = g.date_end
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
            r.date_begin AS "dateBegin",
            r.date_end AS "dateEnd",
            g.mode,
            l.trunk_route,
            jore.route_has_regular_day_departures(r, $5) as "hasRegularDayDepartures",
            ST_AsMVTGeom(ST_Transform(geom, 3857), ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3857), 4096, 0, true) AS geom
        FROM jore.route r
        INNER JOIN jore.geometry g
        ON r.route_id = g.route_id AND r.direction = g.direction AND r.date_begin = g.date_begin AND r.date_end = g.date_end
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

tileServer.listen(3000);

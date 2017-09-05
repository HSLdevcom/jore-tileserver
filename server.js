const path = require("path");
const express = require("express");
const { Pool } = require("pg");
const SphericalMercator = require("@mapbox/sphericalmercator");

class TileServer {
    constructor(pgOptions) {
        this.app = express();
        this.pool = new Pool(pgOptions);
        this.mercator = new SphericalMercator();

        this.app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }

    addLayer({ name, query }) {
        this.app.get(`/${name}/index.json`, (req, res) => {
            const protocol = req.headers["x-forwarded-proto"] || req.protocol;
            const host = req.headers["x-forwarded-host"] || req.headers.host;
            const directory = path.dirname(req.headers["x-forwarded-path"] || req.path);

            const tileJSON = {
                "tilejson": "2.2.0",
                "tiles": [`${protocol}://${host}${directory}/{z}/{x}/{y}.pbf`],
            };
            res.setHeader("Content-Type", "application/json");
            res.send(tileJSON);
        });

        this.app.get(`/${name}/:z/:x/:y.pbf`, (req, res) => {
            const bbox = this.mercator.bbox(req.params.x, req.params.y, req.params.z);
            const values = [...bbox, 4326];

            this.pool.query(query, values)
                .then((result) => {
                    res.setHeader("Content-Type", "application/x-protobuf");
                    res.send(result.rows[0].st_asmvt);
                })
                .catch((error) => {
                    console.error(error);
                });
        });
    }

    listen(port) {
        this.app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        });
    }
}

module.exports = TileServer;

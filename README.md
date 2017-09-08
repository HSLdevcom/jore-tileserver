# Jore Tile Server

Jore stops and routes as vector tiles

### Prerequisites

Start a PostGIS Docker container:
```
docker run -d —-name jore-postgis \
    -e POSTGRES_DB="postgres" \
    -e POSTGRES_USER="user" \
    -e POSTGRES_PASSWORD="mysecretpassword" \
    openmaptiles/postgis
```

Import data using [jore-graphql-import](https://github.com/HSLdevcom/jore-graphql-import)

### Install

Build the container:
```
docker build -t hsldevcom/jore-tileserver .
```

### Run

Start the server:
```
docker run --link jore-postgis -e "PG_CONNECTION_STRING=postgres://user:mysecretpassword@jore-postgis:5432/postgres" -p 3000:3000 hsldevcom/jore-tileserver
```

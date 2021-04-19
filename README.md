# COVID-19 Vaccine Spotter

A tool to help you track down COVID-19 vaccine appointment openings at your state's pharmacies. The code behind https://www.vaccinespotter.org.

## UI Development Setup

Requirements:

- Node.js 14+
- Yarn

This process is clunky right now, so my apologies.

1. Clone the repo: `git clone https://github.com/GUI/covid-vaccine-spotter.git`
2. Install dependencies (inside the repo): `yarn install` (if you encounter issues with node-libcurl, run `yarn add node-libcurl@next`)
3. Fetch data from the [API](https://www.vaccinespotter.org/api/) for the website to run: `yarn setup`
4. To run the development server for the website: `yarn dev`. The development site should then be available at http://localhost:3000/.

## DB and Backend Development Setup

docker-compose is used to bring up a local postgres DB. Then an image runs to bootstrap the database with states and postal codes. Finally, as an example of a backend task running, a container runs the `refresh-website` task.

```
docker-compose build
docker-compose up
```

To run additional tasks, you can use `docker-compose run`:

```
docker-compose run --rm --no-deps task_runner bin/refresh-cvs
```

## Very Beta API

All of the data being collected is published as JSON files here: https://www.vaccinespotter.org/api/

Subscribe to this discussion for any announcement of API changes: https://github.com/GUI/covid-vaccine-spotter/discussions/27

## License

This project is licensed under the terms of the [MIT license](./LICENSE.txt).

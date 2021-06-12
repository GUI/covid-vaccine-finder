# COVID-19 Vaccine Spotter

A tool to help you track down COVID-19 vaccine appointment openings at your state's pharmacies. The code behind https://www.vaccinespotter.org.


## Installation
Requirements:

- [Node.js 14+](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/)

1. Clone the repo: `git clone https://github.com/GUI/covid-vaccine-spotter.git`
2. Install dependencies (inside the repo): `yarn install`

## Frontend Development Setup
```bash
# install dependencies
$ yarn install

# serve with hot reload at localhost:3000
$ yarn dev

# build for production and launch server
$ yarn build
$ yarn start

# generate static project
$ yarn generate
```
The development site should then be available at http://localhost:3000/.

The front-end code for the website is available at [covid-vaccine-spotter/website](https://github.com/GUI/covid-vaccine-spotter/tree/main/website)

## Backend Development Setup
docker-compose is used to bring up a local postgres DB. Then an image runs to bootstrap the database with states and postal codes. Finally, as an example of a backend task running, a container runs the `refresh-website` task.

```
docker-compose build
docker-compose up
```

To run additional tasks, you can use `docker-compose run`:

```
docker-compose run --rm --no-deps task_runner bin/refresh-cvs
```

## Contributing
Pull requests are welcome! Currently aiming to expand pharmacy coverage and facilitate e-mail or text notifications for available appointments.

## Support
Email: vaccine@nickm.org

Twitter: [@nickblah](https://twitter.com/nickblah)

## Very Beta API

All of the data being collected is published as JSON files here: https://www.vaccinespotter.org/api/

Subscribe to this discussion for any announcement of API changes: https://github.com/GUI/covid-vaccine-spotter/discussions/27


## License

This project is licensed under the terms of the [MIT license](./LICENSE.txt).

# COVID-19 Vaccine Spotter

A tool to help you track down COVID-19 vaccine appointment openings at your state's pharmacies. The code behind https://www.vaccinespotter.org.

## Development Setup

Requirements:

- Node.js 14+
- Yarn

This process is clunky right now, so my apologies.

1. Clone the repo: `git clone https://github.com/GUI/covid-vaccine-spotter.git`
2. Install dependencies (inside the repo): `yarn install`
3. Fetch data from the [API](https://www.vaccinespotter.org/api/) for the website to run: `npm run dev`
NOTE: the script that fetches data from the API uses only a few files to get things running, but it's not an entire dataset. You can download other states data using the format provided in `scripts/setupDev.sh`
4. To run the development server for the website: `npm run serve`. The development site should then be available at http://localhost:8080/.

TODO: While this should cover running the website with existing, this doesn't cover running the database and other pieces necessary for working on the scanners or other backend pieces. Still need to document that part.

## Very Beta API

All of the data being collected is published as JSON files here: https://www.vaccinespotter.org/api/

Subscribe to this discussion for any announcement of API changes: https://github.com/GUI/covid-vaccine-spotter/discussions/27

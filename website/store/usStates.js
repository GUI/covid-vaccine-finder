import KDBush from "kdbush";
import geokdbush from "geokdbush";
import circle from "@turf/circle";
import bbox from "@turf/bbox";

const KM_TO_MILE = 0.621371;
const MILE_TO_KM = 1.60934;

export const state = () => ({
  usState: {
    type: "FeatureCollection",
    metadata: {
      code: null,
      name: null,
      bounding_box: null,
    },
    features: [],
  },
});

export const getters = {
  getMapZipCoords(state, getters, rootState) {
    let zipCoords;

    const queryZip = rootState.route.query.zip;
    if (queryZip) {
      zipCoords = rootState.postalCodes.postalCodes[queryZip];
    }

    return zipCoords;
  },

  getMapBounds(state, getters, rootState) {
    let bounds;

    const queryZip = rootState.route.query.zip;
    if (queryZip) {
      const queryZipCoords = rootState.postalCodes.postalCodes[queryZip];
      if (queryZipCoords) {
        const queryRadius = rootState.route.query.radius;
        if (queryRadius) {
          bounds = bbox(
            circle(queryZipCoords, parseInt(queryRadius, 10), {
              units: "miles",
            })
          );
        }
      }
    }

    if (!bounds && state.usState.metadata.bounding_box) {
      bounds = bbox(state.usState.metadata.bounding_box);
    }

    return bounds;
  },

  getFilterError(state, getters, rootState) {
    const queryZip = rootState.route.query.zip;
    if (queryZip) {
      const queryZipCoords = rootState.postalCodes.postalCodes[queryZip];
      if (!queryZipCoords) {
        return "Oops! We couldn't find that ZIP code in this state. Please double check it or try a different ZIP code.";
      }
    }

    return null;
  },

  getFilteredLocations(state, getters, rootState) {
    let locations = state.usState.features;

    const queryAppointmentType = rootState.route.query.appointment_type;
    const queryVaccineType = rootState.route.query.vaccine_type;
    const queryProvider = rootState.route.query.provider;
    const queryIncludeAll = rootState.route.query.include_all;
    locations = locations.filter((location) => {
      let include = true;

      if (
        queryAppointmentType &&
        !location.properties.appointment_types?.[queryAppointmentType]
      ) {
        include = false;
      }

      if (
        !queryAppointmentType &&
        queryIncludeAll !== "true" &&
        !location.properties.appointment_types?.all_doses &&
        !location.properties.appointment_types?.unknown
      ) {
        include = false;
      }

      if (
        queryVaccineType &&
        !location.properties.appointment_vaccine_types?.[queryVaccineType]
      ) {
        include = false;
      }

      if (
        queryProvider &&
        location.properties.provider_brand_id !== parseInt(queryProvider, 10)
      ) {
        include = false;
      }

      if (
        queryIncludeAll !== "true" &&
        !location.properties.appointments_available
      ) {
        include = false;
      }

      return include;
    });

    const queryZip = rootState.route.query.zip;
    if (queryZip) {
      const queryZipCoords = rootState.postalCodes.postalCodes[queryZip];
      if (!queryZipCoords) {
        locations = [];
      } else {
        let radius;
        const queryRadius = rootState.route.query.radius;
        if (queryRadius) {
          radius = parseInt(queryRadius, 10) * MILE_TO_KM;
        }

        const locationsIndex = new KDBush(
          locations,
          (l) => l.geometry.coordinates[0],
          (l) => l.geometry.coordinates[1]
        );
        locations = geokdbush.around(
          locationsIndex,
          queryZipCoords[0],
          queryZipCoords[1],
          undefined,
          radius
        );

        locations = locations.map((feature) => {
          let distance =
            geokdbush.distance(
              queryZipCoords[0],
              queryZipCoords[1],
              feature.geometry.coordinates[0],
              feature.geometry.coordinates[1]
            ) * KM_TO_MILE;

          if (distance < 10) {
            distance = distance.toFixed(1);
          } else {
            distance = distance.toFixed(0);
          }

          return {
            ...feature,
            distance,
          };
        });

        locations.sort((a, b) => a.distance - b.distance);
      }
    }

    return locations;
  },

  getSearchFilters(state, getters, rootState) {
    return {
      queryAppointmentType: rootState.route.query.appointment_type,
      queryVaccineType: rootState.route.query.vaccine_type,
      queryProvider: rootState.route.query.provider,
      queryIncludeAll: rootState.route.query.include_all,
    };
  },
};

export const mutations = {
  set(state, usState) {
    state.usState = Object.freeze(usState);
  },
};

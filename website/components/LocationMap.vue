<template>
  <div class="sticky-top sticky-navbar-offset">
    <div id="map" style="width: 100%"></div>
    <div id="legend" class="map-overlay">
      <div>
        <img src="~/assets/map-icon-circle.svg?data" alt="" />
        {{ $t("Appointments recently available") }}
      </div>
      <div>
        <img src="~/assets/map-icon-diamond.svg?data" alt="" />
        {{ $t("Appointments not available") }}
      </div>
      <div>
        <img src="~/assets/map-icon-square.svg?data" alt="" />
        {{ $t("Appointment status unknown") }}
      </div>
    </div>
  </div>
</template>

<script>
import { Map, Marker, Popup } from "maplibre-gl";
import Vue from "vue";
import LocationMapPopup from "./LocationMapPopup.vue";
import mapIconCircle from "~/assets/map-icon-circle.svg?data";
import mapIconDiamond from "~/assets/map-icon-diamond.svg?data";
import mapIconSquare from "~/assets/map-icon-square.svg?data";

export default {
  data() {
    return {
      mapLoaded: false,
    };
  },

  computed: {
    mapBounds() {
      return this.$store.getters["usStates/getMapBounds"];
    },

    locationData() {
      return this.$store.state.usStates.usState;
    },

    zipCoords() {
      return this.$store.getters["usStates/getMapZipCoords"];
    },
  },

  watch: {
    mapBounds() {
      this.mapBoundsUpdated = false;
      this.setMapBounds();
    },

    locationData() {
      this.mapDataUpdated = false;
      this.setMapData();
    },

    mapLoaded() {
      this.setMapData();
      this.setMapBounds();
    },

    zipCoords() {
      if (this.zipMarker) {
        if (this.zipCoords) {
          this.zipMarker.setLngLat(this.zipCoords).addTo(this.map);
        } else {
          this.zipMarker.remove();
        }
      }
    },
  },

  mounted() {
    this.map = new Map({
      container: "map",
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      bounds: this.mapBounds,
      fitBoundsOptions: {
        padding: 10,
      },
    });

    const mapIconCircleImg = new Image(36, 36);
    mapIconCircleImg.onload = () =>
      this.map.addImage("icon-circle", mapIconCircleImg);
    mapIconCircleImg.src = mapIconCircle;

    const mapIconDiamondImg = new Image(36, 36);
    mapIconDiamondImg.onload = () =>
      this.map.addImage("icon-diamond", mapIconDiamondImg);
    mapIconDiamondImg.src = mapIconDiamond;

    const mapIconSquareImg = new Image(36, 36);
    mapIconSquareImg.onload = () =>
      this.map.addImage("icon-square", mapIconSquareImg);
    mapIconSquareImg.src = mapIconSquare;

    this.map.on("load", () => {
      this.map.addSource("locations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
      this.mapSource = this.map.getSource("locations");

      this.zipMarker = new Marker();

      this.map.addLayer({
        id: "locations",
        source: "locations",
        type: "symbol",
        layout: {
          "icon-image": [
            "match",
            ["to-string", ["get", "appointments_available_all_doses"]],
            "true",
            "icon-circle",
            "false",
            "icon-diamond",
            "icon-square",
          ],
          "icon-ignore-placement": true,
          "icon-allow-overlap": true,
          "icon-size": [
            "interpolate",
            ["exponential", 1.5],
            ["zoom"],
            0,
            [
              "match",
              ["to-string", ["get", "appointments_available_all_doses"]],
              "true",
              0.25,
              "false",
              0.125,
              0.125,
            ],
            5,
            [
              "match",
              ["to-string", ["get", "appointments_available_all_doses"]],
              "true",
              0.5,
              "false",
              0.3125,
              0.3125,
            ],
            16,
            [
              "match",
              ["to-string", ["get", "appointments_available_all_doses"]],
              "true",
              1.0,
              "false",
              0.625,
              0.625,
            ],
          ],
          "symbol-z-order": "source",
        },
        paint: {
          "icon-opacity": 0.8,
        },
      });

      this.map.on("mouseenter", "locations", () => {
        this.map.getCanvas().style.cursor = "pointer";
      });

      this.map.on("mouseleave", "locations", () => {
        this.map.getCanvas().style.cursor = "";
      });

      this.map.on("click", "locations", (e) => {
        const store = e.highlightLocationId
          ? e.features.find(
              (feature) => feature.properties.id === e.highlightLocationId
            )
          : e.features[0];
        const coordinates = store.geometry.coordinates.slice();

        // Nested JSON data in the properties is represented as JSON strings
        // (rather than actual objects) when fetching the object from the click
        // event: https://github.com/mapbox/mapbox-gl-js/issues/2434 So
        // manually parse these nested fields into the proper objects.
        if (store?.properties) {
          store.properties = {
            ...store.properties,
          };
          const keys = Object.keys(store.properties);
          for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            const value = store.properties[key];
            if (typeof value === "string") {
              try {
                store.properties[key] = JSON.parse(value);
              } catch (err) {}
            }
          }
        }

        const app = new Vue({
          ...LocationMapPopup,
          i18n: this.$i18n,
          propsData: {
            store,
          },
        }).$mount();
        const description = app.$el.outerHTML;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new Popup({ maxWidth: "400px" })
          .setLngLat(coordinates)
          .setHTML(description)
          .addTo(this.map);
      });

      this.mapLoaded = true;
    });
  },

  methods: {
    setMapData() {
      if (
        this.mapLoaded &&
        this.mapSource &&
        this.locationData &&
        !this.mapDataUpdated
      ) {
        this.mapSource.setData(this.locationData);
        this.mapDataUpdated = true;
      }
    },

    setMapBounds() {
      if (
        this.mapLoaded &&
        this.map &&
        this.mapBounds &&
        !this.mapBoundsUpdated
      ) {
        this.map.fitBounds(this.mapBounds, {
          padding: 10,
          animate: !!this.mapBoundsAnimate,
        });
        this.mapBoundsUpdated = true;
        this.mapBoundsAnimate = true;
      }
    },

    highlightLocation(store) {
      const [lng, lat] = store.geometry.coordinates;
      this.map.panTo(
        {
          lon: lng,
          lat,
        },
        {
          duration: 250,
        }
      );
      setTimeout(() => {
        this.map.fire("click", {
          lngLat: {
            lng,
            lat,
          },
          highlightLocationId: store.properties.id,
        });
      }, 500);
    },
  },
};
</script>

<style>
@import "maplibre-gl/dist/maplibre-gl.css";

.sticky-navbar-offset {
  top: 54px;
}

.mapboxgl-map {
  font: unset;
  color: unset;
}

#map {
  border-width: 1px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.125);
  height: 370px;
  border-radius: 4px;
}

.map-overlay {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.9);
  margin-right: 5px;
  font-family: Arial, sans-serif;
  overflow: auto;
  border-radius: 3px;
}

#legend {
  padding: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  line-height: 16px;
  display: table;
  width: 210px;
  font-size: 0.75rem;
  top: 0px;
  margin-top: 5px;
}

#legend img {
  opacity: 0.8;
}

@media (min-width: 992px) {
  #map {
    height: calc(100vh - 54px) !important;
    border-left-width: 0px;
    border-radius: 0px;
  }
}
</style>

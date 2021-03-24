<template>
  <div class="mb-3">
    <ul class="mb-0">
      <template v-if="initialAppointments.length > 0">
        <li v-for="appointment in initialAppointments" :key="appointment.id">
          {{ appointment.time }}
          <span v-show="appointment.type">({{ appointment.type }})</span>
        </li>
      </template>
      <li v-else>
        View available appointment times on the
        {{ store.properties.provider_brand_name }} website.
      </li>
    </ul>

    {{ /* Use v-show, not v-if for conditions without "else". Otherwise, strange things happen in production that cause rendering to fail (if the page is reloaded with a zip code pre-filled): https://github.com/nuxt/nuxt.js/issues/5800 */ }}
    <div v-show="moreAppointments.length > 0">
      <div :id="`location-${store.properties.id}-more-appointments-toggle`">
        <a
          href="#"
          :onclick="`document.getElementById('location-${store.properties.id}-more-appointments').style.display = 'block'; document.getElementById('location-${store.properties.id}-more-appointments-toggle').style.display = 'none'; return false;`"
          >View {{ moreAppointments.length }} other appointment times</a
        >
      </div>

      <ul
        :id="`location-${store.properties.id}-more-appointments`"
        class="mb-0"
        style="display: none"
      >
        <li v-for="appointment in moreAppointments" :key="appointment.id">
          {{ appointment.time }}
          <span v-show="appointment.type">({{ appointment.type }})</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { DateTime } from "luxon";

export default {
  props: {
    store: {
      type: Object,
      required: true,
    },
  },

  head() {
    return {
      bodyAttrs: {
        class: this.withReload ? "has-navbar-with-reload" : "",
      },
    };
  },

  computed: {
    initialAppointments() {
      if (!this.store.properties.appointments) {
        return [];
      }

      const lastFetched = DateTime.fromISO(
        this.store.properties.appointments_last_fetched,
        {
          setZone: true,
        }
      );
      return this.normalizeAppointments(
        this.store.properties.appointments
          .filter((item) => {
            return this.asDate(item.time) >= lastFetched;
          })
          .slice(0, 5)
      );
    },

    moreAppointments() {
      if (!this.store.properties.appointments) {
        return [];
      }

      const lastFetched = DateTime.fromISO(
        this.store.properties.appointments_last_fetched,
        {
          setZone: true,
        }
      );
      return this.normalizeAppointments(
        this.store.properties.appointments
          .filter((item) => {
            return this.asDate(item.time) >= lastFetched;
          })
          .slice(5)
      );
    },
  },

  methods: {
    formatTime(time) {
      return this.asDate(time).toLocaleString(DateTime.DATETIME_SHORT);
    },

    formatDate(date) {
      return this.asDate(date).toLocaleString(DateTime.DATE_SHORT);
    },

    asDate(date) {
      return DateTime.fromISO(date, { setZone: true });
    },

    normalizeAppointments(appointments) {
      return appointments.map((appointment) => {
        let normalized;

        if (appointment.time && appointment.type) {
          let { type } = appointment;
          switch (type) {
            case "both_doses":
              type = "First Dose";
              break;
            case "second_dose_moderna":
              type = "Second Dose Only - Moderna";
              break;
            case "second_dose_pfizer":
              type = "Second Dose Only - Pfizer";
              break;
            default:
              type = appointment.type;
              break;
          }

          normalized = {
            time: this.formatTime(appointment.time),
            type,
          };
        } else if (appointment.date && appointment.type) {
          normalized = {
            time: this.formatDate(appointment.date),
            type: appointment.type,
          };
        } else if (appointment.date) {
          normalized = {
            time: this.formatDate(appointment.date),
            type: null,
          };
        } else {
          normalized = {
            time: this.formatTime(appointment),
            type: null,
          };
        }

        normalized.id = `${normalized.time}-${normalized.type}`;

        return normalized;
      });
    },
  },
};
</script>

<style></style>

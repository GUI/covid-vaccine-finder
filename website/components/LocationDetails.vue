<template>
  <div>
    <div v-if="store.properties.appointments_available === true">
      <div class="location-status text-success d-flex align-items-center">
        <font-awesome-icon icon="check-circle" class="me-2" />
        <span>
          <span class="d-inline-block">{{
            $t("Appointments available as of")
          }}</span>
          <span class="d-inline-block">
            <display-local-time
              :time="appointmentsLastModifiedDate"
              :iso="$i18n.localeProperties.iso"
          /></span>
        </span>
      </div>
      <appointment-times :store="store" />

      <a
        :href="store.properties.url"
        class="btn btn-primary"
        target="_blank"
        :rel="providerBrandUrlRel"
        >{{
          $t("Visit {name} Website", {
            name: store.properties.provider_brand_name,
          })
        }}
        <font-awesome-icon icon="arrow-alt-circle-right" />
      </a>

      <a
        :href="directionsLink"
        class="btn btn-primary"
        target="_blank"
        :rel="noopener"
      >
        {{ $t("Get Directions") }}
        <font-awesome-icon icon="directions" />
      </a>
    </div>
    <div v-else class="location-status">
      <div v-if="store.properties.appointments_available === false">
        <p class="text-danger">
          <font-awesome-icon icon="times-circle" />
          {{ $t("No appointments available as of last check") }}
        </p>
      </div>
      <div v-else>
        <p>
          <font-awesome-icon icon="times-circle" />
          {{ $t("Unknown status") }}
        </p>
        <p v-if="store.properties.carries_vaccine === false">
          {{
            $t(
              "At last check, this location does not carry the vaccine at all, so we have not fetched any appointments."
            )
          }}
        </p>
        <p v-else-if="store.properties.appointments_last_fetched === null">
          {{ $t("We haven't collected any data for this pharmacy yet.") }}
        </p>
        <!-- eslint-disable vue/no-v-html -->
        <p
          v-else
          v-html="
            $t(
              '<strong>Uh oh!</strong> The data for this pharmacy is old. Please visit the <a href=\u0022{link}\u0022 target=\u0022_blank\u0022 rel=\u0022noopener\u0022>pharmacy\'s website</a> directly for appointment availability. this likely means that the pharmacy is blocking our tool from accessing their website.',
              { link: store.properties.url }
            )
          "
        />
        <!-- eslint-enable vue/no-v-html -->
      </div>
      <p>
        <a
          :href="store.properties.url"
          target="_blank"
          :rel="providerBrandUrlRel"
          >{{
            $t("Visit {name} Website", {
              name: store.properties.provider_brand_name,
            })
          }}
          <font-awesome-icon icon="external-link-alt"
        /></a>
      </p>
      <p>
        <a :href="directionsLink" target="_blank" :rel="noopener">
          {{ $t("Get Directions") }}
          <font-awesome-icon icon="external-link-alt" />
        </a>
      </p>
    </div>

    <p class="card-text text-secondary mt-2">
      <small
        >{{ $t("Last checked") }}
        <display-local-time
          v-if="store.properties.appointments_last_fetched"
          :time="appointmentsLastFetchedDate"
          :iso="$i18n.localeProperties.iso"
        />
        <span v-if="!store.properties.appointments_last_fetched">{{
          $t("never")
        }}</span></small
      >
    </p>
  </div>
</template>

<script>
export default {
  props: {
    store: {
      type: Object,
      required: true,
    },
  },

  computed: {
    appointmentsLastFetchedDate() {
      return new Date(this.store.properties.appointments_last_fetched);
    },

    appointmentsLastModifiedDate() {
      return new Date(this.store.properties.appointments_last_modified);
    },

    providerBrandUrlRel() {
      let rel = "noopener";
      // Walgreens seems to be blocking links from certain referrers if you
      // haven't first visited walgreens.com and have cookies.
      if (this.store.properties.provider === "walgreens") {
        rel += " noreferrer";
      }

      return rel;
    },

    directionsLink() {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        [
          this.store.properties.address,
          this.store.properties.city,
          [this.store.properties.state, this.store.properties.postal_code]
            .filter((value) => !!value)
            .join(", "),
        ]
          .filter((value) => !!value)
          .join(", ")
      )}`;
    },
  },
};
</script>

<style>
.location-status {
  line-height: 120%;
  margin-bottom: 0.6rem;
}

.text-warning {
  color: #d99011 !important;
}

.location-status.text-success {
  font-size: 1.25rem;
}

.location-status.text-success svg {
  font-size: 2rem;
}
</style>

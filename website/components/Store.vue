<template>
  <div class="card mb-4 location-result">
    <a :id="`location-${store.properties.id}`" class="location-anchor" />
    <div class="card-header">
      <div class="row">
        <h5 class="col-sm mb-0">
          {{ title }} -
          <a :href="`${fullAddressLink}`" target="_blank">
            {{ fullAddress }}
          </a>
        </h5>
        <div v-if="store.distance" class="col-sm-auto">
          {{ $t("{distance} miles", { distance: store.distance }) }}
        </div>
      </div>
    </div>
    <div class="card-body">
      <location-details :store="store" />
    </div>
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
    title() {
      let title = this.store.properties.provider_brand_name;
      if (
        this.store.properties.provider_brand === "centura_driveup_event" ||
        this.store.properties.provider_brand === "comassvax" ||
        this.store.properties.provider_brand === "costco" ||
        this.store.properties.provider_brand === "health_mart"
      ) {
        title += ` - ${this.store.properties.name}`;
      }

      return title;
    },

    fullAddress() {
      return [
        this.store.properties.address,
        this.store.properties.city,
        [this.store.properties.state, this.store.properties.postal_code]
          .filter((value) => !!value)
          .join(", "),
      ]
        .filter((value) => !!value)
        .join(", ");
    },

    fullAddressLink() {
      let link = "https://www.google.com/maps/place/";
      link += `${this.fullAddress}`.replace(/ /g, "+");
      return link;
    },
  },
};
</script>

<style></style>

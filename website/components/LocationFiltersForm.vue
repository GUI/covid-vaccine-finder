<template>
  <form class="row g-2 location-filters" @submit.prevent="submitForm">
    <div class="col-sm">
      <div class="row g-2">
        <div class="col-sm">
          <label for="zip" class="form-label">{{
            $t("Search for appointments near")
          }}</label>
          <input
            id="zip"
            v-model="queryZip"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            name="zip"
            class="form-control form-control-lg"
            :placeholder="$t('Enter a 5 digit ZIP code')"
            @change="submitForm"
          />
        </div>
        <div class="col-sm-auto">
          <label for="radius" class="form-label">{{ $t("Within") }}</label>
          <select
            id="radius"
            v-model="queryRadius"
            name="radius"
            class="form-select form-select-lg mb-3"
            @change="submitForm"
          >
            <option value="">{{ $t("Any distance") }}</option>
            <option value="5">
              {{ $t("{distance} miles", { distance: 5 }) }}
            </option>
            <option value="10">
              {{ $t("{distance} miles", { distance: 10 }) }}
            </option>
            <option value="25">
              {{ $t("{distance} miles", { distance: 25 }) }}
            </option>
            <option value="50">
              {{ $t("{distance} miles", { distance: 50 }) }}
            </option>
            <option value="100">
              {{ $t("{distance} miles", { distance: 100 }) }}
            </option>
          </select>
        </div>
      </div>
      <div class="row align-items-center">
        <div class="col-sm">
          <label for="appointment_type" class="form-label form-label-sm">{{
            $t("Appointment type")
          }}</label>
          <select
            id="appointment_type"
            v-model="queryAppointmentType"
            name="appointment_type"
            class="form-select form-select-sm mb-3"
            @change="submitForm"
          >
            <option value="">
              {{ $t("All doses") }}
            </option>
            <option value="2nd_dose_only">
              {{ $t("Second dose only") }}
            </option>
          </select>
        </div>
        <div class="col-sm">
          <label for="vaccine_type" class="form-label form-label-sm">{{
            $t("Vaccine type")
          }}</label>
          <select
            id="vaccine_type"
            v-model="queryVaccineType"
            name="vaccine_type"
            class="form-select form-select-sm mb-3"
            @change="submitForm"
          >
            <option value="">
              {{ $t("All") }}
            </option>
            <option value="jj">
              {{ $t("Johnson and Johnson") }}
            </option>
            <option value="moderna">
              {{ $t("Moderna") }}
            </option>
            <option value="pfizer">
              {{ $t("Pfizer") }}
            </option>
            <option value="unknown">
              {{ $t("Unknown") }}
            </option>
          </select>
        </div>
        <div class="col-sm">
          <label for="provider" class="form-label form-label-sm">{{
            $t("Pharmacy (multi-selct)")
          }}</label>
          <select
            id="provider"
            v-model="queryProvider"
            multiple
            name="provider"
            class="form-select form-select-sm mb-3"
            @change="submitForm"
          >
            <option value="">{{ $t("All") }}</option>
            <option
              v-for="providerBrand in $store.state.usStates.usState.metadata
                .provider_brands"
              :key="providerBrand.id"
              :value="providerBrand.id"
            >
              {{ providerBrand.name }}
            </option>
          </select>
        </div>
        <div class="col-xl-auto">
          <div class="form-check">
            <input
              id="include_all"
              v-model="queryIncludeAll"
              name="include_all"
              value="true"
              class="form-check-input"
              type="checkbox"
              @change="submitForm"
            />
            <label class="form-check-label" for="include_all">
              {{ $t("Show locations without current appointments") }}
            </label>
          </div>
        </div>
      </div>
    </div>
    <div class="col-auto">
      <button type="submit" class="btn btn-primary btn-lg">
        {{ $t("Search") }}
      </button>
    </div>
  </form>
</template>

<script>
export default {
  data() {
    return {
      pendingQueryParams: {},
    };
  },

  computed: {
    queryZip: {
      get() {
        return this.$route.query.zip || "";
      },
      set(value) {
        this.pendingQueryParams.zip = value;
      },
    },

    queryRadius: {
      get() {
        return this.$route.query.radius || "";
      },
      set(value) {
        this.pendingQueryParams.radius = value;
      },
    },

    queryAppointmentType: {
      get() {
        return this.$route.query.appointment_type || "";
      },
      set(value) {
        this.pendingQueryParams.appointment_type = value;
      },
    },

    queryVaccineType: {
      get() {
        return this.$route.query.vaccine_type || "";
      },
      set(value) {
        this.pendingQueryParams.vaccine_type = value;
      },
    },

    queryProvider: {
      get() {
        const providers = this.$route.query.provider;
        return providers || [""];
      },
      set(value) {
        if (value.includes("")) {
          const allValues = [];
          this.$store.state.usStates.usState.metadata.provider_brands.forEach(
            (providerBrand) => {
              allValues.push(providerBrand.id);
            }
          );
          this.pendingQueryParams.provider = allValues;
        } else {
          this.pendingQueryParams.provider = value;
        }
      },
    },

    queryIncludeAll: {
      get() {
        return this.$route.query.include_all || false;
      },
      set(value) {
        this.pendingQueryParams.include_all = value;
      },
    },
  },

  methods: {
    submitForm() {
      const newQuery = { ...this.$route.query, ...this.pendingQueryParams };

      if (newQuery.zip === "") {
        delete newQuery.zip;
      }

      if (newQuery.radius === "") {
        delete newQuery.radius;
      }

      if (newQuery.appointment_type === "") {
        delete newQuery.appointment_type;
      }

      if (newQuery.vaccine_type === "") {
        delete newQuery.vaccine_type;
      }

      if (newQuery.provider === "") {
        delete newQuery.provider;
      }

      if (newQuery.include_all === false) {
        delete newQuery.include_all;
      }

      this.$router.push({
        path: this.$route.path,
        query: newQuery,
      });
      this.pendingQueryParams = {};
    },
  },
};
</script>

<style>
.location-filters {
  margin-bottom: 1rem;
}

.location-filters .form-label {
  font-weight: bold;
  margin-bottom: 0.2rem;
}

.location-filters .form-label-sm {
  font-size: 0.875rem;
}

@media (min-width: 576px) {
  .location-filters .btn-primary {
    margin-top: 1.6rem;
  }
}
</style>

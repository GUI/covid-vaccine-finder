import Vue from "vue";
import { library, config } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faArrowAltCircleRight,
  faBars,
  faCheckCircle,
  faChevronLeft,
  faChevronRight,
  faDirections,
  faExclamationTriangle,
  faTimesCircle,
  faExternalLinkAlt,
  faRedoAlt,
} from "@fortawesome/free-solid-svg-icons";

// This is important, we are going to let Nuxt.js worry about the CSS
config.autoAddCss = false;

// You can add your icons directly in this plugin. See other examples for how you
// can add other styles or just individual icons.
library.add(
  faArrowAltCircleRight,
  faBars,
  faCheckCircle,
  faChevronLeft,
  faChevronRight,
  faDirections,
  faExclamationTriangle,
  faTimesCircle,
  faExternalLinkAlt,
  faRedoAlt
);

// Register the component globally
Vue.component("FontAwesomeIcon", FontAwesomeIcon);

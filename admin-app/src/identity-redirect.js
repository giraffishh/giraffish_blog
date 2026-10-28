import { callbackDestination } from './identity-callback.js';
const destination = callbackDestination(window.location);
if (destination) window.location.replace(destination);

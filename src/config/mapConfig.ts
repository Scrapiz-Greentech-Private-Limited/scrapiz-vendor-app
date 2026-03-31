/**
 * Map Configuration for Scrapiz Application
 * Centralized settings for Mapbox, Ola Maps (Krutrim), and Google APIs.
 */

export const MAP_CONFIG = {
  // Center of Mumbai [Longitude, Latitude]
  DEFAULT_CENTER: [72.8295, 19.0596] as [number, number],
  
  // Map Style (Hybrid: Satellite + Streets)
  DEFAULT_MAP_STYLE: 'mapbox://styles/mapbox/satellite-streets-v12',
  
  // Map Settings
  SETTINGS: {
    DEFAULT_ZOOM: 18, // Rooftop precision
    SEARCH_DEBOUNCE: 500, // ms
    ANIMATION_DURATION: 1000, // ms
  },

  // API Endpoints & Builders
  getGoogleReverseGeocodeUrl: (lat: number, lng: number, apiKey: string) =>
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,

  getKrutrimAutocompleteUrl: (query: string, apiKey: string) =>
    `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(query)}&api_key=${apiKey}`,

  getKrutrimReverseGeocodeUrl: (lat: number, lng: number, apiKey: string) =>
    `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${apiKey}`,
};

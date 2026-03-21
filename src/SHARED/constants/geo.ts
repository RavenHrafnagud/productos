/**
 * Catalogo geografico dinamico basado en country-state-city.
 * - Cubre paises y ciudades globales.
 * - Localidades priorizan barrios/municipios por ciudad (con fallback).
 * - Incluye filtros para evitar selects gigantes en movil.
 */
import { City, Country, State } from 'country-state-city';

export interface GeoOption {
  value: string;
  label: string;
}

interface GeoQueryOptions {
  query?: string;
  limit?: number;
}

const DEFAULT_CITY_LIMIT = 350;
const DEFAULT_LOCALITY_LIMIT = 250;

const countryCache = new Map<string, GeoOption[]>();
const cityCache = new Map<string, GeoOption[]>();
const stateCache = new Map<string, GeoOption[]>();
const municipalityCache = new Map<string, GeoOption[]>();

const CURATED_CITY_LOCALITIES: Record<string, string[]> = {
  'CO|bogota': [
    'Usaquen',
    'Chapinero',
    'Santa Fe',
    'San Cristobal',
    'Usme',
    'Tunjuelito',
    'Bosa',
    'Kennedy',
    'Fontibon',
    'Engativa',
    'Suba',
    'Barrios Unidos',
    'Teusaquillo',
    'Los Martires',
    'Antonio Narino',
    'Puente Aranda',
    'La Candelaria',
    'Rafael Uribe Uribe',
    'Ciudad Bolivar',
    'Sumapaz',
  ],
  'CO|medellin': [
    'El Poblado',
    'Laureles',
    'Belen',
    'Aranjuez',
    'Manrique',
    'Castilla',
    'Robledo',
    'San Javier',
    'Guayabal',
    'Buenos Aires',
  ],
  'CO|cali': [
    'Comuna 1',
    'Comuna 2',
    'Comuna 3',
    'Comuna 4',
    'Comuna 5',
    'Comuna 6',
    'Comuna 10',
    'Comuna 13',
    'Comuna 17',
    'Comuna 22',
  ],
  'CO|barranquilla': [
    'Riomar',
    'Norte Centro Historico',
    'Metropolitana',
    'Sur Occidente',
    'Sur Oriente',
  ],
  'CO|cartagena': [
    'Bocagrande',
    'Centro Historico',
    'Getsemani',
    'Manga',
    'Pie de la Popa',
  ],
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeCityKey(value: string) {
  return normalizeText(value)
    .replace(/\bd\.?\s*c\.?\b/g, ' ')
    .replace(/\bdistrito\s+(capital|federal)\b/g, ' ')
    .replace(/\b(city|ciudad|municipio)\s+de\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compareByLabel(a: GeoOption, b: GeoOption) {
  return a.label.localeCompare(b.label, 'es');
}

function uniqueByValue(options: GeoOption[]) {
  const map = new Map<string, GeoOption>();
  for (const option of options) {
    if (!map.has(option.value)) {
      map.set(option.value, option);
    }
  }
  return [...map.values()];
}

function buildCityKey(countryCode: string, cityName: string) {
  return `${countryCode.trim().toUpperCase()}|${normalizeCityKey(cityName)}`;
}

function toGeoOptions(values: string[]) {
  return uniqueByValue(
    values
      .map((value) => value.trim())
      .filter((value) => value !== '')
      .map((value) => ({ value, label: value })),
  ).sort(compareByLabel);
}

function applyQueryAndLimit(options: GeoOption[], queryOptions: GeoQueryOptions, defaultLimit: number) {
  const normalizedQuery = normalizeText(queryOptions.query ?? '');
  const queryLength = normalizedQuery.length;
  const useUnboundedResults = queryLength >= 2;
  const limit = Math.max(1, queryOptions.limit ?? (useUnboundedResults ? Number.MAX_SAFE_INTEGER : defaultLimit));
  const filtered =
    normalizedQuery === ''
      ? options
      : options.filter((option) => normalizeText(option.label).includes(normalizedQuery));
  return Number.isFinite(limit) ? filtered.slice(0, limit) : filtered;
}

function getCountryCatalog() {
  const cacheKey = 'ALL';
  const cached = countryCache.get(cacheKey);
  if (cached) return cached;

  const options = Country.getAllCountries()
    .map((country) => ({
      value: country.isoCode,
      label: country.name,
    }))
    .sort(compareByLabel);

  countryCache.set(cacheKey, options);
  return options;
}

function getCityCatalogByCountry(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  if (!code) return [];
  const cached = cityCache.get(code);
  if (cached) return cached;
  const cities = City.getCitiesOfCountry(code) ?? [];

  const options = uniqueByValue(
    cities.map((city) => ({
      value: city.name,
      label: city.name,
    })),
  ).sort(compareByLabel);

  cityCache.set(code, options);
  return options;
}

function getStateCatalogByCountry(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  if (!code) return [];
  const cached = stateCache.get(code);
  if (cached) return cached;

  const options = uniqueByValue(
    State.getStatesOfCountry(code).map((state) => ({
      value: state.name,
      label: state.name,
    })),
  ).sort(compareByLabel);

  stateCache.set(code, options);
  return options;
}

function getCuratedLocalityCatalog(countryCode: string, cityName: string) {
  if (!countryCode || !cityName) return [];
  const key = buildCityKey(countryCode, cityName);
  const values = CURATED_CITY_LOCALITIES[key];
  if (!values) return [];
  return toGeoOptions(values);
}

function getMunicipalityCatalogByCountryAndCity(countryCode: string, cityName: string) {
  const code = countryCode.trim().toUpperCase();
  const normalizedCity = normalizeCityKey(cityName);
  if (!code || !normalizedCity) return [];

  const cacheKey = `${code}|${normalizedCity}`;
  const cached = municipalityCache.get(cacheKey);
  if (cached) return cached;

  const countryCities = City.getCitiesOfCountry(code) ?? [];
  if (countryCities.length === 0) {
    municipalityCache.set(cacheKey, []);
    return [];
  }

  let targetCities = countryCities.filter((city) => normalizeCityKey(city.name) === normalizedCity);
  if (targetCities.length === 0) {
    targetCities = countryCities.filter((city) => normalizeCityKey(city.name).includes(normalizedCity));
  }

  const stateCodes = [...new Set(targetCities.map((city) => city.stateCode).filter((value): value is string => !!value))];
  if (stateCodes.length === 0) {
    municipalityCache.set(cacheKey, []);
    return [];
  }

  const selectedNames = new Set(targetCities.map((city) => normalizeCityKey(city.name)));
  const municipalities = uniqueByValue(
    countryCities
      .filter((city) => (city.stateCode ? stateCodes.includes(city.stateCode) : false))
      .map((city) => ({ value: city.name, label: city.name })),
  )
    .filter((option) => !selectedNames.has(normalizeCityKey(option.label)))
    .sort(compareByLabel);

  municipalityCache.set(cacheKey, municipalities);
  return municipalities;
}

export function getCountryOptions(): GeoOption[] {
  return getCountryCatalog();
}

/**
 * Devuelve ciudades del pais con filtro y limite.
 * Usa query para mobil y evitar renderizar miles de options.
 */
export function getCityOptionsByCountry(countryCode: string, queryOptions: GeoQueryOptions = {}): GeoOption[] {
  const catalog = getCityCatalogByCountry(countryCode);
  return applyQueryAndLimit(catalog, queryOptions, DEFAULT_CITY_LIMIT);
}

/**
 * Devuelve localidades (barrios/municipios) para una ciudad.
 * Prioriza catalogo curado por ciudad y luego municipios cercanos por estado/provincia.
 */
export function getLocalityOptionsByCountryAndCity(
  countryCode: string,
  cityName: string,
  queryOptions: GeoQueryOptions = {},
): GeoOption[] {
  const code = countryCode.trim().toUpperCase();
  if (!code || !cityName.trim()) return [];

  const curatedCatalog = getCuratedLocalityCatalog(code, cityName);
  if (curatedCatalog.length > 0) {
    return applyQueryAndLimit(curatedCatalog, queryOptions, DEFAULT_LOCALITY_LIMIT);
  }

  const municipalityCatalog = getMunicipalityCatalogByCountryAndCity(code, cityName);
  if (municipalityCatalog.length > 0) {
    return applyQueryAndLimit(municipalityCatalog, queryOptions, DEFAULT_LOCALITY_LIMIT);
  }

  // Fallback: sugiere otras ciudades del pais como localidades/municipios relacionados.
  const normalizedCity = normalizeCityKey(cityName);
  const fallbackCatalog = getCityCatalogByCountry(code).filter(
    (option) => normalizeCityKey(option.label) !== normalizedCity,
  );
  return applyQueryAndLimit(fallbackCatalog, queryOptions, DEFAULT_LOCALITY_LIMIT);
}

export function getCityCountByCountry(countryCode: string) {
  return getCityCatalogByCountry(countryCode).length;
}

export function getLocalityCountByCountry(countryCode: string) {
  const stateCount = getStateCatalogByCountry(countryCode).length;
  if (stateCount > 0) return stateCount;
  return getCityCatalogByCountry(countryCode).length;
}

export function getLocalityCountByCountryAndCity(countryCode: string, cityName: string) {
  const code = countryCode.trim().toUpperCase();
  if (!code || !cityName.trim()) return 0;

  const curatedCatalog = getCuratedLocalityCatalog(code, cityName);
  if (curatedCatalog.length > 0) return curatedCatalog.length;

  const municipalityCatalog = getMunicipalityCatalogByCountryAndCity(code, cityName);
  if (municipalityCatalog.length > 0) return municipalityCatalog.length;

  const normalizedCity = normalizeCityKey(cityName);
  const fallbackCatalog = getCityCatalogByCountry(code).filter(
    (option) => normalizeCityKey(option.label) !== normalizedCity,
  );
  return fallbackCatalog.length;
}

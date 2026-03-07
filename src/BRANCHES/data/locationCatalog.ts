/**
 * Catalogo de ubicaciones para formularios de sucursales.
 * - Paises y ciudades: libreria country-state-city.
 * - Barrios/localidades: catalogo curado + fallback generico.
 */
import { City, Country } from 'country-state-city';

export interface OptionItem {
  value: string;
  label: string;
}

const GENERIC_LOCALITIES: OptionItem[] = [
  { value: 'Centro', label: 'Centro' },
  { value: 'Norte', label: 'Norte' },
  { value: 'Sur', label: 'Sur' },
  { value: 'Oriente', label: 'Oriente' },
  { value: 'Occidente', label: 'Occidente' },
];

const CITY_LOCALITIES: Record<string, OptionItem[]> = {
  'CO|bogota': [
    { value: 'Usaquen', label: 'Usaquen' },
    { value: 'Chapinero', label: 'Chapinero' },
    { value: 'Santa Fe', label: 'Santa Fe' },
    { value: 'San Cristobal', label: 'San Cristobal' },
    { value: 'Usme', label: 'Usme' },
    { value: 'Tunjuelito', label: 'Tunjuelito' },
    { value: 'Bosa', label: 'Bosa' },
    { value: 'Kennedy', label: 'Kennedy' },
    { value: 'Fontibon', label: 'Fontibon' },
    { value: 'Engativa', label: 'Engativa' },
    { value: 'Suba', label: 'Suba' },
    { value: 'Barrios Unidos', label: 'Barrios Unidos' },
    { value: 'Teusaquillo', label: 'Teusaquillo' },
    { value: 'Los Martires', label: 'Los Martires' },
    { value: 'Antonio Narino', label: 'Antonio Narino' },
    { value: 'Puente Aranda', label: 'Puente Aranda' },
    { value: 'La Candelaria', label: 'La Candelaria' },
    { value: 'Rafael Uribe Uribe', label: 'Rafael Uribe Uribe' },
    { value: 'Ciudad Bolivar', label: 'Ciudad Bolivar' },
    { value: 'Sumapaz', label: 'Sumapaz' },
  ],
  'CO|medellin': [
    { value: 'El Poblado', label: 'El Poblado' },
    { value: 'Laureles', label: 'Laureles' },
    { value: 'Belen', label: 'Belen' },
    { value: 'Aranjuez', label: 'Aranjuez' },
    { value: 'Manrique', label: 'Manrique' },
    { value: 'Castilla', label: 'Castilla' },
    { value: 'Robledo', label: 'Robledo' },
    { value: 'San Javier', label: 'San Javier' },
    { value: 'Guayabal', label: 'Guayabal' },
    { value: 'Buenos Aires', label: 'Buenos Aires' },
  ],
  'CO|cali': [
    { value: 'Comuna 1', label: 'Comuna 1' },
    { value: 'Comuna 2', label: 'Comuna 2' },
    { value: 'Comuna 3', label: 'Comuna 3' },
    { value: 'Comuna 4', label: 'Comuna 4' },
    { value: 'Comuna 5', label: 'Comuna 5' },
    { value: 'Comuna 6', label: 'Comuna 6' },
    { value: 'Comuna 10', label: 'Comuna 10' },
    { value: 'Comuna 13', label: 'Comuna 13' },
    { value: 'Comuna 17', label: 'Comuna 17' },
    { value: 'Comuna 22', label: 'Comuna 22' },
  ],
  'CO|barranquilla': [
    { value: 'Riomar', label: 'Riomar' },
    { value: 'Norte Centro Historico', label: 'Norte Centro Historico' },
    { value: 'Metropolitana', label: 'Metropolitana' },
    { value: 'Sur Occidente', label: 'Sur Occidente' },
    { value: 'Sur Oriente', label: 'Sur Oriente' },
  ],
  'CO|cartagena': [
    { value: 'Bocagrande', label: 'Bocagrande' },
    { value: 'Centro Historico', label: 'Centro Historico' },
    { value: 'Getsemani', label: 'Getsemani' },
    { value: 'Manga', label: 'Manga' },
    { value: 'Pie de la Popa', label: 'Pie de la Popa' },
  ],
};

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Lista todos los paises disponibles.
 */
export function getCountryOptions(): OptionItem[] {
  return Country.getAllCountries()
    .map((country) => ({ value: country.isoCode, label: country.name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/**
 * Lista ciudades de un pais por codigo ISO.
 */
export function getCityOptions(countryCode: string): OptionItem[] {
  if (!countryCode) return [];

  const uniqueCities = new Map<string, OptionItem>();
  for (const city of City.getCitiesOfCountry(countryCode) ?? []) {
    const key = normalizeKey(city.name);
    if (!uniqueCities.has(key)) {
      uniqueCities.set(key, { value: city.name, label: city.name });
    }
  }

  return [...uniqueCities.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/**
 * Lista barrios/localidades segun pais y ciudad.
 */
export function getLocalityOptions(countryCode: string, cityName: string): OptionItem[] {
  if (!countryCode || !cityName) return [];
  const cityKey = `${countryCode.toUpperCase()}|${normalizeKey(cityName)}`;
  return CITY_LOCALITIES[cityKey] ?? GENERIC_LOCALITIES;
}

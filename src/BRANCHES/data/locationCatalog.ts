/**
 * Catalogo de ubicaciones para formularios de sucursales.
 * - Paises y ciudades: catalogo global dinamico.
 * - Localidades: barrios/municipios por pais/ciudad.
 */
import {
  getCityCountByCountry,
  getCityOptionsByCountry,
  getCountryOptions as getSharedCountryOptions,
  getLocalityCountByCountryAndCity,
  getLocalityOptionsByCountryAndCity,
} from '../../SHARED/constants/geo';

export interface OptionItem {
  value: string;
  label: string;
}

/**
 * Lista todos los paises disponibles.
 */
export function getCountryOptions(): OptionItem[] {
  return getSharedCountryOptions();
}

/**
 * Lista ciudades de un pais por codigo ISO.
 */
export function getCityOptions(countryCode: string, query = ''): OptionItem[] {
  return getCityOptionsByCountry(countryCode, { query });
}

/**
 * Lista localidades (barrios/municipios) segun pais y ciudad.
 */
export function getLocalityOptions(countryCode: string, cityName: string, query = ''): OptionItem[] {
  if (!countryCode || !cityName) return [];
  return getLocalityOptionsByCountryAndCity(countryCode, cityName, { query });
}

export function getCityCount(countryCode: string): number {
  return getCityCountByCountry(countryCode);
}

export function getLocalityCount(countryCode: string, cityName: string): number {
  return getLocalityCountByCountryAndCity(countryCode, cityName);
}

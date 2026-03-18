/**
 * Catalogo geografico liviano para formularios.
 * Evita dependencias pesadas en runtime movil.
 */
export interface GeoOption {
  value: string;
  label: string;
}

const COUNTRY_OPTIONS: GeoOption[] = [
  { value: 'AR', label: 'Argentina' },
  { value: 'AU', label: 'Australia' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'BR', label: 'Brasil' },
  { value: 'CA', label: 'Canada' },
  { value: 'CL', label: 'Chile' },
  { value: 'CN', label: 'China' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'CU', label: 'Cuba' },
  { value: 'DE', label: 'Alemania' },
  { value: 'DO', label: 'Republica Dominicana' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'ES', label: 'Espana' },
  { value: 'FR', label: 'Francia' },
  { value: 'GB', label: 'Reino Unido' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'HN', label: 'Honduras' },
  { value: 'IE', label: 'Irlanda' },
  { value: 'IN', label: 'India' },
  { value: 'IT', label: 'Italia' },
  { value: 'JP', label: 'Japon' },
  { value: 'KR', label: 'Corea del Sur' },
  { value: 'MX', label: 'Mexico' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'NL', label: 'Paises Bajos' },
  { value: 'NZ', label: 'Nueva Zelanda' },
  { value: 'PA', label: 'Panama' },
  { value: 'PE', label: 'Peru' },
  { value: 'PT', label: 'Portugal' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'VE', label: 'Venezuela' },
];

const CITY_OPTIONS_BY_COUNTRY: Record<string, GeoOption[]> = {
  AR: [
    { value: 'Buenos Aires', label: 'Buenos Aires' },
    { value: 'Cordoba', label: 'Cordoba' },
    { value: 'Rosario', label: 'Rosario' },
  ],
  AU: [
    { value: 'Sydney', label: 'Sydney' },
    { value: 'Melbourne', label: 'Melbourne' },
    { value: 'Brisbane', label: 'Brisbane' },
  ],
  BO: [
    { value: 'La Paz', label: 'La Paz' },
    { value: 'Santa Cruz', label: 'Santa Cruz' },
    { value: 'Cochabamba', label: 'Cochabamba' },
  ],
  BR: [
    { value: 'Sao Paulo', label: 'Sao Paulo' },
    { value: 'Rio de Janeiro', label: 'Rio de Janeiro' },
    { value: 'Brasilia', label: 'Brasilia' },
  ],
  CA: [
    { value: 'Toronto', label: 'Toronto' },
    { value: 'Montreal', label: 'Montreal' },
    { value: 'Vancouver', label: 'Vancouver' },
  ],
  CL: [
    { value: 'Santiago', label: 'Santiago' },
    { value: 'Valparaiso', label: 'Valparaiso' },
    { value: 'Concepcion', label: 'Concepcion' },
  ],
  CN: [
    { value: 'Beijing', label: 'Beijing' },
    { value: 'Shanghai', label: 'Shanghai' },
    { value: 'Shenzhen', label: 'Shenzhen' },
  ],
  CO: [
    { value: 'Bogota', label: 'Bogota' },
    { value: 'Medellin', label: 'Medellin' },
    { value: 'Cali', label: 'Cali' },
    { value: 'Barranquilla', label: 'Barranquilla' },
    { value: 'Cartagena', label: 'Cartagena' },
    { value: 'Bucaramanga', label: 'Bucaramanga' },
    { value: 'Cucuta', label: 'Cucuta' },
    { value: 'Pereira', label: 'Pereira' },
    { value: 'Manizales', label: 'Manizales' },
    { value: 'Santa Marta', label: 'Santa Marta' },
  ],
  CR: [
    { value: 'San Jose', label: 'San Jose' },
    { value: 'Alajuela', label: 'Alajuela' },
    { value: 'Cartago', label: 'Cartago' },
  ],
  CU: [
    { value: 'La Habana', label: 'La Habana' },
    { value: 'Santiago de Cuba', label: 'Santiago de Cuba' },
    { value: 'Camaguey', label: 'Camaguey' },
  ],
  DE: [
    { value: 'Berlin', label: 'Berlin' },
    { value: 'Munich', label: 'Munich' },
    { value: 'Hamburgo', label: 'Hamburgo' },
  ],
  DO: [
    { value: 'Santo Domingo', label: 'Santo Domingo' },
    { value: 'Santiago', label: 'Santiago' },
    { value: 'La Romana', label: 'La Romana' },
  ],
  EC: [
    { value: 'Quito', label: 'Quito' },
    { value: 'Guayaquil', label: 'Guayaquil' },
    { value: 'Cuenca', label: 'Cuenca' },
  ],
  ES: [
    { value: 'Madrid', label: 'Madrid' },
    { value: 'Barcelona', label: 'Barcelona' },
    { value: 'Valencia', label: 'Valencia' },
  ],
  FR: [
    { value: 'Paris', label: 'Paris' },
    { value: 'Lyon', label: 'Lyon' },
    { value: 'Marseille', label: 'Marseille' },
  ],
  GB: [
    { value: 'London', label: 'London' },
    { value: 'Manchester', label: 'Manchester' },
    { value: 'Birmingham', label: 'Birmingham' },
  ],
  GT: [
    { value: 'Ciudad de Guatemala', label: 'Ciudad de Guatemala' },
    { value: 'Quetzaltenango', label: 'Quetzaltenango' },
    { value: 'Escuintla', label: 'Escuintla' },
  ],
  HN: [
    { value: 'Tegucigalpa', label: 'Tegucigalpa' },
    { value: 'San Pedro Sula', label: 'San Pedro Sula' },
    { value: 'La Ceiba', label: 'La Ceiba' },
  ],
  IE: [
    { value: 'Dublin', label: 'Dublin' },
    { value: 'Cork', label: 'Cork' },
    { value: 'Limerick', label: 'Limerick' },
  ],
  IN: [
    { value: 'Delhi', label: 'Delhi' },
    { value: 'Mumbai', label: 'Mumbai' },
    { value: 'Bangalore', label: 'Bangalore' },
  ],
  IT: [
    { value: 'Roma', label: 'Roma' },
    { value: 'Milan', label: 'Milan' },
    { value: 'Napoles', label: 'Napoles' },
  ],
  JP: [
    { value: 'Tokyo', label: 'Tokyo' },
    { value: 'Osaka', label: 'Osaka' },
    { value: 'Kyoto', label: 'Kyoto' },
  ],
  KR: [
    { value: 'Seoul', label: 'Seoul' },
    { value: 'Busan', label: 'Busan' },
    { value: 'Incheon', label: 'Incheon' },
  ],
  MX: [
    { value: 'Ciudad de Mexico', label: 'Ciudad de Mexico' },
    { value: 'Guadalajara', label: 'Guadalajara' },
    { value: 'Monterrey', label: 'Monterrey' },
  ],
  NI: [
    { value: 'Managua', label: 'Managua' },
    { value: 'Leon', label: 'Leon' },
    { value: 'Masaya', label: 'Masaya' },
  ],
  NL: [
    { value: 'Amsterdam', label: 'Amsterdam' },
    { value: 'Rotterdam', label: 'Rotterdam' },
    { value: 'Utrecht', label: 'Utrecht' },
  ],
  NZ: [
    { value: 'Auckland', label: 'Auckland' },
    { value: 'Wellington', label: 'Wellington' },
    { value: 'Christchurch', label: 'Christchurch' },
  ],
  PA: [
    { value: 'Ciudad de Panama', label: 'Ciudad de Panama' },
    { value: 'Colon', label: 'Colon' },
    { value: 'David', label: 'David' },
  ],
  PE: [
    { value: 'Lima', label: 'Lima' },
    { value: 'Arequipa', label: 'Arequipa' },
    { value: 'Trujillo', label: 'Trujillo' },
  ],
  PT: [
    { value: 'Lisboa', label: 'Lisboa' },
    { value: 'Oporto', label: 'Oporto' },
    { value: 'Braga', label: 'Braga' },
  ],
  PY: [
    { value: 'Asuncion', label: 'Asuncion' },
    { value: 'Ciudad del Este', label: 'Ciudad del Este' },
    { value: 'Encarnacion', label: 'Encarnacion' },
  ],
  SV: [
    { value: 'San Salvador', label: 'San Salvador' },
    { value: 'Santa Ana', label: 'Santa Ana' },
    { value: 'San Miguel', label: 'San Miguel' },
  ],
  US: [
    { value: 'New York', label: 'New York' },
    { value: 'Los Angeles', label: 'Los Angeles' },
    { value: 'Miami', label: 'Miami' },
  ],
  UY: [
    { value: 'Montevideo', label: 'Montevideo' },
    { value: 'Salto', label: 'Salto' },
    { value: 'Punta del Este', label: 'Punta del Este' },
  ],
  VE: [
    { value: 'Caracas', label: 'Caracas' },
    { value: 'Maracaibo', label: 'Maracaibo' },
    { value: 'Valencia', label: 'Valencia' },
  ],
};

const DEFAULT_CITY_OPTIONS: GeoOption[] = [
  { value: 'Ciudad principal', label: 'Ciudad principal' },
  { value: 'Centro', label: 'Centro' },
  { value: 'Norte', label: 'Norte' },
];

function compareByLabel(a: GeoOption, b: GeoOption) {
  if (a.label < b.label) return -1;
  if (a.label > b.label) return 1;
  return 0;
}

const COUNTRY_OPTIONS_SORTED = [...COUNTRY_OPTIONS].sort(compareByLabel);

export function getCountryOptions(): GeoOption[] {
  return COUNTRY_OPTIONS_SORTED;
}

export function getCityOptionsByCountry(countryCode: string): GeoOption[] {
  const code = countryCode.trim().toUpperCase();
  if (!code) return [];
  return CITY_OPTIONS_BY_COUNTRY[code] ?? DEFAULT_CITY_OPTIONS;
}

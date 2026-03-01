import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RANGOS_10 = [
  [67250001, 67700000],
  [69050001, 69500000],
  [69500001, 69950000],
  [69950001, 70400000],
  [70400001, 70850000],
  [70850001, 71300000],
  [76310012, 85139995],
  [86400001, 86850000],
  [90900001, 91350000],
  [91800001, 92250000]
];

export const RANGOS_20 = [
  [87280145, 91646549],
  [96650001, 97100000],
  [99800001, 100250000],
  [100250001, 100700000],
  [109250001, 109700000],
  [110600001, 111050000],
  [111050001, 111500000],
  [111950001, 112400000],
  [112400001, 112850000],
  [112850001, 113300000],
  [114200001, 114650000],
  [114650001, 115100000],
  [115100001, 115550000],
  [118700001, 119150000],
  [119150001, 119600000],
  [120500001, 120950000]
];

export const RANGOS_50 = [
  [77100001, 77550000],
  [78000001, 78450000],
  [78900001, 96350000],
  [96350001, 96800000],
  [96800001, 97250000],
  [98150001, 98600000],
  [104900001, 105350000],
  [105350001, 105800000],
  [106700001, 107150000],
  [107600001, 108050000],
  [108050001, 108500000],
  [109400001, 109850000]
];

export function estaEnRango(numero: number, rangos: number[][]) {
  return rangos.some(([min, max]) => numero >= min && numero <= max);
}

export function validarSerie(serie: string, billete: number) {
  const cleanSerie = serie.toUpperCase().trim();
  
  // Si NO termina en B, es válida automáticamente según lógica original
  if (!cleanSerie.endsWith("B")) return { isValid: true, reason: "Serie estándar (No B)" };

  const numeroStr = cleanSerie.replace(/[^0-9]/g, '');
  const numero = parseInt(numeroStr);
  
  if (isNaN(numero)) return { isValid: false, reason: "Número de serie ilegible" };

  let rangos: number[][] = [];
  if (billete === 10) rangos = RANGOS_10;
  else if (billete === 20) rangos = RANGOS_20;
  else if (billete === 50) rangos = RANGOS_50;

  const isIllegal = estaEnRango(numero, rangos);
  
  return {
    isValid: !isIllegal,
    reason: isIllegal ? "Serie detectada en base de datos de billetes falsos/erróneos" : "Serie verificada"
  };
}

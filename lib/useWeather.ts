"use client";

import { useEffect, useState } from "react";

export interface WeatherState {
  temp: number;
  humidity: number;
  condition: string;
  city: string;
  ready: boolean;
}

const CONDITIONS = [
  "CÉU LIMPO",
  "POUCAS NUVENS",
  "NUBLADO",
  "GAROA LEVE",
  "CHUVA FRACA",
];

/**
 * Telemetria climática simulada.
 *
 * Substitua o corpo do efeito por um fetch real (OpenWeather, INMET, etc.)
 * mantendo a mesma forma de retorno — o Header não precisa mudar.
 */
export function useWeather(city = "SÃO PAULO · SP"): WeatherState {
  const [state, setState] = useState<WeatherState>({
    temp: 0,
    humidity: 0,
    condition: "—",
    city,
    ready: false,
  });

  useEffect(() => {
    const sample = () => {
      setState({
        city,
        temp: Math.round(21 + Math.random() * 8),
        humidity: Math.round(48 + Math.random() * 30),
        condition: CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)],
        ready: true,
      });
    };

    sample();
    const id = window.setInterval(sample, 60_000);
    return () => window.clearInterval(id);
  }, [city]);

  return state;
}

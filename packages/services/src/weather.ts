import type { Weather } from "@greline/types";
import type { OpenMeteoForecast } from "@greline/validation";

/** Sky conditions we can name, grouped from WMO weather codes (as used by Open-Meteo). */
export type WeatherCondition =
  | "clear"
  | "mostlyClear"
  | "partlyCloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "showers"
  | "snowShowers"
  | "thunderstorm"
  | "unknown";

const CONDITION_BY_CODE: ReadonlyArray<readonly [readonly number[], WeatherCondition]> = [
  [[0], "clear"],
  [[1], "mostlyClear"],
  [[2], "partlyCloudy"],
  [[3], "overcast"],
  [[45, 48], "fog"],
  [[51, 53, 55, 56, 57], "drizzle"],
  [[61, 63, 65, 66, 67], "rain"],
  [[71, 73, 75, 77], "snow"],
  [[80, 81, 82], "showers"],
  [[85, 86], "snowShowers"],
  [[95, 96, 99], "thunderstorm"],
];

/** The condition of a WMO weather code; codes outside the WMO table are "unknown". */
export function weatherCondition(code: number): WeatherCondition {
  return CONDITION_BY_CODE.find(([codes]) => codes.includes(code))?.[1] ?? "unknown";
}

/** Our weather payload from an Open-Meteo forecast (times already local to Grenoble). */
export function toWeather(forecast: OpenMeteoForecast): Weather {
  const { current, daily } = forecast;
  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    windSpeed: current.wind_speed_10m,
    // "2026-11-06T07:22" -> "07:22"
    sunrise: daily.sunrise[0]!.slice(11, 16),
    sunset: daily.sunset[0]!.slice(11, 16),
  };
}

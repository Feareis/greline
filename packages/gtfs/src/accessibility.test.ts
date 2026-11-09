import { describe, expect, it } from "vitest";
import { stopAccessibility } from "./accessibility";

const HEADER = "stop_id,stop_code,stop_name,stop_lat,stop_lon,zone_id,location_type,parent_station,wheelchair_boarding";

// Real rows of the SEM feed: stations (location_type 1) carry 0, their platforms the real value.
const stops = [
  HEADER,
  'GAR,GENGAR,"Grenoble, Gares",45.19,5.71,,1,,0',
  '2214,2214,"Grenoble, Gares",45.19,5.71,1,,GAR,1',
  '2216,2216,"Grenoble, Gares",45.19,5.71,1,,GAR,1',
  'CHAV,GENCHAV,"Grenoble, Chavant",45.18,5.73,,1,,0',
  '3001,3001,"Grenoble, Chavant",45.18,5.73,1,,CHAV,1',
  '3002,3002,"Grenoble, Chavant",45.18,5.73,1,,CHAV,2',
  'PRLAC,GENPRLAC,"Proveysieux, La Chiaise",45.26,5.69,,1,,0',
  '4001,4001,"Proveysieux, La Chiaise",45.26,5.69,1,,PRLAC,2',
  '4002,4002,"Proveysieux, La Chiaise",45.26,5.69,1,,PRLAC,0',
  'ESS,GENESS,"Grenoble, Les Essarts",45.15,5.71,,1,,0',
  '5001,5001,"Grenoble, Les Essarts",45.15,5.71,1,,ESS,0',
].join("\n");

describe("stopAccessibility", () => {
  it("rates each station from its platforms, keyed like our stop ids", () => {
    expect(stopAccessibility(stops)).toEqual({
      "SEM:GENGAR": "accessible",
      "SEM:GENCHAV": "partial",
      "SEM:GENPRLAC": "inaccessible",
    });
  });

  it("leaves out a station whose platforms are all unknown", () => {
    expect(stopAccessibility(stops)).not.toHaveProperty("SEM:GENESS");
  });
});

export function extractStreetFromGeocode(result: any) {
    const get = (type: string) =>
      result.address_components.find((c: any) =>
        c.types.includes(type)
      )?.long_name ?? null;
  
    return {
      externalId: result.place_id,
      name: get("route"),
      city:
        get("locality") ||
        get("administrative_area_level_2") ||
        get("administrative_area_level_1"),
      country: get("country"),
    };
  }
  
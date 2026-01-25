import axios from "axios";

export async function reverseGeocode(
  lat: number,
  lng: number
) {
  const res = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        latlng: `${lat},${lng}`,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    }
  );

  return res.data;
}

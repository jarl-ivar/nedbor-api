// api/temp.js
//
// Enkel Vercel-endpoint som henter temperatur fra MET (met.no)
// og returnerer de neste N timene i et lett format Shelly takler.
//
// URL-eksempel:
//   https://nedbor-api.vercel.app/api/temp
//   https://nedbor-api.vercel.app/api/temp?hours=12
//   https://nedbor-api.vercel.app/api/temp?lat=60.40&lon=10.01&hours=12
//
// Default: 12 timer, fast posisjon (samme område som nedbor-api)

const DEFAULT_LAT = 60.4010555;
const DEFAULT_LON = 10.010216;
const DEFAULT_HOURS = 12;

function toNumber(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

module.exports = async (req, res) => {
  try {
    const { lat, lon, hours } = req.query || {};

    const latNum = toNumber(lat, DEFAULT_LAT);
    const lonNum = toNumber(lon, DEFAULT_LON);
    const hoursNum = Math.max(1, Math.min(48, toNumber(hours, DEFAULT_HOURS))); // 1–48 timer

    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latNum}&lon=${lonNum}`;

    const metRes = await fetch(url, {
      headers: {
        // Viktig for met.no: identifiserer klienten
        "User-Agent": "nedbor-api-temp/1.0 (kontakt: din.epost@dittdomene.no)"
      }
    });

    if (!metRes.ok) {
      const text = await metRes.text();
      console.error("MET error:", metRes.status, text);
      res.status(metRes.status).json({
        error: "Failed to fetch data from MET",
        status: metRes.status
      });
      return;
    }

    const data = await metRes.json();

    if (
      !data ||
      !data.properties ||
      !Array.isArray(data.properties.timeseries)
    ) {
      console.error("Unexpected MET payload:", JSON.stringify(data).slice(0, 500));
      res.status(500).json({ error: "Unexpected MET payload" });
      return;
    }

    const timeseries = data.properties.timeseries;

    const now = new Date();

    // Filtrer til fremtid + nå, og ta de første N
    const future = timeseries.filter(entry => {
      const t = new Date(entry.time);
      return t >= now;
    });

    const selected = future.slice(0, hoursNum).map(entry => {
      const t = entry.time;
      const details =
        entry.data &&
        entry.data.instant &&
        entry.data.instant.details
          ? entry.data.instant.details
          : {};

      const tempC =
        typeof details.air_temperature === "number"
          ? details.air_temperature
          : null;

      return {
        time: t,      // ISO-tid
        tempC: tempC  // kan være null hvis noe mangler
      };
    });

    res.setHeader("Content-Type", "application/json");
    // Litt cache er ok, Shelly tåler at dette ikke er helt realtime
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");

    res.status(200).json({
      location: {
        lat: latNum,
        lon: lonNum
      },
      checkedAt: new Date().toISOString(),
      hoursRequested: hoursNum,
      temps: selected
    });
  } catch (err) {
    console.error("temp.js error:", err);
    res.status(500).json({
      error: "Internal server error in temp endpoint"
    });
  }
};

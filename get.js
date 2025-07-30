// api/get.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const USER_AGENT = "RobotKlipper/1.0 api@jarl-ivar.com";
  const lat = 60.4010555;
  const lon = 10.0102160;
  const threshold = 2.0;
  const HOURS = 12;

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;

  const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT }});
  if (!resp.ok) {
    return res.status(resp.status).json({ error: `MET API error ${resp.status}` });
  }

  const json = await resp.json();
  const now = new Date();
  const startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
  const endUTC = new Date(startUTC.getTime() + HOURS * 3600 * 1000);

  const hours = [];
  let totalRain = 0;

  for (const ts of json.properties.timeseries) {
    const t = new Date(ts.time);
    if (t >= startUTC && t < endUTC) {
      const mm = ts.data.next_1_hours?.details?.precipitation_amount ?? 0;
      const hourStr = t.toISOString().substr(11,5);
      hours.push({ time: hourStr, mm });
      totalRain += mm;
      if (hours.length >= HOURS) break;
    }
  }

  const okToClip = totalRain <= threshold;

  res.setHeader("Cache-Control", "max-age=300, s-maxage=300");
  return res.json({
    evaluatedAt: new Date().toISOString(),
    rainByHour: hours,
    rainTotal: Number(totalRain.toFixed(2)),
    okToClip
  });
}

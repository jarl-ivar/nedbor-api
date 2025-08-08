export default async function handler(req, res) {
  const lat = 60.4010555;
  const lon = 10.0102160;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&timezone=auto`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RobotKlipper/1.0 api@jarl-ivar.com"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const rainPerHour = [];
    const fromHour = 5;
    const toHour = 16;

    for (let i = 0; i < data.hourly.time.length; i++) {
      const timestamp = data.hourly.time[i];
      const hour = new Date(timestamp);

      if (hour.getDate() !== now.getDate()) continue;
      const h = hour.getHours();
      if (h >= fromHour && h < toHour) {
        rainPerHour.push({
          time: timestamp,
          mm: data.hourly.precipitation[i]
        });
      }
    }

    const totalRain = rainPerHour.reduce((sum, entry) => sum + entry.mm, 0);

    res.status(200).json({
      location: { lat, lon },
      checkedAt: now.toISOString(),
      checkedHours: `${fromHour}:00–${toHour - 1}:59`,
      threshold_mm: 2.0,
      totalRainNext12Hours: totalRain,
      rainPerHour
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data", details: err.message });
  }
}

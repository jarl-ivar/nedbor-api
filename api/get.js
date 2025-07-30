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

    // Hent nåværende lokal tid
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split("T")[0];

    // Filtrer til kun dagens dato og neste 12 timer
    const rainPerHour = [];
    for (let i = 0; i < data.hourly.time.length; i++) {
      const timestamp = data.hourly.time[i];
      const hour = new Date(timestamp);
      if (hour.getDate() !== now.getDate()) continue;
      if (hour.getHours() >= currentHour && hour.getHours() < currentHour + 12) {
        rainPerHour.push({
          time: timestamp,
          mm: data.hourly.precipitation[i]
        });
      }
    }

    const totalRain = rainPerHour.reduce((sum, entry) => sum + entry.mm, 0);

    res.status(200).json({
      location: { lat, lon },
      threshold_mm: 2.0,
      totalRainNext12Hours: totalRain,
      rainPerHour
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data", details: err.message });
  }
}

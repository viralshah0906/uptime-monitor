import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import supabase from "./supabase";

export default function App() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState("");

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("site_logs")
      .select("*")
      .order("checked_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();

    const timer = setInterval(fetchLogs, 60000);

    return () => clearInterval(timer);
  }, []);

  const sites = useMemo(() => {
    return [...new Set(logs.map((item) => item.url))];
  }, [logs]);

  useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0]);
    }
  }, [sites, selectedSite]);

  const latestSites = useMemo(() => {
    const map = {};

    logs.forEach((row) => {
      map[row.url] = row;
    });

    return Object.values(map);
  }, [logs]);

  const avgLatency = useMemo(() => {
    if (!logs.length) return 0;

    const total = logs.reduce(
      (sum, item) => sum + (item.latency_ms || 0),
      0
    );

    return Math.round(total / logs.length);
  }, [logs]);

  function uptimePercentage(url) {
    const siteLogs = logs.filter(
      (row) => row.url === url
    );

    if (!siteLogs.length) return "0";

    const upCount = siteLogs.filter(
      (row) => row.is_up
    ).length;

    return (
      (upCount / siteLogs.length) *
      100
    ).toFixed(1);
  }

  const chartData = logs
    .filter((row) => row.url === selectedSite)
    .map((row) => ({
      time: new Date(
        row.checked_at
      ).toLocaleTimeString(),
      latency: row.latency_ms,
    }));

  const lastUpdated =
    logs.length > 0
      ? new Date(
          logs[logs.length - 1].checked_at
        ).toLocaleString()
      : "N/A";

  if (loading) {
    return (
      <div className="loading">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard">

      <header className="header">
        <h1>Serverless Uptime Monitor</h1>

        <div className="stats">
          <div className="stat-card">
            <span>Monitored Sites</span>
            <strong>{sites.length}</strong>
          </div>

          <div className="stat-card">
            <span>Average Latency</span>
            <strong>{avgLatency} ms</strong>
          </div>

          <div className="stat-card">
            <span>Last Updated</span>
            <strong>{lastUpdated}</strong>
          </div>
        </div>
      </header>

      <section>
        <h2>Current Status</h2>

        <div className="site-grid">
          {latestSites.map((site) => {
            const isUp =
              site.is_up ??
              (site.status_code >= 200 &&
                site.status_code < 400);

            return (
              <div
                key={site.url}
                className="site-card"
              >
                <h3>
                  {new URL(site.url).hostname}
                </h3>

                <div
                  className={
                    isUp
                      ? "status up"
                      : "status down"
                  }
                >
                  {isUp ? "UP" : "DOWN"}
                </div>

                <p>
                  HTTP: {site.status_code}
                </p>

                <p>
                  Latency:
                  {" "}
                  {site.latency_ms} ms
                </p>

                <p>
                  Uptime:
                  {" "}
                  {uptimePercentage(
                    site.url
                  )}
                  %
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="chart-section">
        <div className="chart-header">
          <h2>Latency History</h2>

          <select
            value={selectedSite}
            onChange={(e) =>
              setSelectedSite(
                e.target.value
              )
            }
          >
            {sites.map((site) => (
              <option
                key={site}
                value={site}
              >
                {new URL(site).hostname}
              </option>
            ))}
          </select>
        </div>

        <div className="chart-container">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="latency"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

    </div>
  );
}
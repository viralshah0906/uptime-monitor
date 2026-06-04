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
  const [managedSites, setManagedSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedSite, setSelectedSite] = useState("");

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("site_logs")
      .select("*")
      .order("checked_at", { ascending: true })
      .limit(500);

    if (!error) {
      setLogs(data || []);
    }
  }

  async function fetchSites() {
    const { data, error } = await supabase
      .from("monitored_sites")
      .select("*")
      .order("id");

    if (!error) {
      setManagedSites(data || []);
    }
  }

  async function refreshAll() {
    await Promise.all([
      fetchLogs(),
      fetchSites(),
    ]);

    setLoading(false);
  }

  async function addSite(e) {
    e.preventDefault();

    if (!newName || !newUrl) return;

    const { error } = await supabase
      .from("monitored_sites")
      .insert([
        {
          name: newName,
          url: newUrl,
          active: true,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setNewName("");
    setNewUrl("");

    fetchSites();
  }

  async function toggleSite(site) {
    const { error } = await supabase
      .from("monitored_sites")
      .update({
        active: !site.active,
      })
      .eq("id", site.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchSites();
  }

  useEffect(() => {
    refreshAll();

    const timer = setInterval(
      refreshAll,
      60000
    );

    return () => clearInterval(timer);
  }, []);

  const sites = useMemo(() => {
    return [...new Set(logs.map((x) => x.url))];
  }, [logs]);

  useEffect(() => {
    if (sites.length && !selectedSite) {
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

    return Math.round(
      logs.reduce(
        (sum, item) =>
          sum + item.latency_ms,
        0
      ) / logs.length
    );
  }, [logs]);

  function uptimePercentage(url) {
    const now = new Date();

    const last24Hours = logs.filter(
      (row) => {
        if (row.url !== url)
          return false;

        return (
          now -
            new Date(
              row.checked_at
            ) <
          24 *
            60 *
            60 *
            1000
        );
      }
    );

    if (!last24Hours.length)
      return "0.0";

    const upCount =
      last24Hours.filter(
        (row) => row.is_up
      ).length;

    return (
      (upCount /
        last24Hours.length) *
      100
    ).toFixed(1);
  }

  const chartData = logs
    .filter(
      (row) =>
        row.url === selectedSite
    )
    .map((row) => ({
      time: new Date(
        row.checked_at
      ).toLocaleTimeString(),
      latency: row.latency_ms,
    }));

  const lastUpdated =
    logs.length > 0
      ? new Date(
          logs[
            logs.length - 1
          ].checked_at
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
        <h1>
          Serverless Uptime Monitor
        </h1>

        <div className="stats">
          <div className="stat-card">
            <span>
              Monitored Sites
            </span>
            <strong>
              {managedSites.length}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Average Latency
            </span>
            <strong>
              {avgLatency} ms
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Last Updated
            </span>
            <strong>
              {lastUpdated}
            </strong>
          </div>
        </div>
      </header>

      <section>
        <h2>Site Management</h2>

        <form
          className="site-form"
          onSubmit={addSite}
        >
          <input
            placeholder="Site Name"
            value={newName}
            onChange={(e) =>
              setNewName(
                e.target.value
              )
            }
          />

          <input
            placeholder="https://..."
            value={newUrl}
            onChange={(e) =>
              setNewUrl(
                e.target.value
              )
            }
          />

          <button type="submit">
            Add Site
          </button>
        </form>

        <div className="managed-list">
          {managedSites.map(
            (site) => (
              <div
                key={site.id}
                className="managed-row"
              >
                <div>
                  <strong>
                    {site.name}
                  </strong>
                  <br />
                  {site.url}
                </div>

                <button
                  onClick={() =>
                    toggleSite(
                      site
                    )
                  }
                >
                  {site.active
                    ? "Disable"
                    : "Enable"}
                </button>
              </div>
            )
          )}
        </div>
      </section>

      <section>
        <h2>Current Status</h2>

        <div className="site-grid">
          {latestSites.map((site) => (
            <div
              key={site.url}
              className="site-card"
            >
              <h3>
                {
                  new URL(
                    site.url
                  ).hostname
                }
              </h3>

              <div
                className={
                  site.is_up
                    ? "status up"
                    : "status down"
                }
              >
                {site.is_up
                  ? "UP"
                  : "DOWN"}
              </div>

              <p>
                HTTP:
                {" "}
                {
                  site.status_code
                }
              </p>

              <p>
                Latency:
                {" "}
                {
                  site.latency_ms
                }
                ms
              </p>

              <p>
                Uptime (24h):
                {" "}
                {uptimePercentage(
                  site.url
                )}
                %
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-section">
        <div className="chart-header">
          <h2>
            Latency History
          </h2>

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
                {
                  new URL(
                    site
                  ).hostname
                }
              </option>
            ))}
          </select>
        </div>

        <div className="chart-container">
          <ResponsiveContainer>
            <LineChart
              data={chartData}
            >
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
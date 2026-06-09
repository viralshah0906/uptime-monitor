import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import supabase from "../supabase";

export default function SiteDetails() {
  const { id } = useParams();

  const [site, setSite] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: siteData } =
      await supabase
        .from("monitored_sites")
        .select("*")
        .eq("id", id)
        .single();

    if (!siteData) {
      setLoading(false);
      return;
    }

    setSite(siteData);

    const { data: logData } =
      await supabase
        .from("site_logs")
        .select("*")
        .eq("url", siteData.url)
        .order("checked_at", {
          ascending: true,
        });

    setLogs(logData || []);
    setLoading(false);
  }

  function uptime(days) {
    const cutoff =
      Date.now() -
      days *
        24 *
        60 *
        60 *
        1000;

    const rows = logs.filter(
      (row) =>
        new Date(
          row.checked_at
        ).getTime() >= cutoff
    );

    if (!rows.length) return "0.0";

    const up =
      rows.filter(
        (row) => row.is_up
      ).length;

    return (
      (up / rows.length) *
      100
    ).toFixed(1);
  }

  const avgLatency = useMemo(() => {
    if (!logs.length) return 0;

    return Math.round(
      logs.reduce(
        (sum, row) =>
          sum + row.latency_ms,
        0
      ) / logs.length
    );
  }, [logs]);

  const latest =
    logs.length > 0
      ? logs[
          logs.length - 1
        ]
      : null;

  const chartData = logs.map(
    (row) => ({
      time: new Date(
        row.checked_at
      ).toLocaleDateString(),

      latency:
        row.latency_ms,
    })
  );

  const recentChecks =
    [...logs]
      .reverse()
      .slice(0, 20);

  if (loading) {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  if (!site) {
    return (
      <div className="dashboard">
        Site not found
      </div>
    );
  }

  return (
    <div className="dashboard">

      <Link
        to="/"
        className="back-link"
      >
        ← Back
      </Link>

      <div className="details-header">
        <h1>{site.name}</h1>

        <div
          className={
            latest?.is_up
              ? "status up"
              : "status down"
          }
        >
          {latest?.is_up
            ? "UP"
            : "DOWN"}
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span>
            Uptime 24h
          </span>
          <strong>
            {uptime(1)}%
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Uptime 7d
          </span>
          <strong>
            {uptime(7)}%
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Uptime 30d
          </span>
          <strong>
            {uptime(30)}%
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Avg Latency
          </span>
          <strong>
            {avgLatency} ms
          </strong>
        </div>
      </div>

      <section className="chart-section">
        <h2>
          Latency History
        </h2>

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

      <section>
        <h2>
          Recent Checks
        </h2>

        <div className="checks-table">
          <table>
            <thead>
              <tr>
                <th>
                  Time
                </th>
                <th>
                  Status
                </th>
                <th>
                  Latency
                </th>
              </tr>
            </thead>

            <tbody>
              {recentChecks.map(
                (row) => (
                  <tr
                    key={row.id}
                  >
                    <td>
                      {new Date(
                        row.checked_at
                      ).toLocaleString()}
                    </td>

                    <td>
                      {
                        row.status_code
                      }
                    </td>

                    <td>
                      {
                        row.latency_ms
                      }
                      ms
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
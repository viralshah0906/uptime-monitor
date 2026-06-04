import { WebSocket } from "ws";

global.WebSocket = WebSocket;

import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

async function getMonitoredSites() {
  const { data, error } = await supabase
    .from("monitored_sites")
    .select("*")
    .eq("active", true);

  if (error) {
    console.error(
      "Failed to load monitored sites:",
      error
    );
    process.exit(1);
  }

  return data;
}

async function checkSite(site) {
  const start = Date.now();

  try {
    const response = await axios.get(site.url, {
      timeout: 15000,
      validateStatus: () => true,
      headers: {
        "User-Agent": "UptimeMonitor/1.0",
      },
    });

    const latency = Date.now() - start;

    return {
      url: site.url,
      status_code: response.status,
      latency_ms: latency,
      is_up:
        response.status >= 200 &&
        response.status < 400,
    };
  } catch (error) {
    const latency = Date.now() - start;

    return {
      url: site.url,
      status_code: 0,
      latency_ms: latency,
      is_up: false,
    };
  }
}

async function main() {
  const sites =
    await getMonitoredSites();

  console.log(
    `Monitoring ${sites.length} sites`
  );

  const results = [];

  for (const site of sites) {
    const result =
      await checkSite(site);

    console.log(result);

    results.push(result);
  }

  const { error } = await supabase
    .from("site_logs")
    .insert(results);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(
    `Inserted ${results.length} records`
  );
}

main();
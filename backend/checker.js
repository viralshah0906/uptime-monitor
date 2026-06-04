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

const URLS = [
  "https://github.com",
  "https://www.wikipedia.org",
  "https://www.cloudflare.com",
  "https://supabase.com"
];

async function checkSite(url) {
  const start = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      validateStatus: () => true,
      headers: {
      "User-Agent": "UptimeMonitor/1.0"
      }
    });

    const latency = Date.now() - start;

    return {
      url,
      status_code: response.status,
      latency_ms: latency,
      is_up: response.status >= 200 && response.status < 400
    };
  } catch (err) {
    const latency = Date.now() - start;

    return {
      url,
      status_code: 0,
      latency_ms: latency,
      is_up: false
    };
  }
}

async function main() {
  const results = [];

  for (const url of URLS) {
    const result = await checkSite(url);

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

  console.log("Inserted successfully");
}

main();

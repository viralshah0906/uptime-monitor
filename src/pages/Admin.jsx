import { useEffect, useState } from "react";
import supabase from "../supabase";

export default function Admin() {
  const [sites, setSites] = useState([]);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  async function loadSites() {
    const { data } = await supabase
      .from("monitored_sites")
      .select("*")
      .order("id");

    setSites(data || []);
  }

  useEffect(() => {
    loadSites();
  }, []);

  async function addSite(e) {
    e.preventDefault();

    const { error } = await supabase
      .from("monitored_sites")
      .insert([
        {
          name,
          url,
          active: true,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setUrl("");

    loadSites();
  }

  async function toggle(site) {
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

    loadSites();
  }

  async function deleteSite(site) {
    const confirmed = window.confirm(
      `Delete "${site.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("monitored_sites")
      .delete()
      .eq("id", site.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadSites();
  }

  return (
    <div className="dashboard">
      <h1>Admin Panel</h1>

      <form
        className="site-form"
        onSubmit={addSite}
      >
        <input
          placeholder="Site Name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <input
          placeholder="https://..."
          value={url}
          onChange={(e) =>
            setUrl(e.target.value)
          }
        />

        <button type="submit">
          Add Site
        </button>
      </form>

      <div className="managed-list">
        {sites.map((site) => (
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

            <div className="action-buttons">
              <button
                onClick={() =>
                  toggle(site)
                }
              >
                {site.active
                  ? "Disable"
                  : "Enable"}
              </button>

              <button
                className="delete-btn"
                onClick={() =>
                  deleteSite(site)
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
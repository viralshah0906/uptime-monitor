import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "../supabase";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/">Dashboard</Link>

        {user && (
          <Link to="/admin">
            Admin
          </Link>
        )}
      </div>

      <div className="nav-right">
        {!user ? (
          <Link to="/login">
            Login
          </Link>
        ) : (
          <button
            className="logout-btn"
            onClick={logout}
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
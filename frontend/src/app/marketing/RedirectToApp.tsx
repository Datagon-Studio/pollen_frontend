import { useEffect } from "react";
import { CANONICAL_APP_URL } from "@/lib/app-url";

/**
 * On the marketing host, send app/auth/member routes to app.pollean.com.
 */
export default function RedirectToApp() {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const target = `${CANONICAL_APP_URL}${pathname}${search}${hash}`;
    window.location.replace(target);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F6F1EA",
        color: "#474747",
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 14,
      }}
    >
      Taking you to the Pollean app…
    </div>
  );
}

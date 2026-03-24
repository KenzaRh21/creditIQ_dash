import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

function mount() {
  const el = document.getElementById("scoring-root");
  if (el) {
    ReactDOM.createRoot(el).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    setTimeout(mount, 50);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
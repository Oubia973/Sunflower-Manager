import React from "react";
import "../styles/farm-holdings-search.css";

export default function ListsModeSwitch({ mode, onChange }) {
  return <div className="lists-mode-switch" role="group" aria-label="Lists mode">
    <button type="button" aria-pressed={mode !== "database"} onClick={() => onChange("classic")}>Classic</button>
    <button type="button" aria-pressed={mode === "database"} onClick={() => onChange("database")}>Active farms</button>
  </div>;
}

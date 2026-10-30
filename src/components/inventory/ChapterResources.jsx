import React from "react";
import { frmtNb } from "../../fct.js";

export default function ChapterResources({ inventory = {}, items = {} }) {
  const rows = Object.entries(items).filter(([name, item]) => item.cat === "chapter" && Number(inventory[name]) > 0);
  if (!rows.length) return null;
  return <section aria-label="Chapter resources" style={{ marginTop: 12 }}>
    <strong>Chapter resources</strong>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 6 }}>
      {rows.map(([name, item]) => <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <img src={item.img} alt="" className="resico" />
        <span>{name}: {frmtNb(Number(inventory[name]))}</span>
      </span>)}
    </div>
  </section>;
}

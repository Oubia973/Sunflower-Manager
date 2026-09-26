import React from "react";
import InvTable from "./Inv";

// Keep the complete inventory overview in the preview; add item details on demand.
export default function InvReadableTable() {
  return <InvTable dashboardPreview />;
}

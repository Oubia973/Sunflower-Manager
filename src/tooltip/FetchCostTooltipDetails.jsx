import React from "react";
import { frmtNb } from "../fct.js";

export default function FetchCostTooltipDetails({ contract, itemName, icons }) {
  if (!contract || typeof contract !== "object") return null;

  const producers = Array.isArray(contract.displayProducers) ? contract.displayProducers : [];
  const itemIcon = <img src={contract.itemImage || icons?.fallback} alt={itemName || "?"} style={{ width: "20px", height: "20px" }} />;
  const energyIcon = <img src={icons?.energy} alt="" className="itico" title="Energy" />;

  return (
    <>
      <div>{itemIcon} {itemName} fetch cost</div>
      {producers.length ? <div style={{ marginTop: 6 }}>Pets &amp; requests:</div> : null}
      {producers.map((producer) => (
        <div key={producer.petName} style={{ marginTop: 6 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <img src={producer.img || icons?.fallback} alt={producer.petName || ""} style={{ width: "18px", height: "18px" }} />
            <span><b>{producer.label || producer.petName}</b></span>
          </div>
          <div>{frmtNb(contract.energyUnit)}{energyIcon} for {frmtNb(producer.yieldBase)}{itemIcon}</div>
          <div>
            {(producer.reqDetails || []).map((request, index) => (
              <span key={`${producer.petName}-${request.name}-${index}`} style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}>
                <img src={request.img || icons?.fallback} alt="" className="itico" title={request.name || ""} />
              </span>
            ))}
            {(producer.reqDetails || []).length ? <>{frmtNb(producer.reqCost)}{icons?.flower} for {frmtNb(producer.reqEnergyTotal)}{energyIcon}</> : "No food"}
          </div>
          <div>{itemIcon}x1 cost {frmtNb(producer.costPerUnit)}{icons?.flower} {' | '}{frmtNb(producer.marketPerUnit)}{icons?.market}</div>
        </div>
      ))}
      {contract.showAverageLine ? <div style={{ marginTop: 6 }}>Average for all pets selected:</div> : null}
      {producers.length ? (
        <>
          <div style={{ marginTop: 6 }}>Prod cost: {frmtNb(contract.unitCost)}{icons?.flower} x {frmtNb(contract.quantity)} = {frmtNb(contract.totalCost)}{icons?.flower}</div>
          {Number(contract.totalProdMarket) > 0 ? <div>Prod {icons?.market}: {frmtNb(contract.unitProdMarket)}{icons?.flower} x {frmtNb(contract.quantity)} = {frmtNb(contract.totalProdMarket)}{icons?.flower}</div> : null}
        </>
      ) : null}
      <div>Marketplace{icons?.market}: {frmtNb(contract.unitMarket)}{icons?.flower} x {frmtNb(contract.quantity)} = {frmtNb(contract.totalMarket)}{icons?.flower}</div>
    </>
  );
}

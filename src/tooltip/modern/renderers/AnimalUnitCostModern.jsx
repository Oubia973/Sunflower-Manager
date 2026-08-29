import { frmtNb } from "../../../fct.js";
import { imgmix } from "../../../constants/images.js";
import CompositionTree from "../composition/CompositionTree.jsx";
import { AnimalAllocation, Flower, Icon, ProfitSummary, Row, Section } from "./InventoryFinancialModern.jsx";

export default function AnimalUnitCostModern({ contract, compositionCatalog }) {
  if (!contract) return null;
  const foodName = contract.foodName === "Mix" ? "Mix Food" : contract.foodName;
  const foodImage = contract.foodName === "Mix" ? imgmix : contract.foodImage;

  return <>
    <Section title="Production">
      {contract.currentLevel !== null ? <Row label="Animal level">{frmtNb(contract.currentLevel)}</Row> : null}
      <Row label={foodName || "Food"}>{frmtNb(contract.foodQuantity)} <Icon src={foodImage} label={foodName || "Food"} small /></Row>
      {contract.foodCostTree ? <CompositionTree
        costTree={contract.foodCostTree}
        quantity={contract.foodQuantity}
        catalog={compositionCatalog}
        totalCost={contract.foodCycleCost}
        totalMarket={contract.foodCycleMarketCost}
      /> : <>
        <Row label="Total composition"><Flower value={contract.foodCycleCost} /></Row>
        <Row label="Food market value"><Flower value={contract.foodCycleMarketCost} /></Row>
      </>}

      <AnimalAllocation contract={contract} />
      {contract.buyCropsCost !== null ? <Row label="If food is bought"><Flower value={contract.buyCropsCost} /> /u</Row> : null}
    </Section>

    <Section title="Market">
      <Row label={`Sale after ${frmtNb(contract.tradeTaxPercent)}% tax`}><Flower value={contract.marketAfterTax} /> /u</Row>
    </Section>
    <ProfitSummary
      profit={contract.profit}
      multiplier={contract.profitMultiplier}
      percent={contract.profitPercent}
    />
  </>;
}

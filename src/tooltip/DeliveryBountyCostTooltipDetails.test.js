import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DeliveryBountyCostTooltipDetails from "./DeliveryBountyCostTooltipDetails.jsx";

test("Delivery bounty tooltip renders only its prepared display contract", () => {
  const html = renderToStaticMarkup(
    <DeliveryBountyCostTooltipDetails
      contract={{
        rows: [{ name: "Poppy", img: "poppy.png", cost: 2, market: 3 }],
        costDone: 2,
        costTotal: 4,
        marketDone: 3,
        marketTotal: 6,
        rewardDone: 10,
        rewardTotal: 20,
        bonusReward: 5,
        costPerTicket: 0.2,
        marketPerTicket: 0.3,
      }}
      ticketName="Ticket"
      icons={{ fallback: "fallback.png", market: <span>Market</span> }}
      dragHandleProps={{}}
    />
  );

  expect(html).toContain("Poppy");
  expect(html).toContain("Cost/Ticket");
  expect(html).toContain("(+5)");
  expect(html).toContain("0.2");
  expect(html).toContain("0.3");
});

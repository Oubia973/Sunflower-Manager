import React from "react";
import { useAppCtx } from "../context/AppCtx";
import DList from "../dlist.jsx";
import { selectCurrentProjection } from "../utils/farmState.js";
import { buildDigRatioContract } from "../tooltip/digRatioContract.js";

export default function DigTable() {
    const {
        data: { dataSet, dataSetFarm },
        ui: { selectedDigCur, xListeColBounty, TryChecked },
        actions: { handleUIChange, handleTooltip },
        img: { imgsfl, imgcoins },
    } = useAppCtx();
    const bountyPageData = selectCurrentProjection(dataSetFarm, "bountyData") || {};
    const bountyRows = bountyPageData?.rows || {};
    const totals = bountyPageData?.meta?.totals || {};
    const bountyKeys = Object.keys(bountyRows);
    if (bountyKeys.length < 1) return null;

    const mode = TryChecked ? "try" : "active";
    const coinsRatio = Number(bountyPageData?.meta?.coinsRatio || dataSet?.options?.coinsRatio || 1000);
    const decimals = selectedDigCur === "coins" ? 0 : 3;
    const imgCoins = <img src={imgcoins} alt="" className="itico" title="Coins" />;
    const imgSfl = <img src={imgsfl} alt="" className="itico" title="Flower" />;
    const formatPositive = (value, digits = decimals) => Number(value) > 0 ? Number(value).toFixed(digits) : "";
    const totalContract = buildDigRatioContract({
        itemName: "Total",
        row: totals,
        mode,
        currency: selectedDigCur,
        coinsRatio,
        isTotal: true,
    });

    const tableContent = bountyKeys.map((itemName) => {
        const contract = buildDigRatioContract({
            itemName,
            row: bountyRows[itemName],
            mode,
            currency: selectedDigCur,
            coinsRatio,
        });
        const ico = <img src={contract.itemImage} alt="" className="nodico" title={itemName} />;
        return <tr key={itemName}>
            <td id="iccolumn">{ico}</td>
            {xListeColBounty[0][1] === 1 ? <td className="tditem">{itemName}</td> : null}
            {xListeColBounty[1][1] === 1 ? <td className="tdcenter">{formatPositive(contract.stock, 0)}</td> : null}
            {xListeColBounty[2][1] === 1 ? <td className="tdcenter">{formatPositive(contract.stockValue)}</td> : null}
            <td className="tdcenter">{formatPositive(contract.supply, 0)}</td>
            {xListeColBounty[3][1] === 1 ? <td className="tdcenter">{formatPositive(contract.quantityToday, 0)}</td> : null}
            {xListeColBounty[4][1] === 1 ? <td className="tdcenter">{formatPositive(contract.digValue)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter">{formatPositive(contract.toolCost)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter tooltipcell"
                onClick={(e) => handleTooltip(itemName, "ratiodig", contract, e)}>{formatPositive(contract.ratioCoinsPerSfl, 0)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter">{formatPositive(contract.patternQuantity, 0)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter">{formatPositive(contract.patternValue)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter">{formatPositive(contract.patternToolCost)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter tooltipcell"
                onClick={(e) => handleTooltip(itemName, "ratiodigp", contract, e)}>{formatPositive(contract.patternRatioCoinsPerSfl, 0)}</td> : null}
        </tr>;
    });

    const tableHeader = <thead>
        <tr>
            <th className="th-icon"></th>
            {xListeColBounty[0][1] === 1 ? <th className="thcenter">Name</th> : null}
            {xListeColBounty[1][1] === 1 ? <th className="thcenter">Stock</th> : null}
            {xListeColBounty[2][1] === 1 ? <th className="thcenter">
                <DList
                    name="selectedDigCur"
                    title="Value"
                    options={[
                        { value: "sfl", label: imgSfl },
                        { value: "coins", label: imgCoins },
                    ]}
                    value={selectedDigCur}
                    onChange={handleUIChange}
                    height={28}
                />
            </th> : null}
            <th className="thcenter">Supply</th>
            {xListeColBounty[3][1] === 1 ? <th className="thcenter">Today</th> : null}
            {xListeColBounty[4][1] === 1 ? <th className="thcenter">Value</th> : null}
            {xListeColBounty[5][1] === 1 ? <th className="thcenter">Tool cost</th> : null}
            {xListeColBounty[5][1] === 1 ? <th className="thcenter">Ratio <div>{imgCoins}/{imgSfl}</div></th> : null}
            {xListeColBounty[3][1] === 1 ? <th className="thcenter">Patterns <div>Today</div></th> : null}
            {xListeColBounty[4][1] === 1 ? <th className="thcenter">Patterns <div>Value</div></th> : null}
            {xListeColBounty[5][1] === 1 ? <th className="thcenter">Patterns <div>Tool cost</div></th> : null}
            {xListeColBounty[5][1] === 1 ? <th className="thcenter">Ratio <div>{imgCoins}/{imgSfl}</div></th> : null}
        </tr>
        <tr>
            <td></td>
            {xListeColBounty[0][1] === 1 ? <td className="tdcenter"></td> : null}
            {xListeColBounty[1][1] === 1 ? <td className="tdcenter"></td> : null}
            {xListeColBounty[2][1] === 1 ? <td className="tdcenter">{Number(totalContract.stockValue).toFixed(decimals)}</td> : null}
            <td className="tdcenter">{formatPositive(totalContract.supply, 0)}</td>
            {xListeColBounty[3][1] === 1 ? <td className="tdcenter"></td> : null}
            {xListeColBounty[4][1] === 1 ? <td className="tdcenter">{Number(totalContract.digValue).toFixed(decimals)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter">{Number(totalContract.toolCost).toFixed(decimals)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter tooltipcell"
                onClick={(e) => handleTooltip("Total", "ratiodig", totalContract, e)}>{Number(totalContract.ratioCoinsPerSfl).toFixed(0)}</td> : null}
            {xListeColBounty[3][1] === 1 ? <td className="tdcenter"></td> : null}
            {xListeColBounty[4][1] === 1 ? <td className="tdcenter">{Number(totalContract.patternValue).toFixed(decimals)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter">{Number(totalContract.patternToolCost).toFixed(decimals)}</td> : null}
            {xListeColBounty[5][1] === 1 ? <td className="tdcenter tooltipcell"
                onClick={(e) => handleTooltip("Total", "ratiodigp", totalContract, e)}>{Number(totalContract.patternRatioCoinsPerSfl).toFixed(0)}</td> : null}
        </tr>
    </thead>;

    return <table className="table">
        {tableHeader}
        <tbody>{tableContent}</tbody>
    </table>;
}

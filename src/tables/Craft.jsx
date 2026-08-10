import React from "react";
import { useAppCtx } from "../context/AppCtx";
import { selectCurrentProjection } from "../utils/farmState.js";

export default function CraftTable() {
    const {
        data: { dataSet, dataSetFarm, farmData },
        ui: {
            xListeColBounty,
            TryChecked,
        },
        actions: {
            handleTooltip,
        },
        img: {
            imgSFL,
            imgcoins,
            imgExchng,
            imgna,
            imgbuyit,
            imgprodit
        }
    } = useAppCtx();
    const craftPageData = selectCurrentProjection(dataSetFarm, "craftData") || {};
    const craftTables = craftPageData?.itables || dataSetFarm?.itables || {};
    const craftCostContracts = craftPageData?.tooltipData?.costBreakdowns || {};
    if (craftTables?.craft) {
        const { it = {}, flower = {}, bounty = {}, craft = {} } = craftTables;
        const Keys = Object.keys(craft);
        const imgCoins = <img src={imgcoins} alt={''} className="itico" title="Coins" />;
        const tableContent = Keys.map(element => {
            const cobj = craft[element];
            const itemName = element;
            const ico = <img src={cobj.img} alt={''} className="nftico" title={itemName} />;
            const itime = TryChecked ? cobj.timetry : cobj.time;
            const stock = cobj.instock > 0 ? cobj.instock : '';
            const icost = TryChecked ? cobj.costtry / dataSet.options.coinsRatio : cobj.cost / dataSet.options.coinsRatio;
            const icostm = TryChecked ? (cobj.costp2pttry ?? cobj.costp2pt ?? 0) : cobj.costp2pt;
            let icompoimg = [];
            const costContract = craftCostContracts?.[itemName]?.[TryChecked ? "try" : "active"];
            for (const [key, node] of Object.entries(costContract?.costTree?.nodes || {})) {
                const compoQuant = Number(node?.qty || 0);
                let icompoToAdd = imgna;
                if (it[key]) { icompoToAdd = it[key].img; }
                if (bounty[key]) { icompoToAdd = bounty[key].img; }
                if (flower[key]) { icompoToAdd = flower[key].img; }
                if (craft[key]) { icompoToAdd = craft[key].img; }
                icompoimg.push(
                    <span key={key}>
                        {compoQuant}
                        <img src={icompoToAdd} alt="" className="itico" title={key} />
                    </span>
                );
            }
            return (
                <tr key={element}>
                    <td id="iccolumn">{ico}</td>
                    {xListeColBounty[0][1] === 1 ? <td className="tditem">{itemName}</td> : null}
                    {xListeColBounty[1][1] === 1 ? <td className="tdcenter">{stock}</td> : null}
                    {xListeColBounty[2][1] === 1 ? <td className="tdcenter">{itime}</td> : null}
                    {xListeColBounty[3][1] === 1 ? <td className="tdcenter tooltipcell"
                        onClick={(e) => handleTooltip(itemName, "craftcompo", 0, e)}>{icompoimg}</td> : null}
                    {xListeColBounty[4][1] === 1 ? <td className="tdcenter">{parseFloat(icost).toFixed(3)}</td> : null}
                    {xListeColBounty[5][1] === 1 ? <td className="tdcenter">{parseFloat(icostm).toFixed(3)}</td> : null}
                </tr>
            );
        });
        const tableHeader = (
            <thead>
                <tr>
                    <th className="th-icon"></th>
                    {xListeColBounty[0][1] === 1 ? <th className="thcenter">Name</th> : null}
                    {xListeColBounty[1][1] === 1 ? <th className="thcenter">Stock</th> : null}
                    {xListeColBounty[2][1] === 1 ? <th className="thcenter">Time</th> : null}
                    {xListeColBounty[3][1] === 1 ? <th className="thcenter">Compos</th> : null}
                    {xListeColBounty[4][1] === 1 ? <th className="thcenter">Cost {imgprodit}</th> : null}
                    {xListeColBounty[5][1] === 1 ? <th className="thcenter">Bought {imgbuyit}</th> : null}
                </tr>
            </thead>
        );

        const table = (
            <>
                <table className="table">
                    {tableHeader}
                    <tbody>
                        {tableContent}
                    </tbody>
                </table>
            </>
        );

        return (table);
    }
}

import React from "react";
import { frmtNb } from "../fct.js";
import { imgstonePickaxe, imgadmin, imgfactions, imgxp } from "../constants/images.js";
import { BOOST_ITEM_CATEGORY_ALIASES, inferCategoryTokens, normalizeToken as normalizeCategoryToken } from "../tryNftTaxonomy.js";

const ListBoost = ({
    item,
    value,
    Item,
    ForTry,
    imgna,
    myieldortry,
    keyFn,
    dataSetFarm,
    it,
    buildng,
    boostables,
}) => {
    const { nft, nftw, skill, skilllgc, bud, shrine } = boostables || {};
    const booststable = { ...skilllgc, ...skill, ...buildng, ...nft, ...nftw, ...bud, ...shrine };
    const imtemimg = <img src={Item?.img ?? imgna} alt={item} style={{ width: "22px", height: "22px" }} />;
    const nativeBoostIcon = imgstonePickaxe;
    const currentSeason = String(
        dataSetFarm?.curSeason ||
        dataSetFarm?.frmData?.curSeason ||
        dataSetFarm?.frmData?.trySeason ||
        dataSetFarm?.frmData?.season ||
        ""
    ).toLowerCase();
    const normalizeToken = (value) => String(value ?? "").trim().toLowerCase();
    const canonicalToken = (value) => normalizeToken(value);
    const canonicalCategoryToken = (value) => normalizeCategoryToken(value, BOOST_ITEM_CATEGORY_ALIASES);

    const getNativeBoost = () => {
        const itemCatNorm = String(Item?.cat || "").toLowerCase();
        if (itemCatNorm !== "wood" && itemCatNorm !== "mineral") { return null; }
        return {
            name: "Native",
            img: nativeBoostIcon,
            boost: "20% chance +1",
        };
    };

    const matchesSeason = (boostSeason) => {
        if (!boostSeason) { return true; }
        if (!currentSeason) { return false; }
        const seasonList = Array.isArray(boostSeason) ? boostSeason : [boostSeason];
        return seasonList
            .map((v) => canonicalToken(v))
            .filter(Boolean)
            .includes(currentSeason);
    };

    const getBoostTypeTokens = (boostTypeValue) => {
        if (boostTypeValue === null || boostTypeValue === undefined) { return []; }
        return (Array.isArray(boostTypeValue) ? boostTypeValue : [boostTypeValue])
            .map((v) => canonicalToken(v))
            .filter(Boolean);
    };

    const getBoostItemTokens = (boostItemValue) => {
        if (boostItemValue === null || boostItemValue === undefined) { return []; }
        return (Array.isArray(boostItemValue) ? boostItemValue : [boostItemValue])
            .map((v) => canonicalToken(v))
            .filter(Boolean);
    };

    const getBoostCategoryTokens = (boost) => {
        const values = [
            boost?.cat,
            boost?.category,
            boost?.scat,
        ];
        const explicit = values
            .flatMap((v) => String(v ?? "").split(/[\s,;/|]+/g))
            .map((v) => canonicalCategoryToken(v))
            .filter(Boolean);
        const inferred = inferCategoryTokens(boost?.boost || "").map((v) => canonicalCategoryToken(v)).filter(Boolean);
        return [...new Set([...explicit, ...inferred])];
    };

    const getItemFamilyTokens = () => {
        const directTables = dataSetFarm?.itables || dataSetFarm?.cookData?.itables || {};
        const tokens = new Set();
        const addFamily = (value) => {
            const token = canonicalCategoryToken(value);
            if (token) tokens.add(token);
        };
        addFamily(Item?.cat);
        addFamily(Item?.scat);
        Object.entries(directTables).forEach(([tableName, table]) => {
            if (table && table[item]) {
                addFamily(tableName);
            }
        });
        return tokens;
    };

    const getItemTargetTokens = (itemName) => {
        const directTables = dataSetFarm?.itables || dataSetFarm?.cookData?.itables || {};
        const baseTokens = new Set([
            canonicalToken(itemName),
            canonicalToken(Item?.cat),
            canonicalToken(Item?.scat),
            canonicalToken(Item?.bld),
        ].filter(Boolean));
        const boostTokens = new Set();
        const boostCatValues = Array.isArray(Item?.boostcat) ? Item.boostcat : [Item?.boostcat];
        boostCatValues
            .map((value) => canonicalToken(value))
            .filter(Boolean)
            .forEach((token) => boostTokens.add(token));
        Object.entries(directTables).forEach(([tableName, table]) => {
            if (table && table[itemName]) {
                baseTokens.add(canonicalToken(tableName));
            }
        });
        return { baseTokens, boostTokens };
    };

    const filterBoosts = (itemName, boosttype, tryset) => {
        const { baseTokens, boostTokens } = getItemTargetTokens(itemName);
        const itemFamilyTokens = getItemFamilyTokens();
        return Object.keys(booststable).filter((nftitem) => {
            const boost = booststable[nftitem];
            const activeOrTryit = tryset ? "tryit" : "isactive";
            const boostactive = tryset ? boost.tryit : boost.isactive;
            const boostTypeTokens = getBoostTypeTokens(boost?.boosttype);
            const boostItemTokens = getBoostItemTokens(boost?.boostit);
            const boostCategoryTokens = getBoostCategoryTokens(boost);
            const hasBoostType = boostTypeTokens.includes(canonicalToken(boosttype));
            const matchesBaseItem = boostItemTokens.some((token) => baseTokens.has(token));
            const matchesBoostCat = boostItemTokens.some((token) => boostTokens.has(token));
            const boostFamilyMatchesItem = boostCategoryTokens.length < 1 || boostCategoryTokens.some((token) => itemFamilyTokens.has(token));
            const matchesXpWildcard = canonicalToken(boosttype) === "xp" && boostItemTokens.includes("xp");
            return boostactive && hasBoostType && matchesSeason(boost?.season) && (matchesBaseItem || (matchesBoostCat && boostFamilyMatchesItem) || matchesXpWildcard);
        });
    };

    let filteredBoosts = [];
    let extraBoosts = [];
    let txtItem = "";
    if (value === "timechg") {
        filteredBoosts = filterBoosts(item, "time", ForTry);
        txtItem = <div>Boosts for {imtemimg}{item} time:</div>;
    }
    if (value === "yieldchg") {
        filteredBoosts = filterBoosts(item, "yield", ForTry);
        const nativeBoost = getNativeBoost();
        if (nativeBoost) {
            extraBoosts.push(nativeBoost);
        }
        txtItem = <div>Boosts for {imtemimg}{item} yield:</div>;
    }
    if (value === "costchg") {
        filteredBoosts = filterBoosts(item, "cost", ForTry);
        txtItem = <div>Boosts for {imtemimg}{item} cost:</div>;
    }
    if (value === "yield") {
        filteredBoosts = [...filterBoosts(item, "yield", ForTry), ...filterBoosts(item, "time", ForTry), ...filterBoosts(item, "cost", ForTry)];
        const nativeBoost = getNativeBoost();
        if (nativeBoost) {
            extraBoosts.push(nativeBoost);
        }
        txtItem = (
            <>
                <div>{imtemimg}{item} yield : {frmtNb(Item[myieldortry])}</div>
                <div>{frmtNb(Item[keyFn("harvestnode")])} average by node</div>
                <div>Boosts :</div>
            </>
        );
    }
    if (value === "xp") {
        const xpKey = ForTry ? "xptry" : "xp";
        filteredBoosts = [...new Set(filterBoosts(item, "xp", ForTry))];
        const vipActive = Boolean(dataSetFarm?.frmData?.vip ?? dataSetFarm?.vip);
        const faction = dataSetFarm?.frmData?.faction || dataSetFarm?.faction || {};
        const factionStreak = Number(faction?.streak || 0);
        const factionActiveStreak = Number(faction?.activeStreak ?? factionStreak);
        const factionEligible = Boolean(faction?.isEligible);
        const factionMul = factionActiveStreak >= 8 ? 1.5 : factionActiveStreak >= 6 ? 1.3 : factionActiveStreak >= 4 ? 1.2 : factionActiveStreak >= 2 ? 1.1 : 1;
        const nextFactionMul = factionStreak >= 8 ? 1.5 : factionStreak >= 6 ? 1.3 : factionStreak >= 4 ? 1.2 : factionStreak >= 2 ? 1.1 : 1;
        const factionBonusPct = factionEligible ? Math.round((factionMul - 1) * 100) : 0;
        const nextFactionBonusPct = Math.round((nextFactionMul - 1) * 100);
        const bonusPending = factionStreak > factionActiveStreak;
        if (vipActive) {
            extraBoosts.push({
                name: "VIP",
                img: imgadmin,
                boost: "+10% xp",
            });
        }
        if (factionBonusPct > 0) {
            extraBoosts.push({
                name: "Faction bonus",
                img: imgfactions,
                boost: `+${factionBonusPct}% xp (active streak ${factionActiveStreak})`,
            });
        }
        if (bonusPending) {
            extraBoosts.push({
                name: "Faction streak",
                img: imgfactions,
                boost: `Streak ${factionStreak} reached, +${nextFactionBonusPct}% active next week`,
            });
        }
        txtItem = (
            <>
                <div>{imtemimg}{item} xp : {frmtNb(Item?.[xpKey] ?? Item?.xp ?? 0)}</div>
                <div>Boosts :</div>
            </>
        );
    }
    if (value && typeof value === "object" && value.type === "petityield") {
        const details = Array.isArray(value.details) ? value.details : [];
        const totalYield = Number(value.totalYield ?? Item?.[myieldortry] ?? 1) || 1;
        txtItem = (
            <>
                <div>{imtemimg}{item} yield : {frmtNb(totalYield)}</div>
                <div>Boosts & perks counted:</div>
            </>
        );
        filteredBoosts = [];
        extraBoosts = details
            .filter((d) => (d?.n || "") !== "Base")
            .map((d) => {
                const name = d?.n || "Boost";
                const amount = Number(d?.a || 0);
                const boostImg = booststable?.[name]?.img;
                const isPerk = /perk/i.test(name);
                return {
                    name,
                    img: boostImg || (isPerk ? imgxp : imgna),
                    boost: `${amount >= 0 ? "+" : ""}${frmtNb(amount)} yield`,
                };
            });
    }

    return (
        <div>
            {txtItem}
            {(filteredBoosts.length > 0 || extraBoosts.length > 0) ? (
                <>
                {filteredBoosts.map((nftitem, index) => (
                    <div key={index}>
                        <img src={booststable[nftitem].img ?? imgna} alt={nftitem} style={{ width: "22px", height: "22px" }} />
                        {nftitem} : {booststable[nftitem].boost}
                    </div>
                ))}
                {extraBoosts.map((boost, index) => (
                    <div key={`extra-${index}`}>
                        <img src={boost.img ?? imgna} alt={boost.name} style={{ width: "22px", height: "22px" }} />
                        {boost.name} : {boost.boost}
                    </div>
                ))}
                </>
            ) : (
                <div>No boosts for this item.</div>
            )}
        </div>
    );
};

export default ListBoost;

import React from "react";
import { useAppCtx } from "../context/AppCtx";

import HomeTable from "./Home";
import InvTable from "./Inv";
import CookTable from "./Cook";
import FishTable from "./Fish";
import ChapterTable from "./Chapter";
import FlowerTable from "./Flower";
import DigTable from "./Dig";
import AnimalsTable from "./Animals";
import AnimalsReadableTable from "./AnimalsReadable";
import PetsTable from "./Pets";
import CraftTable from "./Craft";
import CropMachineTable from "./CropMachine";
import CropMachineReadableTable from "./CropMachineReadable";
import MapTable from "./Map";
import ExpandTable from "./Expand";
import ActivityTable from "./Activity";
// MarketTable is temporarily disabled; retain the import for restoration.
// import MarketTable from "./Market";
import FactionsTable from "./Factions";
import TopListsTable from "./TopListsLazy";
import BuyNodesTable from "./BuyNodes";
import AuctionsTable from "./Auctions";
import LavaPitsTable from "./LavaPits";
import RngPredictionTable from "./RngPrediction";
import SupplyTable from "./Supply";

export default function PanelTable() {
  const { ui: { selectedInv, interfaceMode } } = useAppCtx();

  if (selectedInv === "home") return <HomeTable />;
  if (selectedInv === "inv") return <InvTable />;
  if (selectedInv === "cook") return <CookTable />;
  if (selectedInv === "fish") return <FishTable />;
  if (selectedInv === "chapter") return <ChapterTable />;
  if (selectedInv === "flower") return <FlowerTable />;
  if (selectedInv === "bounty") return <DigTable />;
  if (selectedInv === "animal") return interfaceMode === "compact" ? <AnimalsReadableTable /> : <AnimalsTable />;
  if (selectedInv === "pet") return <PetsTable />;
  if (selectedInv === "craft") return <CraftTable />;
  if (selectedInv === "cropmachine") return interfaceMode === "compact" ? <CropMachineReadableTable /> : <CropMachineTable />;
  if (selectedInv === "map") return <MapTable />;
  if (selectedInv === "expand") return <ExpandTable />;
  if (selectedInv === "activity") return <ActivityTable />;
  // Market is temporarily disabled; retain the route for restoration.
  // if (selectedInv === "market") return <MarketTable />;
  if (selectedInv === "factions") return <FactionsTable />;
  if (selectedInv === "toplists") return <TopListsTable />;
  if (selectedInv === "buynodes") return <BuyNodesTable />;
  if (selectedInv === "lavapits") return <LavaPitsTable />;
  if (selectedInv === "rngprediction") return <RngPredictionTable />;
  if (selectedInv === "supply") return <SupplyTable />;
  if (selectedInv === "auctions") return <AuctionsTable />;

  return null;
}

/**
 * Table column templates, pickers, and sort options for all data tables.
 */

// ==================== INVENTORY TABLE ====================
export const INV_COLUMNS_TEMPLATE = [
  ['Item name', 0],
  ['Quantity', 1],
  ['Time', 1],
  ['Production cost', 1],
  ['Shop price', 1],
  ['Ratio coins/flower', 1],
  ['Marketplace price', 1],
  ['Withdraw quantity', 0],
  ['Niftyswap price', 0],
  ['OpenSea price', 0],
  ['Price difference with Marketplace', 0],
  ['Yield', 1],
  ['Harvest average', 1],
  ['To harvest', 1],
  ['Restock production', 0],
  ['Daily Flower', 1],
  ['Daily max production', 1],
  ['Profit %', 1],
  ['When ready', 1],
  ['Price change', 1],
  ['Gain/h', 0],
  ['Buy', 1],
];

export const INV_COLUMNS_PICKER = [
  { idx: 0, label: 'Item name' },
  { idx: 1, label: 'Quantity' },
  { idx: 2, label: 'Time' },
  { idx: 3, label: 'Production cost' },
  { idx: 4, label: 'Shop price' },
  { idx: 5, label: 'Ratio coins/flower' },
  { idx: 6, label: 'Marketplace price' },
  { idx: 7, label: 'Withdraw quantity' },
  { idx: 8, label: 'Niftyswap price' },
  { idx: 9, label: 'OpenSea price' },
  { idx: 10, label: 'Price difference with Marketplace' },
  { idx: 11, label: 'Yield' },
  { idx: 12, label: 'Harvest average' },
  { idx: 13, label: 'To harvest' },
  { idx: 14, label: 'Restock production' },
  { idx: 15, label: 'Daily Flower' },
  { idx: 16, label: 'Daily max production' },
  { idx: 17, label: 'Profit %' },
  { idx: 18, label: 'When ready' },
  { idx: 19, label: 'Price change' },
  { idx: 20, label: 'Gain/h' },
  { idx: 21, label: 'Buy' },
];

export const INV_SORT_OPTIONS_TEMPLATE = [
  { value: "none", label: "Default", idx: null },
  { value: "item", label: "Item", idx: 0 },
  { value: "quantity", label: "Quantity", idx: 1 },
  { value: "time", label: "Time", idx: 2 },
  { value: "cost", label: "Cost", idx: 3 },
  { value: "shop", label: "Shop", idx: 4 },
  { value: "market", label: "Market", idx: 6 },
  { value: "nifty", label: "Nifty", idx: 8 },
  { value: "opensea", label: "OpenSea", idx: 9 },
  { value: "ratio", label: "Ratio", idx: 5 },
  { value: "yield", label: "Yield", idx: 10 },
  { value: "harvest", label: "Harvest", idx: 11 },
  { value: "toharvest", label: "ToHarvest", idx: 12 },
  { value: "dailysfl", label: "Daily Flower", idx: 14 },
  { value: "gainh", label: "Gain/h", idx: 20 },
  { value: "ready", label: "Ready", idx: 18 },
  { value: "pricechange", label: "Price change", idx: 19 },
];

// ==================== COOK TABLE ====================
export const COOK_COLUMNS_TEMPLATE = [
  ['Building', 1],
  ['Item name', 0],
  ['Quantity', 1],
  ['XP', 1],
  ['Time to cook', 1],
  ['Time for components growing', 0],
  ['XP/H', 1],
  ['XP/H with components time', 0],
  ['XP/Flower', 1],
  ['Oil', 1],
  ['Cost', 1],
  ['Marketplace price', 1],
  ['Components', 1],
];

export const COOK_COLUMNS_PICKER = [
  { idx: 0, label: 'Building' },
  { idx: 1, label: 'Item name' },
  { idx: 2, label: 'Quantity' },
  { idx: 3, label: 'XP' },
  { idx: 4, label: 'Time to cook' },
  //{ idx: 5, label: 'Time for components growing' },
  { idx: 6, label: 'XP/H' },
  //{ idx: 7, label: 'XP/H with components time' },
  { idx: 8, label: 'XP/Flower' },
  { idx: 9, label: 'Oil' },
  { idx: 10, label: 'Cost' },
  { idx: 11, label: 'Marketplace price' },
  { idx: 12, label: 'Components' },
];

export const COOK_SORT_OPTIONS_TEMPLATE = [
  { value: "none", label: "Default", idx: null },
  { value: "building", label: "Building", idx: 0 },
  { value: "item", label: "Item", idx: 1 },
  { value: "quantity", label: "Quantity", idx: 2 },
  { value: "xp", label: "XP", idx: 3 },
  { value: "time", label: "Time", idx: 4 },
  { value: "xph", label: "XP/H", idx: 6 },
  { value: "xpsfl", label: "XP/Flower", idx: 8 },
  { value: "cost", label: "Cost", idx: 10 },
  { value: "market", label: "Marketplace", idx: 11 },
  { value: "components", label: "Components", idx: 12 },
];

// ==================== FISH TABLE ====================
export const FISH_COLUMNS_TEMPLATE = [
  ['Category', 1],
  ['Location', 0],
  ['Item name', 1],
  ['Bait', 1],
  ['Quantity', 1],
  ['Caught', 1],
  ['Map', 1],
  ['Chum', 1],
  ['Period', 1],
  ['Percent by category', 1],
  ['XP', 1],
  ['Cost', 1],
  ['Market', 1],
  ['XP/Flower', 1],
];

export const FISH_COLUMNS_PICKER = [
  { idx: 0, label: 'Category' },
  //{ idx: 1, label: 'Location' },
  { idx: 2, label: 'Fish' },
  { idx: 3, label: 'Bait' },
  { idx: 4, label: 'Quantity' },
  { idx: 5, label: 'Caught' },
  { idx: 6, label: 'Map' },
  { idx: 7, label: 'Chum' },
  { idx: 8, label: 'Period' },
  { idx: 9, label: '% by category' },
  { idx: 10, label: 'XP' },
  { idx: 11, label: 'Cost' },
  { idx: 12, label: 'Market' },
  { idx: 13, label: 'XP/Flower' },
];

// ==================== CRUSTACEAN TABLE ====================
export const CRUSTA_COLUMNS_TEMPLATE = [
  ['Tool', 1],
  ['Crustacean', 1],
  ['Stock', 1],
  ['Caught', 1],
  ['Chum', 1],
  ['Cost', 1],
  ['Market', 1],
  ['Grow', 1],
  ['Ready', 1],
];

export const CRUSTA_COLUMNS_PICKER = [
  { idx: 0, label: 'Tool' },
  { idx: 1, label: 'Crustacean' },
  { idx: 2, label: 'Stock' },
  { idx: 3, label: 'Caught' },
  { idx: 4, label: 'Chum' },
  { idx: 5, label: 'Cost' },
  { idx: 6, label: 'Market' },
  { idx: 7, label: 'Grow' },
  { idx: 8, label: 'Ready' },
];

// ==================== PET TABLES ====================
export const PET_PETS_COLUMNS_TEMPLATE = [
  ['Pet', 1],
  ['Fetch', 1],
  ['Supply', 1],
  ['Lvl', 1],
  ['Aura', 1],
  ['Bib', 1],
  ['Current Energy', 1],
  ['Requests', 1],
  ['Energy', 1],
  ['Cost', 1],
  ['Marketplace', 1],
  ['Energy/SFL', 1],
  ['Energy/Marketplace', 1],
];

export const PET_PETS_COLUMNS_PICKER = [
  { idx: 0, label: 'Pet' },
  { idx: 1, label: 'Fetch' },
  { idx: 2, label: 'Supply' },
  { idx: 3, label: 'Lvl' },
  { idx: 4, label: 'Aura' },
  { idx: 5, label: 'Bib' },
  { idx: 6, label: 'Current Energy' },
  { idx: 7, label: 'Requests' },
  { idx: 8, label: 'Energy' },
  { idx: 9, label: 'Cost' },
  { idx: 10, label: 'Marketplace' },
  { idx: 11, label: 'Energy/SFL' },
  { idx: 12, label: 'Energy/Marketplace' },
];

export const PET_SHRINES_COLUMNS_TEMPLATE = [
  ['Shrine', 1],
  ['Components', 1],
  ['Time', 1],
  ['Cost', 1],
  ['Marketplace', 1],
  ['Supply', 1],
  ['Boost', 1],
];

export const PET_SHRINES_COLUMNS_PICKER = [
  { idx: 0, label: 'Shrine' },
  { idx: 1, label: 'Components' },
  { idx: 2, label: 'Time' },
  { idx: 3, label: 'Cost' },
  { idx: 4, label: 'Marketplace' },
  { idx: 5, label: 'Supply' },
  { idx: 6, label: 'Boost' },
];

export const PET_COMPONENTS_COLUMNS_TEMPLATE = [
  ['Component', 1],
  ['Quantity', 1],
  ['Energy', 1],
  ['Yield', 1],
  ['Cost', 1],
  ['Prod Marketplace', 1],
  ['Marketplace', 1],
  ['Fetched by', 1],
  ['Used in Shrines', 1],
];

export const PET_COMPONENTS_COLUMNS_PICKER = [
  { idx: 0, label: 'Component' },
  { idx: 1, label: 'Quantity' },
  { idx: 2, label: 'Energy' },
  { idx: 3, label: 'Yield' },
  { idx: 4, label: 'Cost' },
  { idx: 5, label: 'Prod Marketplace' },
  { idx: 6, label: 'Marketplace' },
  { idx: 7, label: 'Fetched by' },
  { idx: 8, label: 'Used in Shrines' },
];

// ==================== CROP MACHINE TABLE ====================
export const CROPMACHINE_COLUMNS_TEMPLATE = [
  ['Select', 1],
  ['Name', 1],
  ['Time', 1],
  ['Seeds', 1],
  ['Harvest Average', 1],
  ['Harvest Cost', 1],
  ['Oil', 1],
  ['Oil Cost', 1],
  ['Total Cost', 1],
  ['Marketplace', 1],
  ['Profit', 1],
  ['Gain/h', 1],
  ['Daily SFL', 1],
];

export const CROPMACHINE_COLUMNS_PICKER = [
  { idx: 0, label: 'Select' },
  { idx: 1, label: 'Name' },
  { idx: 2, label: 'Time' },
  { idx: 3, label: 'Seeds' },
  { idx: 4, label: 'Harvest Avg' },
  { idx: 5, label: 'Harvest Cost' },
  { idx: 6, label: 'Oil' },
  { idx: 7, label: 'Oil Cost' },
  { idx: 8, label: 'Total Cost' },
  { idx: 9, label: 'Marketplace' },
  { idx: 10, label: 'Profit' },
  { idx: 11, label: 'Gain/h' },
  { idx: 12, label: 'Daily SFL' },
];

// ==================== EXPAND TABLE ====================
export const EXPAND_COLUMNS_TEMPLATE = [
  ['Level', 1],
  ['Bumpkin', 1],
  ['From / To', 1],
  ['Nodes', 1],
  ['Time', 1],
  ['Resources', 1],
  ['Value', 1],
];

export const EXPAND_COLUMNS_PICKER = [
  { idx: 1, label: 'Bumpkin' },
  { idx: 2, label: 'From / To' },
  { idx: 3, label: 'Nodes' },
  { idx: 4, label: 'Time' },
  { idx: 5, label: 'Resources' },
  { idx: 6, label: 'Value' },
];

// ==================== BUY NODES TABLE ====================
export const BUYNODES_COLUMNS_TEMPLATE = [
  ['Node', 1],
  ['Base', 1],
  ['Increase', 1],
  ['Owned', 1],
  ['Bought', 1],
  ['Buy', 1],
  ['Nodes after', 1],
  ['Next Price', 1],
  ['Sunstone Total', 1],
  ['Obsidian Total', 1],
  ['Obsidian Time', 1],
  ['Bought to reach', 1],
  // ['Priority', 1],
  // ['Remaining Obs', 1],
];

export const BUYNODES_COLUMNS_PICKER = [
  { idx: 0, label: 'Node' },
  { idx: 1, label: 'Base' },
  { idx: 2, label: 'Increase' },
  { idx: 3, label: 'Owned' },
  { idx: 4, label: 'Bought' },
  { idx: 5, label: 'Buy' },
  { idx: 6, label: 'Nodes after' },
  { idx: 7, label: 'Next Price' },
  { idx: 8, label: 'Sunstone Total' },
  { idx: 9, label: 'Obsidian Total' },
  { idx: 10, label: 'Obsidian Time' },
  { idx: 11, label: 'Bought to reach' },
  // { idx: 12, label: 'Priority' },
  // { idx: 13, label: 'Remaining Obs' },
];

// ==================== AUCTIONS TABLE ====================
export const AUCTIONS_COLUMNS_TEMPLATE = [
  ['Item', 1],
  ['Type', 1],
  ['cur', 1],
  ['Supply', 1],
  ['End', 1],
  ['Notifications', 1],
];

export const AUCTIONS_COLUMNS_PICKER = [
  { idx: 0, label: 'Item' },
  { idx: 1, label: 'Type' },
  { idx: 2, label: 'cur' },
  { idx: 3, label: 'Supply' },
  { idx: 4, label: 'End' },
  { idx: 5, label: 'Notifications' },
];

// ==================== ACTIVITY TABLES ====================
export const ACTIVITY_COLUMNS_TEMPLATE = [
  ['From', 1],
  ['Total XP', 1],
  ['Tickets on daily chest', 1],
  ['Tickets from deliveries', 1],
  ['Tickets from chores', 1],
  ['Bounty Chickens', 1],
  ['Bounty Barn', 1],
  ['Bounty Poppy', 1],
  ['Tickets max', 1],
  ['Deliveries cost', 1],
  ['Deliveries cost P2P', 1],
  ['Ticket cost', 1],
  ['SFL from deliveries', 1],
  ['Coins from deliveries', 1],
  ['Poppy cost', 1],
  ['Poppy cost P2P', 1],
  ['Poppy ticket cost', 1],
];

export const ACTIVITY_ITEM_COLUMNS_TEMPLATE = [
  ['Item Name', 1],
  ['Harvested', 1],
  ['Quantity', 1],
  ['Burned', 1],
  ['Production Cost', 1],
  ['Marketplace Price', 1],
  ['Niftyswap Price', 0],
  ['OpenSea Price', 0],
  ['Traded', 1],
  ['Devliveries Burn', 1],
];

export const ACTIVITY_QUEST_COLUMNS_TEMPLATE = [
  ['From', 1],
  ['Description', 1],
  ['Reward', 1],
  ['Date', 1],
];

// ==================== BOUNTY & ANIMALS (inline in App) ====================
export const BOUNTY_COLUMNS_TEMPLATE = [
  ['Item name', 1],
  ['Stock', 1],
  ['Value', 1],
  ['Today', 1],
  ['Value', 1],
  ['ToolCost', 1],
];

export const ANIMALS_COLUMNS_TEMPLATE = [
  ['Item name', 1],
  ['LVL', 1],
  ['Prod 1', 1],
  ['Prod 2', 1],
  ['Food', 1],
  ['Food Cost', 1],
  ['Food Cost P2P', 1],
  ['Prod 1 Cost', 1],
  ['Prod 1 Cost P2P', 1],
  ['Prod 2 Cost', 1],
  ['Prod 2 Cost P2P', 1],
  ['1 love', 1],
  ['2 love', 1],
];

// ==================== FLOWER TABLE ====================
export const FLOWER_COLUMNS_TEMPLATE = [
  ['Seed', 1],
  ['Flower name', 1],
  ['Breeding', 1],
  ['Quantity in bag', 1],
  ['Found', 1],
];

/**
 * Image paths and JSX image elements used throughout the application.
 *
 * Categories:
 * - Core resources and materials
 * - Creatures, pets, and collectibles
 * - UI states and actions
 * - Navigation and platform icons
 * - Expansion and node assets
 * - JSX helpers
 */

import gobcarry from "../gobcarry.gif";

export const ASSET_VERSION = 'v1';

const appendVersionParam = (path) => {
  const raw = String(path || "").trim();
  if (!raw) return raw;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  const hashIndex = raw.indexOf('#');
  const queryIndex = raw.indexOf('?');
  const hasHash = hashIndex >= 0;
  const hasQuery = queryIndex >= 0;
  const hash = hasHash ? raw.slice(hashIndex) : '';
  const base = hasHash ? raw.slice(0, hashIndex) : raw;
  const pathname = hasQuery ? base.slice(0, queryIndex) : base;
  const search = hasQuery ? base.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(search);
  params.set('v', ASSET_VERSION);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
};

const asset = (path) => {
  return appendVersionParam(path);
};

export const versionImageUrl = (path) => appendVersionParam(path);
const publicAsset = (path) => appendVersionParam(path.startsWith('/') ? path : `/${path}`);

export const getImageFileName = (path) => {
  const raw = String(path || "").trim();
  if (!raw) return '';
  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  const parts = withoutQuery.split('/');
  return parts[parts.length - 1] || '';
};

const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;
const IMAGE_HINT_RE = /(?:\/icon\/|\/image\/|\/img\/|\/logo\d*\.|\/.*\.(?:png|jpe?g|gif|webp|svg|bmp|ico|avif)(?:$|[?#]))/i;
const PATH_LIKE_RE = /^(?:\/|\.{1,2}\/|https?:\/\/)/i;
const SERVER_IMAGE_SKIP_KEYS = new Set([
  'bumpkinImg',
  'bumpkinImgFarmId',
]);

const looksLikeSameOriginImage = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (/^(data:|blob:)/i.test(raw)) return false;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      if (typeof window !== "undefined" && window.location && parsed.origin !== window.location.origin) {
        return false;
      }
      return IMAGE_EXT_RE.test(parsed.pathname) || IMAGE_HINT_RE.test(parsed.pathname);
    } catch {
      return false;
    }
  }
  return PATH_LIKE_RE.test(raw) && (IMAGE_EXT_RE.test(raw) || IMAGE_HINT_RE.test(raw));
};

export const normalizeServerImageUrl = (value) => {
  if (!looksLikeSameOriginImage(value)) return value;
  return versionImageUrl(value);
};

const normalizeServerImagesDeepInternal = (value, key = "") => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeServerImagesDeepInternal(entry));
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && !SERVER_IMAGE_SKIP_KEYS.has(key)) {
      return normalizeServerImageUrl(value);
    }
    return value;
  }
  const output = {};
  Object.entries(value).forEach(([entryKey, entryValue]) => {
    if (SERVER_IMAGE_SKIP_KEYS.has(entryKey)) {
      output[entryKey] = entryValue;
      return;
    }
    output[entryKey] = normalizeServerImagesDeepInternal(entryValue, entryKey);
  });
  return output;
};

export const normalizeServerImagesDeep = (value) => normalizeServerImagesDeepInternal(value);

// Core resources and materials
export const imgsfl = asset('./icon/res/flowertoken.webp');
export const imgcoins = asset('./icon/res/coins.png');
export const imggem = asset('./icon/res/gem.webp');
export const imgmix = asset('./icon/res/mixed_grain_v2.webp');
export const imgomni = asset('./icon/res/omnifeed.webp');
export const imgsunflowerseed = asset('./icon/res/sunflower_seed.png');
export const imgcrustacean = asset('./icon/fish/dollocaris.webp');
export const imgfish = asset('./icon/fish/anchovy.png');
// Towns, quest, and special resources
export const imgshrine = asset('./icon/shrine/boar.webp');
export const imgpoppy = asset('./icon/pnj/poppy.png');
export const imgacorn = asset('./icon/pet/acorn.webp');
export const imgobsidian = asset('./icon/res/obsidian.webp');
export const imgwoodRes = asset('./icon/res/wood.png');
export const imgstoneRes = asset('./icon/res/stone.png');
export const imgmark = asset('./icon/res/mark.webp');
export const imgpotionticket = asset('./icon/res/tiketpotion.png');
export const imgkeytreasure = asset('./icon/res/keytreasure.png');
export const imgkeyrare = asset('./icon/res/keyrare.png');
export const imgkeyluxury = asset('./icon/res/keyluxury.png');
export const imglovecharm = asset('./icon/res/lovecharm.webp');
export const imgcheer = asset('./icon/res/cheer.webp');
export const imgpurpleDaffodil = asset('./icon/flower/purple_daffodil.webp');
export const imgisopod = asset('./icon/crusta/isopod.webp');
export const imgblackMagic = asset('./icon/mutant/black_magic.png');
export const imgbigOrange = asset('./icon/mutant/big_orange.webp');
export const imgdoll = asset('./icon/craft/dolls/doll.webp');
export const imgcrop = asset('./icon/res/soil.png');
export const imgwood = asset('./icon/res/harvested_tree.png');
export const imgstone = asset('./icon/res/stone_small.png');
export const imgsaltfarm = asset('./icon/res/salt_farm.webp');
export const imgapple = asset('./icon/res/apple.png');
export const imghoney = asset('./icon/res/honey.png');
export const imgsunstone = asset('./icon/res/sunstone.png');
export const imgironOre = asset('./icon/res/iron_ore.png');
export const imggoldOre = asset('./icon/res/gold_ore.png');
export const imgcrimstone = asset('./icon/res/crimstone.png');
export const imgcompost = asset('./icon/res/compost.png');
export const imgappleTree = asset('./icon/res/apple_tree.png');
export const imgbannanaTreeReady = asset('./icon/res/banana_tree_ready.png');
export const imgcrystalBiome = asset('./icon/biome/crystal.webp');
export const imgascensionMonument = asset('./icon/nft/ascension_monument.webp');
export const imgascensionCrystal = asset('./icon/res/ascension_crystal.webp');
export const imglifetime = asset('./icon/banner/lifetime.png');
export const imgbeehive = asset('./icon/res/beehive.webp');
export const imgflowerbed = asset('./icon/flower/flower_bed_modal.png');
// Farm animals and pets
export const imgchkn = asset('./icon/res/chkn.png');
export const imgcow = asset('./icon/res/cow.webp');
export const imgsheep = asset('./icon/res/sheep.webp');
export const imgpet = asset('./icon/pet/dog.webp');
export const imgpetCat = asset('./icon/pet/cat.webp');
export const imgpetOwl = asset('./icon/pet/owl.webp');
export const imgpetHorse = asset('./icon/pet/horse.webp');
export const imgpetBull = asset('./icon/pet/bull.webp');
export const imgpetHamster = asset('./icon/pet/hamster.webp');
export const imgpetPenguin = asset('./icon/pet/penguin.webp');
export const imgpetRam = asset('./icon/pet/ram.webp');
export const imgpetDragon = asset('./icon/pet/dragon.webp');
export const imgpetPhoenix = asset('./icon/pet/phoenix.webp');
export const imgpetGriffin = asset('./icon/pet/griffin.webp');
export const imgpetWarthog = asset('./icon/pet/warthog.webp');
export const imgpetWolf = asset('./icon/pet/wolf.webp');
export const imgpetBear = asset('./icon/pet/bear.webp');
export const imghoneyTreat = asset('./icon/res/honey_treat.webp');
export const imgsaltLick = asset('./icon/res/salt_lick.webp');

// UI states and actions
// Feedback, controls, and modal actions
export const imgxp = asset('./icon/ui/level_up.png');
export const imgflch = asset('./icon/ui/flch.png');
export const imgrdy = asset('./icon/ui/expression_alerted.png');
export const imgtrd = asset('./icon/ui/sparkle2.gif');
export const imgconfirm = asset('./icon/ui/confirm.png');
export const imgcancel = asset('./icon/ui/cancel.png');
export const imgalready = asset('./icon/ui/already.png');
export const imglove = asset('./icon/ui/expression_love.png');
export const imgrefresh = asset('./icon/ui/refresh.png');
export const imgsearch = asset('./icon/ui/search.png');
export const imgsyncing = asset('./icon/ui/syncing.gif');
export const imglightning = asset('./icon/ui/lightning.png');
export const imgstopwatch = asset('./icon/ui/stopwatch.png');
export const imgdelivBoard = asset('./icon/ui/delivery_board.png');
export const imgchores = asset('./icon/ui/chores.webp');
export const imgchapterTrack = asset('./icon/ui/chaptertrack.webp');
export const imgsynced = asset('./icon/ui/synced.gif');
export const imgcopy = asset('./icon/ui/copy.webp');
export const imgsave = asset('./icon/ui/save.webp');
export const imgimport = asset('./icon/ui/import.webp');
export const imglist = asset('./icon/ui/list.webp');
export const imgopensea = asset('./icon/ui/openseaico.png');
export const imgnoboosttry = asset('./icon/ui/noboosttry.png');
export const imghorizontal = asset('./icon/ui/horizontal.png');
export const imgvertical = asset('./icon/ui/vertical.png');
export const imgcrops = asset('./icon/ui/crops.png');
export const imgcropslightning = asset('./icon/ui/cropslightning.png');
// Shared utility icons
export const imgbee = asset('./icon/ui/bee.webp');
export const imgfullmoon = asset('./icon/ui/full_moon.png');
export const imggoblinThinking = asset('./icon/ui/goblin_thinking.gif');
export const imggrubnuk = asset('./icon/pnj/grubnuk.png');
export const imgsuspicious = asset('./icon/ui/suspicious.png');
export const imgfactions = asset('./icon/ui/factions.webp');
export const imgadmin = asset('./icon/ui/vip.webp');
export const imgexchng = asset('./icon/ui/exchange.png');
export const imgprod = asset('./icon/tools/rusty_shovel.png');
export const imgboughtprod = asset('./icon/ui/boughtprod.png');
export const imgrod = asset('./icon/tools/fishing_rod.png');
export const imgna = asset('./icon/nft/na.png');
export const imgplayerCount = asset('./icon/ui/playercount.png');
export const imgshovel = asset('./icon/tools/shovel.png');
export const imgsandShovel = asset('./icon/tools/sand_shovel.png');
export const imgchefHat = asset('./icon/food/chef_hat.png');
export const imgbeeBox = asset('./icon/craft/bee_box.webp');
export const imgefficiencyExtModule = asset('./icon/skillr/efficiency_ext_module.png');
export const imgredPansy = asset('./icon/flower/red_pansy.webp');
export const imgkitchenIcon = asset('./icon/building/kitchen_icon.png');
export const imgcheese = asset('./icon/food/cheese.webp');
export const imgcarrotCake = asset('./icon/food/carrot_cake.png');
export const imgsunflowerCrunch = asset('./icon/food/sunflower_crunch.png');
export const imgworld = asset('./icon/ui/world.png');
export const imghammer = asset('./icon/tools/hammer.png');
export const imgchapter = asset('./icon/ui/chapter.webp');
export const imgcalendar = asset('./icon/ui/calendar.webp');
export const imgtrophy = asset('./icon/ui/trophy.png');
export const imgfloatingIsland = asset('./icon/ui/floating_island.webp');
export const imgoptions = asset('./options.png');
export const imgcropBucket = asset('./icon/ui/cropbucket.png');
export const imgdoubledelivery = asset('./icon/ui/doubledelivery.webp');
export const imgpetEgg = asset('./icon/ui/petegg.png');
export const imgarrowLeft = asset('./icon/ui/arrow_left.png');
export const imgarrowUp = asset('./icon/ui/arrow_up.png');
export const imgpriceUp = asset('./icon/ui/priceup.png');
export const imgpriceDown = asset('./icon/ui/pricedown.png');
export const imghappiness03 = asset('./icon/ui/happiness_03.png');
export const imgdelivery = asset('./icon/ui/delivery.webp');
export const imgcollectibleBear = asset('./icon/nft/collectible_bear.png');
export const imgredFarmerShirt = asset('./icon/nftw/350.webp');
export const imgwarrior = asset('./icon/skill/warrior.png');
export const imgbudSeedling = asset('./icon/ui/bud_seedling.png');
export const imggobcarry = gobcarry;
export const imglogo512 = asset('/logo512.png');
export const imghelpTryNft = asset('./image/helptrynft.jpg');
export const imgstonePickaxe = asset('./icon/tools/stone_pickaxe.png');
export const imgwinterPath = asset('./icon/ui/winter.webp');
export const imgspringPath = asset('./icon/ui/spring.webp');
export const imgsummerPath = asset('./icon/ui/summer.webp');
export const imgautumnPath = asset('./icon/ui/autumn.webp');
export const imgsummerBasicAncientTree = asset('./icon/res/summer_basic_ancient_tree.png');
export const imgsummerBasicSacredTree = asset('./icon/res/summer_basic_sacred_tree.png');
export const imgmermaidScale = asset('./icon/res/mermaid_scale.webp');
export const imgtentacle = asset('./icon/fish/tentacle.png');
export const imgpirateBounty = asset('./icon/bounty/pirate_bounty.webp');
export const imgstage1CollectorEmpty = asset('./icon/building/stage1_collector_empty.webp');
export const imggreenhouse = asset('./icon/building/greenhouse.webp');
export const imgbudplaza = asset('./icon/nft/budplaza.png');

export const getNpcIconPath = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return imgna;
  if (raw.toLowerCase() === "pumpkin' pete") return asset('./icon/pnj/pumpkinpete.png');
  return asset(`./icon/pnj/${raw}.png`);
};

// Navigation and platform
export const imgusdc = asset('./usdc.png');
export const imgmatic = asset('./matic.png');
export const imgbase = asset('./base.svg');
export const imgeth = asset('./eth.svg');

// Expansion and node assets
export const imgironSmall = asset('./icon/res/iron_small.png');
export const imggoldSmall = asset('./icon/res/gold_small.png');
export const imgcrimstoneRock5 = asset('./icon/res/crimstone_rock_5.webp');
export const imgsunstoneRock1 = asset('./icon/res/sunstone_rock_1.webp');
export const imgoil = asset('./icon/res/oil.webp');
export const imglavaPit = asset('./icon/res/lava_pit.webp');
export const imggreenhousePot = asset('./icon/res/greenhouse_pot.webp');
export const imgl2StoneRock = asset('./icon/res/l2_stone_rock.webp');
export const imgl3StoneRock = asset('./icon/res/l3_stone_rock.webp');
export const imgl2IronRock = asset('./icon/res/l2_iron_rock.webp');
export const imgl3IronRock = asset('./icon/res/l3_iron_rock.webp');
export const imgl2GoldRock = asset('./icon/res/l2_gold_rock.webp');
export const imgl3GoldRock = asset('./icon/res/l3_gold_rock.webp');
export const imgoilReserveFull = asset('./icon/res/oil_reserve_full.webp');

// JSX helpers
export const imgSFL = <img src={imgsfl} alt={''} className="itico" title="Flower" />;
export const imgCoins = <img src={imgcoins} alt={''} className="itico" title="Coins" />;
export const imgGem = <img src={imggem} alt={''} className="itico" title="Gems" />;
export const imgExchng = <img src={imgexchng} alt={''} title="Marketplace" style={{ width: '25px', height: '25px' }} />;
export const imgprodit = <img src={imgprod} alt={''} title="Self production" style={{ width: '18px', height: '18px' }} />;
export const imgbuyit = <img src={imgboughtprod} alt={''} title="Bought at Marketplace" style={{ width: '18px', height: '18px' }} />;
export const imgwinter = <img src={asset('./icon/ui/winter.webp')} alt={''} className="seasonico" title="Winter" />;
export const imgspring = <img src={asset('./icon/ui/spring.webp')} alt={''} className="seasonico" title="Spring" />;
export const imgsummer = <img src={asset('./icon/ui/summer.webp')} alt={''} className="seasonico" title="Summer" />;
export const imgautumn = <img src={asset('./icon/ui/autumn.webp')} alt={''} className="seasonico" title="Autumn" />;

export const IMAGE_CSS_VARS = {
  "--asset-button": `url("${publicAsset('/button.png')}")`,
  "--asset-exchange": `url("${publicAsset('/icon/ui/exchange.png')}")`,
  "--asset-nifty": `url("${publicAsset('/nifty.png')}")`,
  "--asset-opensea": `url("${publicAsset('/opensea.png')}")`,
  "--asset-itemdisc": `url("${publicAsset('/icon/ui/itemdisc_01.png')}")`,
};

export const applyImageCssVars = (root = globalThis?.document?.documentElement) => {
  if (!root || !root.style) return;
  Object.entries(IMAGE_CSS_VARS).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
};

if (typeof document !== 'undefined') {
  applyImageCssVars();
}

export const platformListings = "Trades";

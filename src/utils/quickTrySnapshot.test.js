import { collectChangedSkillLevels, mergeExplicitSkillLevels } from "./quickTrySnapshot.js";

test("keeps every explicitly changed skill including returns to the active level", () => {
  const snapshot = {
    nft: { "Desert Gnome": 1 },
    skill: { "Green Thumb": 2 },
  };

  expect(mergeExplicitSkillLevels(snapshot, {
    "Green Thumb": 0,
    "Strong Roots": 1,
    "Bumpkin Broker": 0,
  })).toEqual({
    nft: { "Desert Gnome": 1 },
    skill: {
      "Green Thumb": 0,
      "Strong Roots": 1,
      "Bumpkin Broker": 0,
    },
  });
});

test("leaves a differential snapshot unchanged when no skill was explicitly touched", () => {
  const snapshot = { skill: { "Green Thumb": 2 } };
  expect(mergeExplicitSkillLevels(snapshot, {})).toBe(snapshot);
});

test("collects a skill reset to its active level as an explicit change", () => {
  const previousState = {
    boostables: {
      skill: {
        "Green Thumb": { level: 0, leveltry: 2 },
        "Strong Roots": { level: 1, leveltry: 1 },
      },
    },
  };
  const nextState = {
    boostables: {
      skill: {
        "Green Thumb": { level: 0, leveltry: 0 },
        "Strong Roots": { level: 1, leveltry: 1 },
      },
    },
  };

  expect(collectChangedSkillLevels(previousState, nextState)).toEqual({
    "Green Thumb": 0,
  });
});

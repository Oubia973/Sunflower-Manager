import { mergeExplicitSkillLevels } from "./quickTrySnapshot.js";

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

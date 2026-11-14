import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe } from 'audiobits';
import { binweekRecipes } from '../../src/game/sound-recipes.ts';

test('flight recipes validate and serialize against the installed AudioBits runtime', () => {
  for (const [cue, recipe] of Object.entries(binweekRecipes)) {
    const result = validateRecipe(recipe);
    assert.equal(result.ok, true, `${cue}: ${JSON.stringify(result.ok ? [] : result.issues)}`);
    assert.equal(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok, true, cue);
    assert.equal(recipe.kind, cue === 'wings' ? 'sustained' : 'one-shot');
    assert.ok(recipe.layers.length <= 3, `${cue} resource budget`);
  }
});

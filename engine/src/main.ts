import character from '@examples/fallout_demo/character.json';
import catalog from '@examples/fallout_demo/recipes.json';
import type { Character, RecipeCatalog } from './types.js';
import { mountSimulator } from './ui/app.js';
import './ui/styles.css';

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) {
  throw new Error('#app not found');
}

mountSimulator(appRoot, {
  character: character as unknown as Character,
  catalog: catalog as unknown as RecipeCatalog,
});

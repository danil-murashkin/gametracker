import model from '@docs/character_model.example.json';
import instance from '@docs/character_instance.example.json';
import type { CharacterInstance, CharacterModel } from './types.js';
import { mountSimulator } from './ui/app.js';
import './ui/styles.css';

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) {
  throw new Error('#app not found');
}

mountSimulator(appRoot, {
  model: model as unknown as CharacterModel,
  initialInstance: instance as unknown as CharacterInstance,
});

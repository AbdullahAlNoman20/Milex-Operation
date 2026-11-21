// src/Pages/modules/operations/i18n/index.js
import en from './en';
import zh from './zh';
import enExtra from './en.extra';
import zhExtra from './zh.extra';

// extra files add / complete keys; edit en.js / zh.js only for base keys.
import { PHRASE_MAPS, normPhrase } from './phrases';

const EN = { ...en, ...enExtra };
// Bangla is built from the phrase table: every English UI text that has a Bangla phrase gets it.
const bn = {};
Object.keys(EN).forEach((k) => { const hit = PHRASE_MAPS.bn.get(normPhrase(EN[k])); if (hit) bn[k] = hit; });
export const DICTS = Object.freeze({ en: EN, zh: { ...zh, ...zhExtra }, bn });
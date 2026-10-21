import {validateDataset} from './graph';
import type {Dataset} from './graph';
export const STATIC_DEMO=import.meta.env?.VITE_STATIC_DEMO==='1';
export async function loadDataset():Promise<Dataset>{const r=await fetch('/demo/network.json');if(!r.ok)throw Error('Анхны өгөгдөл татагдсангүй. Дахин ачаална уу.');const seed=await r.json();return validateDataset({nodes:seed.nodes,edges:seed.routes});}

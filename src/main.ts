import './ui/styles.css';
import { startApp } from './app';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Missing #game canvas or #ui layer');
startApp(canvas, ui);

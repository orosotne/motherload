import './ui/styles.css';
import { startApp } from './app';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Missing #game canvas');
startApp(canvas);

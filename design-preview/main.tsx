import { createRoot } from 'react-dom/client';
import Showcase from './Showcase';

const root = document.getElementById('root');
if (root) createRoot(root).render(<Showcase />);

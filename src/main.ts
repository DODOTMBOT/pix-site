import './styles/global.css';
import './styles/components.css';
import { renderHeader } from './components/header';
import { renderFooter } from './components/footer';
import { initRouter } from './router';

const app = document.getElementById('app')!;

const layout = document.createElement('div');
layout.className = 'layout';

const main = document.createElement('main');
main.style.cssText = 'flex: 1;';

layout.appendChild(renderHeader());
layout.appendChild(main);
layout.appendChild(renderFooter());
app.appendChild(layout);

initRouter(main);

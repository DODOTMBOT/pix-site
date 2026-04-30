import { navigate } from '../router';
import { buildSectionPage } from './_section';

export function renderInstructions(): HTMLElement {
  return buildSectionPage({
    title: 'Инструкции',
    subtitle: 'Пошаговые гайды и обучение',
    onBack: () => navigate('/'),
  });
}

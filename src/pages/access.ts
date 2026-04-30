import { navigate } from '../router';
import { buildSectionPage } from './_section';

export function renderAccess(): HTMLElement {
  return buildSectionPage({
    title: 'Ключи доступа',
    subtitle: 'Логины, пароли, системные доступы',
    onBack: () => navigate('/'),
  });
}

import { navigate } from '../router';
import { buildSectionPage } from './_section';

export function renderContacts(): HTMLElement {
  return buildSectionPage({
    title: 'Контакты',
    subtitle: 'Команда, поставщики, служба поддержки',
    onBack: () => navigate('/'),
  });
}

import { navigate } from '../router';
import { buildSectionPage } from './_section';

export function renderRegulations(): HTMLElement {
  return buildSectionPage({
    title: 'Регламенты',
    subtitle: 'Стандарты работы, правила, процедуры',
    onBack: () => navigate('/'),
  });
}

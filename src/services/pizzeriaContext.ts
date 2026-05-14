import { fetchMe, logout } from './auth';
import type { PizzeriaShort } from './auth';

const ACTIVE_KEY = 'pix_active_pizzeria_id';

let _pizzerias: PizzeriaShort[] = [];
let _activeId:  number | null   = null;

export async function loadContext(): Promise<void> {
  const { pizzerias } = await fetchMe();
  _pizzerias = pizzerias;

  const saved    = localStorage.getItem(ACTIVE_KEY);
  const savedId  = saved ? parseInt(saved, 10) : null;

  if (savedId && _pizzerias.some(p => p.id === savedId)) {
    _activeId = savedId;
  } else {
    _activeId = _pizzerias[0]?.id ?? null;
    if (_activeId !== null) {
      localStorage.setItem(ACTIVE_KEY, String(_activeId));
    }
  }
}

export function getAllPizzerias(): PizzeriaShort[] {
  return _pizzerias;
}

export function getActivePizzeriaId(): number | null {
  return _activeId;
}

export function getActivePizzeria(): PizzeriaShort | null {
  if (_activeId === null) return null;
  return _pizzerias.find(p => p.id === _activeId) ?? null;
}

export function setActivePizzeria(id: number): void {
  _activeId = id;
  localStorage.setItem(ACTIVE_KEY, String(id));
  window.dispatchEvent(new CustomEvent('pix:pizzeria-changed'));
}

export { logout };

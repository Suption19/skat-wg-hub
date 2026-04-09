const residentVisuals = {};

export function getResidentVisual(name) {
  return residentVisuals[name] || { avatar: '🙂', color: '#e7e9ef' };
}


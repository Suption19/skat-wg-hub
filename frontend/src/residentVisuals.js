const residentVisuals = {
  Tomasz: { avatar: '👨🏻', color: '#ffd8c8' },
  Finn: { avatar: '👦🏻', color: '#d6e8ff' },
  Nele: { avatar: '👩🏻', color: '#f9d7e8' },
  Leila: { avatar: '👧🏽', color: '#ffe8c9' },
};

export function getResidentVisual(name) {
  return residentVisuals[name] || { avatar: '🙂', color: '#e7e9ef' };
}


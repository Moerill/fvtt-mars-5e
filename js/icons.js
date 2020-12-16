const icons = {
  attack: '<i class="fas fa-dice"></i>',
  damage: '<i class="fas fa-dice"></i>',
};

export function getIcon(type) {
  if (!icons[type])
    throw Error("Mars 5e | You need to define an icon type in getIcon!");

  return `<a class='mars-icon rollable'>${icons[type]}</a>`;
}

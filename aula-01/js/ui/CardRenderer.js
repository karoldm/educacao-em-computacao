Game.UI.renderClassCard = function renderClassCard({ name, image, attacks }) {
  const card = document.createElement('div');
  card.className = 'class-card';

  const img = document.createElement('img');
  img.src = image;
  img.alt = name;
  card.appendChild(img);

  const title = document.createElement('p');
  title.className = 'class-card-name';
  title.textContent = name;
  card.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'class-card-attacks';
  attacks.forEach((attack) => {
    const item = document.createElement('li');
    item.textContent = attack.name;
    list.appendChild(item);
  });
  card.appendChild(list);

  return card;
};

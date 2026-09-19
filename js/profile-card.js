function node(tag, className, text) {
  const result = document.createElement(tag);
  result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

export function createProfileCard(profile) {
  const card = node('section', 'map-profile');
  card.setAttribute('aria-label', `${profile.name} profile`);
  const header = node('div', 'map-profile-header');
  const portrait = node('div', 'map-profile-portrait', profile.name.split(/\s+/).map(part => part[0]).slice(0, 3).join(''));
  portrait.setAttribute('aria-hidden', 'true');
  if (profile.imagePath) {
    const image = node('img', '');
    image.alt = '';
    image.width = image.height = 88;
    image.addEventListener('error', () => image.remove(), {once: true});
    image.src = profile.imagePath;
    portrait.append(image);
  }
  const heading = node('div', 'map-profile-heading');
  heading.append(node('h2', '', profile.name), node('p', '', profile.role));
  header.append(portrait, heading);
  const details = node('dl', 'map-profile-details');
  const location = profile.city.trim().toLowerCase() === 'not published' ? profile.country : `${profile.city}, ${profile.country}`;
  for (const [label, value, href] of [
    ['Expertise', profile.expertise.join(', ')],
    ['Location', location],
    ['Email', profile.email, `mailto:${profile.email}`],
    ['Phone', profile.phone, `tel:${profile.phone?.replace(/[^+\d]/g, '')}`]
  ]) {
    if (!value) continue;
    const description = node('dd', '');
    if (href) {
      const link = node('a', '', value); link.href = href; description.append(link);
    } else description.textContent = value;
    details.append(node('dt', '', label), description);
  }
  card.append(header, details);
  return card;
}

function node(tag, className, text) {
  const result = document.createElement(tag);
  result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

export function createPortrait(profile, className, size, tag = 'div') {
  const initials = profile.name.trim().split(/\s+/).map(part => part[0]).slice(0, 3).join('');
  const portrait = node(tag, className);
  portrait.setAttribute('aria-hidden', 'true');
  if (profile.imagePath) {
    const image = node('img', '');
    image.alt = '';
    image.width = image.height = size;
    image.addEventListener('error', () => portrait.replaceChildren(initials), {once: true});
    image.src = profile.imagePath;
    portrait.append(image);
  } else portrait.textContent = initials;
  return portrait;
}

export function createProfileCard(profile) {
  const card = node('section', 'map-profile');
  card.setAttribute('aria-label', `${profile.name} profile`);
  const header = node('div', 'map-profile-header');
  const portrait = createPortrait(profile, 'map-profile-portrait', 88);
  const heading = node('div', 'map-profile-heading');
  heading.append(node('h2', '', profile.name), node('p', '', profile.role));
  header.append(portrait, heading);
  const details = node('dl', 'map-profile-details');
  const location = profile.city.trim().toLowerCase() === 'not published' ? profile.country : `${profile.city}, ${profile.country}`;
  for (const [label, value, href] of [
    ['Expertise', profile.expertise.join(', ')],
    ['Location', location],
    ['Email', profile.email, `mailto:${profile.email}`],
    ['Phone', profile.phone, `tel:${profile.phone?.replace(/[^+\d]/g, '')}`],
    ['Website', profile.sourceUrl && 'View Sedgwick profile', profile.sourceUrl]
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

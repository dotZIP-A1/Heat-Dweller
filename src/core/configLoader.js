export async function loadConfigXml(path = 'assets/data/config.xml') {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return new DOMParser().parseFromString(text, 'application/xml');
}

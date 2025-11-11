// Script pour générer des icônes PWA temporaires
// Pour des icônes personnalisées, remplacez les fichiers générés

const fs = require('fs');
const path = require('path');

// Fonction pour créer une icône SVG simple
function createIconSVG(size, text) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size / 3}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">${text}</text>
</svg>`;
}

// Créer le dossier public s'il n'existe pas
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Générer les icônes SVG (temporaires)
const icon192 = createIconSVG(192, 'M');
const icon512 = createIconSVG(512, 'M');

fs.writeFileSync(path.join(publicDir, 'icon-192x192.svg'), icon192);
fs.writeFileSync(path.join(publicDir, 'icon-512x512.svg'), icon512);

console.log('✓ Icônes SVG temporaires générées');
console.log('Pour des icônes personnalisées, remplacez icon-192x192.png et icon-512x512.png dans le dossier public');

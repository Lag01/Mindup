const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_IMAGE = path.join(__dirname, '../public/Logo_MindUp.png');
const OUTPUT_DIR = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('🎨 Génération des icônes depuis Logo_MindUp.png...\n');

  try {
    // Vérifier que le fichier source existe
    if (!fs.existsSync(INPUT_IMAGE)) {
      throw new Error(`Le fichier source ${INPUT_IMAGE} n'existe pas`);
    }

    // 1. Générer favicon.ico (multi-tailles)
    console.log('📦 Génération de favicon.ico (16x16, 32x32, 48x48)...');
    await sharp(INPUT_IMAGE)
      .resize(48, 48)
      .toFile(path.join(OUTPUT_DIR, 'favicon-48.png'));
    await sharp(INPUT_IMAGE)
      .resize(32, 32)
      .toFile(path.join(OUTPUT_DIR, 'favicon-32.png'));
    await sharp(INPUT_IMAGE)
      .resize(16, 16)
      .toFile(path.join(OUTPUT_DIR, 'favicon-16.png'));
    console.log('✓ Fichiers PNG intermédiaires créés\n');

    // 2. Générer icon-192.png pour Android
    console.log('📱 Génération de icon-192.png (Android/PWA)...');
    await sharp(INPUT_IMAGE)
      .resize(192, 192)
      .toFile(path.join(OUTPUT_DIR, 'icon-192.png'));
    console.log('✓ icon-192.png créé\n');

    // 3. Générer icon-512.png pour Android
    console.log('📱 Génération de icon-512.png (Android/PWA)...');
    await sharp(INPUT_IMAGE)
      .resize(512, 512)
      .toFile(path.join(OUTPUT_DIR, 'icon-512.png'));
    console.log('✓ icon-512.png créé\n');

    // 4. Générer apple-touch-icon.png pour iOS
    console.log('🍎 Génération de apple-touch-icon.png (iOS)...');
    await sharp(INPUT_IMAGE)
      .resize(180, 180)
      .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'));
    console.log('✓ apple-touch-icon.png créé\n');

    // 5. Générer icon-maskable.png avec padding pour PWA
    console.log('🎭 Génération de icon-maskable.png (PWA maskable)...');
    const paddingSize = 512;
    const iconSize = Math.floor(paddingSize * 0.75);
    const padding = Math.floor((paddingSize - iconSize) / 2);

    await sharp({
      create: {
        width: paddingSize,
        height: paddingSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{
        input: await sharp(INPUT_IMAGE).resize(iconSize, iconSize).toBuffer(),
        top: padding,
        left: padding
      }])
      .toFile(path.join(OUTPUT_DIR, 'icon-maskable.png'));
    console.log('✓ icon-maskable.png créé\n');

    // 6. Générer favicon.ico simple (utilise la version 32x32)
    console.log('🔖 Copie de favicon-32.png vers favicon.ico...');
    await sharp(INPUT_IMAGE)
      .resize(32, 32)
      .toFile(path.join(OUTPUT_DIR, 'favicon.ico'));
    console.log('✓ favicon.ico créé\n');

    // Nettoyer les fichiers intermédiaires
    console.log('🧹 Nettoyage des fichiers intermédiaires...');
    fs.unlinkSync(path.join(OUTPUT_DIR, 'favicon-48.png'));
    fs.unlinkSync(path.join(OUTPUT_DIR, 'favicon-32.png'));
    fs.unlinkSync(path.join(OUTPUT_DIR, 'favicon-16.png'));
    console.log('✓ Nettoyage terminé\n');

    console.log('✅ Toutes les icônes ont été générées avec succès !');
    console.log('\nFichiers créés :');
    console.log('  - favicon.ico (32x32)');
    console.log('  - icon-192.png (192x192)');
    console.log('  - icon-512.png (512x512)');
    console.log('  - apple-touch-icon.png (180x180)');
    console.log('  - icon-maskable.png (512x512 avec padding)');

  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error);
    process.exit(1);
  }
}

generateIcons();

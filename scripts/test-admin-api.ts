// Script pour tester l'API admin
async function testAdminAPI() {
  const baseUrl = 'http://localhost:3000';

  console.log('🔍 Test de l\'API Admin...\n');

  try {
    // Test 1: API Users
    console.log('1. Test GET /api/admin/users');
    const usersResponse = await fetch(`${baseUrl}/api/admin/users`);
    console.log(`   Status: ${usersResponse.status} ${usersResponse.statusText}`);

    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log(`   ✓ Nombre d'utilisateurs: ${usersData.length}`);
      console.log(`   ✓ Données:`, JSON.stringify(usersData, null, 2));
    } else {
      const error = await usersResponse.text();
      console.log(`   ✗ Erreur:`, error);
    }

    console.log('');

    // Test 2: API Settings
    console.log('2. Test GET /api/admin/settings');
    const settingsResponse = await fetch(`${baseUrl}/api/admin/settings`);
    console.log(`   Status: ${settingsResponse.status} ${settingsResponse.statusText}`);

    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json();
      console.log(`   ✓ Paramètres:`, JSON.stringify(settingsData, null, 2));
    } else {
      const error = await settingsResponse.text();
      console.log(`   ✗ Erreur:`, error);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testAdminAPI();

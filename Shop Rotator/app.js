const cron = require('node-cron');
const fs = require('fs');

const itemsJson = JSON.parse(fs.readFileSync('./items.json', 'utf-8'));
const shopConfig = {};

const prices = {
    'AthenaCharacter': {
      'uncommon': 800,
      'rare': 1200,
      'epic': 1500,
      'legendary': 2000,
    },
    'AthenaDance': {
      'uncommon': 200,
      'rare': 500,
      'epic': 800,
    },
    'AthenaPickaxe': {
        'uncommon': 500,
        'rare': 800,
        'epic': 1200,
      },
      'AthenaLoadingScreen': {
        'uncommon': 100,
      },
      'AthenaGlider': {
        'uncommon': 500,
        'rare': 800,
        'epic': 1200,
        'legendary': 1500,
      },
      'AthenaSkyDiveContrail': {
        'rare': 100,
      },
      'AthenaBackpack': {
        'rare': 100,
        'epic': 300,
        'epic': 500,
        'legendary': 800,
      },
  };

  function createShopConfig() {
    const eligibleItems = itemsJson.filter(item => item.shopHistory && item.shopHistory.length > 0);
    
    if (eligibleItems.length < 8) {
      console.log('Not enough eligible items to populate the shop');
      return;
    }
    
    const eligibleSkins = eligibleItems.filter(item => item.type === 'AthenaCharacter');
    
    if (eligibleSkins.length < 2) {
      console.log('Not enough eligible skins to populate the featured items');
      return;
    }
    
    const featuredItems = eligibleSkins.sort(() => 0.5 - Math.random()).slice(0, 2);
    const dailyItems = eligibleItems.filter(item => !featuredItems.includes(item)).sort(() => 0.5 - Math.random()).slice(0, 6);
  
    if (dailyItems.length < 6) {
      console.log('Not enough eligible items to populate the daily items');
      return;
    }
    
    dailyItems.forEach((item, index) => {
      const price = prices[item.type][item.rarity];
      shopConfig[`daily${index + 1}`] = {
        itemGrants: [`${item.type}:${item.id}`],
        price,
      };
    });
    
    featuredItems.forEach((item, index) => {
      const price = prices[item.type][item.rarity];
      shopConfig[`featured${index + 1}`] = {
        itemGrants: [`${item.type}:${item.id}`],
        price,
      };
    });
  
    fs.writeFile('./shopConfig.json', JSON.stringify(shopConfig, null, 2), 'utf-8', err => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('New SummerFN shop has been created');
    });
  }
  

if (process.argv[2] === '--now') {
  createShopConfig();
} else {
  cron.schedule('0 0 * * *', createShopConfig);
}

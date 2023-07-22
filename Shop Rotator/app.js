const cron = require('node-cron');
const fs = require('fs');
const { WebhookClient, MessageAttachment, MessageEmbed, EmbedBuilder } = require('discord.js');
const axios = require('axios').default;
const { createCanvas, loadImage } = require('canvas');

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

const rarityColors = {
  common: '#818b93',
  uncommon: '#3d872c',
  rare: '#3492f4',
  epic: '#703fa2',
  legendary: '#fea238',
};

function createShopConfig() {
  const eligibleItems = itemsJson.filter(
    item => item.shopHistory && item.shopHistory.length > 0 && item.type !== 'AthenaLoadingScreen' && item.type !== 'AthenaSkyDiveContrail'
  );

  if (eligibleItems.length < 8) {
    console.log('Not enough eligible items to populate the shop');
    return;
  }

  const eligibleSkins = eligibleItems.filter(item => item.type === 'AthenaCharacter');

  if (eligibleSkins.length < 2) {
    console.log('Not enough eligible skins to populate the featured items');
    return;
  }

  const featuredItems = eligibleItems
  .filter((item) => item.type === 'AthenaCharacter')
  .sort(() => 0.5 - Math.random())
  .slice(0, 2);
  const dailyItems = eligibleItems.filter(item => !featuredItems.includes(item)).sort(() => 0.5 - Math.random()).slice(0, 6);

  if (dailyItems.length < 6) {
    console.log('Not enough eligible items to populate the daily items');
    return;
  }

  const getImageUrls = [...featuredItems, ...dailyItems].map(async (item) => {
    const response = await axios.get(`https://fortnite-api.com/v2/cosmetics/br/${item.id}`);
    const imageUrl = response.data.data.images.icon;
    const cosmeticName = response.data.data.name;
    return {
      id: item.id,
      imageUrl,
      cosmeticName,
    };
  });

  Promise.all(getImageUrls)
    .then((itemImages) => {
      dailyItems.forEach((item, index) => {
        const price = prices[item.type][item.rarity];
        const itemImage = itemImages.find((image) => image.id === item.id);
        const imageUrl = itemImage ? itemImage.imageUrl : null;

        shopConfig[`daily${index + 1}`] = {
          itemGrants: [`${item.type}:${item.id}`],
          price,
          imageUrl,
        };
      });

      featuredItems.forEach((item, index) => {
        const price = prices[item.type][item.rarity];
        const itemImage = itemImages.find((image) => image.id === item.id);
        const imageUrl = itemImage ? itemImage.imageUrl : null;

        shopConfig[`featured${index + 1}`] = {
          itemGrants: [`${item.type}:${item.id}`],
          price,
          imageUrl,
        };
      });
      

      fs.writeFile('../Config/catalog_config.json', JSON.stringify(shopConfig, null, 2), 'utf-8', async (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('New SummerFN shop has been created');

        const itemShopImage = await generateItemShopImage(featuredItems, dailyItems, itemImages);
        sendWebhook(itemShopImage);
      });
    })
    .catch((error) => {
      console.error('Failed to fetch item images:', error);
    });
}

async function generateItemShopImage(featuredItems, dailyItems, itemImages) {
  const canvasWidth = 1920;
  const canvasHeight = 1080;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext('2d');

  const backgroundImage = await loadImage('https://media.discordapp.net/attachments/985937156692381766/1129551476226797578/SummerFN_ShopBG.png');
  context.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);

  const featuredItemWidth = 300;
  const featuredItemHeight = 300;
  const featuredItemsX = 150;
  const featuredItemsY = 400;
  const featuredItemsSpacing = 100;

  for (let i = 0; i < featuredItems.length; i++) {
    const item = featuredItems[i];
    const itemImage = itemImages.find((image) => image.id === item.id);

    if (itemImage && itemImage.imageUrl) {
      const image = await loadImage(itemImage.imageUrl);

      const x = featuredItemsX + (featuredItemWidth + featuredItemsSpacing) * i;
      const y = featuredItemsY;

      const boxWidth = featuredItemWidth + 10;
      const boxHeight = featuredItemHeight + 10;
      const boxX = x - 5;
      const boxY = y - 5;
      const cornerRadius = 25; // Adjust the corner radius as needed

      // Draw the background rarity box with rounded corners
      context.fillStyle = `${rarityColors[item.rarity]}80`;
      context.beginPath();
      context.moveTo(boxX + cornerRadius, boxY);
      context.lineTo(boxX + boxWidth - cornerRadius, boxY);
      context.arc(boxX + boxWidth - cornerRadius, boxY + cornerRadius, cornerRadius, Math.PI * 1.5, 0);
      context.lineTo(boxX + boxWidth, boxY + boxHeight - cornerRadius);
      context.arc(boxX + boxWidth - cornerRadius, boxY + boxHeight - cornerRadius, cornerRadius, 0, Math.PI * 0.5);
      context.lineTo(boxX + cornerRadius, boxY + boxHeight);
      context.arc(boxX + cornerRadius, boxY + boxHeight - cornerRadius, cornerRadius, Math.PI * 0.5, Math.PI);
      context.lineTo(boxX, boxY + cornerRadius);
      context.arc(boxX + cornerRadius, boxY + cornerRadius, cornerRadius, Math.PI, Math.PI * 1.5);
      context.closePath();
      context.fill();

      context.drawImage(image, x, y, featuredItemWidth, featuredItemHeight);

      const cosmeticName = itemImage.cosmeticName;
      const textX = x + featuredItemWidth / 2;
      const textY = y + featuredItemHeight + 50;
      context.font = '30px Arial';
      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.fillText(cosmeticName, textX, textY);
    }
  }

  const dailyItemWidth = 200;
  const dailyItemHeight = 200;
  const dailyItemsX = 1100;
  const dailyItemsY = 375;
  const dailyItemsSpacing = 50;
  const dailyItemsPerRow = 3;

  for (let i = 0; i < dailyItems.length; i++) {
    const item = dailyItems[i];
    const itemImage = itemImages.find((image) => image.id === item.id);

    if (itemImage && itemImage.imageUrl) {
      const image = await loadImage(itemImage.imageUrl);

      const rowIndex = Math.floor(i / dailyItemsPerRow);
      const columnIndex = i % dailyItemsPerRow;

      const x = dailyItemsX + (dailyItemWidth + dailyItemsSpacing) * columnIndex;
      const y = dailyItemsY + (dailyItemHeight + dailyItemsSpacing) * rowIndex;

      const boxWidth = dailyItemWidth + 10;
      const boxHeight = dailyItemHeight + 10;
      const boxX = x - 5;
      const boxY = y - 5;      
      const cornerRadius = 25; 

      context.fillStyle = `${rarityColors[item.rarity]}80`;
      context.beginPath();
      context.moveTo(boxX + cornerRadius, boxY);
      context.lineTo(boxX + boxWidth - cornerRadius, boxY);
      context.arc(boxX + boxWidth - cornerRadius, boxY + cornerRadius, cornerRadius, Math.PI * 1.5, 0);
      context.lineTo(boxX + boxWidth, boxY + boxHeight - cornerRadius);
      context.arc(boxX + boxWidth - cornerRadius, boxY + boxHeight - cornerRadius, cornerRadius, 0, Math.PI * 0.5);
      context.lineTo(boxX + cornerRadius, boxY + boxHeight);
      context.arc(boxX + cornerRadius, boxY + boxHeight - cornerRadius, cornerRadius, Math.PI * 0.5, Math.PI);
      context.lineTo(boxX, boxY + cornerRadius);
      context.arc(boxX + cornerRadius, boxY + cornerRadius, cornerRadius, Math.PI, Math.PI * 1.5);
      context.closePath();
      context.fill();

      context.drawImage(image, x, y, dailyItemWidth, dailyItemHeight);

      const cosmeticName = itemImage.cosmeticName; 
      const textX = x + dailyItemWidth / 2;
      const textY = y + dailyItemHeight + 40;
      context.font = '30px Arial';
      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.fillText(cosmeticName, textX, textY);
    }
  }

    // Draw the current date at the custom location
    const currentDate = new Date().toLocaleDateString();
    const dateText = `${currentDate}`;
    const dateTextFont = 'bold 30px Arial';
    const dateTextX = 900; // Custom X coordinate
    const dateTextY = 210; // Custom Y coordinate
  
    context.fillStyle = '#ffffff';
    context.font = dateTextFont;
    context.textAlign = 'start';
    context.textBaseline = 'alphabetic';
    context.fillText(dateText, dateTextX, dateTextY);

  return canvas.toBuffer();
}



async function sendWebhook(imageBuffer) {
  const webhookURL = 'YOUR_WEBHOOK_HERE'; // Replace with your webhook URL

  const webhookClient = new WebhookClient({ url: webhookURL });

  const attachment = await new MessageAttachment(imageBuffer, 'item_shop.png');
  const embed = new MessageEmbed()
    .setTitle('**NEW SUMMERFN SHOP**')
    .setDescription('Check out the latest items available in the shop!')
    .setColor('#f7568b')
    .setImage('attachment://item_shop.png')
    .setTimestamp();

  webhookClient.send({ embeds: [embed], files: [attachment] });
  console.log("Send Webhook for todays item shop.");
}

if (process.argv[2] === '--now') {
  createShopConfig();
} else {
  cron.schedule('2 0 * * *', createShopConfig);
}

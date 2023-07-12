import requests
import json

def is_valid_intro(intro):
    if not intro: 
        return False
    if 'chapter' in intro and 'season' in intro:
        if intro['chapter'] == '1' and intro['season'].isdigit() and int(intro['season']) <= 5:
            return True
    return False

url = "https://fortnite-api.com/v2/cosmetics/br"
response = requests.get(url)
data = response.json()

valid_items = []

for item in data['data']:
    intro = item.get('introduction', None)
    if is_valid_intro(intro):
        valid_item = {
            'id': item.get('id'),
            'type': item.get('type', {}).get('backendValue'),
            'rarity': item.get('rarity', {}).get('value'),
            'introduction': {
                'chapter': intro.get('chapter'),
                'season': intro.get('season')
            },
            'shopHistory': item.get('shopHistory')
        }
        valid_items.append(valid_item)

with open('items.json', 'w') as f:
    json.dump(valid_items, f, indent=4)

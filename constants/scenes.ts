export interface Scene {
  id: string
  fileName: string
  description: string
}

export const scenes: Scene[] = [
  { id: 'scene_001', fileName: 'park_woman_umbrella.jpg', description: 'A young woman walking in a park with a red umbrella' },
  { id: 'scene_002', fileName: 'cafe_reading.jpg', description: 'A person reading a book in a cozy cafe' },
  { id: 'scene_003', fileName: 'beach_sunset.jpg', description: 'A beautiful sunset over the ocean with people walking on the beach' },
  { id: 'scene_004', fileName: 'city_street_rain.jpg', description: 'A busy city street during a light rain with people carrying umbrellas' },
  { id: 'scene_005', fileName: 'library_studying.jpg', description: 'Students studying at tables in a quiet library' },
  { id: 'scene_006', fileName: 'market_vegetables.jpg', description: 'A colorful vegetable market with vendors and customers' },
  { id: 'scene_007', fileName: 'garden_flowers.jpg', description: 'A beautiful flower garden with blooming roses and tulips' },
  { id: 'scene_008', fileName: 'kitchen_cooking.jpg', description: 'A chef cooking in a modern kitchen with fresh ingredients' },
  { id: 'scene_009', fileName: 'playground_children.jpg', description: 'Children playing on a playground with swings and slides' },
  { id: 'scene_010', fileName: 'mountain_hiking.jpg', description: 'Hikers on a mountain trail with scenic valley views' },
  { id: 'scene_011', fileName: 'art_gallery.jpg', description: 'People viewing paintings in an art gallery' },
  { id: 'scene_012', fileName: 'train_station.jpg', description: 'A busy train station with commuters waiting on the platform' },
  { id: 'scene_013', fileName: 'winter_park.jpg', description: 'A snowy park with children building a snowman' },
  { id: 'scene_014', fileName: 'office_meeting.jpg', description: 'A business meeting in a modern conference room' },
  { id: 'scene_015', fileName: 'farmer_market.jpg', description: 'A weekend farmers market with fresh produce and crafts' },
]

// Get the actual scene image from the assets
export const getSceneImageSource = (scene: Scene) => {
  const imageMap: Record<string, any> = {
    'park_woman_umbrella.jpg': require('../assets/scenes/park_woman_umbrella.jpg'),
    'cafe_reading.jpg': require('../assets/scenes/cafe_reading.jpg'),
    'beach_sunset.jpg': require('../assets/scenes/beach_sunset.jpg'),
    'city_street_rain.jpg': require('../assets/scenes/city_street_rain.jpg'),
    'library_studying.jpg': require('../assets/scenes/library_studying.jpg'),
    'market_vegetables.jpg': require('../assets/scenes/market_vegetables.jpg'),
    'garden_flowers.jpg': require('../assets/scenes/garden_flowers.jpg'),
    'kitchen_cooking.jpg': require('../assets/scenes/kitchen_cooking.jpg'),
    'playground_children.jpg': require('../assets/scenes/playground_children.jpg'),
    'mountain_hiking.jpg': require('../assets/scenes/mountain_hiking.jpg'),
    'art_gallery.jpg': require('../assets/scenes/art_gallery.jpg'),
    'train_station.jpg': require('../assets/scenes/train_station.jpg'),
    'winter_park.jpg': require('../assets/scenes/winter_park.jpg'),
    'office_meeting.jpg': require('../assets/scenes/office_meeting.jpg'),
    'farmer_market.jpg': require('../assets/scenes/farmer_market.jpg'),
  }
  
  return imageMap[scene.fileName] || imageMap['park_woman_umbrella.jpg']
}
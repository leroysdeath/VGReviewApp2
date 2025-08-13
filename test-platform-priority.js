// Quick test file for platform priority functionality with description priority
// This would normally be in a proper test suite

// Mock game data for testing
const testGames = [
  {
    id: 1,
    name: "Mobile Game Only",
    platforms: [{ name: "iOS" }, { name: "Android" }],
    rating: 85,
    summary: "" // No description
  },
  {
    id: 2,  
    name: "PC Game with Description",
    platforms: [{ name: "PC (Microsoft Windows)" }, { name: "Mac" }],
    rating: 75,
    summary: "This is an amazing PC game with lots of features and great gameplay mechanics."
  },
  {
    id: 3,
    name: "Console Game No Description", 
    platforms: [{ name: "PlayStation 5" }, { name: "Xbox Series X" }],
    rating: 80,
    summary: "" // No description
  },
  {
    id: 4,
    name: "Cross-Platform Game with Description",
    platforms: [
      { name: "PC (Microsoft Windows)" }, 
      { name: "PlayStation 5" }, 
      { name: "Xbox Series X" },
      { name: "Nintendo Switch" }
    ],
    rating: 70,
    summary: "Epic cross-platform adventure that spans multiple worlds and dimensions."
  },
  {
    id: 5,
    name: "Web Browser Game",
    platforms: [{ name: "Web browser" }],
    rating: 90,
    summary: "" // No description
  },
  {
    id: 6,
    name: "Mobile Game with Description",
    platforms: [{ name: "iOS" }, { name: "Android" }],
    rating: 60,
    summary: "A compelling mobile experience with innovative touch controls and engaging story."
  }
];

console.log("Test games created:");
console.log("1. Mobile Only (iOS/Android) - Rating 85 - NO description");
console.log("2. PC Game (Windows/Mac) - Rating 75 - WITH description");  
console.log("3. Console Game (PS5/Xbox) - Rating 80 - NO description");
console.log("4. Cross-Platform (PC/PS5/Xbox/Switch) - Rating 70 - WITH description");
console.log("5. Web Browser Game - Rating 90 - NO description");
console.log("6. Mobile Game - Rating 60 - WITH description");
console.log();

console.log("NEW PRIORITY SYSTEM:");
console.log("Primary: Description (Yes/No)");
console.log("Secondary: Platform Priority (PC+Console > PC/Console > Mixed > Mobile)");
console.log("Tertiary: Rating (Higher first)");
console.log();

console.log("Expected sorting order (description first, then platform, then rating):");
console.log("1. Cross-Platform Game with Description (composite: 13, platform: 3, rating: 70)");
console.log("2. PC Game with Description (composite: 12, platform: 2, rating: 75)");
console.log("3. Mobile Game with Description (composite: 10, platform: 0, rating: 60)");
console.log("4. Console Game No Description (composite: 2, platform: 2, rating: 80)");
console.log("5. Web Browser Game (composite: 0, platform: 0, rating: 90)");
console.log("6. Mobile Only (composite: 0, platform: 0, rating: 85)");
console.log();

console.log("Note: Composite score = (Description ? 10 : 0) + platform_score");
console.log("Games WITH descriptions always rank higher than games WITHOUT descriptions!");
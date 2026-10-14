/* Game-specific achievements (cosmetic coin rewards). Shared ones live in achievements.js. */
window.ACH_DEFS = [
  { "id": "mc_first", "name": "First Calm", "desc": "Clear your first layout", "metric": "wins", "goal": 1, "reward": 15 },
  { "id": "mc_wins25", "name": "Tile Whisperer", "desc": "Clear 25 layouts (replays count)", "metric": "wins", "goal": 25, "reward": 80 },
  { "id": "mc_wins100", "name": "Serene Master", "desc": "Clear 100 layouts", "metric": "wins", "goal": 100, "reward": 200 },
  { "id": "mc_star10", "name": "Perfect Flow", "desc": "Clear 10 layouts with 3 stars", "metric": "stars3", "goal": 10, "reward": 100 },
  { "id": "mc_clean10", "name": "Unaided", "desc": "Clear 10 layouts without Hint, Shuffle or Undo", "metric": "clean_wins", "goal": 10, "reward": 70 },
  { "id": "mc_pairs500", "name": "Pair Collector", "desc": "Match 500 pairs", "metric": "moves", "goal": 500, "reward": 60 },
  { "id": "mc_half", "name": "Halfway Garden", "desc": "Clear 6 different layouts", "metric": "best_level", "goal": 6, "reward": 60 },
  { "id": "mc_all", "name": "Every Layout", "desc": "Clear the Meadow layout (all 12)", "metric": "best_level", "goal": 12, "reward": 250 }
];

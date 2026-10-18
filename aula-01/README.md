# Lineage of Heroes

A small educational game about inheritance in OOP, told through an RPG class hierarchy. In-game text is in Portuguese (pt-BR); code and identifiers are in English.

## Running the game

Just open `index.html` in your browser (double-click works). The game uses classic scripts loaded in dependency order, so no local server is required.

If you prefer, you can still serve it locally, for example:

```
npx serve .
```

or, with Python:

```
python3 -m http.server 8000
```

## Structure

- `index.html` - screens markup
- `css/style.css` - all styling
- `js/namespace.js` - creates the single `Game` global namespace shared by every script (classic scripts, no bundler)
- `js/data/attackCatalog.js` - single source of truth for attack display names (pt-BR), used by both classes and the enemy-weakness screen
- `js/classes/` - the actual class hierarchy (`Adventurer` -> `Mage`/`Warrior`/`Cleric` -> six leaf subclasses), plus `ClassRegistry.js` centralizing how characters are created
- `js/data/enemies.js` - one enemy per possible attack (`enemiesByWeakness`), so every reachable attack has a matching foe
- `js/EnemySelector.js` - randomly picks an enemy whose weakness is one of the current class's children, so every round is always winnable
- `js/data/dialogues.js` - the story script (pt-BR)
- `js/data/reward.js` - final reward text; replace its content to change the ending message
- `js/ui/` - screen rendering and interaction logic, including `EnemyReveal.js` (shows the enemy and its weakness before the player builds a class) and `HierarchyQuiz.js` (post-victory 3-question quiz on parent/child classes, revealing the built hierarchy as the player answers)
- `js/GameState.js` - current round/character/enemy
- `js/Enemy.js` - enemy model
- `js/main.js` - orchestrates the full game flow
- `assets/images/` - SVG portraits for every class and enemy
- `assets/audio/theme.mp3` - empty placeholder soundtrack; replace with a real file of the same name

## Game flow

1. Round 1: dialogue -> enemy revealed with its weakness -> fixed Adventurer vs. a slime that Basic Strike defeats. Always the same enemy.
2. Round 2: dialogue -> a random enemy is picked whose weakness matches one of Mage, Warrior or Cleric's attacks -> enemy revealed with its weakness -> pick the matching class.
3. Round 3: dialogue -> a random enemy is picked whose weakness matches one of the two subclasses of whichever class was picked in round 2 -> enemy revealed with its weakness -> pick the matching subclass.

The enemy is always chosen among the attacks actually reachable from the player's current class, so the round is always winnable - the challenge is knowing which class inherits the required attack, not guessing blindly. Picking a class whose signature attack does not match the enemy's weakness loses the run and returns to the title screen.

After round 3, a short quiz asks whether the base class, the middle-level classes, or the final subclasses (as a group, e.g. "Mage, Warrior and Cleric") are a parent class, a child class, or both. Each correct answer reveals one more level of the complete 10-class tree, with the player's own path (base -> chosen class -> chosen subclass) highlighted in gold. No progress is saved between page loads.

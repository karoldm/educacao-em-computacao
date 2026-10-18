Game.Data.enemiesByWeakness = {
  basic_strike: new Game.Enemy({
    id: 'bog_slime',
    name: 'Gosma do Pântano',
    title: 'Um incômodo gelatinoso',
    image: 'assets/images/enemy-slime.svg',
    hp: 30,
    weaknessAttackId: 'basic_strike',
    defeatFlavor: 'Um golpe simples e bem direcionado foi o suficiente. Todo herói começa assim.'
  }),
  arcane_bolt: new Game.Enemy({
    id: 'void_whisper',
    name: 'Sussurro do Vazio',
    title: 'Uma presença etérea que ignora o aço',
    image: 'assets/images/enemy-void-whisper.svg',
    hp: 50,
    weaknessAttackId: 'arcane_bolt',
    defeatFlavor: 'Só a energia arcana pura consegue tocar algo que nem está totalmente aqui.'
  }),
  power_slash: new Game.Enemy({
    id: 'iron_golem',
    name: 'Golem de Ferro',
    title: 'Um autômato bruto de metal forjado',
    image: 'assets/images/enemy-iron-golem.svg',
    hp: 55,
    weaknessAttackId: 'power_slash',
    defeatFlavor: 'Só a força bruta de um golpe poderoso conseguiu amassar aquele metal.'
  }),
  blessed_strike: new Game.Enemy({
    id: 'hollow_revenant',
    name: 'Revenante Oco',
    title: 'Um espírito amaldiçoado e inquieto',
    image: 'assets/images/enemy-revenant.svg',
    hp: 55,
    weaknessAttackId: 'blessed_strike',
    defeatFlavor: 'Só uma força consagrada poderia desfazer uma maldição como essa.'
  }),
  fireball: new Game.Enemy({
    id: 'ashfang_wyrm',
    name: 'Dragão das Cinzas',
    title: 'Um jovem dragão envolto em cinzas geladas',
    image: 'assets/images/enemy-wyrm.svg',
    hp: 90,
    weaknessAttackId: 'fireball',
    defeatFlavor: 'Fogo responde ao fogo. As cinzas racharam e o dragão caiu.'
  }),
  ice_shard: new Game.Enemy({
    id: 'lava_elemental',
    name: 'Elemental de Lava',
    title: 'Uma criatura de rocha derretida e fúria',
    image: 'assets/images/enemy-lava-elemental.svg',
    hp: 90,
    weaknessAttackId: 'ice_shard',
    defeatFlavor: 'O gelo tomou conta do magma até que a fúria esfriou de vez.'
  }),
  rage_strike: new Game.Enemy({
    id: 'stone_colossus',
    name: 'Colosso de Pedra',
    title: 'Um guardião antigo, lento e implacável',
    image: 'assets/images/enemy-stone-colossus.svg',
    hp: 95,
    weaknessAttackId: 'rage_strike',
    defeatFlavor: 'Só um golpe selvagem e impiedoso conseguiu rachar aquela pedra antiga.'
  }),
  shield_bash: new Game.Enemy({
    id: 'armored_boar',
    name: 'Javali Couraçado',
    title: 'Uma fera blindada em disparada',
    image: 'assets/images/enemy-armored-boar.svg',
    hp: 85,
    weaknessAttackId: 'shield_bash',
    defeatFlavor: 'A investida foi contida por um escudo tão firme quanto a própria fera.'
  }),
  holy_smite: new Game.Enemy({
    id: 'dark_herald',
    name: 'Arauto das Trevas',
    title: 'Um mensageiro sombrio de outro mundo',
    image: 'assets/images/enemy-dark-herald.svg',
    hp: 90,
    weaknessAttackId: 'holy_smite',
    defeatFlavor: 'A luz sagrada não deixou sombra nenhuma para se esconder.'
  }),
  natures_wrath: new Game.Enemy({
    id: 'rusted_automaton',
    name: 'Autômato Enferrujado',
    title: 'Uma máquina antiga, imune a fogo e lâmina',
    image: 'assets/images/enemy-rusted-automaton.svg',
    hp: 90,
    weaknessAttackId: 'natures_wrath',
    defeatFlavor: 'Raízes e vinhas se enroscaram nas engrenagens até travá-las de vez.'
  })
};

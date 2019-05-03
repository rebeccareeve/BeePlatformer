var config = {
  width: 1000,
  height: 750,
  type: Phaser.AUTO,
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {
        y: 649
      },
      debug: false
    }
  },
  pixelArt: true
}
var game = new Phaser.Game(config);
var cursors;
var player;
var bees;
var score = 0,
  scoreText;
var keyW, keyA, keyS, keyD, keySpace;
var music = {},
  sfx = {};
var jumpVel = -550;

function preload() {
  this.load.image("Screen", "../assets/background.png");
  this.load.image("Ground Tiles", "../assets/spritesheet_ground.png");
  this.load.image("Item Tiles", "../assets/spritesheet_items.png");
  this.load.image("Object Tiles", "../assets/spritesheet_tiles.png");
  this.load.spritesheet("player", "../assets/beekeeper.png", {
    frameWidth: 32,
    frameHeight: 53
  });
  this.load.spritesheet("jumper", "../assets/jumpingbeekeeper.png", {
    frameWidth: 32,
    frameHeight: 53
  });
  this.load.spritesheet("jumperLeft", "../assets/jumpingbeekeeperLeft.png", {
    frameWidth: 32,
    frameHeight: 53
  });
  this.load.spritesheet("bobber", "../assets/bobbingbeekeeper.png", {
    frameWidth: 32,
    frameHeight: 53
  });
  this.load.spritesheet("hive", "../assets/beehive.png", {
    frameWidth: 23,
    frameHeight: 21
  });
  this.load.spritesheet("goldenHive", "../assets/goldenbeehive.png", {
    frameWidth: 23,
    frameHeight: 21
  });
  this.load.spritesheet("bee", "../assets/bee.png", {
    frameWidth: 25,
    frameHeight: 23
  });
  this.load.tilemapTiledJSON("tilemap", "../assets/beelevel_enemies.json");
  this.load.audio('grassLandMusic', '../assets/Music/World/Spring.mp3');
}

function create() {
  var map = this.make.tilemap({
    key: "tilemap"
  });
  var groundTiles = map.addTilesetImage("spritesheet_ground", "Ground Tiles");
  var itemTiles = map.addTilesetImage("spritesheet_items", "Item Tiles");
  var objectTiles = map.addTilesetImage("spritesheet_tiles", "Object Tiles");

  this.add.image(0, 0, 'Screen').setScrollFactor(0, 0).setScale(20, 10);

  map.createStaticLayer("Background", [groundTiles, itemTiles, objectTiles], 0, 0);

  var collisionLayer = map.createStaticLayer("Collision", [groundTiles], 0, 0);
  collisionLayer.setCollisionBetween(1, 2000); // The range in which to collide with

  var collisionBackUpLayer = map.createStaticLayer("CollisionBackUp", [groundTiles], 0, 0);
  collisionBackUpLayer.setCollisionBetween(1, 2000);

  map.createStaticLayer("Decorations", [groundTiles, itemTiles, objectTiles], 0, 0);

  music.overground = this.sound.add('grassLandMusic', {
    loop: true,
    volume: 0.5
  });

  var playerSpawn = map.findObject("Player", function(object) {
    if (object.name === "Player Spawn") {
      return object;
    }
  });

  hives = this.physics.add.staticGroup();
  goldenHives = this.physics.add.staticGroup();

  //Find objects and create sprite for relevant group
  map.findObject("Hive", function(object) {
    if (object.type === "PickUp" && object.name === "Hive") {
      hives.create(object.x + map.tileWidth / 2, object.y - map.tileHeight / 2, "hive").setScale(6);
    }
  });
  map.findObject("Golden Hive", function(object) {
    if (object.type === "PickUp" && object.name === "Golden Hive") {
      goldenHives.create(object.x + map.tileWidth / 2, object.y - map.tileHeight / 2, "goldenHive").setScale(6);
    }
  });

  cursors = this.input.keyboard.createCursorKeys();

  createPlayer.call(this, playerSpawn);
  this.physics.add.collider(player, collisionLayer);
  this.physics.add.collider(player, collisionBackUpLayer);
  this.physics.add.collider(player, hives, pickUpHives)
  this.physics.add.collider(player, goldenHives, pickUpGoldenHives)
  createAnimations.call(this);

  player.maxJumps = 1;
  player.jumps = player.maxJumps;

  scoreText = this.add.text(-900, -650, 'Score: 0', {
    fontSize: '64px',
    fill: '#111'
  });
  scoreText.setScrollFactor(0);

  createOverlapAndCollide.call(this);

  var camera = this.cameras.getCamera("");
  camera.zoom = 0.35;
  camera.startFollow(player);
  camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  this.anims.create({
    key: 'fly',
    frames: this.anims.generateFrameNumbers('bee', {
      start: 0,
      end: 10
    }),
    frameRate: 15,
    repeat: -1
  });
  bees = this.physics.add.group();
  var beeSpawn, beeDest, line, bee;
  var beePoints = findPoints.call(this, map, 'Bees', 'enemy');
  var length = beePoints.length / 2;
  for (var i = 1; i < length + 1; i++) {

    beeSpawn = findPoint.call(this, map, 'Bees', 'enemy', 'beeSpawn' + i);
    beeDest = findPoint.call(this, map, 'Bees', 'enemy', 'beeDest' + i);
    line = new Phaser.Curves.Line(beeSpawn, beeDest);
    bee = this.add.follower(line, beeSpawn.x, beeSpawn.y, 'bee').setScale(6);
    bee.startFollow({
      duration: Phaser.Math.Between(3000, 4000),
      repeat: -1, // -1 = infinite
      yoyo: true,
      ease: 'Sine.easeInOut',
      rotateToPath: true,
      rotationOffset: 180,
      verticalAdjust: true
    })
    bee.anims.play('fly', true)
    bees.add(bee);
    bee.body.allowGravity = false;
    bee.setFlipX(true);
    bee.setFlipY(false);

  }

  this.physics.add.overlap(player, bees, beeAttack, null, this);
}

function update() {
  checkPlayerMovement();

  playObjectAnimations.call();
  if (!music.overground.isPlaying) {
    music.overground.play();
  }
  if (score == 21 && player.x == 16320 && player.y == 664) {
    showWin.call(this);
  }
  if (player.y > 2000) {
    killPlayer.call(this);
  }

  bees.children.each(function(bee) {
  }, this)
}

//Play the animations for any objects that are not the player or enemies
function playObjectAnimations() {
  hives.playAnimation("hiveAnims", true);
  goldenHives.playAnimation("goldenHiveAnims", true);
}

function createPlayer() {
  player = this.physics.add.sprite(0, 0, "player", 1).setScale(4);
  player.setCollideWorldBounds(true);
}

function createAnimations() {
  this.anims.create({
    key: "walkLeft",
    frames: this.anims.generateFrameNumbers("player", {
      start: 0,
      end: 8
    }),
    repeat: -1,
    frameRate: 15
  });
  this.anims.create({
    key: "walkRight",
    frames: this.anims.generateFrameNumbers("player", {
      start: 9,
      end: 17
    }),
    repeat: -1,
    frameRate: 15
  });
  this.anims.create({
    key: "idle",
    frames: this.anims.generateFrameNumbers("bobber", {
      frames: [0, 1]
    }),
    repeat: 1,
    frameRate: 3
  });
  this.anims.create({
    key: "jump",
    frames: this.anims.generateFrameNumbers("jumper", {
      frames: [0, 0]
    }),
    repeat: -1,
    frameRate: 5
  });
  this.anims.create({
    key: "jumpLeft",
    frames: this.anims.generateFrameNumbers("jumperLeft", {
      frames: [0, 0]
    }),
    repeat: -1,
    frameRate: 5
  });
  this.anims.create({
    key: "crouch",
    frames: this.anims.generateFrameNumbers("bobber", {
      frames: [2, 2]
    }),
    repeat: -1,
    frameRate: 5
  });
  this.anims.create({
    key: 'hiveAnims',
    frames: this.anims.generateFrameNumbers('hive', {
      start: 0,
      end: 1
    }),
    frameRate: 5,
    repeat: -1,
  });
  this.anims.create({
    key: 'goldenHiveAnims',
    frames: this.anims.generateFrameNumbers('goldenHive', {
      start: 0,
      end: 1
    }),
    frameRate: 5,
    repeat: -1,
  });
}

function createOverlapAndCollide() {
  this.physics.add.collider(player);
  this.physics.add.overlap(player, killPlayer, null, this);
}

function pickUpHives(player, hive) {
  score++;
  scoreText.setText("Score: " + score);
  hive.disableBody(true, true);
}

function pickUpGoldenHives(player, goldenHive) {
  score += 2;
  scoreText.setText("Score: " + score);
  goldenHive.disableBody(true, true);
}

function killPlayer() {
  this.physics.pause();
  player.setTint("0xff0000");
}

function checkPlayerMovement() {
  if (cursors.right.isDown || keyD.isDown) {
    player.body.setVelocityX(550);
    player.anims.play("walkRight", true);
  } else if (cursors.left.isDown || keyA.isDown) {
    player.body.setVelocityX(-550);
    player.anims.play("walkLeft", true);
  } else {
    player.body.setVelocityX(0);
    player.anims.play("idle", true);
  }
  if (player.body.blocked.down === false) {
    if (cursors.right.isDown || keyD.isDown) {
      player.anims.play("jump", true)
    } else if (cursors.left.isDown || keyA.isDown) {
      player.anims.play("jumpLeft", true)
    }
  }
  if ((cursors.up.isDown || keyW.isDown || keySpace.isDown) && player.body.blocked.down) {
    player.body.setVelocityY(-550);
  }
  if (cursors.down.isDown || keyS.isDown) {
    player.anims.play("crouch", true);
    player.body.setVelocityX(0);
    if (!player.body.blocked.down) {
      player.body.setVelocityY(950);
      player.body.setVelocityX(0);
    }
  }

  if ((Phaser.Input.Keyboard.JustDown(keySpace) || Phaser.Input.Keyboard.JustDown(keyW) || Phaser.Input.Keyboard.JustDown(cursors.up)) && player.jumps > 0) {
    player.jumps--;
    player.body.setVelocityY(jumpVel);
  }
  if (player.body.blocked.down) {
    player.jumps = player.maxJumps;
  }
}

function beeAttack(player, bee) {
  this.physics.pause();
  player.setTint('0xff0000');
  bees.children.each(function(bee) {
    bee.stopFollow();
    bee.anims.stop();
  }, this)
}

function findPoint(map, layer, type, name) {
  var loc = map.findObject(layer, function(object) {
    if (object.type === type && object.name === name) {
      return object;
    }
  });
  return loc
}

function findPoints(map, layer, type) {
  var locs = map.filterObjects(layer, function(object) {
    if (object.type === type) {
      return object
    }
  });
  return locs
}

function showWin() {
  isPlaying = false; // disables controls
  player.setTint(0x00ff00); // signify player wins
  resultText = this.add.text(14550, 475, 'You Win!', {
    fontFamily: 'Arial',
    fontSize: '200px',
    fill: '#000080'
  });
  this.physics.pause();
  bees.children.each(function(bee) {
    bee.stopFollow();
    bee.anims.stop();
  }, this)
}

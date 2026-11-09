const T = 32, W = 800, H = 480;

// '#' ground, 'c' coin, 'e' enemy, 'P' player start, 'G' goal flag
const LEVELS = [
  [
    "                                          ",
    "                                          ",
    "                                          ",
    "                                          ",
    "                                          ",
    "                                          ",
    "                                          ",
    "                                          ",
    "                                          ",
    "                                          ",
    "            ccc            ccc            ",
    "          #######        #######          ",
    "                                          ",
    "  P     c        e    c                G  ",
    "##################    ####################",
  ],
  [
    "                                                  ",
    "                                                  ",
    "                                                  ",
    "                                                  ",
    "                                                  ",
    "                                                  ",
    "                                                  ",
    "                                                  ",
    "                                                  ",
    "                        ccc                       ",
    "              ###      #####      ###        cc   ",
    "           c                                ####  ",
    "                                                  ",
    " P         c        c        e       c          G ",
    "############    ######    ##########    ##########",
  ],
];

class Boot extends Phaser.Scene {
  create() {
    const g = this.add.graphics();
    const tex = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };
    tex('ground', T, T, g => {
      g.fillStyle(0x6b4423).fillRect(0, 0, T, T);
      g.fillStyle(0x4caf50).fillRect(0, 0, T, 8);
      g.lineStyle(1, 0x3b2410).strokeRect(0, 0, T, T);
    });
    tex('player', 24, 32, g => {
      g.fillStyle(0x3498db).fillRect(0, 0, 24, 32);
      g.fillStyle(0xffffff).fillRect(12, 6, 8, 8);
      g.fillStyle(0x000000).fillRect(16, 8, 3, 4);
    });
    tex('coin', 16, 16, g => {
      g.fillStyle(0xf1c40f).fillCircle(8, 8, 8);
      g.fillStyle(0xf39c12).fillCircle(8, 8, 4);
    });
    tex('enemy', 28, 24, g => {
      g.fillStyle(0xe74c3c).fillRoundedRect(0, 0, 28, 24, 6);
      g.fillStyle(0xffffff).fillRect(5, 6, 6, 6).fillRect(17, 6, 6, 6);
      g.fillStyle(0x000000).fillRect(7, 8, 3, 3).fillRect(19, 8, 3, 3);
    });
    tex('flag', 24, 64, g => {
      g.fillStyle(0xecf0f1).fillRect(2, 0, 4, 64);
      g.fillStyle(0x2ecc71).fillTriangle(6, 2, 24, 12, 6, 22);
    });
    g.destroy();
    this.scene.start('Play', { level: 0, score: 0 });
  }
}

class Play extends Phaser.Scene {
  constructor() { super('Play'); }
  init(d) { this.lvl = d.level; this.score = d.score; this.startScore = d.score; this.done = false; }

  create() {
    const map = LEVELS[this.lvl];
    this.map = map;
    const cols = map[0].length;
    this.physics.world.setBounds(0, 0, cols * T, H + 200);
    this.cameras.main.setBackgroundColor(this.lvl ? '#2c2a4a' : '#6ec6ff');
    this.cameras.main.setBounds(0, 0, cols * T, H);

    this.ground = this.physics.add.staticGroup();
    this.coins = this.physics.add.staticGroup();
    let start = { x: 64, y: 300 }, goalPos, enemyPos;
    map.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = c * T + T / 2, y = r * T + T / 2;
      if (ch === '#') this.ground.create(x, y, 'ground');
      else if (ch === 'c') this.coins.create(x, y, 'coin');
      else if (ch === 'P') start = { x, y };
      else if (ch === 'G') goalPos = { x, y: (r + 1) * T - 32 };
      else if (ch === 'e') enemyPos = { x, y };
    }));

    this.goal = this.physics.add.staticImage(goalPos.x, goalPos.y, 'flag');
    this.enemy = this.physics.add.sprite(enemyPos.x, enemyPos.y, 'enemy');
    this.enemy.dir = -1;
    this.player = this.physics.add.sprite(start.x, start.y, 'player');
    this.player.setCollideWorldBounds(false);
    this.player.jumps = 0;

    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.enemy, this.ground);
    this.physics.add.overlap(this.player, this.coins, (p, coin) => {
      coin.destroy(); this.score += 10; this.updateHud();
    });
    this.physics.add.overlap(this.player, this.enemy, () => this.touchEnemy());
    this.physics.add.overlap(this.player, this.goal, () => this.finish());

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.hud = this.add.text(12, 10, '', { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0);
    this.add.text(W / 2, 460, 'Arrows/WASD move · Up/W/Space jump (twice!) · stomp the red blob', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setScrollFactor(0);
    this.updateHud();

    this.cur = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,D,SPACE');
  }

  updateHud() { this.hud.setText(`Level ${this.lvl + 1}/${LEVELS.length}   Coins: ${this.score / 10}`); }

  solidAt(x, y) {
    const r = Math.floor(y / T), c = Math.floor(x / T);
    return this.map[r] && this.map[r][c] === '#';
  }

  touchEnemy() {
    if (this.done || !this.enemy.active) return;
    const p = this.player;
    if (p.body.velocity.y > 0 && p.body.bottom < this.enemy.body.top + 14) {
      this.enemy.destroy();
      p.setVelocityY(-320); p.jumps = 1;
      this.score += 20; this.updateHud();
    } else this.die();
  }

  die() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.shake(200, 0.01);
    this.time.delayedCall(350, () => this.scene.restart({ level: this.lvl, score: this.startScore }));
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.time.delayedCall(250, () => {
      if (this.lvl + 1 < LEVELS.length) this.scene.restart({ level: this.lvl + 1, score: this.score });
      else this.scene.start('Win', { score: this.score });
    });
  }

  update() {
    const p = this.player, k = this.keys, c = this.cur;
    if (this.done) { return; }
    if (p.y > H + 60) return this.die();

    const left = c.left.isDown || k.A.isDown, right = c.right.isDown || k.D.isDown;
    p.setVelocityX(left ? -200 : right ? 200 : 0);
    if (left) p.setFlipX(true); else if (right) p.setFlipX(false);

    if (p.body.blocked.down) p.jumps = 0;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(c.up) || Phaser.Input.Keyboard.JustDown(k.W) || Phaser.Input.Keyboard.JustDown(k.SPACE);
    if (jumpPressed) {
      if (p.body.blocked.down) { p.setVelocityY(-450); p.jumps = 1; }
      else if (p.jumps < 2) { p.setVelocityY(-420); p.jumps = 2; }
    }

    const e = this.enemy;
    if (e.active) {
      const ahead = e.x + e.dir * 18, feet = e.body.bottom + 4;
      if (e.body.blocked.down && (!this.solidAt(ahead, feet) || this.solidAt(ahead, e.y))) e.dir *= -1;
      e.setVelocityX(e.dir * 70);
      e.setFlipX(e.dir > 0);
    }
  }
}

class Win extends Phaser.Scene {
  constructor() { super('Win'); }
  create(d) {
    this.cameras.main.setBackgroundColor('#1b1b3a');
    const t = (y, s, size, col) => this.add.text(W / 2, y, s, { fontSize: size + 'px', color: col, fontStyle: 'bold' }).setOrigin(0.5);
    const title = t(150, 'YOU WIN!', 72, '#f1c40f');
    t(240, `Coins collected: ${d.score / 10}`, 28, '#fff');
    t(330, 'Press SPACE or click to play again', 20, '#aaa');
    this.tweens.add({ targets: title, scale: 1.1, yoyo: true, repeat: -1, duration: 600 });
    const again = () => this.scene.start('Play', { level: 0, score: 0 });
    this.input.keyboard.once('keydown-SPACE', again);
    this.input.once('pointerdown', again);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: W, height: H,
  parent: document.body,
  physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: false } },
  scene: [Boot, Play, Win],
});

const T = 32, VW = 800, VH = 480, ROWS = 15;

// Levels: ground = [startCol, endCol) spans (rows 13-14), plats = [col,row,len]
const LEVELS = [
  { w: 60, ground: [[0,20],[24,40],[44,60]],
    plats: [[12,10,4],[28,9,4],[34,10,3],[50,10,4]],
    coins: [[6,12],[7,12],[8,12],[13,9],[14,9],[15,9],[21.5,10],[22.5,10],[29,8],[30,8],[31,8],[35,9],[36,9],[42,10],[51,9],[52,9],[53,9],[55,12]],
    enemies: [[31,12]], start: [2,12], goal: 57 },
  { w: 72, ground: [[0,12],[16,26],[31,40],[46,56],[61,72]],
    plats: [[8,10,3],[18,9,3],[22,7,3],[27,9,2],[41,10,3],[43,8,2],[57,10,3],[64,9,4]],
    coins: [[4,12],[5,12],[9,9],[10,9],[14,10],[19,8],[20,8],[23,6],[24,6],[28.5,8],[33,12],[34,12],[35,12],[42,9],[44,7],[48,12],[49,12],[58,9],[59,9],[65,8],[66,8],[67,8]],
    enemies: [[20,12],[36,12]], start: [2,12], goal: 69 }
];

class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    const g = this.make.graphics({ add: false });
    const tex = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };
    tex('tile', T, T, g => { g.fillStyle(0x6b4a2b).fillRect(0,0,T,T); g.fillStyle(0x4caf50).fillRect(0,0,T,8); g.lineStyle(1,0x3b2a18).strokeRect(0,0,T,T); });
    tex('plat', T, 16, g => { g.fillStyle(0x8d6e63).fillRect(0,0,T,16); g.fillStyle(0x66bb6a).fillRect(0,0,T,6); });
    tex('player', 24, 30, g => { g.fillStyle(0x3f8efc).fillRoundedRect(0,0,24,30,6); g.fillStyle(0xffffff).fillRect(12,7,8,8); g.fillStyle(0x111111).fillRect(16,9,4,4); });
    tex('coin', 16, 16, g => { g.fillStyle(0xffd600).fillCircle(8,8,8); g.fillStyle(0xfff59d).fillCircle(6,6,3); });
    tex('enemy', 28, 24, g => { g.fillStyle(0xe53935).fillRoundedRect(0,0,28,24,8); g.fillStyle(0xffffff).fillRect(5,6,7,7).fillRect(16,6,7,7); g.fillStyle(0x111111).fillRect(8,8,3,4).fillRect(19,8,3,4); });
    tex('flag', 32, 96, g => { g.fillStyle(0xeeeeee).fillRect(4,0,4,96); g.fillStyle(0x00c853).fillTriangle(8,2,32,14,8,28); });
    this.scene.start('title');
  }
}

function label(scene, y, text, size, color) {
  return scene.add.text(VW/2, y, text, { fontFamily: 'monospace', fontSize: size + 'px', color: color || '#fff', align: 'center' }).setOrigin(.5);
}

class Title extends Phaser.Scene {
  constructor() { super('title'); }
  create() {
    this.cameras.main.setBackgroundColor('#1d2b53');
    label(this, 150, 'COIN HOPPER', 56, '#ffd600');
    label(this, 250, 'Arrows / WASD: move   Up / W / Space: jump (press again in air to double jump)\nStomp the red blobs. Grab coins. Reach the flag.', 15);
    const p = label(this, 370, 'Press SPACE or click to start', 24, '#aaaaff');
    this.tweens.add({ targets: p, alpha: .2, yoyo: true, repeat: -1, duration: 600 });
    const go = () => this.scene.start('play', { level: 0, coins: 0, deaths: 0, t0: this.time.now });
    this.input.keyboard.once('keydown-SPACE', go);
    this.input.once('pointerdown', go);
  }
}

class Play extends Phaser.Scene {
  constructor() { super('play'); }
  init(d) {
    this.lvl = d.level; this.totalCoins = d.coins; this.deaths = d.deaths; this.t0 = d.t0;
    this.levelCoins = 0; this.dead = false; this.done = false;
  }

  create() {
    const L = this.L = LEVELS[this.lvl];
    const W = L.w * T, H = ROWS * T;
    this.cameras.main.setBackgroundColor(this.lvl ? '#2b1b3d' : '#7ec8e3');
    this.physics.world.setBounds(0, 0, W, H + 400);
    this.physics.world.setBoundsCollision(true, true, true, false);

    // grid of solid cells for enemy ledge detection
    this.solid = new Set();
    this.walls = this.physics.add.staticGroup();
    for (const [a, b] of L.ground) {
      for (let c = a; c < b; c++) {
        for (let r = 13; r < ROWS; r++) {
          this.walls.create(c*T + T/2, r*T + T/2, 'tile');
          this.solid.add(c + ',' + r);
        }
      }
    }
    // one-way platforms: solid only from above
    this.oneway = this.physics.add.staticGroup();
    for (const [c, r, n] of L.plats) {
      for (let i = 0; i < n; i++) {
        const p = this.oneway.create((c+i)*T + T/2, r*T + 8, 'plat');
        p.body.checkCollision.down = false;
        p.body.checkCollision.left = false;
        p.body.checkCollision.right = false;
      }
    }

    this.goal = this.physics.add.staticImage(L.goal*T + 16, 13*T - 48, 'flag');
    this.coins = this.physics.add.staticGroup();
    for (const [c, r] of L.coins) this.coins.create(c*T + 16, r*T + 16, 'coin');
    this.tweens.add({ targets: this.coins.getChildren(), scale: .75, yoyo: true, repeat: -1, duration: 500 });

    this.enemies = this.physics.add.group();
    for (const [c, r] of L.enemies) {
      const e = this.enemies.create(c*T + 16, r*T + 4, 'enemy');
      e.setCollideWorldBounds(true).setVelocityX(-60);
      e.dir = -1;
    }

    this.player = this.physics.add.sprite(L.start[0]*T, L.start[1]*T, 'player');
    this.player.setCollideWorldBounds(true).setMaxVelocity(300, 800);
    this.coyote = 0; this.buffer = 0; this.jumpsLeft = 2;

    for (const grp of [this.walls, this.oneway]) {
      this.physics.add.collider(this.player, grp);
      this.physics.add.collider(this.enemies, grp);
    }
    this.physics.add.overlap(this.player, this.coins, (p, c) => {
      c.destroy(); this.levelCoins++; this.updateHud();
    });
    this.physics.add.overlap(this.player, this.enemies, (p, e) => this.hitEnemy(p, e));
    this.physics.add.overlap(this.player, this.goal, () => this.finish());

    this.cameras.main.setBounds(0, 0, W, H).startFollow(this.player, true, .12, .12);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,D,SPACE');

    this.hud = this.add.text(12, 10, '', { fontFamily: 'monospace', fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0).setDepth(10);
    this.updateHud();
  }

  updateHud() {
    this.hud.setText('Level ' + (this.lvl + 1) + '/' + LEVELS.length + '   Coins: ' + (this.totalCoins + this.levelCoins) + '   Deaths: ' + this.deaths);
  }

  hitEnemy(p, e) {
    if (this.dead || this.done || !e.active) return;
    if (p.body.velocity.y > 0 && p.body.bottom - e.body.top < 16) {
      e.destroy(); p.setVelocityY(-380); this.jumpsLeft = 1;
    } else this.die();
  }

  die() {
    if (this.dead || this.done) return;
    this.dead = true; this.deaths++;
    this.cameras.main.shake(150, .01); this.cameras.main.flash(250, 255, 0, 0);
    this.player.setTint(0xff4444).setVelocity(0, -300);
    this.time.delayedCall(600, () => this.scene.restart({ level: this.lvl, coins: this.totalCoins, deaths: this.deaths, t0: this.t0 }));
  }

  finish() {
    if (this.done || this.dead) return;
    this.done = true;
    const coins = this.totalCoins + this.levelCoins;
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;
    const next = this.lvl + 1;
    this.add.text(VW/2, VH/2, 'LEVEL CLEAR!', { fontFamily: 'monospace', fontSize: '48px', color: '#ffd600', stroke: '#000', strokeThickness: 6 }).setOrigin(.5).setScrollFactor(0).setDepth(10);
    this.time.delayedCall(1200, () => {
      if (next < LEVELS.length) this.scene.start('play', { level: next, coins: coins, deaths: this.deaths, t0: this.t0 });
      else this.scene.start('win', { coins: coins, deaths: this.deaths, time: (this.time.now - this.t0) / 1000 });
    });
  }

  update(time, delta) {
    if (this.dead || this.done) return;
    const p = this.player, b = p.body, dt = delta / 1000, c = this.cursors, k = this.keys;
    const left = c.left.isDown || k.A.isDown, right = c.right.isDown || k.D.isDown;
    const JD = Phaser.Input.Keyboard.JustDown, JU = Phaser.Input.Keyboard.JustUp;
    const jumpDown = JD(c.up) || JD(k.W) || JD(k.SPACE);
    const jumpUp = JU(c.up) || JU(k.W) || JU(k.SPACE);

    // horizontal movement with acceleration
    const onGround = b.blocked.down || b.touching.down;
    const target = ((right ? 1 : 0) - (left ? 1 : 0)) * 210, accel = onGround ? 2000 : 1300;
    const vx = b.velocity.x;
    p.setVelocityX(vx + Phaser.Math.Clamp(target - vx, -accel * dt, accel * dt));
    if (left !== right) p.setFlipX(left);

    // jump: coyote time + input buffer + double jump + variable height
    if (onGround) { this.coyote = .1; this.jumpsLeft = 2; } else this.coyote -= dt;
    if (jumpDown) this.buffer = .12; else this.buffer -= dt;
    if (this.buffer > 0) {
      if (this.coyote > 0) {
        p.setVelocityY(-560); this.coyote = 0; this.buffer = 0; this.jumpsLeft = 1;
      } else if (this.jumpsLeft > 0 && !onGround) {
        p.setVelocityY(-500); this.jumpsLeft--; this.buffer = 0;
        for (let i = 0; i < 4; i++) {
          const d = this.add.circle(p.x + (i - 1.5) * 5, b.bottom, 4, 0xffffff, .8);
          this.tweens.add({ targets: d, alpha: 0, y: d.y + 12, duration: 300, onComplete: () => d.destroy() });
        }
      }
    }
    if (jumpUp && b.velocity.y < -200) p.setVelocityY(b.velocity.y * .5);
    b.setGravityY(b.velocity.y > 0 ? 700 : 0); // heavier fall on top of world gravity

    // enemy patrol: turn at walls or ledges
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const col = Math.floor((e.x + e.dir * 18) / T), row = Math.floor((e.body.bottom + 4) / T);
      if (e.body.blocked.left || e.body.blocked.right || (e.body.blocked.down && !this.solid.has(col + ',' + row))) {
        e.dir *= -1; e.setVelocityX(60 * e.dir);
      }
      e.setFlipX(e.dir > 0);
    }

    if (p.y > ROWS * T + 60) this.die();
  }
}

class Win extends Phaser.Scene {
  constructor() { super('win'); }
  create(d) {
    this.cameras.main.setBackgroundColor('#1b5e20');
    label(this, 120, 'YOU WIN!', 72, '#ffd600');
    label(this, 230, 'Coins collected: ' + d.coins + '\nDeaths: ' + d.deaths + '\nTime: ' + d.time.toFixed(1) + 's', 26);
    const p = label(this, 370, 'Press SPACE or click to play again', 22, '#ccffcc');
    this.tweens.add({ targets: p, alpha: .2, yoyo: true, repeat: -1, duration: 600 });
    const go = () => this.scene.start('title');
    this.input.keyboard.once('keydown-SPACE', go);
    this.input.once('pointerdown', go);
  }
}

new Phaser.Game({
  type: Phaser.AUTO, width: VW, height: VH,
  physics: { default: 'arcade', arcade: { gravity: { y: 1300 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title, Play, Win]
});

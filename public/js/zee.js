function game_log(s) {
  $('log') && $('log').update(s+'\n'+$('log').innerHTML);
}

var MultiPlayerGame = Class.create({
  initialize: function(el) {
    this.numPlayers = 1;
    this.currentPlayer = 0;
    this.players= [];
    this.masterGame = new Yahtzee(el);
    this.masterGame.afterReturnScore = this.cycleGame.bind(this);
    this.el = el;
    this.playerList = $('playerZone');

    $$('.players .addHuman').first().on('click', function() {
      this.addHuman();
    }.bind(this));

    $$('.players .addCPU').first().on('click', function() {
      this.addCPU();
    }.bind(this));
  },

  startGame: function() {
    $R(1, this.numPlayers).each(function(i) {
      var y = new YahPlayer(this.masterGame);
      this.players.push(y);
    }.bind(this));

    this.masterGame.player = this.players[this.currentPlayer];
  },

  cycleGame: function() {
    if (this.numPlayers == 1) return;

    this.currentPlayer = this.currentPlayer == this.numPlayers-1 ? 0 : this.currentPlayer+1;
    this.masterGame.player = this.players[this.currentPlayer];

    (function() {
      this.switchToPlayer(this.currentPlayer);
    }.bind(this)).delay('1.2');
  },

  switchToPlayer: function(p) {
    //game_log('Switched to player' + this.currentPlayer);
    this.masterGame.tally();
    this.masterGame.redrawScores();
  },

  addHuman: function() {
    this.numPlayers++;
    this.playerList.select('li').last().insert({
      before: new Element('li').update('Player ' + this.numPlayers)
    })
  },

  addCPU: function() {
    this.numPlayers++;
    this.playerList.select('li').last().insert({
      before: new Element('li').update()
    })
  }
});

var YahPlayer = Class.create({

  initialize: function(game) {
    this.topScore = 0;
    this.bottomScore = 0;
    this.topBonus = 0;
    this.yahBonus = 0;
    this.totalScore = 0;
    this.yahCount = 0;
    this.cpuNames = ['Rodney', 'Tarzan', 'Infamous J', 'Deep Brown']

    var scoreNames = game.scoreChecker.keys();
    this.scores = $H();

    // scores = { 'yah' : 0, 'ones' : 0 ... }
    scoreNames.each(function(s) {
      this.scores.set(s, null);
    }.bind(this));

  },

});

/**
 * ZEE
 */
var Yahtzee = Class.create({
  initialize: function(el) {
    this.container = el;
    this.dice = $A([]);
    this.rollButton = this.container.down('.rollButton');
    this.testGame = this.fullGameRolls();
    this.rollNumber = 0;
    this.test = true;

    $$('.scores .score').invoke('hide');

    // array of dice img tags
    this.diceElements = this.container.select('.rollZone .die img');

    // when you click a die, call keep()
    this.diceElements.each( function(e) {
      e.on('click', function(event, el) {
        this.keep(el);
      }.bind(this));
    }.bind(this));

    // create 5 dice
    // value = number of the die
    // keep = did the user keep this for the next roll
    $R(0,4).each( function(i) {
      this.dice.push({value : null, keep : false, element: this.diceElements[i]});
    }.bind(this));

    // testing
    //this.testRoll([6,6,6,6,6]);
    //this.rollNumber = 1;
    //this.outputRoll();

    this.scoreChecker= $H({
      'ones': { check: this.sumOf.bind(this, 1), section : 'top'},
      'twos': { check: this.sumOf.bind(this, 2), section : 'top'},
      'threes': { check: this.sumOf.bind(this, 3), section : 'top'},
      'fours': { check: this.sumOf.bind(this, 4), section : 'top'},
      'fives': { check: this.sumOf.bind(this, 5), section : 'top'},
      'sixes': { check: this.sumOf.bind(this, 6), section : 'top'},
      'three-kind': { check: this.kind.bind(this, 3), section : 'bottom'},
      'four-kind': { check: this.kind.bind(this, 4), section : 'bottom'},
      'full-house': { check: this.house.bind(this, 2), section : 'bottom'},
      'small-straight': { check: this.straight.bind(this, 'small'), section : 'bottom'},
      'large-straight': { check: this.straight.bind(this, 'large'), section : 'bottom'},
      'chance': { check: this.sumOf.bind(this, null), section : 'bottom'},
      'yah': { check: this.yah.bind(this), section : 'bottom'},
    });

    // each score key maps to a TD in the .scores table
    // each TD has a <button> and a .score element
    // the button triggers recordScore
    // the .score element gets updated with the score calculation
    this.scoreChecker.each( function(pair) {
      var scoreButton = this.container.down('.scores .' + pair.key + ' button');
      var scoreContainer = this.container.down('.scores .' + pair.key + ' .score');

      pair.value.button = scoreButton;
      pair.value.container = scoreContainer;

      if (scoreButton) {
        scoreButton.on('click', function(event, el) {
          //alert(pair.value.check());
          this.recordScore(pair.key, pair.value.check());
        }.bind(this));
      }
    }.bind(this));


    // roll button calls roll()
    this.rollButton.on('click', function() {
      this.roll();
    }.bind(this));

    // hash storing a type of score mapped ot the function to score it
    // TODO make nicer
    this.player = new YahPlayer(this);

  },

  /**
   * TODO this is cruddy
   */
  recordScore: function(key, score) {
    if (this.rollNumber < 1) return;

    // if the roll is also a yahtzee
    if (this.scoreChecker.get('yah').check() > 0) {
      // already have a yahtzee
      if (this.player.scores.get('yah') > 0) {
        this.player.yahBonus += 100;
        this.player.yahCount++;
      }
    }

    this.player.scores.set(key, score);

    if (this.scoreChecker.get(key).section == 'top') {
      this.player.topScore += score;
    }

    if (this.scoreChecker.get(key).section == 'bottom') {
      this.player.bottomScore += score;
    }

    if (this.player.topScore >= 63 && this.player.topBonus == 0) {
      this.player.topBonus = 35;
    }

    this.tally(); // output to scoreboard
    this.redrawScores(); // hide/show buttons and scores
    this.afterReturnScore(); // callback
  },

  redrawScores : function() {
    this.scoreChecker.each(function(pair) {

      var button = pair.value.button
      var container = pair.value.container
      var score = this.player.scores.get(pair.key)

      if (score == null)  {
        button.show();
        container.hide();
      } else {
        button.hide();
        container.show();
        container.update(score);
      }
    }.bind(this));

    this.rollNumber = 0;
    this.rollButton.disabled = false;

    // reset keepers
    this.dice.each(function(e) {
      e.keep = false;
      e.element.up().removeClassName('keep');
    });

  },

  afterReturnScore: function() {
    return;
  },

  tally: function() {
    this.container.down('.totals .top').update(this.player.topScore);
    this.container.down('.totals .bottom').update(this.player.bottomScore);
    this.container.down('.totals .topBonus').update(this.player.topBonus);
    this.container.down('.totals .yahBonus').update(this.player.yahBonus);
    this.container.down('.totals .yahCount').update(this.player.yahCount);
    this.container.down('.totals .total').update(this.player.topScore + this.player.bottomScore + this.player.topBonus + this.player.yahBonus);
  },

  /**
   * Sets a die.keep to true
   * Adds/removes classes to show the die as kept
   */
  keep : function(el) {
    if (this.rollNumber < 1) return;

    // get index of the die
    var index = el.up().previousSiblings().size();
    var die = this.dice[index];
    // die are not kept by default, the user's click toggles the keep value
    die.keep = !die.keep;

    die.keep ? el.up().addClassName('keep') : el.up().removeClassName('keep');
  },

  /**
   * Randomly rolls all non-kept dice
   */
  roll: function() {
    if (this.test && this.testGame.length > 0) {
      this.testRoll(this.testGame.shift());
    } else {
      this.dice.each( function(die, i) {
        if (!die.keep) {
          die.value = this.rand()
        }
      }.bind(this));
    }

    // write out the result of the row
    this.outputRoll();
    this.rollNumber++;

    // 3 rolls per turn
    if (this.rollNumber >= 3) {
      this.rollButton.disabled = true;
    }
  },

  // helper for quick dice img paths
  diceSrc: function(i) {
    if (i == null) i = 'blank';
    return '/img/dice/'+i+'.png';
  },

  /**
   * Outut the dice img paths
   */
  outputRoll: function() {
    this.dice.each(function(die, i) {
      die.element.setAttribute('src', this.diceSrc(die.value));
    }.bind(this));
    this.container.down('.rollNum').update(this.rollNumber+1);
  },

  // random helper
  rand: function() {
    return Math.floor(Math.random()*6)+1;
  },

  /**
   * this.dice are an array of objects with a keep and value attr
   * return just the value attributes of the dice for scoring
   */
  diceValues: function() {
    var values = $A();
    this.dice.each( function(die, i) {
      values.push(die.value);
    });
    return values;
  },


  //// Scoring functions

  /**
   * Returns sum of a given num in a hand
   * Passing null returns sum of entire hand
   */
  sumOf: function(num) {
    var sum = 0;
    this.diceValues().each( function(v) {
      if (v == num || num == null) sum += v;
    });
    return sum;
  },

  /**
   * Given a hand return an array of that number's
   * occurances
   *
   * ex. this.diceValues() => [1,1,1,2,2]
   *
   * => [0, 3, 2, 0, 0, 0, 0]
   */
  getCounts: function() {
    var counts = []
    $R(1,7).each(function(i){
      counts.push(0);
    });

    this.diceValues().each( function(v) {
      counts[v]++;
    });
    return counts;
  },

  /**
   * num is the [num]-of-a-kind to look for
   */
  kind: function(num) {
    var counts = this.getCounts();

    for (var i = 0; i < counts.length; i++) {
      if (counts[i] >= num) return this.sumOf(null);
    }
    return 0;
  },

  /**
   * Full house
   * Check if the getCounts has 2 and 3
   */
  house: function() {
    var counts = this.getCounts();
    var isHouse = counts.indexOf(2) != -1 && counts.indexOf(3) != -1;

    return isHouse ? 25 : 0;
  },

  /**
   * Sort values, count up sequential values
   */
  straight: function(name) {
    var sorted = this.diceValues().sort(function(a,b){return a-b});

    var last = sorted.shift();
    var cnt = 1;
    sorted.each(function(v, i) {
      if (v == last+1) cnt++;
      last = v;
    });

    if (name == 'small') {
      if (cnt >= 4) return 30;
    }

    if (name == 'large') {
      if (cnt >= 5) return 40;
    }
    return 0;
  },

  message: function(mess) {
    this.container.down('messageZone').update('message');
    h

  },

  /**
   * Yahtzee, 1 unique number
   */
  yah: function() {
    if (this.diceValues().uniq().length == 1) {
      return 50;
    }
  },

  ///// testing
  testRoll: function(list) {
    list.each(function(v, i) {
      this.dice[i].value = v;
    }.bind(this));
  },

  fullGameRolls: function() {
    l = [
      [1,1,1,1,1],
      [1,1,1,1,1],
      [2,2,2,2,2],
      [3,3,3,3,3],
      [4,4,4,4,4],
      [5,5,5,5,5],
      [6,6,6,6,6],
      [6,6,6,6,6],
      [6,6,6,6,6],
      [4,4,5,5,5],
      [1,2,3,4,5],
      [1,2,3,4,5],
      [6,6,6,6,6],
      [6,6,6,6,6],
      [6,6,6,6,6]
    ];
    return l;
  },
});

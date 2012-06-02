
/**
 * ZEE
 */
var Yahtzee = Class.create({
  initialize: function(el) {
    this.container = el;
    this.dice = $A([]);
    this.rollNumber = 0;
    this.rollButton = this.container.down('button');

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
    $R(1, 5).each( function(i) {
      this.dice.push({value : null, keep : false});
    }.bind(this));

    // testing
    // this.dice = this.testRoll([6,6,6,6,6]);
    // this.outputRoll();

    // roll button calls roll()
    this.rollButton.on('click', function() {
      this.roll();
    }.bind(this));

    // hash storing a type of score mapped ot the function to score it
    // TODO make nicer
    this.scores = $H({
      'ones': { check: function(){ return this.sumOf(1)}.bind(this)},
      'twos': { check: function(){ return this.sumOf(2)}.bind(this)},
      'threes': { check: function(){ return this.sumOf(3)}.bind(this)},
      'fours': { check: function(){ return this.sumOf(4)}.bind(this)},
      'fives': { check: function(){ return this.sumOf(5)}.bind(this)},
      'sixes': { check: function(){ return this.sumOf(6)}.bind(this)},
      'three-kind': { check: function(){ return this.kind(3) }.bind(this)},
      'four-kind': { check: function(){ return this.kind(4) }.bind(this)},
      'full-house': { check: function(){ return this.house(2) }.bind(this)},
      'small-straight': { check: function(){return this.straight('small') }.bind(this)},
      'large-straight': { check: function(){return this.straight('large') }.bind(this)},
      'chance': { check: function(){return this.sumOf(null)}.bind(this)},
      'yah': { check: function(){return this.yah()}.bind(this)},
    });

    // each score key maps to a TD in the .scores table
    // each TD has a <button> and a .score element
    // the button triggers recordScore
    // the .score element gets updated with the score calculation
    this.scores.each( function(pair) {
      var scoreButton = this.container.down('.scores .' + pair.key + ' button');

      var scoreContainer = this.container.down('.scores .' + pair.key + ' .score');
      if (scoreButton) {
        scoreButton.on('click', function(event, el) {
          //alert(pair.value.check());
          this.recordScore(pair.key, pair.value.check(), scoreButton, scoreContainer);
        }.bind(this));
      }
    }.bind(this));
  },

  /**
   * TODO this is cruddy
   */
  recordScore: function(key, score, button, container) {
    if (this.rollNumber < 1) return;
    this.scores.get(key).score = score;
    container.update(score);
    button.hide();
    this.rollNumber = 0;
    this.rollButton.disabled = false;
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

    die.keep ? el.addClassName('keep') : el.removeClassName('keep');
  },

  /**
   * Randomly rolls all non-kept dice
   */
  roll: function() {
    this.dice.each( function(die, i) {
      if (!die.keep) {
        die.value = this.rand()
      }
    }.bind(this));

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
      this.diceElements[i].setAttribute('src', this.diceSrc(die.value));
    }.bind(this));
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
    $R(1,6).each(function(i){
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
    alert(sorted.inspect());

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

  /**
   * Yahtzee, 1 unique number
   */
  yah: function() {
    if (this.diceValues().uniq().length == 1) return 50;
  },

  ///// testing
  testRoll: function(list) {
    var l = [];
    list.each(function(v) {
      l.push({value: v, keep: true});
    });
    return l;
  }

});

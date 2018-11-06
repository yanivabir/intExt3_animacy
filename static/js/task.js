// Parameters
var ITI = 1000,
  // unitSize = 4,
  train_1_n = 10,
  train_1_rt_crit = 3500,
  train_1_n_performance_thresh = 0.7,
  train_2_n = 16,
  breakEvery = 15,
  clar_range = [0.2, 0.8],
  clar_nsteps = 10,
  clar_nsteps_train = 8,
  n_rep = 2,
  n_new = 1, // sum to Ntotal
  n_repeat_steps = 3,
  n_quant_mem = 40,
  rep_range = [30, 80],
  training_allowed_repeat = 2,
  experiment_performance_thresh = .85,
  experiment_performance_trials = 20,
  experiment_RT_trials = 8,
  experiment_RT_trial_threshold = 5,
  experiment_RT_threshold = 300;

var exp_images;
var train_images;
var trial_plan;
var lags = [];
var main_block;
var lastWarned = -experiment_performance_trials;

Papa.parse("../static/sampImagesInfo.csv", {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: function(results) {
    exp_images = results.data; //.slice(0, results.data.length - 1);
    Papa.parse("../static/train_images.csv", {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: function(results) {
        train_images = results.data;
        post_load();
      }
    })
  }
});

var post_load = function() {

  /* Preload images */
  var images = ['/static/images/Nickel.png',
    '/static/images/Penny.png',
    '/static/images/Dime.png',
    '/static/images/Quarter.png',
    '/static/images/keys.jpg',
    '/static/images/coin_demo.jpg',
    '/static/images/ex1.jpg',
    '/static/images/ex2.jpg'
  ];

  var n_total;
  n_total = exp_images.length;

  for (i = 0; i != n_total; i++) {
    var this_img = exp_images[i].name;
    images.push('/static/images/' + this_img);
    images.push('/static/images/' +
      this_img.substr(0, this_img.length - 4) + '_s.jpg');
  }

  for (i = 0; i != train_1_n + train_2_n; i++) {
    var this_img = train_images[i].name;
    images.push('/static/images/' + this_img);
    if (i >= train_1_n) {
      images.push('/static/images/' +
        this_img.substr(0, this_img.length - 4) + '_s.jpg');
    }
  }

  /* Prepare experimental main block*/

  // Set of unique clar_levles
  var clar_levels = [];
  for (i = 0; i != clar_nsteps; i++) {
    clar_levels.push(clar_range[0] + i *
      (clar_range[1] - clar_range[0]) / (clar_nsteps - 1))
  }

  // Set of clar_levels for each cell
  var reps_within_cell = [];
  for (i = 1; i <= clar_nsteps; i++) {
    if (i > 7) {
      n = n_rep;
    } else {
      n = n_new;
    }
    for (j = 1; j <= n; j++) {
      reps_within_cell.push(clar_levels[i - 1])
    }
  }

  // Assign clar_level per image
  for (i = 0; i != n_total; i++) {
    if (i % (n_total / n_quant_mem) == 0) {
      reps_within_cell = jsPsych.randomization.shuffle(reps_within_cell);
    }
    exp_images[i].clar_level = reps_within_cell[i % (n_total / 2 / n_quant_mem)];
    exp_images[i].is_rep = 0;
  }

  // Randomize order of trials
  exp_images = jsPsych.randomization.shuffle(exp_images);

  // Make sure high_clar are not too late
  high_clar = [];
  for (i = n_total - 1; i >= 0; i--) {
    if (exp_images[i].clar_level >=
      clar_levels[clar_nsteps - n_repeat_steps]) {
      high_clar.push(exp_images.splice(i, 1)[0]);
    }
  }

  for (i = 0; i != high_clar.length; i++) {
    var high_range = [0, exp_images.length - rep_range[1]];
    var p = Math.floor(Math.random() *
      (high_range[1] - high_range[0] + 1) + high_range[0]);
    exp_images.splice(p, 0, high_clar[i])
  }


  // Set of clar levels
  var n = high_clar.length / clar_nsteps;
  var rep_clars = [];
  for (i = 1; i <= clar_nsteps; i++) {
    for (j = 1; j <= n; j++) {
      rep_clars.push(clar_levels[i - 1])
    }
  }

  // Randomize set
  rep_clars = jsPsych.randomization.shuffle(rep_clars);

  // Create trial plan
  var plan_n = exp_images.length + high_clar.length, // total length
    used_indx = [], // array of used indices for assignment
    c_rep_clar = 0; // Counter from clar leves
  trial_plan = new Array(plan_n); // Preallocate trial plan length

  // Run over images
  for (i = 0; i != exp_images.length; i++) {
    exp_images[i].img_indx = i; // Set original image indx for ref

    // Look for next available indx
    var j = i;
    while (used_indx.includes(j)) j++;
    trial_plan.splice(j, 1, exp_images[i]);
    trial_plan[j].trial = j + 1;
    used_indx.push(j);

    // Assign rep if needed
    if (exp_images[i].clar_level >=
      clar_levels[clar_nsteps - n_repeat_steps]) {
      var this_rep = jQuery.extend(true, {}, exp_images[i]); // Deep copy
      // Change attributes
      this_rep.is_rep = 1;
      this_rep.prev_indx = j;
      this_rep.clar_level = rep_clars[c_rep_clar];
      c_rep_clar++;
      // Draw lag
      var d = Math.floor(Math.random() *
        (rep_range[1] - rep_range[0] + 1) + rep_range[0]);
      this_rep.lag = d;
      lags.push(d);

      // Assign
      trial_plan.splice(j + d, 1, this_rep);
      trial_plan[j + d].trial = j + d + 1;
      used_indx.push(j + d);
    }
  }


  /*** Enter fullscreen ***/
  var fullscreen = {
    type: 'fullscreen',
    fullscreen_mode: true,
    message: '<p>This study runs in fullscreen. To switch to full screen mode \
    and start the HIT, press the button below.</p>',
    on_finish: function() {
      // Hide mouse
      var stylesheet = document.styleSheets[0];
      stylesheet.insertRule("* {cursor: none;}", stylesheet.cssRules.length);
    }
  }


  // Initiate psiturk
  var psiturk = new PsiTurk(uniqueId, adServerLoc, mode);

  /** 1----coin instructions**/

  /*** Instructions ***/
  // var preCalibInsText = [{
  //     stimulus: ["<div class = 'inst'>Welcome to the study!<br> \
  //     <p>Your participation will help us investigate human precision and reaction-times in dynamic environments.</p>\
  //     <p>Please read the instructions carefully.</p>\
  //     <p align='center'><i>Press the space bar to continue.</i></p></div>"],
  //     choices: [32]
  //   },
  //   {
  //     stimulus: ["<div class = 'inst'><p>We will begin by calibrating the experiment \
  //       for the size of your screen.</p>\
  //       <p>After this short calibration, we will continue to the main task for \
  //       this study.</p>\
  //       <p align='center'><i>Press the space bar to continue.</i></p></div>"],
  //     choices: [32]
  //   },
  //   {
  //     stimulus: ["<div class = 'inst'><p>For the calibration stage, you will need a coin.</p>\
  //       <p>Any US coin will do.</p>\
  //       <p align='center'><i>Press the space bar to continue.</i></p></div>"],
  //     choices: [32]
  //   },
  //   {
  //     stimulus: ["<div class = 'inst'><img src='/static/images/coin_demo.jpg' height='400'></img>\
  //       <p>You will be asked to position the coin\
  //       as shown in the picture. You will place it against your screen,\
  //       within an empty circle presented to you.</p>\
  //       <p align='center'><i>Press the space bar to continue.</i></p></div>"],
  //     choices: [32]
  //   },
  //   {
  //     stimulus: ["<div class = 'inst'><p>Using the up and down arrow keys, \
  //       you will then adjust the size of the empty circle, so that it matches the \
  //       size of your coin.</p>\
  //       <p align='center'><i>Press the space bar to continue.</i></p></div>"],
  //     choices: [32]
  //   },
  //   {
  //     stimulus: ["<div class = 'inst'><p>Take your time in doing so, as this measurement\
  //       will be used throughout the study to make sure images are presented to \
  //       you in their correct size.</p>\
  //       <p>When you are done adjusting the circle size, press the space bar to \
  //       continue to the main task.\
  //       <p align='center'><i>Press the space bar to continue.</i></p></div>"],
  //     choices: [32]
  //   },
  //   {
  //     stimulus: ["<div class = 'inst'><p>Please have a coin at hand.</p>\
  //       <p>Press the space bar to start the calibration stage.</p></div>"],
  //     choices: [32]
  //   }
  // ];
  //
  // var preCalibIns = {
  //   type: 'html-keyboard-response',
  //   timeline: preCalibInsText,
  //   timing_post_trial: 400
  // };

  /** 2-------- coin calibration**/

  /*** Screen calibration size ***/
  // Define global variables for this calibration
  // var coins = ['Penny', 'Nickel', 'Dime', 'Quarter'];
  // var sizes = [19.05, 21.209, 17.907, 24.257]; // Coin sizes in mm
  // var whichCoin = '';
  // var coinInd = NaN;
  //
  // // Define choose coin trial
  // var chooseCoin = {
  //   type: 'html-button-response',
  //   stimulus: 'Using the mouse, select the coin you would like to use:',
  //   choices: coins,
  //   button_html: ['<div class="coin"><input type="image" src="/static/images/Penny.png" width="100" name="penny"></input><label for="penny" class="coin_label">Penny</label></div>',
  //     '<div class="coin"><input type="image" src="/static/images/Nickel.png" width="111" name="nickel"></input><label for="nickel" class="coin_label">Nickel</label></div>',
  //     '<div class="coin"><input type="image" src="/static/images/Dime.png" width="94" name="dime"></input><label for="dime" class="coin_label">Dime</label></div>',
  //     '<div class="coin"><input type="image" src="/static/images/Quarter.png" width="127" name="quarter"></input><label for="quarter" class="coin_label">Quarter</label></div>'
  //   ],
  //   on_finish: function(data) {
  //     whichCoin = coins[data.button_pressed];
  //     coinInd = data.button_pressed;
  //   },
  //   timing_post_trial: 200
  // };
  //
  // // Define single iteration of coin size calibration
  // var calibrate_trial = {
  //   type: 'html-keyboard-response',
  //   prompt: ['<p>Place your coin within the empty circle, touching the bottom line.<br>\
  //   Adjust the circle size with the up and down arrow keys until it fits your coin.</p>\
  //   <p align="center"><i>Press the space bar when you are done.</i></p>\
  //   <p align="center"><i>Press the r key to change a coin type.</i></p>'],
  //   stimulus: function() {
  //     var coinSize = unitSize * sizes[coinInd];
  //     return x = '<svg style="block: inline" width="800" height="300">\
  //   <circle cx="200" cy="' + (250 - coinSize / 2) + '" r="' + coinSize / 2 +
  //       '" stroke="black" stroke-width="2" fill="grey" />\
  //   <line x1="0" y1="250" x2="1000" y2="250" style="stroke:black;stroke-width:2" />\
  //   <image x="' + (600 - coinSize / 2) + '" y="' + (250 - coinSize) + '" width="' + (coinSize) +
  //       '" height="' + (coinSize) + '" style:"block: inline" xlink:href="/static/images/' +
  //       whichCoin + '.png"></image>\
  //     <circle cx="600" cy="' + (250 - coinSize / 2) + '" r="' + coinSize / 2 +
  //       '" stroke="black" stroke-width="2" fill-opacity="0" />\
  // </svg>';
  //   },
  //   choices: [38, 40, 32, 82],
  //   timing_post_trial: 0
  // }
  //
  // // Define loop of coin size calibration
  // var adjustCoin = {
  //   timeline: [calibrate_trial],
  //   loop_function: function() {
  //     switch (jsPsych.data.get().last(1).select('key_press').values[0]) {
  //       case 38:
  //         // Normalize step size to size of the penny.
  //         unitSize += (.2 / (sizes[coinInd] / sizes[0]));
  //         return true;
  //         break;
  //       case 40:
  //         unitSize -= (.2 / (sizes[coinInd] / sizes[0]));
  //         return true;
  //         break;
  //       default:
  //         return false;
  //     }
  //   }
  // }
  //
  // var makeSure = {
  //   type: 'html-keyboard-response',
  //   prompt: ['<p style="line-height: 56px"><b>Are you sure the circle is as close as can be around your coin?</b></p>\
  //   <p align="center"><i>Press the space bar if you are sure.</i></p>\
  //   <p align="center"><i>Press the r key to start again.</i></p>'],
  //   stimulus: function() {
  //     var coinSize = unitSize * sizes[coinInd];
  //     return x = '<svg style="block: inline" width="800" height="300">\
  //   <circle cx="200" cy="' + (250 - coinSize / 2) + '" r="' + coinSize / 2 +
  //       '" stroke="red" stroke-width="2" fill="grey" />\
  //   <line x1="0" y1="250" x2="1000" y2="250" style="stroke:red;stroke-width:2" />\
  //   <image x="' + (600 - coinSize / 2) + '" y="' + (250 - coinSize) + '" width="' + (coinSize) +
  //       '" height="' + (coinSize) + '" style:"block: inline" xlink:href="/static/images/' +
  //       whichCoin + '.png"></image>\
  //     <circle cx="600" cy="' + (250 - coinSize / 2) + '" r="' + coinSize / 2 +
  //       '" stroke="red" stroke-width="2" fill-opacity="0" />\
  // </svg>';
  //   },
  //   choices: [32, 82],
  //   timing_post_trial: 200
  // }
  //
  // // Nest in another loop to allow returning and changing coin
  // var initialSizeCalib = {
  //   timeline: [chooseCoin, adjustCoin],
  //   loop_function: function() {
  //     switch (jsPsych.data.get().last(1).select('key_press').values[0]) {
  //       case 82:
  //         return true;
  //         break;
  //       default:
  //         return false;
  //     }
  //   }
  // };
  //
  // var makeSureLoop = {
  //   timeline: [initialSizeCalib, makeSure],
  //   loop_function: function() {
  //     switch (jsPsych.data.get().last(1).select('key_press').values[0]) {
  //       case 82:
  //         return true;
  //         break;
  //       default:
  //         return false;
  //     }
  //   }
  // };

  // Make main block
  var breakMsg = {
    type: "html-keyboard-response",
    stimulus: function() {
      var acc = Math.round(jsPsych.data.get().filter({
        category: 'task'
      }).last(breakEvery).filterCustom(function(x) {
        return x.clar_level >= clar_levels[clar_nsteps - n_repeat_steps]
      }).select('acc').mean() * 100);
      var rt = Math.round(jsPsych.data.get().filter({
        category: 'task'
      }).last(breakEvery).select('rt').mean());
      return ["<div class = 'inst'><p>This is a break.</p>\
      <p>During this part, your answered correctly on " + acc + "% of images, \
      taking an average " + rt + " milliseconds to answer.</p><br><br>\
    <p>Press the space bar to continue.</p>"]
    },
    choices: [32],
    post_trial_gap: 1600
  };

  var fixation_trial = {
    type: 'html-keyboard-response',
    stimulus: '<div id="fixation">+</div>',
    choices: jsPsych.NO_KEYS,
    trial_duration: 500,
    data: {
      category: 'fixation'
    }
  };

  main_block = {
    timeline: [fixation_trial,
      {
        type: 'html-keyboard-response',
        choices: ['d', 'k'],
        post_trial_gap: 400,
        stimulus: function() {
          var name = jsPsych.timelineVariable('name', true),
            cl = jsPsych.timelineVariable('clar_level', true);
          return '<img class = "stimulus_img" src="/static/images/' +
            name + '" width = "517" height = "388"></img>\
            <img class = "mask_img" src="/static/images/' +
            name.substr(0, name.length - 4) +
            '_s.jpg" style="opacity: ' +
            (1 - cl) + '" width = "517" height = "388"></img>'
        },
        data: {
          memorability: jsPsych.timelineVariable('Memorability'),
          // logitM: jsPsych.timelineVariable('logitM'), // Redundant
          name: jsPsych.timelineVariable('name'),
          is_rep: jsPsych.timelineVariable('is_rep'),
          clar_level: jsPsych.timelineVariable('clar_level'),
          animate: jsPsych.timelineVariable('animate'),
          // img_indx: jsPsych.timelineVariable('img_indx'), // Redundant
          prev_indx: function() {
            return jsPsych.timelineVariable('prev_indx', true) + 1
          },
          trial: jsPsych.timelineVariable('trial'),
          category: 'task'
        },
        on_finish: function(data) {
          if (data.key_press == 75 && data.animate ||
            data.key_press == 68 && !data.animate) {
            data.acc = 1;
          } else {
            data.acc = 0;
          }
        }
      },
      {
        type: 'html-keyboard-response',
        timeline: [breakMsg],
        conditional_function: function() {
          return !(jsPsych.data.get().last(1).select('trial').values % breakEvery) &&
            jsPsych.data.get().last(1).select('trial').values != n_total;
        }
      },
      {
        timeline: [{
          type: 'html-keyboard-response',
          stimulus: "<div class = 'inst'><p>It seems that you have pressed the wrong \
        key many times recently.</p>\
        <p>Please perform the task as accurately and as quickly as you can.</p>\
        <p>Press the space bar to continue.</p>",
          choices: [32]
        }],
        conditional_function: function() {
          if (jsPsych.data.get().last(1).select('animate').values.length) {
            var trialN = jsPsych.currentTrial().data.trial, // N of trials so far
              experiment_performance_cl = clar_levels[clar_nsteps - n_repeat_steps], // high clar thresh
              acc_trialN = jsPsych.data.get().filterCustom(function(x) {
                return x.trial != undefined &
                  x.clar_level >= experiment_performance_cl
              }).count(); // N of high_clar trials so far

            if (trialN > lastWarned + experiment_performance_trials && // unwarned
              ((acc_trialN >= experiment_performance_trials && // enough acc trials
                  jsPsych.data.get().filterCustom(function(x) {
                    return x.trial != undefined &
                      x.clar_level >= experiment_performance_cl
                  }).last(experiment_performance_trials).select('acc').mean() <
                  experiment_performance_thresh) || //peroformance bad
                (trialN >= experiment_RT_trials && // sufficient rt data
                  jsPsych.data.get().filterCustom(function(x) {
                    return x.trial != undefined
                  }).last(experiment_RT_trials).filterCustom(function(x) {
                    return x.rt < experiment_RT_threshold
                  }).count() >= experiment_RT_trial_threshold) // rt quick
              )) {
              lastWarned = jsPsych.currentTrial().data.trial;
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        }
      }
    ],
    timeline_variables: trial_plan
  };
  // var lastWarned = -experiment_performance_trials; //It's up for debugging

  var pre_first_train_text = [{
      stimulus: ["<div class = 'inst'>Welcome to the study!<br> \
      <p>Your participation will help us investigate human precision and reaction-times in dynamic environments.</p>\
      <p>Please read the instructions carefully.</p>\
      <br> <br>\
      <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>In the first part of this study, \
      you will be presented with images depciting different objects and scenes.\
       Your task will be to respond to each picture according to whether it \
       depicts an animate being, or only inanimate objects.</p>\
       <br> <br>\
      <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>If the picture depcits an animate being \
      such as a person or an animal, press the right key. If the picture depcits \
      only inanimate objects, press the left key.</p>\
      <br> <br>\
      <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p><b><u>Example 1:</b></u> if presented with the image \
      below, you should press the right key, because the image depcits animate objects.</p>\
      <img src='/static/images/ex1.jpg'></img>\
      <br> <br>\
      <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p><b><u>Example 2:</b></u> if presented with the image \
      below, you should press the left key, because the image depcits \
      only inanimate objects.</p>\
      <img src='/static/images/ex2.jpg'></img>\
      <br> <br>\
      <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>Please perform this task as accurately \
          and quickly as you can.</p>\
          <br> <br>\
          <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>You will now start with a short practice\
       block.</p>\
       <br> <br>\
          <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'>\
          <img src='/static/images/keys.jpg'></img>\
          <p>Place your fingers on the 'D' and 'K' keys as shown in the picture, \
          and press either one of these keys to begin the practice.</p></div>"],
      choices: [68, 75]
    }
  ];

  var pre_first_train = {
    type: 'html-keyboard-response',
    post_trial_gap: 300,
    timeline: pre_first_train_text
  };

  var train_1 = {
    timeline: [
      fixation_trial,
      {
        type: 'html-keyboard-response',
        choices: ['d', 'k'],
        trial_duration: train_1_rt_crit,
        stimulus: function() {
          var name = jsPsych.timelineVariable('name', true);
          return '<img src="/static/images/' +
            name + '" width = "517" height = "388"></img>'
        },
        data: {
          name: jsPsych.timelineVariable('name'),
          animate: jsPsych.timelineVariable('animate'),
          category: 'task'
        },
        on_finish: function(data) {
          if (data.key_press == 75 && data.animate ||
            data.key_press == 68 && !data.animate) {
            data.acc = 1;
          } else {
            data.acc = 0;
          }
        }
      },
      {
        timeline: [{
          type: 'html-keyboard-response',
          stimulus: "<p class='feedback'>Too slow!</p>",
          choices: jsPsych.NO_KEYS,
          trial_duration: 1000,
          post_trial_gap: 500,
          data: {
            category: 'feedback'
          }
        }],
        conditional_function: function() {
          return jsPsych.data.get().last(1).values()[0].key_press == null
        }
      },
      {
        timeline: [{
          type: 'html-keyboard-response',
          stimulus: function() {
            var acc = jsPsych.data.get().last(1).values()[0].acc;
            if (acc) {
              return '<p class="feedback">Correct</p>'
            } else {
              return '<p class="feedback">Incorrect</p>'
            }
          },
          post_trial_gap: 400,
          trial_duration: 1000,
          choices: jsPsych.NO_KEYS,
          data: {
            category: 'feedback'
          }
        }],
        conditional_function: function() {
          return !(jsPsych.data.get().last(1).values()[0].key_press == null)
        }
      }
    ],
    timeline_variables: jsPsych.randomization.shuffle(train_images.slice(0, train_1_n))
  }

  var performanceMSG_practice = {
      timeline: [{
        type: 'html-keyboard-response',
        stimulus: ["<div class = 'inst'>\
    <p>You pressed the wrong key too many times during the practice block.</p>\
    <p>Press either the 'D' or 'K' keys to repeat it.</p></div>"],
        choices: [68, 75]
      }],
      conditional_function: function() {
        return jsPsych.data.get().last(1).select('category').values.length
      }
    },
    stop_practice_loop = {
      type: 'html-keyboard-response',
      conditional_function: function() {
        if (jsPsych.data.get().last(1).select('train_repeats').values[0] > training_allowed_repeat) {
          return true;
        } else {
          return false;
        }
      },
      timeline: [{
        stimulus: "<div class = 'inst'>\
    <p>It seems that you are not performing the task as instructed.</p>\
    <p>Please return this HIT.</p>\
    <p>If you feel that this is a mistake, please email \
    ya2402+mturk@columbia.edu</p>\
    <p>Press the space bar to continue.</p></div>"
      }],
      choices: [32],
      on_finish: function() {
        psiturk.recordUnstructuredData('jsPsych_trial_data',
          jsPsych.data.get().json());
        psiturk.recordUnstructuredData('jsPsych_event_data',
          jsPsych.data.getInteractionData().json());
        psiturk.saveData({
          success: function() {
            jsPsych.endExperiment('The experiment has been aborted. Please return HIT.');
          }
        });
      }
    }

  jsPsych.data.addProperties({
    train_repeats: 1
  });

  var secChanceLoop = {
    timeline: [performanceMSG_practice, train_1, stop_practice_loop],
    loop_function: function() {
      if (jsPsych.data.get().filter({
          category: 'task'
        }).last(train_1_n).select('acc').mean() < train_1_n_performance_thresh) {
        jsPsych.data.addProperties({
          train_repeats: jsPsych.data.get().last(1).select('train_repeats').values[0] + 1
        });
        return true
      } else {
        return false
      }
    }
  };

  var pre_second_train_text = [{
      stimulus: ["<div class = 'inst'><p>You have completed the first \
      practice block</p>\
      <br> <br>\
          <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>In the next part, some of the images \
    are going to appear scrambled.</p>\
    <p>Your task remains exactly the same. Respond to each image according to \
    whether it depicts an animate object, or only inanimate objects.</p>\
    <p>If the image appears too scrambled, do your best to guess whether it \
    depicts an animate object or not.</p>\
    <br> <br>\
        <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>While your task remains the same \
      as before, during this part you will not recieve feedback on your responses.</p>\
      <br> <br>\
        <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>Please perform this task as accurately \
        and quickly as you can.</p>\
        <br> <br>\
        <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>You will now proceeed with a short practice\
     block.</p>\
     <br> <br>\
        <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'>\
        <img src='/static/images/keys.jpg'></img>\
        <p>Place your fingers on the 'D' and 'K' keys as shown in the picture, \
        and press either one of these keys to begin the practice.</p></div>"],
      choices: [68, 75]
    }
  ];

  var pre_second_train = {
    type: 'html-keyboard-response',
    post_trial_gap: 300,
    timeline: pre_second_train_text
  };

  // Set of unique clar levels for training
  var clar_levels_train = [];
  for (i = 0; i != clar_nsteps_train; i++) {
    clar_levels_train.push(clar_range[0] + i *
      (clar_range[1] - clar_range[0]) / (clar_nsteps_train - 1))
  }

  // Assign clar_level per image
  for (i = train_1_n; i != train_1_n + train_2_n; i++) {
    if (i % clar_nsteps_train == 0) {
      clar_levels_train = jsPsych.randomization.shuffle(clar_levels_train);
    }
    train_images[i].clar_level = clar_levels_train[i % clar_nsteps_train];
  }

  // Define train 2 block
  var train_2 = {
    timeline: [
      fixation_trial,
      {
        type: 'html-keyboard-response',
        choices: ['d', 'k'],
        trial_duration: train_1_rt_crit,
        stimulus: function() {
          var name = jsPsych.timelineVariable('name', true),
            cl = jsPsych.timelineVariable('clar_level', true);
          return '<img class = "stimulus_img" src="/static/images/' +
            name + '" width = "517" height = "388"></img>\
            <img class = "mask_img" src="/static/images/' +
            name.substr(0, name.length - 4) +
            '_s.jpg" style="opacity: ' +
            (1 - cl) + '" width = "517" height = "388"></img>'
        },
        data: {
          name: jsPsych.timelineVariable('name'),
          animate: jsPsych.timelineVariable('animate'),
          clar_level: jsPsych.timelineVariable('clar_level'),
          category: 'task'
        },
        on_finish: function(data) {
          if (data.key_press == 75 && data.animate ||
            data.key_press == 68 && !data.animate) {
            data.acc = 1;
          } else {
            data.acc = 0;
          }
        }
      },
      {
        timeline: [{
          type: 'html-keyboard-response',
          stimulus: "<p class='feedback'>Too slow!</p>",
          choices: jsPsych.NO_KEYS,
          trial_duration: 1000,
          post_trial_gap: 500,
          data: {
            category: 'feedback'
          }
        }],
        conditional_function: function() {
          return jsPsych.data.get().last(1).values()[0].key_press == null
        }
      }
    ],
    timeline_variables: jsPsych.randomization.shuffle(train_images.slice(train_1_n))
  }

  var pre_main_block_text = [{
      stimulus: ["<div class = 'inst'><p>You have completed the second \
      practice block</p>\
      <br> <br>\
          <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'><p>You will now continue with the \
      same task.</p>\
      <p>You will have nine short breaks during this part.</p>\
      <br> <br>\
        <p align='center'><i>Press the space bar to continue.</i></p></div>"],
      choices: [32]
    },
    {
      stimulus: ["<div class = 'inst'>\
          <img src='/static/images/keys.jpg'></img>\
          <p>Place your fingers on the 'D' and 'K' keys as shown in the picture, \
          and press either one of these keys to begin.</p></div>"],
      choices: [68, 75]
    }
  ];

  var pre_main_block = {
    type: 'html-keyboard-response',
    post_trial_gap: 300,
    timeline: pre_main_block_text
  };


  //** 7---------Debrief **//

  var debrief = [{
      type: "html-keyboard-response",
      stimulus: "<div class = 'inst'>You have completed this part of the study.\
      <p>You will now answer several questions. Please answer them sincerely, \
      we remind you that your answers are completely annonymous.</p>\
      <p align='center'><i>Press the space bar to continue.</i></p></div>",
      choices: [32]
    },
    {
      type: "survey-text",
      questions: [{
          prompt: "How old are you?",
          columns: 20,
          rows: 1,
          value: ''
        },
        {
          prompt: 'Have you been diagnosed with, or believe you have an attention deficit disorder?',
          columns: 60,
          rows: 1,
          value: ''
        }
      ],
      on_load: function() {
        // Return mouse
        var stylesheet = document.styleSheets[0];
        stylesheet.deleteRule(stylesheet.cssRules.length - 1);
      }
    }, {
      type: "survey-multi-choice",
      questions: [{
          prompt: "What is your gender?",
          options: ["Male", "Female", "Other"],
          required: true
        },
        {
          prompt: "What is your dominant hand?",
          options: ["Right", "Left", "Both"],
          required: true
        },
        {
          prompt: "Is English your native language?",
          options: ["Yes", "No"],
          required: true
        }
      ]
    },
    {
      type: 'survey-likert',
      questions: [{
        prompt: "How fluent are you in reading and understanding English?",
        labels: ["1<br>Not at all", "2", "3", "4", "5<br>Very fluent"],
        required: true
      }]
    },
    {
      type: 'survey-text',
      questions: [{
        prompt: "Did you have any special strategy that helped you decide \
      whether the images depicted animate objects?",
        columns: 100,
        rows: 4,
        value: ''
      }],
    },
    {
      type: "html-keyboard-response",
      stimulus: '<div class="inst">Thank you for participating in this study!<p>\
      In this study we were interested in examining reaction-times and \
      precision in a dynamic environment.</p>\
      <p>Once you press the space bar, your results will be uploaded to the \
      server, and the HIT will complete. <b>This may take several minutes - do not \
      refresh or close your browser during this time.</b></p>\
      <p>Press the space bar to complete this HIT.</p></div>',
      choices: [32]
    }
  ];


  // Put it all together
  var experiment_blocks = [];
  // experiment_blocks.push(fullscreen);
  // experiment_blocks.push(pre_first_train);
  // experiment_blocks.push(secChanceLoop);
  // experiment_blocks.push(pre_second_train);
  // experiment_blocks.push(train_2);
  experiment_blocks.push(pre_main_block);
  experiment_blocks.push(main_block);
  experiment_blocks = experiment_blocks.concat(debrief);

  // Save data to file functions
  var textFile = null,
    makeTextFile = function(text) {
      var data = new Blob([text], {
        type: 'text/plain'
      });

      // If we are replacing a previously generated file we need to
      // manually revoke the object URL to avoid memory leaks.
      if (textFile !== null) {
        window.URL.revokeObjectURL(textFile);
      }

      textFile = window.URL.createObjectURL(data);

      // returns a URL you can use as a href
      return textFile;
    };

  var saveData = function(data, filename) {
    var link = document.createElement('a');
    link.setAttribute('download', filename);
    link.href = makeTextFile(data);
    document.body.appendChild(link);

    // wait for the link to be added to the document
    window.requestAnimationFrame(function() {
      var event = new MouseEvent('click');
      link.dispatchEvent(event);
      document.body.removeChild(link);
    });
  }


  // Initiate experiment
  var exp_start_time = 0;
  var d = new Date();
  jsPsych.init({
    timeline: experiment_blocks,
    on_finish: function(data) {
      psiturk.recordUnstructuredData('jsPsych_trial_data',
        jsPsych.data.get().json());
      psiturk.recordUnstructuredData('jsPsych_event_data',
        jsPsych.data.getInteractionData().json());
      psiturk.saveData({
        success: function() {
          psiturk.completeHIT();
        }
      })
    },
    on_data_update: function(data) {
      psiturk.recordTrialData(data);
    },
    preload_images: images
  });
}

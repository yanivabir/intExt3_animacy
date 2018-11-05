// Parameters
var ITI = 1000,
  unitSize = 4,
  breakEvery = 152,
  clar_range = [0.2, 0.8],
  clar_nsteps = 10,
  n_rep = 2,
  n_new = 1, // sum to Ntotal
  n_repeat_steps = 3,
  n_quant_mem = 40,
  rep_range = [30, 80],
  training_allowed_repeat = 2,
  experiment_performance_thresh = .85,
  experiment_performance_trials = 20,
  train_performance_thresh = .85,
  experiment_RT_trials = 8,
  experiment_RT_trial_threshold = 5,
  experiment_RT_threshold = 300;

var exp_images;
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
    post_load();
  }
});

var post_load = function() {

  /* Preload images */
  var images = ['/static/images/Nickel.png',
    '/static/images/Penny.png',
    '/static/images/Dime.png',
    '/static/images/Quarter.png',
    '/static/images/keys.jpg',
    '/static/images/coin_demo.jpg'
  ];

  var n_total;
  n_total = exp_images.length;

  for (i = 0; i != n_total; i++) {
    var this_img = exp_images[i].name;
    images.push('/static/images/' + this_img);
    images.push('/static/images/' +
      this_img.substr(0, this_img.length - 4) + '_s.jpg');
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
    and start the HIT, press the button below.</p>'
  }


  // Initiate psiturk
  // var psiturk = new PsiTurk(uniqueId, adServerLoc, mode);

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
    stimulus: ["<div class = 'inst'><p>This is a break.</p>\
    <p>Press the space bar to continue.</p>"],
    choices: [32],
    post_trial_gap: 1600
  }

  main_block = {
    timeline: [{
        type: 'html-keyboard-response',
        stimulus: '<div id="fixation">+</div>',
        choices: jsPsych.NO_KEYS,
        trial_duration: 500
      },
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
          trial: jsPsych.timelineVariable('trial')
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
      below, you should press the right key, because the image depcits an animate object.</p>\
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
      as before, during this part you will no recieve feedback on your responses.</p>\
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



  // /** 4----- PRACTICE BLOCK  **/
  //
  // /*** bRMS practice block ***/
  // //Define stimuli pool for experiment
  // var all_images = [];
  // for (i = 0; i < total_num_faces; i++) { //creating an array of all possible images names    *yuval
  //   all_images.push('../static/images/f42887_e_' + ('000' + i).substr(-3, 3) + '.jpg');
  // }
  // all_images = jsPsych.randomization.shuffle(all_images); //after shuffling, the chosen images will be taken from this 'all_images' array. *yuval
  //
  //
  //
  // // Define stimuli for practice
  // var pre_practice_stimuli = all_images;
  // pre_practice_stimuli = pre_practice_stimuli.slice(0, train_repetitions); //take first images for practice (not sure if 'pre' array neccesary but works well)  *yuval
  // var practice_stimuli = [];
  //
  // for (j = 0; j < 2; j++) {
  //   for (i = 0; i < train_repetitions; i++) {
  //     practice_stimuli.push({
  //       stimulus: pre_practice_stimuli[i],
  //       data: {
  //         stimulus: pre_practice_stimuli[i],
  //         stimulus_type: 'normal',
  //         timing_response: trialLength,
  //         fade_out_time: fade_out_time,
  //         fade_in_time: fade_in_time,
  //         fade_out_length: fade_out_length,
  //         stimulus_alpha: stimAlphas[j]
  //       },
  //       timing_response: trialLength,
  //       fade_out_time: fade_out_time,
  //       fade_in_time: fade_in_time,
  //       fade_out_length: fade_out_length,
  //       stimulus_alpha: stimAlphas[j]
  //     });
  //   }
  // }
  //
  // practice_stimuli = jsPsych.randomization.shuffle(practice_stimuli);
  //
  // all_images = all_images.slice(train_repetitions, train_repetitions + exp_num_faces); //getting rid of images used in practice
  //
  //
  // /* define block */
  // var bRMS_practice = {
  //   type: "bRMS",
  //   timeline: practice_stimuli,
  //   timing_post_trial: 100,
  //   visUnit: function() {
  //     return unitSize
  //   },
  //   within_ITI: ITI - 100
  // };
  //
  // var performanceMSG_practice = {
  //     type: 'html-keyboard-response',
  //     stimulus: ["<div class = 'inst'>\
  //   <p>You pressed the wrong key too many times during the practice block.</p>\
  //   <p>Press either the 'D' or 'K' keys to repeat it.</p></div>"],
  //     choices: [68, 75],
  //     on_start: function(trial) {
  //       if (jsPsych.data.get().last(1).select('trial_type').values != 'bRMS') {
  //         trial.stimulus = '';
  //         trial.choices = jsPsych.NO_KEYS;
  //         trial.trial_duration = 0;
  //       }
  //     }
  //   },
  //   stop_practice_loop = {
  //     type: 'html-keyboard-response',
  //     conditional_function: function() {
  //       if (jsPsych.data.get().last(1).select('train_repeats').values[0] > training_allowed_repeat) {
  //         return true;
  //       } else {
  //         return false;
  //       }
  //     },
  //     timeline: [{
  //       stimulus: "<div class = 'inst'>\
  //   <p>It seems that you are not performing the task as instructed.</p>\
  //   <p>Please return this HIT.</p>\
  //   <p>If you feel that this is a mistake, please email \
  //   yaniv.abir+mturk@mail.huji.ac.il</p>\
  //   <p>Press the space bar to continue.</p></div>"
  //     }],
  //     choices: [32],
  //
  //     //** needed eventualy **//
  //     on_finish: function() {
  //       psiturk.saveData({
  //         success: function() {
  //           jsPsych.endExperiment('The experiment has been aborted. Please return HIT.');
  //         }
  //       });
  //     },
  //   }
  //
  //
  //
  // jsPsych.data.addProperties({
  //   train_repeats: 1
  // });
  //
  // var secChanceLoop = {
  //   timeline: [performanceMSG_practice, bRMS_practice, stop_practice_loop],
  //   loop_function: function() {
  //     if (jsPsych.data.get().last(train_repetitions).select('acc').mean() < train_performance_thresh) {
  //       jsPsych.data.addProperties({
  //         train_repeats: jsPsych.data.get().last(1).select('train_repeats').values[0] + 1
  //       });
  //       return true
  //     } else {
  //       return false
  //     }
  //   }
  // };
  //
  //
  // //** 5------main block instructions **//
  //
  // var mainBlockText = [{
  //     stimulus: ["<div class = 'inst'><p>You have completed the practice block.</p>\
  //   <p>You will now continue with the same task. The task may now be more \
  //   difficult.\
  //   You will have 7 short breaks. </p>\
  //     <p>Press either the 'D' or the 'K' keys to continue.</p></div>"],
  //     choices: [68, 75]
  //   },
  //   {
  //     stimulus: ["<div class = 'inst'><p>During the task, please focus your gaze at\
  //    the plus sign in the middle.<br>Even though the faces appear to the left\
  //     and right of the plus sign, it is important that you look at the plus \
  //     sign at all times.</p>\
  //     <p>Press either the 'D' or the 'K' keys to continue.</p></div>"],
  //     choices: [68, 75]
  //   }
  // ]
  //
  // var mainBlockIns = {
  //   type: 'html-keyboard-response',
  //   timeline: mainBlockText,
  //   timing_post_trial: 200
  // }
  //
  // //** 6------------brms main block**//
  //
  // // Define stimuli for bRMS
  //
  //
  // var used_images = all_images.slice(0, exp_num_faces); //creating 'used_images[]', holding all and only faces going to be used in the main block. *yuval
  // var stimuli = [];
  //
  //
  // for (i = 0; i < repetitions; i++) { // Create a list of trials, repeating the experiment block x amount of times. *yaniv
  //   var this_rep = [];
  //   for (j = 0; j < 2; j++) {
  //     for (ii = 0; ii <= exp_num_faces - 1; ii++) {
  //       this_rep.push({
  //         type: "bRMS",
  //         stimulus: used_images[ii],
  //         data: {
  //           stimulus: used_images[ii],
  //           timing_response: trialLength,
  //           stimulus_alpha: stimAlphas[j],
  //           timing_post_trial: 100,
  //           within_ITI: ITI - 100,
  //           fade_in_time: fade_in_time,
  //           fade_out_time: fade_out_time,
  //           fade_out_length: fade_out_length,
  //         },
  //         stimulus_alpha: stimAlphas[j],
  //         timing_post_trial: 100,
  //         within_ITI: ITI - 100,
  //         timing_response: trialLength,
  //         fade_in_time: fade_in_time,
  //         fade_out_time: fade_out_time,
  //         fade_out_length: fade_out_length
  //       });
  //     }
  //   }
  //   stimuli = stimuli.concat(jsPsych.randomization.shuffle(this_rep));
  // }
  //
  // for (i = 0; i < stimuli.length; i++) {
  //   stimuli[i]['data']['trial'] = i + 1;
  // }
  // /* Add breaks */
  // var breakMsg = {
  //   type: "html-keyboard-response",
  //   stimulus: ["<div class = 'inst'><p>This is a break.</p>\
  //   <p>Press the space bar to continue.</p>"],
  //   choices: [32],
  //   timing_post_trial: 1600
  // }
  //
  // /* Make sure participants are behaving */
  // var behave = {
  //     type: "html-keyboard-response",
  //     timeline: [{
  //       stimulus: "<div class = 'inst'><p>It seems that you have pressed the wrong \
  //   key many times recently.</p>\
  //   <p>Please perform the task as accurately and as quickly as you can.</p>\
  //   <p>Press the space bar to continue.</p>"
  //     }],
  //     choices: [32],
  //     conditional_function: function() {
  //       var trialType = jsPsych.currentTrial().type,
  //         trialN = jsPsych.data.get().filter({
  //           trial_type: "bRMS"
  //         }).count();
  //
  //       if (trialType == 'bRMS' && // This isn't a break
  //         jsPsych.currentTrial().data.trial > lastWarned + experiment_performance_trials && // unwarned
  //         ((trialN >= experiment_performance_trials && // sufficient acc data
  //             jsPsych.data.get().filter({
  //               trial_type: "bRMS"
  //             }).last(experiment_performance_trials).select('acc').mean() < experiment_performance_thresh) || // performance bad
  //           (trialN >= experiment_RT_trials && // sufficient rt data
  //             jsPsych.data.get().filter({
  //               trial_type: "bRMS"
  //             }).last(experiment_RT_trials).filterCustom(function(x) {
  //               return x.rt < experiment_RT_threshold
  //             }).count() >= experiment_RT_trial_threshold))) { // enough fast trials
  //         lastWarned = jsPsych.currentTrial().data.trial;
  //         //console.log("condition is true");
  //         return true;
  //       } else {
  //         //console.log("condition is false");
  //         return false;
  //       }
  //     }
  //   },
  //   lastWarned = -experiment_performance_trials;
  //
  // for (ii = breakEvery; ii < stimuli.length; ii += (breakEvery + 1)) {
  //   stimuli.splice(ii, 0, breakMsg);
  // };
  //
  //
  // for (ii = 1; ii < (stimuli.length - 1); ii += 2) {
  //   stimuli.splice(ii, 0, behave);
  // }
  //
  //
  // /* define block */
  // var bRMS_block = {
  //   timeline: stimuli,
  //   visUnit: function() {
  //     return unitSize
  //   },
  //   on_finish: function() {
  //     var d = new Date();
  //     if ((d.getTime() - exp_start_time) > time_limit) {
  //       jsPsych.endCurrentTimeline();
  //     }
  //   }
  // };
  //
  //
  // //** Animation test ** //
  // var test_animation = {
  //     type: 'bRMS-test',
  //     timeline: [{
  //         stimulus: all_images[1],
  //         prompt: "<p>Testing for the \
  //       compatibility of your personal computer with this HIT.</p> \
  //       <p>This will take approximately 15 seconds more.</p>"
  //       },
  //       {
  //         stimulus: all_images[2],
  //         prompt: "<p>Testing for the \
  //       compatibility of your personal computer with this HIT.</p> \
  //       <p>This will take approximately 10 seconds more.</p>"
  //       },
  //       {
  //         stimulus: all_images[3],
  //         prompt: "<p>Testing for the \
  //       compatibility of your personal computer with this HIT.</p> \
  //       <p>This will take approximately 5 seconds more.</p>"
  //       }
  //     ],
  //     data: {
  //       timing_response: 4,
  //       stimulus_alpha: stimAlphas,
  //       timing_post_trial: 100,
  //       within_ITI: ITI - 100,
  //       fade_in_time: fade_in_time,
  //       fade_out_time: fade_out_time,
  //       fade_out_length: fade_out_length
  //     },
  //     stimulus_alpha: stimAlphas,
  //     timing_post_trial: 100,
  //     within_ITI: ITI - 100,
  //     timing_response: 4,
  //     fade_in_time: fade_in_time,
  //     fade_out_time: fade_out_time,
  //     fade_out_length: fade_out_length,
  //     visUnit: 4,
  //     choices: ["none"]
  //   },
  //   poor_animation = {
  //     type: 'html-keyboard-response',
  //     conditional_function: function() {
  //       if (jsPsych.data.get().last(3).select('sProblem').sum() > sProblemCrit ||
  //         jsPsych.data.get().last(3).select('bProblem').sum() > bProblemCrit) {
  //         return true;
  //       } else {
  //         return false;
  //       }
  //     },
  //     timeline: [{
  //       stimulus: "<div class = 'inst'>\
  // <p>It seems that the animation is not presented correctly on your computer.</p>\
  // <p>This may be due to old hardware, or too many open applications.</p>\
  // <p><b>Please return this HIT</b>.</p>\
  // <p>We'll be glad to see you participating in future HITs.</p>\
  // <p>For any questions, please email \
  // yaniv.abir+mturk@mail.huji.ac.il</p>\
  // <p>Press the space bar to continue.</p></div>"
  //     }],
  //     choices: [32],
  //     //** needed eventualy **//
  //     on_finish: function() {
  //       psiturk.saveData({
  //         success: function() {
  //           jsPsych.endExperiment('The experiment has been aborted. <b>Please return HIT.</b>');
  //         }
  //       });
  //     }
  //   }
  //
  //
  // //** 7---------Debrief **//
  //
  // var debrief = [{
  //     type: "html-keyboard-response",
  //     stimulus: "<div class = 'inst'>You have completed this part of the study.\
  //     <p>You will now answer several questions. Please answer them sincerely, \
  //     we remind you that your answers are completely annonymous.</p>\
  //     <p align='center'><i>Press the space bar to continue.</i></p></div>",
  //     choices: [32]
  //   },
  //   {
  //     type: "survey-text",
  //     questions: [{
  //         prompt: "How old are you?",
  //         columns: 20,
  //         rows: 1,
  //         value: ''
  //       },
  //       {
  //         prompt: 'Have you been diagnosed with, or believe you have an attention deficit disorder?',
  //         columns: 60,
  //         rows: 1,
  //         value: ''
  //       }
  //     ]
  //   }, {
  //     type: "survey-multi-choice",
  //     questions: [{
  //         prompt: "What is your gender?",
  //         options: ["Male", "Female", "Other"],
  //         required: true
  //       },
  //       {
  //         prompt: "What is your dominant hand?",
  //         options: ["Right", "Left", "Both"],
  //         required: true
  //       },
  //       {
  //         prompt: "Is English your native language?",
  //         options: ["Yes", "No"],
  //         required: true
  //       }
  //     ]
  //   },
  //   {
  //     type: 'survey-likert',
  //     questions: [{
  //       prompt: "How fluent are you in reading and understanding English?",
  //       labels: ["1<br>Not at all", "2", "3", "4", "5<br>Very fluent"],
  //       required: true
  //     }]
  //   },
  //   {
  //     type: 'survey-text',
  //     questions: [{
  //       prompt: "Did you have any special strategy that helped you seeing \
  //     the faces more quickly?",
  //       columns: 100,
  //       rows: 4,
  //       value: ''
  //     }],
  //   },
  //   {
  //     type: 'survey-multi-choice',
  //     questions: [{
  //         prompt: "Do you consider yourself to be:",
  //         options: ["Heterosexual or straight", "Gay or lesbian", "Bisexual", "Other"],
  //         required: false
  //       },
  //       {
  //         prompt: "People are different in their sexual attraction to other people.\
  //   Which best describes your feelings?",
  //         options: ["Only attracted to females", "Mostly attracted to females",
  //           "Equally attracted to females and males", "Mostly attracted to males", "Only attracted to males", "Not sure"
  //         ],
  //         required: false
  //       }
  //     ]
  //   }
  // ].concat([{
  //     type: "survey-multi-choice",
  //     questions: [{
  //       prompt: "Do you have a driver’s license?",
  //       options: ["Yes", "No"],
  //       required: true
  //     }]
  //   },
  //   {
  //     conditional_function: function() {
  //       if (JSON.parse(jsPsych.data.get().last(1).select('responses').values).Q0 == 'Yes') {
  //         return true;
  //       } else {
  //         return false;
  //       }
  //     },
  //     timeline: [{
  //         type: 'survey-likert',
  //         questions: [{
  //           prompt: "Compared to the average driver, how would you rate your own driving?", //*reverse scored
  //           labels: ["1<br>Much worse than average", "2", "3", "4", "5", "6", "7<br>Much better than average"],
  //           required: true
  //         }]
  //       },
  //       {
  //         type: "survey-text",
  //         questions: [{
  //           prompt: "In your best estimate, how many accidents were you involved in during the last three years as a driver, including minor accidents with no injuries or damage? (If none, mark 0)",
  //           columns: 20,
  //           rows: 1,
  //           value: ''
  //         }],
  //       }
  //     ],
  //   },
  //   {
  //     type: "survey-text",
  //     questions: [{
  //       prompt: 'In your best estimate, how many accidents were you involved in during the last three years as a pedestrian,\
  // 		including minor accidents with no injuries or damage? (If none, mark 0)',
  //       columns: 60,
  //       rows: 1,
  //       value: ''
  //     }]
  //   },
  //   {
  //     type: "html-keyboard-response",
  //     stimulus: '<div class="center">Thank you for participating in this study!<p>\
  //     In this study we were interested in examining reaction-times and \
  //     precision in a dynamic environment.</p>\
  //     <p>Once you press the space bar, your results will be uploaded to the \
  //     server, and the HIT will complete. <b>This may take several minutes - do not \
  //     refresh or close your browser during this time.</b></p>\
  //     <p>Press the space bar to complete this HIT.</p></div>',
  //     choices: [32]
  //   }
  // ]);
  //
  //
  // Put it all together
  var experiment_blocks = [];
  // experiment_blocks.push(fullscreen);
  experiment_blocks.push(pre_first_train);
  experiment_blocks.push(pre_second_train);
  experiment_blocks.push(pre_main_block);
  // experiment_blocks.push(secChanceLoop);
  // experiment_blocks.push(mainBlockIns);
  experiment_blocks.push(main_block);
  // experiment_blocks = experiment_blocks.concat(debrief);
  //
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
    fullscreen: true,
    on_finish: function(data) {
      saveData(jsPsych.data.get().json(), 'test_data.txt')
      // psiturk.recordUnstructuredData('jsPsych_trial_data',
      //   jsPsych.data.get().json());
      // psiturk.recordUnstructuredData('jsPsych_event_data',
      //   jsPsych.data.getInteractionData().json());
      // psiturk.saveData({
      //   success: function() {
      //     psiturk.completeHIT();
      //   }
      // })
    },
    on_data_update: function(data) {
      // psiturk.recordTrialData(data);
    },
    preload_images: images,
    on_trial_start: function() {
      // Record start time of bRMS block
      if (exp_start_time == 0 && jsPsych.currentTrial().type == 'bRMS') {
        exp_start_time = d.getTime();
        // psiturk.finishInstructions(); // advance status to 2
      }
    }
  });
}

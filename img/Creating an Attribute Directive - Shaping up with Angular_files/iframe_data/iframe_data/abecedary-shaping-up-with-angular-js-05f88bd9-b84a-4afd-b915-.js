require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./angular-sandbox.js":[function(require,module,exports){
module.exports=require('nZpoDC');
},{}],"nZpoDC":[function(require,module,exports){
var Sandbox = require('javascript-sandbox'),
    jQuery = require('jquery-browserify'),
    angular = require('angular'),
    CS = require('./cs.js'),
    _ = require('lodash');

// Prepare the HTML used in this course for testing
//   Removes the `app.js` script include.
//   Removes the 'angular.js' script include.
function scrubHtml(html) {
  html = html.replace(/<script type=\"text\/javascript\" src=\"(.+)\"><\/script>/g, "")
             .replace(/<link rel=\"stylesheet\" type=\"text\/css\" href=\"bootstrap.min.css\" \/>/g, "")
             .replace(/ng-app/, "cs-ng-app");
  return html.replace('<head>', "<head><base href='http://courseware.codeschool.com/shaping-up-with-angular-js/' />")
}

Sandbox.angularSandbox = function(code, modules, options) {
  var sandbox = new Sandbox({
     variables: {
       'angular': angular
     },
     html: scrubHtml(CS.codeByFileName(code, 'index.html')),
     javascript: CS.allCode(CS.filesByExtension(code, 'js'), 'javascript')
  });
  sandbox.modules = modules;
  sandbox.code = code;

  options = options || {autoStart: true};

  sandbox.exec(function(window) {
    var iframe = window.document.getElementsByTagName('html')[0];
    window.$ = window.jQuery = function(selector) {
      return jQuery(selector, iframe)
    };
    window.angular.module(modules[0]).factory('$exceptionHandler', function ($log) {
      sandbox.exceptions = [];
      return function (exception, cause) {
        $log.error(exception, cause);
        sandbox.exceptions.push(exception);
      };
    });
  });

  if (options.autoStart) {
    sandbox.bootstrap();
  }

  return sandbox;
};

Sandbox.prototype.bootstrap = function() {
  // Bootstrap angular.
  var sandbox = this;
  var injector = this.exec(function(window) {
    var iframe = window.document.getElementsByTagName('html')[0];
    return window.angular.bootstrap(iframe, sandbox.modules);
  });
  this.set('$injector', injector);

  // Add all templates to the angular $templateCache.
  var templates = _.filter(sandbox.code, function(file) {
    return file.codeType === 'html' && file.fileName != 'index.html';
  });
  var module = this.module(sandbox.modules[0]);
  this.addTemplates(module, templates);

  return injector;
};

Sandbox.prototype.injector = function() {
  return this.get('$injector');
};

Sandbox.prototype.scopeByElement = function(selector) {
  return this.exec(function(window) {
    return window.$(selector).scope();
  });
};

Sandbox.prototype.controllerByElement = function(selector) {
  return this.exec(function(window) {
    return window.$(selector).controller();
  })
};

// Create a new controller, not bound to the DOM. Changes to this controller
// won't affect the rendered HTML
Sandbox.prototype.newControllerByName = function(name) {
  var $rootScope = this.injector().get('$rootScope');
  var $controller = this.injector().get('$controller');
  return $controller(name, { '$scope': $rootScope.$new() });
};

Sandbox.prototype.element = function(selector) {
  return this.exec(function(window) {
    return window.$(selector);
  })
};

Sandbox.prototype.module = function(moduleName) {
  return this.exec(function(window) {
    return window.angular.module(moduleName);
  })
};

Sandbox.prototype.addTemplates = function(moduleInstance, templateFiles) {
  moduleInstance.run(function($templateCache) {
    $.each(templateFiles, function(index, templateFile) {
      $templateCache.put(templateFile.fileName, templateFile.code);
    })
  });
};

module.exports = Sandbox;

},{"./cs.js":"Fjvs8c","angular":"iBmHg2","javascript-sandbox":"L4QuJI","jquery-browserify":"UErKnN","lodash":"K2RcUv"}],"./cs.js":[function(require,module,exports){
module.exports=require('Fjvs8c');
},{}],"Fjvs8c":[function(require,module,exports){
var jshint = require('jshint').JSHINT,
    $ = require('jquery-browserify'),
    _ = require('lodash');

module.exports = {
  report: function(code) {
    if(!jshint(code)) {
      var error = jshint.errors[0];
      if(!error.message) {
        error.message = "Looks like there's a syntax error in your code: " + error.reason || error.raw;
      }
      throw error;
    }
  },

  html: function(code) {
    code = code.replace(/<(\/?)(html|body|script)/g, "<$1cs-$2")
    return $(code);
  },

  code: function(files, type) {
    for(var file in files) {
      if(files[file].codeType == type) {
        return files[file].code;
      }
    }
  },

  codeByFileName: function(files, fileName) {
    return _.find(files, {fileName: fileName}).code;
  },

  filesByFileNames: function(files, fileNames) {
    return _.filter(files, function(file) {
      return _.contains(fileNames, file.fileName);
    });
  },

  filesByExtension: function(files, extension) {
    var endsWithExtension = new RegExp(extension + "$");
    return _.filter(files, function(file) {
      return endsWithExtension.test(file.fileName);
    });
  },

  // Join all files of a given type
  allCode: function(files, type) {
    return _.pluck(_.groupBy(files, function(file) {
      return file.codeType;
    })[type], 'code').join("\n");
  },

  verify: function(files, runBeforeTests) {
    var CS = require('./cs.js'),
        Sandbox = require('./angular-sandbox.js');

    it('jshint_error', function() {
      CS.report(CS.allCode(files, 'javascript'));
    });

    if(typeof(runBeforeTests) == 'function') {
      runBeforeTests();
    }

    // Will try to run the entire app
    it('code_wont_run', function() {
      var sandbox;
      try {
        sandbox = Sandbox.angularSandbox(files, ['gemStore']);
        if(sandbox.exceptions.length > 0) {
          throw sandbox.exceptions[0];
        }
      }
      catch(e) {
        var message;
        if(e.message.match(/http/)) {
          message = "There was an error running your code. Angular provided us with a little information about the error, and a link to learn more.\\n\\n"+e.message;
        } else {
          message = "There was an error running your code.\\n\\n" + e.message;
        }

        throw { "message": message};
      }

      try { sandbox.destroy(); }
      catch(e) { }
    });
  }
};

},{"./angular-sandbox.js":"nZpoDC","./cs.js":"Fjvs8c","jquery-browserify":"UErKnN","jshint":"Dp6Q2R","lodash":"K2RcUv"}],"e92gUC":[function(require,module,exports){
/**
 * @license AngularJS v1.2.16
 * (c) 2010-2014 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {

'use strict';

/**
 * @ngdoc object
 * @name angular.mock
 * @description
 *
 * Namespace from 'angular-mocks.js' which contains testing related code.
 */
angular.mock = {};

/**
 * ! This is a private undocumented service !
 *
 * @name $browser
 *
 * @description
 * This service is a mock implementation of {@link ng.$browser}. It provides fake
 * implementation for commonly used browser apis that are hard to test, e.g. setTimeout, xhr,
 * cookies, etc...
 *
 * The api of this service is the same as that of the real {@link ng.$browser $browser}, except
 * that there are several helper methods available which can be used in tests.
 */
angular.mock.$BrowserProvider = function() {
  this.$get = function() {
    return new angular.mock.$Browser();
  };
};

angular.mock.$Browser = function() {
  var self = this;

  this.isMock = true;
  self.$$url = "http://server/";
  self.$$lastUrl = self.$$url; // used by url polling fn
  self.pollFns = [];

  // TODO(vojta): remove this temporary api
  self.$$completeOutstandingRequest = angular.noop;
  self.$$incOutstandingRequestCount = angular.noop;


  // register url polling fn

  self.onUrlChange = function(listener) {
    self.pollFns.push(
      function() {
        if (self.$$lastUrl != self.$$url) {
          self.$$lastUrl = self.$$url;
          listener(self.$$url);
        }
      }
    );

    return listener;
  };

  self.cookieHash = {};
  self.lastCookieHash = {};
  self.deferredFns = [];
  self.deferredNextId = 0;

  self.defer = function(fn, delay) {
    delay = delay || 0;
    self.deferredFns.push({time:(self.defer.now + delay), fn:fn, id: self.deferredNextId});
    self.deferredFns.sort(function(a,b){ return a.time - b.time;});
    return self.deferredNextId++;
  };


  /**
   * @name $browser#defer.now
   *
   * @description
   * Current milliseconds mock time.
   */
  self.defer.now = 0;


  self.defer.cancel = function(deferId) {
    var fnIndex;

    angular.forEach(self.deferredFns, function(fn, index) {
      if (fn.id === deferId) fnIndex = index;
    });

    if (fnIndex !== undefined) {
      self.deferredFns.splice(fnIndex, 1);
      return true;
    }

    return false;
  };


  /**
   * @name $browser#defer.flush
   *
   * @description
   * Flushes all pending requests and executes the defer callbacks.
   *
   * @param {number=} number of milliseconds to flush. See {@link #defer.now}
   */
  self.defer.flush = function(delay) {
    if (angular.isDefined(delay)) {
      self.defer.now += delay;
    } else {
      if (self.deferredFns.length) {
        self.defer.now = self.deferredFns[self.deferredFns.length-1].time;
      } else {
        throw new Error('No deferred tasks to be flushed');
      }
    }

    while (self.deferredFns.length && self.deferredFns[0].time <= self.defer.now) {
      self.deferredFns.shift().fn();
    }
  };

  self.$$baseHref = '';
  self.baseHref = function() {
    return this.$$baseHref;
  };
};
angular.mock.$Browser.prototype = {

/**
  * @name $browser#poll
  *
  * @description
  * run all fns in pollFns
  */
  poll: function poll() {
    angular.forEach(this.pollFns, function(pollFn){
      pollFn();
    });
  },

  addPollFn: function(pollFn) {
    this.pollFns.push(pollFn);
    return pollFn;
  },

  url: function(url, replace) {
    if (url) {
      this.$$url = url;
      return this;
    }

    return this.$$url;
  },

  cookies:  function(name, value) {
    if (name) {
      if (angular.isUndefined(value)) {
        delete this.cookieHash[name];
      } else {
        if (angular.isString(value) &&       //strings only
            value.length <= 4096) {          //strict cookie storage limits
          this.cookieHash[name] = value;
        }
      }
    } else {
      if (!angular.equals(this.cookieHash, this.lastCookieHash)) {
        this.lastCookieHash = angular.copy(this.cookieHash);
        this.cookieHash = angular.copy(this.cookieHash);
      }
      return this.cookieHash;
    }
  },

  notifyWhenNoOutstandingRequests: function(fn) {
    fn();
  }
};


/**
 * @ngdoc provider
 * @name $exceptionHandlerProvider
 *
 * @description
 * Configures the mock implementation of {@link ng.$exceptionHandler} to rethrow or to log errors
 * passed into the `$exceptionHandler`.
 */

/**
 * @ngdoc service
 * @name $exceptionHandler
 *
 * @description
 * Mock implementation of {@link ng.$exceptionHandler} that rethrows or logs errors passed
 * into it. See {@link ngMock.$exceptionHandlerProvider $exceptionHandlerProvider} for configuration
 * information.
 *
 *
 * ```js
 *   describe('$exceptionHandlerProvider', function() {
 *
 *     it('should capture log messages and exceptions', function() {
 *
 *       module(function($exceptionHandlerProvider) {
 *         $exceptionHandlerProvider.mode('log');
 *       });
 *
 *       inject(function($log, $exceptionHandler, $timeout) {
 *         $timeout(function() { $log.log(1); });
 *         $timeout(function() { $log.log(2); throw 'banana peel'; });
 *         $timeout(function() { $log.log(3); });
 *         expect($exceptionHandler.errors).toEqual([]);
 *         expect($log.assertEmpty());
 *         $timeout.flush();
 *         expect($exceptionHandler.errors).toEqual(['banana peel']);
 *         expect($log.log.logs).toEqual([[1], [2], [3]]);
 *       });
 *     });
 *   });
 * ```
 */

angular.mock.$ExceptionHandlerProvider = function() {
  var handler;

  /**
   * @ngdoc method
   * @name $exceptionHandlerProvider#mode
   *
   * @description
   * Sets the logging mode.
   *
   * @param {string} mode Mode of operation, defaults to `rethrow`.
   *
   *   - `rethrow`: If any errors are passed into the handler in tests, it typically
   *                means that there is a bug in the application or test, so this mock will
   *                make these tests fail.
   *   - `log`: Sometimes it is desirable to test that an error is thrown, for this case the `log`
   *            mode stores an array of errors in `$exceptionHandler.errors`, to allow later
   *            assertion of them. See {@link ngMock.$log#assertEmpty assertEmpty()} and
   *            {@link ngMock.$log#reset reset()}
   */
  this.mode = function(mode) {
    switch(mode) {
      case 'rethrow':
        handler = function(e) {
          throw e;
        };
        break;
      case 'log':
        var errors = [];

        handler = function(e) {
          if (arguments.length == 1) {
            errors.push(e);
          } else {
            errors.push([].slice.call(arguments, 0));
          }
        };

        handler.errors = errors;
        break;
      default:
        throw new Error("Unknown mode '" + mode + "', only 'log'/'rethrow' modes are allowed!");
    }
  };

  this.$get = function() {
    return handler;
  };

  this.mode('rethrow');
};


/**
 * @ngdoc service
 * @name $log
 *
 * @description
 * Mock implementation of {@link ng.$log} that gathers all logged messages in arrays
 * (one array per logging level). These arrays are exposed as `logs` property of each of the
 * level-specific log function, e.g. for level `error` the array is exposed as `$log.error.logs`.
 *
 */
angular.mock.$LogProvider = function() {
  var debug = true;

  function concat(array1, array2, index) {
    return array1.concat(Array.prototype.slice.call(array2, index));
  }

  this.debugEnabled = function(flag) {
    if (angular.isDefined(flag)) {
      debug = flag;
      return this;
    } else {
      return debug;
    }
  };

  this.$get = function () {
    var $log = {
      log: function() { $log.log.logs.push(concat([], arguments, 0)); },
      warn: function() { $log.warn.logs.push(concat([], arguments, 0)); },
      info: function() { $log.info.logs.push(concat([], arguments, 0)); },
      error: function() { $log.error.logs.push(concat([], arguments, 0)); },
      debug: function() {
        if (debug) {
          $log.debug.logs.push(concat([], arguments, 0));
        }
      }
    };

    /**
     * @ngdoc method
     * @name $log#reset
     *
     * @description
     * Reset all of the logging arrays to empty.
     */
    $log.reset = function () {
      /**
       * @ngdoc property
       * @name $log#log.logs
       *
       * @description
       * Array of messages logged using {@link ngMock.$log#log}.
       *
       * @example
       * ```js
       * $log.log('Some Log');
       * var first = $log.log.logs.unshift();
       * ```
       */
      $log.log.logs = [];
      /**
       * @ngdoc property
       * @name $log#info.logs
       *
       * @description
       * Array of messages logged using {@link ngMock.$log#info}.
       *
       * @example
       * ```js
       * $log.info('Some Info');
       * var first = $log.info.logs.unshift();
       * ```
       */
      $log.info.logs = [];
      /**
       * @ngdoc property
       * @name $log#warn.logs
       *
       * @description
       * Array of messages logged using {@link ngMock.$log#warn}.
       *
       * @example
       * ```js
       * $log.warn('Some Warning');
       * var first = $log.warn.logs.unshift();
       * ```
       */
      $log.warn.logs = [];
      /**
       * @ngdoc property
       * @name $log#error.logs
       *
       * @description
       * Array of messages logged using {@link ngMock.$log#error}.
       *
       * @example
       * ```js
       * $log.error('Some Error');
       * var first = $log.error.logs.unshift();
       * ```
       */
      $log.error.logs = [];
        /**
       * @ngdoc property
       * @name $log#debug.logs
       *
       * @description
       * Array of messages logged using {@link ngMock.$log#debug}.
       *
       * @example
       * ```js
       * $log.debug('Some Error');
       * var first = $log.debug.logs.unshift();
       * ```
       */
      $log.debug.logs = [];
    };

    /**
     * @ngdoc method
     * @name $log#assertEmpty
     *
     * @description
     * Assert that the all of the logging methods have no logged messages. If messages present, an
     * exception is thrown.
     */
    $log.assertEmpty = function() {
      var errors = [];
      angular.forEach(['error', 'warn', 'info', 'log', 'debug'], function(logLevel) {
        angular.forEach($log[logLevel].logs, function(log) {
          angular.forEach(log, function (logItem) {
            errors.push('MOCK $log (' + logLevel + '): ' + String(logItem) + '\n' +
                        (logItem.stack || ''));
          });
        });
      });
      if (errors.length) {
        errors.unshift("Expected $log to be empty! Either a message was logged unexpectedly, or "+
          "an expected log message was not checked and removed:");
        errors.push('');
        throw new Error(errors.join('\n---------\n'));
      }
    };

    $log.reset();
    return $log;
  };
};


/**
 * @ngdoc service
 * @name $interval
 *
 * @description
 * Mock implementation of the $interval service.
 *
 * Use {@link ngMock.$interval#flush `$interval.flush(millis)`} to
 * move forward by `millis` milliseconds and trigger any functions scheduled to run in that
 * time.
 *
 * @param {function()} fn A function that should be called repeatedly.
 * @param {number} delay Number of milliseconds between each function call.
 * @param {number=} [count=0] Number of times to repeat. If not set, or 0, will repeat
 *   indefinitely.
 * @param {boolean=} [invokeApply=true] If set to `false` skips model dirty checking, otherwise
 *   will invoke `fn` within the {@link ng.$rootScope.Scope#$apply $apply} block.
 * @returns {promise} A promise which will be notified on each iteration.
 */
angular.mock.$IntervalProvider = function() {
  this.$get = ['$rootScope', '$q',
       function($rootScope,   $q) {
    var repeatFns = [],
        nextRepeatId = 0,
        now = 0;

    var $interval = function(fn, delay, count, invokeApply) {
      var deferred = $q.defer(),
          promise = deferred.promise,
          iteration = 0,
          skipApply = (angular.isDefined(invokeApply) && !invokeApply);

      count = (angular.isDefined(count)) ? count : 0,
      promise.then(null, null, fn);

      promise.$$intervalId = nextRepeatId;

      function tick() {
        deferred.notify(iteration++);

        if (count > 0 && iteration >= count) {
          var fnIndex;
          deferred.resolve(iteration);

          angular.forEach(repeatFns, function(fn, index) {
            if (fn.id === promise.$$intervalId) fnIndex = index;
          });

          if (fnIndex !== undefined) {
            repeatFns.splice(fnIndex, 1);
          }
        }

        if (!skipApply) $rootScope.$apply();
      }

      repeatFns.push({
        nextTime:(now + delay),
        delay: delay,
        fn: tick,
        id: nextRepeatId,
        deferred: deferred
      });
      repeatFns.sort(function(a,b){ return a.nextTime - b.nextTime;});

      nextRepeatId++;
      return promise;
    };
    /**
     * @ngdoc method
     * @name $interval#cancel
     *
     * @description
     * Cancels a task associated with the `promise`.
     *
     * @param {promise} promise A promise from calling the `$interval` function.
     * @returns {boolean} Returns `true` if the task was successfully cancelled.
     */
    $interval.cancel = function(promise) {
      if(!promise) return false;
      var fnIndex;

      angular.forEach(repeatFns, function(fn, index) {
        if (fn.id === promise.$$intervalId) fnIndex = index;
      });

      if (fnIndex !== undefined) {
        repeatFns[fnIndex].deferred.reject('canceled');
        repeatFns.splice(fnIndex, 1);
        return true;
      }

      return false;
    };

    /**
     * @ngdoc method
     * @name $interval#flush
     * @description
     *
     * Runs interval tasks scheduled to be run in the next `millis` milliseconds.
     *
     * @param {number=} millis maximum timeout amount to flush up until.
     *
     * @return {number} The amount of time moved forward.
     */
    $interval.flush = function(millis) {
      now += millis;
      while (repeatFns.length && repeatFns[0].nextTime <= now) {
        var task = repeatFns[0];
        task.fn();
        task.nextTime += task.delay;
        repeatFns.sort(function(a,b){ return a.nextTime - b.nextTime;});
      }
      return millis;
    };

    return $interval;
  }];
};


/* jshint -W101 */
/* The R_ISO8061_STR regex is never going to fit into the 100 char limit!
 * This directive should go inside the anonymous function but a bug in JSHint means that it would
 * not be enacted early enough to prevent the warning.
 */
var R_ISO8061_STR = /^(\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?:\:?(\d\d)(?:\:?(\d\d)(?:\.(\d{3}))?)?)?(Z|([+-])(\d\d):?(\d\d)))?$/;

function jsonStringToDate(string) {
  var match;
  if (match = string.match(R_ISO8061_STR)) {
    var date = new Date(0),
        tzHour = 0,
        tzMin  = 0;
    if (match[9]) {
      tzHour = int(match[9] + match[10]);
      tzMin = int(match[9] + match[11]);
    }
    date.setUTCFullYear(int(match[1]), int(match[2]) - 1, int(match[3]));
    date.setUTCHours(int(match[4]||0) - tzHour,
                     int(match[5]||0) - tzMin,
                     int(match[6]||0),
                     int(match[7]||0));
    return date;
  }
  return string;
}

function int(str) {
  return parseInt(str, 10);
}

function padNumber(num, digits, trim) {
  var neg = '';
  if (num < 0) {
    neg =  '-';
    num = -num;
  }
  num = '' + num;
  while(num.length < digits) num = '0' + num;
  if (trim)
    num = num.substr(num.length - digits);
  return neg + num;
}


/**
 * @ngdoc type
 * @name angular.mock.TzDate
 * @description
 *
 * *NOTE*: this is not an injectable instance, just a globally available mock class of `Date`.
 *
 * Mock of the Date type which has its timezone specified via constructor arg.
 *
 * The main purpose is to create Date-like instances with timezone fixed to the specified timezone
 * offset, so that we can test code that depends on local timezone settings without dependency on
 * the time zone settings of the machine where the code is running.
 *
 * @param {number} offset Offset of the *desired* timezone in hours (fractions will be honored)
 * @param {(number|string)} timestamp Timestamp representing the desired time in *UTC*
 *
 * @example
 * !!!! WARNING !!!!!
 * This is not a complete Date object so only methods that were implemented can be called safely.
 * To make matters worse, TzDate instances inherit stuff from Date via a prototype.
 *
 * We do our best to intercept calls to "unimplemented" methods, but since the list of methods is
 * incomplete we might be missing some non-standard methods. This can result in errors like:
 * "Date.prototype.foo called on incompatible Object".
 *
 * ```js
 * var newYearInBratislava = new TzDate(-1, '2009-12-31T23:00:00Z');
 * newYearInBratislava.getTimezoneOffset() => -60;
 * newYearInBratislava.getFullYear() => 2010;
 * newYearInBratislava.getMonth() => 0;
 * newYearInBratislava.getDate() => 1;
 * newYearInBratislava.getHours() => 0;
 * newYearInBratislava.getMinutes() => 0;
 * newYearInBratislava.getSeconds() => 0;
 * ```
 *
 */
angular.mock.TzDate = function (offset, timestamp) {
  var self = new Date(0);
  if (angular.isString(timestamp)) {
    var tsStr = timestamp;

    self.origDate = jsonStringToDate(timestamp);

    timestamp = self.origDate.getTime();
    if (isNaN(timestamp))
      throw {
        name: "Illegal Argument",
        message: "Arg '" + tsStr + "' passed into TzDate constructor is not a valid date string"
      };
  } else {
    self.origDate = new Date(timestamp);
  }

  var localOffset = new Date(timestamp).getTimezoneOffset();
  self.offsetDiff = localOffset*60*1000 - offset*1000*60*60;
  self.date = new Date(timestamp + self.offsetDiff);

  self.getTime = function() {
    return self.date.getTime() - self.offsetDiff;
  };

  self.toLocaleDateString = function() {
    return self.date.toLocaleDateString();
  };

  self.getFullYear = function() {
    return self.date.getFullYear();
  };

  self.getMonth = function() {
    return self.date.getMonth();
  };

  self.getDate = function() {
    return self.date.getDate();
  };

  self.getHours = function() {
    return self.date.getHours();
  };

  self.getMinutes = function() {
    return self.date.getMinutes();
  };

  self.getSeconds = function() {
    return self.date.getSeconds();
  };

  self.getMilliseconds = function() {
    return self.date.getMilliseconds();
  };

  self.getTimezoneOffset = function() {
    return offset * 60;
  };

  self.getUTCFullYear = function() {
    return self.origDate.getUTCFullYear();
  };

  self.getUTCMonth = function() {
    return self.origDate.getUTCMonth();
  };

  self.getUTCDate = function() {
    return self.origDate.getUTCDate();
  };

  self.getUTCHours = function() {
    return self.origDate.getUTCHours();
  };

  self.getUTCMinutes = function() {
    return self.origDate.getUTCMinutes();
  };

  self.getUTCSeconds = function() {
    return self.origDate.getUTCSeconds();
  };

  self.getUTCMilliseconds = function() {
    return self.origDate.getUTCMilliseconds();
  };

  self.getDay = function() {
    return self.date.getDay();
  };

  // provide this method only on browsers that already have it
  if (self.toISOString) {
    self.toISOString = function() {
      return padNumber(self.origDate.getUTCFullYear(), 4) + '-' +
            padNumber(self.origDate.getUTCMonth() + 1, 2) + '-' +
            padNumber(self.origDate.getUTCDate(), 2) + 'T' +
            padNumber(self.origDate.getUTCHours(), 2) + ':' +
            padNumber(self.origDate.getUTCMinutes(), 2) + ':' +
            padNumber(self.origDate.getUTCSeconds(), 2) + '.' +
            padNumber(self.origDate.getUTCMilliseconds(), 3) + 'Z';
    };
  }

  //hide all methods not implemented in this mock that the Date prototype exposes
  var unimplementedMethods = ['getUTCDay',
      'getYear', 'setDate', 'setFullYear', 'setHours', 'setMilliseconds',
      'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate', 'setUTCFullYear',
      'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCMonth', 'setUTCSeconds',
      'setYear', 'toDateString', 'toGMTString', 'toJSON', 'toLocaleFormat', 'toLocaleString',
      'toLocaleTimeString', 'toSource', 'toString', 'toTimeString', 'toUTCString', 'valueOf'];

  angular.forEach(unimplementedMethods, function(methodName) {
    self[methodName] = function() {
      throw new Error("Method '" + methodName + "' is not implemented in the TzDate mock");
    };
  });

  return self;
};

//make "tzDateInstance instanceof Date" return true
angular.mock.TzDate.prototype = Date.prototype;
/* jshint +W101 */

angular.mock.animate = angular.module('ngAnimateMock', ['ng'])

  .config(['$provide', function($provide) {

    var reflowQueue = [];
    $provide.value('$$animateReflow', function(fn) {
      var index = reflowQueue.length;
      reflowQueue.push(fn);
      return function cancel() {
        reflowQueue.splice(index, 1);
      };
    });

    $provide.decorator('$animate', function($delegate, $$asyncCallback) {
      var animate = {
        queue : [],
        enabled : $delegate.enabled,
        triggerCallbacks : function() {
          $$asyncCallback.flush();
        },
        triggerReflow : function() {
          angular.forEach(reflowQueue, function(fn) {
            fn();
          });
          reflowQueue = [];
        }
      };

      angular.forEach(
        ['enter','leave','move','addClass','removeClass','setClass'], function(method) {
        animate[method] = function() {
          animate.queue.push({
            event : method,
            element : arguments[0],
            args : arguments
          });
          $delegate[method].apply($delegate, arguments);
        };
      });

      return animate;
    });

  }]);


/**
 * @ngdoc function
 * @name angular.mock.dump
 * @description
 *
 * *NOTE*: this is not an injectable instance, just a globally available function.
 *
 * Method for serializing common angular objects (scope, elements, etc..) into strings, useful for
 * debugging.
 *
 * This method is also available on window, where it can be used to display objects on debug
 * console.
 *
 * @param {*} object - any object to turn into string.
 * @return {string} a serialized string of the argument
 */
angular.mock.dump = function(object) {
  return serialize(object);

  function serialize(object) {
    var out;

    if (angular.isElement(object)) {
      object = angular.element(object);
      out = angular.element('<div></div>');
      angular.forEach(object, function(element) {
        out.append(angular.element(element).clone());
      });
      out = out.html();
    } else if (angular.isArray(object)) {
      out = [];
      angular.forEach(object, function(o) {
        out.push(serialize(o));
      });
      out = '[ ' + out.join(', ') + ' ]';
    } else if (angular.isObject(object)) {
      if (angular.isFunction(object.$eval) && angular.isFunction(object.$apply)) {
        out = serializeScope(object);
      } else if (object instanceof Error) {
        out = object.stack || ('' + object.name + ': ' + object.message);
      } else {
        // TODO(i): this prevents methods being logged,
        // we should have a better way to serialize objects
        out = angular.toJson(object, true);
      }
    } else {
      out = String(object);
    }

    return out;
  }

  function serializeScope(scope, offset) {
    offset = offset ||  '  ';
    var log = [offset + 'Scope(' + scope.$id + '): {'];
    for ( var key in scope ) {
      if (Object.prototype.hasOwnProperty.call(scope, key) && !key.match(/^(\$|this)/)) {
        log.push('  ' + key + ': ' + angular.toJson(scope[key]));
      }
    }
    var child = scope.$$childHead;
    while(child) {
      log.push(serializeScope(child, offset + '  '));
      child = child.$$nextSibling;
    }
    log.push('}');
    return log.join('\n' + offset);
  }
};

/**
 * @ngdoc service
 * @name $httpBackend
 * @description
 * Fake HTTP backend implementation suitable for unit testing applications that use the
 * {@link ng.$http $http service}.
 *
 * *Note*: For fake HTTP backend implementation suitable for end-to-end testing or backend-less
 * development please see {@link ngMockE2E.$httpBackend e2e $httpBackend mock}.
 *
 * During unit testing, we want our unit tests to run quickly and have no external dependencies so
 * we don’t want to send [XHR](https://developer.mozilla.org/en/xmlhttprequest) or
 * [JSONP](http://en.wikipedia.org/wiki/JSONP) requests to a real server. All we really need is
 * to verify whether a certain request has been sent or not, or alternatively just let the
 * application make requests, respond with pre-trained responses and assert that the end result is
 * what we expect it to be.
 *
 * This mock implementation can be used to respond with static or dynamic responses via the
 * `expect` and `when` apis and their shortcuts (`expectGET`, `whenPOST`, etc).
 *
 * When an Angular application needs some data from a server, it calls the $http service, which
 * sends the request to a real server using $httpBackend service. With dependency injection, it is
 * easy to inject $httpBackend mock (which has the same API as $httpBackend) and use it to verify
 * the requests and respond with some testing data without sending a request to real server.
 *
 * There are two ways to specify what test data should be returned as http responses by the mock
 * backend when the code under test makes http requests:
 *
 * - `$httpBackend.expect` - specifies a request expectation
 * - `$httpBackend.when` - specifies a backend definition
 *
 *
 * # Request Expectations vs Backend Definitions
 *
 * Request expectations provide a way to make assertions about requests made by the application and
 * to define responses for those requests. The test will fail if the expected requests are not made
 * or they are made in the wrong order.
 *
 * Backend definitions allow you to define a fake backend for your application which doesn't assert
 * if a particular request was made or not, it just returns a trained response if a request is made.
 * The test will pass whether or not the request gets made during testing.
 *
 *
 * <table class="table">
 *   <tr><th width="220px"></th><th>Request expectations</th><th>Backend definitions</th></tr>
 *   <tr>
 *     <th>Syntax</th>
 *     <td>.expect(...).respond(...)</td>
 *     <td>.when(...).respond(...)</td>
 *   </tr>
 *   <tr>
 *     <th>Typical usage</th>
 *     <td>strict unit tests</td>
 *     <td>loose (black-box) unit testing</td>
 *   </tr>
 *   <tr>
 *     <th>Fulfills multiple requests</th>
 *     <td>NO</td>
 *     <td>YES</td>
 *   </tr>
 *   <tr>
 *     <th>Order of requests matters</th>
 *     <td>YES</td>
 *     <td>NO</td>
 *   </tr>
 *   <tr>
 *     <th>Request required</th>
 *     <td>YES</td>
 *     <td>NO</td>
 *   </tr>
 *   <tr>
 *     <th>Response required</th>
 *     <td>optional (see below)</td>
 *     <td>YES</td>
 *   </tr>
 * </table>
 *
 * In cases where both backend definitions and request expectations are specified during unit
 * testing, the request expectations are evaluated first.
 *
 * If a request expectation has no response specified, the algorithm will search your backend
 * definitions for an appropriate response.
 *
 * If a request didn't match any expectation or if the expectation doesn't have the response
 * defined, the backend definitions are evaluated in sequential order to see if any of them match
 * the request. The response from the first matched definition is returned.
 *
 *
 * # Flushing HTTP requests
 *
 * The $httpBackend used in production always responds to requests asynchronously. If we preserved
 * this behavior in unit testing, we'd have to create async unit tests, which are hard to write,
 * to follow and to maintain. But neither can the testing mock respond synchronously; that would
 * change the execution of the code under test. For this reason, the mock $httpBackend has a
 * `flush()` method, which allows the test to explicitly flush pending requests. This preserves
 * the async api of the backend, while allowing the test to execute synchronously.
 *
 *
 * # Unit testing with mock $httpBackend
 * The following code shows how to setup and use the mock backend when unit testing a controller.
 * First we create the controller under test:
 *
  ```js
  // The controller code
  function MyController($scope, $http) {
    var authToken;

    $http.get('/auth.py').success(function(data, status, headers) {
      authToken = headers('A-Token');
      $scope.user = data;
    });

    $scope.saveMessage = function(message) {
      var headers = { 'Authorization': authToken };
      $scope.status = 'Saving...';

      $http.post('/add-msg.py', message, { headers: headers } ).success(function(response) {
        $scope.status = '';
      }).error(function() {
        $scope.status = 'ERROR!';
      });
    };
  }
  ```
 *
 * Now we setup the mock backend and create the test specs:
 *
  ```js
    // testing controller
    describe('MyController', function() {
       var $httpBackend, $rootScope, createController;

       beforeEach(inject(function($injector) {
         // Set up the mock http service responses
         $httpBackend = $injector.get('$httpBackend');
         // backend definition common for all tests
         $httpBackend.when('GET', '/auth.py').respond({userId: 'userX'}, {'A-Token': 'xxx'});

         // Get hold of a scope (i.e. the root scope)
         $rootScope = $injector.get('$rootScope');
         // The $controller service is used to create instances of controllers
         var $controller = $injector.get('$controller');

         createController = function() {
           return $controller('MyController', {'$scope' : $rootScope });
         };
       }));


       afterEach(function() {
         $httpBackend.verifyNoOutstandingExpectation();
         $httpBackend.verifyNoOutstandingRequest();
       });


       it('should fetch authentication token', function() {
         $httpBackend.expectGET('/auth.py');
         var controller = createController();
         $httpBackend.flush();
       });


       it('should send msg to server', function() {
         var controller = createController();
         $httpBackend.flush();

         // now you don’t care about the authentication, but
         // the controller will still send the request and
         // $httpBackend will respond without you having to
         // specify the expectation and response for this request

         $httpBackend.expectPOST('/add-msg.py', 'message content').respond(201, '');
         $rootScope.saveMessage('message content');
         expect($rootScope.status).toBe('Saving...');
         $httpBackend.flush();
         expect($rootScope.status).toBe('');
       });


       it('should send auth header', function() {
         var controller = createController();
         $httpBackend.flush();

         $httpBackend.expectPOST('/add-msg.py', undefined, function(headers) {
           // check if the header was send, if it wasn't the expectation won't
           // match the request and the test will fail
           return headers['Authorization'] == 'xxx';
         }).respond(201, '');

         $rootScope.saveMessage('whatever');
         $httpBackend.flush();
       });
    });
   ```
 */
angular.mock.$HttpBackendProvider = function() {
  this.$get = ['$rootScope', createHttpBackendMock];
};

/**
 * General factory function for $httpBackend mock.
 * Returns instance for unit testing (when no arguments specified):
 *   - passing through is disabled
 *   - auto flushing is disabled
 *
 * Returns instance for e2e testing (when `$delegate` and `$browser` specified):
 *   - passing through (delegating request to real backend) is enabled
 *   - auto flushing is enabled
 *
 * @param {Object=} $delegate Real $httpBackend instance (allow passing through if specified)
 * @param {Object=} $browser Auto-flushing enabled if specified
 * @return {Object} Instance of $httpBackend mock
 */
function createHttpBackendMock($rootScope, $delegate, $browser) {
  var definitions = [],
      expectations = [],
      responses = [],
      responsesPush = angular.bind(responses, responses.push),
      copy = angular.copy;

  function createResponse(status, data, headers, statusText) {
    if (angular.isFunction(status)) return status;

    return function() {
      return angular.isNumber(status)
          ? [status, data, headers, statusText]
          : [200, status, data];
    };
  }

  // TODO(vojta): change params to: method, url, data, headers, callback
  function $httpBackend(method, url, data, callback, headers, timeout, withCredentials) {
    var xhr = new MockXhr(),
        expectation = expectations[0],
        wasExpected = false;

    function prettyPrint(data) {
      return (angular.isString(data) || angular.isFunction(data) || data instanceof RegExp)
          ? data
          : angular.toJson(data);
    }

    function wrapResponse(wrapped) {
      if (!$browser && timeout && timeout.then) timeout.then(handleTimeout);

      return handleResponse;

      function handleResponse() {
        var response = wrapped.response(method, url, data, headers);
        xhr.$$respHeaders = response[2];
        callback(copy(response[0]), copy(response[1]), xhr.getAllResponseHeaders(),
                 copy(response[3] || ''));
      }

      function handleTimeout() {
        for (var i = 0, ii = responses.length; i < ii; i++) {
          if (responses[i] === handleResponse) {
            responses.splice(i, 1);
            callback(-1, undefined, '');
            break;
          }
        }
      }
    }

    if (expectation && expectation.match(method, url)) {
      if (!expectation.matchData(data))
        throw new Error('Expected ' + expectation + ' with different data\n' +
            'EXPECTED: ' + prettyPrint(expectation.data) + '\nGOT:      ' + data);

      if (!expectation.matchHeaders(headers))
        throw new Error('Expected ' + expectation + ' with different headers\n' +
                        'EXPECTED: ' + prettyPrint(expectation.headers) + '\nGOT:      ' +
                        prettyPrint(headers));

      expectations.shift();

      if (expectation.response) {
        responses.push(wrapResponse(expectation));
        return;
      }
      wasExpected = true;
    }

    var i = -1, definition;
    while ((definition = definitions[++i])) {
      if (definition.match(method, url, data, headers || {})) {
        if (definition.response) {
          // if $browser specified, we do auto flush all requests
          ($browser ? $browser.defer : responsesPush)(wrapResponse(definition));
        } else if (definition.passThrough) {
          $delegate(method, url, data, callback, headers, timeout, withCredentials);
        } else throw new Error('No response defined !');
        return;
      }
    }
    throw wasExpected ?
        new Error('No response defined !') :
        new Error('Unexpected request: ' + method + ' ' + url + '\n' +
                  (expectation ? 'Expected ' + expectation : 'No more request expected'));
  }

  /**
   * @ngdoc method
   * @name $httpBackend#when
   * @description
   * Creates a new backend definition.
   *
   * @param {string} method HTTP method.
   * @param {string|RegExp} url HTTP url.
   * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
   *   data string and returns true if the data is as expected.
   * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
   *   object and returns true if the headers match the current definition.
   * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
   *   request is handled.
   *
   *  - respond –
   *      `{function([status,] data[, headers, statusText])
   *      | function(function(method, url, data, headers)}`
   *    – The respond method takes a set of static data to be returned or a function that can
   *    return an array containing response status (number), response data (string), response
   *    headers (Object), and the text for the status (string).
   */
  $httpBackend.when = function(method, url, data, headers) {
    var definition = new MockHttpExpectation(method, url, data, headers),
        chain = {
          respond: function(status, data, headers, statusText) {
            definition.response = createResponse(status, data, headers, statusText);
          }
        };

    if ($browser) {
      chain.passThrough = function() {
        definition.passThrough = true;
      };
    }

    definitions.push(definition);
    return chain;
  };

  /**
   * @ngdoc method
   * @name $httpBackend#whenGET
   * @description
   * Creates a new backend definition for GET requests. For more info see `when()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   * request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenHEAD
   * @description
   * Creates a new backend definition for HEAD requests. For more info see `when()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   * request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenDELETE
   * @description
   * Creates a new backend definition for DELETE requests. For more info see `when()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   * request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenPOST
   * @description
   * Creates a new backend definition for POST requests. For more info see `when()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
   *   data string and returns true if the data is as expected.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   * request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenPUT
   * @description
   * Creates a new backend definition for PUT requests.  For more info see `when()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
   *   data string and returns true if the data is as expected.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   * request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenJSONP
   * @description
   * Creates a new backend definition for JSONP requests. For more info see `when()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   * request is handled.
   */
  createShortMethods('when');


  /**
   * @ngdoc method
   * @name $httpBackend#expect
   * @description
   * Creates a new request expectation.
   *
   * @param {string} method HTTP method.
   * @param {string|RegExp} url HTTP url.
   * @param {(string|RegExp|function(string)|Object)=} data HTTP request body or function that
   *  receives data string and returns true if the data is as expected, or Object if request body
   *  is in JSON format.
   * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
   *   object and returns true if the headers match the current expectation.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   *  request is handled.
   *
   *  - respond –
   *    `{function([status,] data[, headers, statusText])
   *    | function(function(method, url, data, headers)}`
   *    – The respond method takes a set of static data to be returned or a function that can
   *    return an array containing response status (number), response data (string), response
   *    headers (Object), and the text for the status (string).
   */
  $httpBackend.expect = function(method, url, data, headers) {
    var expectation = new MockHttpExpectation(method, url, data, headers);
    expectations.push(expectation);
    return {
      respond: function (status, data, headers, statusText) {
        expectation.response = createResponse(status, data, headers, statusText);
      }
    };
  };


  /**
   * @ngdoc method
   * @name $httpBackend#expectGET
   * @description
   * Creates a new request expectation for GET requests. For more info see `expect()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {Object=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   * request is handled. See #expect for more info.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#expectHEAD
   * @description
   * Creates a new request expectation for HEAD requests. For more info see `expect()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {Object=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   *   request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#expectDELETE
   * @description
   * Creates a new request expectation for DELETE requests. For more info see `expect()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {Object=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   *   request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#expectPOST
   * @description
   * Creates a new request expectation for POST requests. For more info see `expect()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {(string|RegExp|function(string)|Object)=} data HTTP request body or function that
   *  receives data string and returns true if the data is as expected, or Object if request body
   *  is in JSON format.
   * @param {Object=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   *   request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#expectPUT
   * @description
   * Creates a new request expectation for PUT requests. For more info see `expect()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {(string|RegExp|function(string)|Object)=} data HTTP request body or function that
   *  receives data string and returns true if the data is as expected, or Object if request body
   *  is in JSON format.
   * @param {Object=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   *   request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#expectPATCH
   * @description
   * Creates a new request expectation for PATCH requests. For more info see `expect()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @param {(string|RegExp|function(string)|Object)=} data HTTP request body or function that
   *  receives data string and returns true if the data is as expected, or Object if request body
   *  is in JSON format.
   * @param {Object=} headers HTTP headers.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   *   request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#expectJSONP
   * @description
   * Creates a new request expectation for JSONP requests. For more info see `expect()`.
   *
   * @param {string|RegExp} url HTTP url.
   * @returns {requestHandler} Returns an object with `respond` method that control how a matched
   *   request is handled.
   */
  createShortMethods('expect');


  /**
   * @ngdoc method
   * @name $httpBackend#flush
   * @description
   * Flushes all pending requests using the trained responses.
   *
   * @param {number=} count Number of responses to flush (in the order they arrived). If undefined,
   *   all pending requests will be flushed. If there are no pending requests when the flush method
   *   is called an exception is thrown (as this typically a sign of programming error).
   */
  $httpBackend.flush = function(count) {
    $rootScope.$digest();
    if (!responses.length) throw new Error('No pending request to flush !');

    if (angular.isDefined(count)) {
      while (count--) {
        if (!responses.length) throw new Error('No more pending request to flush !');
        responses.shift()();
      }
    } else {
      while (responses.length) {
        responses.shift()();
      }
    }
    $httpBackend.verifyNoOutstandingExpectation();
  };


  /**
   * @ngdoc method
   * @name $httpBackend#verifyNoOutstandingExpectation
   * @description
   * Verifies that all of the requests defined via the `expect` api were made. If any of the
   * requests were not made, verifyNoOutstandingExpectation throws an exception.
   *
   * Typically, you would call this method following each test case that asserts requests using an
   * "afterEach" clause.
   *
   * ```js
   *   afterEach($httpBackend.verifyNoOutstandingExpectation);
   * ```
   */
  $httpBackend.verifyNoOutstandingExpectation = function() {
    $rootScope.$digest();
    if (expectations.length) {
      throw new Error('Unsatisfied requests: ' + expectations.join(', '));
    }
  };


  /**
   * @ngdoc method
   * @name $httpBackend#verifyNoOutstandingRequest
   * @description
   * Verifies that there are no outstanding requests that need to be flushed.
   *
   * Typically, you would call this method following each test case that asserts requests using an
   * "afterEach" clause.
   *
   * ```js
   *   afterEach($httpBackend.verifyNoOutstandingRequest);
   * ```
   */
  $httpBackend.verifyNoOutstandingRequest = function() {
    if (responses.length) {
      throw new Error('Unflushed requests: ' + responses.length);
    }
  };


  /**
   * @ngdoc method
   * @name $httpBackend#resetExpectations
   * @description
   * Resets all request expectations, but preserves all backend definitions. Typically, you would
   * call resetExpectations during a multiple-phase test when you want to reuse the same instance of
   * $httpBackend mock.
   */
  $httpBackend.resetExpectations = function() {
    expectations.length = 0;
    responses.length = 0;
  };

  return $httpBackend;


  function createShortMethods(prefix) {
    angular.forEach(['GET', 'DELETE', 'JSONP'], function(method) {
     $httpBackend[prefix + method] = function(url, headers) {
       return $httpBackend[prefix](method, url, undefined, headers);
     };
    });

    angular.forEach(['PUT', 'POST', 'PATCH'], function(method) {
      $httpBackend[prefix + method] = function(url, data, headers) {
        return $httpBackend[prefix](method, url, data, headers);
      };
    });
  }
}

function MockHttpExpectation(method, url, data, headers) {

  this.data = data;
  this.headers = headers;

  this.match = function(m, u, d, h) {
    if (method != m) return false;
    if (!this.matchUrl(u)) return false;
    if (angular.isDefined(d) && !this.matchData(d)) return false;
    if (angular.isDefined(h) && !this.matchHeaders(h)) return false;
    return true;
  };

  this.matchUrl = function(u) {
    if (!url) return true;
    if (angular.isFunction(url.test)) return url.test(u);
    return url == u;
  };

  this.matchHeaders = function(h) {
    if (angular.isUndefined(headers)) return true;
    if (angular.isFunction(headers)) return headers(h);
    return angular.equals(headers, h);
  };

  this.matchData = function(d) {
    if (angular.isUndefined(data)) return true;
    if (data && angular.isFunction(data.test)) return data.test(d);
    if (data && angular.isFunction(data)) return data(d);
    if (data && !angular.isString(data)) return angular.equals(data, angular.fromJson(d));
    return data == d;
  };

  this.toString = function() {
    return method + ' ' + url;
  };
}

function createMockXhr() {
  return new MockXhr();
}

function MockXhr() {

  // hack for testing $http, $httpBackend
  MockXhr.$$lastInstance = this;

  this.open = function(method, url, async) {
    this.$$method = method;
    this.$$url = url;
    this.$$async = async;
    this.$$reqHeaders = {};
    this.$$respHeaders = {};
  };

  this.send = function(data) {
    this.$$data = data;
  };

  this.setRequestHeader = function(key, value) {
    this.$$reqHeaders[key] = value;
  };

  this.getResponseHeader = function(name) {
    // the lookup must be case insensitive,
    // that's why we try two quick lookups first and full scan last
    var header = this.$$respHeaders[name];
    if (header) return header;

    name = angular.lowercase(name);
    header = this.$$respHeaders[name];
    if (header) return header;

    header = undefined;
    angular.forEach(this.$$respHeaders, function(headerVal, headerName) {
      if (!header && angular.lowercase(headerName) == name) header = headerVal;
    });
    return header;
  };

  this.getAllResponseHeaders = function() {
    var lines = [];

    angular.forEach(this.$$respHeaders, function(value, key) {
      lines.push(key + ': ' + value);
    });
    return lines.join('\n');
  };

  this.abort = angular.noop;
}


/**
 * @ngdoc service
 * @name $timeout
 * @description
 *
 * This service is just a simple decorator for {@link ng.$timeout $timeout} service
 * that adds a "flush" and "verifyNoPendingTasks" methods.
 */

angular.mock.$TimeoutDecorator = function($delegate, $browser) {

  /**
   * @ngdoc method
   * @name $timeout#flush
   * @description
   *
   * Flushes the queue of pending tasks.
   *
   * @param {number=} delay maximum timeout amount to flush up until
   */
  $delegate.flush = function(delay) {
    $browser.defer.flush(delay);
  };

  /**
   * @ngdoc method
   * @name $timeout#verifyNoPendingTasks
   * @description
   *
   * Verifies that there are no pending tasks that need to be flushed.
   */
  $delegate.verifyNoPendingTasks = function() {
    if ($browser.deferredFns.length) {
      throw new Error('Deferred tasks to flush (' + $browser.deferredFns.length + '): ' +
          formatPendingTasksAsString($browser.deferredFns));
    }
  };

  function formatPendingTasksAsString(tasks) {
    var result = [];
    angular.forEach(tasks, function(task) {
      result.push('{id: ' + task.id + ', ' + 'time: ' + task.time + '}');
    });

    return result.join(', ');
  }

  return $delegate;
};

angular.mock.$RAFDecorator = function($delegate) {
  var queue = [];
  var rafFn = function(fn) {
    var index = queue.length;
    queue.push(fn);
    return function() {
      queue.splice(index, 1);
    };
  };

  rafFn.supported = $delegate.supported;

  rafFn.flush = function() {
    if(queue.length === 0) {
      throw new Error('No rAF callbacks present');
    }

    var length = queue.length;
    for(var i=0;i<length;i++) {
      queue[i]();
    }

    queue = [];
  };

  return rafFn;
};

angular.mock.$AsyncCallbackDecorator = function($delegate) {
  var callbacks = [];
  var addFn = function(fn) {
    callbacks.push(fn);
  };
  addFn.flush = function() {
    angular.forEach(callbacks, function(fn) {
      fn();
    });
    callbacks = [];
  };
  return addFn;
};

/**
 *
 */
angular.mock.$RootElementProvider = function() {
  this.$get = function() {
    return angular.element('<div ng-app></div>');
  };
};

/**
 * @ngdoc module
 * @name ngMock
 * @description
 *
 * # ngMock
 *
 * The `ngMock` module providers support to inject and mock Angular services into unit tests.
 * In addition, ngMock also extends various core ng services such that they can be
 * inspected and controlled in a synchronous manner within test code.
 *
 *
 * <div doc-module-components="ngMock"></div>
 *
 */
angular.module('ngMock', ['ng']).provider({
  $browser: angular.mock.$BrowserProvider,
  $exceptionHandler: angular.mock.$ExceptionHandlerProvider,
  $log: angular.mock.$LogProvider,
  $interval: angular.mock.$IntervalProvider,
  $httpBackend: angular.mock.$HttpBackendProvider,
  $rootElement: angular.mock.$RootElementProvider
}).config(['$provide', function($provide) {
  $provide.decorator('$timeout', angular.mock.$TimeoutDecorator);
  $provide.decorator('$$rAF', angular.mock.$RAFDecorator);
  $provide.decorator('$$asyncCallback', angular.mock.$AsyncCallbackDecorator);
}]);

/**
 * @ngdoc module
 * @name ngMockE2E
 * @module ngMockE2E
 * @description
 *
 * The `ngMockE2E` is an angular module which contains mocks suitable for end-to-end testing.
 * Currently there is only one mock present in this module -
 * the {@link ngMockE2E.$httpBackend e2e $httpBackend} mock.
 */
angular.module('ngMockE2E', ['ng']).config(['$provide', function($provide) {
  $provide.decorator('$httpBackend', angular.mock.e2e.$httpBackendDecorator);
}]);

/**
 * @ngdoc service
 * @name $httpBackend
 * @module ngMockE2E
 * @description
 * Fake HTTP backend implementation suitable for end-to-end testing or backend-less development of
 * applications that use the {@link ng.$http $http service}.
 *
 * *Note*: For fake http backend implementation suitable for unit testing please see
 * {@link ngMock.$httpBackend unit-testing $httpBackend mock}.
 *
 * This implementation can be used to respond with static or dynamic responses via the `when` api
 * and its shortcuts (`whenGET`, `whenPOST`, etc) and optionally pass through requests to the
 * real $httpBackend for specific requests (e.g. to interact with certain remote apis or to fetch
 * templates from a webserver).
 *
 * As opposed to unit-testing, in an end-to-end testing scenario or in scenario when an application
 * is being developed with the real backend api replaced with a mock, it is often desirable for
 * certain category of requests to bypass the mock and issue a real http request (e.g. to fetch
 * templates or static files from the webserver). To configure the backend with this behavior
 * use the `passThrough` request handler of `when` instead of `respond`.
 *
 * Additionally, we don't want to manually have to flush mocked out requests like we do during unit
 * testing. For this reason the e2e $httpBackend automatically flushes mocked out requests
 * automatically, closely simulating the behavior of the XMLHttpRequest object.
 *
 * To setup the application to run with this http backend, you have to create a module that depends
 * on the `ngMockE2E` and your application modules and defines the fake backend:
 *
 * ```js
 *   myAppDev = angular.module('myAppDev', ['myApp', 'ngMockE2E']);
 *   myAppDev.run(function($httpBackend) {
 *     phones = [{name: 'phone1'}, {name: 'phone2'}];
 *
 *     // returns the current list of phones
 *     $httpBackend.whenGET('/phones').respond(phones);
 *
 *     // adds a new phone to the phones array
 *     $httpBackend.whenPOST('/phones').respond(function(method, url, data) {
 *       phones.push(angular.fromJson(data));
 *     });
 *     $httpBackend.whenGET(/^\/templates\//).passThrough();
 *     //...
 *   });
 * ```
 *
 * Afterwards, bootstrap your app with this new module.
 */

/**
 * @ngdoc method
 * @name $httpBackend#when
 * @module ngMockE2E
 * @description
 * Creates a new backend definition.
 *
 * @param {string} method HTTP method.
 * @param {string|RegExp} url HTTP url.
 * @param {(string|RegExp)=} data HTTP request body.
 * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
 *   object and returns true if the headers match the current definition.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 *
 *  - respond –
 *    `{function([status,] data[, headers, statusText])
 *    | function(function(method, url, data, headers)}`
 *    – The respond method takes a set of static data to be returned or a function that can return
 *    an array containing response status (number), response data (string), response headers
 *    (Object), and the text for the status (string).
 *  - passThrough – `{function()}` – Any request matching a backend definition with
 *    `passThrough` handler will be passed through to the real backend (an XHR request will be made
 *    to the server.)
 */

/**
 * @ngdoc method
 * @name $httpBackend#whenGET
 * @module ngMockE2E
 * @description
 * Creates a new backend definition for GET requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name $httpBackend#whenHEAD
 * @module ngMockE2E
 * @description
 * Creates a new backend definition for HEAD requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name $httpBackend#whenDELETE
 * @module ngMockE2E
 * @description
 * Creates a new backend definition for DELETE requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name $httpBackend#whenPOST
 * @module ngMockE2E
 * @description
 * Creates a new backend definition for POST requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(string|RegExp)=} data HTTP request body.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name $httpBackend#whenPUT
 * @module ngMockE2E
 * @description
 * Creates a new backend definition for PUT requests.  For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(string|RegExp)=} data HTTP request body.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name $httpBackend#whenPATCH
 * @module ngMockE2E
 * @description
 * Creates a new backend definition for PATCH requests.  For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @param {(string|RegExp)=} data HTTP request body.
 * @param {(Object|function(Object))=} headers HTTP headers.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */

/**
 * @ngdoc method
 * @name $httpBackend#whenJSONP
 * @module ngMockE2E
 * @description
 * Creates a new backend definition for JSONP requests. For more info see `when()`.
 *
 * @param {string|RegExp} url HTTP url.
 * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
 *   control how a matched request is handled.
 */
angular.mock.e2e = {};
angular.mock.e2e.$httpBackendDecorator =
  ['$rootScope', '$delegate', '$browser', createHttpBackendMock];


angular.mock.clearDataCache = function() {
  var key,
      cache = angular.element.cache;

  for(key in cache) {
    if (Object.prototype.hasOwnProperty.call(cache,key)) {
      var handle = cache[key].handle;

      handle && angular.element(handle.elem).off();
      delete cache[key];
    }
  }
};


if(window.jasmine || window.mocha) {

  var currentSpec = null,
      isSpecRunning = function() {
        return !!currentSpec;
      };


  beforeEach(function() {
    currentSpec = this;
  });

  afterEach(function() {
    var injector = currentSpec.$injector;

    currentSpec.$injector = null;
    currentSpec.$modules = null;
    currentSpec = null;

    if (injector) {
      injector.get('$rootElement').off();
      injector.get('$browser').pollFns.length = 0;
    }

    angular.mock.clearDataCache();

    // clean up jquery's fragment cache
    angular.forEach(angular.element.fragments, function(val, key) {
      delete angular.element.fragments[key];
    });

    MockXhr.$$lastInstance = null;

    angular.forEach(angular.callbacks, function(val, key) {
      delete angular.callbacks[key];
    });
    angular.callbacks.counter = 0;
  });

  /**
   * @ngdoc function
   * @name angular.mock.module
   * @description
   *
   * *NOTE*: This function is also published on window for easy access.<br>
   *
   * This function registers a module configuration code. It collects the configuration information
   * which will be used when the injector is created by {@link angular.mock.inject inject}.
   *
   * See {@link angular.mock.inject inject} for usage example
   *
   * @param {...(string|Function|Object)} fns any number of modules which are represented as string
   *        aliases or as anonymous module initialization functions. The modules are used to
   *        configure the injector. The 'ng' and 'ngMock' modules are automatically loaded. If an
   *        object literal is passed they will be register as values in the module, the key being
   *        the module name and the value being what is returned.
   */
  window.module = angular.mock.module = function() {
    var moduleFns = Array.prototype.slice.call(arguments, 0);
    return isSpecRunning() ? workFn() : workFn;
    /////////////////////
    function workFn() {
      if (currentSpec.$injector) {
        throw new Error('Injector already created, can not register a module!');
      } else {
        var modules = currentSpec.$modules || (currentSpec.$modules = []);
        angular.forEach(moduleFns, function(module) {
          if (angular.isObject(module) && !angular.isArray(module)) {
            modules.push(function($provide) {
              angular.forEach(module, function(value, key) {
                $provide.value(key, value);
              });
            });
          } else {
            modules.push(module);
          }
        });
      }
    }
  };

  /**
   * @ngdoc function
   * @name angular.mock.inject
   * @description
   *
   * *NOTE*: This function is also published on window for easy access.<br>
   *
   * The inject function wraps a function into an injectable function. The inject() creates new
   * instance of {@link auto.$injector $injector} per test, which is then used for
   * resolving references.
   *
   *
   * ## Resolving References (Underscore Wrapping)
   * Often, we would like to inject a reference once, in a `beforeEach()` block and reuse this
   * in multiple `it()` clauses. To be able to do this we must assign the reference to a variable
   * that is declared in the scope of the `describe()` block. Since we would, most likely, want
   * the variable to have the same name of the reference we have a problem, since the parameter
   * to the `inject()` function would hide the outer variable.
   *
   * To help with this, the injected parameters can, optionally, be enclosed with underscores.
   * These are ignored by the injector when the reference name is resolved.
   *
   * For example, the parameter `_myService_` would be resolved as the reference `myService`.
   * Since it is available in the function body as _myService_, we can then assign it to a variable
   * defined in an outer scope.
   *
   * ```
   * // Defined out reference variable outside
   * var myService;
   *
   * // Wrap the parameter in underscores
   * beforeEach( inject( function(_myService_){
   *   myService = _myService_;
   * }));
   *
   * // Use myService in a series of tests.
   * it('makes use of myService', function() {
   *   myService.doStuff();
   * });
   *
   * ```
   *
   * See also {@link angular.mock.module angular.mock.module}
   *
   * ## Example
   * Example of what a typical jasmine tests looks like with the inject method.
   * ```js
   *
   *   angular.module('myApplicationModule', [])
   *       .value('mode', 'app')
   *       .value('version', 'v1.0.1');
   *
   *
   *   describe('MyApp', function() {
   *
   *     // You need to load modules that you want to test,
   *     // it loads only the "ng" module by default.
   *     beforeEach(module('myApplicationModule'));
   *
   *
   *     // inject() is used to inject arguments of all given functions
   *     it('should provide a version', inject(function(mode, version) {
   *       expect(version).toEqual('v1.0.1');
   *       expect(mode).toEqual('app');
   *     }));
   *
   *
   *     // The inject and module method can also be used inside of the it or beforeEach
   *     it('should override a version and test the new version is injected', function() {
   *       // module() takes functions or strings (module aliases)
   *       module(function($provide) {
   *         $provide.value('version', 'overridden'); // override version here
   *       });
   *
   *       inject(function(version) {
   *         expect(version).toEqual('overridden');
   *       });
   *     });
   *   });
   *
   * ```
   *
   * @param {...Function} fns any number of functions which will be injected using the injector.
   */



  var ErrorAddingDeclarationLocationStack = function(e, errorForStack) {
    this.message = e.message;
    this.name = e.name;
    if (e.line) this.line = e.line;
    if (e.sourceId) this.sourceId = e.sourceId;
    if (e.stack && errorForStack)
      this.stack = e.stack + '\n' + errorForStack.stack;
    if (e.stackArray) this.stackArray = e.stackArray;
  };
  ErrorAddingDeclarationLocationStack.prototype.toString = Error.prototype.toString;

  window.inject = angular.mock.inject = function() {
    var blockFns = Array.prototype.slice.call(arguments, 0);
    var errorForStack = new Error('Declaration Location');
    return isSpecRunning() ? workFn.call(currentSpec) : workFn;
    /////////////////////
    function workFn() {
      var modules = currentSpec.$modules || [];

      modules.unshift('ngMock');
      modules.unshift('ng');
      var injector = currentSpec.$injector;
      if (!injector) {
        injector = currentSpec.$injector = angular.injector(modules);
      }
      for(var i = 0, ii = blockFns.length; i < ii; i++) {
        try {
          /* jshint -W040 *//* Jasmine explicitly provides a `this` object when calling functions */
          injector.invoke(blockFns[i] || angular.noop, this);
          /* jshint +W040 */
        } catch (e) {
          if (e.stack && errorForStack) {
            throw new ErrorAddingDeclarationLocationStack(e, errorForStack);
          }
          throw e;
        } finally {
          errorForStack = null;
        }
      }
    }
  };
}


})(window, window.angular);

},{}],"angular-mocks":[function(require,module,exports){
module.exports=require('e92gUC');
},{}],"iBmHg2":[function(require,module,exports){
require('./lib/angular.min.js');

module.exports = angular;

},{"./lib/angular.min.js":9}],"angular":[function(require,module,exports){
module.exports=require('iBmHg2');
},{}],9:[function(require,module,exports){
/*
 AngularJS v1.2.16
 (c) 2010-2014 Google, Inc. http://angularjs.org
 License: MIT
*/
(function(O,U,s){'use strict';function t(b){return function(){var a=arguments[0],c,a="["+(b?b+":":"")+a+"] http://errors.angularjs.org/1.2.16/"+(b?b+"/":"")+a;for(c=1;c<arguments.length;c++)a=a+(1==c?"?":"&")+"p"+(c-1)+"="+encodeURIComponent("function"==typeof arguments[c]?arguments[c].toString().replace(/ \{[\s\S]*$/,""):"undefined"==typeof arguments[c]?"undefined":"string"!=typeof arguments[c]?JSON.stringify(arguments[c]):arguments[c]);return Error(a)}}function ab(b){if(null==b||Ca(b))return!1;
var a=b.length;return 1===b.nodeType&&a?!0:w(b)||M(b)||0===a||"number"===typeof a&&0<a&&a-1 in b}function q(b,a,c){var d;if(b)if(P(b))for(d in b)"prototype"==d||("length"==d||"name"==d||b.hasOwnProperty&&!b.hasOwnProperty(d))||a.call(c,b[d],d);else if(b.forEach&&b.forEach!==q)b.forEach(a,c);else if(ab(b))for(d=0;d<b.length;d++)a.call(c,b[d],d);else for(d in b)b.hasOwnProperty(d)&&a.call(c,b[d],d);return b}function Qb(b){var a=[],c;for(c in b)b.hasOwnProperty(c)&&a.push(c);return a.sort()}function Sc(b,
a,c){for(var d=Qb(b),e=0;e<d.length;e++)a.call(c,b[d[e]],d[e]);return d}function Rb(b){return function(a,c){b(c,a)}}function bb(){for(var b=ka.length,a;b;){b--;a=ka[b].charCodeAt(0);if(57==a)return ka[b]="A",ka.join("");if(90==a)ka[b]="0";else return ka[b]=String.fromCharCode(a+1),ka.join("")}ka.unshift("0");return ka.join("")}function Sb(b,a){a?b.$$hashKey=a:delete b.$$hashKey}function D(b){var a=b.$$hashKey;q(arguments,function(a){a!==b&&q(a,function(a,c){b[c]=a})});Sb(b,a);return b}function Y(b){return parseInt(b,
10)}function Tb(b,a){return D(new (D(function(){},{prototype:b})),a)}function C(){}function Da(b){return b}function aa(b){return function(){return b}}function E(b){return"undefined"===typeof b}function B(b){return"undefined"!==typeof b}function X(b){return null!=b&&"object"===typeof b}function w(b){return"string"===typeof b}function vb(b){return"number"===typeof b}function Na(b){return"[object Date]"===wa.call(b)}function M(b){return"[object Array]"===wa.call(b)}function P(b){return"function"===typeof b}
function cb(b){return"[object RegExp]"===wa.call(b)}function Ca(b){return b&&b.document&&b.location&&b.alert&&b.setInterval}function Tc(b){return!(!b||!(b.nodeName||b.prop&&b.attr&&b.find))}function Uc(b,a,c){var d=[];q(b,function(b,g,f){d.push(a.call(c,b,g,f))});return d}function db(b,a){if(b.indexOf)return b.indexOf(a);for(var c=0;c<b.length;c++)if(a===b[c])return c;return-1}function Oa(b,a){var c=db(b,a);0<=c&&b.splice(c,1);return a}function ba(b,a){if(Ca(b)||b&&b.$evalAsync&&b.$watch)throw Pa("cpws");
if(a){if(b===a)throw Pa("cpi");if(M(b))for(var c=a.length=0;c<b.length;c++)a.push(ba(b[c]));else{c=a.$$hashKey;q(a,function(b,c){delete a[c]});for(var d in b)a[d]=ba(b[d]);Sb(a,c)}}else(a=b)&&(M(b)?a=ba(b,[]):Na(b)?a=new Date(b.getTime()):cb(b)?a=RegExp(b.source):X(b)&&(a=ba(b,{})));return a}function Ub(b,a){a=a||{};for(var c in b)!b.hasOwnProperty(c)||"$"===c.charAt(0)&&"$"===c.charAt(1)||(a[c]=b[c]);return a}function xa(b,a){if(b===a)return!0;if(null===b||null===a)return!1;if(b!==b&&a!==a)return!0;
var c=typeof b,d;if(c==typeof a&&"object"==c)if(M(b)){if(!M(a))return!1;if((c=b.length)==a.length){for(d=0;d<c;d++)if(!xa(b[d],a[d]))return!1;return!0}}else{if(Na(b))return Na(a)&&b.getTime()==a.getTime();if(cb(b)&&cb(a))return b.toString()==a.toString();if(b&&b.$evalAsync&&b.$watch||a&&a.$evalAsync&&a.$watch||Ca(b)||Ca(a)||M(a))return!1;c={};for(d in b)if("$"!==d.charAt(0)&&!P(b[d])){if(!xa(b[d],a[d]))return!1;c[d]=!0}for(d in a)if(!c.hasOwnProperty(d)&&"$"!==d.charAt(0)&&a[d]!==s&&!P(a[d]))return!1;
return!0}return!1}function Vb(){return U.securityPolicy&&U.securityPolicy.isActive||U.querySelector&&!(!U.querySelector("[ng-csp]")&&!U.querySelector("[data-ng-csp]"))}function eb(b,a){var c=2<arguments.length?ya.call(arguments,2):[];return!P(a)||a instanceof RegExp?a:c.length?function(){return arguments.length?a.apply(b,c.concat(ya.call(arguments,0))):a.apply(b,c)}:function(){return arguments.length?a.apply(b,arguments):a.call(b)}}function Vc(b,a){var c=a;"string"===typeof b&&"$"===b.charAt(0)?c=
s:Ca(a)?c="$WINDOW":a&&U===a?c="$DOCUMENT":a&&(a.$evalAsync&&a.$watch)&&(c="$SCOPE");return c}function qa(b,a){return"undefined"===typeof b?s:JSON.stringify(b,Vc,a?"  ":null)}function Wb(b){return w(b)?JSON.parse(b):b}function Qa(b){"function"===typeof b?b=!0:b&&0!==b.length?(b=K(""+b),b=!("f"==b||"0"==b||"false"==b||"no"==b||"n"==b||"[]"==b)):b=!1;return b}function ha(b){b=y(b).clone();try{b.empty()}catch(a){}var c=y("<div>").append(b).html();try{return 3===b[0].nodeType?K(c):c.match(/^(<[^>]+>)/)[1].replace(/^<([\w\-]+)/,
function(a,b){return"<"+K(b)})}catch(d){return K(c)}}function Xb(b){try{return decodeURIComponent(b)}catch(a){}}function Yb(b){var a={},c,d;q((b||"").split("&"),function(b){b&&(c=b.split("="),d=Xb(c[0]),B(d)&&(b=B(c[1])?Xb(c[1]):!0,a[d]?M(a[d])?a[d].push(b):a[d]=[a[d],b]:a[d]=b))});return a}function Zb(b){var a=[];q(b,function(b,d){M(b)?q(b,function(b){a.push(za(d,!0)+(!0===b?"":"="+za(b,!0)))}):a.push(za(d,!0)+(!0===b?"":"="+za(b,!0)))});return a.length?a.join("&"):""}function wb(b){return za(b,
!0).replace(/%26/gi,"&").replace(/%3D/gi,"=").replace(/%2B/gi,"+")}function za(b,a){return encodeURIComponent(b).replace(/%40/gi,"@").replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,a?"%20":"+")}function Wc(b,a){function c(a){a&&d.push(a)}var d=[b],e,g,f=["ng:app","ng-app","x-ng-app","data-ng-app"],h=/\sng[:\-]app(:\s*([\w\d_]+);?)?\s/;q(f,function(a){f[a]=!0;c(U.getElementById(a));a=a.replace(":","\\:");b.querySelectorAll&&(q(b.querySelectorAll("."+a),c),q(b.querySelectorAll("."+
a+"\\:"),c),q(b.querySelectorAll("["+a+"]"),c))});q(d,function(a){if(!e){var b=h.exec(" "+a.className+" ");b?(e=a,g=(b[2]||"").replace(/\s+/g,",")):q(a.attributes,function(b){!e&&f[b.name]&&(e=a,g=b.value)})}});e&&a(e,g?[g]:[])}function $b(b,a){var c=function(){b=y(b);if(b.injector()){var c=b[0]===U?"document":ha(b);throw Pa("btstrpd",c);}a=a||[];a.unshift(["$provide",function(a){a.value("$rootElement",b)}]);a.unshift("ng");c=ac(a);c.invoke(["$rootScope","$rootElement","$compile","$injector","$animate",
function(a,b,c,d,e){a.$apply(function(){b.data("$injector",d);c(b)(a)})}]);return c},d=/^NG_DEFER_BOOTSTRAP!/;if(O&&!d.test(O.name))return c();O.name=O.name.replace(d,"");Ea.resumeBootstrap=function(b){q(b,function(b){a.push(b)});c()}}function fb(b,a){a=a||"_";return b.replace(Xc,function(b,d){return(d?a:"")+b.toLowerCase()})}function xb(b,a,c){if(!b)throw Pa("areq",a||"?",c||"required");return b}function Ra(b,a,c){c&&M(b)&&(b=b[b.length-1]);xb(P(b),a,"not a function, got "+(b&&"object"==typeof b?
b.constructor.name||"Object":typeof b));return b}function Aa(b,a){if("hasOwnProperty"===b)throw Pa("badname",a);}function bc(b,a,c){if(!a)return b;a=a.split(".");for(var d,e=b,g=a.length,f=0;f<g;f++)d=a[f],b&&(b=(e=b)[d]);return!c&&P(b)?eb(e,b):b}function yb(b){var a=b[0];b=b[b.length-1];if(a===b)return y(a);var c=[a];do{a=a.nextSibling;if(!a)break;c.push(a)}while(a!==b);return y(c)}function Yc(b){var a=t("$injector"),c=t("ng");b=b.angular||(b.angular={});b.$$minErr=b.$$minErr||t;return b.module||
(b.module=function(){var b={};return function(e,g,f){if("hasOwnProperty"===e)throw c("badname","module");g&&b.hasOwnProperty(e)&&(b[e]=null);return b[e]||(b[e]=function(){function b(a,d,e){return function(){c[e||"push"]([a,d,arguments]);return n}}if(!g)throw a("nomod",e);var c=[],d=[],m=b("$injector","invoke"),n={_invokeQueue:c,_runBlocks:d,requires:g,name:e,provider:b("$provide","provider"),factory:b("$provide","factory"),service:b("$provide","service"),value:b("$provide","value"),constant:b("$provide",
"constant","unshift"),animation:b("$animateProvider","register"),filter:b("$filterProvider","register"),controller:b("$controllerProvider","register"),directive:b("$compileProvider","directive"),config:m,run:function(a){d.push(a);return this}};f&&m(f);return n}())}}())}function Zc(b){D(b,{bootstrap:$b,copy:ba,extend:D,equals:xa,element:y,forEach:q,injector:ac,noop:C,bind:eb,toJson:qa,fromJson:Wb,identity:Da,isUndefined:E,isDefined:B,isString:w,isFunction:P,isObject:X,isNumber:vb,isElement:Tc,isArray:M,
version:$c,isDate:Na,lowercase:K,uppercase:Fa,callbacks:{counter:0},$$minErr:t,$$csp:Vb});Sa=Yc(O);try{Sa("ngLocale")}catch(a){Sa("ngLocale",[]).provider("$locale",ad)}Sa("ng",["ngLocale"],["$provide",function(a){a.provider({$$sanitizeUri:bd});a.provider("$compile",cc).directive({a:cd,input:dc,textarea:dc,form:dd,script:ed,select:fd,style:gd,option:hd,ngBind:id,ngBindHtml:jd,ngBindTemplate:kd,ngClass:ld,ngClassEven:md,ngClassOdd:nd,ngCloak:od,ngController:pd,ngForm:qd,ngHide:rd,ngIf:sd,ngInclude:td,
ngInit:ud,ngNonBindable:vd,ngPluralize:wd,ngRepeat:xd,ngShow:yd,ngStyle:zd,ngSwitch:Ad,ngSwitchWhen:Bd,ngSwitchDefault:Cd,ngOptions:Dd,ngTransclude:Ed,ngModel:Fd,ngList:Gd,ngChange:Hd,required:ec,ngRequired:ec,ngValue:Id}).directive({ngInclude:Jd}).directive(zb).directive(fc);a.provider({$anchorScroll:Kd,$animate:Ld,$browser:Md,$cacheFactory:Nd,$controller:Od,$document:Pd,$exceptionHandler:Qd,$filter:gc,$interpolate:Rd,$interval:Sd,$http:Td,$httpBackend:Ud,$location:Vd,$log:Wd,$parse:Xd,$rootScope:Yd,
$q:Zd,$sce:$d,$sceDelegate:ae,$sniffer:be,$templateCache:ce,$timeout:de,$window:ee,$$rAF:fe,$$asyncCallback:ge})}])}function Ta(b){return b.replace(he,function(a,b,d,e){return e?d.toUpperCase():d}).replace(ie,"Moz$1")}function Ab(b,a,c,d){function e(b){var e=c&&b?[this.filter(b)]:[this],l=a,k,m,n,p,r,z;if(!d||null!=b)for(;e.length;)for(k=e.shift(),m=0,n=k.length;m<n;m++)for(p=y(k[m]),l?p.triggerHandler("$destroy"):l=!l,r=0,p=(z=p.children()).length;r<p;r++)e.push(Ga(z[r]));return g.apply(this,arguments)}
var g=Ga.fn[b],g=g.$original||g;e.$original=g;Ga.fn[b]=e}function N(b){if(b instanceof N)return b;w(b)&&(b=ca(b));if(!(this instanceof N)){if(w(b)&&"<"!=b.charAt(0))throw Bb("nosel");return new N(b)}if(w(b)){var a=b;b=U;var c;if(c=je.exec(a))b=[b.createElement(c[1])];else{var d=b,e;b=d.createDocumentFragment();c=[];if(Cb.test(a)){d=b.appendChild(d.createElement("div"));e=(ke.exec(a)||["",""])[1].toLowerCase();e=ea[e]||ea._default;d.innerHTML="<div>&#160;</div>"+e[1]+a.replace(le,"<$1></$2>")+e[2];
d.removeChild(d.firstChild);for(a=e[0];a--;)d=d.lastChild;a=0;for(e=d.childNodes.length;a<e;++a)c.push(d.childNodes[a]);d=b.firstChild;d.textContent=""}else c.push(d.createTextNode(a));b.textContent="";b.innerHTML="";b=c}Db(this,b);y(U.createDocumentFragment()).append(this)}else Db(this,b)}function Eb(b){return b.cloneNode(!0)}function Ha(b){hc(b);var a=0;for(b=b.childNodes||[];a<b.length;a++)Ha(b[a])}function ic(b,a,c,d){if(B(d))throw Bb("offargs");var e=la(b,"events");la(b,"handle")&&(E(a)?q(e,
function(a,c){Fb(b,c,a);delete e[c]}):q(a.split(" "),function(a){E(c)?(Fb(b,a,e[a]),delete e[a]):Oa(e[a]||[],c)}))}function hc(b,a){var c=b[gb],d=Ua[c];d&&(a?delete Ua[c].data[a]:(d.handle&&(d.events.$destroy&&d.handle({},"$destroy"),ic(b)),delete Ua[c],b[gb]=s))}function la(b,a,c){var d=b[gb],d=Ua[d||-1];if(B(c))d||(b[gb]=d=++me,d=Ua[d]={}),d[a]=c;else return d&&d[a]}function jc(b,a,c){var d=la(b,"data"),e=B(c),g=!e&&B(a),f=g&&!X(a);d||f||la(b,"data",d={});if(e)d[a]=c;else if(g){if(f)return d&&d[a];
D(d,a)}else return d}function Gb(b,a){return b.getAttribute?-1<(" "+(b.getAttribute("class")||"")+" ").replace(/[\n\t]/g," ").indexOf(" "+a+" "):!1}function hb(b,a){a&&b.setAttribute&&q(a.split(" "),function(a){b.setAttribute("class",ca((" "+(b.getAttribute("class")||"")+" ").replace(/[\n\t]/g," ").replace(" "+ca(a)+" "," ")))})}function ib(b,a){if(a&&b.setAttribute){var c=(" "+(b.getAttribute("class")||"")+" ").replace(/[\n\t]/g," ");q(a.split(" "),function(a){a=ca(a);-1===c.indexOf(" "+a+" ")&&
(c+=a+" ")});b.setAttribute("class",ca(c))}}function Db(b,a){if(a){a=a.nodeName||!B(a.length)||Ca(a)?[a]:a;for(var c=0;c<a.length;c++)b.push(a[c])}}function kc(b,a){return jb(b,"$"+(a||"ngController")+"Controller")}function jb(b,a,c){b=y(b);9==b[0].nodeType&&(b=b.find("html"));for(a=M(a)?a:[a];b.length;){for(var d=b[0],e=0,g=a.length;e<g;e++)if((c=b.data(a[e]))!==s)return c;b=y(d.parentNode||11===d.nodeType&&d.host)}}function lc(b){for(var a=0,c=b.childNodes;a<c.length;a++)Ha(c[a]);for(;b.firstChild;)b.removeChild(b.firstChild)}
function mc(b,a){var c=kb[a.toLowerCase()];return c&&nc[b.nodeName]&&c}function ne(b,a){var c=function(c,e){c.preventDefault||(c.preventDefault=function(){c.returnValue=!1});c.stopPropagation||(c.stopPropagation=function(){c.cancelBubble=!0});c.target||(c.target=c.srcElement||U);if(E(c.defaultPrevented)){var g=c.preventDefault;c.preventDefault=function(){c.defaultPrevented=!0;g.call(c)};c.defaultPrevented=!1}c.isDefaultPrevented=function(){return c.defaultPrevented||!1===c.returnValue};var f=Ub(a[e||
c.type]||[]);q(f,function(a){a.call(b,c)});8>=S?(c.preventDefault=null,c.stopPropagation=null,c.isDefaultPrevented=null):(delete c.preventDefault,delete c.stopPropagation,delete c.isDefaultPrevented)};c.elem=b;return c}function Ia(b){var a=typeof b,c;"object"==a&&null!==b?"function"==typeof(c=b.$$hashKey)?c=b.$$hashKey():c===s&&(c=b.$$hashKey=bb()):c=b;return a+":"+c}function Va(b){q(b,this.put,this)}function oc(b){var a,c;"function"==typeof b?(a=b.$inject)||(a=[],b.length&&(c=b.toString().replace(oe,
""),c=c.match(pe),q(c[1].split(qe),function(b){b.replace(re,function(b,c,d){a.push(d)})})),b.$inject=a):M(b)?(c=b.length-1,Ra(b[c],"fn"),a=b.slice(0,c)):Ra(b,"fn",!0);return a}function ac(b){function a(a){return function(b,c){if(X(b))q(b,Rb(a));else return a(b,c)}}function c(a,b){Aa(a,"service");if(P(b)||M(b))b=n.instantiate(b);if(!b.$get)throw Wa("pget",a);return m[a+h]=b}function d(a,b){return c(a,{$get:b})}function e(a){var b=[],c,d,g,h;q(a,function(a){if(!k.get(a)){k.put(a,!0);try{if(w(a))for(c=
Sa(a),b=b.concat(e(c.requires)).concat(c._runBlocks),d=c._invokeQueue,g=0,h=d.length;g<h;g++){var f=d[g],l=n.get(f[0]);l[f[1]].apply(l,f[2])}else P(a)?b.push(n.invoke(a)):M(a)?b.push(n.invoke(a)):Ra(a,"module")}catch(m){throw M(a)&&(a=a[a.length-1]),m.message&&(m.stack&&-1==m.stack.indexOf(m.message))&&(m=m.message+"\n"+m.stack),Wa("modulerr",a,m.stack||m.message||m);}}});return b}function g(a,b){function c(d){if(a.hasOwnProperty(d)){if(a[d]===f)throw Wa("cdep",l.join(" <- "));return a[d]}try{return l.unshift(d),
a[d]=f,a[d]=b(d)}catch(e){throw a[d]===f&&delete a[d],e;}finally{l.shift()}}function d(a,b,e){var g=[],h=oc(a),f,l,k;l=0;for(f=h.length;l<f;l++){k=h[l];if("string"!==typeof k)throw Wa("itkn",k);g.push(e&&e.hasOwnProperty(k)?e[k]:c(k))}a.$inject||(a=a[f]);return a.apply(b,g)}return{invoke:d,instantiate:function(a,b){var c=function(){},e;c.prototype=(M(a)?a[a.length-1]:a).prototype;c=new c;e=d(a,c,b);return X(e)||P(e)?e:c},get:c,annotate:oc,has:function(b){return m.hasOwnProperty(b+h)||a.hasOwnProperty(b)}}}
var f={},h="Provider",l=[],k=new Va,m={$provide:{provider:a(c),factory:a(d),service:a(function(a,b){return d(a,["$injector",function(a){return a.instantiate(b)}])}),value:a(function(a,b){return d(a,aa(b))}),constant:a(function(a,b){Aa(a,"constant");m[a]=b;p[a]=b}),decorator:function(a,b){var c=n.get(a+h),d=c.$get;c.$get=function(){var a=r.invoke(d,c);return r.invoke(b,null,{$delegate:a})}}}},n=m.$injector=g(m,function(){throw Wa("unpr",l.join(" <- "));}),p={},r=p.$injector=g(p,function(a){a=n.get(a+
h);return r.invoke(a.$get,a)});q(e(b),function(a){r.invoke(a||C)});return r}function Kd(){var b=!0;this.disableAutoScrolling=function(){b=!1};this.$get=["$window","$location","$rootScope",function(a,c,d){function e(a){var b=null;q(a,function(a){b||"a"!==K(a.nodeName)||(b=a)});return b}function g(){var b=c.hash(),d;b?(d=f.getElementById(b))?d.scrollIntoView():(d=e(f.getElementsByName(b)))?d.scrollIntoView():"top"===b&&a.scrollTo(0,0):a.scrollTo(0,0)}var f=a.document;b&&d.$watch(function(){return c.hash()},
function(){d.$evalAsync(g)});return g}]}function ge(){this.$get=["$$rAF","$timeout",function(b,a){return b.supported?function(a){return b(a)}:function(b){return a(b,0,!1)}}]}function se(b,a,c,d){function e(a){try{a.apply(null,ya.call(arguments,1))}finally{if(z--,0===z)for(;u.length;)try{u.pop()()}catch(b){c.error(b)}}}function g(a,b){(function T(){q(F,function(a){a()});v=b(T,a)})()}function f(){x=null;J!=h.url()&&(J=h.url(),q(ma,function(a){a(h.url())}))}var h=this,l=a[0],k=b.location,m=b.history,
n=b.setTimeout,p=b.clearTimeout,r={};h.isMock=!1;var z=0,u=[];h.$$completeOutstandingRequest=e;h.$$incOutstandingRequestCount=function(){z++};h.notifyWhenNoOutstandingRequests=function(a){q(F,function(a){a()});0===z?a():u.push(a)};var F=[],v;h.addPollFn=function(a){E(v)&&g(100,n);F.push(a);return a};var J=k.href,A=a.find("base"),x=null;h.url=function(a,c){k!==b.location&&(k=b.location);m!==b.history&&(m=b.history);if(a){if(J!=a)return J=a,d.history?c?m.replaceState(null,"",a):(m.pushState(null,"",
a),A.attr("href",A.attr("href"))):(x=a,c?k.replace(a):k.href=a),h}else return x||k.href.replace(/%27/g,"'")};var ma=[],L=!1;h.onUrlChange=function(a){if(!L){if(d.history)y(b).on("popstate",f);if(d.hashchange)y(b).on("hashchange",f);else h.addPollFn(f);L=!0}ma.push(a);return a};h.baseHref=function(){var a=A.attr("href");return a?a.replace(/^(https?\:)?\/\/[^\/]*/,""):""};var Q={},da="",H=h.baseHref();h.cookies=function(a,b){var d,e,g,h;if(a)b===s?l.cookie=escape(a)+"=;path="+H+";expires=Thu, 01 Jan 1970 00:00:00 GMT":
w(b)&&(d=(l.cookie=escape(a)+"="+escape(b)+";path="+H).length+1,4096<d&&c.warn("Cookie '"+a+"' possibly not set or overflowed because it was too large ("+d+" > 4096 bytes)!"));else{if(l.cookie!==da)for(da=l.cookie,d=da.split("; "),Q={},g=0;g<d.length;g++)e=d[g],h=e.indexOf("="),0<h&&(a=unescape(e.substring(0,h)),Q[a]===s&&(Q[a]=unescape(e.substring(h+1))));return Q}};h.defer=function(a,b){var c;z++;c=n(function(){delete r[c];e(a)},b||0);r[c]=!0;return c};h.defer.cancel=function(a){return r[a]?(delete r[a],
p(a),e(C),!0):!1}}function Md(){this.$get=["$window","$log","$sniffer","$document",function(b,a,c,d){return new se(b,d,a,c)}]}function Nd(){this.$get=function(){function b(b,d){function e(a){a!=n&&(p?p==a&&(p=a.n):p=a,g(a.n,a.p),g(a,n),n=a,n.n=null)}function g(a,b){a!=b&&(a&&(a.p=b),b&&(b.n=a))}if(b in a)throw t("$cacheFactory")("iid",b);var f=0,h=D({},d,{id:b}),l={},k=d&&d.capacity||Number.MAX_VALUE,m={},n=null,p=null;return a[b]={put:function(a,b){if(k<Number.MAX_VALUE){var c=m[a]||(m[a]={key:a});
e(c)}if(!E(b))return a in l||f++,l[a]=b,f>k&&this.remove(p.key),b},get:function(a){if(k<Number.MAX_VALUE){var b=m[a];if(!b)return;e(b)}return l[a]},remove:function(a){if(k<Number.MAX_VALUE){var b=m[a];if(!b)return;b==n&&(n=b.p);b==p&&(p=b.n);g(b.n,b.p);delete m[a]}delete l[a];f--},removeAll:function(){l={};f=0;m={};n=p=null},destroy:function(){m=h=l=null;delete a[b]},info:function(){return D({},h,{size:f})}}}var a={};b.info=function(){var b={};q(a,function(a,e){b[e]=a.info()});return b};b.get=function(b){return a[b]};
return b}}function ce(){this.$get=["$cacheFactory",function(b){return b("templates")}]}function cc(b,a){var c={},d="Directive",e=/^\s*directive\:\s*([\d\w\-_]+)\s+(.*)$/,g=/(([\d\w\-_]+)(?:\:([^;]+))?;?)/,f=/^(on[a-z]+|formaction)$/;this.directive=function l(a,e){Aa(a,"directive");w(a)?(xb(e,"directiveFactory"),c.hasOwnProperty(a)||(c[a]=[],b.factory(a+d,["$injector","$exceptionHandler",function(b,d){var e=[];q(c[a],function(c,g){try{var f=b.invoke(c);P(f)?f={compile:aa(f)}:!f.compile&&f.link&&(f.compile=
aa(f.link));f.priority=f.priority||0;f.index=g;f.name=f.name||a;f.require=f.require||f.controller&&f.name;f.restrict=f.restrict||"A";e.push(f)}catch(l){d(l)}});return e}])),c[a].push(e)):q(a,Rb(l));return this};this.aHrefSanitizationWhitelist=function(b){return B(b)?(a.aHrefSanitizationWhitelist(b),this):a.aHrefSanitizationWhitelist()};this.imgSrcSanitizationWhitelist=function(b){return B(b)?(a.imgSrcSanitizationWhitelist(b),this):a.imgSrcSanitizationWhitelist()};this.$get=["$injector","$interpolate",
"$exceptionHandler","$http","$templateCache","$parse","$controller","$rootScope","$document","$sce","$animate","$$sanitizeUri",function(a,b,m,n,p,r,z,u,F,v,J,A){function x(a,b,c,d,e){a instanceof y||(a=y(a));q(a,function(b,c){3==b.nodeType&&b.nodeValue.match(/\S+/)&&(a[c]=y(b).wrap("<span></span>").parent()[0])});var g=L(a,b,a,c,d,e);ma(a,"ng-scope");return function(b,c,d){xb(b,"scope");var e=c?Ja.clone.call(a):a;q(d,function(a,b){e.data("$"+b+"Controller",a)});d=0;for(var f=e.length;d<f;d++){var l=
e[d].nodeType;1!==l&&9!==l||e.eq(d).data("$scope",b)}c&&c(e,b);g&&g(b,e,e);return e}}function ma(a,b){try{a.addClass(b)}catch(c){}}function L(a,b,c,d,e,g){function f(a,c,d,e){var g,k,m,r,n,p,z;g=c.length;var I=Array(g);for(n=0;n<g;n++)I[n]=c[n];z=n=0;for(p=l.length;n<p;z++)k=I[z],c=l[n++],g=l[n++],m=y(k),c?(c.scope?(r=a.$new(),m.data("$scope",r)):r=a,(m=c.transclude)||!e&&b?c(g,r,k,d,Q(a,m||b)):c(g,r,k,d,e)):g&&g(a,k.childNodes,s,e)}for(var l=[],k,m,r,n,p=0;p<a.length;p++)k=new Hb,m=da(a[p],[],k,
0===p?d:s,e),(g=m.length?ia(m,a[p],k,b,c,null,[],[],g):null)&&g.scope&&ma(y(a[p]),"ng-scope"),k=g&&g.terminal||!(r=a[p].childNodes)||!r.length?null:L(r,g?g.transclude:b),l.push(g,k),n=n||g||k,g=null;return n?f:null}function Q(a,b){return function(c,d,e){var g=!1;c||(c=a.$new(),g=c.$$transcluded=!0);d=b(c,d,e);if(g)d.on("$destroy",eb(c,c.$destroy));return d}}function da(a,b,c,d,f){var k=c.$attr,l;switch(a.nodeType){case 1:T(b,na(Ka(a).toLowerCase()),"E",d,f);var m,r,n;l=a.attributes;for(var p=0,z=
l&&l.length;p<z;p++){var u=!1,F=!1;m=l[p];if(!S||8<=S||m.specified){r=m.name;n=na(r);W.test(n)&&(r=fb(n.substr(6),"-"));var J=n.replace(/(Start|End)$/,"");n===J+"Start"&&(u=r,F=r.substr(0,r.length-5)+"end",r=r.substr(0,r.length-6));n=na(r.toLowerCase());k[n]=r;c[n]=m=ca(m.value);mc(a,n)&&(c[n]=!0);N(a,b,m,n);T(b,n,"A",d,f,u,F)}}a=a.className;if(w(a)&&""!==a)for(;l=g.exec(a);)n=na(l[2]),T(b,n,"C",d,f)&&(c[n]=ca(l[3])),a=a.substr(l.index+l[0].length);break;case 3:t(b,a.nodeValue);break;case 8:try{if(l=
e.exec(a.nodeValue))n=na(l[1]),T(b,n,"M",d,f)&&(c[n]=ca(l[2]))}catch(x){}}b.sort(E);return b}function H(a,b,c){var d=[],e=0;if(b&&a.hasAttribute&&a.hasAttribute(b)){do{if(!a)throw ja("uterdir",b,c);1==a.nodeType&&(a.hasAttribute(b)&&e++,a.hasAttribute(c)&&e--);d.push(a);a=a.nextSibling}while(0<e)}else d.push(a);return y(d)}function R(a,b,c){return function(d,e,g,f,l){e=H(e[0],b,c);return a(d,e,g,f,l)}}function ia(a,c,d,e,g,f,l,n,p){function u(a,b,c,d){if(a){c&&(a=R(a,c,d));a.require=G.require;if(Q===
G||G.$$isolateScope)a=qc(a,{isolateScope:!0});l.push(a)}if(b){c&&(b=R(b,c,d));b.require=G.require;if(Q===G||G.$$isolateScope)b=qc(b,{isolateScope:!0});n.push(b)}}function F(a,b,c){var d,e="data",g=!1;if(w(a)){for(;"^"==(d=a.charAt(0))||"?"==d;)a=a.substr(1),"^"==d&&(e="inheritedData"),g=g||"?"==d;d=null;c&&"data"===e&&(d=c[a]);d=d||b[e]("$"+a+"Controller");if(!d&&!g)throw ja("ctreq",a,t);}else M(a)&&(d=[],q(a,function(a){d.push(F(a,b,c))}));return d}function J(a,e,g,f,p){function u(a,b){var c;2>arguments.length&&
(b=a,a=s);D&&(c=lb);return p(a,b,c)}var I,x,v,A,R,H,lb={},da;I=c===g?d:Ub(d,new Hb(y(g),d.$attr));x=I.$$element;if(Q){var T=/^\s*([@=&])(\??)\s*(\w*)\s*$/;f=y(g);H=e.$new(!0);ia&&ia===Q.$$originalDirective?f.data("$isolateScope",H):f.data("$isolateScopeNoTemplate",H);ma(f,"ng-isolate-scope");q(Q.scope,function(a,c){var d=a.match(T)||[],g=d[3]||c,f="?"==d[2],d=d[1],l,m,n,p;H.$$isolateBindings[c]=d+g;switch(d){case "@":I.$observe(g,function(a){H[c]=a});I.$$observers[g].$$scope=e;I[g]&&(H[c]=b(I[g])(e));
break;case "=":if(f&&!I[g])break;m=r(I[g]);p=m.literal?xa:function(a,b){return a===b};n=m.assign||function(){l=H[c]=m(e);throw ja("nonassign",I[g],Q.name);};l=H[c]=m(e);H.$watch(function(){var a=m(e);p(a,H[c])||(p(a,l)?n(e,a=H[c]):H[c]=a);return l=a},null,m.literal);break;case "&":m=r(I[g]);H[c]=function(a){return m(e,a)};break;default:throw ja("iscp",Q.name,c,a);}})}da=p&&u;L&&q(L,function(a){var b={$scope:a===Q||a.$$isolateScope?H:e,$element:x,$attrs:I,$transclude:da},c;R=a.controller;"@"==R&&(R=
I[a.name]);c=z(R,b);lb[a.name]=c;D||x.data("$"+a.name+"Controller",c);a.controllerAs&&(b.$scope[a.controllerAs]=c)});f=0;for(v=l.length;f<v;f++)try{A=l[f],A(A.isolateScope?H:e,x,I,A.require&&F(A.require,x,lb),da)}catch(G){m(G,ha(x))}f=e;Q&&(Q.template||null===Q.templateUrl)&&(f=H);a&&a(f,g.childNodes,s,p);for(f=n.length-1;0<=f;f--)try{A=n[f],A(A.isolateScope?H:e,x,I,A.require&&F(A.require,x,lb),da)}catch(B){m(B,ha(x))}}p=p||{};for(var v=-Number.MAX_VALUE,A,L=p.controllerDirectives,Q=p.newIsolateScopeDirective,
ia=p.templateDirective,T=p.nonTlbTranscludeDirective,E=!1,D=p.hasElementTranscludeDirective,Z=d.$$element=y(c),G,t,V,Xa=e,O,N=0,S=a.length;N<S;N++){G=a[N];var ra=G.$$start,W=G.$$end;ra&&(Z=H(c,ra,W));V=s;if(v>G.priority)break;if(V=G.scope)A=A||G,G.templateUrl||(K("new/isolated scope",Q,G,Z),X(V)&&(Q=G));t=G.name;!G.templateUrl&&G.controller&&(V=G.controller,L=L||{},K("'"+t+"' controller",L[t],G,Z),L[t]=G);if(V=G.transclude)E=!0,G.$$tlb||(K("transclusion",T,G,Z),T=G),"element"==V?(D=!0,v=G.priority,
V=H(c,ra,W),Z=d.$$element=y(U.createComment(" "+t+": "+d[t]+" ")),c=Z[0],mb(g,y(ya.call(V,0)),c),Xa=x(V,e,v,f&&f.name,{nonTlbTranscludeDirective:T})):(V=y(Eb(c)).contents(),Z.empty(),Xa=x(V,e));if(G.template)if(K("template",ia,G,Z),ia=G,V=P(G.template)?G.template(Z,d):G.template,V=Y(V),G.replace){f=G;V=Cb.test(V)?y(V):[];c=V[0];if(1!=V.length||1!==c.nodeType)throw ja("tplrt",t,"");mb(g,Z,c);S={$attr:{}};V=da(c,[],S);var $=a.splice(N+1,a.length-(N+1));Q&&pc(V);a=a.concat(V).concat($);B(d,S);S=a.length}else Z.html(V);
if(G.templateUrl)K("template",ia,G,Z),ia=G,G.replace&&(f=G),J=C(a.splice(N,a.length-N),Z,d,g,Xa,l,n,{controllerDirectives:L,newIsolateScopeDirective:Q,templateDirective:ia,nonTlbTranscludeDirective:T}),S=a.length;else if(G.compile)try{O=G.compile(Z,d,Xa),P(O)?u(null,O,ra,W):O&&u(O.pre,O.post,ra,W)}catch(aa){m(aa,ha(Z))}G.terminal&&(J.terminal=!0,v=Math.max(v,G.priority))}J.scope=A&&!0===A.scope;J.transclude=E&&Xa;p.hasElementTranscludeDirective=D;return J}function pc(a){for(var b=0,c=a.length;b<c;b++)a[b]=
Tb(a[b],{$$isolateScope:!0})}function T(b,e,g,f,k,n,r){if(e===k)return null;k=null;if(c.hasOwnProperty(e)){var p;e=a.get(e+d);for(var z=0,u=e.length;z<u;z++)try{p=e[z],(f===s||f>p.priority)&&-1!=p.restrict.indexOf(g)&&(n&&(p=Tb(p,{$$start:n,$$end:r})),b.push(p),k=p)}catch(F){m(F)}}return k}function B(a,b){var c=b.$attr,d=a.$attr,e=a.$$element;q(a,function(d,e){"$"!=e.charAt(0)&&(b[e]&&(d+=("style"===e?";":" ")+b[e]),a.$set(e,d,!0,c[e]))});q(b,function(b,g){"class"==g?(ma(e,b),a["class"]=(a["class"]?
a["class"]+" ":"")+b):"style"==g?(e.attr("style",e.attr("style")+";"+b),a.style=(a.style?a.style+";":"")+b):"$"==g.charAt(0)||a.hasOwnProperty(g)||(a[g]=b,d[g]=c[g])})}function C(a,b,c,d,e,g,f,l){var k=[],m,r,z=b[0],u=a.shift(),F=D({},u,{templateUrl:null,transclude:null,replace:null,$$originalDirective:u}),x=P(u.templateUrl)?u.templateUrl(b,c):u.templateUrl;b.empty();n.get(v.getTrustedResourceUrl(x),{cache:p}).success(function(n){var p,J;n=Y(n);if(u.replace){n=Cb.test(n)?y(n):[];p=n[0];if(1!=n.length||
1!==p.nodeType)throw ja("tplrt",u.name,x);n={$attr:{}};mb(d,b,p);var v=da(p,[],n);X(u.scope)&&pc(v);a=v.concat(a);B(c,n)}else p=z,b.html(n);a.unshift(F);m=ia(a,p,c,e,b,u,g,f,l);q(d,function(a,c){a==p&&(d[c]=b[0])});for(r=L(b[0].childNodes,e);k.length;){n=k.shift();J=k.shift();var A=k.shift(),R=k.shift(),v=b[0];if(J!==z){var H=J.className;l.hasElementTranscludeDirective&&u.replace||(v=Eb(p));mb(A,y(J),v);ma(y(v),H)}J=m.transclude?Q(n,m.transclude):R;m(r,n,v,d,J)}k=null}).error(function(a,b,c,d){throw ja("tpload",
d.url);});return function(a,b,c,d,e){k?(k.push(b),k.push(c),k.push(d),k.push(e)):m(r,b,c,d,e)}}function E(a,b){var c=b.priority-a.priority;return 0!==c?c:a.name!==b.name?a.name<b.name?-1:1:a.index-b.index}function K(a,b,c,d){if(b)throw ja("multidir",b.name,c.name,a,ha(d));}function t(a,c){var d=b(c,!0);d&&a.push({priority:0,compile:aa(function(a,b){var c=b.parent(),e=c.data("$binding")||[];e.push(d);ma(c.data("$binding",e),"ng-binding");a.$watch(d,function(a){b[0].nodeValue=a})})})}function O(a,b){if("srcdoc"==
b)return v.HTML;var c=Ka(a);if("xlinkHref"==b||"FORM"==c&&"action"==b||"IMG"!=c&&("src"==b||"ngSrc"==b))return v.RESOURCE_URL}function N(a,c,d,e){var g=b(d,!0);if(g){if("multiple"===e&&"SELECT"===Ka(a))throw ja("selmulti",ha(a));c.push({priority:100,compile:function(){return{pre:function(c,d,l){d=l.$$observers||(l.$$observers={});if(f.test(e))throw ja("nodomevents");if(g=b(l[e],!0,O(a,e)))l[e]=g(c),(d[e]||(d[e]=[])).$$inter=!0,(l.$$observers&&l.$$observers[e].$$scope||c).$watch(g,function(a,b){"class"===
e&&a!=b?l.$updateClass(a,b):l.$set(e,a)})}}}})}}function mb(a,b,c){var d=b[0],e=b.length,g=d.parentNode,f,l;if(a)for(f=0,l=a.length;f<l;f++)if(a[f]==d){a[f++]=c;l=f+e-1;for(var k=a.length;f<k;f++,l++)l<k?a[f]=a[l]:delete a[f];a.length-=e-1;break}g&&g.replaceChild(c,d);a=U.createDocumentFragment();a.appendChild(d);c[y.expando]=d[y.expando];d=1;for(e=b.length;d<e;d++)g=b[d],y(g).remove(),a.appendChild(g),delete b[d];b[0]=c;b.length=1}function qc(a,b){return D(function(){return a.apply(null,arguments)},
a,b)}var Hb=function(a,b){this.$$element=a;this.$attr=b||{}};Hb.prototype={$normalize:na,$addClass:function(a){a&&0<a.length&&J.addClass(this.$$element,a)},$removeClass:function(a){a&&0<a.length&&J.removeClass(this.$$element,a)},$updateClass:function(a,b){var c=rc(a,b),d=rc(b,a);0===c.length?J.removeClass(this.$$element,d):0===d.length?J.addClass(this.$$element,c):J.setClass(this.$$element,c,d)},$set:function(a,b,c,d){var e=mc(this.$$element[0],a);e&&(this.$$element.prop(a,b),d=e);this[a]=b;d?this.$attr[a]=
d:(d=this.$attr[a])||(this.$attr[a]=d=fb(a,"-"));e=Ka(this.$$element);if("A"===e&&"href"===a||"IMG"===e&&"src"===a)this[a]=b=A(b,"src"===a);!1!==c&&(null===b||b===s?this.$$element.removeAttr(d):this.$$element.attr(d,b));(c=this.$$observers)&&q(c[a],function(a){try{a(b)}catch(c){m(c)}})},$observe:function(a,b){var c=this,d=c.$$observers||(c.$$observers={}),e=d[a]||(d[a]=[]);e.push(b);u.$evalAsync(function(){e.$$inter||b(c[a])});return b}};var Z=b.startSymbol(),ra=b.endSymbol(),Y="{{"==Z||"}}"==ra?
Da:function(a){return a.replace(/\{\{/g,Z).replace(/}}/g,ra)},W=/^ngAttr[A-Z]/;return x}]}function na(b){return Ta(b.replace(te,""))}function rc(b,a){var c="",d=b.split(/\s+/),e=a.split(/\s+/),g=0;a:for(;g<d.length;g++){for(var f=d[g],h=0;h<e.length;h++)if(f==e[h])continue a;c+=(0<c.length?" ":"")+f}return c}function Od(){var b={},a=/^(\S+)(\s+as\s+(\w+))?$/;this.register=function(a,d){Aa(a,"controller");X(a)?D(b,a):b[a]=d};this.$get=["$injector","$window",function(c,d){return function(e,g){var f,
h,l;w(e)&&(f=e.match(a),h=f[1],l=f[3],e=b.hasOwnProperty(h)?b[h]:bc(g.$scope,h,!0)||bc(d,h,!0),Ra(e,h,!0));f=c.instantiate(e,g);if(l){if(!g||"object"!=typeof g.$scope)throw t("$controller")("noscp",h||e.name,l);g.$scope[l]=f}return f}}]}function Pd(){this.$get=["$window",function(b){return y(b.document)}]}function Qd(){this.$get=["$log",function(b){return function(a,c){b.error.apply(b,arguments)}}]}function sc(b){var a={},c,d,e;if(!b)return a;q(b.split("\n"),function(b){e=b.indexOf(":");c=K(ca(b.substr(0,
e)));d=ca(b.substr(e+1));c&&(a[c]=a[c]?a[c]+(", "+d):d)});return a}function tc(b){var a=X(b)?b:s;return function(c){a||(a=sc(b));return c?a[K(c)]||null:a}}function uc(b,a,c){if(P(c))return c(b,a);q(c,function(c){b=c(b,a)});return b}function Td(){var b=/^\s*(\[|\{[^\{])/,a=/[\}\]]\s*$/,c=/^\)\]\}',?\n/,d={"Content-Type":"application/json;charset=utf-8"},e=this.defaults={transformResponse:[function(d){w(d)&&(d=d.replace(c,""),b.test(d)&&a.test(d)&&(d=Wb(d)));return d}],transformRequest:[function(a){return X(a)&&
"[object File]"!==wa.call(a)&&"[object Blob]"!==wa.call(a)?qa(a):a}],headers:{common:{Accept:"application/json, text/plain, */*"},post:ba(d),put:ba(d),patch:ba(d)},xsrfCookieName:"XSRF-TOKEN",xsrfHeaderName:"X-XSRF-TOKEN"},g=this.interceptors=[],f=this.responseInterceptors=[];this.$get=["$httpBackend","$browser","$cacheFactory","$rootScope","$q","$injector",function(a,b,c,d,n,p){function r(a){function c(a){var b=D({},a,{data:uc(a.data,a.headers,d.transformResponse)});return 200<=a.status&&300>a.status?
b:n.reject(b)}var d={method:"get",transformRequest:e.transformRequest,transformResponse:e.transformResponse},g=function(a){function b(a){var c;q(a,function(b,d){P(b)&&(c=b(),null!=c?a[d]=c:delete a[d])})}var c=e.headers,d=D({},a.headers),g,f,c=D({},c.common,c[K(a.method)]);b(c);b(d);a:for(g in c){a=K(g);for(f in d)if(K(f)===a)continue a;d[g]=c[g]}return d}(a);D(d,a);d.headers=g;d.method=Fa(d.method);(a=Ib(d.url)?b.cookies()[d.xsrfCookieName||e.xsrfCookieName]:s)&&(g[d.xsrfHeaderName||e.xsrfHeaderName]=
a);var f=[function(a){g=a.headers;var b=uc(a.data,tc(g),a.transformRequest);E(a.data)&&q(g,function(a,b){"content-type"===K(b)&&delete g[b]});E(a.withCredentials)&&!E(e.withCredentials)&&(a.withCredentials=e.withCredentials);return z(a,b,g).then(c,c)},s],h=n.when(d);for(q(v,function(a){(a.request||a.requestError)&&f.unshift(a.request,a.requestError);(a.response||a.responseError)&&f.push(a.response,a.responseError)});f.length;){a=f.shift();var k=f.shift(),h=h.then(a,k)}h.success=function(a){h.then(function(b){a(b.data,
b.status,b.headers,d)});return h};h.error=function(a){h.then(null,function(b){a(b.data,b.status,b.headers,d)});return h};return h}function z(b,c,g){function f(a,b,c,e){v&&(200<=a&&300>a?v.put(s,[a,b,sc(c),e]):v.remove(s));l(b,a,c,e);d.$$phase||d.$apply()}function l(a,c,d,e){c=Math.max(c,0);(200<=c&&300>c?p.resolve:p.reject)({data:a,status:c,headers:tc(d),config:b,statusText:e})}function k(){var a=db(r.pendingRequests,b);-1!==a&&r.pendingRequests.splice(a,1)}var p=n.defer(),z=p.promise,v,q,s=u(b.url,
b.params);r.pendingRequests.push(b);z.then(k,k);(b.cache||e.cache)&&(!1!==b.cache&&"GET"==b.method)&&(v=X(b.cache)?b.cache:X(e.cache)?e.cache:F);if(v)if(q=v.get(s),B(q)){if(q.then)return q.then(k,k),q;M(q)?l(q[1],q[0],ba(q[2]),q[3]):l(q,200,{},"OK")}else v.put(s,z);E(q)&&a(b.method,s,c,f,g,b.timeout,b.withCredentials,b.responseType);return z}function u(a,b){if(!b)return a;var c=[];Sc(b,function(a,b){null===a||E(a)||(M(a)||(a=[a]),q(a,function(a){X(a)&&(a=qa(a));c.push(za(b)+"="+za(a))}))});0<c.length&&
(a+=(-1==a.indexOf("?")?"?":"&")+c.join("&"));return a}var F=c("$http"),v=[];q(g,function(a){v.unshift(w(a)?p.get(a):p.invoke(a))});q(f,function(a,b){var c=w(a)?p.get(a):p.invoke(a);v.splice(b,0,{response:function(a){return c(n.when(a))},responseError:function(a){return c(n.reject(a))}})});r.pendingRequests=[];(function(a){q(arguments,function(a){r[a]=function(b,c){return r(D(c||{},{method:a,url:b}))}})})("get","delete","head","jsonp");(function(a){q(arguments,function(a){r[a]=function(b,c,d){return r(D(d||
{},{method:a,url:b,data:c}))}})})("post","put");r.defaults=e;return r}]}function ue(b){if(8>=S&&(!b.match(/^(get|post|head|put|delete|options)$/i)||!O.XMLHttpRequest))return new O.ActiveXObject("Microsoft.XMLHTTP");if(O.XMLHttpRequest)return new O.XMLHttpRequest;throw t("$httpBackend")("noxhr");}function Ud(){this.$get=["$browser","$window","$document",function(b,a,c){return ve(b,ue,b.defer,a.angular.callbacks,c[0])}]}function ve(b,a,c,d,e){function g(a,b){var c=e.createElement("script"),d=function(){c.onreadystatechange=
c.onload=c.onerror=null;e.body.removeChild(c);b&&b()};c.type="text/javascript";c.src=a;S&&8>=S?c.onreadystatechange=function(){/loaded|complete/.test(c.readyState)&&d()}:c.onload=c.onerror=function(){d()};e.body.appendChild(c);return d}var f=-1;return function(e,l,k,m,n,p,r,z){function u(){v=f;A&&A();x&&x.abort()}function F(a,d,e,g,f){L&&c.cancel(L);A=x=null;0===d&&(d=e?200:"file"==sa(l).protocol?404:0);a(1223===d?204:d,e,g,f||"");b.$$completeOutstandingRequest(C)}var v;b.$$incOutstandingRequestCount();
l=l||b.url();if("jsonp"==K(e)){var J="_"+(d.counter++).toString(36);d[J]=function(a){d[J].data=a};var A=g(l.replace("JSON_CALLBACK","angular.callbacks."+J),function(){d[J].data?F(m,200,d[J].data):F(m,v||-2);d[J]=Ea.noop})}else{var x=a(e);x.open(e,l,!0);q(n,function(a,b){B(a)&&x.setRequestHeader(b,a)});x.onreadystatechange=function(){if(x&&4==x.readyState){var a=null,b=null;v!==f&&(a=x.getAllResponseHeaders(),b="response"in x?x.response:x.responseText);F(m,v||x.status,b,a,x.statusText||"")}};r&&(x.withCredentials=
!0);if(z)try{x.responseType=z}catch(s){if("json"!==z)throw s;}x.send(k||null)}if(0<p)var L=c(u,p);else p&&p.then&&p.then(u)}}function Rd(){var b="{{",a="}}";this.startSymbol=function(a){return a?(b=a,this):b};this.endSymbol=function(b){return b?(a=b,this):a};this.$get=["$parse","$exceptionHandler","$sce",function(c,d,e){function g(g,k,m){for(var n,p,r=0,z=[],u=g.length,F=!1,v=[];r<u;)-1!=(n=g.indexOf(b,r))&&-1!=(p=g.indexOf(a,n+f))?(r!=n&&z.push(g.substring(r,n)),z.push(r=c(F=g.substring(n+f,p))),
r.exp=F,r=p+h,F=!0):(r!=u&&z.push(g.substring(r)),r=u);(u=z.length)||(z.push(""),u=1);if(m&&1<z.length)throw vc("noconcat",g);if(!k||F)return v.length=u,r=function(a){try{for(var b=0,c=u,f;b<c;b++)"function"==typeof(f=z[b])&&(f=f(a),f=m?e.getTrusted(m,f):e.valueOf(f),null===f||E(f)?f="":"string"!=typeof f&&(f=qa(f))),v[b]=f;return v.join("")}catch(h){a=vc("interr",g,h.toString()),d(a)}},r.exp=g,r.parts=z,r}var f=b.length,h=a.length;g.startSymbol=function(){return b};g.endSymbol=function(){return a};
return g}]}function Sd(){this.$get=["$rootScope","$window","$q",function(b,a,c){function d(d,f,h,l){var k=a.setInterval,m=a.clearInterval,n=c.defer(),p=n.promise,r=0,z=B(l)&&!l;h=B(h)?h:0;p.then(null,null,d);p.$$intervalId=k(function(){n.notify(r++);0<h&&r>=h&&(n.resolve(r),m(p.$$intervalId),delete e[p.$$intervalId]);z||b.$apply()},f);e[p.$$intervalId]=n;return p}var e={};d.cancel=function(a){return a&&a.$$intervalId in e?(e[a.$$intervalId].reject("canceled"),clearInterval(a.$$intervalId),delete e[a.$$intervalId],
!0):!1};return d}]}function ad(){this.$get=function(){return{id:"en-us",NUMBER_FORMATS:{DECIMAL_SEP:".",GROUP_SEP:",",PATTERNS:[{minInt:1,minFrac:0,maxFrac:3,posPre:"",posSuf:"",negPre:"-",negSuf:"",gSize:3,lgSize:3},{minInt:1,minFrac:2,maxFrac:2,posPre:"\u00a4",posSuf:"",negPre:"(\u00a4",negSuf:")",gSize:3,lgSize:3}],CURRENCY_SYM:"$"},DATETIME_FORMATS:{MONTH:"January February March April May June July August September October November December".split(" "),SHORTMONTH:"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),
DAY:"Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),SHORTDAY:"Sun Mon Tue Wed Thu Fri Sat".split(" "),AMPMS:["AM","PM"],medium:"MMM d, y h:mm:ss a","short":"M/d/yy h:mm a",fullDate:"EEEE, MMMM d, y",longDate:"MMMM d, y",mediumDate:"MMM d, y",shortDate:"M/d/yy",mediumTime:"h:mm:ss a",shortTime:"h:mm a"},pluralCat:function(b){return 1===b?"one":"other"}}}}function wc(b){b=b.split("/");for(var a=b.length;a--;)b[a]=wb(b[a]);return b.join("/")}function xc(b,a,c){b=sa(b,c);a.$$protocol=
b.protocol;a.$$host=b.hostname;a.$$port=Y(b.port)||we[b.protocol]||null}function yc(b,a,c){var d="/"!==b.charAt(0);d&&(b="/"+b);b=sa(b,c);a.$$path=decodeURIComponent(d&&"/"===b.pathname.charAt(0)?b.pathname.substring(1):b.pathname);a.$$search=Yb(b.search);a.$$hash=decodeURIComponent(b.hash);a.$$path&&"/"!=a.$$path.charAt(0)&&(a.$$path="/"+a.$$path)}function oa(b,a){if(0===a.indexOf(b))return a.substr(b.length)}function Ya(b){var a=b.indexOf("#");return-1==a?b:b.substr(0,a)}function Jb(b){return b.substr(0,
Ya(b).lastIndexOf("/")+1)}function zc(b,a){this.$$html5=!0;a=a||"";var c=Jb(b);xc(b,this,b);this.$$parse=function(a){var e=oa(c,a);if(!w(e))throw Kb("ipthprfx",a,c);yc(e,this,b);this.$$path||(this.$$path="/");this.$$compose()};this.$$compose=function(){var a=Zb(this.$$search),b=this.$$hash?"#"+wb(this.$$hash):"";this.$$url=wc(this.$$path)+(a?"?"+a:"")+b;this.$$absUrl=c+this.$$url.substr(1)};this.$$rewrite=function(d){var e;if((e=oa(b,d))!==s)return d=e,(e=oa(a,e))!==s?c+(oa("/",e)||e):b+d;if((e=oa(c,
d))!==s)return c+e;if(c==d+"/")return c}}function Lb(b,a){var c=Jb(b);xc(b,this,b);this.$$parse=function(d){var e=oa(b,d)||oa(c,d),e="#"==e.charAt(0)?oa(a,e):this.$$html5?e:"";if(!w(e))throw Kb("ihshprfx",d,a);yc(e,this,b);d=this.$$path;var g=/^\/?.*?:(\/.*)/;0===e.indexOf(b)&&(e=e.replace(b,""));g.exec(e)||(d=(e=g.exec(d))?e[1]:d);this.$$path=d;this.$$compose()};this.$$compose=function(){var c=Zb(this.$$search),e=this.$$hash?"#"+wb(this.$$hash):"";this.$$url=wc(this.$$path)+(c?"?"+c:"")+e;this.$$absUrl=
b+(this.$$url?a+this.$$url:"")};this.$$rewrite=function(a){if(Ya(b)==Ya(a))return a}}function Ac(b,a){this.$$html5=!0;Lb.apply(this,arguments);var c=Jb(b);this.$$rewrite=function(d){var e;if(b==Ya(d))return d;if(e=oa(c,d))return b+a+e;if(c===d+"/")return c}}function nb(b){return function(){return this[b]}}function Bc(b,a){return function(c){if(E(c))return this[b];this[b]=a(c);this.$$compose();return this}}function Vd(){var b="",a=!1;this.hashPrefix=function(a){return B(a)?(b=a,this):b};this.html5Mode=
function(b){return B(b)?(a=b,this):a};this.$get=["$rootScope","$browser","$sniffer","$rootElement",function(c,d,e,g){function f(a){c.$broadcast("$locationChangeSuccess",h.absUrl(),a)}var h,l=d.baseHref(),k=d.url();a?(l=k.substring(0,k.indexOf("/",k.indexOf("//")+2))+(l||"/"),e=e.history?zc:Ac):(l=Ya(k),e=Lb);h=new e(l,"#"+b);h.$$parse(h.$$rewrite(k));g.on("click",function(a){if(!a.ctrlKey&&!a.metaKey&&2!=a.which){for(var b=y(a.target);"a"!==K(b[0].nodeName);)if(b[0]===g[0]||!(b=b.parent())[0])return;
var e=b.prop("href");X(e)&&"[object SVGAnimatedString]"===e.toString()&&(e=sa(e.animVal).href);var f=h.$$rewrite(e);e&&(!b.attr("target")&&f&&!a.isDefaultPrevented())&&(a.preventDefault(),f!=d.url()&&(h.$$parse(f),c.$apply(),O.angular["ff-684208-preventDefault"]=!0))}});h.absUrl()!=k&&d.url(h.absUrl(),!0);d.onUrlChange(function(a){h.absUrl()!=a&&(c.$evalAsync(function(){var b=h.absUrl();h.$$parse(a);c.$broadcast("$locationChangeStart",a,b).defaultPrevented?(h.$$parse(b),d.url(b)):f(b)}),c.$$phase||
c.$digest())});var m=0;c.$watch(function(){var a=d.url(),b=h.$$replace;m&&a==h.absUrl()||(m++,c.$evalAsync(function(){c.$broadcast("$locationChangeStart",h.absUrl(),a).defaultPrevented?h.$$parse(a):(d.url(h.absUrl(),b),f(a))}));h.$$replace=!1;return m});return h}]}function Wd(){var b=!0,a=this;this.debugEnabled=function(a){return B(a)?(b=a,this):b};this.$get=["$window",function(c){function d(a){a instanceof Error&&(a.stack?a=a.message&&-1===a.stack.indexOf(a.message)?"Error: "+a.message+"\n"+a.stack:
a.stack:a.sourceURL&&(a=a.message+"\n"+a.sourceURL+":"+a.line));return a}function e(a){var b=c.console||{},e=b[a]||b.log||C;a=!1;try{a=!!e.apply}catch(l){}return a?function(){var a=[];q(arguments,function(b){a.push(d(b))});return e.apply(b,a)}:function(a,b){e(a,null==b?"":b)}}return{log:e("log"),info:e("info"),warn:e("warn"),error:e("error"),debug:function(){var c=e("debug");return function(){b&&c.apply(a,arguments)}}()}}]}function fa(b,a){if("constructor"===b)throw Ba("isecfld",a);return b}function Za(b,
a){if(b){if(b.constructor===b)throw Ba("isecfn",a);if(b.document&&b.location&&b.alert&&b.setInterval)throw Ba("isecwindow",a);if(b.children&&(b.nodeName||b.prop&&b.attr&&b.find))throw Ba("isecdom",a);}return b}function ob(b,a,c,d,e){e=e||{};a=a.split(".");for(var g,f=0;1<a.length;f++){g=fa(a.shift(),d);var h=b[g];h||(h={},b[g]=h);b=h;b.then&&e.unwrapPromises&&(ta(d),"$$v"in b||function(a){a.then(function(b){a.$$v=b})}(b),b.$$v===s&&(b.$$v={}),b=b.$$v)}g=fa(a.shift(),d);return b[g]=c}function Cc(b,
a,c,d,e,g,f){fa(b,g);fa(a,g);fa(c,g);fa(d,g);fa(e,g);return f.unwrapPromises?function(f,l){var k=l&&l.hasOwnProperty(b)?l:f,m;if(null==k)return k;(k=k[b])&&k.then&&(ta(g),"$$v"in k||(m=k,m.$$v=s,m.then(function(a){m.$$v=a})),k=k.$$v);if(!a)return k;if(null==k)return s;(k=k[a])&&k.then&&(ta(g),"$$v"in k||(m=k,m.$$v=s,m.then(function(a){m.$$v=a})),k=k.$$v);if(!c)return k;if(null==k)return s;(k=k[c])&&k.then&&(ta(g),"$$v"in k||(m=k,m.$$v=s,m.then(function(a){m.$$v=a})),k=k.$$v);if(!d)return k;if(null==
k)return s;(k=k[d])&&k.then&&(ta(g),"$$v"in k||(m=k,m.$$v=s,m.then(function(a){m.$$v=a})),k=k.$$v);if(!e)return k;if(null==k)return s;(k=k[e])&&k.then&&(ta(g),"$$v"in k||(m=k,m.$$v=s,m.then(function(a){m.$$v=a})),k=k.$$v);return k}:function(g,f){var k=f&&f.hasOwnProperty(b)?f:g;if(null==k)return k;k=k[b];if(!a)return k;if(null==k)return s;k=k[a];if(!c)return k;if(null==k)return s;k=k[c];if(!d)return k;if(null==k)return s;k=k[d];return e?null==k?s:k=k[e]:k}}function xe(b,a){fa(b,a);return function(a,
d){return null==a?s:(d&&d.hasOwnProperty(b)?d:a)[b]}}function ye(b,a,c){fa(b,c);fa(a,c);return function(c,e){if(null==c)return s;c=(e&&e.hasOwnProperty(b)?e:c)[b];return null==c?s:c[a]}}function Dc(b,a,c){if(Mb.hasOwnProperty(b))return Mb[b];var d=b.split("."),e=d.length,g;if(a.unwrapPromises||1!==e)if(a.unwrapPromises||2!==e)if(a.csp)g=6>e?Cc(d[0],d[1],d[2],d[3],d[4],c,a):function(b,g){var f=0,h;do h=Cc(d[f++],d[f++],d[f++],d[f++],d[f++],c,a)(b,g),g=s,b=h;while(f<e);return h};else{var f="var p;\n";
q(d,function(b,d){fa(b,c);f+="if(s == null) return undefined;\ns="+(d?"s":'((k&&k.hasOwnProperty("'+b+'"))?k:s)')+'["'+b+'"];\n'+(a.unwrapPromises?'if (s && s.then) {\n pw("'+c.replace(/(["\r\n])/g,"\\$1")+'");\n if (!("$$v" in s)) {\n p=s;\n p.$$v = undefined;\n p.then(function(v) {p.$$v=v;});\n}\n s=s.$$v\n}\n':"")});var f=f+"return s;",h=new Function("s","k","pw",f);h.toString=aa(f);g=a.unwrapPromises?function(a,b){return h(a,b,ta)}:h}else g=ye(d[0],d[1],c);else g=xe(d[0],c);"hasOwnProperty"!==
b&&(Mb[b]=g);return g}function Xd(){var b={},a={csp:!1,unwrapPromises:!1,logPromiseWarnings:!0};this.unwrapPromises=function(b){return B(b)?(a.unwrapPromises=!!b,this):a.unwrapPromises};this.logPromiseWarnings=function(b){return B(b)?(a.logPromiseWarnings=b,this):a.logPromiseWarnings};this.$get=["$filter","$sniffer","$log",function(c,d,e){a.csp=d.csp;ta=function(b){a.logPromiseWarnings&&!Ec.hasOwnProperty(b)&&(Ec[b]=!0,e.warn("[$parse] Promise found in the expression `"+b+"`. Automatic unwrapping of promises in Angular expressions is deprecated."))};
return function(d){var e;switch(typeof d){case "string":if(b.hasOwnProperty(d))return b[d];e=new Nb(a);e=(new $a(e,c,a)).parse(d,!1);"hasOwnProperty"!==d&&(b[d]=e);return e;case "function":return d;default:return C}}}]}function Zd(){this.$get=["$rootScope","$exceptionHandler",function(b,a){return ze(function(a){b.$evalAsync(a)},a)}]}function ze(b,a){function c(a){return a}function d(a){return f(a)}var e=function(){var f=[],k,m;return m={resolve:function(a){if(f){var c=f;f=s;k=g(a);c.length&&b(function(){for(var a,
b=0,d=c.length;b<d;b++)a=c[b],k.then(a[0],a[1],a[2])})}},reject:function(a){m.resolve(h(a))},notify:function(a){if(f){var c=f;f.length&&b(function(){for(var b,d=0,e=c.length;d<e;d++)b=c[d],b[2](a)})}},promise:{then:function(b,g,h){var m=e(),u=function(d){try{m.resolve((P(b)?b:c)(d))}catch(e){m.reject(e),a(e)}},F=function(b){try{m.resolve((P(g)?g:d)(b))}catch(c){m.reject(c),a(c)}},v=function(b){try{m.notify((P(h)?h:c)(b))}catch(d){a(d)}};f?f.push([u,F,v]):k.then(u,F,v);return m.promise},"catch":function(a){return this.then(null,
a)},"finally":function(a){function b(a,c){var d=e();c?d.resolve(a):d.reject(a);return d.promise}function d(e,g){var f=null;try{f=(a||c)()}catch(h){return b(h,!1)}return f&&P(f.then)?f.then(function(){return b(e,g)},function(a){return b(a,!1)}):b(e,g)}return this.then(function(a){return d(a,!0)},function(a){return d(a,!1)})}}}},g=function(a){return a&&P(a.then)?a:{then:function(c){var d=e();b(function(){d.resolve(c(a))});return d.promise}}},f=function(a){var b=e();b.reject(a);return b.promise},h=function(c){return{then:function(g,
f){var h=e();b(function(){try{h.resolve((P(f)?f:d)(c))}catch(b){h.reject(b),a(b)}});return h.promise}}};return{defer:e,reject:f,when:function(h,k,m,n){var p=e(),r,z=function(b){try{return(P(k)?k:c)(b)}catch(d){return a(d),f(d)}},u=function(b){try{return(P(m)?m:d)(b)}catch(c){return a(c),f(c)}},F=function(b){try{return(P(n)?n:c)(b)}catch(d){a(d)}};b(function(){g(h).then(function(a){r||(r=!0,p.resolve(g(a).then(z,u,F)))},function(a){r||(r=!0,p.resolve(u(a)))},function(a){r||p.notify(F(a))})});return p.promise},
all:function(a){var b=e(),c=0,d=M(a)?[]:{};q(a,function(a,e){c++;g(a).then(function(a){d.hasOwnProperty(e)||(d[e]=a,--c||b.resolve(d))},function(a){d.hasOwnProperty(e)||b.reject(a)})});0===c&&b.resolve(d);return b.promise}}}function fe(){this.$get=["$window","$timeout",function(b,a){var c=b.requestAnimationFrame||b.webkitRequestAnimationFrame||b.mozRequestAnimationFrame,d=b.cancelAnimationFrame||b.webkitCancelAnimationFrame||b.mozCancelAnimationFrame||b.webkitCancelRequestAnimationFrame,e=!!c,g=e?
function(a){var b=c(a);return function(){d(b)}}:function(b){var c=a(b,16.66,!1);return function(){a.cancel(c)}};g.supported=e;return g}]}function Yd(){var b=10,a=t("$rootScope"),c=null;this.digestTtl=function(a){arguments.length&&(b=a);return b};this.$get=["$injector","$exceptionHandler","$parse","$browser",function(d,e,g,f){function h(){this.$id=bb();this.$$phase=this.$parent=this.$$watchers=this.$$nextSibling=this.$$prevSibling=this.$$childHead=this.$$childTail=null;this["this"]=this.$root=this;
this.$$destroyed=!1;this.$$asyncQueue=[];this.$$postDigestQueue=[];this.$$listeners={};this.$$listenerCount={};this.$$isolateBindings={}}function l(b){if(p.$$phase)throw a("inprog",p.$$phase);p.$$phase=b}function k(a,b){var c=g(a);Ra(c,b);return c}function m(a,b,c){do a.$$listenerCount[c]-=b,0===a.$$listenerCount[c]&&delete a.$$listenerCount[c];while(a=a.$parent)}function n(){}h.prototype={constructor:h,$new:function(a){a?(a=new h,a.$root=this.$root,a.$$asyncQueue=this.$$asyncQueue,a.$$postDigestQueue=
this.$$postDigestQueue):(a=function(){},a.prototype=this,a=new a,a.$id=bb());a["this"]=a;a.$$listeners={};a.$$listenerCount={};a.$parent=this;a.$$watchers=a.$$nextSibling=a.$$childHead=a.$$childTail=null;a.$$prevSibling=this.$$childTail;this.$$childHead?this.$$childTail=this.$$childTail.$$nextSibling=a:this.$$childHead=this.$$childTail=a;return a},$watch:function(a,b,d){var e=k(a,"watch"),g=this.$$watchers,f={fn:b,last:n,get:e,exp:a,eq:!!d};c=null;if(!P(b)){var h=k(b||C,"listener");f.fn=function(a,
b,c){h(c)}}if("string"==typeof a&&e.constant){var l=f.fn;f.fn=function(a,b,c){l.call(this,a,b,c);Oa(g,f)}}g||(g=this.$$watchers=[]);g.unshift(f);return function(){Oa(g,f);c=null}},$watchCollection:function(a,b){var c=this,d,e,f,h=1<b.length,l=0,k=g(a),m=[],n={},p=!0,q=0;return this.$watch(function(){d=k(c);var a,b;if(X(d))if(ab(d))for(e!==m&&(e=m,q=e.length=0,l++),a=d.length,q!==a&&(l++,e.length=q=a),b=0;b<a;b++)e[b]!==e[b]&&d[b]!==d[b]||e[b]===d[b]||(l++,e[b]=d[b]);else{e!==n&&(e=n={},q=0,l++);a=
0;for(b in d)d.hasOwnProperty(b)&&(a++,e.hasOwnProperty(b)?e[b]!==d[b]&&(l++,e[b]=d[b]):(q++,e[b]=d[b],l++));if(q>a)for(b in l++,e)e.hasOwnProperty(b)&&!d.hasOwnProperty(b)&&(q--,delete e[b])}else e!==d&&(e=d,l++);return l},function(){p?(p=!1,b(d,d,c)):b(d,f,c);if(h)if(X(d))if(ab(d)){f=Array(d.length);for(var a=0;a<d.length;a++)f[a]=d[a]}else for(a in f={},d)Fc.call(d,a)&&(f[a]=d[a]);else f=d})},$digest:function(){var d,g,f,h,k=this.$$asyncQueue,m=this.$$postDigestQueue,q,x,s=b,L,Q=[],y,H,R;l("$digest");
c=null;do{x=!1;for(L=this;k.length;){try{R=k.shift(),R.scope.$eval(R.expression)}catch(B){p.$$phase=null,e(B)}c=null}a:do{if(h=L.$$watchers)for(q=h.length;q--;)try{if(d=h[q])if((g=d.get(L))!==(f=d.last)&&!(d.eq?xa(g,f):"number"==typeof g&&"number"==typeof f&&isNaN(g)&&isNaN(f)))x=!0,c=d,d.last=d.eq?ba(g):g,d.fn(g,f===n?g:f,L),5>s&&(y=4-s,Q[y]||(Q[y]=[]),H=P(d.exp)?"fn: "+(d.exp.name||d.exp.toString()):d.exp,H+="; newVal: "+qa(g)+"; oldVal: "+qa(f),Q[y].push(H));else if(d===c){x=!1;break a}}catch(w){p.$$phase=
null,e(w)}if(!(h=L.$$childHead||L!==this&&L.$$nextSibling))for(;L!==this&&!(h=L.$$nextSibling);)L=L.$parent}while(L=h);if((x||k.length)&&!s--)throw p.$$phase=null,a("infdig",b,qa(Q));}while(x||k.length);for(p.$$phase=null;m.length;)try{m.shift()()}catch(T){e(T)}},$destroy:function(){if(!this.$$destroyed){var a=this.$parent;this.$broadcast("$destroy");this.$$destroyed=!0;this!==p&&(q(this.$$listenerCount,eb(null,m,this)),a.$$childHead==this&&(a.$$childHead=this.$$nextSibling),a.$$childTail==this&&
(a.$$childTail=this.$$prevSibling),this.$$prevSibling&&(this.$$prevSibling.$$nextSibling=this.$$nextSibling),this.$$nextSibling&&(this.$$nextSibling.$$prevSibling=this.$$prevSibling),this.$parent=this.$$nextSibling=this.$$prevSibling=this.$$childHead=this.$$childTail=this.$root=null,this.$$listeners={},this.$$watchers=this.$$asyncQueue=this.$$postDigestQueue=[],this.$destroy=this.$digest=this.$apply=C,this.$on=this.$watch=function(){return C})}},$eval:function(a,b){return g(a)(this,b)},$evalAsync:function(a){p.$$phase||
p.$$asyncQueue.length||f.defer(function(){p.$$asyncQueue.length&&p.$digest()});this.$$asyncQueue.push({scope:this,expression:a})},$$postDigest:function(a){this.$$postDigestQueue.push(a)},$apply:function(a){try{return l("$apply"),this.$eval(a)}catch(b){e(b)}finally{p.$$phase=null;try{p.$digest()}catch(c){throw e(c),c;}}},$on:function(a,b){var c=this.$$listeners[a];c||(this.$$listeners[a]=c=[]);c.push(b);var d=this;do d.$$listenerCount[a]||(d.$$listenerCount[a]=0),d.$$listenerCount[a]++;while(d=d.$parent);
var e=this;return function(){c[db(c,b)]=null;m(e,1,a)}},$emit:function(a,b){var c=[],d,g=this,f=!1,h={name:a,targetScope:g,stopPropagation:function(){f=!0},preventDefault:function(){h.defaultPrevented=!0},defaultPrevented:!1},l=[h].concat(ya.call(arguments,1)),k,m;do{d=g.$$listeners[a]||c;h.currentScope=g;k=0;for(m=d.length;k<m;k++)if(d[k])try{d[k].apply(null,l)}catch(n){e(n)}else d.splice(k,1),k--,m--;if(f)break;g=g.$parent}while(g);return h},$broadcast:function(a,b){for(var c=this,d=this,g={name:a,
targetScope:this,preventDefault:function(){g.defaultPrevented=!0},defaultPrevented:!1},f=[g].concat(ya.call(arguments,1)),h,k;c=d;){g.currentScope=c;d=c.$$listeners[a]||[];h=0;for(k=d.length;h<k;h++)if(d[h])try{d[h].apply(null,f)}catch(l){e(l)}else d.splice(h,1),h--,k--;if(!(d=c.$$listenerCount[a]&&c.$$childHead||c!==this&&c.$$nextSibling))for(;c!==this&&!(d=c.$$nextSibling);)c=c.$parent}return g}};var p=new h;return p}]}function bd(){var b=/^\s*(https?|ftp|mailto|tel|file):/,a=/^\s*(https?|ftp|file):|data:image\//;
this.aHrefSanitizationWhitelist=function(a){return B(a)?(b=a,this):b};this.imgSrcSanitizationWhitelist=function(b){return B(b)?(a=b,this):a};this.$get=function(){return function(c,d){var e=d?a:b,g;if(!S||8<=S)if(g=sa(c).href,""!==g&&!g.match(e))return"unsafe:"+g;return c}}}function Ae(b){if("self"===b)return b;if(w(b)){if(-1<b.indexOf("***"))throw ua("iwcard",b);b=b.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08").replace("\\*\\*",".*").replace("\\*","[^:/.?&;]*");return RegExp("^"+
b+"$")}if(cb(b))return RegExp("^"+b.source+"$");throw ua("imatcher");}function Gc(b){var a=[];B(b)&&q(b,function(b){a.push(Ae(b))});return a}function ae(){this.SCE_CONTEXTS=ga;var b=["self"],a=[];this.resourceUrlWhitelist=function(a){arguments.length&&(b=Gc(a));return b};this.resourceUrlBlacklist=function(b){arguments.length&&(a=Gc(b));return a};this.$get=["$injector",function(c){function d(a){var b=function(a){this.$$unwrapTrustedValue=function(){return a}};a&&(b.prototype=new a);b.prototype.valueOf=
function(){return this.$$unwrapTrustedValue()};b.prototype.toString=function(){return this.$$unwrapTrustedValue().toString()};return b}var e=function(a){throw ua("unsafe");};c.has("$sanitize")&&(e=c.get("$sanitize"));var g=d(),f={};f[ga.HTML]=d(g);f[ga.CSS]=d(g);f[ga.URL]=d(g);f[ga.JS]=d(g);f[ga.RESOURCE_URL]=d(f[ga.URL]);return{trustAs:function(a,b){var c=f.hasOwnProperty(a)?f[a]:null;if(!c)throw ua("icontext",a,b);if(null===b||b===s||""===b)return b;if("string"!==typeof b)throw ua("itype",a);return new c(b)},
getTrusted:function(c,d){if(null===d||d===s||""===d)return d;var g=f.hasOwnProperty(c)?f[c]:null;if(g&&d instanceof g)return d.$$unwrapTrustedValue();if(c===ga.RESOURCE_URL){var g=sa(d.toString()),m,n,p=!1;m=0;for(n=b.length;m<n;m++)if("self"===b[m]?Ib(g):b[m].exec(g.href)){p=!0;break}if(p)for(m=0,n=a.length;m<n;m++)if("self"===a[m]?Ib(g):a[m].exec(g.href)){p=!1;break}if(p)return d;throw ua("insecurl",d.toString());}if(c===ga.HTML)return e(d);throw ua("unsafe");},valueOf:function(a){return a instanceof
g?a.$$unwrapTrustedValue():a}}}]}function $d(){var b=!0;this.enabled=function(a){arguments.length&&(b=!!a);return b};this.$get=["$parse","$sniffer","$sceDelegate",function(a,c,d){if(b&&c.msie&&8>c.msieDocumentMode)throw ua("iequirks");var e=ba(ga);e.isEnabled=function(){return b};e.trustAs=d.trustAs;e.getTrusted=d.getTrusted;e.valueOf=d.valueOf;b||(e.trustAs=e.getTrusted=function(a,b){return b},e.valueOf=Da);e.parseAs=function(b,c){var d=a(c);return d.literal&&d.constant?d:function(a,c){return e.getTrusted(b,
d(a,c))}};var g=e.parseAs,f=e.getTrusted,h=e.trustAs;q(ga,function(a,b){var c=K(b);e[Ta("parse_as_"+c)]=function(b){return g(a,b)};e[Ta("get_trusted_"+c)]=function(b){return f(a,b)};e[Ta("trust_as_"+c)]=function(b){return h(a,b)}});return e}]}function be(){this.$get=["$window","$document",function(b,a){var c={},d=Y((/android (\d+)/.exec(K((b.navigator||{}).userAgent))||[])[1]),e=/Boxee/i.test((b.navigator||{}).userAgent),g=a[0]||{},f=g.documentMode,h,l=/^(Moz|webkit|O|ms)(?=[A-Z])/,k=g.body&&g.body.style,
m=!1,n=!1;if(k){for(var p in k)if(m=l.exec(p)){h=m[0];h=h.substr(0,1).toUpperCase()+h.substr(1);break}h||(h="WebkitOpacity"in k&&"webkit");m=!!("transition"in k||h+"Transition"in k);n=!!("animation"in k||h+"Animation"in k);!d||m&&n||(m=w(g.body.style.webkitTransition),n=w(g.body.style.webkitAnimation))}return{history:!(!b.history||!b.history.pushState||4>d||e),hashchange:"onhashchange"in b&&(!f||7<f),hasEvent:function(a){if("input"==a&&9==S)return!1;if(E(c[a])){var b=g.createElement("div");c[a]="on"+
a in b}return c[a]},csp:Vb(),vendorPrefix:h,transitions:m,animations:n,android:d,msie:S,msieDocumentMode:f}}]}function de(){this.$get=["$rootScope","$browser","$q","$exceptionHandler",function(b,a,c,d){function e(e,h,l){var k=c.defer(),m=k.promise,n=B(l)&&!l;h=a.defer(function(){try{k.resolve(e())}catch(a){k.reject(a),d(a)}finally{delete g[m.$$timeoutId]}n||b.$apply()},h);m.$$timeoutId=h;g[h]=k;return m}var g={};e.cancel=function(b){return b&&b.$$timeoutId in g?(g[b.$$timeoutId].reject("canceled"),
delete g[b.$$timeoutId],a.defer.cancel(b.$$timeoutId)):!1};return e}]}function sa(b,a){var c=b;S&&(W.setAttribute("href",c),c=W.href);W.setAttribute("href",c);return{href:W.href,protocol:W.protocol?W.protocol.replace(/:$/,""):"",host:W.host,search:W.search?W.search.replace(/^\?/,""):"",hash:W.hash?W.hash.replace(/^#/,""):"",hostname:W.hostname,port:W.port,pathname:"/"===W.pathname.charAt(0)?W.pathname:"/"+W.pathname}}function Ib(b){b=w(b)?sa(b):b;return b.protocol===Hc.protocol&&b.host===Hc.host}
function ee(){this.$get=aa(O)}function gc(b){function a(d,e){if(X(d)){var g={};q(d,function(b,c){g[c]=a(c,b)});return g}return b.factory(d+c,e)}var c="Filter";this.register=a;this.$get=["$injector",function(a){return function(b){return a.get(b+c)}}];a("currency",Ic);a("date",Jc);a("filter",Be);a("json",Ce);a("limitTo",De);a("lowercase",Ee);a("number",Kc);a("orderBy",Lc);a("uppercase",Fe)}function Be(){return function(b,a,c){if(!M(b))return b;var d=typeof c,e=[];e.check=function(a){for(var b=0;b<e.length;b++)if(!e[b](a))return!1;
return!0};"function"!==d&&(c="boolean"===d&&c?function(a,b){return Ea.equals(a,b)}:function(a,b){if(a&&b&&"object"===typeof a&&"object"===typeof b){for(var d in a)if("$"!==d.charAt(0)&&Fc.call(a,d)&&c(a[d],b[d]))return!0;return!1}b=(""+b).toLowerCase();return-1<(""+a).toLowerCase().indexOf(b)});var g=function(a,b){if("string"==typeof b&&"!"===b.charAt(0))return!g(a,b.substr(1));switch(typeof a){case "boolean":case "number":case "string":return c(a,b);case "object":switch(typeof b){case "object":return c(a,
b);default:for(var d in a)if("$"!==d.charAt(0)&&g(a[d],b))return!0}return!1;case "array":for(d=0;d<a.length;d++)if(g(a[d],b))return!0;return!1;default:return!1}};switch(typeof a){case "boolean":case "number":case "string":a={$:a};case "object":for(var f in a)(function(b){"undefined"!=typeof a[b]&&e.push(function(c){return g("$"==b?c:c&&c[b],a[b])})})(f);break;case "function":e.push(a);break;default:return b}d=[];for(f=0;f<b.length;f++){var h=b[f];e.check(h)&&d.push(h)}return d}}function Ic(b){var a=
b.NUMBER_FORMATS;return function(b,d){E(d)&&(d=a.CURRENCY_SYM);return Mc(b,a.PATTERNS[1],a.GROUP_SEP,a.DECIMAL_SEP,2).replace(/\u00A4/g,d)}}function Kc(b){var a=b.NUMBER_FORMATS;return function(b,d){return Mc(b,a.PATTERNS[0],a.GROUP_SEP,a.DECIMAL_SEP,d)}}function Mc(b,a,c,d,e){if(null==b||!isFinite(b)||X(b))return"";var g=0>b;b=Math.abs(b);var f=b+"",h="",l=[],k=!1;if(-1!==f.indexOf("e")){var m=f.match(/([\d\.]+)e(-?)(\d+)/);m&&"-"==m[2]&&m[3]>e+1?f="0":(h=f,k=!0)}if(k)0<e&&(-1<b&&1>b)&&(h=b.toFixed(e));
else{f=(f.split(Nc)[1]||"").length;E(e)&&(e=Math.min(Math.max(a.minFrac,f),a.maxFrac));f=Math.pow(10,e);b=Math.round(b*f)/f;b=(""+b).split(Nc);f=b[0];b=b[1]||"";var m=0,n=a.lgSize,p=a.gSize;if(f.length>=n+p)for(m=f.length-n,k=0;k<m;k++)0===(m-k)%p&&0!==k&&(h+=c),h+=f.charAt(k);for(k=m;k<f.length;k++)0===(f.length-k)%n&&0!==k&&(h+=c),h+=f.charAt(k);for(;b.length<e;)b+="0";e&&"0"!==e&&(h+=d+b.substr(0,e))}l.push(g?a.negPre:a.posPre);l.push(h);l.push(g?a.negSuf:a.posSuf);return l.join("")}function Ob(b,
a,c){var d="";0>b&&(d="-",b=-b);for(b=""+b;b.length<a;)b="0"+b;c&&(b=b.substr(b.length-a));return d+b}function $(b,a,c,d){c=c||0;return function(e){e=e["get"+b]();if(0<c||e>-c)e+=c;0===e&&-12==c&&(e=12);return Ob(e,a,d)}}function pb(b,a){return function(c,d){var e=c["get"+b](),g=Fa(a?"SHORT"+b:b);return d[g][e]}}function Jc(b){function a(a){var b;if(b=a.match(c)){a=new Date(0);var g=0,f=0,h=b[8]?a.setUTCFullYear:a.setFullYear,l=b[8]?a.setUTCHours:a.setHours;b[9]&&(g=Y(b[9]+b[10]),f=Y(b[9]+b[11]));
h.call(a,Y(b[1]),Y(b[2])-1,Y(b[3]));g=Y(b[4]||0)-g;f=Y(b[5]||0)-f;h=Y(b[6]||0);b=Math.round(1E3*parseFloat("0."+(b[7]||0)));l.call(a,g,f,h,b)}return a}var c=/^(\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d+))?)?)?(Z|([+-])(\d\d):?(\d\d))?)?$/;return function(c,e){var g="",f=[],h,l;e=e||"mediumDate";e=b.DATETIME_FORMATS[e]||e;w(c)&&(c=Ge.test(c)?Y(c):a(c));vb(c)&&(c=new Date(c));if(!Na(c))return c;for(;e;)(l=He.exec(e))?(f=f.concat(ya.call(l,1)),e=f.pop()):(f.push(e),e=null);q(f,function(a){h=
Ie[a];g+=h?h(c,b.DATETIME_FORMATS):a.replace(/(^'|'$)/g,"").replace(/''/g,"'")});return g}}function Ce(){return function(b){return qa(b,!0)}}function De(){return function(b,a){if(!M(b)&&!w(b))return b;a=Y(a);if(w(b))return a?0<=a?b.slice(0,a):b.slice(a,b.length):"";var c=[],d,e;a>b.length?a=b.length:a<-b.length&&(a=-b.length);0<a?(d=0,e=a):(d=b.length+a,e=b.length);for(;d<e;d++)c.push(b[d]);return c}}function Lc(b){return function(a,c,d){function e(a,b){return Qa(b)?function(b,c){return a(c,b)}:a}
function g(a,b){var c=typeof a,d=typeof b;return c==d?("string"==c&&(a=a.toLowerCase(),b=b.toLowerCase()),a===b?0:a<b?-1:1):c<d?-1:1}if(!M(a)||!c)return a;c=M(c)?c:[c];c=Uc(c,function(a){var c=!1,d=a||Da;if(w(a)){if("+"==a.charAt(0)||"-"==a.charAt(0))c="-"==a.charAt(0),a=a.substring(1);d=b(a);if(d.constant){var f=d();return e(function(a,b){return g(a[f],b[f])},c)}}return e(function(a,b){return g(d(a),d(b))},c)});for(var f=[],h=0;h<a.length;h++)f.push(a[h]);return f.sort(e(function(a,b){for(var d=
0;d<c.length;d++){var e=c[d](a,b);if(0!==e)return e}return 0},d))}}function va(b){P(b)&&(b={link:b});b.restrict=b.restrict||"AC";return aa(b)}function Oc(b,a,c,d){function e(a,c){c=c?"-"+fb(c,"-"):"";d.removeClass(b,(a?qb:rb)+c);d.addClass(b,(a?rb:qb)+c)}var g=this,f=b.parent().controller("form")||sb,h=0,l=g.$error={},k=[];g.$name=a.name||a.ngForm;g.$dirty=!1;g.$pristine=!0;g.$valid=!0;g.$invalid=!1;f.$addControl(g);b.addClass(La);e(!0);g.$addControl=function(a){Aa(a.$name,"input");k.push(a);a.$name&&
(g[a.$name]=a)};g.$removeControl=function(a){a.$name&&g[a.$name]===a&&delete g[a.$name];q(l,function(b,c){g.$setValidity(c,!0,a)});Oa(k,a)};g.$setValidity=function(a,b,c){var d=l[a];if(b)d&&(Oa(d,c),d.length||(h--,h||(e(b),g.$valid=!0,g.$invalid=!1),l[a]=!1,e(!0,a),f.$setValidity(a,!0,g)));else{h||e(b);if(d){if(-1!=db(d,c))return}else l[a]=d=[],h++,e(!1,a),f.$setValidity(a,!1,g);d.push(c);g.$valid=!1;g.$invalid=!0}};g.$setDirty=function(){d.removeClass(b,La);d.addClass(b,tb);g.$dirty=!0;g.$pristine=
!1;f.$setDirty()};g.$setPristine=function(){d.removeClass(b,tb);d.addClass(b,La);g.$dirty=!1;g.$pristine=!0;q(k,function(a){a.$setPristine()})}}function pa(b,a,c,d){b.$setValidity(a,c);return c?d:s}function Je(b,a,c){var d=c.prop("validity");X(d)&&b.$parsers.push(function(c){if(b.$error[a]||!(d.badInput||d.customError||d.typeMismatch)||d.valueMissing)return c;b.$setValidity(a,!1)})}function ub(b,a,c,d,e,g){var f=a.prop("validity");if(!e.android){var h=!1;a.on("compositionstart",function(a){h=!0});
a.on("compositionend",function(){h=!1;l()})}var l=function(){if(!h){var e=a.val();Qa(c.ngTrim||"T")&&(e=ca(e));if(d.$viewValue!==e||f&&""===e&&!f.valueMissing)b.$$phase?d.$setViewValue(e):b.$apply(function(){d.$setViewValue(e)})}};if(e.hasEvent("input"))a.on("input",l);else{var k,m=function(){k||(k=g.defer(function(){l();k=null}))};a.on("keydown",function(a){a=a.keyCode;91===a||(15<a&&19>a||37<=a&&40>=a)||m()});if(e.hasEvent("paste"))a.on("paste cut",m)}a.on("change",l);d.$render=function(){a.val(d.$isEmpty(d.$viewValue)?
"":d.$viewValue)};var n=c.ngPattern;n&&((e=n.match(/^\/(.*)\/([gim]*)$/))?(n=RegExp(e[1],e[2]),e=function(a){return pa(d,"pattern",d.$isEmpty(a)||n.test(a),a)}):e=function(c){var e=b.$eval(n);if(!e||!e.test)throw t("ngPattern")("noregexp",n,e,ha(a));return pa(d,"pattern",d.$isEmpty(c)||e.test(c),c)},d.$formatters.push(e),d.$parsers.push(e));if(c.ngMinlength){var p=Y(c.ngMinlength);e=function(a){return pa(d,"minlength",d.$isEmpty(a)||a.length>=p,a)};d.$parsers.push(e);d.$formatters.push(e)}if(c.ngMaxlength){var r=
Y(c.ngMaxlength);e=function(a){return pa(d,"maxlength",d.$isEmpty(a)||a.length<=r,a)};d.$parsers.push(e);d.$formatters.push(e)}}function Pb(b,a){b="ngClass"+b;return["$animate",function(c){function d(a,b){var c=[],d=0;a:for(;d<a.length;d++){for(var e=a[d],m=0;m<b.length;m++)if(e==b[m])continue a;c.push(e)}return c}function e(a){if(!M(a)){if(w(a))return a.split(" ");if(X(a)){var b=[];q(a,function(a,c){a&&b.push(c)});return b}}return a}return{restrict:"AC",link:function(g,f,h){function l(a,b){var c=
f.data("$classCounts")||{},d=[];q(a,function(a){if(0<b||c[a])c[a]=(c[a]||0)+b,c[a]===+(0<b)&&d.push(a)});f.data("$classCounts",c);return d.join(" ")}function k(b){if(!0===a||g.$index%2===a){var k=e(b||[]);if(!m){var r=l(k,1);h.$addClass(r)}else if(!xa(b,m)){var q=e(m),r=d(k,q),k=d(q,k),k=l(k,-1),r=l(r,1);0===r.length?c.removeClass(f,k):0===k.length?c.addClass(f,r):c.setClass(f,r,k)}}m=ba(b)}var m;g.$watch(h[b],k,!0);h.$observe("class",function(a){k(g.$eval(h[b]))});"ngClass"!==b&&g.$watch("$index",
function(c,d){var f=c&1;if(f!==d&1){var k=e(g.$eval(h[b]));f===a?(f=l(k,1),h.$addClass(f)):(f=l(k,-1),h.$removeClass(f))}})}}}]}var K=function(b){return w(b)?b.toLowerCase():b},Fc=Object.prototype.hasOwnProperty,Fa=function(b){return w(b)?b.toUpperCase():b},S,y,Ga,ya=[].slice,Ke=[].push,wa=Object.prototype.toString,Pa=t("ng"),Ea=O.angular||(O.angular={}),Sa,Ka,ka=["0","0","0"];S=Y((/msie (\d+)/.exec(K(navigator.userAgent))||[])[1]);isNaN(S)&&(S=Y((/trident\/.*; rv:(\d+)/.exec(K(navigator.userAgent))||
[])[1]));C.$inject=[];Da.$inject=[];var ca=function(){return String.prototype.trim?function(b){return w(b)?b.trim():b}:function(b){return w(b)?b.replace(/^\s\s*/,"").replace(/\s\s*$/,""):b}}();Ka=9>S?function(b){b=b.nodeName?b:b[0];return b.scopeName&&"HTML"!=b.scopeName?Fa(b.scopeName+":"+b.nodeName):b.nodeName}:function(b){return b.nodeName?b.nodeName:b[0].nodeName};var Xc=/[A-Z]/g,$c={full:"1.2.16",major:1,minor:2,dot:16,codeName:"badger-enumeration"},Ua=N.cache={},gb=N.expando="ng-"+(new Date).getTime(),
me=1,Pc=O.document.addEventListener?function(b,a,c){b.addEventListener(a,c,!1)}:function(b,a,c){b.attachEvent("on"+a,c)},Fb=O.document.removeEventListener?function(b,a,c){b.removeEventListener(a,c,!1)}:function(b,a,c){b.detachEvent("on"+a,c)};N._data=function(b){return this.cache[b[this.expando]]||{}};var he=/([\:\-\_]+(.))/g,ie=/^moz([A-Z])/,Bb=t("jqLite"),je=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,Cb=/<|&#?\w+;/,ke=/<([\w:]+)/,le=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,ea=
{option:[1,'<select multiple="multiple">',"</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ea.optgroup=ea.option;ea.tbody=ea.tfoot=ea.colgroup=ea.caption=ea.thead;ea.th=ea.td;var Ja=N.prototype={ready:function(b){function a(){c||(c=!0,b())}var c=!1;"complete"===U.readyState?setTimeout(a):(this.on("DOMContentLoaded",a),N(O).on("load",a))},toString:function(){var b=
[];q(this,function(a){b.push(""+a)});return"["+b.join(", ")+"]"},eq:function(b){return 0<=b?y(this[b]):y(this[this.length+b])},length:0,push:Ke,sort:[].sort,splice:[].splice},kb={};q("multiple selected checked disabled readOnly required open".split(" "),function(b){kb[K(b)]=b});var nc={};q("input select option textarea button form details".split(" "),function(b){nc[Fa(b)]=!0});q({data:jc,inheritedData:jb,scope:function(b){return y(b).data("$scope")||jb(b.parentNode||b,["$isolateScope","$scope"])},
isolateScope:function(b){return y(b).data("$isolateScope")||y(b).data("$isolateScopeNoTemplate")},controller:kc,injector:function(b){return jb(b,"$injector")},removeAttr:function(b,a){b.removeAttribute(a)},hasClass:Gb,css:function(b,a,c){a=Ta(a);if(B(c))b.style[a]=c;else{var d;8>=S&&(d=b.currentStyle&&b.currentStyle[a],""===d&&(d="auto"));d=d||b.style[a];8>=S&&(d=""===d?s:d);return d}},attr:function(b,a,c){var d=K(a);if(kb[d])if(B(c))c?(b[a]=!0,b.setAttribute(a,d)):(b[a]=!1,b.removeAttribute(d));
else return b[a]||(b.attributes.getNamedItem(a)||C).specified?d:s;else if(B(c))b.setAttribute(a,c);else if(b.getAttribute)return b=b.getAttribute(a,2),null===b?s:b},prop:function(b,a,c){if(B(c))b[a]=c;else return b[a]},text:function(){function b(b,d){var e=a[b.nodeType];if(E(d))return e?b[e]:"";b[e]=d}var a=[];9>S?(a[1]="innerText",a[3]="nodeValue"):a[1]=a[3]="textContent";b.$dv="";return b}(),val:function(b,a){if(E(a)){if("SELECT"===Ka(b)&&b.multiple){var c=[];q(b.options,function(a){a.selected&&
c.push(a.value||a.text)});return 0===c.length?null:c}return b.value}b.value=a},html:function(b,a){if(E(a))return b.innerHTML;for(var c=0,d=b.childNodes;c<d.length;c++)Ha(d[c]);b.innerHTML=a},empty:lc},function(b,a){N.prototype[a]=function(a,d){var e,g;if(b!==lc&&(2==b.length&&b!==Gb&&b!==kc?a:d)===s){if(X(a)){for(e=0;e<this.length;e++)if(b===jc)b(this[e],a);else for(g in a)b(this[e],g,a[g]);return this}e=b.$dv;g=e===s?Math.min(this.length,1):this.length;for(var f=0;f<g;f++){var h=b(this[f],a,d);e=
e?e+h:h}return e}for(e=0;e<this.length;e++)b(this[e],a,d);return this}});q({removeData:hc,dealoc:Ha,on:function a(c,d,e,g){if(B(g))throw Bb("onargs");var f=la(c,"events"),h=la(c,"handle");f||la(c,"events",f={});h||la(c,"handle",h=ne(c,f));q(d.split(" "),function(d){var g=f[d];if(!g){if("mouseenter"==d||"mouseleave"==d){var m=U.body.contains||U.body.compareDocumentPosition?function(a,c){var d=9===a.nodeType?a.documentElement:a,e=c&&c.parentNode;return a===e||!!(e&&1===e.nodeType&&(d.contains?d.contains(e):
a.compareDocumentPosition&&a.compareDocumentPosition(e)&16))}:function(a,c){if(c)for(;c=c.parentNode;)if(c===a)return!0;return!1};f[d]=[];a(c,{mouseleave:"mouseout",mouseenter:"mouseover"}[d],function(a){var c=a.relatedTarget;c&&(c===this||m(this,c))||h(a,d)})}else Pc(c,d,h),f[d]=[];g=f[d]}g.push(e)})},off:ic,one:function(a,c,d){a=y(a);a.on(c,function g(){a.off(c,d);a.off(c,g)});a.on(c,d)},replaceWith:function(a,c){var d,e=a.parentNode;Ha(a);q(new N(c),function(c){d?e.insertBefore(c,d.nextSibling):
e.replaceChild(c,a);d=c})},children:function(a){var c=[];q(a.childNodes,function(a){1===a.nodeType&&c.push(a)});return c},contents:function(a){return a.contentDocument||a.childNodes||[]},append:function(a,c){q(new N(c),function(c){1!==a.nodeType&&11!==a.nodeType||a.appendChild(c)})},prepend:function(a,c){if(1===a.nodeType){var d=a.firstChild;q(new N(c),function(c){a.insertBefore(c,d)})}},wrap:function(a,c){c=y(c)[0];var d=a.parentNode;d&&d.replaceChild(c,a);c.appendChild(a)},remove:function(a){Ha(a);
var c=a.parentNode;c&&c.removeChild(a)},after:function(a,c){var d=a,e=a.parentNode;q(new N(c),function(a){e.insertBefore(a,d.nextSibling);d=a})},addClass:ib,removeClass:hb,toggleClass:function(a,c,d){c&&q(c.split(" "),function(c){var g=d;E(g)&&(g=!Gb(a,c));(g?ib:hb)(a,c)})},parent:function(a){return(a=a.parentNode)&&11!==a.nodeType?a:null},next:function(a){if(a.nextElementSibling)return a.nextElementSibling;for(a=a.nextSibling;null!=a&&1!==a.nodeType;)a=a.nextSibling;return a},find:function(a,c){return a.getElementsByTagName?
a.getElementsByTagName(c):[]},clone:Eb,triggerHandler:function(a,c,d){c=(la(a,"events")||{})[c];d=d||[];var e=[{preventDefault:C,stopPropagation:C}];q(c,function(c){c.apply(a,e.concat(d))})}},function(a,c){N.prototype[c]=function(c,e,g){for(var f,h=0;h<this.length;h++)E(f)?(f=a(this[h],c,e,g),B(f)&&(f=y(f))):Db(f,a(this[h],c,e,g));return B(f)?f:this};N.prototype.bind=N.prototype.on;N.prototype.unbind=N.prototype.off});Va.prototype={put:function(a,c){this[Ia(a)]=c},get:function(a){return this[Ia(a)]},
remove:function(a){var c=this[a=Ia(a)];delete this[a];return c}};var pe=/^function\s*[^\(]*\(\s*([^\)]*)\)/m,qe=/,/,re=/^\s*(_?)(\S+?)\1\s*$/,oe=/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,Wa=t("$injector"),Le=t("$animate"),Ld=["$provide",function(a){this.$$selectors={};this.register=function(c,d){var e=c+"-animation";if(c&&"."!=c.charAt(0))throw Le("notcsel",c);this.$$selectors[c.substr(1)]=e;a.factory(e,d)};this.classNameFilter=function(a){1===arguments.length&&(this.$$classNameFilter=a instanceof RegExp?
a:null);return this.$$classNameFilter};this.$get=["$timeout","$$asyncCallback",function(a,d){return{enter:function(a,c,f,h){f?f.after(a):(c&&c[0]||(c=f.parent()),c.append(a));h&&d(h)},leave:function(a,c){a.remove();c&&d(c)},move:function(a,c,d,h){this.enter(a,c,d,h)},addClass:function(a,c,f){c=w(c)?c:M(c)?c.join(" "):"";q(a,function(a){ib(a,c)});f&&d(f)},removeClass:function(a,c,f){c=w(c)?c:M(c)?c.join(" "):"";q(a,function(a){hb(a,c)});f&&d(f)},setClass:function(a,c,f,h){q(a,function(a){ib(a,c);hb(a,
f)});h&&d(h)},enabled:C}}]}],ja=t("$compile");cc.$inject=["$provide","$$sanitizeUriProvider"];var te=/^(x[\:\-_]|data[\:\-_])/i,vc=t("$interpolate"),Me=/^([^\?#]*)(\?([^#]*))?(#(.*))?$/,we={http:80,https:443,ftp:21},Kb=t("$location");Ac.prototype=Lb.prototype=zc.prototype={$$html5:!1,$$replace:!1,absUrl:nb("$$absUrl"),url:function(a,c){if(E(a))return this.$$url;var d=Me.exec(a);d[1]&&this.path(decodeURIComponent(d[1]));(d[2]||d[1])&&this.search(d[3]||"");this.hash(d[5]||"",c);return this},protocol:nb("$$protocol"),
host:nb("$$host"),port:nb("$$port"),path:Bc("$$path",function(a){return"/"==a.charAt(0)?a:"/"+a}),search:function(a,c){switch(arguments.length){case 0:return this.$$search;case 1:if(w(a))this.$$search=Yb(a);else if(X(a))this.$$search=a;else throw Kb("isrcharg");break;default:E(c)||null===c?delete this.$$search[a]:this.$$search[a]=c}this.$$compose();return this},hash:Bc("$$hash",Da),replace:function(){this.$$replace=!0;return this}};var Ba=t("$parse"),Ec={},ta,Ma={"null":function(){return null},"true":function(){return!0},
"false":function(){return!1},undefined:C,"+":function(a,c,d,e){d=d(a,c);e=e(a,c);return B(d)?B(e)?d+e:d:B(e)?e:s},"-":function(a,c,d,e){d=d(a,c);e=e(a,c);return(B(d)?d:0)-(B(e)?e:0)},"*":function(a,c,d,e){return d(a,c)*e(a,c)},"/":function(a,c,d,e){return d(a,c)/e(a,c)},"%":function(a,c,d,e){return d(a,c)%e(a,c)},"^":function(a,c,d,e){return d(a,c)^e(a,c)},"=":C,"===":function(a,c,d,e){return d(a,c)===e(a,c)},"!==":function(a,c,d,e){return d(a,c)!==e(a,c)},"==":function(a,c,d,e){return d(a,c)==e(a,
c)},"!=":function(a,c,d,e){return d(a,c)!=e(a,c)},"<":function(a,c,d,e){return d(a,c)<e(a,c)},">":function(a,c,d,e){return d(a,c)>e(a,c)},"<=":function(a,c,d,e){return d(a,c)<=e(a,c)},">=":function(a,c,d,e){return d(a,c)>=e(a,c)},"&&":function(a,c,d,e){return d(a,c)&&e(a,c)},"||":function(a,c,d,e){return d(a,c)||e(a,c)},"&":function(a,c,d,e){return d(a,c)&e(a,c)},"|":function(a,c,d,e){return e(a,c)(a,c,d(a,c))},"!":function(a,c,d){return!d(a,c)}},Ne={n:"\n",f:"\f",r:"\r",t:"\t",v:"\v","'":"'",'"':'"'},
Nb=function(a){this.options=a};Nb.prototype={constructor:Nb,lex:function(a){this.text=a;this.index=0;this.ch=s;this.lastCh=":";this.tokens=[];var c;for(a=[];this.index<this.text.length;){this.ch=this.text.charAt(this.index);if(this.is("\"'"))this.readString(this.ch);else if(this.isNumber(this.ch)||this.is(".")&&this.isNumber(this.peek()))this.readNumber();else if(this.isIdent(this.ch))this.readIdent(),this.was("{,")&&("{"===a[0]&&(c=this.tokens[this.tokens.length-1]))&&(c.json=-1===c.text.indexOf("."));
else if(this.is("(){}[].,;:?"))this.tokens.push({index:this.index,text:this.ch,json:this.was(":[,")&&this.is("{[")||this.is("}]:,")}),this.is("{[")&&a.unshift(this.ch),this.is("}]")&&a.shift(),this.index++;else if(this.isWhitespace(this.ch)){this.index++;continue}else{var d=this.ch+this.peek(),e=d+this.peek(2),g=Ma[this.ch],f=Ma[d],h=Ma[e];h?(this.tokens.push({index:this.index,text:e,fn:h}),this.index+=3):f?(this.tokens.push({index:this.index,text:d,fn:f}),this.index+=2):g?(this.tokens.push({index:this.index,
text:this.ch,fn:g,json:this.was("[,:")&&this.is("+-")}),this.index+=1):this.throwError("Unexpected next character ",this.index,this.index+1)}this.lastCh=this.ch}return this.tokens},is:function(a){return-1!==a.indexOf(this.ch)},was:function(a){return-1!==a.indexOf(this.lastCh)},peek:function(a){a=a||1;return this.index+a<this.text.length?this.text.charAt(this.index+a):!1},isNumber:function(a){return"0"<=a&&"9">=a},isWhitespace:function(a){return" "===a||"\r"===a||"\t"===a||"\n"===a||"\v"===a||"\u00a0"===
a},isIdent:function(a){return"a"<=a&&"z">=a||"A"<=a&&"Z">=a||"_"===a||"$"===a},isExpOperator:function(a){return"-"===a||"+"===a||this.isNumber(a)},throwError:function(a,c,d){d=d||this.index;c=B(c)?"s "+c+"-"+this.index+" ["+this.text.substring(c,d)+"]":" "+d;throw Ba("lexerr",a,c,this.text);},readNumber:function(){for(var a="",c=this.index;this.index<this.text.length;){var d=K(this.text.charAt(this.index));if("."==d||this.isNumber(d))a+=d;else{var e=this.peek();if("e"==d&&this.isExpOperator(e))a+=
d;else if(this.isExpOperator(d)&&e&&this.isNumber(e)&&"e"==a.charAt(a.length-1))a+=d;else if(!this.isExpOperator(d)||e&&this.isNumber(e)||"e"!=a.charAt(a.length-1))break;else this.throwError("Invalid exponent")}this.index++}a*=1;this.tokens.push({index:c,text:a,json:!0,fn:function(){return a}})},readIdent:function(){for(var a=this,c="",d=this.index,e,g,f,h;this.index<this.text.length;){h=this.text.charAt(this.index);if("."===h||this.isIdent(h)||this.isNumber(h))"."===h&&(e=this.index),c+=h;else break;
this.index++}if(e)for(g=this.index;g<this.text.length;){h=this.text.charAt(g);if("("===h){f=c.substr(e-d+1);c=c.substr(0,e-d);this.index=g;break}if(this.isWhitespace(h))g++;else break}d={index:d,text:c};if(Ma.hasOwnProperty(c))d.fn=Ma[c],d.json=Ma[c];else{var l=Dc(c,this.options,this.text);d.fn=D(function(a,c){return l(a,c)},{assign:function(d,e){return ob(d,c,e,a.text,a.options)}})}this.tokens.push(d);f&&(this.tokens.push({index:e,text:".",json:!1}),this.tokens.push({index:e+1,text:f,json:!1}))},
readString:function(a){var c=this.index;this.index++;for(var d="",e=a,g=!1;this.index<this.text.length;){var f=this.text.charAt(this.index),e=e+f;if(g)"u"===f?(f=this.text.substring(this.index+1,this.index+5),f.match(/[\da-f]{4}/i)||this.throwError("Invalid unicode escape [\\u"+f+"]"),this.index+=4,d+=String.fromCharCode(parseInt(f,16))):d=(g=Ne[f])?d+g:d+f,g=!1;else if("\\"===f)g=!0;else{if(f===a){this.index++;this.tokens.push({index:c,text:e,string:d,json:!0,fn:function(){return d}});return}d+=
f}this.index++}this.throwError("Unterminated quote",c)}};var $a=function(a,c,d){this.lexer=a;this.$filter=c;this.options=d};$a.ZERO=D(function(){return 0},{constant:!0});$a.prototype={constructor:$a,parse:function(a,c){this.text=a;this.json=c;this.tokens=this.lexer.lex(a);c&&(this.assignment=this.logicalOR,this.functionCall=this.fieldAccess=this.objectIndex=this.filterChain=function(){this.throwError("is not valid json",{text:a,index:0})});var d=c?this.primary():this.statements();0!==this.tokens.length&&
this.throwError("is an unexpected token",this.tokens[0]);d.literal=!!d.literal;d.constant=!!d.constant;return d},primary:function(){var a;if(this.expect("("))a=this.filterChain(),this.consume(")");else if(this.expect("["))a=this.arrayDeclaration();else if(this.expect("{"))a=this.object();else{var c=this.expect();(a=c.fn)||this.throwError("not a primary expression",c);c.json&&(a.constant=!0,a.literal=!0)}for(var d;c=this.expect("(","[",".");)"("===c.text?(a=this.functionCall(a,d),d=null):"["===c.text?
(d=a,a=this.objectIndex(a)):"."===c.text?(d=a,a=this.fieldAccess(a)):this.throwError("IMPOSSIBLE");return a},throwError:function(a,c){throw Ba("syntax",c.text,a,c.index+1,this.text,this.text.substring(c.index));},peekToken:function(){if(0===this.tokens.length)throw Ba("ueoe",this.text);return this.tokens[0]},peek:function(a,c,d,e){if(0<this.tokens.length){var g=this.tokens[0],f=g.text;if(f===a||f===c||f===d||f===e||!(a||c||d||e))return g}return!1},expect:function(a,c,d,e){return(a=this.peek(a,c,d,
e))?(this.json&&!a.json&&this.throwError("is not valid json",a),this.tokens.shift(),a):!1},consume:function(a){this.expect(a)||this.throwError("is unexpected, expecting ["+a+"]",this.peek())},unaryFn:function(a,c){return D(function(d,e){return a(d,e,c)},{constant:c.constant})},ternaryFn:function(a,c,d){return D(function(e,g){return a(e,g)?c(e,g):d(e,g)},{constant:a.constant&&c.constant&&d.constant})},binaryFn:function(a,c,d){return D(function(e,g){return c(e,g,a,d)},{constant:a.constant&&d.constant})},
statements:function(){for(var a=[];;)if(0<this.tokens.length&&!this.peek("}",")",";","]")&&a.push(this.filterChain()),!this.expect(";"))return 1===a.length?a[0]:function(c,d){for(var e,g=0;g<a.length;g++){var f=a[g];f&&(e=f(c,d))}return e}},filterChain:function(){for(var a=this.expression(),c;;)if(c=this.expect("|"))a=this.binaryFn(a,c.fn,this.filter());else return a},filter:function(){for(var a=this.expect(),c=this.$filter(a.text),d=[];;)if(a=this.expect(":"))d.push(this.expression());else{var e=
function(a,e,h){h=[h];for(var l=0;l<d.length;l++)h.push(d[l](a,e));return c.apply(a,h)};return function(){return e}}},expression:function(){return this.assignment()},assignment:function(){var a=this.ternary(),c,d;return(d=this.expect("="))?(a.assign||this.throwError("implies assignment but ["+this.text.substring(0,d.index)+"] can not be assigned to",d),c=this.ternary(),function(d,g){return a.assign(d,c(d,g),g)}):a},ternary:function(){var a=this.logicalOR(),c,d;if(this.expect("?")){c=this.ternary();
if(d=this.expect(":"))return this.ternaryFn(a,c,this.ternary());this.throwError("expected :",d)}else return a},logicalOR:function(){for(var a=this.logicalAND(),c;;)if(c=this.expect("||"))a=this.binaryFn(a,c.fn,this.logicalAND());else return a},logicalAND:function(){var a=this.equality(),c;if(c=this.expect("&&"))a=this.binaryFn(a,c.fn,this.logicalAND());return a},equality:function(){var a=this.relational(),c;if(c=this.expect("==","!=","===","!=="))a=this.binaryFn(a,c.fn,this.equality());return a},
relational:function(){var a=this.additive(),c;if(c=this.expect("<",">","<=",">="))a=this.binaryFn(a,c.fn,this.relational());return a},additive:function(){for(var a=this.multiplicative(),c;c=this.expect("+","-");)a=this.binaryFn(a,c.fn,this.multiplicative());return a},multiplicative:function(){for(var a=this.unary(),c;c=this.expect("*","/","%");)a=this.binaryFn(a,c.fn,this.unary());return a},unary:function(){var a;return this.expect("+")?this.primary():(a=this.expect("-"))?this.binaryFn($a.ZERO,a.fn,
this.unary()):(a=this.expect("!"))?this.unaryFn(a.fn,this.unary()):this.primary()},fieldAccess:function(a){var c=this,d=this.expect().text,e=Dc(d,this.options,this.text);return D(function(c,d,h){return e(h||a(c,d))},{assign:function(e,f,h){return ob(a(e,h),d,f,c.text,c.options)}})},objectIndex:function(a){var c=this,d=this.expression();this.consume("]");return D(function(e,g){var f=a(e,g),h=d(e,g),l;if(!f)return s;(f=Za(f[h],c.text))&&(f.then&&c.options.unwrapPromises)&&(l=f,"$$v"in f||(l.$$v=s,l.then(function(a){l.$$v=
a})),f=f.$$v);return f},{assign:function(e,g,f){var h=d(e,f);return Za(a(e,f),c.text)[h]=g}})},functionCall:function(a,c){var d=[];if(")"!==this.peekToken().text){do d.push(this.expression());while(this.expect(","))}this.consume(")");var e=this;return function(g,f){for(var h=[],l=c?c(g,f):g,k=0;k<d.length;k++)h.push(d[k](g,f));k=a(g,f,l)||C;Za(l,e.text);Za(k,e.text);h=k.apply?k.apply(l,h):k(h[0],h[1],h[2],h[3],h[4]);return Za(h,e.text)}},arrayDeclaration:function(){var a=[],c=!0;if("]"!==this.peekToken().text){do{if(this.peek("]"))break;
var d=this.expression();a.push(d);d.constant||(c=!1)}while(this.expect(","))}this.consume("]");return D(function(c,d){for(var f=[],h=0;h<a.length;h++)f.push(a[h](c,d));return f},{literal:!0,constant:c})},object:function(){var a=[],c=!0;if("}"!==this.peekToken().text){do{if(this.peek("}"))break;var d=this.expect(),d=d.string||d.text;this.consume(":");var e=this.expression();a.push({key:d,value:e});e.constant||(c=!1)}while(this.expect(","))}this.consume("}");return D(function(c,d){for(var e={},l=0;l<
a.length;l++){var k=a[l];e[k.key]=k.value(c,d)}return e},{literal:!0,constant:c})}};var Mb={},ua=t("$sce"),ga={HTML:"html",CSS:"css",URL:"url",RESOURCE_URL:"resourceUrl",JS:"js"},W=U.createElement("a"),Hc=sa(O.location.href,!0);gc.$inject=["$provide"];Ic.$inject=["$locale"];Kc.$inject=["$locale"];var Nc=".",Ie={yyyy:$("FullYear",4),yy:$("FullYear",2,0,!0),y:$("FullYear",1),MMMM:pb("Month"),MMM:pb("Month",!0),MM:$("Month",2,1),M:$("Month",1,1),dd:$("Date",2),d:$("Date",1),HH:$("Hours",2),H:$("Hours",
1),hh:$("Hours",2,-12),h:$("Hours",1,-12),mm:$("Minutes",2),m:$("Minutes",1),ss:$("Seconds",2),s:$("Seconds",1),sss:$("Milliseconds",3),EEEE:pb("Day"),EEE:pb("Day",!0),a:function(a,c){return 12>a.getHours()?c.AMPMS[0]:c.AMPMS[1]},Z:function(a){a=-1*a.getTimezoneOffset();return a=(0<=a?"+":"")+(Ob(Math[0<a?"floor":"ceil"](a/60),2)+Ob(Math.abs(a%60),2))}},He=/((?:[^yMdHhmsaZE']+)|(?:'(?:[^']|'')*')|(?:E+|y+|M+|d+|H+|h+|m+|s+|a|Z))(.*)/,Ge=/^\-?\d+$/;Jc.$inject=["$locale"];var Ee=aa(K),Fe=aa(Fa);Lc.$inject=
["$parse"];var cd=aa({restrict:"E",compile:function(a,c){8>=S&&(c.href||c.name||c.$set("href",""),a.append(U.createComment("IE fix")));if(!c.href&&!c.xlinkHref&&!c.name)return function(a,c){var g="[object SVGAnimatedString]"===wa.call(c.prop("href"))?"xlink:href":"href";c.on("click",function(a){c.attr(g)||a.preventDefault()})}}}),zb={};q(kb,function(a,c){if("multiple"!=a){var d=na("ng-"+c);zb[d]=function(){return{priority:100,link:function(a,g,f){a.$watch(f[d],function(a){f.$set(c,!!a)})}}}}});q(["src",
"srcset","href"],function(a){var c=na("ng-"+a);zb[c]=function(){return{priority:99,link:function(d,e,g){var f=a,h=a;"href"===a&&"[object SVGAnimatedString]"===wa.call(e.prop("href"))&&(h="xlinkHref",g.$attr[h]="xlink:href",f=null);g.$observe(c,function(a){a&&(g.$set(h,a),S&&f&&e.prop(f,g[h]))})}}}});var sb={$addControl:C,$removeControl:C,$setValidity:C,$setDirty:C,$setPristine:C};Oc.$inject=["$element","$attrs","$scope","$animate"];var Qc=function(a){return["$timeout",function(c){return{name:"form",
restrict:a?"EAC":"E",controller:Oc,compile:function(){return{pre:function(a,e,g,f){if(!g.action){var h=function(a){a.preventDefault?a.preventDefault():a.returnValue=!1};Pc(e[0],"submit",h);e.on("$destroy",function(){c(function(){Fb(e[0],"submit",h)},0,!1)})}var l=e.parent().controller("form"),k=g.name||g.ngForm;k&&ob(a,k,f,k);if(l)e.on("$destroy",function(){l.$removeControl(f);k&&ob(a,k,s,k);D(f,sb)})}}}}}]},dd=Qc(),qd=Qc(!0),Oe=/^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/,
Pe=/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9-]+(\.[a-z0-9-]+)*$/i,Qe=/^\s*(\-|\+)?(\d+|(\d*(\.\d*)))\s*$/,Rc={text:ub,number:function(a,c,d,e,g,f){ub(a,c,d,e,g,f);e.$parsers.push(function(a){var c=e.$isEmpty(a);if(c||Qe.test(a))return e.$setValidity("number",!0),""===a?null:c?a:parseFloat(a);e.$setValidity("number",!1);return s});Je(e,"number",c);e.$formatters.push(function(a){return e.$isEmpty(a)?"":""+a});d.min&&(a=function(a){var c=parseFloat(d.min);return pa(e,"min",e.$isEmpty(a)||a>=c,a)},e.$parsers.push(a),
e.$formatters.push(a));d.max&&(a=function(a){var c=parseFloat(d.max);return pa(e,"max",e.$isEmpty(a)||a<=c,a)},e.$parsers.push(a),e.$formatters.push(a));e.$formatters.push(function(a){return pa(e,"number",e.$isEmpty(a)||vb(a),a)})},url:function(a,c,d,e,g,f){ub(a,c,d,e,g,f);a=function(a){return pa(e,"url",e.$isEmpty(a)||Oe.test(a),a)};e.$formatters.push(a);e.$parsers.push(a)},email:function(a,c,d,e,g,f){ub(a,c,d,e,g,f);a=function(a){return pa(e,"email",e.$isEmpty(a)||Pe.test(a),a)};e.$formatters.push(a);
e.$parsers.push(a)},radio:function(a,c,d,e){E(d.name)&&c.attr("name",bb());c.on("click",function(){c[0].checked&&a.$apply(function(){e.$setViewValue(d.value)})});e.$render=function(){c[0].checked=d.value==e.$viewValue};d.$observe("value",e.$render)},checkbox:function(a,c,d,e){var g=d.ngTrueValue,f=d.ngFalseValue;w(g)||(g=!0);w(f)||(f=!1);c.on("click",function(){a.$apply(function(){e.$setViewValue(c[0].checked)})});e.$render=function(){c[0].checked=e.$viewValue};e.$isEmpty=function(a){return a!==g};
e.$formatters.push(function(a){return a===g});e.$parsers.push(function(a){return a?g:f})},hidden:C,button:C,submit:C,reset:C,file:C},dc=["$browser","$sniffer",function(a,c){return{restrict:"E",require:"?ngModel",link:function(d,e,g,f){f&&(Rc[K(g.type)]||Rc.text)(d,e,g,f,c,a)}}}],rb="ng-valid",qb="ng-invalid",La="ng-pristine",tb="ng-dirty",Re=["$scope","$exceptionHandler","$attrs","$element","$parse","$animate",function(a,c,d,e,g,f){function h(a,c){c=c?"-"+fb(c,"-"):"";f.removeClass(e,(a?qb:rb)+c);
f.addClass(e,(a?rb:qb)+c)}this.$modelValue=this.$viewValue=Number.NaN;this.$parsers=[];this.$formatters=[];this.$viewChangeListeners=[];this.$pristine=!0;this.$dirty=!1;this.$valid=!0;this.$invalid=!1;this.$name=d.name;var l=g(d.ngModel),k=l.assign;if(!k)throw t("ngModel")("nonassign",d.ngModel,ha(e));this.$render=C;this.$isEmpty=function(a){return E(a)||""===a||null===a||a!==a};var m=e.inheritedData("$formController")||sb,n=0,p=this.$error={};e.addClass(La);h(!0);this.$setValidity=function(a,c){p[a]!==
!c&&(c?(p[a]&&n--,n||(h(!0),this.$valid=!0,this.$invalid=!1)):(h(!1),this.$invalid=!0,this.$valid=!1,n++),p[a]=!c,h(c,a),m.$setValidity(a,c,this))};this.$setPristine=function(){this.$dirty=!1;this.$pristine=!0;f.removeClass(e,tb);f.addClass(e,La)};this.$setViewValue=function(d){this.$viewValue=d;this.$pristine&&(this.$dirty=!0,this.$pristine=!1,f.removeClass(e,La),f.addClass(e,tb),m.$setDirty());q(this.$parsers,function(a){d=a(d)});this.$modelValue!==d&&(this.$modelValue=d,k(a,d),q(this.$viewChangeListeners,
function(a){try{a()}catch(d){c(d)}}))};var r=this;a.$watch(function(){var c=l(a);if(r.$modelValue!==c){var d=r.$formatters,e=d.length;for(r.$modelValue=c;e--;)c=d[e](c);r.$viewValue!==c&&(r.$viewValue=c,r.$render())}return c})}],Fd=function(){return{require:["ngModel","^?form"],controller:Re,link:function(a,c,d,e){var g=e[0],f=e[1]||sb;f.$addControl(g);a.$on("$destroy",function(){f.$removeControl(g)})}}},Hd=aa({require:"ngModel",link:function(a,c,d,e){e.$viewChangeListeners.push(function(){a.$eval(d.ngChange)})}}),
ec=function(){return{require:"?ngModel",link:function(a,c,d,e){if(e){d.required=!0;var g=function(a){if(d.required&&e.$isEmpty(a))e.$setValidity("required",!1);else return e.$setValidity("required",!0),a};e.$formatters.push(g);e.$parsers.unshift(g);d.$observe("required",function(){g(e.$viewValue)})}}}},Gd=function(){return{require:"ngModel",link:function(a,c,d,e){var g=(a=/\/(.*)\//.exec(d.ngList))&&RegExp(a[1])||d.ngList||",";e.$parsers.push(function(a){if(!E(a)){var c=[];a&&q(a.split(g),function(a){a&&
c.push(ca(a))});return c}});e.$formatters.push(function(a){return M(a)?a.join(", "):s});e.$isEmpty=function(a){return!a||!a.length}}}},Se=/^(true|false|\d+)$/,Id=function(){return{priority:100,compile:function(a,c){return Se.test(c.ngValue)?function(a,c,g){g.$set("value",a.$eval(g.ngValue))}:function(a,c,g){a.$watch(g.ngValue,function(a){g.$set("value",a)})}}}},id=va(function(a,c,d){c.addClass("ng-binding").data("$binding",d.ngBind);a.$watch(d.ngBind,function(a){c.text(a==s?"":a)})}),kd=["$interpolate",
function(a){return function(c,d,e){c=a(d.attr(e.$attr.ngBindTemplate));d.addClass("ng-binding").data("$binding",c);e.$observe("ngBindTemplate",function(a){d.text(a)})}}],jd=["$sce","$parse",function(a,c){return function(d,e,g){e.addClass("ng-binding").data("$binding",g.ngBindHtml);var f=c(g.ngBindHtml);d.$watch(function(){return(f(d)||"").toString()},function(c){e.html(a.getTrustedHtml(f(d))||"")})}}],ld=Pb("",!0),nd=Pb("Odd",0),md=Pb("Even",1),od=va({compile:function(a,c){c.$set("ngCloak",s);a.removeClass("ng-cloak")}}),
pd=[function(){return{scope:!0,controller:"@",priority:500}}],fc={};q("click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste".split(" "),function(a){var c=na("ng-"+a);fc[c]=["$parse",function(d){return{compile:function(e,g){var f=d(g[c]);return function(c,d,e){d.on(K(a),function(a){c.$apply(function(){f(c,{$event:a})})})}}}}]});var sd=["$animate",function(a){return{transclude:"element",priority:600,terminal:!0,restrict:"A",
$$tlb:!0,link:function(c,d,e,g,f){var h,l,k;c.$watch(e.ngIf,function(g){Qa(g)?l||(l=c.$new(),f(l,function(c){c[c.length++]=U.createComment(" end ngIf: "+e.ngIf+" ");h={clone:c};a.enter(c,d.parent(),d)})):(k&&(k.remove(),k=null),l&&(l.$destroy(),l=null),h&&(k=yb(h.clone),a.leave(k,function(){k=null}),h=null))})}}}],td=["$http","$templateCache","$anchorScroll","$animate","$sce",function(a,c,d,e,g){return{restrict:"ECA",priority:400,terminal:!0,transclude:"element",controller:Ea.noop,compile:function(f,
h){var l=h.ngInclude||h.src,k=h.onload||"",m=h.autoscroll;return function(f,h,q,s,u){var F=0,v,y,A,x=function(){y&&(y.remove(),y=null);v&&(v.$destroy(),v=null);A&&(e.leave(A,function(){y=null}),y=A,A=null)};f.$watch(g.parseAsResourceUrl(l),function(g){var l=function(){!B(m)||m&&!f.$eval(m)||d()},q=++F;g?(a.get(g,{cache:c}).success(function(a){if(q===F){var c=f.$new();s.template=a;a=u(c,function(a){x();e.enter(a,null,h,l)});v=c;A=a;v.$emit("$includeContentLoaded");f.$eval(k)}}).error(function(){q===
F&&x()}),f.$emit("$includeContentRequested")):(x(),s.template=null)})}}}}],Jd=["$compile",function(a){return{restrict:"ECA",priority:-400,require:"ngInclude",link:function(c,d,e,g){d.html(g.template);a(d.contents())(c)}}}],ud=va({priority:450,compile:function(){return{pre:function(a,c,d){a.$eval(d.ngInit)}}}}),vd=va({terminal:!0,priority:1E3}),wd=["$locale","$interpolate",function(a,c){var d=/{}/g;return{restrict:"EA",link:function(e,g,f){var h=f.count,l=f.$attr.when&&g.attr(f.$attr.when),k=f.offset||
0,m=e.$eval(l)||{},n={},p=c.startSymbol(),r=c.endSymbol(),s=/^when(Minus)?(.+)$/;q(f,function(a,c){s.test(c)&&(m[K(c.replace("when","").replace("Minus","-"))]=g.attr(f.$attr[c]))});q(m,function(a,e){n[e]=c(a.replace(d,p+h+"-"+k+r))});e.$watch(function(){var c=parseFloat(e.$eval(h));if(isNaN(c))return"";c in m||(c=a.pluralCat(c-k));return n[c](e,g,!0)},function(a){g.text(a)})}}}],xd=["$parse","$animate",function(a,c){var d=t("ngRepeat");return{transclude:"element",priority:1E3,terminal:!0,$$tlb:!0,
link:function(e,g,f,h,l){var k=f.ngRepeat,m=k.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/),n,p,r,s,u,F,v={$id:Ia};if(!m)throw d("iexp",k);f=m[1];h=m[2];(m=m[3])?(n=a(m),p=function(a,c,d){F&&(v[F]=a);v[u]=c;v.$index=d;return n(e,v)}):(r=function(a,c){return Ia(c)},s=function(a){return a});m=f.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/);if(!m)throw d("iidexp",f);u=m[3]||m[1];F=m[2];var B={};e.$watchCollection(h,function(a){var f,h,m=g[0],n,v={},H,R,w,C,T,t,
E=[];if(ab(a))T=a,n=p||r;else{n=p||s;T=[];for(w in a)a.hasOwnProperty(w)&&"$"!=w.charAt(0)&&T.push(w);T.sort()}H=T.length;h=E.length=T.length;for(f=0;f<h;f++)if(w=a===T?f:T[f],C=a[w],C=n(w,C,f),Aa(C,"`track by` id"),B.hasOwnProperty(C))t=B[C],delete B[C],v[C]=t,E[f]=t;else{if(v.hasOwnProperty(C))throw q(E,function(a){a&&a.scope&&(B[a.id]=a)}),d("dupes",k,C);E[f]={id:C};v[C]=!1}for(w in B)B.hasOwnProperty(w)&&(t=B[w],f=yb(t.clone),c.leave(f),q(f,function(a){a.$$NG_REMOVED=!0}),t.scope.$destroy());
f=0;for(h=T.length;f<h;f++){w=a===T?f:T[f];C=a[w];t=E[f];E[f-1]&&(m=E[f-1].clone[E[f-1].clone.length-1]);if(t.scope){R=t.scope;n=m;do n=n.nextSibling;while(n&&n.$$NG_REMOVED);t.clone[0]!=n&&c.move(yb(t.clone),null,y(m));m=t.clone[t.clone.length-1]}else R=e.$new();R[u]=C;F&&(R[F]=w);R.$index=f;R.$first=0===f;R.$last=f===H-1;R.$middle=!(R.$first||R.$last);R.$odd=!(R.$even=0===(f&1));t.scope||l(R,function(a){a[a.length++]=U.createComment(" end ngRepeat: "+k+" ");c.enter(a,null,y(m));m=a;t.scope=R;t.clone=
a;v[t.id]=t})}B=v})}}}],yd=["$animate",function(a){return function(c,d,e){c.$watch(e.ngShow,function(c){a[Qa(c)?"removeClass":"addClass"](d,"ng-hide")})}}],rd=["$animate",function(a){return function(c,d,e){c.$watch(e.ngHide,function(c){a[Qa(c)?"addClass":"removeClass"](d,"ng-hide")})}}],zd=va(function(a,c,d){a.$watch(d.ngStyle,function(a,d){d&&a!==d&&q(d,function(a,d){c.css(d,"")});a&&c.css(a)},!0)}),Ad=["$animate",function(a){return{restrict:"EA",require:"ngSwitch",controller:["$scope",function(){this.cases=
{}}],link:function(c,d,e,g){var f,h,l,k=[];c.$watch(e.ngSwitch||e.on,function(d){var n,p=k.length;if(0<p){if(l){for(n=0;n<p;n++)l[n].remove();l=null}l=[];for(n=0;n<p;n++){var r=h[n];k[n].$destroy();l[n]=r;a.leave(r,function(){l.splice(n,1);0===l.length&&(l=null)})}}h=[];k=[];if(f=g.cases["!"+d]||g.cases["?"])c.$eval(e.change),q(f,function(d){var e=c.$new();k.push(e);d.transclude(e,function(c){var e=d.element;h.push(c);a.enter(c,e.parent(),e)})})})}}}],Bd=va({transclude:"element",priority:800,require:"^ngSwitch",
link:function(a,c,d,e,g){e.cases["!"+d.ngSwitchWhen]=e.cases["!"+d.ngSwitchWhen]||[];e.cases["!"+d.ngSwitchWhen].push({transclude:g,element:c})}}),Cd=va({transclude:"element",priority:800,require:"^ngSwitch",link:function(a,c,d,e,g){e.cases["?"]=e.cases["?"]||[];e.cases["?"].push({transclude:g,element:c})}}),Ed=va({link:function(a,c,d,e,g){if(!g)throw t("ngTransclude")("orphan",ha(c));g(function(a){c.empty();c.append(a)})}}),ed=["$templateCache",function(a){return{restrict:"E",terminal:!0,compile:function(c,
d){"text/ng-template"==d.type&&a.put(d.id,c[0].text)}}}],Te=t("ngOptions"),Dd=aa({terminal:!0}),fd=["$compile","$parse",function(a,c){var d=/^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/,e={$setViewValue:C};return{restrict:"E",require:["select","?ngModel"],controller:["$element","$scope","$attrs",function(a,c,d){var l=this,k={},m=e,n;l.databound=
d.ngModel;l.init=function(a,c,d){m=a;n=d};l.addOption=function(c){Aa(c,'"option value"');k[c]=!0;m.$viewValue==c&&(a.val(c),n.parent()&&n.remove())};l.removeOption=function(a){this.hasOption(a)&&(delete k[a],m.$viewValue==a&&this.renderUnknownOption(a))};l.renderUnknownOption=function(c){c="? "+Ia(c)+" ?";n.val(c);a.prepend(n);a.val(c);n.prop("selected",!0)};l.hasOption=function(a){return k.hasOwnProperty(a)};c.$on("$destroy",function(){l.renderUnknownOption=C})}],link:function(e,f,h,l){function k(a,
c,d,e){d.$render=function(){var a=d.$viewValue;e.hasOption(a)?(A.parent()&&A.remove(),c.val(a),""===a&&w.prop("selected",!0)):E(a)&&w?c.val(""):e.renderUnknownOption(a)};c.on("change",function(){a.$apply(function(){A.parent()&&A.remove();d.$setViewValue(c.val())})})}function m(a,c,d){var e;d.$render=function(){var a=new Va(d.$viewValue);q(c.find("option"),function(c){c.selected=B(a.get(c.value))})};a.$watch(function(){xa(e,d.$viewValue)||(e=ba(d.$viewValue),d.$render())});c.on("change",function(){a.$apply(function(){var a=
[];q(c.find("option"),function(c){c.selected&&a.push(c.value)});d.$setViewValue(a)})})}function n(e,f,g){function h(){var a={"":[]},c=[""],d,k,s,t,z;t=g.$modelValue;z=y(e)||[];var E=n?Qb(z):z,F,I,A;I={};s=!1;var D,H;if(r)if(w&&M(t))for(s=new Va([]),A=0;A<t.length;A++)I[m]=t[A],s.put(w(e,I),t[A]);else s=new Va(t);for(A=0;F=E.length,A<F;A++){k=A;if(n){k=E[A];if("$"===k.charAt(0))continue;I[n]=k}I[m]=z[k];d=p(e,I)||"";(k=a[d])||(k=a[d]=[],c.push(d));r?d=B(s.remove(w?w(e,I):q(e,I))):(w?(d={},d[m]=t,d=
w(e,d)===w(e,I)):d=t===q(e,I),s=s||d);D=l(e,I);D=B(D)?D:"";k.push({id:w?w(e,I):n?E[A]:A,label:D,selected:d})}r||(u||null===t?a[""].unshift({id:"",label:"",selected:!s}):s||a[""].unshift({id:"?",label:"",selected:!0}));I=0;for(E=c.length;I<E;I++){d=c[I];k=a[d];x.length<=I?(t={element:C.clone().attr("label",d),label:k.label},z=[t],x.push(z),f.append(t.element)):(z=x[I],t=z[0],t.label!=d&&t.element.attr("label",t.label=d));D=null;A=0;for(F=k.length;A<F;A++)s=k[A],(d=z[A+1])?(D=d.element,d.label!==s.label&&
D.text(d.label=s.label),d.id!==s.id&&D.val(d.id=s.id),d.selected!==s.selected&&D.prop("selected",d.selected=s.selected)):(""===s.id&&u?H=u:(H=v.clone()).val(s.id).attr("selected",s.selected).text(s.label),z.push({element:H,label:s.label,id:s.id,selected:s.selected}),D?D.after(H):t.element.append(H),D=H);for(A++;z.length>A;)z.pop().element.remove()}for(;x.length>I;)x.pop()[0].element.remove()}var k;if(!(k=t.match(d)))throw Te("iexp",t,ha(f));var l=c(k[2]||k[1]),m=k[4]||k[6],n=k[5],p=c(k[3]||""),q=
c(k[2]?k[1]:m),y=c(k[7]),w=k[8]?c(k[8]):null,x=[[{element:f,label:""}]];u&&(a(u)(e),u.removeClass("ng-scope"),u.remove());f.empty();f.on("change",function(){e.$apply(function(){var a,c=y(e)||[],d={},h,k,l,p,t,v,u;if(r)for(k=[],p=0,v=x.length;p<v;p++)for(a=x[p],l=1,t=a.length;l<t;l++){if((h=a[l].element)[0].selected){h=h.val();n&&(d[n]=h);if(w)for(u=0;u<c.length&&(d[m]=c[u],w(e,d)!=h);u++);else d[m]=c[h];k.push(q(e,d))}}else{h=f.val();if("?"==h)k=s;else if(""===h)k=null;else if(w)for(u=0;u<c.length;u++){if(d[m]=
c[u],w(e,d)==h){k=q(e,d);break}}else d[m]=c[h],n&&(d[n]=h),k=q(e,d);1<x[0].length&&x[0][1].id!==h&&(x[0][1].selected=!1)}g.$setViewValue(k)})});g.$render=h;e.$watch(h)}if(l[1]){var p=l[0];l=l[1];var r=h.multiple,t=h.ngOptions,u=!1,w,v=y(U.createElement("option")),C=y(U.createElement("optgroup")),A=v.clone();h=0;for(var x=f.children(),D=x.length;h<D;h++)if(""===x[h].value){w=u=x.eq(h);break}p.init(l,u,A);r&&(l.$isEmpty=function(a){return!a||0===a.length});t?n(e,f,l):r?m(e,f,l):k(e,f,l,p)}}}}],hd=["$interpolate",
function(a){var c={addOption:C,removeOption:C};return{restrict:"E",priority:100,compile:function(d,e){if(E(e.value)){var g=a(d.text(),!0);g||e.$set("value",d.text())}return function(a,d,e){var k=d.parent(),m=k.data("$selectController")||k.parent().data("$selectController");m&&m.databound?d.prop("selected",!1):m=c;g?a.$watch(g,function(a,c){e.$set("value",a);a!==c&&m.removeOption(c);m.addOption(a)}):m.addOption(e.value);d.on("$destroy",function(){m.removeOption(e.value)})}}}}],gd=aa({restrict:"E",
terminal:!0});O.angular.bootstrap?console.log("WARNING: Tried to load angular more than once."):((Ga=O.jQuery)?(y=Ga,D(Ga.fn,{scope:Ja.scope,isolateScope:Ja.isolateScope,controller:Ja.controller,injector:Ja.injector,inheritedData:Ja.inheritedData}),Ab("remove",!0,!0,!1),Ab("empty",!1,!1,!1),Ab("html",!1,!1,!0)):y=N,Ea.element=y,Zc(Ea),y(U).ready(function(){Wc(U,$b)}))})(window,document);!angular.$$csp()&&angular.element(document).find("head").prepend('<style type="text/css">@charset "UTF-8";[ng\\:cloak],[ng-cloak],[data-ng-cloak],[x-ng-cloak],.ng-cloak,.x-ng-cloak,.ng-hide{display:none !important;}ng\\:form{display:block;}.ng-animate-block-transitions{transition:0s all!important;-webkit-transition:0s all!important;}</style>');
//# sourceMappingURL=angular.min.js.map

},{}],10:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":12}],11:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],12:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("/Users/russcodeschool/github/campus-courses-available/ShapingUpWithAngularJS/shaping_up_with_angular_js/specs/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":11,"/Users/russcodeschool/github/campus-courses-available/ShapingUpWithAngularJS/shaping_up_with_angular_js/specs/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":18,"inherits":17}],13:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":14,"ieee754":15}],14:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],15:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],17:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],18:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],19:[function(require,module,exports){
module.exports=require(11)
},{}],20:[function(require,module,exports){
module.exports=require(12)
},{"./support/isBuffer":19,"/Users/russcodeschool/github/campus-courses-available/ShapingUpWithAngularJS/shaping_up_with_angular_js/specs/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":18,"inherits":17}],"TBr+42":[function(require,module,exports){
module.exports = require('./lib/chai');

},{"./lib/chai":23}],"chai":[function(require,module,exports){
module.exports=require('TBr+42');
},{}],23:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var used = []
  , exports = module.exports = {};

/*!
 * Chai version
 */

exports.version = '1.8.1';

/*!
 * Assertion Error
 */

exports.AssertionError = require('assertion-error');

/*!
 * Utils for plugins (not exported)
 */

var util = require('./chai/utils');

/**
 * # .use(function)
 *
 * Provides a way to extend the internals of Chai
 *
 * @param {Function}
 * @returns {this} for chaining
 * @api public
 */

exports.use = function (fn) {
  if (!~used.indexOf(fn)) {
    fn(this, util);
    used.push(fn);
  }

  return this;
};

/*!
 * Primary `Assertion` prototype
 */

var assertion = require('./chai/assertion');
exports.use(assertion);

/*!
 * Core Assertions
 */

var core = require('./chai/core/assertions');
exports.use(core);

/*!
 * Expect interface
 */

var expect = require('./chai/interface/expect');
exports.use(expect);

/*!
 * Should interface
 */

var should = require('./chai/interface/should');
exports.use(should);

/*!
 * Assert interface
 */

var assert = require('./chai/interface/assert');
exports.use(assert);

},{"./chai/assertion":24,"./chai/core/assertions":25,"./chai/interface/assert":26,"./chai/interface/expect":27,"./chai/interface/should":28,"./chai/utils":39,"assertion-error":47}],24:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (_chai, util) {
  /*!
   * Module dependencies.
   */

  var AssertionError = _chai.AssertionError
    , flag = util.flag;

  /*!
   * Module export.
   */

  _chai.Assertion = Assertion;

  /*!
   * Assertion Constructor
   *
   * Creates object for chaining.
   *
   * @api private
   */

  function Assertion (obj, msg, stack) {
    flag(this, 'ssfi', stack || arguments.callee);
    flag(this, 'object', obj);
    flag(this, 'message', msg);
  }

  /*!
    * ### Assertion.includeStack
    *
    * User configurable property, influences whether stack trace
    * is included in Assertion error message. Default of false
    * suppresses stack trace in the error message
    *
    *     Assertion.includeStack = true;  // enable stack on error
    *
    * @api public
    */

  Assertion.includeStack = false;

  /*!
   * ### Assertion.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @api public
   */

  Assertion.showDiff = true;

  Assertion.addProperty = function (name, fn) {
    util.addProperty(this.prototype, name, fn);
  };

  Assertion.addMethod = function (name, fn) {
    util.addMethod(this.prototype, name, fn);
  };

  Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
    util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  Assertion.overwriteProperty = function (name, fn) {
    util.overwriteProperty(this.prototype, name, fn);
  };

  Assertion.overwriteMethod = function (name, fn) {
    util.overwriteMethod(this.prototype, name, fn);
  };

  /*!
   * ### .assert(expression, message, negateMessage, expected, actual)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {Philosophical} expression to be tested
   * @param {String} message to display if fails
   * @param {String} negatedMessage to display if negated expression fails
   * @param {Mixed} expected value (remember to check for negation)
   * @param {Mixed} actual (optional) will default to `this.obj`
   * @api private
   */

  Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
    var ok = util.test(this, arguments);
    if (true !== showDiff) showDiff = false;
    if (true !== Assertion.showDiff) showDiff = false;

    if (!ok) {
      var msg = util.getMessage(this, arguments)
        , actual = util.getActual(this, arguments);
      throw new AssertionError(msg, {
          actual: actual
        , expected: expected
        , showDiff: showDiff
      }, (Assertion.includeStack) ? this.assert : flag(this, 'ssfi'));
    }
  };

  /*!
   * ### ._obj
   *
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @api private
   */

  Object.defineProperty(Assertion.prototype, '_obj',
    { get: function () {
        return flag(this, 'object');
      }
    , set: function (val) {
        flag(this, 'object', val);
      }
  });
};

},{}],25:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, _) {
  var Assertion = chai.Assertion
    , toString = Object.prototype.toString
    , flag = _.flag;

  /**
   * ### Language Chains
   *
   * The following are provide as chainable getters to
   * improve the readability of your assertions. They
   * do not provide an testing capability unless they
   * have been overwritten by a plugin.
   *
   * **Chains**
   *
   * - to
   * - be
   * - been
   * - is
   * - that
   * - and
   * - have
   * - with
   * - at
   * - of
   * - same
   *
   * @name language chains
   * @api public
   */

  [ 'to', 'be', 'been'
  , 'is', 'and', 'have'
  , 'with', 'that', 'at'
  , 'of', 'same' ].forEach(function (chain) {
    Assertion.addProperty(chain, function () {
      return this;
    });
  });

  /**
   * ### .not
   *
   * Negates any of assertions following in the chain.
   *
   *     expect(foo).to.not.equal('bar');
   *     expect(goodFn).to.not.throw(Error);
   *     expect({ foo: 'baz' }).to.have.property('foo')
   *       .and.not.equal('bar');
   *
   * @name not
   * @api public
   */

  Assertion.addProperty('not', function () {
    flag(this, 'negate', true);
  });

  /**
   * ### .deep
   *
   * Sets the `deep` flag, later used by the `equal` and
   * `property` assertions.
   *
   *     expect(foo).to.deep.equal({ bar: 'baz' });
   *     expect({ foo: { bar: { baz: 'quux' } } })
   *       .to.have.deep.property('foo.bar.baz', 'quux');
   *
   * @name deep
   * @api public
   */

  Assertion.addProperty('deep', function () {
    flag(this, 'deep', true);
  });

  /**
   * ### .a(type)
   *
   * The `a` and `an` assertions are aliases that can be
   * used either as language chains or to assert a value's
   * type.
   *
   *     // typeof
   *     expect('test').to.be.a('string');
   *     expect({ foo: 'bar' }).to.be.an('object');
   *     expect(null).to.be.a('null');
   *     expect(undefined).to.be.an('undefined');
   *
   *     // language chain
   *     expect(foo).to.be.an.instanceof(Foo);
   *
   * @name a
   * @alias an
   * @param {String} type
   * @param {String} message _optional_
   * @api public
   */

  function an (type, msg) {
    if (msg) flag(this, 'message', msg);
    type = type.toLowerCase();
    var obj = flag(this, 'object')
      , article = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(type.charAt(0)) ? 'an ' : 'a ';

    this.assert(
        type === _.type(obj)
      , 'expected #{this} to be ' + article + type
      , 'expected #{this} not to be ' + article + type
    );
  }

  Assertion.addChainableMethod('an', an);
  Assertion.addChainableMethod('a', an);

  /**
   * ### .include(value)
   *
   * The `include` and `contain` assertions can be used as either property
   * based language chains or as methods to assert the inclusion of an object
   * in an array or a substring in a string. When used as language chains,
   * they toggle the `contain` flag for the `keys` assertion.
   *
   *     expect([1,2,3]).to.include(2);
   *     expect('foobar').to.contain('foo');
   *     expect({ foo: 'bar', hello: 'universe' }).to.include.keys('foo');
   *
   * @name include
   * @alias contain
   * @param {Object|String|Number} obj
   * @param {String} message _optional_
   * @api public
   */

  function includeChainingBehavior () {
    flag(this, 'contains', true);
  }

  function include (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
    this.assert(
        ~obj.indexOf(val)
      , 'expected #{this} to include ' + _.inspect(val)
      , 'expected #{this} to not include ' + _.inspect(val));
  }

  Assertion.addChainableMethod('include', include, includeChainingBehavior);
  Assertion.addChainableMethod('contain', include, includeChainingBehavior);

  /**
   * ### .ok
   *
   * Asserts that the target is truthy.
   *
   *     expect('everthing').to.be.ok;
   *     expect(1).to.be.ok;
   *     expect(false).to.not.be.ok;
   *     expect(undefined).to.not.be.ok;
   *     expect(null).to.not.be.ok;
   *
   * @name ok
   * @api public
   */

  Assertion.addProperty('ok', function () {
    this.assert(
        flag(this, 'object')
      , 'expected #{this} to be truthy'
      , 'expected #{this} to be falsy');
  });

  /**
   * ### .true
   *
   * Asserts that the target is `true`.
   *
   *     expect(true).to.be.true;
   *     expect(1).to.not.be.true;
   *
   * @name true
   * @api public
   */

  Assertion.addProperty('true', function () {
    this.assert(
        true === flag(this, 'object')
      , 'expected #{this} to be true'
      , 'expected #{this} to be false'
      , this.negate ? false : true
    );
  });

  /**
   * ### .false
   *
   * Asserts that the target is `false`.
   *
   *     expect(false).to.be.false;
   *     expect(0).to.not.be.false;
   *
   * @name false
   * @api public
   */

  Assertion.addProperty('false', function () {
    this.assert(
        false === flag(this, 'object')
      , 'expected #{this} to be false'
      , 'expected #{this} to be true'
      , this.negate ? true : false
    );
  });

  /**
   * ### .null
   *
   * Asserts that the target is `null`.
   *
   *     expect(null).to.be.null;
   *     expect(undefined).not.to.be.null;
   *
   * @name null
   * @api public
   */

  Assertion.addProperty('null', function () {
    this.assert(
        null === flag(this, 'object')
      , 'expected #{this} to be null'
      , 'expected #{this} not to be null'
    );
  });

  /**
   * ### .undefined
   *
   * Asserts that the target is `undefined`.
   *
   *     expect(undefined).to.be.undefined;
   *     expect(null).to.not.be.undefined;
   *
   * @name undefined
   * @api public
   */

  Assertion.addProperty('undefined', function () {
    this.assert(
        undefined === flag(this, 'object')
      , 'expected #{this} to be undefined'
      , 'expected #{this} not to be undefined'
    );
  });

  /**
   * ### .exist
   *
   * Asserts that the target is neither `null` nor `undefined`.
   *
   *     var foo = 'hi'
   *       , bar = null
   *       , baz;
   *
   *     expect(foo).to.exist;
   *     expect(bar).to.not.exist;
   *     expect(baz).to.not.exist;
   *
   * @name exist
   * @api public
   */

  Assertion.addProperty('exist', function () {
    this.assert(
        null != flag(this, 'object')
      , 'expected #{this} to exist'
      , 'expected #{this} to not exist'
    );
  });


  /**
   * ### .empty
   *
   * Asserts that the target's length is `0`. For arrays, it checks
   * the `length` property. For objects, it gets the count of
   * enumerable keys.
   *
   *     expect([]).to.be.empty;
   *     expect('').to.be.empty;
   *     expect({}).to.be.empty;
   *
   * @name empty
   * @api public
   */

  Assertion.addProperty('empty', function () {
    var obj = flag(this, 'object')
      , expected = obj;

    if (Array.isArray(obj) || 'string' === typeof object) {
      expected = obj.length;
    } else if (typeof obj === 'object') {
      expected = Object.keys(obj).length;
    }

    this.assert(
        !expected
      , 'expected #{this} to be empty'
      , 'expected #{this} not to be empty'
    );
  });

  /**
   * ### .arguments
   *
   * Asserts that the target is an arguments object.
   *
   *     function test () {
   *       expect(arguments).to.be.arguments;
   *     }
   *
   * @name arguments
   * @alias Arguments
   * @api public
   */

  function checkArguments () {
    var obj = flag(this, 'object')
      , type = Object.prototype.toString.call(obj);
    this.assert(
        '[object Arguments]' === type
      , 'expected #{this} to be arguments but got ' + type
      , 'expected #{this} to not be arguments'
    );
  }

  Assertion.addProperty('arguments', checkArguments);
  Assertion.addProperty('Arguments', checkArguments);

  /**
   * ### .equal(value)
   *
   * Asserts that the target is strictly equal (`===`) to `value`.
   * Alternately, if the `deep` flag is set, asserts that
   * the target is deeply equal to `value`.
   *
   *     expect('hello').to.equal('hello');
   *     expect(42).to.equal(42);
   *     expect(1).to.not.equal(true);
   *     expect({ foo: 'bar' }).to.not.equal({ foo: 'bar' });
   *     expect({ foo: 'bar' }).to.deep.equal({ foo: 'bar' });
   *
   * @name equal
   * @alias equals
   * @alias eq
   * @alias deep.equal
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEqual (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'deep')) {
      return this.eql(val);
    } else {
      this.assert(
          val === obj
        , 'expected #{this} to equal #{exp}'
        , 'expected #{this} to not equal #{exp}'
        , val
        , this._obj
        , true
      );
    }
  }

  Assertion.addMethod('equal', assertEqual);
  Assertion.addMethod('equals', assertEqual);
  Assertion.addMethod('eq', assertEqual);

  /**
   * ### .eql(value)
   *
   * Asserts that the target is deeply equal to `value`.
   *
   *     expect({ foo: 'bar' }).to.eql({ foo: 'bar' });
   *     expect([ 1, 2, 3 ]).to.eql([ 1, 2, 3 ]);
   *
   * @name eql
   * @alias eqls
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEql(obj, msg) {
    if (msg) flag(this, 'message', msg);
    this.assert(
        _.eql(obj, flag(this, 'object'))
      , 'expected #{this} to deeply equal #{exp}'
      , 'expected #{this} to not deeply equal #{exp}'
      , obj
      , this._obj
      , true
    );
  }

  Assertion.addMethod('eql', assertEql);
  Assertion.addMethod('eqls', assertEql);

  /**
   * ### .above(value)
   *
   * Asserts that the target is greater than `value`.
   *
   *     expect(10).to.be.above(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *
   * @name above
   * @alias gt
   * @alias greaterThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertAbove (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len > n
        , 'expected #{this} to have a length above #{exp} but got #{act}'
        , 'expected #{this} to not have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj > n
        , 'expected #{this} to be above ' + n
        , 'expected #{this} to be at most ' + n
      );
    }
  }

  Assertion.addMethod('above', assertAbove);
  Assertion.addMethod('gt', assertAbove);
  Assertion.addMethod('greaterThan', assertAbove);

  /**
   * ### .least(value)
   *
   * Asserts that the target is greater than or equal to `value`.
   *
   *     expect(10).to.be.at.least(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.least(2);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.least(3);
   *
   * @name least
   * @alias gte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertLeast (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= n
        , 'expected #{this} to have a length at least #{exp} but got #{act}'
        , 'expected #{this} to have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj >= n
        , 'expected #{this} to be at least ' + n
        , 'expected #{this} to be below ' + n
      );
    }
  }

  Assertion.addMethod('least', assertLeast);
  Assertion.addMethod('gte', assertLeast);

  /**
   * ### .below(value)
   *
   * Asserts that the target is less than `value`.
   *
   *     expect(5).to.be.below(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *
   * @name below
   * @alias lt
   * @alias lessThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertBelow (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len < n
        , 'expected #{this} to have a length below #{exp} but got #{act}'
        , 'expected #{this} to not have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj < n
        , 'expected #{this} to be below ' + n
        , 'expected #{this} to be at least ' + n
      );
    }
  }

  Assertion.addMethod('below', assertBelow);
  Assertion.addMethod('lt', assertBelow);
  Assertion.addMethod('lessThan', assertBelow);

  /**
   * ### .most(value)
   *
   * Asserts that the target is less than or equal to `value`.
   *
   *     expect(5).to.be.at.most(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.most(4);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.most(3);
   *
   * @name most
   * @alias lte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertMost (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len <= n
        , 'expected #{this} to have a length at most #{exp} but got #{act}'
        , 'expected #{this} to have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj <= n
        , 'expected #{this} to be at most ' + n
        , 'expected #{this} to be above ' + n
      );
    }
  }

  Assertion.addMethod('most', assertMost);
  Assertion.addMethod('lte', assertMost);

  /**
   * ### .within(start, finish)
   *
   * Asserts that the target is within a range.
   *
   *     expect(7).to.be.within(5,10);
   *
   * Can also be used in conjunction with `length` to
   * assert a length range. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name within
   * @param {Number} start lowerbound inclusive
   * @param {Number} finish upperbound inclusive
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('within', function (start, finish, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , range = start + '..' + finish;
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= start && len <= finish
        , 'expected #{this} to have a length within ' + range
        , 'expected #{this} to not have a length within ' + range
      );
    } else {
      this.assert(
          obj >= start && obj <= finish
        , 'expected #{this} to be within ' + range
        , 'expected #{this} to not be within ' + range
      );
    }
  });

  /**
   * ### .instanceof(constructor)
   *
   * Asserts that the target is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , Chai = new Tea('chai');
   *
   *     expect(Chai).to.be.an.instanceof(Tea);
   *     expect([ 1, 2, 3 ]).to.be.instanceof(Array);
   *
   * @name instanceof
   * @param {Constructor} constructor
   * @param {String} message _optional_
   * @alias instanceOf
   * @api public
   */

  function assertInstanceOf (constructor, msg) {
    if (msg) flag(this, 'message', msg);
    var name = _.getName(constructor);
    this.assert(
        flag(this, 'object') instanceof constructor
      , 'expected #{this} to be an instance of ' + name
      , 'expected #{this} to not be an instance of ' + name
    );
  };

  Assertion.addMethod('instanceof', assertInstanceOf);
  Assertion.addMethod('instanceOf', assertInstanceOf);

  /**
   * ### .property(name, [value])
   *
   * Asserts that the target has a property `name`, optionally asserting that
   * the value of that property is strictly equal to  `value`.
   * If the `deep` flag is set, you can use dot- and bracket-notation for deep
   * references into objects and arrays.
   *
   *     // simple referencing
   *     var obj = { foo: 'bar' };
   *     expect(obj).to.have.property('foo');
   *     expect(obj).to.have.property('foo', 'bar');
   *
   *     // deep referencing
   *     var deepObj = {
   *         green: { tea: 'matcha' }
   *       , teas: [ 'chai', 'matcha', { tea: 'konacha' } ]
   *     };

   *     expect(deepObj).to.have.deep.property('green.tea', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[1]', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[2].tea', 'konacha');
   *
   * You can also use an array as the starting point of a `deep.property`
   * assertion, or traverse nested arrays.
   *
   *     var arr = [
   *         [ 'chai', 'matcha', 'konacha' ]
   *       , [ { tea: 'chai' }
   *         , { tea: 'matcha' }
   *         , { tea: 'konacha' } ]
   *     ];
   *
   *     expect(arr).to.have.deep.property('[0][1]', 'matcha');
   *     expect(arr).to.have.deep.property('[1][2].tea', 'konacha');
   *
   * Furthermore, `property` changes the subject of the assertion
   * to be the value of that property from the original object. This
   * permits for further chainable assertions on that property.
   *
   *     expect(obj).to.have.property('foo')
   *       .that.is.a('string');
   *     expect(deepObj).to.have.property('green')
   *       .that.is.an('object')
   *       .that.deep.equals({ tea: 'matcha' });
   *     expect(deepObj).to.have.property('teas')
   *       .that.is.an('array')
   *       .with.deep.property('[2]')
   *         .that.deep.equals({ tea: 'konacha' });
   *
   * @name property
   * @alias deep.property
   * @param {String} name
   * @param {Mixed} value (optional)
   * @param {String} message _optional_
   * @returns value of property for chaining
   * @api public
   */

  Assertion.addMethod('property', function (name, val, msg) {
    if (msg) flag(this, 'message', msg);

    var descriptor = flag(this, 'deep') ? 'deep property ' : 'property '
      , negate = flag(this, 'negate')
      , obj = flag(this, 'object')
      , value = flag(this, 'deep')
        ? _.getPathValue(name, obj)
        : obj[name];

    if (negate && undefined !== val) {
      if (undefined === value) {
        msg = (msg != null) ? msg + ': ' : '';
        throw new Error(msg + _.inspect(obj) + ' has no ' + descriptor + _.inspect(name));
      }
    } else {
      this.assert(
          undefined !== value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name)
        , 'expected #{this} to not have ' + descriptor + _.inspect(name));
    }

    if (undefined !== val) {
      this.assert(
          val === value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name) + ' of #{exp}, but got #{act}'
        , 'expected #{this} to not have a ' + descriptor + _.inspect(name) + ' of #{act}'
        , val
        , value
      );
    }

    flag(this, 'object', value);
  });


  /**
   * ### .ownProperty(name)
   *
   * Asserts that the target has an own property `name`.
   *
   *     expect('test').to.have.ownProperty('length');
   *
   * @name ownProperty
   * @alias haveOwnProperty
   * @param {String} name
   * @param {String} message _optional_
   * @api public
   */

  function assertOwnProperty (name, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        obj.hasOwnProperty(name)
      , 'expected #{this} to have own property ' + _.inspect(name)
      , 'expected #{this} to not have own property ' + _.inspect(name)
    );
  }

  Assertion.addMethod('ownProperty', assertOwnProperty);
  Assertion.addMethod('haveOwnProperty', assertOwnProperty);

  /**
   * ### .length(value)
   *
   * Asserts that the target's `length` property has
   * the expected value.
   *
   *     expect([ 1, 2, 3]).to.have.length(3);
   *     expect('foobar').to.have.length(6);
   *
   * Can also be used as a chain precursor to a value
   * comparison for the length property.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name length
   * @alias lengthOf
   * @param {Number} length
   * @param {String} message _optional_
   * @api public
   */

  function assertLengthChain () {
    flag(this, 'doLength', true);
  }

  function assertLength (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).to.have.property('length');
    var len = obj.length;

    this.assert(
        len == n
      , 'expected #{this} to have a length of #{exp} but got #{act}'
      , 'expected #{this} to not have a length of #{act}'
      , n
      , len
    );
  }

  Assertion.addChainableMethod('length', assertLength, assertLengthChain);
  Assertion.addMethod('lengthOf', assertLength, assertLengthChain);

  /**
   * ### .match(regexp)
   *
   * Asserts that the target matches a regular expression.
   *
   *     expect('foobar').to.match(/^foo/);
   *
   * @name match
   * @param {RegExp} RegularExpression
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('match', function (re, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        re.exec(obj)
      , 'expected #{this} to match ' + re
      , 'expected #{this} not to match ' + re
    );
  });

  /**
   * ### .string(string)
   *
   * Asserts that the string target contains another string.
   *
   *     expect('foobar').to.have.string('bar');
   *
   * @name string
   * @param {String} string
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('string', function (str, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('string');

    this.assert(
        ~obj.indexOf(str)
      , 'expected #{this} to contain ' + _.inspect(str)
      , 'expected #{this} to not contain ' + _.inspect(str)
    );
  });


  /**
   * ### .keys(key1, [key2], [...])
   *
   * Asserts that the target has exactly the given keys, or
   * asserts the inclusion of some keys when using the
   * `include` or `contain` modifiers.
   *
   *     expect({ foo: 1, bar: 2 }).to.have.keys(['foo', 'bar']);
   *     expect({ foo: 1, bar: 2, baz: 3 }).to.contain.keys('foo', 'bar');
   *
   * @name keys
   * @alias key
   * @param {String...|Array} keys
   * @api public
   */

  function assertKeys (keys) {
    var obj = flag(this, 'object')
      , str
      , ok = true;

    keys = keys instanceof Array
      ? keys
      : Array.prototype.slice.call(arguments);

    if (!keys.length) throw new Error('keys required');

    var actual = Object.keys(obj)
      , len = keys.length;

    // Inclusion
    ok = keys.every(function(key){
      return ~actual.indexOf(key);
    });

    // Strict
    if (!flag(this, 'negate') && !flag(this, 'contains')) {
      ok = ok && keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      keys = keys.map(function(key){
        return _.inspect(key);
      });
      var last = keys.pop();
      str = keys.join(', ') + ', and ' + last;
    } else {
      str = _.inspect(keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (flag(this, 'contains') ? 'contain ' : 'have ') + str;

    // Assertion
    this.assert(
        ok
      , 'expected #{this} to ' + str
      , 'expected #{this} to not ' + str
    );
  }

  Assertion.addMethod('keys', assertKeys);
  Assertion.addMethod('key', assertKeys);

  /**
   * ### .throw(constructor)
   *
   * Asserts that the function target will throw a specific error, or specific type of error
   * (as determined using `instanceof`), optionally with a RegExp or string inclusion test
   * for the error's message.
   *
   *     var err = new ReferenceError('This is a bad function.');
   *     var fn = function () { throw err; }
   *     expect(fn).to.throw(ReferenceError);
   *     expect(fn).to.throw(Error);
   *     expect(fn).to.throw(/bad function/);
   *     expect(fn).to.not.throw('good function');
   *     expect(fn).to.throw(ReferenceError, /bad function/);
   *     expect(fn).to.throw(err);
   *     expect(fn).to.not.throw(new RangeError('Out of range.'));
   *
   * Please note that when a throw expectation is negated, it will check each
   * parameter independently, starting with error constructor type. The appropriate way
   * to check for the existence of a type of error but for a message that does not match
   * is to use `and`.
   *
   *     expect(fn).to.throw(ReferenceError)
   *        .and.not.throw(/good function/);
   *
   * @name throw
   * @alias throws
   * @alias Throw
   * @param {ErrorConstructor} constructor
   * @param {String|RegExp} expected error message
   * @param {String} message _optional_
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  function assertThrows (constructor, errMsg, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('function');

    var thrown = false
      , desiredError = null
      , name = null
      , thrownError = null;

    if (arguments.length === 0) {
      errMsg = null;
      constructor = null;
    } else if (constructor && (constructor instanceof RegExp || 'string' === typeof constructor)) {
      errMsg = constructor;
      constructor = null;
    } else if (constructor && constructor instanceof Error) {
      desiredError = constructor;
      constructor = null;
      errMsg = null;
    } else if (typeof constructor === 'function') {
      name = (new constructor()).name;
    } else {
      constructor = null;
    }

    try {
      obj();
    } catch (err) {
      // first, check desired error
      if (desiredError) {
        this.assert(
            err === desiredError
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp}'
          , desiredError
          , err
        );

        return this;
      }
      // next, check constructor
      if (constructor) {
        this.assert(
            err instanceof constructor
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp} but #{act} was thrown'
          , name
          , err
        );

        if (!errMsg) return this;
      }
      // next, check message
      var message = 'object' === _.type(err) && "message" in err
        ? err.message
        : '' + err;

      if ((message != null) && errMsg && errMsg instanceof RegExp) {
        this.assert(
            errMsg.exec(message)
          , 'expected #{this} to throw error matching #{exp} but got #{act}'
          , 'expected #{this} to throw error not matching #{exp}'
          , errMsg
          , message
        );

        return this;
      } else if ((message != null) && errMsg && 'string' === typeof errMsg) {
        this.assert(
            ~message.indexOf(errMsg)
          , 'expected #{this} to throw error including #{exp} but got #{act}'
          , 'expected #{this} to throw error not including #{act}'
          , errMsg
          , message
        );

        return this;
      } else {
        thrown = true;
        thrownError = err;
      }
    }

    var actuallyGot = ''
      , expectedThrown = name !== null
        ? name
        : desiredError
          ? '#{exp}' //_.inspect(desiredError)
          : 'an error';

    if (thrown) {
      actuallyGot = ' but #{act} was thrown'
    }

    this.assert(
        thrown === true
      , 'expected #{this} to throw ' + expectedThrown + actuallyGot
      , 'expected #{this} to not throw ' + expectedThrown + actuallyGot
      , desiredError
      , thrownError
    );
  };

  Assertion.addMethod('throw', assertThrows);
  Assertion.addMethod('throws', assertThrows);
  Assertion.addMethod('Throw', assertThrows);

  /**
   * ### .respondTo(method)
   *
   * Asserts that the object or class target will respond to a method.
   *
   *     Klass.prototype.bar = function(){};
   *     expect(Klass).to.respondTo('bar');
   *     expect(obj).to.respondTo('bar');
   *
   * To check if a constructor will respond to a static function,
   * set the `itself` flag.
   *
   *     Klass.baz = function(){};
   *     expect(Klass).itself.to.respondTo('baz');
   *
   * @name respondTo
   * @param {String} method
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('respondTo', function (method, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , itself = flag(this, 'itself')
      , context = ('function' === _.type(obj) && !itself)
        ? obj.prototype[method]
        : obj[method];

    this.assert(
        'function' === typeof context
      , 'expected #{this} to respond to ' + _.inspect(method)
      , 'expected #{this} to not respond to ' + _.inspect(method)
    );
  });

  /**
   * ### .itself
   *
   * Sets the `itself` flag, later used by the `respondTo` assertion.
   *
   *     function Foo() {}
   *     Foo.bar = function() {}
   *     Foo.prototype.baz = function() {}
   *
   *     expect(Foo).itself.to.respondTo('bar');
   *     expect(Foo).itself.not.to.respondTo('baz');
   *
   * @name itself
   * @api public
   */

  Assertion.addProperty('itself', function () {
    flag(this, 'itself', true);
  });

  /**
   * ### .satisfy(method)
   *
   * Asserts that the target passes a given truth test.
   *
   *     expect(1).to.satisfy(function(num) { return num > 0; });
   *
   * @name satisfy
   * @param {Function} matcher
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('satisfy', function (matcher, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        matcher(obj)
      , 'expected #{this} to satisfy ' + _.objDisplay(matcher)
      , 'expected #{this} to not satisfy' + _.objDisplay(matcher)
      , this.negate ? false : true
      , matcher(obj)
    );
  });

  /**
   * ### .closeTo(expected, delta)
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     expect(1.5).to.be.closeTo(1, 0.5);
   *
   * @name closeTo
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('closeTo', function (expected, delta, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        Math.abs(obj - expected) <= delta
      , 'expected #{this} to be close to ' + expected + ' +/- ' + delta
      , 'expected #{this} not to be close to ' + expected + ' +/- ' + delta
    );
  });

  function isSubsetOf(subset, superset) {
    return subset.every(function(elem) {
      return superset.indexOf(elem) !== -1;
    })
  }

  /**
   * ### .members(set)
   *
   * Asserts that the target is a superset of `set`,
   * or that the target and `set` have the same members.
   *
   *     expect([1, 2, 3]).to.include.members([3, 2]);
   *     expect([1, 2, 3]).to.not.include.members([3, 2, 8]);
   *
   *     expect([4, 2]).to.have.members([2, 4]);
   *     expect([5, 2]).to.not.have.members([5, 2, 1]);
   *
   * @name members
   * @param {Array} set
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('members', function (subset, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj).to.be.an('array');
    new Assertion(subset).to.be.an('array');

    if (flag(this, 'contains')) {
      return this.assert(
          isSubsetOf(subset, obj)
        , 'expected #{this} to be a superset of #{act}'
        , 'expected #{this} to not be a superset of #{act}'
        , obj
        , subset
      );
    }

    this.assert(
        isSubsetOf(obj, subset) && isSubsetOf(subset, obj)
        , 'expected #{this} to have the same members as #{act}'
        , 'expected #{this} to not have the same members as #{act}'
        , obj
        , subset
    );
  });
};

},{}],26:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */


module.exports = function (chai, util) {

  /*!
   * Chai dependencies.
   */

  var Assertion = chai.Assertion
    , flag = util.flag;

  /*!
   * Module export.
   */

  /**
   * ### assert(expression, message)
   *
   * Write your own test expressions.
   *
   *     assert('foo' !== 'bar', 'foo is not bar');
   *     assert(Array.isArray([]), 'empty arrays are arrays');
   *
   * @param {Mixed} expression to test for truthiness
   * @param {String} message to display on error
   * @name assert
   * @api public
   */

  var assert = chai.assert = function (express, errmsg) {
    var test = new Assertion(null);
    test.assert(
        express
      , errmsg
      , '[ negation message unavailable ]'
    );
  };

  /**
   * ### .fail(actual, expected, [message], [operator])
   *
   * Throw a failure. Node.js `assert` module-compatible.
   *
   * @name fail
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @param {String} operator
   * @api public
   */

  assert.fail = function (actual, expected, message, operator) {
    throw new chai.AssertionError({
        actual: actual
      , expected: expected
      , message: message
      , operator: operator
      , stackStartFunction: assert.fail
    });
  };

  /**
   * ### .ok(object, [message])
   *
   * Asserts that `object` is truthy.
   *
   *     assert.ok('everything', 'everything is ok');
   *     assert.ok(false, 'this will fail');
   *
   * @name ok
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.ok = function (val, msg) {
    new Assertion(val, msg).is.ok;
  };

  /**
   * ### .notOk(object, [message])
   *
   * Asserts that `object` is falsy.
   *
   *     assert.notOk('everything', 'this will fail');
   *     assert.notOk(false, 'this will pass');
   *
   * @name notOk
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.notOk = function (val, msg) {
    new Assertion(val, msg).is.not.ok;
  };

  /**
   * ### .equal(actual, expected, [message])
   *
   * Asserts non-strict equality (`==`) of `actual` and `expected`.
   *
   *     assert.equal(3, '3', '== coerces values to strings');
   *
   * @name equal
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.equal = function (act, exp, msg) {
    var test = new Assertion(act, msg);

    test.assert(
        exp == flag(test, 'object')
      , 'expected #{this} to equal #{exp}'
      , 'expected #{this} to not equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .notEqual(actual, expected, [message])
   *
   * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
   *
   *     assert.notEqual(3, 4, 'these numbers are not equal');
   *
   * @name notEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notEqual = function (act, exp, msg) {
    var test = new Assertion(act, msg);

    test.assert(
        exp != flag(test, 'object')
      , 'expected #{this} to not equal #{exp}'
      , 'expected #{this} to equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .strictEqual(actual, expected, [message])
   *
   * Asserts strict equality (`===`) of `actual` and `expected`.
   *
   *     assert.strictEqual(true, true, 'these booleans are strictly equal');
   *
   * @name strictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.strictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.equal(exp);
  };

  /**
   * ### .notStrictEqual(actual, expected, [message])
   *
   * Asserts strict inequality (`!==`) of `actual` and `expected`.
   *
   *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
   *
   * @name notStrictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notStrictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.equal(exp);
  };

  /**
   * ### .deepEqual(actual, expected, [message])
   *
   * Asserts that `actual` is deeply equal to `expected`.
   *
   *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
   *
   * @name deepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.deepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.eql(exp);
  };

  /**
   * ### .notDeepEqual(actual, expected, [message])
   *
   * Assert that `actual` is not deeply equal to `expected`.
   *
   *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
   *
   * @name notDeepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notDeepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.eql(exp);
  };

  /**
   * ### .isTrue(value, [message])
   *
   * Asserts that `value` is true.
   *
   *     var teaServed = true;
   *     assert.isTrue(teaServed, 'the tea has been served');
   *
   * @name isTrue
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isTrue = function (val, msg) {
    new Assertion(val, msg).is['true'];
  };

  /**
   * ### .isFalse(value, [message])
   *
   * Asserts that `value` is false.
   *
   *     var teaServed = false;
   *     assert.isFalse(teaServed, 'no tea yet? hmm...');
   *
   * @name isFalse
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFalse = function (val, msg) {
    new Assertion(val, msg).is['false'];
  };

  /**
   * ### .isNull(value, [message])
   *
   * Asserts that `value` is null.
   *
   *     assert.isNull(err, 'there was no error');
   *
   * @name isNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNull = function (val, msg) {
    new Assertion(val, msg).to.equal(null);
  };

  /**
   * ### .isNotNull(value, [message])
   *
   * Asserts that `value` is not null.
   *
   *     var tea = 'tasty chai';
   *     assert.isNotNull(tea, 'great, time for tea!');
   *
   * @name isNotNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNull = function (val, msg) {
    new Assertion(val, msg).to.not.equal(null);
  };

  /**
   * ### .isUndefined(value, [message])
   *
   * Asserts that `value` is `undefined`.
   *
   *     var tea;
   *     assert.isUndefined(tea, 'no tea defined');
   *
   * @name isUndefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isUndefined = function (val, msg) {
    new Assertion(val, msg).to.equal(undefined);
  };

  /**
   * ### .isDefined(value, [message])
   *
   * Asserts that `value` is not `undefined`.
   *
   *     var tea = 'cup of chai';
   *     assert.isDefined(tea, 'tea has been defined');
   *
   * @name isDefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isDefined = function (val, msg) {
    new Assertion(val, msg).to.not.equal(undefined);
  };

  /**
   * ### .isFunction(value, [message])
   *
   * Asserts that `value` is a function.
   *
   *     function serveTea() { return 'cup of tea'; };
   *     assert.isFunction(serveTea, 'great, we can have tea now');
   *
   * @name isFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFunction = function (val, msg) {
    new Assertion(val, msg).to.be.a('function');
  };

  /**
   * ### .isNotFunction(value, [message])
   *
   * Asserts that `value` is _not_ a function.
   *
   *     var serveTea = [ 'heat', 'pour', 'sip' ];
   *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
   *
   * @name isNotFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotFunction = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('function');
  };

  /**
   * ### .isObject(value, [message])
   *
   * Asserts that `value` is an object (as revealed by
   * `Object.prototype.toString`).
   *
   *     var selection = { name: 'Chai', serve: 'with spices' };
   *     assert.isObject(selection, 'tea selection is an object');
   *
   * @name isObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isObject = function (val, msg) {
    new Assertion(val, msg).to.be.a('object');
  };

  /**
   * ### .isNotObject(value, [message])
   *
   * Asserts that `value` is _not_ an object.
   *
   *     var selection = 'chai'
   *     assert.isObject(selection, 'tea selection is not an object');
   *     assert.isObject(null, 'null is not an object');
   *
   * @name isNotObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotObject = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('object');
  };

  /**
   * ### .isArray(value, [message])
   *
   * Asserts that `value` is an array.
   *
   *     var menu = [ 'green', 'chai', 'oolong' ];
   *     assert.isArray(menu, 'what kind of tea do we want?');
   *
   * @name isArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isArray = function (val, msg) {
    new Assertion(val, msg).to.be.an('array');
  };

  /**
   * ### .isNotArray(value, [message])
   *
   * Asserts that `value` is _not_ an array.
   *
   *     var menu = 'green|chai|oolong';
   *     assert.isNotArray(menu, 'what kind of tea do we want?');
   *
   * @name isNotArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotArray = function (val, msg) {
    new Assertion(val, msg).to.not.be.an('array');
  };

  /**
   * ### .isString(value, [message])
   *
   * Asserts that `value` is a string.
   *
   *     var teaOrder = 'chai';
   *     assert.isString(teaOrder, 'order placed');
   *
   * @name isString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isString = function (val, msg) {
    new Assertion(val, msg).to.be.a('string');
  };

  /**
   * ### .isNotString(value, [message])
   *
   * Asserts that `value` is _not_ a string.
   *
   *     var teaOrder = 4;
   *     assert.isNotString(teaOrder, 'order placed');
   *
   * @name isNotString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotString = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('string');
  };

  /**
   * ### .isNumber(value, [message])
   *
   * Asserts that `value` is a number.
   *
   *     var cups = 2;
   *     assert.isNumber(cups, 'how many cups');
   *
   * @name isNumber
   * @param {Number} value
   * @param {String} message
   * @api public
   */

  assert.isNumber = function (val, msg) {
    new Assertion(val, msg).to.be.a('number');
  };

  /**
   * ### .isNotNumber(value, [message])
   *
   * Asserts that `value` is _not_ a number.
   *
   *     var cups = '2 cups please';
   *     assert.isNotNumber(cups, 'how many cups');
   *
   * @name isNotNumber
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNumber = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('number');
  };

  /**
   * ### .isBoolean(value, [message])
   *
   * Asserts that `value` is a boolean.
   *
   *     var teaReady = true
   *       , teaServed = false;
   *
   *     assert.isBoolean(teaReady, 'is the tea ready');
   *     assert.isBoolean(teaServed, 'has tea been served');
   *
   * @name isBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isBoolean = function (val, msg) {
    new Assertion(val, msg).to.be.a('boolean');
  };

  /**
   * ### .isNotBoolean(value, [message])
   *
   * Asserts that `value` is _not_ a boolean.
   *
   *     var teaReady = 'yep'
   *       , teaServed = 'nope';
   *
   *     assert.isNotBoolean(teaReady, 'is the tea ready');
   *     assert.isNotBoolean(teaServed, 'has tea been served');
   *
   * @name isNotBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotBoolean = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('boolean');
  };

  /**
   * ### .typeOf(value, name, [message])
   *
   * Asserts that `value`'s type is `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.typeOf({ tea: 'chai' }, 'object', 'we have an object');
   *     assert.typeOf(['chai', 'jasmine'], 'array', 'we have an array');
   *     assert.typeOf('tea', 'string', 'we have a string');
   *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
   *     assert.typeOf(null, 'null', 'we have a null');
   *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
   *
   * @name typeOf
   * @param {Mixed} value
   * @param {String} name
   * @param {String} message
   * @api public
   */

  assert.typeOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.a(type);
  };

  /**
   * ### .notTypeOf(value, name, [message])
   *
   * Asserts that `value`'s type is _not_ `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
   *
   * @name notTypeOf
   * @param {Mixed} value
   * @param {String} typeof name
   * @param {String} message
   * @api public
   */

  assert.notTypeOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.a(type);
  };

  /**
   * ### .instanceOf(object, constructor, [message])
   *
   * Asserts that `value` is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new Tea('chai');
   *
   *     assert.instanceOf(chai, Tea, 'chai is an instance of tea');
   *
   * @name instanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.instanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.instanceOf(type);
  };

  /**
   * ### .notInstanceOf(object, constructor, [message])
   *
   * Asserts `value` is not an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new String('chai');
   *
   *     assert.notInstanceOf(chai, Tea, 'chai is not an instance of tea');
   *
   * @name notInstanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.notInstanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.instanceOf(type);
  };

  /**
   * ### .include(haystack, needle, [message])
   *
   * Asserts that `haystack` includes `needle`. Works
   * for strings and arrays.
   *
   *     assert.include('foobar', 'bar', 'foobar contains string "bar"');
   *     assert.include([ 1, 2, 3 ], 3, 'array contains value');
   *
   * @name include
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.include = function (exp, inc, msg) {
    var obj = new Assertion(exp, msg);

    if (Array.isArray(exp)) {
      obj.to.include(inc);
    } else if ('string' === typeof exp) {
      obj.to.contain.string(inc);
    } else {
      throw new chai.AssertionError(
          'expected an array or string'
        , null
        , assert.include
      );
    }
  };

  /**
   * ### .notInclude(haystack, needle, [message])
   *
   * Asserts that `haystack` does not include `needle`. Works
   * for strings and arrays.
   *i
   *     assert.notInclude('foobar', 'baz', 'string not include substring');
   *     assert.notInclude([ 1, 2, 3 ], 4, 'array not include contain value');
   *
   * @name notInclude
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.notInclude = function (exp, inc, msg) {
    var obj = new Assertion(exp, msg);

    if (Array.isArray(exp)) {
      obj.to.not.include(inc);
    } else if ('string' === typeof exp) {
      obj.to.not.contain.string(inc);
    } else {
      throw new chai.AssertionError(
          'expected an array or string'
        , null
        , assert.notInclude
      );
    }
  };

  /**
   * ### .match(value, regexp, [message])
   *
   * Asserts that `value` matches the regular expression `regexp`.
   *
   *     assert.match('foobar', /^foo/, 'regexp matches');
   *
   * @name match
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.match = function (exp, re, msg) {
    new Assertion(exp, msg).to.match(re);
  };

  /**
   * ### .notMatch(value, regexp, [message])
   *
   * Asserts that `value` does not match the regular expression `regexp`.
   *
   *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
   *
   * @name notMatch
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.notMatch = function (exp, re, msg) {
    new Assertion(exp, msg).to.not.match(re);
  };

  /**
   * ### .property(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`.
   *
   *     assert.property({ tea: { green: 'matcha' }}, 'tea');
   *
   * @name property
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.property = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.property(prop);
  };

  /**
   * ### .notProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`.
   *
   *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
   *
   * @name notProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.property(prop);
  };

  /**
   * ### .deepProperty(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`, which can be a
   * string using dot- and bracket-notation for deep reference.
   *
   *     assert.deepProperty({ tea: { green: 'matcha' }}, 'tea.green');
   *
   * @name deepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.deepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop);
  };

  /**
   * ### .notDeepProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`, which
   * can be a string using dot- and bracket-notation for deep reference.
   *
   *     assert.notDeepProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
   *
   * @name notDeepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notDeepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop);
  };

  /**
   * ### .propertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`.
   *
   *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
   *
   * @name propertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.property(prop, val);
  };

  /**
   * ### .propertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`.
   *
   *     assert.propertyNotVal({ tea: 'is good' }, 'tea', 'is bad');
   *
   * @name propertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.property(prop, val);
  };

  /**
   * ### .deepPropertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`. `property` can use dot- and bracket-notation for deep
   * reference.
   *
   *     assert.deepPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
   *
   * @name deepPropertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop, val);
  };

  /**
   * ### .deepPropertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`. `property` can use dot- and
   * bracket-notation for deep reference.
   *
   *     assert.deepPropertyNotVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
   *
   * @name deepPropertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop, val);
  };

  /**
   * ### .lengthOf(object, length, [message])
   *
   * Asserts that `object` has a `length` property with the expected value.
   *
   *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
   *     assert.lengthOf('foobar', 5, 'string has length of 6');
   *
   * @name lengthOf
   * @param {Mixed} object
   * @param {Number} length
   * @param {String} message
   * @api public
   */

  assert.lengthOf = function (exp, len, msg) {
    new Assertion(exp, msg).to.have.length(len);
  };

  /**
   * ### .throws(function, [constructor/string/regexp], [string/regexp], [message])
   *
   * Asserts that `function` will throw an error that is an instance of
   * `constructor`, or alternately that it will throw an error with message
   * matching `regexp`.
   *
   *     assert.throw(fn, 'function throws a reference error');
   *     assert.throw(fn, /function throws a reference error/);
   *     assert.throw(fn, ReferenceError);
   *     assert.throw(fn, ReferenceError, 'function throws a reference error');
   *     assert.throw(fn, ReferenceError, /function throws a reference error/);
   *
   * @name throws
   * @alias throw
   * @alias Throw
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.Throw = function (fn, errt, errs, msg) {
    if ('string' === typeof errt || errt instanceof RegExp) {
      errs = errt;
      errt = null;
    }

    new Assertion(fn, msg).to.Throw(errt, errs);
  };

  /**
   * ### .doesNotThrow(function, [constructor/regexp], [message])
   *
   * Asserts that `function` will _not_ throw an error that is an instance of
   * `constructor`, or alternately that it will not throw an error with message
   * matching `regexp`.
   *
   *     assert.doesNotThrow(fn, Error, 'function does not throw');
   *
   * @name doesNotThrow
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.doesNotThrow = function (fn, type, msg) {
    if ('string' === typeof type) {
      msg = type;
      type = null;
    }

    new Assertion(fn, msg).to.not.Throw(type);
  };

  /**
   * ### .operator(val1, operator, val2, [message])
   *
   * Compares two values using `operator`.
   *
   *     assert.operator(1, '<', 2, 'everything is ok');
   *     assert.operator(1, '>', 2, 'this will fail');
   *
   * @name operator
   * @param {Mixed} val1
   * @param {String} operator
   * @param {Mixed} val2
   * @param {String} message
   * @api public
   */

  assert.operator = function (val, operator, val2, msg) {
    if (!~['==', '===', '>', '>=', '<', '<=', '!=', '!=='].indexOf(operator)) {
      throw new Error('Invalid operator "' + operator + '"');
    }
    var test = new Assertion(eval(val + operator + val2), msg);
    test.assert(
        true === flag(test, 'object')
      , 'expected ' + util.inspect(val) + ' to be ' + operator + ' ' + util.inspect(val2)
      , 'expected ' + util.inspect(val) + ' to not be ' + operator + ' ' + util.inspect(val2) );
  };

  /**
   * ### .closeTo(actual, expected, delta, [message])
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
   *
   * @name closeTo
   * @param {Number} actual
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message
   * @api public
   */

  assert.closeTo = function (act, exp, delta, msg) {
    new Assertion(act, msg).to.be.closeTo(exp, delta);
  };

  /**
   * ### .sameMembers(set1, set2, [message])
   *
   * Asserts that `set1` and `set2` have the same members.
   * Order is not taken into account.
   *
   *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
   *
   * @name sameMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @api public
   */

  assert.sameMembers = function (set1, set2, msg) {
    new Assertion(set1, msg).to.have.same.members(set2);
  }

  /**
   * ### .includeMembers(superset, subset, [message])
   *
   * Asserts that `subset` is included in `superset`.
   * Order is not taken into account.
   *
   *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1 ], 'include members');
   *
   * @name includeMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @api public
   */

  assert.includeMembers = function (superset, subset, msg) {
    new Assertion(superset, msg).to.include.members(subset);
  }

  /*!
   * Undocumented / untested
   */

  assert.ifError = function (val, msg) {
    new Assertion(val, msg).to.not.be.ok;
  };

  /*!
   * Aliases.
   */

  (function alias(name, as){
    assert[as] = assert[name];
    return alias;
  })
  ('Throw', 'throw')
  ('Throw', 'throws');
};

},{}],27:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  chai.expect = function (val, message) {
    return new chai.Assertion(val, message);
  };
};


},{}],28:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  var Assertion = chai.Assertion;

  function loadShould () {
    // modify Object.prototype to have `should`
    Object.defineProperty(Object.prototype, 'should',
      {
        set: function (value) {
          // See https://github.com/chaijs/chai/issues/86: this makes
          // `whatever.should = someValue` actually set `someValue`, which is
          // especially useful for `global.should = require('chai').should()`.
          //
          // Note that we have to use [[DefineProperty]] instead of [[Put]]
          // since otherwise we would trigger this very setter!
          Object.defineProperty(this, 'should', {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        }
      , get: function(){
          if (this instanceof String || this instanceof Number) {
            return new Assertion(this.constructor(this));
          } else if (this instanceof Boolean) {
            return new Assertion(this == true);
          }
          return new Assertion(this);
        }
      , configurable: true
    });

    var should = {};

    should.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.equal(val2);
    };

    should.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.Throw(errt, errs);
    };

    should.exist = function (val, msg) {
      new Assertion(val, msg).to.exist;
    }

    // negation
    should.not = {}

    should.not.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.not.equal(val2);
    };

    should.not.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.not.Throw(errt, errs);
    };

    should.not.exist = function (val, msg) {
      new Assertion(val, msg).to.not.exist;
    }

    should['throw'] = should['Throw'];
    should.not['throw'] = should.not['Throw'];

    return should;
  };

  chai.should = loadShould;
  chai.Should = loadShould;
};

},{}],29:[function(require,module,exports){
/*!
 * Chai - addChainingMethod utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var transferFlags = require('./transferFlags');

/*!
 * Module variables
 */

// Check whether `__proto__` is supported
var hasProtoSupport = '__proto__' in Object;

// Without `__proto__` support, this module will need to add properties to a function.
// However, some Function.prototype methods cannot be overwritten,
// and there seems no easy cross-platform way to detect them (@see chaijs/chai/issues/69).
var excludeNames = /^(?:length|name|arguments|caller)$/;

// Cache `Function` properties
var call  = Function.prototype.call,
    apply = Function.prototype.apply;

/**
 * ### addChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Adds a method to an object, such that the method can also be chained.
 *
 *     utils.addChainableMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addChainableMethod('foo', fn, chainingBehavior);
 *
 * The result can then be used as both a method assertion, executing both `method` and
 * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
 *
 *     expect(fooStr).to.be.foo('bar');
 *     expect(fooStr).to.be.foo.equal('foo');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for `name`, when called
 * @param {Function} chainingBehavior function to be called every time the property is accessed
 * @name addChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  if (typeof chainingBehavior !== 'function')
    chainingBehavior = function () { };

  Object.defineProperty(ctx, name,
    { get: function () {
        chainingBehavior.call(this);

        var assert = function () {
          var result = method.apply(this, arguments);
          return result === undefined ? this : result;
        };

        // Use `__proto__` if available
        if (hasProtoSupport) {
          // Inherit all properties from the object by replacing the `Function` prototype
          var prototype = assert.__proto__ = Object.create(this);
          // Restore the `call` and `apply` methods from `Function`
          prototype.call = call;
          prototype.apply = apply;
        }
        // Otherwise, redefine all properties (slow!)
        else {
          var asserterNames = Object.getOwnPropertyNames(ctx);
          asserterNames.forEach(function (asserterName) {
            if (!excludeNames.test(asserterName)) {
              var pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
              Object.defineProperty(assert, asserterName, pd);
            }
          });
        }

        transferFlags(this, assert);
        return assert;
      }
    , configurable: true
  });
};

},{"./transferFlags":45}],30:[function(require,module,exports){
/*!
 * Chai - addMethod utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .addMethod (ctx, name, method)
 *
 * Adds a method to the prototype of an object.
 *
 *     utils.addMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(fooStr).to.be.foo('bar');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for name
 * @name addMethod
 * @api public
 */

module.exports = function (ctx, name, method) {
  ctx[name] = function () {
    var result = method.apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{}],31:[function(require,module,exports){
/*!
 * Chai - addProperty utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### addProperty (ctx, name, getter)
 *
 * Adds a property to the prototype of an object.
 *
 *     utils.addProperty(chai.Assertion.prototype, 'foo', function () {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.instanceof(Foo);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.foo;
 *
 * @param {Object} ctx object to which the property is added
 * @param {String} name of property to add
 * @param {Function} getter function to be used for name
 * @name addProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter.call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],32:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### flag(object ,key, [value])
 *
 * Get or set a flag value on an object. If a
 * value is provided it will be set, else it will
 * return the currently set value or `undefined` if
 * the value is not set.
 *
 *     utils.flag(this, 'foo', 'bar'); // setter
 *     utils.flag(this, 'foo'); // getter, returns `bar`
 *
 * @param {Object} object (constructed Assertion
 * @param {String} key
 * @param {Mixed} value (optional)
 * @name flag
 * @api private
 */

module.exports = function (obj, key, value) {
  var flags = obj.__flags || (obj.__flags = Object.create(null));
  if (arguments.length === 3) {
    flags[key] = value;
  } else {
    return flags[key];
  }
};

},{}],33:[function(require,module,exports){
/*!
 * Chai - getActual utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getActual(object, [actual])
 *
 * Returns the `actual` value for an Assertion
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  var actual = args[4];
  return 'undefined' !== typeof actual ? actual : obj._obj;
};

},{}],34:[function(require,module,exports){
/*!
 * Chai - getEnumerableProperties utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getEnumerableProperties(object)
 *
 * This allows the retrieval of enumerable property names of an object,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getEnumerableProperties
 * @api public
 */

module.exports = function getEnumerableProperties(object) {
  var result = [];
  for (var name in object) {
    result.push(name);
  }
  return result;
};

},{}],35:[function(require,module,exports){
/*!
 * Chai - message composition utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag')
  , getActual = require('./getActual')
  , inspect = require('./inspect')
  , objDisplay = require('./objDisplay');

/**
 * ### .getMessage(object, message, negateMessage)
 *
 * Construct the error message based on flags
 * and template tags. Template tags will return
 * a stringified inspection of the object referenced.
 *
 * Message template tags:
 * - `#{this}` current asserted object
 * - `#{act}` actual value
 * - `#{exp}` expected value
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @name getMessage
 * @api public
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , val = flag(obj, 'object')
    , expected = args[3]
    , actual = getActual(obj, args)
    , msg = negate ? args[2] : args[1]
    , flagMsg = flag(obj, 'message');

  msg = msg || '';
  msg = msg
    .replace(/#{this}/g, objDisplay(val))
    .replace(/#{act}/g, objDisplay(actual))
    .replace(/#{exp}/g, objDisplay(expected));

  return flagMsg ? flagMsg + ': ' + msg : msg;
};

},{"./flag":32,"./getActual":33,"./inspect":40,"./objDisplay":41}],36:[function(require,module,exports){
/*!
 * Chai - getName utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getName(func)
 *
 * Gets the name of a function, in a cross-browser way.
 *
 * @param {Function} a function (usually a constructor)
 */

module.exports = function (func) {
  if (func.name) return func.name;

  var match = /^\s?function ([^(]*)\(/.exec(func);
  return match && match[1] ? match[1] : "";
};

},{}],37:[function(require,module,exports){
/*!
 * Chai - getPathValue utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * @see https://github.com/logicalparadox/filtr
 * MIT Licensed
 */

/**
 * ### .getPathValue(path, object)
 *
 * This allows the retrieval of values in an
 * object given a string path.
 *
 *     var obj = {
 *         prop1: {
 *             arr: ['a', 'b', 'c']
 *           , str: 'Hello'
 *         }
 *       , prop2: {
 *             arr: [ { nested: 'Universe' } ]
 *           , str: 'Hello again!'
 *         }
 *     }
 *
 * The following would be the results.
 *
 *     getPathValue('prop1.str', obj); // Hello
 *     getPathValue('prop1.att[2]', obj); // b
 *     getPathValue('prop2.arr[0].nested', obj); // Universe
 *
 * @param {String} path
 * @param {Object} object
 * @returns {Object} value or `undefined`
 * @name getPathValue
 * @api public
 */

var getPathValue = module.exports = function (path, obj) {
  var parsed = parsePath(path);
  return _getPathValue(parsed, obj);
};

/*!
 * ## parsePath(path)
 *
 * Helper function used to parse string object
 * paths. Use in conjunction with `_getPathValue`.
 *
 *      var parsed = parsePath('myobject.property.subprop');
 *
 * ### Paths:
 *
 * * Can be as near infinitely deep and nested
 * * Arrays are also valid using the formal `myobject.document[3].property`.
 *
 * @param {String} path
 * @returns {Object} parsed
 * @api private
 */

function parsePath (path) {
  var str = path.replace(/\[/g, '.[')
    , parts = str.match(/(\\\.|[^.]+?)+/g);
  return parts.map(function (value) {
    var re = /\[(\d+)\]$/
      , mArr = re.exec(value)
    if (mArr) return { i: parseFloat(mArr[1]) };
    else return { p: value };
  });
};

/*!
 * ## _getPathValue(parsed, obj)
 *
 * Helper companion function for `.parsePath` that returns
 * the value located at the parsed address.
 *
 *      var value = getPathValue(parsed, obj);
 *
 * @param {Object} parsed definition from `parsePath`.
 * @param {Object} object to search against
 * @returns {Object|Undefined} value
 * @api private
 */

function _getPathValue (parsed, obj) {
  var tmp = obj
    , res;
  for (var i = 0, l = parsed.length; i < l; i++) {
    var part = parsed[i];
    if (tmp) {
      if ('undefined' !== typeof part.p)
        tmp = tmp[part.p];
      else if ('undefined' !== typeof part.i)
        tmp = tmp[part.i];
      if (i == (l - 1)) res = tmp;
    } else {
      res = undefined;
    }
  }
  return res;
};

},{}],38:[function(require,module,exports){
/*!
 * Chai - getProperties utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getProperties(object)
 *
 * This allows the retrieval of property names of an object, enumerable or not,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getProperties
 * @api public
 */

module.exports = function getProperties(object) {
  var result = Object.getOwnPropertyNames(subject);

  function addProperty(property) {
    if (result.indexOf(property) === -1) {
      result.push(property);
    }
  }

  var proto = Object.getPrototypeOf(subject);
  while (proto !== null) {
    Object.getOwnPropertyNames(proto).forEach(addProperty);
    proto = Object.getPrototypeOf(proto);
  }

  return result;
};

},{}],39:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Main exports
 */

var exports = module.exports = {};

/*!
 * test utility
 */

exports.test = require('./test');

/*!
 * type utility
 */

exports.type = require('./type');

/*!
 * message utility
 */

exports.getMessage = require('./getMessage');

/*!
 * actual utility
 */

exports.getActual = require('./getActual');

/*!
 * Inspect util
 */

exports.inspect = require('./inspect');

/*!
 * Object Display util
 */

exports.objDisplay = require('./objDisplay');

/*!
 * Flag utility
 */

exports.flag = require('./flag');

/*!
 * Flag transferring utility
 */

exports.transferFlags = require('./transferFlags');

/*!
 * Deep equal utility
 */

exports.eql = require('deep-eql');

/*!
 * Deep path value
 */

exports.getPathValue = require('./getPathValue');

/*!
 * Function name
 */

exports.getName = require('./getName');

/*!
 * add Property
 */

exports.addProperty = require('./addProperty');

/*!
 * add Method
 */

exports.addMethod = require('./addMethod');

/*!
 * overwrite Property
 */

exports.overwriteProperty = require('./overwriteProperty');

/*!
 * overwrite Method
 */

exports.overwriteMethod = require('./overwriteMethod');

/*!
 * Add a chainable method
 */

exports.addChainableMethod = require('./addChainableMethod');


},{"./addChainableMethod":29,"./addMethod":30,"./addProperty":31,"./flag":32,"./getActual":33,"./getMessage":35,"./getName":36,"./getPathValue":37,"./inspect":40,"./objDisplay":41,"./overwriteMethod":42,"./overwriteProperty":43,"./test":44,"./transferFlags":45,"./type":46,"deep-eql":48}],40:[function(require,module,exports){
// This is (almost) directly from Node.js utils
// https://github.com/joyent/node/blob/f8c335d0caf47f16d31413f89aa28eda3878e3aa/lib/util.js

var getName = require('./getName');
var getProperties = require('./getProperties');
var getEnumerableProperties = require('./getEnumerableProperties');

module.exports = inspect;

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 */
function inspect(obj, showHidden, depth, colors) {
  var ctx = {
    showHidden: showHidden,
    seen: [],
    stylize: function (str) { return str; }
  };
  return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
}

// https://gist.github.com/1044128/
var getOuterHTML = function(element) {
  if ('outerHTML' in element) return element.outerHTML;
  var ns = "http://www.w3.org/1999/xhtml";
  var container = document.createElementNS(ns, '_');
  var elemProto = (window.HTMLElement || window.Element).prototype;
  var xmlSerializer = new XMLSerializer();
  var html;
  if (document.xmlVersion) {
    return xmlSerializer.serializeToString(element);
  } else {
    container.appendChild(element.cloneNode(false));
    html = container.innerHTML.replace('><', '>' + element.innerHTML + '<');
    container.innerHTML = '';
    return html;
  }
};

// Returns true if object is a DOM element.
var isDOMElement = function (object) {
  if (typeof HTMLElement === 'object') {
    return object instanceof HTMLElement;
  } else {
    return object &&
      typeof object === 'object' &&
      object.nodeType === 1 &&
      typeof object.nodeName === 'string';
  }
};

function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (typeof ret !== 'string') {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // If it's DOM elem, get outer HTML.
  if (isDOMElement(value)) {
    return getOuterHTML(value);
  }

  // Look up the keys of the object.
  var visibleKeys = getEnumerableProperties(value);
  var keys = ctx.showHidden ? getProperties(value) : visibleKeys;

  // Some type of object without properties can be shortcutted.
  // In IE, errors have a single `stack` property, or if they are vanilla `Error`,
  // a `stack` plus `description` property; ignore those for consistency.
  if (keys.length === 0 || (isError(value) && (
      (keys.length === 1 && keys[0] === 'stack') ||
      (keys.length === 2 && keys[0] === 'description' && keys[1] === 'stack')
     ))) {
    if (typeof value === 'function') {
      var name = getName(value);
      var nameSuffix = name ? ': ' + name : '';
      return ctx.stylize('[Function' + nameSuffix + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toUTCString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (typeof value === 'function') {
    var name = getName(value);
    var nameSuffix = name ? ': ' + name : '';
    base = ' [Function' + nameSuffix + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    return formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  switch (typeof value) {
    case 'undefined':
      return ctx.stylize('undefined', 'undefined');

    case 'string':
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');

    case 'number':
      return ctx.stylize('' + value, 'number');

    case 'boolean':
      return ctx.stylize('' + value, 'boolean');
  }
  // For some reason typeof null is "object", so special case here.
  if (value === null) {
    return ctx.stylize('null', 'null');
  }
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (Object.prototype.hasOwnProperty.call(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str;
  if (value.__lookupGetter__) {
    if (value.__lookupGetter__(key)) {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
  }
  if (visibleKeys.indexOf(key) < 0) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(value[key]) < 0) {
      if (recurseTimes === null) {
        str = formatValue(ctx, value[key], null);
      } else {
        str = formatValue(ctx, value[key], recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (typeof name === 'undefined') {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}

function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && objectToString(ar) === '[object Array]');
}

function isRegExp(re) {
  return typeof re === 'object' && objectToString(re) === '[object RegExp]';
}

function isDate(d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]';
}

function isError(e) {
  return typeof e === 'object' && objectToString(e) === '[object Error]';
}

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

},{"./getEnumerableProperties":34,"./getName":36,"./getProperties":38}],41:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var inspect = require('./inspect');

/**
 * ### .objDisplay (object)
 *
 * Determines if an object or an array matches
 * criteria to be inspected in-line for error
 * messages or should be truncated.
 *
 * @param {Mixed} javascript object to inspect
 * @name objDisplay
 * @api public
 */

module.exports = function (obj) {
  var str = inspect(obj)
    , type = Object.prototype.toString.call(obj);

  if (str.length >= 40) {
    if (type === '[object Function]') {
      return !obj.name || obj.name === ''
        ? '[Function]'
        : '[Function: ' + obj.name + ']';
    } else if (type === '[object Array]') {
      return '[ Array(' + obj.length + ') ]';
    } else if (type === '[object Object]') {
      var keys = Object.keys(obj)
        , kstr = keys.length > 2
          ? keys.splice(0, 2).join(', ') + ', ...'
          : keys.join(', ');
      return '{ Object (' + kstr + ') }';
    } else {
      return str;
    }
  } else {
    return str;
  }
};

},{"./inspect":40}],42:[function(require,module,exports){
/*!
 * Chai - overwriteMethod utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteMethod (ctx, name, fn)
 *
 * Overwites an already existing method and provides
 * access to previous function. Must return function
 * to be used for name.
 *
 *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
 *       return function (str) {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.value).to.equal(str);
 *         } else {
 *           _super.apply(this, arguments);
 *         }
 *       }
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.equal('bar');
 *
 * @param {Object} ctx object whose method is to be overwritten
 * @param {String} name of method to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @name overwriteMethod
 * @api public
 */

module.exports = function (ctx, name, method) {
  var _method = ctx[name]
    , _super = function () { return this; };

  if (_method && 'function' === typeof _method)
    _super = _method;

  ctx[name] = function () {
    var result = method(_super).apply(this, arguments);
    return result === undefined ? this : result;
  }
};

},{}],43:[function(require,module,exports){
/*!
 * Chai - overwriteProperty utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteProperty (ctx, name, fn)
 *
 * Overwites an already existing property getter and provides
 * access to previous value. Must return function to use as getter.
 *
 *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
 *       return function () {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.name).to.equal('bar');
 *         } else {
 *           _super.call(this);
 *         }
 *       }
 *     });
 *
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.ok;
 *
 * @param {Object} ctx object whose property is to be overwritten
 * @param {String} name of property to overwrite
 * @param {Function} getter function that returns a getter function to be used for name
 * @name overwriteProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  var _get = Object.getOwnPropertyDescriptor(ctx, name)
    , _super = function () {};

  if (_get && 'function' === typeof _get.get)
    _super = _get.get

  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter(_super).call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],44:[function(require,module,exports){
/*!
 * Chai - test utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag');

/**
 * # test(object, expression)
 *
 * Test and object for expression.
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , expr = args[0];
  return negate ? !expr : expr;
};

},{"./flag":32}],45:[function(require,module,exports){
/*!
 * Chai - transferFlags utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### transferFlags(assertion, object, includeAll = true)
 *
 * Transfer all the flags for `assertion` to `object`. If
 * `includeAll` is set to `false`, then the base Chai
 * assertion flags (namely `object`, `ssfi`, and `message`)
 * will not be transferred.
 *
 *
 *     var newAssertion = new Assertion();
 *     utils.transferFlags(assertion, newAssertion);
 *
 *     var anotherAsseriton = new Assertion(myObj);
 *     utils.transferFlags(assertion, anotherAssertion, false);
 *
 * @param {Assertion} assertion the assertion to transfer the flags from
 * @param {Object} object the object to transfer the flags too; usually a new assertion
 * @param {Boolean} includeAll
 * @name getAllFlags
 * @api private
 */

module.exports = function (assertion, object, includeAll) {
  var flags = assertion.__flags || (assertion.__flags = Object.create(null));

  if (!object.__flags) {
    object.__flags = Object.create(null);
  }

  includeAll = arguments.length === 3 ? includeAll : true;

  for (var flag in flags) {
    if (includeAll ||
        (flag !== 'object' && flag !== 'ssfi' && flag != 'message')) {
      object.__flags[flag] = flags[flag];
    }
  }
};

},{}],46:[function(require,module,exports){
/*!
 * Chai - type utility
 * Copyright(c) 2012-2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Arguments]': 'arguments'
  , '[object Array]': 'array'
  , '[object Date]': 'date'
  , '[object Function]': 'function'
  , '[object Number]': 'number'
  , '[object RegExp]': 'regexp'
  , '[object String]': 'string'
};

/**
 * ### type(object)
 *
 * Better implementation of `typeof` detection that can
 * be used cross-browser. Handles the inconsistencies of
 * Array, `null`, and `undefined` detection.
 *
 *     utils.type({}) // 'object'
 *     utils.type(null) // `null'
 *     utils.type(undefined) // `undefined`
 *     utils.type([]) // `array`
 *
 * @param {Mixed} object to detect type of
 * @name type
 * @api private
 */

module.exports = function (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
};

},{}],47:[function(require,module,exports){
/*!
 * assertion-error
 * Copyright(c) 2013 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Return a function that will copy properties from
 * one object to another excluding any originally
 * listed. Returned function will create a new `{}`.
 *
 * @param {String} excluded properties ...
 * @return {Function}
 */

function exclude () {
  var excludes = [].slice.call(arguments);

  function excludeProps (res, obj) {
    Object.keys(obj).forEach(function (key) {
      if (!~excludes.indexOf(key)) res[key] = obj[key];
    });
  }

  return function extendExclude () {
    var args = [].slice.call(arguments)
      , i = 0
      , res = {};

    for (; i < args.length; i++) {
      excludeProps(res, args[i]);
    }

    return res;
  };
};

/*!
 * Primary Exports
 */

module.exports = AssertionError;

/**
 * ### AssertionError
 *
 * An extension of the JavaScript `Error` constructor for
 * assertion and validation scenarios.
 *
 * @param {String} message
 * @param {Object} properties to include (optional)
 * @param {callee} start stack function (optional)
 */

function AssertionError (message, _props, ssf) {
  var extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON')
    , props = extend(_props || {});

  // default values
  this.message = message || 'Unspecified AssertionError';
  this.showDiff = false;

  // copy from properties
  for (var key in props) {
    this[key] = props[key];
  }

  // capture stack trace
  ssf = ssf || arguments.callee;
  if (ssf && Error.captureStackTrace) {
    Error.captureStackTrace(this, ssf);
  }
}

/*!
 * Inherit from Error.prototype
 */

AssertionError.prototype = Object.create(Error.prototype);

/*!
 * Statically set name
 */

AssertionError.prototype.name = 'AssertionError';

/*!
 * Ensure correct constructor
 */

AssertionError.prototype.constructor = AssertionError;

/**
 * Allow errors to be converted to JSON for static transfer.
 *
 * @param {Boolean} include stack (default: `true`)
 * @return {Object} object that can be `JSON.stringify`
 */

AssertionError.prototype.toJSON = function (stack) {
  var extend = exclude('constructor', 'toJSON', 'stack')
    , props = extend({ name: this.name }, this);

  // include stack if exists and not turned off
  if (false !== stack && this.stack) {
    props.stack = this.stack;
  }

  return props;
};

},{}],48:[function(require,module,exports){
module.exports = require('./lib/eql');

},{"./lib/eql":49}],49:[function(require,module,exports){
/*!
 * deep-eql
 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var type = require('type-detect');

/*!
 * Buffer.isBuffer browser shim
 */

var Buffer;
try { Buffer = require('buffer').Buffer; }
catch(ex) {
  Buffer = {};
  Buffer.isBuffer = function() { return false; }
}

/*!
 * Primary Export
 */

module.exports = deepEqual;

/**
 * Assert super-strict (egal) equality between
 * two objects of any type.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @param {Array} memoised (optional)
 * @return {Boolean} equal match
 */

function deepEqual(a, b, m) {
  if (sameValue(a, b)) {
    return true;
  } else if ('date' === type(a)) {
    return dateEqual(a, b);
  } else if ('regexp' === type(a)) {
    return regexpEqual(a, b);
  } else if (Buffer.isBuffer(a)) {
    return bufferEqual(a, b);
  } else if ('arguments' === type(a)) {
    return argumentsEqual(a, b, m);
  } else if (!typeEqual(a, b)) {
    return false;
  } else if (('object' !== type(a) && 'object' !== type(b))
  && ('array' !== type(a) && 'array' !== type(b))) {
    return sameValue(a, b);
  } else {
    return objectEqual(a, b, m);
  }
}

/*!
 * Strict (egal) equality test. Ensures that NaN always
 * equals NaN and `-0` does not equal `+0`.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} equal match
 */

function sameValue(a, b) {
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  return a !== a && b !== b;
}

/*!
 * Compare the types of two given objects and
 * return if they are equal. Note that an Array
 * has a type of `array` (not `object`) and arguments
 * have a type of `arguments` (not `array`/`object`).
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function typeEqual(a, b) {
  return type(a) === type(b);
}

/*!
 * Compare two Date objects by asserting that
 * the time values are equal using `saveValue`.
 *
 * @param {Date} a
 * @param {Date} b
 * @return {Boolean} result
 */

function dateEqual(a, b) {
  if ('date' !== type(b)) return false;
  return sameValue(a.getTime(), b.getTime());
}

/*!
 * Compare two regular expressions by converting them
 * to string and checking for `sameValue`.
 *
 * @param {RegExp} a
 * @param {RegExp} b
 * @return {Boolean} result
 */

function regexpEqual(a, b) {
  if ('regexp' !== type(b)) return false;
  return sameValue(a.toString(), b.toString());
}

/*!
 * Assert deep equality of two `arguments` objects.
 * Unfortunately, these must be sliced to arrays
 * prior to test to ensure no bad behavior.
 *
 * @param {Arguments} a
 * @param {Arguments} b
 * @param {Array} memoize (optional)
 * @return {Boolean} result
 */

function argumentsEqual(a, b, m) {
  if ('arguments' !== type(b)) return false;
  a = [].slice.call(a);
  b = [].slice.call(b);
  return deepEqual(a, b, m);
}

/*!
 * Get enumerable properties of a given object.
 *
 * @param {Object} a
 * @return {Array} property names
 */

function enumerable(a) {
  var res = [];
  for (var key in a) res.push(key);
  return res;
}

/*!
 * Simple equality for flat iterable objects
 * such as Arrays or Node.js buffers.
 *
 * @param {Iterable} a
 * @param {Iterable} b
 * @return {Boolean} result
 */

function iterableEqual(a, b) {
  if (a.length !==  b.length) return false;

  var i = 0;
  var match = true;

  for (; i < a.length; i++) {
    if (a[i] !== b[i]) {
      match = false;
      break;
    }
  }

  return match;
}

/*!
 * Extension to `iterableEqual` specifically
 * for Node.js Buffers.
 *
 * @param {Buffer} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function bufferEqual(a, b) {
  if (!Buffer.isBuffer(b)) return false;
  return iterableEqual(a, b);
}

/*!
 * Block for `objectEqual` ensuring non-existing
 * values don't get in.
 *
 * @param {Mixed} object
 * @return {Boolean} result
 */

function isValue(a) {
  return a !== null && a !== undefined;
}

/*!
 * Recursively check the equality of two objects.
 * Once basic sameness has been established it will
 * defer to `deepEqual` for each enumerable key
 * in the object.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function objectEqual(a, b, m) {
  if (!isValue(a) || !isValue(b)) {
    return false;
  }

  if (a.prototype !== b.prototype) {
    return false;
  }

  var i;
  if (m) {
    for (i = 0; i < m.length; i++) {
      if ((m[i][0] === a && m[i][1] === b)
      ||  (m[i][0] === b && m[i][1] === a)) {
        return true;
      }
    }
  } else {
    m = [];
  }

  try {
    var ka = enumerable(a);
    var kb = enumerable(b);
  } catch (ex) {
    return false;
  }

  ka.sort();
  kb.sort();

  if (!iterableEqual(ka, kb)) {
    return false;
  }

  m.push([ a, b ]);

  var key;
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], m)) {
      return false;
    }
  }

  return true;
}

},{"buffer":13,"type-detect":50}],50:[function(require,module,exports){
module.exports = require('./lib/type');

},{"./lib/type":51}],51:[function(require,module,exports){
/*!
 * type-detect
 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Primary Exports
 */

var exports = module.exports = getType;

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Array]': 'array'
  , '[object RegExp]': 'regexp'
  , '[object Function]': 'function'
  , '[object Arguments]': 'arguments'
  , '[object Date]': 'date'
};

/**
 * ### typeOf (obj)
 *
 * Use several different techniques to determine
 * the type of object being tested.
 *
 *
 * @param {Mixed} object
 * @return {String} object type
 * @api public
 */

function getType (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
}

exports.Library = Library;

/**
 * ### Library
 *
 * Create a repository for custom type detection.
 *
 * ```js
 * var lib = new type.Library;
 * ```
 *
 */

function Library () {
  this.tests = {};
}

/**
 * #### .of (obj)
 *
 * Expose replacement `typeof` detection to the library.
 *
 * ```js
 * if ('string' === lib.of('hello world')) {
 *   // ...
 * }
 * ```
 *
 * @param {Mixed} object to test
 * @return {String} type
 */

Library.prototype.of = getType;

/**
 * #### .define (type, test)
 *
 * Add a test to for the `.test()` assertion.
 *
 * Can be defined as a regular expression:
 *
 * ```js
 * lib.define('int', /^[0-9]+$/);
 * ```
 *
 * ... or as a function:
 *
 * ```js
 * lib.define('bln', function (obj) {
 *   if ('boolean' === lib.of(obj)) return true;
 *   var blns = [ 'yes', 'no', 'true', 'false', 1, 0 ];
 *   if ('string' === lib.of(obj)) obj = obj.toLowerCase();
 *   return !! ~blns.indexOf(obj);
 * });
 * ```
 *
 * @param {String} type
 * @param {RegExp|Function} test
 * @api public
 */

Library.prototype.define = function (type, test) {
  if (arguments.length === 1) return this.tests[type];
  this.tests[type] = test;
  return this;
};

/**
 * #### .test (obj, test)
 *
 * Assert that an object is of type. Will first
 * check natives, and if that does not pass it will
 * use the user defined custom tests.
 *
 * ```js
 * assert(lib.test('1', 'int'));
 * assert(lib.test('yes', 'bln'));
 * ```
 *
 * @param {Mixed} object
 * @param {String} type
 * @return {Boolean} result
 * @api public
 */

Library.prototype.test = function (obj, type) {
  if (type === getType(obj)) return true;
  var test = this.tests[type];

  if (test && 'regexp' === getType(test)) {
    return test.test(obj);
  } else if (test && 'function' === getType(test)) {
    return test(obj);
  } else {
    throw new ReferenceError('Type test "' + type + '" not defined or invalid.');
  }
};

},{}],52:[function(require,module,exports){
//.CommonJS
var CSSOM = {
    CSSRule: require("./CSSRule").CSSRule,
    MatcherList: require("./MatcherList").MatcherList
};
///CommonJS


/**
 * @constructor
 * @see https://developer.mozilla.org/en/CSS/@-moz-document
 */
CSSOM.CSSDocumentRule = function CSSDocumentRule() {
    CSSOM.CSSRule.call(this);
    this.matcher = new CSSOM.MatcherList;
    this.cssRules = [];
};

CSSOM.CSSDocumentRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSDocumentRule.prototype.constructor = CSSOM.CSSDocumentRule;
CSSOM.CSSDocumentRule.prototype.type = 10;
//FIXME
//CSSOM.CSSDocumentRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSDocumentRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

Object.defineProperty(CSSOM.CSSDocumentRule.prototype, "cssText", {
  get: function() {
    var cssTexts = [];
    for (var i=0, length=this.cssRules.length; i < length; i++) {
        cssTexts.push(this.cssRules[i].cssText);
    }
    return "@-moz-document " + this.matcher.matcherText + " {" + cssTexts.join("") + "}";
  }
});


//.CommonJS
exports.CSSDocumentRule = CSSOM.CSSDocumentRule;
///CommonJS

},{"./CSSRule":58,"./MatcherList":64}],53:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSStyleDeclaration: require("./CSSStyleDeclaration").CSSStyleDeclaration,
	CSSRule: require("./CSSRule").CSSRule
};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#css-font-face-rule
 */
CSSOM.CSSFontFaceRule = function CSSFontFaceRule() {
	CSSOM.CSSRule.call(this);
	this.style = new CSSOM.CSSStyleDeclaration;
	this.style.parentRule = this;
};

CSSOM.CSSFontFaceRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSFontFaceRule.prototype.constructor = CSSOM.CSSFontFaceRule;
CSSOM.CSSFontFaceRule.prototype.type = 5;
//FIXME
//CSSOM.CSSFontFaceRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSFontFaceRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

// http://www.opensource.apple.com/source/WebCore/WebCore-955.66.1/css/WebKitCSSFontFaceRule.cpp
Object.defineProperty(CSSOM.CSSFontFaceRule.prototype, "cssText", {
  get: function() {
    return "@font-face {" + this.style.cssText + "}";
  }
});


//.CommonJS
exports.CSSFontFaceRule = CSSOM.CSSFontFaceRule;
///CommonJS

},{"./CSSRule":58,"./CSSStyleDeclaration":59}],54:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSRule: require("./CSSRule").CSSRule,
	CSSStyleSheet: require("./CSSStyleSheet").CSSStyleSheet,
	MediaList: require("./MediaList").MediaList
};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#cssimportrule
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSImportRule
 */
CSSOM.CSSImportRule = function CSSImportRule() {
	CSSOM.CSSRule.call(this);
	this.href = "";
	this.media = new CSSOM.MediaList;
	this.styleSheet = new CSSOM.CSSStyleSheet;
};

CSSOM.CSSImportRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSImportRule.prototype.constructor = CSSOM.CSSImportRule;
CSSOM.CSSImportRule.prototype.type = 3;

Object.defineProperty(CSSOM.CSSImportRule.prototype, "cssText", {
  get: function() {
    var mediaText = this.media.mediaText;
    return "@import url(" + this.href + ")" + (mediaText ? " " + mediaText : "") + ";";
  },
  set: function(cssText) {
    var i = 0;

    /**
     * @import url(partial.css) screen, handheld;
     *        ||               |
     *        after-import     media
     *         |
     *         url
     */
    var state = '';

    var buffer = '';
    var index;
    var mediaText = '';
    for (var character; character = cssText.charAt(i); i++) {

      switch (character) {
        case ' ':
        case '\t':
        case '\r':
        case '\n':
        case '\f':
          if (state === 'after-import') {
            state = 'url';
          } else {
            buffer += character;
          }
          break;

        case '@':
          if (!state && cssText.indexOf('@import', i) === i) {
            state = 'after-import';
            i += 'import'.length;
            buffer = '';
          }
          break;

        case 'u':
          if (state === 'url' && cssText.indexOf('url(', i) === i) {
            index = cssText.indexOf(')', i + 1);
            if (index === -1) {
              throw i + ': ")" not found';
            }
            i += 'url('.length;
            var url = cssText.slice(i, index);
            if (url[0] === url[url.length - 1]) {
              if (url[0] === '"' || url[0] === "'") {
                url = url.slice(1, -1);
              }
            }
            this.href = url;
            i = index;
            state = 'media';
          }
          break;

        case '"':
          if (state === 'url') {
            index = cssText.indexOf('"', i + 1);
            if (!index) {
              throw i + ": '\"' not found";
            }
            this.href = cssText.slice(i + 1, index);
            i = index;
            state = 'media';
          }
          break;

        case "'":
          if (state === 'url') {
            index = cssText.indexOf("'", i + 1);
            if (!index) {
              throw i + ': "\'" not found';
            }
            this.href = cssText.slice(i + 1, index);
            i = index;
            state = 'media';
          }
          break;

        case ';':
          if (state === 'media') {
            if (buffer) {
              this.media.mediaText = buffer.trim();
            }
          }
          break;

        default:
          if (state === 'media') {
            buffer += character;
          }
          break;
      }
    }
  }
});


//.CommonJS
exports.CSSImportRule = CSSOM.CSSImportRule;
///CommonJS

},{"./CSSRule":58,"./CSSStyleSheet":61,"./MediaList":65}],55:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSRule: require("./CSSRule").CSSRule,
	CSSStyleDeclaration: require('./CSSStyleDeclaration').CSSStyleDeclaration
};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/css3-animations/#DOM-CSSKeyframeRule
 */
CSSOM.CSSKeyframeRule = function CSSKeyframeRule() {
	CSSOM.CSSRule.call(this);
	this.keyText = '';
	this.style = new CSSOM.CSSStyleDeclaration;
	this.style.parentRule = this;
};

CSSOM.CSSKeyframeRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSKeyframeRule.prototype.constructor = CSSOM.CSSKeyframeRule;
CSSOM.CSSKeyframeRule.prototype.type = 9;
//FIXME
//CSSOM.CSSKeyframeRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSKeyframeRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

// http://www.opensource.apple.com/source/WebCore/WebCore-955.66.1/css/WebKitCSSKeyframeRule.cpp
Object.defineProperty(CSSOM.CSSKeyframeRule.prototype, "cssText", {
  get: function() {
    return this.keyText + " {" + this.style.cssText + "} ";
  }
});


//.CommonJS
exports.CSSKeyframeRule = CSSOM.CSSKeyframeRule;
///CommonJS

},{"./CSSRule":58,"./CSSStyleDeclaration":59}],56:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSRule: require("./CSSRule").CSSRule
};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/css3-animations/#DOM-CSSKeyframesRule
 */
CSSOM.CSSKeyframesRule = function CSSKeyframesRule() {
	CSSOM.CSSRule.call(this);
	this.name = '';
	this.cssRules = [];
};

CSSOM.CSSKeyframesRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSKeyframesRule.prototype.constructor = CSSOM.CSSKeyframesRule;
CSSOM.CSSKeyframesRule.prototype.type = 8;
//FIXME
//CSSOM.CSSKeyframesRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSKeyframesRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

// http://www.opensource.apple.com/source/WebCore/WebCore-955.66.1/css/WebKitCSSKeyframesRule.cpp
Object.defineProperty(CSSOM.CSSKeyframesRule.prototype, "cssText", {
  get: function() {
    var cssTexts = [];
    for (var i=0, length=this.cssRules.length; i < length; i++) {
      cssTexts.push("  " + this.cssRules[i].cssText);
    }
    return "@" + (this._vendorPrefix || '') + "keyframes " + this.name + " { \n" + cssTexts.join("\n") + "\n}";
  }
});


//.CommonJS
exports.CSSKeyframesRule = CSSOM.CSSKeyframesRule;
///CommonJS

},{"./CSSRule":58}],57:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSRule: require("./CSSRule").CSSRule,
	MediaList: require("./MediaList").MediaList
};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#cssmediarule
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSMediaRule
 */
CSSOM.CSSMediaRule = function CSSMediaRule() {
	CSSOM.CSSRule.call(this);
	this.media = new CSSOM.MediaList;
	this.cssRules = [];
};

CSSOM.CSSMediaRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSMediaRule.prototype.constructor = CSSOM.CSSMediaRule;
CSSOM.CSSMediaRule.prototype.type = 4;
//FIXME
//CSSOM.CSSMediaRule.prototype.insertRule = CSSStyleSheet.prototype.insertRule;
//CSSOM.CSSMediaRule.prototype.deleteRule = CSSStyleSheet.prototype.deleteRule;

// http://opensource.apple.com/source/WebCore/WebCore-658.28/css/CSSMediaRule.cpp
Object.defineProperty(CSSOM.CSSMediaRule.prototype, "cssText", {
  get: function() {
    var cssTexts = [];
    for (var i=0, length=this.cssRules.length; i < length; i++) {
      cssTexts.push(this.cssRules[i].cssText);
    }
    return "@media " + this.media.mediaText + " {" + cssTexts.join("") + "}";
  }
});


//.CommonJS
exports.CSSMediaRule = CSSOM.CSSMediaRule;
///CommonJS

},{"./CSSRule":58,"./MediaList":65}],58:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#the-cssrule-interface
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSRule
 */
CSSOM.CSSRule = function CSSRule() {
	this.parentRule = null;
	this.parentStyleSheet = null;
};

CSSOM.CSSRule.STYLE_RULE = 1;
CSSOM.CSSRule.IMPORT_RULE = 3;
CSSOM.CSSRule.MEDIA_RULE = 4;
CSSOM.CSSRule.FONT_FACE_RULE = 5;
CSSOM.CSSRule.PAGE_RULE = 6;
CSSOM.CSSRule.WEBKIT_KEYFRAMES_RULE = 8;
CSSOM.CSSRule.WEBKIT_KEYFRAME_RULE = 9;

// Obsolete in CSSOM http://dev.w3.org/csswg/cssom/
//CSSOM.CSSRule.UNKNOWN_RULE = 0;
//CSSOM.CSSRule.CHARSET_RULE = 2;

// Never implemented
//CSSOM.CSSRule.VARIABLES_RULE = 7;

CSSOM.CSSRule.prototype = {
	constructor: CSSOM.CSSRule
	//FIXME
};


//.CommonJS
exports.CSSRule = CSSOM.CSSRule;
///CommonJS

},{}],59:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration
 */
CSSOM.CSSStyleDeclaration = function CSSStyleDeclaration(){
	this.length = 0;
	this.parentRule = null;

	// NON-STANDARD
	this._importants = {};
};


CSSOM.CSSStyleDeclaration.prototype = {

	constructor: CSSOM.CSSStyleDeclaration,

	/**
	 *
	 * @param {string} name
	 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-getPropertyValue
	 * @return {string} the value of the property if it has been explicitly set for this declaration block.
	 * Returns the empty string if the property has not been set.
	 */
	getPropertyValue: function(name) {
		return this[name] || "";
	},

	/**
	 *
	 * @param {string} name
	 * @param {string} value
	 * @param {string} [priority=null] "important" or null
	 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-setProperty
	 */
	setProperty: function(name, value, priority) {
		if (this[name]) {
			// Property already exist. Overwrite it.
			var index = Array.prototype.indexOf.call(this, name);
			if (index < 0) {
				this[this.length] = name;
				this.length++;
			}
		} else {
			// New property.
			this[this.length] = name;
			this.length++;
		}
		this[name] = value;
		this._importants[name] = priority;
	},

	/**
	 *
	 * @param {string} name
	 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-removeProperty
	 * @return {string} the value of the property if it has been explicitly set for this declaration block.
	 * Returns the empty string if the property has not been set or the property name does not correspond to a known CSS property.
	 */
	removeProperty: function(name) {
		if (!(name in this)) {
			return "";
		}
		var index = Array.prototype.indexOf.call(this, name);
		if (index < 0) {
			return "";
		}
		var prevValue = this[name];
		this[name] = "";

		// That's what WebKit and Opera do
		Array.prototype.splice.call(this, index, 1);

		// That's what Firefox does
		//this[index] = ""

		return prevValue;
	},

	getPropertyCSSValue: function() {
		//FIXME
	},

	/**
	 *
	 * @param {String} name
	 */
	getPropertyPriority: function(name) {
		return this._importants[name] || "";
	},


	/**
	 *   element.style.overflow = "auto"
	 *   element.style.getPropertyShorthand("overflow-x")
	 *   -> "overflow"
	 */
	getPropertyShorthand: function() {
		//FIXME
	},

	isPropertyImplicit: function() {
		//FIXME
	},

	// Doesn't work in IE < 9
	get cssText(){
		var properties = [];
		for (var i=0, length=this.length; i < length; ++i) {
			var name = this[i];
			var value = this.getPropertyValue(name);
			var priority = this.getPropertyPriority(name);
			if (priority) {
				priority = " !" + priority;
			}
			properties[i] = name + ": " + value + priority + ";";
		}
		return properties.join(" ");
	},

	set cssText(cssText){
		var i, name;
		for (i = this.length; i--;) {
			name = this[i];
			this[name] = "";
		}
		Array.prototype.splice.call(this, 0, this.length);
		this._importants = {};

		var dummyRule = CSSOM.parse('#bogus{' + cssText + '}').cssRules[0].style;
		var length = dummyRule.length;
		for (i = 0; i < length; ++i) {
			name = dummyRule[i];
			this.setProperty(dummyRule[i], dummyRule.getPropertyValue(name), dummyRule.getPropertyPriority(name));
		}
	}
};


//.CommonJS
exports.CSSStyleDeclaration = CSSOM.CSSStyleDeclaration;
CSSOM.parse = require('./parse').parse; // Cannot be included sooner due to the mutual dependency between parse.js and CSSStyleDeclaration.js
///CommonJS

},{"./parse":70}],60:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSStyleDeclaration: require("./CSSStyleDeclaration").CSSStyleDeclaration,
	CSSRule: require("./CSSRule").CSSRule
};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#cssstylerule
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleRule
 */
CSSOM.CSSStyleRule = function CSSStyleRule() {
	CSSOM.CSSRule.call(this);
	this.selectorText = "";
	this.style = new CSSOM.CSSStyleDeclaration;
	this.style.parentRule = this;
};

CSSOM.CSSStyleRule.prototype = new CSSOM.CSSRule;
CSSOM.CSSStyleRule.prototype.constructor = CSSOM.CSSStyleRule;
CSSOM.CSSStyleRule.prototype.type = 1;

Object.defineProperty(CSSOM.CSSStyleRule.prototype, "cssText", {
	get: function() {
		var text;
		if (this.selectorText) {
			text = this.selectorText + " {" + this.style.cssText + "}";
		} else {
			text = "";
		}
		return text;
	},
	set: function(cssText) {
		var rule = CSSOM.CSSStyleRule.parse(cssText);
		this.style = rule.style;
		this.selectorText = rule.selectorText;
	}
});


/**
 * NON-STANDARD
 * lightweight version of parse.js.
 * @param {string} ruleText
 * @return CSSStyleRule
 */
CSSOM.CSSStyleRule.parse = function(ruleText) {
	var i = 0;
	var state = "selector";
	var index;
	var j = i;
	var buffer = "";

	var SIGNIFICANT_WHITESPACE = {
		"selector": true,
		"value": true
	};

	var styleRule = new CSSOM.CSSStyleRule;
	var selector, name, value, priority="";

	for (var character; character = ruleText.charAt(i); i++) {

		switch (character) {

		case " ":
		case "\t":
		case "\r":
		case "\n":
		case "\f":
			if (SIGNIFICANT_WHITESPACE[state]) {
				// Squash 2 or more white-spaces in the row into 1
				switch (ruleText.charAt(i - 1)) {
					case " ":
					case "\t":
					case "\r":
					case "\n":
					case "\f":
						break;
					default:
						buffer += " ";
						break;
				}
			}
			break;

		// String
		case '"':
			j = i + 1;
			index = ruleText.indexOf('"', j) + 1;
			if (!index) {
				throw '" is missing';
			}
			buffer += ruleText.slice(i, index);
			i = index - 1;
			break;

		case "'":
			j = i + 1;
			index = ruleText.indexOf("'", j) + 1;
			if (!index) {
				throw "' is missing";
			}
			buffer += ruleText.slice(i, index);
			i = index - 1;
			break;

		// Comment
		case "/":
			if (ruleText.charAt(i + 1) === "*") {
				i += 2;
				index = ruleText.indexOf("*/", i);
				if (index === -1) {
					throw new SyntaxError("Missing */");
				} else {
					i = index + 1;
				}
			} else {
				buffer += character;
			}
			break;

		case "{":
			if (state === "selector") {
				styleRule.selectorText = buffer.trim();
				buffer = "";
				state = "name";
			}
			break;

		case ":":
			if (state === "name") {
				name = buffer.trim();
				buffer = "";
				state = "value";
			} else {
				buffer += character;
			}
			break;

		case "!":
			if (state === "value" && ruleText.indexOf("!important", i) === i) {
				priority = "important";
				i += "important".length;
			} else {
				buffer += character;
			}
			break;

		case ";":
			if (state === "value") {
				styleRule.style.setProperty(name, buffer.trim(), priority);
				priority = "";
				buffer = "";
				state = "name";
			} else {
				buffer += character;
			}
			break;

		case "}":
			if (state === "value") {
				styleRule.style.setProperty(name, buffer.trim(), priority);
				priority = "";
				buffer = "";
			} else if (state === "name") {
				break;
			} else {
				buffer += character;
			}
			state = "selector";
			break;

		default:
			buffer += character;
			break;

		}
	}

	return styleRule;

};


//.CommonJS
exports.CSSStyleRule = CSSOM.CSSStyleRule;
///CommonJS

},{"./CSSRule":58,"./CSSStyleDeclaration":59}],61:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	StyleSheet: require("./StyleSheet").StyleSheet,
	CSSStyleRule: require("./CSSStyleRule").CSSStyleRule
};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleSheet
 */
CSSOM.CSSStyleSheet = function CSSStyleSheet() {
	CSSOM.StyleSheet.call(this);
	this.cssRules = [];
};


CSSOM.CSSStyleSheet.prototype = new CSSOM.StyleSheet;
CSSOM.CSSStyleSheet.prototype.constructor = CSSOM.CSSStyleSheet;


/**
 * Used to insert a new rule into the style sheet. The new rule now becomes part of the cascade.
 *
 *   sheet = new Sheet("body {margin: 0}")
 *   sheet.toString()
 *   -> "body{margin:0;}"
 *   sheet.insertRule("img {border: none}", 0)
 *   -> 0
 *   sheet.toString()
 *   -> "img{border:none;}body{margin:0;}"
 *
 * @param {string} rule
 * @param {number} index
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleSheet-insertRule
 * @return {number} The index within the style sheet's rule collection of the newly inserted rule.
 */
CSSOM.CSSStyleSheet.prototype.insertRule = function(rule, index) {
	if (index < 0 || index > this.cssRules.length) {
		throw new RangeError("INDEX_SIZE_ERR");
	}
	var cssRule = CSSOM.parse(rule).cssRules[0];
	cssRule.parentStyleSheet = this;
	this.cssRules.splice(index, 0, cssRule);
	return index;
};


/**
 * Used to delete a rule from the style sheet.
 *
 *   sheet = new Sheet("img{border:none} body{margin:0}")
 *   sheet.toString()
 *   -> "img{border:none;}body{margin:0;}"
 *   sheet.deleteRule(0)
 *   sheet.toString()
 *   -> "body{margin:0;}"
 *
 * @param {number} index within the style sheet's rule list of the rule to remove.
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleSheet-deleteRule
 */
CSSOM.CSSStyleSheet.prototype.deleteRule = function(index) {
	if (index < 0 || index >= this.cssRules.length) {
		throw new RangeError("INDEX_SIZE_ERR");
	}
	this.cssRules.splice(index, 1);
};


/**
 * NON-STANDARD
 * @return {string} serialize stylesheet
 */
CSSOM.CSSStyleSheet.prototype.toString = function() {
	var result = "";
	var rules = this.cssRules;
	for (var i=0; i<rules.length; i++) {
		result += rules[i].cssText + "\n";
	}
	return result;
};


//.CommonJS
exports.CSSStyleSheet = CSSOM.CSSStyleSheet;
CSSOM.parse = require('./parse').parse; // Cannot be included sooner due to the mutual dependency between parse.js and CSSStyleSheet.js
///CommonJS

},{"./CSSStyleRule":60,"./StyleSheet":66,"./parse":70}],62:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSValue
 *
 * TODO: add if needed
 */
CSSOM.CSSValue = function CSSValue() {
};

CSSOM.CSSValue.prototype = {
	constructor: CSSOM.CSSValue,

	// @see: http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSValue
	set cssText(text) {
		var name = this._getConstructorName();

		throw new Exception('DOMException: property "cssText" of "' + name + '" is readonly!');
	},

	get cssText() {
		var name = this._getConstructorName();

		throw new Exception('getter "cssText" of "' + name + '" is not implemented!');
	},

	_getConstructorName: function() {
		var s = this.constructor.toString(),
				c = s.match(/function\s([^\(]+)/),
				name = c[1];

		return name;
	}
};


//.CommonJS
exports.CSSValue = CSSOM.CSSValue;
///CommonJS

},{}],63:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSValue: require('./CSSValue').CSSValue
};
///CommonJS


/**
 * @constructor
 * @see http://msdn.microsoft.com/en-us/library/ms537634(v=vs.85).aspx
 *
 */
CSSOM.CSSValueExpression = function CSSValueExpression(token, idx) {
	this._token = token;
	this._idx = idx;
};

CSSOM.CSSValueExpression.prototype = new CSSOM.CSSValue;
CSSOM.CSSValueExpression.prototype.constructor = CSSOM.CSSValueExpression;

/**
 * parse css expression() value
 *
 * @return {Object}
 *				 - error:
 *				 or
 *				 - idx:
 *				 - expression:
 *
 * Example:
 *
 * .selector {
 *		zoom: expression(documentElement.clientWidth > 1000 ? '1000px' : 'auto');
 * }
 */
CSSOM.CSSValueExpression.prototype.parse = function() {
	var token = this._token,
			idx = this._idx;

	var character = '',
			expression = '',
			error = '',
			info,
			paren = [];


	for (; ; ++idx) {
		character = token.charAt(idx);

		// end of token
		if (character == '') {
			error = 'css expression error: unfinished expression!';
			break;
		}

		switch(character) {
			case '(':
				paren.push(character);
				expression += character;
				break;

			case ')':
				paren.pop(character);
				expression += character;
				break;

			case '/':
				if (info = this._parseJSComment(token, idx)) { // comment?
					if (info.error) {
						error = 'css expression error: unfinished comment in expression!';
					} else {
						idx = info.idx;
						// ignore the comment
					}
				} else if (info = this._parseJSRexExp(token, idx)) { // regexp
					idx = info.idx;
					expression += info.text;
				} else { // other
					expression += character;
				}
				break;

			case "'":
			case '"':
				info = this._parseJSString(token, idx, character);
				if (info) { // string
					idx = info.idx;
					expression += info.text;
				} else {
					expression += character;
				}
				break;

			default:
				expression += character;
				break;
		}

		if (error) {
			break;
		}

		// end of expression
		if (paren.length == 0) {
			break;
		}
	}

	var ret;
	if (error) {
		ret = {
			error: error
		}
	} else {
		ret = {
			idx: idx,
			expression: expression
		}
	}

	return ret;
};


/**
 *
 * @return {Object|false}
 *          - idx:
 *          - text:
 *          or
 *          - error:
 *          or
 *          false
 *
 */
CSSOM.CSSValueExpression.prototype._parseJSComment = function(token, idx) {
	var nextChar = token.charAt(idx + 1),
			text;

	if (nextChar == '/' || nextChar == '*') {
		var startIdx = idx,
				endIdx,
				commentEndChar;

		if (nextChar == '/') { // line comment
			commentEndChar = '\n';
		} else if (nextChar == '*') { // block comment
			commentEndChar = '*/';
		}

		endIdx = token.indexOf(commentEndChar, startIdx + 1 + 1);
		if (endIdx !== -1) {
			endIdx = endIdx + commentEndChar.length - 1;
			text = token.substring(idx, endIdx + 1);
			return {
				idx: endIdx,
				text: text
			}
		} else {
			error = 'css expression error: unfinished comment in expression!';
			return {
				error: error
			}
		}
	} else {
		return false;
	}
};


/**
 *
 * @return {Object|false}
 *					- idx:
 *					- text:
 *					or 
 *					false
 *
 */
CSSOM.CSSValueExpression.prototype._parseJSString = function(token, idx, sep) {
	var endIdx = this._findMatchedIdx(token, idx, sep),
			text;

	if (endIdx === -1) {
		return false;
	} else {
		text = token.substring(idx, endIdx + sep.length);

		return {
			idx: endIdx,
			text: text
		}
	}
};


/**
 * parse regexp in css expression
 *
 * @return {Object|false}
 *				 - idx:
 *				 - regExp:
 *				 or 
 *				 false
 */

/*

all legal RegExp
 
/a/
(/a/)
[/a/]
[12, /a/]

!/a/

+/a/
-/a/
* /a/
/ /a/
%/a/

===/a/
!==/a/
==/a/
!=/a/
>/a/
>=/a/
</a/
<=/a/

&/a/
|/a/
^/a/
~/a/
<</a/
>>/a/
>>>/a/

&&/a/
||/a/
?/a/
=/a/
,/a/

		delete /a/
				in /a/
instanceof /a/
			 new /a/
		typeof /a/
			void /a/

*/
CSSOM.CSSValueExpression.prototype._parseJSRexExp = function(token, idx) {
	var before = token.substring(0, idx).replace(/\s+$/, ""),
			legalRegx = [
				/^$/,
				/\($/,
				/\[$/,
				/\!$/,
				/\+$/,
				/\-$/,
				/\*$/,
				/\/\s+/,
				/\%$/,
				/\=$/,
				/\>$/,
				/\<$/,
				/\&$/,
				/\|$/,
				/\^$/,
				/\~$/,
				/\?$/,
				/\,$/,
				/delete$/,
				/in$/,
				/instanceof$/,
				/new$/,
				/typeof$/,
				/void$/,
			];

	var isLegal = legalRegx.some(function(reg) {
		return reg.test(before);
	});

	if (!isLegal) {
		return false;
	} else {
		var sep = '/';

		// same logic as string
		return this._parseJSString(token, idx, sep);
	}
};


/**
 *
 * find next sep(same line) index in `token`
 *
 * @return {Number}
 *
 */
CSSOM.CSSValueExpression.prototype._findMatchedIdx = function(token, idx, sep) {
	var startIdx = idx,
			endIdx;

	var NOT_FOUND = -1;

	while(true) {
		endIdx = token.indexOf(sep, startIdx + 1);

		if (endIdx === -1) { // not found
			endIdx = NOT_FOUND;
			break;
		} else {
			var text = token.substring(idx + 1, endIdx),
					matched = text.match(/\\+$/);
			if (!matched || matched[0] % 2 == 0) { // not escaped
				break;
			} else {
				startIdx = endIdx;
			}
		}
	}

	// boundary must be in the same line(js sting or regexp)
	var nextNewLineIdx = token.indexOf('\n', idx + 1);
	if (nextNewLineIdx < endIdx) {
		endIdx = NOT_FOUND;
	}


	return endIdx;
}




//.CommonJS
exports.CSSValueExpression = CSSOM.CSSValueExpression;
///CommonJS

},{"./CSSValue":62}],64:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see https://developer.mozilla.org/en/CSS/@-moz-document
 */
CSSOM.MatcherList = function MatcherList(){
    this.length = 0;
};

CSSOM.MatcherList.prototype = {

    constructor: CSSOM.MatcherList,

    /**
     * @return {string}
     */
    get matcherText() {
        return Array.prototype.join.call(this, ", ");
    },

    /**
     * @param {string} value
     */
    set matcherText(value) {
        // just a temporary solution, actually it may be wrong by just split the value with ',', because a url can include ','.
        var values = value.split(",");
        var length = this.length = values.length;
        for (var i=0; i<length; i++) {
            this[i] = values[i].trim();
        }
    },

    /**
     * @param {string} matcher
     */
    appendMatcher: function(matcher) {
        if (Array.prototype.indexOf.call(this, matcher) === -1) {
            this[this.length] = matcher;
            this.length++;
        }
    },

    /**
     * @param {string} matcher
     */
    deleteMatcher: function(matcher) {
        var index = Array.prototype.indexOf.call(this, matcher);
        if (index !== -1) {
            Array.prototype.splice.call(this, index, 1);
        }
    }

};


//.CommonJS
exports.MatcherList = CSSOM.MatcherList;
///CommonJS

},{}],65:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#the-medialist-interface
 */
CSSOM.MediaList = function MediaList(){
	this.length = 0;
};

CSSOM.MediaList.prototype = {

	constructor: CSSOM.MediaList,

	/**
	 * @return {string}
	 */
	get mediaText() {
		return Array.prototype.join.call(this, ", ");
	},

	/**
	 * @param {string} value
	 */
	set mediaText(value) {
		var values = value.split(",");
		var length = this.length = values.length;
		for (var i=0; i<length; i++) {
			this[i] = values[i].trim();
		}
	},

	/**
	 * @param {string} medium
	 */
	appendMedium: function(medium) {
		if (Array.prototype.indexOf.call(this, medium) === -1) {
			this[this.length] = medium;
			this.length++;
		}
	},

	/**
	 * @param {string} medium
	 */
	deleteMedium: function(medium) {
		var index = Array.prototype.indexOf.call(this, medium);
		if (index !== -1) {
			Array.prototype.splice.call(this, index, 1);
		}
	}

};


//.CommonJS
exports.MediaList = CSSOM.MediaList;
///CommonJS

},{}],66:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @constructor
 * @see http://dev.w3.org/csswg/cssom/#the-stylesheet-interface
 */
CSSOM.StyleSheet = function StyleSheet() {
	this.parentStyleSheet = null;
};


//.CommonJS
exports.StyleSheet = CSSOM.StyleSheet;
///CommonJS

},{}],67:[function(require,module,exports){
//.CommonJS
var CSSOM = {
	CSSStyleSheet: require("./CSSStyleSheet").CSSStyleSheet,
	CSSStyleRule: require("./CSSStyleRule").CSSStyleRule,
	CSSMediaRule: require("./CSSMediaRule").CSSMediaRule,
	CSSStyleDeclaration: require("./CSSStyleDeclaration").CSSStyleDeclaration,
	CSSKeyframeRule: require('./CSSKeyframeRule').CSSKeyframeRule,
	CSSKeyframesRule: require('./CSSKeyframesRule').CSSKeyframesRule
};
///CommonJS


/**
 * Produces a deep copy of stylesheet — the instance variables of stylesheet are copied recursively.
 * @param {CSSStyleSheet|CSSOM.CSSStyleSheet} stylesheet
 * @nosideeffects
 * @return {CSSOM.CSSStyleSheet}
 */
CSSOM.clone = function clone(stylesheet) {

	var cloned = new CSSOM.CSSStyleSheet;

	var rules = stylesheet.cssRules;
	if (!rules) {
		return cloned;
	}

	var RULE_TYPES = {
		1: CSSOM.CSSStyleRule,
		4: CSSOM.CSSMediaRule,
		//3: CSSOM.CSSImportRule,
		//5: CSSOM.CSSFontFaceRule,
		//6: CSSOM.CSSPageRule,
		8: CSSOM.CSSKeyframesRule,
		9: CSSOM.CSSKeyframeRule
	};

	for (var i=0, rulesLength=rules.length; i < rulesLength; i++) {
		var rule = rules[i];
		var ruleClone = cloned.cssRules[i] = new RULE_TYPES[rule.type];

		var style = rule.style;
		if (style) {
			var styleClone = ruleClone.style = new CSSOM.CSSStyleDeclaration;
			for (var j=0, styleLength=style.length; j < styleLength; j++) {
				var name = styleClone[j] = style[j];
				styleClone[name] = style[name];
				styleClone._importants[name] = style.getPropertyPriority(name);
			}
			styleClone.length = style.length;
		}

		if (rule.hasOwnProperty('keyText')) {
			ruleClone.keyText = rule.keyText;
		}

		if (rule.hasOwnProperty('selectorText')) {
			ruleClone.selectorText = rule.selectorText;
		}

		if (rule.hasOwnProperty('mediaText')) {
			ruleClone.mediaText = rule.mediaText;
		}

		if (rule.hasOwnProperty('cssRules')) {
			ruleClone.cssRules = clone(rule).cssRules;
		}
	}

	return cloned;

};

//.CommonJS
exports.clone = CSSOM.clone;
///CommonJS

},{"./CSSKeyframeRule":55,"./CSSKeyframesRule":56,"./CSSMediaRule":57,"./CSSStyleDeclaration":59,"./CSSStyleRule":60,"./CSSStyleSheet":61}],"Xp1bwR":[function(require,module,exports){
'use strict';

exports.CSSStyleDeclaration = require('./CSSStyleDeclaration').CSSStyleDeclaration;
exports.CSSRule = require('./CSSRule').CSSRule;
exports.CSSStyleRule = require('./CSSStyleRule').CSSStyleRule;
exports.MediaList = require('./MediaList').MediaList;
exports.CSSMediaRule = require('./CSSMediaRule').CSSMediaRule;
exports.CSSImportRule = require('./CSSImportRule').CSSImportRule;
exports.CSSFontFaceRule = require('./CSSFontFaceRule').CSSFontFaceRule;
exports.StyleSheet = require('./StyleSheet').StyleSheet;
exports.CSSStyleSheet = require('./CSSStyleSheet').CSSStyleSheet;
exports.CSSKeyframesRule = require('./CSSKeyframesRule').CSSKeyframesRule;
exports.CSSKeyframeRule = require('./CSSKeyframeRule').CSSKeyframeRule;
exports.MatcherList = require('./MatcherList').MatcherList;
exports.CSSDocumentRule = require('./CSSDocumentRule').CSSDocumentRule;
exports.CSSValue = require('./CSSValue').CSSValue;
exports.CSSValueExpression = require('./CSSValueExpression').CSSValueExpression;
exports.parse = require('./parse').parse;
exports.clone = require('./clone').clone;

},{"./CSSDocumentRule":52,"./CSSFontFaceRule":53,"./CSSImportRule":54,"./CSSKeyframeRule":55,"./CSSKeyframesRule":56,"./CSSMediaRule":57,"./CSSRule":58,"./CSSStyleDeclaration":59,"./CSSStyleRule":60,"./CSSStyleSheet":61,"./CSSValue":62,"./CSSValueExpression":63,"./MatcherList":64,"./MediaList":65,"./StyleSheet":66,"./clone":67,"./parse":70}],"cssom":[function(require,module,exports){
module.exports=require('Xp1bwR');
},{}],70:[function(require,module,exports){
//.CommonJS
var CSSOM = {};
///CommonJS


/**
 * @param {string} token
 */
CSSOM.parse = function parse(token) {

	var i = 0;

	/**
		"before-selector" or
		"selector" or
		"atRule" or
		"atBlock" or
		"before-name" or
		"name" or
		"before-value" or
		"value"
	*/
	var state = "before-selector";

	var index;
	var buffer = "";

	var SIGNIFICANT_WHITESPACE = {
		"selector": true,
		"value": true,
		"atRule": true,
		"importRule-begin": true,
		"importRule": true,
		"atBlock": true,
		'documentRule-begin': true
	};

	var styleSheet = new CSSOM.CSSStyleSheet;

	// @type CSSStyleSheet|CSSMediaRule|CSSFontFaceRule|CSSKeyframesRule|CSSDocumentRule
	var currentScope = styleSheet;

	// @type CSSMediaRule|CSSKeyframesRule|CSSDocumentRule
	var parentRule;

	var selector, name, value, priority="", styleRule, mediaRule, importRule, fontFaceRule, keyframesRule, keyframeRule, documentRule;

	var atKeyframesRegExp = /@(-(?:\w+-)+)?keyframes/g;

	var parseError = function(message) {
		var lines = token.substring(0, i).split('\n');
		var lineCount = lines.length;
		var charCount = lines.pop().length + 1;
		var error = new Error(message + ' (line ' + lineCount + ', char ' + charCount + ')');
		error.line = lineCount;
		error.char = charCount;
		error.styleSheet = styleSheet;
		throw error;
	};

	for (var character; character = token.charAt(i); i++) {

		switch (character) {

		case " ":
		case "\t":
		case "\r":
		case "\n":
		case "\f":
			if (SIGNIFICANT_WHITESPACE[state]) {
				buffer += character;
			}
			break;

		// String
		case '"':
			index = i + 1;
			do {
				index = token.indexOf('"', index) + 1;
				if (!index) {
					parseError('Unmatched "');
				}
			} while (token[index - 2] === '\\')
			buffer += token.slice(i, index);
			i = index - 1;
			switch (state) {
				case 'before-value':
					state = 'value';
					break;
				case 'importRule-begin':
					state = 'importRule';
					break;
			}
			break;

		case "'":
			index = i + 1;
			do {
				index = token.indexOf("'", index) + 1;
				if (!index) {
					parseError("Unmatched '");
				}
			} while (token[index - 2] === '\\')
			buffer += token.slice(i, index);
			i = index - 1;
			switch (state) {
				case 'before-value':
					state = 'value';
					break;
				case 'importRule-begin':
					state = 'importRule';
					break;
			}
			break;

		// Comment
		case "/":
			if (token.charAt(i + 1) === "*") {
				i += 2;
				index = token.indexOf("*/", i);
				if (index === -1) {
					parseError("Missing */");
				} else {
					i = index + 1;
				}
			} else {
				buffer += character;
			}
			if (state === "importRule-begin") {
				buffer += " ";
				state = "importRule";
			}
			break;

		// At-rule
		case "@":
			if (token.indexOf("@-moz-document", i) === i) {
				state = "documentRule-begin";
				documentRule = new CSSOM.CSSDocumentRule;
				documentRule.__starts = i;
				i += "-moz-document".length;
				buffer = "";
				break;
			} else if (token.indexOf("@media", i) === i) {
				state = "atBlock";
				mediaRule = new CSSOM.CSSMediaRule;
				mediaRule.__starts = i;
				i += "media".length;
				buffer = "";
				break;
			} else if (token.indexOf("@import", i) === i) {
				state = "importRule-begin";
				i += "import".length;
				buffer += "@import";
				break;
			} else if (token.indexOf("@font-face", i) === i) {
				state = "fontFaceRule-begin";
				i += "font-face".length;
				fontFaceRule = new CSSOM.CSSFontFaceRule;
				fontFaceRule.__starts = i;
				buffer = "";
				break;
			} else {
				atKeyframesRegExp.lastIndex = i;
				var matchKeyframes = atKeyframesRegExp.exec(token);
				if (matchKeyframes && matchKeyframes.index === i) {
					state = "keyframesRule-begin";
					keyframesRule = new CSSOM.CSSKeyframesRule;
					keyframesRule.__starts = i;
					keyframesRule._vendorPrefix = matchKeyframes[1]; // Will come out as undefined if no prefix was found
					i += matchKeyframes[0].length - 1;
					buffer = "";
					break;
				} else if (state == "selector") {
					state = "atRule";
				}
			}
			buffer += character;
			break;

		case "{":
			if (state === "selector" || state === "atRule") {
				styleRule.selectorText = buffer.trim();
				styleRule.style.__starts = i;
				buffer = "";
				state = "before-name";
			} else if (state === "atBlock") {
				mediaRule.media.mediaText = buffer.trim();
				currentScope = parentRule = mediaRule;
				mediaRule.parentStyleSheet = styleSheet;
				buffer = "";
				state = "before-selector";
			} else if (state === "fontFaceRule-begin") {
				if (parentRule) {
					fontFaceRule.parentRule = parentRule;
				}
				fontFaceRule.parentStyleSheet = styleSheet;
				styleRule = fontFaceRule;
				buffer = "";
				state = "before-name";
			} else if (state === "keyframesRule-begin") {
				keyframesRule.name = buffer.trim();
				if (parentRule) {
					keyframesRule.parentRule = parentRule;
				}
				keyframesRule.parentStyleSheet = styleSheet;
				currentScope = parentRule = keyframesRule;
				buffer = "";
				state = "keyframeRule-begin";
			} else if (state === "keyframeRule-begin") {
				styleRule = new CSSOM.CSSKeyframeRule;
				styleRule.keyText = buffer.trim();
				styleRule.__starts = i;
				buffer = "";
				state = "before-name";
			} else if (state === "documentRule-begin") {
				// FIXME: what if this '{' is in the url text of the match function?
				documentRule.matcher.matcherText = buffer.trim();
				if (parentRule) {
					documentRule.parentRule = parentRule;
				}
				currentScope = parentRule = documentRule;
				documentRule.parentStyleSheet = styleSheet;
				buffer = "";
				state = "before-selector";
			}
			break;

		case ":":
			if (state === "name") {
				name = buffer.trim();
				buffer = "";
				state = "before-value";
			} else {
				buffer += character;
			}
			break;

		case '(':
			if (state === 'value') {
				// ie css expression mode
				if (buffer.trim() == 'expression') {
					var info = (new CSSOM.CSSValueExpression(token, i)).parse();

					if (info.error) {
						parseError(info.error);
					} else {
						buffer += info.expression;
						i = info.idx;
					}
				} else {
					index = token.indexOf(')', i + 1);
					if (index === -1) {
						parseError('Unmatched "("');
					}
					buffer += token.slice(i, index + 1);
					i = index;
				}
			} else {
				buffer += character;
			}

			break;

		case "!":
			if (state === "value" && token.indexOf("!important", i) === i) {
				priority = "important";
				i += "important".length;
			} else {
				buffer += character;
			}
			break;

		case ";":
			switch (state) {
				case "value":
					styleRule.style.setProperty(name, buffer.trim(), priority);
					priority = "";
					buffer = "";
					state = "before-name";
					break;
				case "atRule":
					buffer = "";
					state = "before-selector";
					break;
				case "importRule":
					importRule = new CSSOM.CSSImportRule;
					importRule.parentStyleSheet = importRule.styleSheet.parentStyleSheet = styleSheet;
					importRule.cssText = buffer + character;
					styleSheet.cssRules.push(importRule);
					buffer = "";
					state = "before-selector";
					break;
				default:
					buffer += character;
					break;
			}
			break;

		case "}":
			switch (state) {
				case "value":
					styleRule.style.setProperty(name, buffer.trim(), priority);
					priority = "";
				case "before-name":
				case "name":
					styleRule.__ends = i + 1;
					if (parentRule) {
						styleRule.parentRule = parentRule;
					}
					styleRule.parentStyleSheet = styleSheet;
					currentScope.cssRules.push(styleRule);
					buffer = "";
					if (currentScope.constructor === CSSOM.CSSKeyframesRule) {
						state = "keyframeRule-begin";
					} else {
						state = "before-selector";
					}
					break;
				case "keyframeRule-begin":
				case "before-selector":
				case "selector":
					// End of media/document rule.
					if (!parentRule) {
						parseError("Unexpected }");
					}
					currentScope.__ends = i + 1;
					// Nesting rules aren't supported yet
					styleSheet.cssRules.push(currentScope);
					currentScope = styleSheet;
					parentRule = null;
					buffer = "";
					state = "before-selector";
					break;
			}
			break;

		default:
			switch (state) {
				case "before-selector":
					state = "selector";
					styleRule = new CSSOM.CSSStyleRule;
					styleRule.__starts = i;
					break;
				case "before-name":
					state = "name";
					break;
				case "before-value":
					state = "value";
					break;
				case "importRule-begin":
					state = "importRule";
					break;
			}
			buffer += character;
			break;
		}
	}

	return styleSheet;
};


//.CommonJS
exports.parse = CSSOM.parse;
// The following modules cannot be included sooner due to the mutual dependency with parse.js
CSSOM.CSSStyleSheet = require("./CSSStyleSheet").CSSStyleSheet;
CSSOM.CSSStyleRule = require("./CSSStyleRule").CSSStyleRule;
CSSOM.CSSImportRule = require("./CSSImportRule").CSSImportRule;
CSSOM.CSSMediaRule = require("./CSSMediaRule").CSSMediaRule;
CSSOM.CSSFontFaceRule = require("./CSSFontFaceRule").CSSFontFaceRule;
CSSOM.CSSStyleDeclaration = require('./CSSStyleDeclaration').CSSStyleDeclaration;
CSSOM.CSSKeyframeRule = require('./CSSKeyframeRule').CSSKeyframeRule;
CSSOM.CSSKeyframesRule = require('./CSSKeyframesRule').CSSKeyframesRule;
CSSOM.CSSValueExpression = require('./CSSValueExpression').CSSValueExpression;
CSSOM.CSSDocumentRule = require('./CSSDocumentRule').CSSDocumentRule;
///CommonJS

},{"./CSSDocumentRule":52,"./CSSFontFaceRule":53,"./CSSImportRule":54,"./CSSKeyframeRule":55,"./CSSKeyframesRule":56,"./CSSMediaRule":57,"./CSSStyleDeclaration":59,"./CSSStyleRule":60,"./CSSStyleSheet":61,"./CSSValueExpression":63}],"javascript-sandbox":[function(require,module,exports){
module.exports=require('L4QuJI');
},{}],"L4QuJI":[function(require,module,exports){
var blacklist = [
  'console.log',
  'alert',
  'confirm',
  'prompt'
];

function blacklistify(blacklist) {
  return '' + blacklist + ' = function() {} ';
}

function Sandbox(options) {
  options = options || {}
  var parentElement = options.parentElement || document.body;

  // Code will be run in an iframe
  this.iframe = document.createElement('iframe');
  this.iframe.style.display = 'none';
  parentElement.appendChild(this.iframe);

  // quiet stubs out all loud functions (log, alert, etc)
  options.quiet = options.quiet || false

  // blacklisted functions will be overridden
  options.blacklist = options.blacklist || (options.quiet ? blacklist : []);
  for(var i in options.blacklist) {
    this.iframe.contentWindow.eval(blacklistify(options.blacklist[i]));
  }

  // Load the HTML in
  if(options.html) {
    var iframeDocument = this.iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write(options.html);
    iframeDocument.close();
  }

  // Copy over all variables to the iFrame
  // This MUST happen after the document is written because IE11 seems to reinitialize the
  // contentWindow after a document.close();
  var win = this.iframe.contentWindow;
  var variables = options.variables || {};
  var nestedKeys;
  Object.keys(variables).forEach(function (key) {
    nestedKeys = key.split('.');
    nameSpaceFor(win, nestedKeys)[nestedKeys[nestedKeys.length-1]] = variables[key];
  });

  // Evaluate the javascript.
  if(options.javascript) {
    this.iframe.contentWindow.eval(options.javascript);
  }
}


// Used for getting variables under a namespace for redefining
// ie, console.log
function nameSpaceFor(namespace, keys) {
  if(keys.length == 1) {
    return namespace;
  } else {
    return nameSpaceFor(namespace[keys[0]], keys.slice(1,keys.length));
  }
}

// When we evaluate, we'll need to take into account:
//   Setup the HTML?
//   Run the JavaScript
//
Sandbox.prototype.evaluate = function (code) {
  return this.iframe.contentWindow.eval(code);
};

Sandbox.prototype.exec = function(/*...*/) {
  var context = this.iframe.contentWindow,
      args = [].slice.call(arguments),
      functionToExec = args.shift();

  // Pass in the context as the first argument.
  args.unshift(context);

  return functionToExec.apply(context, args);
};

Sandbox.prototype.get = function(property) {
  var context = this.iframe.contentWindow;
  return context[property];
};

Sandbox.prototype.set = function(property, value) {
  var context = this.iframe.contentWindow;
  context[property] = value;
};

Sandbox.prototype.destroy = function () {
  if (this.iframe) {
    this.iframe.parentNode.removeChild(this.iframe);
    this.iframe = null;
  }
};

module.exports = Sandbox;

},{}],"UErKnN":[function(require,module,exports){
// Uses Node, AMD or browser globals to create a module.

// If you want something that will work in other stricter CommonJS environments,
// or if you need to create a circular dependency, see commonJsStrict.js

// Defines a module "returnExports" that depends another module called "b".
// Note that the name of the module is implied by the file name. It is best
// if the file name and the exported global have matching names.

// If the 'b' module also uses this type of boilerplate, then
// in the browser, it will create a global .b that is used below.

// If you do not want to support the browser global path, then you
// can remove the `root` use and the passing `this` as the first arg to
// the top function.

(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals
        root.returnExports = factory();
    }
}(this, function () {/*!
 * jQuery JavaScript Library v1.8.1
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: Thu Aug 30 2012 17:17:22 GMT-0400 (Eastern Daylight Time)
 */
return (function( window, undefined ) {
var
	// A central reference to the root jQuery(document)
	rootjQuery,

	// The deferred used on DOM ready
	readyList,

	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,
	location = window.location,
	navigator = window.navigator,

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$,

	// Save a reference to some core methods
	core_push = Array.prototype.push,
	core_slice = Array.prototype.slice,
	core_indexOf = Array.prototype.indexOf,
	core_toString = Object.prototype.toString,
	core_hasOwn = Object.prototype.hasOwnProperty,
	core_trim = String.prototype.trim,

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		return new jQuery.fn.init( selector, context, rootjQuery );
	},

	// Used for matching numbers
	core_pnum = /[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source,

	// Used for detecting and trimming whitespace
	core_rnotwhite = /\S/,
	core_rspace = /\s+/,

	// Make sure we trim BOM and NBSP (here's looking at you, Safari 5.0 and IE)
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	rquickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,

	// Match a standalone tag
	rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,

	// JSON RegExp
	rvalidchars = /^[\],:{}\s]*$/,
	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
	rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
	rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return ( letter + "" ).toUpperCase();
	},

	// The ready event handler and self cleanup method
	DOMContentLoaded = function() {
		if ( document.addEventListener ) {
			document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
			jQuery.ready();
		} else if ( document.readyState === "complete" ) {
			// we're here because readyState === "complete" in oldIE
			// which is good enough for us to call the dom ready!
			document.detachEvent( "onreadystatechange", DOMContentLoaded );
			jQuery.ready();
		}
	},

	// [[Class]] -> type pairs
	class2type = {};

jQuery.fn = jQuery.prototype = {
	constructor: jQuery,
	init: function( selector, context, rootjQuery ) {
		var match, elem, ret, doc;

		// Handle $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle $(DOMElement)
		if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;
					doc = ( context && context.nodeType ? context.ownerDocument || context : document );

					// scripts is true for back-compat
					selector = jQuery.parseHTML( match[1], doc, true );
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						this.attr.call( selector, context, true );
					}

					return jQuery.merge( this, selector );

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE and Opera return items
						// by name instead of ID
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// Otherwise, we inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return rootjQuery.ready( selector );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	},

	// Start with an empty selector
	selector: "",

	// The current version of jQuery being used
	jquery: "1.8.1",

	// The default length of a jQuery object is 0
	length: 0,

	// The number of elements contained in the matched element set
	size: function() {
		return this.length;
	},

	toArray: function() {
		return core_slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num == null ?

			// Return a 'clean' array
			this.toArray() :

			// Return just the object
			( num < 0 ? this[ this.length + num ] : this[ num ] );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems, name, selector ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		ret.context = this.context;

		if ( name === "find" ) {
			ret.selector = this.selector + ( this.selector ? " " : "" ) + selector;
		} else if ( name ) {
			ret.selector = this.selector + "." + name + "(" + selector + ")";
		}

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	ready: function( fn ) {
		// Add the callback
		jQuery.ready.promise().done( fn );

		return this;
	},

	eq: function( i ) {
		i = +i;
		return i === -1 ?
			this.slice( i ) :
			this.slice( i, i + 1 );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	slice: function() {
		return this.pushStack( core_slice.apply( this, arguments ),
			"slice", core_slice.call(arguments).join(",") );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: core_push,
	sort: [].sort,
	splice: [].splice
};

// Give the init function the jQuery prototype for later instantiation
jQuery.fn.init.prototype = jQuery.fn;

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	noConflict: function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	},

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
		if ( !document.body ) {
			return setTimeout( jQuery.ready, 1 );
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.trigger ) {
			jQuery( document ).trigger("ready").off("ready");
		}
	},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	},

	type: function( obj ) {
		return obj == null ?
			String( obj ) :
			class2type[ core_toString.call(obj) ] || "object";
	},

	isPlainObject: function( obj ) {
		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!core_hasOwn.call(obj, "constructor") &&
				!core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.

		var key;
		for ( key in obj ) {}

		return key === undefined || core_hasOwn.call( obj, key );
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	error: function( msg ) {
		throw new Error( msg );
	},

	// data: string of html
	// context (optional): If specified, the fragment will be created in this context, defaults to document
	// scripts (optional): If true, will include scripts passed in the html string
	parseHTML: function( data, context, scripts ) {
		var parsed;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		if ( typeof context === "boolean" ) {
			scripts = context;
			context = 0;
		}
		context = context || document;

		// Single tag
		if ( (parsed = rsingleTag.exec( data )) ) {
			return [ context.createElement( parsed[1] ) ];
		}

		parsed = jQuery.buildFragment( [ data ], context, scripts ? null : [] );
		return jQuery.merge( [],
			(parsed.cacheable ? jQuery.clone( parsed.fragment ) : parsed.fragment).childNodes );
	},

	parseJSON: function( data ) {
		if ( !data || typeof data !== "string") {
			return null;
		}

		// Make sure leading/trailing whitespace is removed (IE can't handle it)
		data = jQuery.trim( data );

		// Attempt to parse using the native JSON parser first
		if ( window.JSON && window.JSON.parse ) {
			return window.JSON.parse( data );
		}

		// Make sure the incoming data is actual JSON
		// Logic borrowed from http://json.org/json2.js
		if ( rvalidchars.test( data.replace( rvalidescape, "@" )
			.replace( rvalidtokens, "]" )
			.replace( rvalidbraces, "")) ) {

			return ( new Function( "return " + data ) )();

		}
		jQuery.error( "Invalid JSON: " + data );
	},

	// Cross-browser xml parsing
	parseXML: function( data ) {
		var xml, tmp;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		try {
			if ( window.DOMParser ) { // Standard
				tmp = new DOMParser();
				xml = tmp.parseFromString( data , "text/xml" );
			} else { // IE
				xml = new ActiveXObject( "Microsoft.XMLDOM" );
				xml.async = "false";
				xml.loadXML( data );
			}
		} catch( e ) {
			xml = undefined;
		}
		if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	},

	noop: function() {},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && core_rnotwhite.test( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toUpperCase() === name.toUpperCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var name,
			i = 0,
			length = obj.length,
			isObj = length === undefined || jQuery.isFunction( obj );

		if ( args ) {
			if ( isObj ) {
				for ( name in obj ) {
					if ( callback.apply( obj[ name ], args ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.apply( obj[ i++ ], args ) === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isObj ) {
				for ( name in obj ) {
					if ( callback.call( obj[ name ], name, obj[ name ] ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.call( obj[ i ], i, obj[ i++ ] ) === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Use native String.trim function wherever possible
	trim: core_trim && !core_trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				core_trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				text.toString().replace( rtrim, "" );
		},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var type,
			ret = results || [];

		if ( arr != null ) {
			// The window, strings (and functions) also have 'length'
			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
			type = jQuery.type( arr );

			if ( arr.length == null || type === "string" || type === "function" || type === "regexp" || jQuery.isWindow( arr ) ) {
				core_push.call( ret, arr );
			} else {
				jQuery.merge( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		var len;

		if ( arr ) {
			if ( core_indexOf ) {
				return core_indexOf.call( arr, elem, i );
			}

			len = arr.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in arr && arr[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var l = second.length,
			i = first.length,
			j = 0;

		if ( typeof l === "number" ) {
			for ( ; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}

		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, inv ) {
		var retVal,
			ret = [],
			i = 0,
			length = elems.length;
		inv = !!inv;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			retVal = !!callback( elems[ i ], i );
			if ( inv !== retVal ) {
				ret.push( elems[ i ] );
			}
		}

		return ret;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value, key,
			ret = [],
			i = 0,
			length = elems.length,
			// jquery objects are treated as arrays
			isArray = elems instanceof jQuery || length !== undefined && typeof length === "number" && ( ( length > 0 && elems[ 0 ] && elems[ length -1 ] ) || length === 0 || jQuery.isArray( elems ) ) ;

		// Go through the array, translating each of the items to their
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}

		// Go through every key on the object,
		} else {
			for ( key in elems ) {
				value = callback( elems[ key ], key, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}
		}

		// Flatten any nested arrays
		return ret.concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = core_slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context, args.concat( core_slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || proxy.guid || jQuery.guid++;

		return proxy;
	},

	// Multifunctional method to get and set values of a collection
	// The value/s can optionally be executed if it's a function
	access: function( elems, fn, key, value, chainable, emptyGet, pass ) {
		var exec,
			bulk = key == null,
			i = 0,
			length = elems.length;

		// Sets many values
		if ( key && typeof key === "object" ) {
			for ( i in key ) {
				jQuery.access( elems, fn, i, key[i], 1, emptyGet, value );
			}
			chainable = 1;

		// Sets one value
		} else if ( value !== undefined ) {
			// Optionally, function values get executed if exec is true
			exec = pass === undefined && jQuery.isFunction( value );

			if ( bulk ) {
				// Bulk operations only iterate when executing function values
				if ( exec ) {
					exec = fn;
					fn = function( elem, key, value ) {
						return exec.call( jQuery( elem ), value );
					};

				// Otherwise they run against the entire set
				} else {
					fn.call( elems, value );
					fn = null;
				}
			}

			if ( fn ) {
				for (; i < length; i++ ) {
					fn( elems[i], key, exec ? value.call( elems[i], i, fn( elems[i], key ) ) : value, pass );
				}
			}

			chainable = 1;
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				length ? fn( elems[0], key ) : emptyGet;
	},

	now: function() {
		return ( new Date() ).getTime();
	}
});

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready, 1 );

		// Standards-based browsers support DOMContentLoaded
		} else if ( document.addEventListener ) {
			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", jQuery.ready, false );

		// If IE event model is used
		} else {
			// Ensure firing before onload, maybe late but safe also for iframes
			document.attachEvent( "onreadystatechange", DOMContentLoaded );

			// A fallback to window.onload, that will always work
			window.attachEvent( "onload", jQuery.ready );

			// If IE and not a frame
			// continually check to see if the document is ready
			var top = false;

			try {
				top = window.frameElement == null && document.documentElement;
			} catch(e) {}

			if ( top && top.doScroll ) {
				(function doScrollCheck() {
					if ( !jQuery.isReady ) {

						try {
							// Use the trick by Diego Perini
							// http://javascript.nwbox.com/IEContentLoaded/
							top.doScroll("left");
						} catch(e) {
							return setTimeout( doScrollCheck, 50 );
						}

						// and execute any waiting functions
						jQuery.ready();
					}
				})();
			}
		}
	}
	return readyList.promise( obj );
};

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

// All jQuery objects should point back to these
rootjQuery = jQuery(document);
// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.split( core_rspace ), function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" && ( !options.unique || !self.has( arg ) ) ) {
								list.push( arg );
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				return jQuery.inArray( fn, list ) > -1;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};
jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
								function() {
									var returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.done( newDefer.resolve )
											.fail( newDefer.reject )
											.progress( newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								} :
								newDefer[ action ]
							);
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return typeof obj === "object" ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ] = list.fire
			deferred[ tuple[0] ] = list.fire;
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});
jQuery.support = (function() {

	var support,
		all,
		a,
		select,
		opt,
		input,
		fragment,
		eventName,
		i,
		isSupported,
		clickFn,
		div = document.createElement("div");

	// Preliminary tests
	div.setAttribute( "className", "t" );
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";

	all = div.getElementsByTagName("*");
	a = div.getElementsByTagName("a")[ 0 ];
	a.style.cssText = "top:1px;float:left;opacity:.5";

	// Can't get basic test support
	if ( !all || !all.length || !a ) {
		return {};
	}

	// First batch of supports tests
	select = document.createElement("select");
	opt = select.appendChild( document.createElement("option") );
	input = div.getElementsByTagName("input")[ 0 ];

	support = {
		// IE strips leading whitespace when .innerHTML is used
		leadingWhitespace: ( div.firstChild.nodeType === 3 ),

		// Make sure that tbody elements aren't automatically inserted
		// IE will insert them into empty tables
		tbody: !div.getElementsByTagName("tbody").length,

		// Make sure that link elements get serialized correctly by innerHTML
		// This requires a wrapper element in IE
		htmlSerialize: !!div.getElementsByTagName("link").length,

		// Get the style information from getAttribute
		// (IE uses .cssText instead)
		style: /top/.test( a.getAttribute("style") ),

		// Make sure that URLs aren't manipulated
		// (IE normalizes it by default)
		hrefNormalized: ( a.getAttribute("href") === "/a" ),

		// Make sure that element opacity exists
		// (IE uses filter instead)
		// Use a regex to work around a WebKit issue. See #5145
		opacity: /^0.5/.test( a.style.opacity ),

		// Verify style float existence
		// (IE uses styleFloat instead of cssFloat)
		cssFloat: !!a.style.cssFloat,

		// Make sure that if no value is specified for a checkbox
		// that it defaults to "on".
		// (WebKit defaults to "" instead)
		checkOn: ( input.value === "on" ),

		// Make sure that a selected-by-default option has a working selected property.
		// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
		optSelected: opt.selected,

		// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
		getSetAttribute: div.className !== "t",

		// Tests for enctype support on a form(#6743)
		enctype: !!document.createElement("form").enctype,

		// Makes sure cloning an html5 element does not cause problems
		// Where outerHTML is undefined, this still works
		html5Clone: document.createElement("nav").cloneNode( true ).outerHTML !== "<:nav></:nav>",

		// jQuery.support.boxModel DEPRECATED in 1.8 since we don't support Quirks Mode
		boxModel: ( document.compatMode === "CSS1Compat" ),

		// Will be defined later
		submitBubbles: true,
		changeBubbles: true,
		focusinBubbles: false,
		deleteExpando: true,
		noCloneEvent: true,
		inlineBlockNeedsLayout: false,
		shrinkWrapBlocks: false,
		reliableMarginRight: true,
		boxSizingReliable: true,
		pixelPosition: false
	};

	// Make sure checked status is properly cloned
	input.checked = true;
	support.noCloneChecked = input.cloneNode( true ).checked;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Test to see if it's possible to delete an expando from an element
	// Fails in Internet Explorer
	try {
		delete div.test;
	} catch( e ) {
		support.deleteExpando = false;
	}

	if ( !div.addEventListener && div.attachEvent && div.fireEvent ) {
		div.attachEvent( "onclick", clickFn = function() {
			// Cloning a node shouldn't copy over any
			// bound event handlers (IE does this)
			support.noCloneEvent = false;
		});
		div.cloneNode( true ).fireEvent("onclick");
		div.detachEvent( "onclick", clickFn );
	}

	// Check if a radio maintains its value
	// after being appended to the DOM
	input = document.createElement("input");
	input.value = "t";
	input.setAttribute( "type", "radio" );
	support.radioValue = input.value === "t";

	input.setAttribute( "checked", "checked" );

	// #11217 - WebKit loses check when the name is after the checked attribute
	input.setAttribute( "name", "t" );

	div.appendChild( input );
	fragment = document.createDocumentFragment();
	fragment.appendChild( div.lastChild );

	// WebKit doesn't clone checked state correctly in fragments
	support.checkClone = fragment.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Check if a disconnected checkbox will retain its checked
	// value of true after appended to the DOM (IE6/7)
	support.appendChecked = input.checked;

	fragment.removeChild( input );
	fragment.appendChild( div );

	// Technique from Juriy Zaytsev
	// http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
	// We only care about the case where non-standard event systems
	// are used, namely in IE. Short-circuiting here helps us to
	// avoid an eval call (in setAttribute) which can cause CSP
	// to go haywire. See: https://developer.mozilla.org/en/Security/CSP
	if ( div.attachEvent ) {
		for ( i in {
			submit: true,
			change: true,
			focusin: true
		}) {
			eventName = "on" + i;
			isSupported = ( eventName in div );
			if ( !isSupported ) {
				div.setAttribute( eventName, "return;" );
				isSupported = ( typeof div[ eventName ] === "function" );
			}
			support[ i + "Bubbles" ] = isSupported;
		}
	}

	// Run tests that need a body at doc ready
	jQuery(function() {
		var container, div, tds, marginDiv,
			divReset = "padding:0;margin:0;border:0;display:block;overflow:hidden;",
			body = document.getElementsByTagName("body")[0];

		if ( !body ) {
			// Return for frameset docs that don't have a body
			return;
		}

		container = document.createElement("div");
		container.style.cssText = "visibility:hidden;border:0;width:0;height:0;position:static;top:0;margin-top:1px";
		body.insertBefore( container, body.firstChild );

		// Construct the test element
		div = document.createElement("div");
		container.appendChild( div );

		// Check if table cells still have offsetWidth/Height when they are set
		// to display:none and there are still other visible table cells in a
		// table row; if so, offsetWidth/Height are not reliable for use when
		// determining if an element has been hidden directly using
		// display:none (it is still safe to use offsets if a parent element is
		// hidden; don safety goggles and see bug #4512 for more information).
		// (only IE 8 fails this test)
		div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>";
		tds = div.getElementsByTagName("td");
		tds[ 0 ].style.cssText = "padding:0;margin:0;border:0;display:none";
		isSupported = ( tds[ 0 ].offsetHeight === 0 );

		tds[ 0 ].style.display = "";
		tds[ 1 ].style.display = "none";

		// Check if empty table cells still have offsetWidth/Height
		// (IE <= 8 fail this test)
		support.reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );

		// Check box-sizing and margin behavior
		div.innerHTML = "";
		div.style.cssText = "box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;";
		support.boxSizing = ( div.offsetWidth === 4 );
		support.doesNotIncludeMarginInBodyOffset = ( body.offsetTop !== 1 );

		// NOTE: To any future maintainer, we've window.getComputedStyle
		// because jsdom on node.js will break without it.
		if ( window.getComputedStyle ) {
			support.pixelPosition = ( window.getComputedStyle( div, null ) || {} ).top !== "1%";
			support.boxSizingReliable = ( window.getComputedStyle( div, null ) || { width: "4px" } ).width === "4px";

			// Check if div with explicit width and no margin-right incorrectly
			// gets computed margin-right based on width of container. For more
			// info see bug #3333
			// Fails in WebKit before Feb 2011 nightlies
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			marginDiv = document.createElement("div");
			marginDiv.style.cssText = div.style.cssText = divReset;
			marginDiv.style.marginRight = marginDiv.style.width = "0";
			div.style.width = "1px";
			div.appendChild( marginDiv );
			support.reliableMarginRight =
				!parseFloat( ( window.getComputedStyle( marginDiv, null ) || {} ).marginRight );
		}

		if ( typeof div.style.zoom !== "undefined" ) {
			// Check if natively block-level elements act like inline-block
			// elements when setting their display to 'inline' and giving
			// them layout
			// (IE < 8 does this)
			div.innerHTML = "";
			div.style.cssText = divReset + "width:1px;padding:1px;display:inline;zoom:1";
			support.inlineBlockNeedsLayout = ( div.offsetWidth === 3 );

			// Check if elements with layout shrink-wrap their children
			// (IE 6 does this)
			div.style.display = "block";
			div.style.overflow = "visible";
			div.innerHTML = "<div></div>";
			div.firstChild.style.width = "5px";
			support.shrinkWrapBlocks = ( div.offsetWidth !== 3 );

			container.style.zoom = 1;
		}

		// Null elements to avoid leaks in IE
		body.removeChild( container );
		container = div = tds = marginDiv = null;
	});

	// Null elements to avoid leaks in IE
	fragment.removeChild( div );
	all = a = select = opt = input = fragment = div = null;

	return support;
})();
var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/,
	rmultiDash = /([A-Z])/g;

jQuery.extend({
	cache: {},

	deletedIds: [],

	// Please use with caution
	uuid: 0,

	// Unique for each copy of jQuery on the page
	// Non-digits removed to match rinlinejQuery
	expando: "jQuery" + ( jQuery.fn.jquery + Math.random() ).replace( /\D/g, "" ),

	// The following elements throw uncatchable exceptions if you
	// attempt to add expando properties to them.
	noData: {
		"embed": true,
		// Ban all objects except for Flash (which handle expandos)
		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",
		"applet": true
	},

	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},

	data: function( elem, name, data, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, ret,
			internalKey = jQuery.expando,
			getByName = typeof name === "string",

			// We have to handle DOM nodes and JS objects differently because IE6-7
			// can't GC object references properly across the DOM-JS boundary
			isNode = elem.nodeType,

			// Only DOM nodes need the global jQuery cache; JS object data is
			// attached directly to the object so GC can occur automatically
			cache = isNode ? jQuery.cache : elem,

			// Only defining an ID for JS objects if its cache already exists allows
			// the code to shortcut on the same path as a DOM node with no cache
			id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

		// Avoid doing any more work than we need to when trying to get data on an
		// object that has no data at all
		if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && getByName && data === undefined ) {
			return;
		}

		if ( !id ) {
			// Only DOM nodes need a new unique ID for each element since their data
			// ends up in the global cache
			if ( isNode ) {
				elem[ internalKey ] = id = jQuery.deletedIds.pop() || ++jQuery.uuid;
			} else {
				id = internalKey;
			}
		}

		if ( !cache[ id ] ) {
			cache[ id ] = {};

			// Avoids exposing jQuery metadata on plain JS objects when the object
			// is serialized using JSON.stringify
			if ( !isNode ) {
				cache[ id ].toJSON = jQuery.noop;
			}
		}

		// An object can be passed to jQuery.data instead of a key/value pair; this gets
		// shallow copied over onto the existing cache
		if ( typeof name === "object" || typeof name === "function" ) {
			if ( pvt ) {
				cache[ id ] = jQuery.extend( cache[ id ], name );
			} else {
				cache[ id ].data = jQuery.extend( cache[ id ].data, name );
			}
		}

		thisCache = cache[ id ];

		// jQuery data() is stored in a separate object inside the object's internal data
		// cache in order to avoid key collisions between internal data and user-defined
		// data.
		if ( !pvt ) {
			if ( !thisCache.data ) {
				thisCache.data = {};
			}

			thisCache = thisCache.data;
		}

		if ( data !== undefined ) {
			thisCache[ jQuery.camelCase( name ) ] = data;
		}

		// Check for both converted-to-camel and non-converted data property names
		// If a data property was specified
		if ( getByName ) {

			// First Try to find as-is property data
			ret = thisCache[ name ];

			// Test for null|undefined property data
			if ( ret == null ) {

				// Try to find the camelCased property
				ret = thisCache[ jQuery.camelCase( name ) ];
			}
		} else {
			ret = thisCache;
		}

		return ret;
	},

	removeData: function( elem, name, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, i, l,

			isNode = elem.nodeType,

			// See jQuery.data for more information
			cache = isNode ? jQuery.cache : elem,
			id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

		// If there is already no cache entry for this object, there is no
		// purpose in continuing
		if ( !cache[ id ] ) {
			return;
		}

		if ( name ) {

			thisCache = pvt ? cache[ id ] : cache[ id ].data;

			if ( thisCache ) {

				// Support array or space separated string names for data keys
				if ( !jQuery.isArray( name ) ) {

					// try the string as a key before any manipulation
					if ( name in thisCache ) {
						name = [ name ];
					} else {

						// split the camel cased version by spaces unless a key with the spaces exists
						name = jQuery.camelCase( name );
						if ( name in thisCache ) {
							name = [ name ];
						} else {
							name = name.split(" ");
						}
					}
				}

				for ( i = 0, l = name.length; i < l; i++ ) {
					delete thisCache[ name[i] ];
				}

				// If there is no data left in the cache, we want to continue
				// and let the cache object itself get destroyed
				if ( !( pvt ? isEmptyDataObject : jQuery.isEmptyObject )( thisCache ) ) {
					return;
				}
			}
		}

		// See jQuery.data for more information
		if ( !pvt ) {
			delete cache[ id ].data;

			// Don't destroy the parent cache unless the internal data object
			// had been the only thing left in it
			if ( !isEmptyDataObject( cache[ id ] ) ) {
				return;
			}
		}

		// Destroy the cache
		if ( isNode ) {
			jQuery.cleanData( [ elem ], true );

		// Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
		} else if ( jQuery.support.deleteExpando || cache != cache.window ) {
			delete cache[ id ];

		// When all else fails, null
		} else {
			cache[ id ] = null;
		}
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return jQuery.data( elem, name, data, true );
	},

	// A method for determining if a DOM node can handle the data expando
	acceptData: function( elem ) {
		var noData = elem.nodeName && jQuery.noData[ elem.nodeName.toLowerCase() ];

		// nodes accept data unless otherwise specified; rejection can be conditional
		return !noData || noData !== true && elem.getAttribute("classid") === noData;
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var parts, part, attr, name, l,
			elem = this[0],
			i = 0,
			data = null;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					attr = elem.attributes;
					for ( l = attr.length; i < l; i++ ) {
						name = attr[i].name;

						if ( name.indexOf( "data-" ) === 0 ) {
							name = jQuery.camelCase( name.substring(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}

		parts = key.split( ".", 2 );
		parts[1] = parts[1] ? "." + parts[1] : "";
		part = parts[1] + "!";

		return jQuery.access( this, function( value ) {

			if ( value === undefined ) {
				data = this.triggerHandler( "getData" + part, [ parts[0] ] );

				// Try to fetch any internally stored data first
				if ( data === undefined && elem ) {
					data = jQuery.data( elem, key );
					data = dataAttr( elem, key, data );
				}

				return data === undefined && parts[1] ?
					this.data( parts[0] ) :
					data;
			}

			parts[1] = value;
			this.each(function() {
				var self = jQuery( this );

				self.triggerHandler( "setData" + part, parts );
				jQuery.data( this, key, value );
				self.triggerHandler( "changeData" + part, parts );
			});
		}, null, value, arguments.length > 1, null, false );
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
				data === "false" ? false :
				data === "null" ? null :
				// Only convert to a number if it doesn't change the string
				+data + "" === data ? +data :
				rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	var name;
	for ( name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}
jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = jQuery._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray(data) ) {
					queue = jQuery._data( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return jQuery._data( elem, key ) || jQuery._data( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				jQuery.removeData( elem, type + "queue", true );
				jQuery.removeData( elem, key, true );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	// Based off of the plugin by Clint Helfers, with permission.
	// http://blindsignals.com/index.php/2009/07/jquery-delay/
	delay: function( time, type ) {
		time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = setTimeout( next, time );
			hooks.stop = function() {
				clearTimeout( timeout );
			};
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while( i-- ) {
			tmp = jQuery._data( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var nodeHook, boolHook, fixSpecified,
	rclass = /[\t\r\n]/g,
	rreturn = /\r/g,
	rtype = /^(?:button|input)$/i,
	rfocusable = /^(?:button|input|object|select|textarea)$/i,
	rclickable = /^a(?:rea|)$/i,
	rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,
	getSetAttribute = jQuery.support.getSetAttribute;

jQuery.fn.extend({
	attr: function( name, value ) {
		return jQuery.access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	},

	prop: function( name, value ) {
		return jQuery.access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		name = jQuery.propFix[ name ] || name;
		return this.each(function() {
			// try/catch handles cases where IE balks (such as removing a property on window)
			try {
				this[ name ] = undefined;
				delete this[ name ];
			} catch( e ) {}
		});
	},

	addClass: function( value ) {
		var classNames, i, l, elem,
			setClass, c, cl;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call(this, j, this.className) );
			});
		}

		if ( value && typeof value === "string" ) {
			classNames = value.split( core_rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];

				if ( elem.nodeType === 1 ) {
					if ( !elem.className && classNames.length === 1 ) {
						elem.className = value;

					} else {
						setClass = " " + elem.className + " ";

						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
							if ( !~setClass.indexOf( " " + classNames[ c ] + " " ) ) {
								setClass += classNames[ c ] + " ";
							}
						}
						elem.className = jQuery.trim( setClass );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var removes, className, elem, c, cl, i, l;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call(this, j, this.className) );
			});
		}
		if ( (value && typeof value === "string") || value === undefined ) {
			removes = ( value || "" ).split( core_rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];
				if ( elem.nodeType === 1 && elem.className ) {

					className = (" " + elem.className + " ").replace( rclass, " " );

					// loop over each item in the removal list
					for ( c = 0, cl = removes.length; c < cl; c++ ) {
						// Remove until there is nothing to remove,
						while ( className.indexOf(" " + removes[ c ] + " ") > -1 ) {
							className = className.replace( " " + removes[ c ] + " " , " " );
						}
					}
					elem.className = value ? jQuery.trim( className ) : "";
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isBool = typeof stateVal === "boolean";

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					state = stateVal,
					classNames = value.split( core_rspace );

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					state = isBool ? state : !self.hasClass( className );
					self[ state ? "addClass" : "removeClass" ]( className );
				}

			} else if ( type === "undefined" || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					jQuery._data( this, "__className__", this.className );
				}

				// toggle whole className
				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) > -1 ) {
				return true;
			}
		}

		return false;
	},

	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val,
				self = jQuery(this);

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, self.val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";
			} else if ( typeof val === "number" ) {
				val += "";
			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map(val, function ( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				// attributes.value is undefined in Blackberry 4.7 but
				// uses .value. See #6932
				var val = elem.attributes.value;
				return !val || val.specified ? elem.value : elem.text;
			}
		},
		select: {
			get: function( elem ) {
				var value, i, max, option,
					index = elem.selectedIndex,
					values = [],
					options = elem.options,
					one = elem.type === "select-one";

				// Nothing was selected
				if ( index < 0 ) {
					return null;
				}

				// Loop through all the selected options
				i = one ? index : 0;
				max = one ? index + 1 : options.length;
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Don't return options that are disabled or in a disabled optgroup
					if ( option.selected && (jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) &&
							(!option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" )) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				// Fixes Bug #2551 -- select.val() broken in IE after form.reset()
				if ( one && !values.length && options.length ) {
					return jQuery( options[ index ] ).val();
				}

				return values;
			},

			set: function( elem, value ) {
				var values = jQuery.makeArray( value );

				jQuery(elem).find("option").each(function() {
					this.selected = jQuery.inArray( jQuery(this).val(), values ) >= 0;
				});

				if ( !values.length ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	},

	// Unused in 1.8, left in so attrFn-stabbers won't die; remove in 1.9
	attrFn: {},

	attr: function( elem, name, value, pass ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( pass && jQuery.isFunction( jQuery.fn[ name ] ) ) {
			return jQuery( elem )[ name ]( value );
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( notxml ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] || ( rboolean.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;

			} else if ( hooks && "set" in hooks && notxml && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, "" + value );
				return value;
			}

		} else if ( hooks && "get" in hooks && notxml && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {

			ret = elem.getAttribute( name );

			// Non-existent attributes return null, we normalize to undefined
			return ret === null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var propName, attrNames, name, isBool,
			i = 0;

		if ( value && elem.nodeType === 1 ) {

			attrNames = value.split( core_rspace );

			for ( ; i < attrNames.length; i++ ) {
				name = attrNames[ i ];

				if ( name ) {
					propName = jQuery.propFix[ name ] || name;
					isBool = rboolean.test( name );

					// See #9699 for explanation of this approach (setting first, then removal)
					// Do not do this for boolean attributes (see #10870)
					if ( !isBool ) {
						jQuery.attr( elem, name, "" );
					}
					elem.removeAttribute( getSetAttribute ? name : propName );

					// Set corresponding property to false for boolean attributes
					if ( isBool && propName in elem ) {
						elem[ propName ] = false;
					}
				}
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				// We can't allow the type property to be changed (since it causes problems in IE)
				if ( rtype.test( elem.nodeName ) && elem.parentNode ) {
					jQuery.error( "type property can't be changed" );
				} else if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to it's default in case type is set after value
					// This is for element creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		},
		// Use the value property for back compat
		// Use the nodeHook for button elements in IE6/7 (#1954)
		value: {
			get: function( elem, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.get( elem, name );
				}
				return name in elem ?
					elem.value :
					null;
			},
			set: function( elem, value, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.set( elem, value, name );
				}
				// Does not return so that setAttribute is also used
				elem.value = value;
			}
		}
	},

	propFix: {
		tabindex: "tabIndex",
		readonly: "readOnly",
		"for": "htmlFor",
		"class": "className",
		maxlength: "maxLength",
		cellspacing: "cellSpacing",
		cellpadding: "cellPadding",
		rowspan: "rowSpan",
		colspan: "colSpan",
		usemap: "useMap",
		frameborder: "frameBorder",
		contenteditable: "contentEditable"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				return ( elem[ name ] = value );
			}

		} else {
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
				return ret;

			} else {
				return elem[ name ];
			}
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				var attributeNode = elem.getAttributeNode("tabindex");

				return attributeNode && attributeNode.specified ?
					parseInt( attributeNode.value, 10 ) :
					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
						0 :
						undefined;
			}
		}
	}
});

// Hook for boolean attributes
boolHook = {
	get: function( elem, name ) {
		// Align boolean attributes with corresponding properties
		// Fall back to attribute presence where some booleans are not supported
		var attrNode,
			property = jQuery.prop( elem, name );
		return property === true || typeof property !== "boolean" && ( attrNode = elem.getAttributeNode(name) ) && attrNode.nodeValue !== false ?
			name.toLowerCase() :
			undefined;
	},
	set: function( elem, value, name ) {
		var propName;
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			// value is true since we know at this point it's type boolean and not false
			// Set boolean attributes to the same name and set the DOM property
			propName = jQuery.propFix[ name ] || name;
			if ( propName in elem ) {
				// Only set the IDL specifically if it already exists on the element
				elem[ propName ] = true;
			}

			elem.setAttribute( name, name.toLowerCase() );
		}
		return name;
	}
};

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

	fixSpecified = {
		name: true,
		id: true,
		coords: true
	};

	// Use this for any attribute in IE6/7
	// This fixes almost every IE6/7 issue
	nodeHook = jQuery.valHooks.button = {
		get: function( elem, name ) {
			var ret;
			ret = elem.getAttributeNode( name );
			return ret && ( fixSpecified[ name ] ? ret.value !== "" : ret.specified ) ?
				ret.value :
				undefined;
		},
		set: function( elem, value, name ) {
			// Set the existing or create a new attribute node
			var ret = elem.getAttributeNode( name );
			if ( !ret ) {
				ret = document.createAttribute( name );
				elem.setAttributeNode( ret );
			}
			return ( ret.value = value + "" );
		}
	};

	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
	// This is for removals
	jQuery.each([ "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			set: function( elem, value ) {
				if ( value === "" ) {
					elem.setAttribute( name, "auto" );
					return value;
				}
			}
		});
	});

	// Set contenteditable to false on removals(#10429)
	// Setting to empty string throws an error as an invalid value
	jQuery.attrHooks.contenteditable = {
		get: nodeHook.get,
		set: function( elem, value, name ) {
			if ( value === "" ) {
				value = "false";
			}
			nodeHook.set( elem, value, name );
		}
	};
}


// Some attributes require a special call on IE
if ( !jQuery.support.hrefNormalized ) {
	jQuery.each([ "href", "src", "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			get: function( elem ) {
				var ret = elem.getAttribute( name, 2 );
				return ret === null ? undefined : ret;
			}
		});
	});
}

if ( !jQuery.support.style ) {
	jQuery.attrHooks.style = {
		get: function( elem ) {
			// Return undefined in the case of empty string
			// Normalize to lowercase since IE uppercases css property names
			return elem.style.cssText.toLowerCase() || undefined;
		},
		set: function( elem, value ) {
			return ( elem.style.cssText = "" + value );
		}
	};
}

// Safari mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !jQuery.support.optSelected ) {
	jQuery.propHooks.selected = jQuery.extend( jQuery.propHooks.selected, {
		get: function( elem ) {
			var parent = elem.parentNode;

			if ( parent ) {
				parent.selectedIndex;

				// Make sure that it also works with optgroups, see #5701
				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
			return null;
		}
	});
}

// IE6/7 call enctype encoding
if ( !jQuery.support.enctype ) {
	jQuery.propFix.enctype = "encoding";
}

// Radios and checkboxes getter/setter
if ( !jQuery.support.checkOn ) {
	jQuery.each([ "radio", "checkbox" ], function() {
		jQuery.valHooks[ this ] = {
			get: function( elem ) {
				// Handle the case where in Webkit "" is returned instead of "on" if a value isn't specified
				return elem.getAttribute("value") === null ? "on" : elem.value;
			}
		};
	});
}
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = jQuery.extend( jQuery.valHooks[ this ], {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	});
});
var rformElems = /^(?:textarea|input|select)$/i,
	rtypenamespace = /^([^\.]*|)(?:\.(.+)|)$/,
	rhoverHack = /(?:^|\s)hover(\.\S+|)\b/,
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	hoverHack = function( events ) {
		return jQuery.event.special.hover ? events : events.replace( rhoverHack, "mouseenter$1 mouseleave$1" );
	};

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	add: function( elem, types, handler, data, selector ) {

		var elemData, eventHandle, events,
			t, tns, type, namespaces, handleObj,
			handleObjIn, handlers, special;

		// Don't attach events to noData or text/comment nodes (allow plain objects tho)
		if ( elem.nodeType === 3 || elem.nodeType === 8 || !types || !handler || !(elemData = jQuery._data( elem )) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		events = elemData.events;
		if ( !events ) {
			elemData.events = events = {};
		}
		eventHandle = elemData.handle;
		if ( !eventHandle ) {
			elemData.handle = eventHandle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && (!e || jQuery.event.triggered !== e.type) ?
					jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
					undefined;
			};
			// Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
			eventHandle.elem = elem;
		}

		// Handle multiple events separated by a space
		// jQuery(...).bind("mouseover mouseout", fn);
		types = jQuery.trim( hoverHack(types) ).split( " " );
		for ( t = 0; t < types.length; t++ ) {

			tns = rtypenamespace.exec( types[t] ) || [];
			type = tns[1];
			namespaces = ( tns[2] || "" ).split( "." ).sort();

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: tns[1],
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			handlers = events[ type ];
			if ( !handlers ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener/attachEvent if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					// Bind the global event handler to the element
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );

					} else if ( elem.attachEvent ) {
						elem.attachEvent( "on" + type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

		// Nullify elem to prevent memory leaks in IE
		elem = null;
	},

	global: {},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var t, tns, type, origType, namespaces, origCount,
			j, events, special, eventType, handleObj,
			elemData = jQuery.hasData( elem ) && jQuery._data( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = jQuery.trim( hoverHack( types || "" ) ).split(" ");
		for ( t = 0; t < types.length; t++ ) {
			tns = rtypenamespace.exec( types[t] ) || [];
			type = origType = tns[1];
			namespaces = tns[2];

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector? special.delegateType : special.bindType ) || type;
			eventType = events[ type ] || [];
			origCount = eventType.length;
			namespaces = namespaces ? new RegExp("(^|\\.)" + namespaces.split(".").sort().join("\\.(?:.*\\.|)") + "(\\.|$)") : null;

			// Remove matching events
			for ( j = 0; j < eventType.length; j++ ) {
				handleObj = eventType[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					 ( !handler || handler.guid === handleObj.guid ) &&
					 ( !namespaces || namespaces.test( handleObj.namespace ) ) &&
					 ( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					eventType.splice( j--, 1 );

					if ( handleObj.selector ) {
						eventType.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( eventType.length === 0 && origCount !== eventType.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;

			// removeData also checks for emptiness and clears the expando if empty
			// so use it instead of delete
			jQuery.removeData( elem, "events", true );
		}
	},

	// Events that are safe to short-circuit if no handlers are attached.
	// Native DOM events should not be added, they may have inline handlers.
	customEvent: {
		"getData": true,
		"setData": true,
		"changeData": true
	},

	trigger: function( event, data, elem, onlyHandlers ) {
		// Don't do events on text and comment nodes
		if ( elem && (elem.nodeType === 3 || elem.nodeType === 8) ) {
			return;
		}

		// Event object or event type
		var cache, exclusive, i, cur, old, ontype, special, handle, eventPath, bubbleType,
			type = event.type || event,
			namespaces = [];

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "!" ) >= 0 ) {
			// Exclusive events trigger only for the exact event (no namespaces)
			type = type.slice(0, -1);
			exclusive = true;
		}

		if ( type.indexOf( "." ) >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}

		if ( (!elem || jQuery.event.customEvent[ type ]) && !jQuery.event.global[ type ] ) {
			// No jQuery handlers for this event type, and it can't have inline handlers
			return;
		}

		// Caller can pass in an Event, Object, or just an event type string
		event = typeof event === "object" ?
			// jQuery.Event object
			event[ jQuery.expando ] ? event :
			// Object literal
			new jQuery.Event( type, event ) :
			// Just the event type (string)
			new jQuery.Event( type );

		event.type = type;
		event.isTrigger = true;
		event.exclusive = exclusive;
		event.namespace = namespaces.join( "." );
		event.namespace_re = event.namespace? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
		ontype = type.indexOf( ":" ) < 0 ? "on" + type : "";

		// Handle a global trigger
		if ( !elem ) {

			// TODO: Stop taunting the data cache; remove global events and always attach to document
			cache = jQuery.cache;
			for ( i in cache ) {
				if ( cache[ i ].events && cache[ i ].events[ type ] ) {
					jQuery.event.trigger( event, data, cache[ i ].handle.elem, true );
				}
			}
			return;
		}

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data != null ? jQuery.makeArray( data ) : [];
		data.unshift( event );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		eventPath = [[ elem, special.bindType || type ]];
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			cur = rfocusMorph.test( bubbleType + type ) ? elem : elem.parentNode;
			for ( old = elem; cur; cur = cur.parentNode ) {
				eventPath.push([ cur, bubbleType ]);
				old = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( old === (elem.ownerDocument || document) ) {
				eventPath.push([ old.defaultView || old.parentWindow || window, bubbleType ]);
			}
		}

		// Fire handlers on the event path
		for ( i = 0; i < eventPath.length && !event.isPropagationStopped(); i++ ) {

			cur = eventPath[i][0];
			event.type = eventPath[i][1];

			handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}
			// Note that this is a bare JS function and not a jQuery handler
			handle = ontype && cur[ ontype ];
			if ( handle && jQuery.acceptData( cur ) && handle.apply( cur, data ) === false ) {
				event.preventDefault();
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( elem.ownerDocument, data ) === false) &&
				!(type === "click" && jQuery.nodeName( elem, "a" )) && jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Can't use an .isFunction() check here because IE6/7 fails that test.
				// Don't do default actions on window, that's where global variables be (#6170)
				// IE<9 dies on focus/blur to hidden element (#1486)
				if ( ontype && elem[ type ] && ((type !== "focus" && type !== "blur") || event.target.offsetWidth !== 0) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					old = elem[ ontype ];

					if ( old ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( old ) {
						elem[ ontype ] = old;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event || window.event );

		var i, j, cur, ret, selMatch, matched, matches, handleObj, sel, related,
			handlers = ( (jQuery._data( this, "events" ) || {} )[ event.type ] || []),
			delegateCount = handlers.delegateCount,
			args = [].slice.call( arguments ),
			run_all = !event.exclusive && !event.namespace,
			special = jQuery.event.special[ event.type ] || {},
			handlerQueue = [];

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers that should run if there are delegated events
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && !(event.button && event.type === "click") ) {

			for ( cur = event.target; cur != this; cur = cur.parentNode || this ) {

				// Don't process clicks (ONLY) on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					selMatch = {};
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];
						sel = handleObj.selector;

						if ( selMatch[ sel ] === undefined ) {
							selMatch[ sel ] = jQuery( sel, this ).index( cur ) >= 0;
						}
						if ( selMatch[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, matches: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( handlers.length > delegateCount ) {
			handlerQueue.push({ elem: this, matches: handlers.slice( delegateCount ) });
		}

		// Run delegates first; they may want to stop propagation beneath us
		for ( i = 0; i < handlerQueue.length && !event.isPropagationStopped(); i++ ) {
			matched = handlerQueue[ i ];
			event.currentTarget = matched.elem;

			for ( j = 0; j < matched.matches.length && !event.isImmediatePropagationStopped(); j++ ) {
				handleObj = matched.matches[ j ];

				// Triggered event must either 1) be non-exclusive and have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( run_all || (!event.namespace && !handleObj.namespace) || event.namespace_re && event.namespace_re.test( handleObj.namespace ) ) {

					event.data = handleObj.data;
					event.handleObj = handleObj;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						event.result = ret;
						if ( ret === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	// *** attrChange attrName relatedNode srcElement  are not normalized, non-W3C, deprecated, will be removed in 1.8 ***
	props: "attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button,
				fromElement = original.fromElement;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add relatedTarget, if necessary
			if ( !event.relatedTarget && fromElement ) {
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop,
			originalEvent = event,
			fixHook = jQuery.event.fixHooks[ event.type ] || {},
			copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = jQuery.Event( originalEvent );

		for ( i = copy.length; i; ) {
			prop = copy[ --i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Fix target property, if necessary (#1925, IE 6/7/8 & Safari2)
		if ( !event.target ) {
			event.target = originalEvent.srcElement || document;
		}

		// Target should not be a text node (#504, Safari)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		// For mouse/key events, metaKey==false if it's undefined (#3368, #11328; IE6/7/8)
		event.metaKey = !!event.metaKey;

		return fixHook.filter? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},

		focus: {
			delegateType: "focusin"
		},
		blur: {
			delegateType: "focusout"
		},

		beforeunload: {
			setup: function( data, namespaces, eventHandle ) {
				// We only want to do this special case on windows
				if ( jQuery.isWindow( this ) ) {
					this.onbeforeunload = eventHandle;
				}
			},

			teardown: function( namespaces, eventHandle ) {
				if ( this.onbeforeunload === eventHandle ) {
					this.onbeforeunload = null;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{ type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

// Some plugins are using, but it's undocumented/deprecated and will be removed.
// The 1.7 special event interface should provide all the hooks needed now.
jQuery.event.handle = jQuery.event.dispatch;

jQuery.removeEvent = document.removeEventListener ?
	function( elem, type, handle ) {
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle, false );
		}
	} :
	function( elem, type, handle ) {
		var name = "on" + type;

		if ( elem.detachEvent ) {

			// #8545, #7054, preventing memory leaks for custom events in IE6-8 –
			// detachEvent needed property on element, by name of that event, to properly expose it to GC
			if ( typeof elem[ name ] === "undefined" ) {
				elem[ name ] = null;
			}

			elem.detachEvent( name, handle );
		}
	};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = ( src.defaultPrevented || src.returnValue === false ||
			src.getPreventDefault && src.getPreventDefault() ) ? returnTrue : returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

function returnFalse() {
	return false;
}
function returnTrue() {
	return true;
}

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	preventDefault: function() {
		this.isDefaultPrevented = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}

		// if preventDefault exists run it on the original event
		if ( e.preventDefault ) {
			e.preventDefault();

		// otherwise set the returnValue property of the original event to false (IE)
		} else {
			e.returnValue = false;
		}
	},
	stopPropagation: function() {
		this.isPropagationStopped = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}
		// if stopPropagation exists run it on the original event
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}
		// otherwise set the cancelBubble property of the original event to true (IE)
		e.cancelBubble = true;
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	},
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj,
				selector = handleObj.selector;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// IE submit delegation
if ( !jQuery.support.submitBubbles ) {

	jQuery.event.special.submit = {
		setup: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Lazy-add a submit handler when a descendant form may potentially be submitted
			jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
				// Node name check avoids a VML-related crash in IE (#9807)
				var elem = e.target,
					form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
				if ( form && !jQuery._data( form, "_submit_attached" ) ) {
					jQuery.event.add( form, "submit._submit", function( event ) {
						event._submit_bubble = true;
					});
					jQuery._data( form, "_submit_attached", true );
				}
			});
			// return undefined since we don't need an event listener
		},

		postDispatch: function( event ) {
			// If form was submitted by the user, bubble the event up the tree
			if ( event._submit_bubble ) {
				delete event._submit_bubble;
				if ( this.parentNode && !event.isTrigger ) {
					jQuery.event.simulate( "submit", this.parentNode, event, true );
				}
			}
		},

		teardown: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Remove delegated handlers; cleanData eventually reaps submit handlers attached above
			jQuery.event.remove( this, "._submit" );
		}
	};
}

// IE change delegation and checkbox/radio fix
if ( !jQuery.support.changeBubbles ) {

	jQuery.event.special.change = {

		setup: function() {

			if ( rformElems.test( this.nodeName ) ) {
				// IE doesn't fire change on a check/radio until blur; trigger it on click
				// after a propertychange. Eat the blur-change in special.change.handle.
				// This still fires onchange a second time for check/radio after blur.
				if ( this.type === "checkbox" || this.type === "radio" ) {
					jQuery.event.add( this, "propertychange._change", function( event ) {
						if ( event.originalEvent.propertyName === "checked" ) {
							this._just_changed = true;
						}
					});
					jQuery.event.add( this, "click._change", function( event ) {
						if ( this._just_changed && !event.isTrigger ) {
							this._just_changed = false;
						}
						// Allow triggered, simulated change events (#11500)
						jQuery.event.simulate( "change", this, event, true );
					});
				}
				return false;
			}
			// Delegated event; lazy-add a change handler on descendant inputs
			jQuery.event.add( this, "beforeactivate._change", function( e ) {
				var elem = e.target;

				if ( rformElems.test( elem.nodeName ) && !jQuery._data( elem, "_change_attached" ) ) {
					jQuery.event.add( elem, "change._change", function( event ) {
						if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
							jQuery.event.simulate( "change", this.parentNode, event, true );
						}
					});
					jQuery._data( elem, "_change_attached", true );
				}
			});
		},

		handle: function( event ) {
			var elem = event.target;

			// Swallow native change events from checkbox/radio, we already triggered them above
			if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
				return event.handleObj.handler.apply( this, arguments );
			}
		},

		teardown: function() {
			jQuery.event.remove( this, "._change" );

			return !rformElems.test( this.nodeName );
		}
	};
}

// Create "bubbling" focus and blur events
if ( !jQuery.support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler while someone wants focusin/focusout
		var attaches = 0,
			handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				if ( attaches++ === 0 ) {
					document.addEventListener( orig, handler, true );
				}
			},
			teardown: function() {
				if ( --attaches === 0 ) {
					document.removeEventListener( orig, handler, true );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) { // && selector != null
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	live: function( types, data, fn ) {
		jQuery( this.context ).on( types, this.selector, data, fn );
		return this;
	},
	die: function( types, fn ) {
		jQuery( this.context ).off( types, this.selector || "**", fn );
		return this;
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length == 1? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		if ( this[0] ) {
			return jQuery.event.trigger( type, data, this[0], true );
		}
	},

	toggle: function( fn ) {
		// Save reference to arguments for access in closure
		var args = arguments,
			guid = fn.guid || jQuery.guid++,
			i = 0,
			toggler = function( event ) {
				// Figure out which function to execute
				var lastToggle = ( jQuery._data( this, "lastToggle" + fn.guid ) || 0 ) % i;
				jQuery._data( this, "lastToggle" + fn.guid, lastToggle + 1 );

				// Make sure that clicks stop
				event.preventDefault();

				// and execute the function
				return args[ lastToggle ].apply( this, arguments ) || false;
			};

		// link all the functions, so any of them can unbind this click handler
		toggler.guid = guid;
		while ( i < args.length ) {
			args[ i++ ].guid = guid;
		}

		return this.click( toggler );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
});

jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		if ( fn == null ) {
			fn = data;
			data = null;
		}

		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};

	if ( rkeyEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.keyHooks;
	}

	if ( rmouseEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.mouseHooks;
	}
});
/*!
 * Sizzle CSS Selector Engine
 *  Copyright 2012 jQuery Foundation and other contributors
 *  Released under the MIT license
 *  http://sizzlejs.com/
 */
(function( window, undefined ) {

var dirruns,
	cachedruns,
	assertGetIdNotName,
	Expr,
	getText,
	isXML,
	contains,
	compile,
	sortOrder,
	hasDuplicate,

	baseHasDuplicate = true,
	strundefined = "undefined",

	expando = ( "sizcache" + Math.random() ).replace( ".", "" ),

	document = window.document,
	docElem = document.documentElement,
	done = 0,
	slice = [].slice,
	push = [].push,

	// Augment a function for special use by Sizzle
	markFunction = function( fn, value ) {
		fn[ expando ] = value || true;
		return fn;
	},

	createCache = function() {
		var cache = {},
			keys = [];

		return markFunction(function( key, value ) {
			// Only keep the most recent entries
			if ( keys.push( key ) > Expr.cacheLength ) {
				delete cache[ keys.shift() ];
			}

			return (cache[ key ] = value);
		}, cache );
	},

	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),

	// Regex

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[-\\w]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier (http://www.w3.org/TR/css3-selectors/#attribute-selectors)
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
	operators = "([*^$|!~]?=)",
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
		"*(?:" + operators + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

	// Prefer arguments not in parens/brackets,
	//   then attribute selectors and non-pseudos (denoted by :),
	//   then anything else
	// These preferences are here to reduce the number of selectors
	//   needing tokenize in the PSEUDO preFilter
	pseudos = ":(" + characterEncoding + ")(?:\\((?:(['\"])((?:\\\\.|[^\\\\])*?)\\2|([^()[\\]]*|(?:(?:" + attributes + ")|[^:]|\\\\.)*|.*))\\)|)",

	// For matchExpr.POS and matchExpr.needsContext
	pos = ":(nth|eq|gt|lt|first|last|even|odd)(?:\\(((?:-\\d)?\\d*)\\)|)(?=[^-]|$)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([\\x20\\t\\r\\n\\f>+~])" + whitespace + "*" ),
	rpseudo = new RegExp( pseudos ),

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w\-]+)|(\w+)|\.([\w\-]+))$/,

	rnot = /^:not/,
	rsibling = /[\x20\t\r\n\f]*[+~]/,
	rendsWithNot = /:not\($/,

	rheader = /h\d/i,
	rinputs = /input|select|textarea|button/i,

	rbackslash = /\\(?!\\)/g,

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"NAME": new RegExp( "^\\[name=['\"]?(" + characterEncoding + ")['\"]?\\]" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|nth|last|first)-child(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"POS": new RegExp( pos, "ig" ),
		// For use in libraries implementing .is()
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|" + pos, "i" )
	},

	// Support

	// Used for testing something on an element
	assert = function( fn ) {
		var div = document.createElement("div");

		try {
			return fn( div );
		} catch (e) {
			return false;
		} finally {
			// release memory in IE
			div = null;
		}
	},

	// Check if getElementsByTagName("*") returns only elements
	assertTagNameNoComments = assert(function( div ) {
		div.appendChild( document.createComment("") );
		return !div.getElementsByTagName("*").length;
	}),

	// Check if getAttribute returns normalized href attributes
	assertHrefNotNormalized = assert(function( div ) {
		div.innerHTML = "<a href='#'></a>";
		return div.firstChild && typeof div.firstChild.getAttribute !== strundefined &&
			div.firstChild.getAttribute("href") === "#";
	}),

	// Check if attributes should be retrieved by attribute nodes
	assertAttributes = assert(function( div ) {
		div.innerHTML = "<select></select>";
		var type = typeof div.lastChild.getAttribute("multiple");
		// IE8 returns a string for some attributes even when not present
		return type !== "boolean" && type !== "string";
	}),

	// Check if getElementsByClassName can be trusted
	assertUsableClassName = assert(function( div ) {
		// Opera can't find a second classname (in 9.6)
		div.innerHTML = "<div class='hidden e'></div><div class='hidden'></div>";
		if ( !div.getElementsByClassName || !div.getElementsByClassName("e").length ) {
			return false;
		}

		// Safari 3.2 caches class attributes and doesn't catch changes
		div.lastChild.className = "e";
		return div.getElementsByClassName("e").length === 2;
	}),

	// Check if getElementById returns elements by name
	// Check if getElementsByName privileges form controls or returns elements by ID
	assertUsableName = assert(function( div ) {
		// Inject content
		div.id = expando + 0;
		div.innerHTML = "<a name='" + expando + "'></a><div name='" + expando + "'></div>";
		docElem.insertBefore( div, docElem.firstChild );

		// Test
		var pass = document.getElementsByName &&
			// buggy browsers will return fewer than the correct 2
			document.getElementsByName( expando ).length === 2 +
			// buggy browsers will return more than the correct 0
			document.getElementsByName( expando + 0 ).length;
		assertGetIdNotName = !document.getElementById( expando );

		// Cleanup
		docElem.removeChild( div );

		return pass;
	});

// If slice is not available, provide a backup
try {
	slice.call( docElem.childNodes, 0 )[0].nodeType;
} catch ( e ) {
	slice = function( i ) {
		var elem, results = [];
		for ( ; (elem = this[i]); i++ ) {
			results.push( elem );
		}
		return results;
	};
}

function Sizzle( selector, context, results, seed ) {
	results = results || [];
	context = context || document;
	var match, elem, xml, m,
		nodeType = context.nodeType;

	if ( nodeType !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	xml = isXML( context );

	if ( !xml && !seed ) {
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, slice.call(context.getElementsByTagName( selector ), 0) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && assertUsableClassName && context.getElementsByClassName ) {
				push.apply( results, slice.call(context.getElementsByClassName( m ), 0) );
				return results;
			}
		}
	}

	// All others
	return select( selector, context, results, seed, xml );
}

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	return Sizzle( expr, null, null, [ elem ] ).length > 0;
};

// Returns a function to use in pseudos for input types
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

// Returns a function to use in pseudos for buttons
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( nodeType ) {
		if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent for elements
			// innerText usage removed for consistency of new lines (see #11153)
			if ( typeof elem.textContent === "string" ) {
				return elem.textContent;
			} else {
				// Traverse its children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
		// Do not include comment or processing instruction nodes
	} else {

		// If no nodeType, this is expected to be an array
		for ( ; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	}
	return ret;
};

isXML = Sizzle.isXML = function isXML( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

// Element contains another
contains = Sizzle.contains = docElem.contains ?
	function( a, b ) {
		var adown = a.nodeType === 9 ? a.documentElement : a,
			bup = b && b.parentNode;
		return a === bup || !!( bup && bup.nodeType === 1 && adown.contains && adown.contains(bup) );
	} :
	docElem.compareDocumentPosition ?
	function( a, b ) {
		return b && !!( a.compareDocumentPosition( b ) & 16 );
	} :
	function( a, b ) {
		while ( (b = b.parentNode) ) {
			if ( b === a ) {
				return true;
			}
		}
		return false;
	};

Sizzle.attr = function( elem, name ) {
	var attr,
		xml = isXML( elem );

	if ( !xml ) {
		name = name.toLowerCase();
	}
	if ( Expr.attrHandle[ name ] ) {
		return Expr.attrHandle[ name ]( elem );
	}
	if ( assertAttributes || xml ) {
		return elem.getAttribute( name );
	}
	attr = elem.getAttributeNode( name );
	return attr ?
		typeof elem[ name ] === "boolean" ?
			elem[ name ] ? name : null :
			attr.specified ? attr.value : null :
		null;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	order: new RegExp( "ID|TAG" +
		(assertUsableName ? "|NAME" : "") +
		(assertUsableClassName ? "|CLASS" : "")
	),

	// IE6/7 return a modified href
	attrHandle: assertHrefNotNormalized ?
		{} :
		{
			"href": function( elem ) {
				return elem.getAttribute( "href", 2 );
			},
			"type": function( elem ) {
				return elem.getAttribute("type");
			}
		},

	find: {
		"ID": assertGetIdNotName ?
			function( id, context, xml ) {
				if ( typeof context.getElementById !== strundefined && !xml ) {
					var m = context.getElementById( id );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					return m && m.parentNode ? [m] : [];
				}
			} :
			function( id, context, xml ) {
				if ( typeof context.getElementById !== strundefined && !xml ) {
					var m = context.getElementById( id );

					return m ?
						m.id === id || typeof m.getAttributeNode !== strundefined && m.getAttributeNode("id").value === id ?
							[m] :
							undefined :
						[];
				}
			},

		"TAG": assertTagNameNoComments ?
			function( tag, context ) {
				if ( typeof context.getElementsByTagName !== strundefined ) {
					return context.getElementsByTagName( tag );
				}
			} :
			function( tag, context ) {
				var results = context.getElementsByTagName( tag );

				// Filter out possible comments
				if ( tag === "*" ) {
					var elem,
						tmp = [],
						i = 0;

					for ( ; (elem = results[i]); i++ ) {
						if ( elem.nodeType === 1 ) {
							tmp.push( elem );
						}
					}

					return tmp;
				}
				return results;
			},

		"NAME": function( tag, context ) {
			if ( typeof context.getElementsByName !== strundefined ) {
				return context.getElementsByName( name );
			}
		},

		"CLASS": function( className, context, xml ) {
			if ( typeof context.getElementsByClassName !== strundefined && !xml ) {
				return context.getElementsByClassName( className );
			}
		}
	},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( rbackslash, "" );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[4] || match[5] || "" ).replace( rbackslash, "" );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr.CHILD
				1 type (only|nth|...)
				2 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				3 xn-component of xn+y argument ([+-]?\d*n|)
				4 sign of xn-component
				5 x of xn-component
				6 sign of y-component
				7 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1] === "nth" ) {
				// nth-child requires argument
				if ( !match[2] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[3] = +( match[3] ? match[4] + (match[5] || 1) : 2 * ( match[2] === "even" || match[2] === "odd" ) );
				match[4] = +( ( match[6] + match[7] ) || match[2] === "odd" );

			// other types prohibit arguments
			} else if ( match[2] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match, context, xml ) {
			var unquoted, excess;
			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			if ( match[3] ) {
				match[2] = match[3];
			} else if ( (unquoted = match[4]) ) {
				// Only check arguments that contain a pseudo
				if ( rpseudo.test(unquoted) &&
					// Get excess from tokenize (recursively)
					(excess = tokenize( unquoted, context, xml, true )) &&
					// advance to the next closing parenthesis
					(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

					// excess is a negative index
					unquoted = unquoted.slice( 0, excess );
					match[0] = match[0].slice( 0, excess );
				}
				match[2] = unquoted;
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {
		"ID": assertGetIdNotName ?
			function( id ) {
				id = id.replace( rbackslash, "" );
				return function( elem ) {
					return elem.getAttribute("id") === id;
				};
			} :
			function( id ) {
				id = id.replace( rbackslash, "" );
				return function( elem ) {
					var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
					return node && node.value === id;
				};
			},

		"TAG": function( nodeName ) {
			if ( nodeName === "*" ) {
				return function() { return true; };
			}
			nodeName = nodeName.replace( rbackslash, "" ).toLowerCase();

			return function( elem ) {
				return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
			};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ expando ][ className ];
			if ( !pattern ) {
				pattern = classCache( className, new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)") );
			}
			return function( elem ) {
				return pattern.test( elem.className || (typeof elem.getAttribute !== strundefined && elem.getAttribute("class")) || "" );
			};
		},

		"ATTR": function( name, operator, check ) {
			if ( !operator ) {
				return function( elem ) {
					return Sizzle.attr( elem, name ) != null;
				};
			}

			return function( elem ) {
				var result = Sizzle.attr( elem, name ),
					value = result + "";

				if ( result == null ) {
					return operator === "!=";
				}

				switch ( operator ) {
					case "=":
						return value === check;
					case "!=":
						return value !== check;
					case "^=":
						return check && value.indexOf( check ) === 0;
					case "*=":
						return check && value.indexOf( check ) > -1;
					case "$=":
						return check && value.substr( value.length - check.length ) === check;
					case "~=":
						return ( " " + value + " " ).indexOf( check ) > -1;
					case "|=":
						return value === check || value.substr( 0, check.length + 1 ) === check + "-";
				}
			};
		},

		"CHILD": function( type, argument, first, last ) {

			if ( type === "nth" ) {
				var doneName = done++;

				return function( elem ) {
					var parent, diff,
						count = 0,
						node = elem;

					if ( first === 1 && last === 0 ) {
						return true;
					}

					parent = elem.parentNode;

					if ( parent && (parent[ expando ] !== doneName || !elem.sizset) ) {
						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.sizset = ++count;
								if ( node === elem ) {
									break;
								}
							}
						}

						parent[ expando ] = doneName;
					}

					diff = elem.sizset - last;

					if ( first === 0 ) {
						return diff === 0;

					} else {
						return ( diff % first === 0 && diff / first >= 0 );
					}
				};
			}

			return function( elem ) {
				var node = elem;

				switch ( type ) {
					case "only":
					case "first":
						while ( (node = node.previousSibling) ) {
							if ( node.nodeType === 1 ) {
								return false;
							}
						}

						if ( type === "first" ) {
							return true;
						}

						node = elem;

						/* falls through */
					case "last":
						while ( (node = node.nextSibling) ) {
							if ( node.nodeType === 1 ) {
								return false;
							}
						}

						return true;
				}
			};
		},

		"PSEUDO": function( pseudo, argument, context, xml ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.pseudos[ pseudo.toLowerCase() ];

			if ( !fn ) {
				Sizzle.error( "unsupported pseudo: " + pseudo );
			}

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( !fn[ expando ] ) {
				if ( fn.length > 1 ) {
					args = [ pseudo, pseudo, "", argument ];
					return function( elem ) {
						return fn( elem, 0, args );
					};
				}
				return fn;
			}

			return fn( argument, context, xml );
		}
	},

	pseudos: {
		"not": markFunction(function( selector, context, xml ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var matcher = compile( selector.replace( rtrim, "$1" ), context, xml );
			return function( elem ) {
				return !matcher( elem );
			};
		}),

		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is only affected by element nodes and content nodes(including text(3), cdata(4)),
			//   not comment, processing instructions, or others
			// Thanks to Diego Perini for the nodeName shortcut
			//   Greater than "@" means alpha characters (specifically not starting with "#" or "?")
			var nodeType;
			elem = elem.firstChild;
			while ( elem ) {
				if ( elem.nodeName > "@" || (nodeType = elem.nodeType) === 3 || nodeType === 4 ) {
					return false;
				}
				elem = elem.nextSibling;
			}
			return true;
		},

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"text": function( elem ) {
			var type, attr;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" &&
				(type = elem.type) === "text" &&
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === type );
		},

		// Input types
		"radio": createInputPseudo("radio"),
		"checkbox": createInputPseudo("checkbox"),
		"file": createInputPseudo("file"),
		"password": createInputPseudo("password"),
		"image": createInputPseudo("image"),

		"submit": createButtonPseudo("submit"),
		"reset": createButtonPseudo("reset"),

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"focus": function( elem ) {
			var doc = elem.ownerDocument;
			return elem === doc.activeElement && (!doc.hasFocus || doc.hasFocus()) && !!(elem.type || elem.href);
		},

		"active": function( elem ) {
			return elem === elem.ownerDocument.activeElement;
		}
	},

	setFilters: {
		"first": function( elements, argument, not ) {
			return not ? elements.slice( 1 ) : [ elements[0] ];
		},

		"last": function( elements, argument, not ) {
			var elem = elements.pop();
			return not ? elements : [ elem ];
		},

		"even": function( elements, argument, not ) {
			var results = [],
				i = not ? 1 : 0,
				len = elements.length;
			for ( ; i < len; i = i + 2 ) {
				results.push( elements[i] );
			}
			return results;
		},

		"odd": function( elements, argument, not ) {
			var results = [],
				i = not ? 0 : 1,
				len = elements.length;
			for ( ; i < len; i = i + 2 ) {
				results.push( elements[i] );
			}
			return results;
		},

		"lt": function( elements, argument, not ) {
			return not ? elements.slice( +argument ) : elements.slice( 0, +argument );
		},

		"gt": function( elements, argument, not ) {
			return not ? elements.slice( 0, +argument + 1 ) : elements.slice( +argument + 1 );
		},

		"eq": function( elements, argument, not ) {
			var elem = elements.splice( +argument, 1 );
			return not ? elements : elem;
		}
	}
};

function siblingCheck( a, b, ret ) {
	if ( a === b ) {
		return ret;
	}

	var cur = a.nextSibling;

	while ( cur ) {
		if ( cur === b ) {
			return -1;
		}

		cur = cur.nextSibling;
	}

	return 1;
}

sortOrder = docElem.compareDocumentPosition ?
	function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		return ( !a.compareDocumentPosition || !b.compareDocumentPosition ?
			a.compareDocumentPosition :
			a.compareDocumentPosition(b) & 4
		) ? -1 : 1;
	} :
	function( a, b ) {
		// The nodes are identical, we can exit early
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Fallback to using sourceIndex (in IE) if it's available on both nodes
		} else if ( a.sourceIndex && b.sourceIndex ) {
			return a.sourceIndex - b.sourceIndex;
		}

		var al, bl,
			ap = [],
			bp = [],
			aup = a.parentNode,
			bup = b.parentNode,
			cur = aup;

		// If the nodes are siblings (or identical) we can do a quick check
		if ( aup === bup ) {
			return siblingCheck( a, b );

		// If no parents were found then the nodes are disconnected
		} else if ( !aup ) {
			return -1;

		} else if ( !bup ) {
			return 1;
		}

		// Otherwise they're somewhere else in the tree so we need
		// to build up a full list of the parentNodes for comparison
		while ( cur ) {
			ap.unshift( cur );
			cur = cur.parentNode;
		}

		cur = bup;

		while ( cur ) {
			bp.unshift( cur );
			cur = cur.parentNode;
		}

		al = ap.length;
		bl = bp.length;

		// Start walking down the tree looking for a discrepancy
		for ( var i = 0; i < al && i < bl; i++ ) {
			if ( ap[i] !== bp[i] ) {
				return siblingCheck( ap[i], bp[i] );
			}
		}

		// We ended someplace up the tree so do a sibling check
		return i === al ?
			siblingCheck( a, bp[i], -1 ) :
			siblingCheck( ap[i], b, 1 );
	};

// Always assume the presence of duplicates if sort doesn't
// pass them to our comparison function (as in Google Chrome).
[0, 0].sort( sortOrder );
baseHasDuplicate = !hasDuplicate;

// Document sorting and removing duplicates
Sizzle.uniqueSort = function( results ) {
	var elem,
		i = 1;

	hasDuplicate = baseHasDuplicate;
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		for ( ; (elem = results[i]); i++ ) {
			if ( elem === results[ i - 1 ] ) {
				results.splice( i--, 1 );
			}
		}
	}

	return results;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

function tokenize( selector, context, xml, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, group, i,
		preFilters, filters,
		checkContext = !xml && context !== document,
		// Token cache should maintain spaces
		key = ( checkContext ? "<s>" : "" ) + selector.replace( rtrim, "$1<s>" ),
		cached = tokenCache[ expando ][ key ];

	if ( cached ) {
		return parseOnly ? 0 : slice.call( cached, 0 );
	}

	soFar = selector;
	groups = [];
	i = 0;
	preFilters = Expr.preFilter;
	filters = Expr.filter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				soFar = soFar.slice( match[0].length );
				tokens.selector = group;
			}
			groups.push( tokens = [] );
			group = "";

			// Need to make sure we're within a narrower context if necessary
			// Adding a descendant combinator will generate what is needed
			if ( checkContext ) {
				soFar = " " + soFar;
			}
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			group += match[0];
			soFar = soFar.slice( match[0].length );

			// Cast descendant combinators to space
			matched = tokens.push({
				part: match.pop().replace( rtrim, " " ),
				string: match[0],
				captures: match
			});
		}

		// Filters
		for ( type in filters ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				( match = preFilters[ type ](match, context, xml) )) ) {

				group += match[0];
				soFar = soFar.slice( match[0].length );
				matched = tokens.push({
					part: type,
					string: match.shift(),
					captures: match
				});
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Attach the full group as a selector
	if ( group ) {
		tokens.selector = group;
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			slice.call( tokenCache(key, groups), 0 );
}

function addCombinator( matcher, combinator, context, xml ) {
	var dir = combinator.dir,
		doneName = done++;

	if ( !matcher ) {
		// If there is no matcher to check, check against the context
		matcher = function( elem ) {
			return elem === context;
		};
	}
	return combinator.first ?
		function( elem ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 ) {
					return matcher( elem ) && elem;
				}
			}
		} :
		xml ?
			function( elem ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 ) {
						if ( matcher( elem ) ) {
							return elem;
						}
					}
				}
			} :
			function( elem ) {
				var cache,
					dirkey = doneName + "." + dirruns,
					cachedkey = dirkey + "." + cachedruns;
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 ) {
						if ( (cache = elem[ expando ]) === cachedkey ) {
							return elem.sizset;
						} else if ( typeof cache === "string" && cache.indexOf(dirkey) === 0 ) {
							if ( elem.sizset ) {
								return elem;
							}
						} else {
							elem[ expando ] = cachedkey;
							if ( matcher( elem ) ) {
								elem.sizset = true;
								return elem;
							}
							elem.sizset = false;
						}
					}
				}
			};
}

function addMatcher( higher, deeper ) {
	return higher ?
		function( elem ) {
			var result = deeper( elem );
			return result && higher( result === true ? elem : result );
		} :
		deeper;
}

// ["TAG", ">", "ID", " ", "CLASS"]
function matcherFromTokens( tokens, context, xml ) {
	var token, matcher,
		i = 0;

	for ( ; (token = tokens[i]); i++ ) {
		if ( Expr.relative[ token.part ] ) {
			matcher = addCombinator( matcher, Expr.relative[ token.part ], context, xml );
		} else {
			matcher = addMatcher( matcher, Expr.filter[ token.part ].apply(null, token.captures.concat( context, xml )) );
		}
	}

	return matcher;
}

function matcherFromGroupMatchers( matchers ) {
	return function( elem ) {
		var matcher,
			j = 0;
		for ( ; (matcher = matchers[j]); j++ ) {
			if ( matcher(elem) ) {
				return true;
			}
		}
		return false;
	};
}

compile = Sizzle.compile = function( selector, context, xml ) {
	var group, i, len,
		cached = compilerCache[ expando ][ selector ];

	// Return a cached group function if already generated (context dependent)
	if ( cached && cached.context === context ) {
		return cached;
	}

	// Generate a function of recursive functions that can be used to check each element
	group = tokenize( selector, context, xml );
	for ( i = 0, len = group.length; i < len; i++ ) {
		group[i] = matcherFromTokens(group[i], context, xml);
	}

	// Cache the compiled function
	cached = compilerCache( selector, matcherFromGroupMatchers(group) );
	cached.context = context;
	cached.runs = cached.dirruns = 0;
	return cached;
};

function multipleContexts( selector, contexts, results, seed ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results, seed );
	}
}

function handlePOSGroup( selector, posfilter, argument, contexts, seed, not ) {
	var results,
		fn = Expr.setFilters[ posfilter.toLowerCase() ];

	if ( !fn ) {
		Sizzle.error( posfilter );
	}

	if ( selector || !(results = seed) ) {
		multipleContexts( selector || "*", contexts, (results = []), seed );
	}

	return results.length > 0 ? fn( results, argument, not ) : [];
}

function handlePOS( groups, context, results, seed ) {
	var group, part, j, groupLen, token, selector,
		anchor, elements, match, matched,
		lastIndex, currentContexts, not,
		i = 0,
		len = groups.length,
		rpos = matchExpr["POS"],
		// This is generated here in case matchExpr["POS"] is extended
		rposgroups = new RegExp( "^" + rpos.source + "(?!" + whitespace + ")", "i" ),
		// This is for making sure non-participating
		// matching groups are represented cross-browser (IE6-8)
		setUndefined = function() {
			var i = 1,
				len = arguments.length - 2;
			for ( ; i < len; i++ ) {
				if ( arguments[i] === undefined ) {
					match[i] = undefined;
				}
			}
		};

	for ( ; i < len; i++ ) {
		group = groups[i];
		part = "";
		elements = seed;
		for ( j = 0, groupLen = group.length; j < groupLen; j++ ) {
			token = group[j];
			selector = token.string;
			if ( token.part === "PSEUDO" ) {
				// Reset regex index to 0
				rpos.exec("");
				anchor = 0;
				while ( (match = rpos.exec( selector )) ) {
					matched = true;
					lastIndex = rpos.lastIndex = match.index + match[0].length;
					if ( lastIndex > anchor ) {
						part += selector.slice( anchor, match.index );
						anchor = lastIndex;
						currentContexts = [ context ];

						if ( rcombinators.test(part) ) {
							if ( elements ) {
								currentContexts = elements;
							}
							elements = seed;
						}

						if ( (not = rendsWithNot.test( part )) ) {
							part = part.slice( 0, -5 ).replace( rcombinators, "$&*" );
							anchor++;
						}

						if ( match.length > 1 ) {
							match[0].replace( rposgroups, setUndefined );
						}
						elements = handlePOSGroup( part, match[1], match[2], currentContexts, elements, not );
					}
					part = "";
				}

			}

			if ( !matched ) {
				part += selector;
			}
			matched = false;
		}

		if ( part ) {
			if ( rcombinators.test(part) ) {
				multipleContexts( part, elements || [ context ], results, seed );
			} else {
				Sizzle( part, context, results, seed ? seed.concat(elements) : elements );
			}
		} else {
			push.apply( results, elements );
		}
	}

	// Do not sort if this is a single filter
	return len === 1 ? results : Sizzle.uniqueSort( results );
}

function select( selector, context, results, seed, xml ) {
	// Remove excessive whitespace
	selector = selector.replace( rtrim, "$1" );
	var elements, matcher, cached, elem,
		i, tokens, token, lastToken, findContext, type,
		match = tokenize( selector, context, xml ),
		contextNodeType = context.nodeType;

	// POS handling
	if ( matchExpr["POS"].test(selector) ) {
		return handlePOS( match, context, results, seed );
	}

	if ( seed ) {
		elements = slice.call( seed, 0 );

	// To maintain document order, only narrow the
	// set if there is one group
	} else if ( match.length === 1 ) {

		// Take a shortcut and set the context if the root selector is an ID
		if ( (tokens = slice.call( match[0], 0 )).length > 2 &&
				(token = tokens[0]).part === "ID" &&
				contextNodeType === 9 && !xml &&
				Expr.relative[ tokens[1].part ] ) {

			context = Expr.find["ID"]( token.captures[0].replace( rbackslash, "" ), context, xml )[0];
			if ( !context ) {
				return results;
			}

			selector = selector.slice( tokens.shift().string.length );
		}

		findContext = ( (match = rsibling.exec( tokens[0].string )) && !match.index && context.parentNode ) || context;

		// Reduce the set if possible
		lastToken = "";
		for ( i = tokens.length - 1; i >= 0; i-- ) {
			token = tokens[i];
			type = token.part;
			lastToken = token.string + lastToken;
			if ( Expr.relative[ type ] ) {
				break;
			}
			if ( Expr.order.test(type) ) {
				elements = Expr.find[ type ]( token.captures[0].replace( rbackslash, "" ), findContext, xml );
				if ( elements == null ) {
					continue;
				} else {
					selector = selector.slice( 0, selector.length - lastToken.length ) +
						lastToken.replace( matchExpr[ type ], "" );

					if ( !selector ) {
						push.apply( results, slice.call(elements, 0) );
					}

					break;
				}
			}
		}
	}

	// Only loop over the given elements once
	if ( selector ) {
		matcher = compile( selector, context, xml );
		dirruns = matcher.dirruns++;
		if ( elements == null ) {
			elements = Expr.find["TAG"]( "*", (rsibling.test( selector ) && context.parentNode) || context );
		}

		for ( i = 0; (elem = elements[i]); i++ ) {
			cachedruns = matcher.runs++;
			if ( matcher(elem) ) {
				results.push( elem );
			}
		}
	}

	return results;
}

if ( document.querySelectorAll ) {
	(function() {
		var disconnectedMatch,
			oldSelect = select,
			rescape = /'|\\/g,
			rattributeQuotes = /\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,
			rbuggyQSA = [],
			// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
			// A support test would require too much code (would include document ready)
			// just skip matchesSelector for :active
			rbuggyMatches = [":active"],
			matches = docElem.matchesSelector ||
				docElem.mozMatchesSelector ||
				docElem.webkitMatchesSelector ||
				docElem.oMatchesSelector ||
				docElem.msMatchesSelector;

		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explictly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select><option selected=''></option></select>";

			// IE8 - Some boolean attributes are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:checked|disabled|ismap|multiple|readonly|selected|value)" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here (do not put tests after this one)
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {

			// Opera 10-12/IE9 - ^= $= *= and empty values
			// Should not select anything
			div.innerHTML = "<p test=''></p>";
			if ( div.querySelectorAll("[test^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:\"\"|'')" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here (do not put tests after this one)
			div.innerHTML = "<input type='hidden'/>";
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push(":enabled", ":disabled");
			}
		});

		rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );

		select = function( selector, context, results, seed, xml ) {
			// Only use querySelectorAll when not filtering,
			// when this is not xml,
			// and when no QSA bugs apply
			if ( !seed && !xml && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
				if ( context.nodeType === 9 ) {
					try {
						push.apply( results, slice.call(context.querySelectorAll( selector ), 0) );
						return results;
					} catch(qsaError) {}
				// qSA works strangely on Element-rooted queries
				// We can work around this by specifying an extra ID on the root
				// and working up from there (Thanks to Andrew Dupont for the technique)
				// IE 8 doesn't work on object elements
				} else if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
					var groups, i, len,
						old = context.getAttribute("id"),
						nid = old || expando,
						newContext = rsibling.test( selector ) && context.parentNode || context;

					if ( old ) {
						nid = nid.replace( rescape, "\\$&" );
					} else {
						context.setAttribute( "id", nid );
					}

					groups = tokenize(selector, context, xml);
					// Trailing space is unnecessary
					// There is always a context check
					nid = "[id='" + nid + "']";
					for ( i = 0, len = groups.length; i < len; i++ ) {
						groups[i] = nid + groups[i].selector;
					}
					try {
						push.apply( results, slice.call( newContext.querySelectorAll(
							groups.join(",")
						), 0 ) );
						return results;
					} catch(qsaError) {
					} finally {
						if ( !old ) {
							context.removeAttribute("id");
						}
					}
				}
			}

			return oldSelect( selector, context, results, seed, xml );
		};

		if ( matches ) {
			assert(function( div ) {
				// Check to see if it's possible to do matchesSelector
				// on a disconnected node (IE 9)
				disconnectedMatch = matches.call( div, "div" );

				// This should fail with an exception
				// Gecko does not error, returns false instead
				try {
					matches.call( div, "[test!='']:sizzle" );
					rbuggyMatches.push( matchExpr["PSEUDO"].source, matchExpr["POS"].source, "!=" );
				} catch ( e ) {}
			});

			// rbuggyMatches always contains :active, so no need for a length check
			rbuggyMatches = /* rbuggyMatches.length && */ new RegExp( rbuggyMatches.join("|") );

			Sizzle.matchesSelector = function( elem, expr ) {
				// Make sure that attribute selectors are quoted
				expr = expr.replace( rattributeQuotes, "='$1']" );

				// rbuggyMatches always contains :active, so no need for an existence check
				if ( !isXML( elem ) && !rbuggyMatches.test( expr ) && (!rbuggyQSA || !rbuggyQSA.test( expr )) ) {
					try {
						var ret = matches.call( elem, expr );

						// IE 9's matchesSelector returns false on disconnected nodes
						if ( ret || disconnectedMatch ||
								// As well, disconnected nodes are said to be in a document
								// fragment in IE 9
								elem.document && elem.document.nodeType !== 11 ) {
							return ret;
						}
					} catch(e) {}
				}

				return Sizzle( expr, null, null, [ elem ] ).length > 0;
			};
		}
	})();
}

// Deprecated
Expr.setFilters["nth"] = Expr.setFilters["eq"];

// Back-compat
Expr.filters = Expr.pseudos;

// Override sizzle attribute retrieval
Sizzle.attr = jQuery.attr;
jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;


})( window );
var runtil = /Until$/,
	rparentsprev = /^(?:parents|prev(?:Until|All))/,
	isSimple = /^.[^:#\[\.,]*$/,
	rneedsContext = jQuery.expr.match.needsContext,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend({
	find: function( selector ) {
		var i, l, length, n, r, ret,
			self = this;

		if ( typeof selector !== "string" ) {
			return jQuery( selector ).filter(function() {
				for ( i = 0, l = self.length; i < l; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			});
		}

		ret = this.pushStack( "", "find", selector );

		for ( i = 0, l = this.length; i < l; i++ ) {
			length = ret.length;
			jQuery.find( selector, this[i], ret );

			if ( i > 0 ) {
				// Make sure that the results are unique
				for ( n = length; n < ret.length; n++ ) {
					for ( r = 0; r < length; r++ ) {
						if ( ret[r] === ret[n] ) {
							ret.splice(n--, 1);
							break;
						}
					}
				}
			}
		}

		return ret;
	},

	has: function( target ) {
		var i,
			targets = jQuery( target, this ),
			len = targets.length;

		return this.filter(function() {
			for ( i = 0; i < len; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	not: function( selector ) {
		return this.pushStack( winnow(this, selector, false), "not", selector);
	},

	filter: function( selector ) {
		return this.pushStack( winnow(this, selector, true), "filter", selector );
	},

	is: function( selector ) {
		return !!selector && (
			typeof selector === "string" ?
				// If this is a positional/relative selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				rneedsContext.test( selector ) ?
					jQuery( selector, this.context ).index( this[0] ) >= 0 :
					jQuery.filter( selector, this ).length > 0 :
				this.filter( selector ).length > 0 );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			ret = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			cur = this[i];

			while ( cur && cur.ownerDocument && cur !== context && cur.nodeType !== 11 ) {
				if ( pos ? pos.index(cur) > -1 : jQuery.find.matchesSelector(cur, selectors) ) {
					ret.push( cur );
					break;
				}
				cur = cur.parentNode;
			}
		}

		ret = ret.length > 1 ? jQuery.unique( ret ) : ret;

		return this.pushStack( ret, "closest", selectors );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},

	add: function( selector, context ) {
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );

		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
			all :
			jQuery.unique( all ) );
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

jQuery.fn.andSelf = jQuery.fn.addBack;

// A painfully simple check to see if an element is disconnected
// from a document (should be improved, where feasible).
function isDisconnected( node ) {
	return !node || !node.parentNode || node.parentNode.nodeType === 11;
}

function sibling( cur, dir ) {
	do {
		cur = cur[ dir ];
	} while ( cur && cur.nodeType !== 1 );

	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var ret = jQuery.map( this, fn, until );

		if ( !runtil.test( name ) ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

		if ( this.length > 1 && rparentsprev.test( name ) ) {
			ret = ret.reverse();
		}

		return this.pushStack( ret, name, core_slice.call( arguments ).join(",") );
	};
});

jQuery.extend({
	filter: function( expr, elems, not ) {
		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 ?
			jQuery.find.matchesSelector(elems[0], expr) ? [ elems[0] ] : [] :
			jQuery.find.matches(expr, elems);
	},

	dir: function( elem, dir, until ) {
		var matched = [],
			cur = elem[ dir ];

		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
			if ( cur.nodeType === 1 ) {
				matched.push( cur );
			}
			cur = cur[dir];
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, keep ) {

	// Can't pass null or undefined to indexOf in Firefox 4
	// Set to 0 to skip string check
	qualifier = qualifier || 0;

	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep(elements, function( elem, i ) {
			var retVal = !!qualifier.call( elem, i, elem );
			return retVal === keep;
		});

	} else if ( qualifier.nodeType ) {
		return jQuery.grep(elements, function( elem, i ) {
			return ( elem === qualifier ) === keep;
		});

	} else if ( typeof qualifier === "string" ) {
		var filtered = jQuery.grep(elements, function( elem ) {
			return elem.nodeType === 1;
		});

		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter(qualifier, filtered, !keep);
		} else {
			qualifier = jQuery.filter( qualifier, filtered );
		}
	}

	return jQuery.grep(elements, function( elem, i ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
	});
}
function createSafeFragment( document ) {
	var list = nodeNames.split( "|" ),
	safeFrag = document.createDocumentFragment();

	if ( safeFrag.createElement ) {
		while ( list.length ) {
			safeFrag.createElement(
				list.pop()
			);
		}
	}
	return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
	rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
	rleadingWhitespace = /^\s+/,
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rtbody = /<tbody/i,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	rnocache = /<(?:script|object|embed|option|style)/i,
	rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
	rcheckableType = /^(?:checkbox|radio)$/,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /\/(java|ecma)script/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|\-\-)|[\]\-]{2}>\s*$/g,
	wrapMap = {
		option: [ 1, "<select multiple='multiple'>", "</select>" ],
		legend: [ 1, "<fieldset>", "</fieldset>" ],
		thead: [ 1, "<table>", "</table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
		area: [ 1, "<map>", "</map>" ],
		_default: [ 0, "", "" ]
	},
	safeFragment = createSafeFragment( document ),
	fragmentDiv = safeFragment.appendChild( document.createElement("div") );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
// unless wrapped in a div with non-breaking characters in front of it.
if ( !jQuery.support.htmlSerialize ) {
	wrapMap._default = [ 1, "X<div>", "</div>" ];
}

jQuery.fn.extend({
	text: function( value ) {
		return jQuery.access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
		}, null, value, arguments.length );
	},

	wrapAll: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapAll( html.call(this, i) );
			});
		}

		if ( this[0] ) {
			// The elements to wrap the target around
			var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

			if ( this[0].parentNode ) {
				wrap.insertBefore( this[0] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
					elem = elem.firstChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function(i) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	},

	append: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 ) {
				this.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 ) {
				this.insertBefore( elem, this.firstChild );
			}
		});
	},

	before: function() {
		if ( !isDisconnected( this[0] ) ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this );
			});
		}

		if ( arguments.length ) {
			var set = jQuery.clean( arguments );
			return this.pushStack( jQuery.merge( set, this ), "before", this.selector );
		}
	},

	after: function() {
		if ( !isDisconnected( this[0] ) ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			});
		}

		if ( arguments.length ) {
			var set = jQuery.clean( arguments );
			return this.pushStack( jQuery.merge( this, set ), "after", this.selector );
		}
	},

	// keepData is for internal use only--do not document
	remove: function( selector, keepData ) {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( !selector || jQuery.filter( selector, [ elem ] ).length ) {
				if ( !keepData && elem.nodeType === 1 ) {
					jQuery.cleanData( elem.getElementsByTagName("*") );
					jQuery.cleanData( [ elem ] );
				}

				if ( elem.parentNode ) {
					elem.parentNode.removeChild( elem );
				}
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			// Remove element nodes and prevent memory leaks
			if ( elem.nodeType === 1 ) {
				jQuery.cleanData( elem.getElementsByTagName("*") );
			}

			// Remove any remaining nodes
			while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function () {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return jQuery.access( this, function( value ) {
			var elem = this[0] || {},
				i = 0,
				l = this.length;

			if ( value === undefined ) {
				return elem.nodeType === 1 ?
					elem.innerHTML.replace( rinlinejQuery, "" ) :
					undefined;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				( jQuery.support.htmlSerialize || !rnoshimcache.test( value )  ) &&
				( jQuery.support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
				!wrapMap[ ( rtagName.exec( value ) || ["", ""] )[1].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for (; i < l; i++ ) {
						// Remove element nodes and prevent memory leaks
						elem = this[i] || {};
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( elem.getElementsByTagName( "*" ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch(e) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function( value ) {
		if ( !isDisconnected( this[0] ) ) {
			// Make sure that the elements are removed from the DOM before they are inserted
			// this can help fix replacing a parent with child elements
			if ( jQuery.isFunction( value ) ) {
				return this.each(function(i) {
					var self = jQuery(this), old = self.html();
					self.replaceWith( value.call( this, i, old ) );
				});
			}

			if ( typeof value !== "string" ) {
				value = jQuery( value ).detach();
			}

			return this.each(function() {
				var next = this.nextSibling,
					parent = this.parentNode;

				jQuery( this ).remove();

				if ( next ) {
					jQuery(next).before( value );
				} else {
					jQuery(parent).append( value );
				}
			});
		}

		return this.length ?
			this.pushStack( jQuery(jQuery.isFunction(value) ? value() : value), "replaceWith", value ) :
			this;
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, table, callback ) {

		// Flatten any nested arrays
		args = [].concat.apply( [], args );

		var results, first, fragment, iNoClone,
			i = 0,
			value = args[0],
			scripts = [],
			l = this.length;

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( !jQuery.support.checkClone && l > 1 && typeof value === "string" && rchecked.test( value ) ) {
			return this.each(function() {
				jQuery(this).domManip( args, table, callback );
			});
		}

		if ( jQuery.isFunction(value) ) {
			return this.each(function(i) {
				var self = jQuery(this);
				args[0] = value.call( this, i, table ? self.html() : undefined );
				self.domManip( args, table, callback );
			});
		}

		if ( this[0] ) {
			results = jQuery.buildFragment( args, this, scripts );
			fragment = results.fragment;
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				table = table && jQuery.nodeName( first, "tr" );

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				// Fragments from the fragment cache must always be cloned and never used in place.
				for ( iNoClone = results.cacheable || l - 1; i < l; i++ ) {
					callback.call(
						table && jQuery.nodeName( this[i], "table" ) ?
							findOrAppend( this[i], "tbody" ) :
							this[i],
						i === iNoClone ?
							fragment :
							jQuery.clone( fragment, true, true )
					);
				}
			}

			// Fix #11809: Avoid leaking memory
			fragment = first = null;

			if ( scripts.length ) {
				jQuery.each( scripts, function( i, elem ) {
					if ( elem.src ) {
						if ( jQuery.ajax ) {
							jQuery.ajax({
								url: elem.src,
								type: "GET",
								dataType: "script",
								async: false,
								global: false,
								"throws": true
							});
						} else {
							jQuery.error("no ajax");
						}
					} else {
						jQuery.globalEval( ( elem.text || elem.textContent || elem.innerHTML || "" ).replace( rcleanScript, "" ) );
					}

					if ( elem.parentNode ) {
						elem.parentNode.removeChild( elem );
					}
				});
			}
		}

		return this;
	}
});

function findOrAppend( elem, tag ) {
	return elem.getElementsByTagName( tag )[0] || elem.appendChild( elem.ownerDocument.createElement( tag ) );
}

function cloneCopyEvent( src, dest ) {

	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
		return;
	}

	var type, i, l,
		oldData = jQuery._data( src ),
		curData = jQuery._data( dest, oldData ),
		events = oldData.events;

	if ( events ) {
		delete curData.handle;
		curData.events = {};

		for ( type in events ) {
			for ( i = 0, l = events[ type ].length; i < l; i++ ) {
				jQuery.event.add( dest, type, events[ type ][ i ] );
			}
		}
	}

	// make the cloned public data object a copy from the original
	if ( curData.data ) {
		curData.data = jQuery.extend( {}, curData.data );
	}
}

function cloneFixAttributes( src, dest ) {
	var nodeName;

	// We do not need to do anything for non-Elements
	if ( dest.nodeType !== 1 ) {
		return;
	}

	// clearAttributes removes the attributes, which we don't want,
	// but also removes the attachEvent events, which we *do* want
	if ( dest.clearAttributes ) {
		dest.clearAttributes();
	}

	// mergeAttributes, in contrast, only merges back on the
	// original attributes, not the events
	if ( dest.mergeAttributes ) {
		dest.mergeAttributes( src );
	}

	nodeName = dest.nodeName.toLowerCase();

	if ( nodeName === "object" ) {
		// IE6-10 improperly clones children of object elements using classid.
		// IE10 throws NoModificationAllowedError if parent is null, #12132.
		if ( dest.parentNode ) {
			dest.outerHTML = src.outerHTML;
		}

		// This path appears unavoidable for IE9. When cloning an object
		// element in IE9, the outerHTML strategy above is not sufficient.
		// If the src has innerHTML and the destination does not,
		// copy the src.innerHTML into the dest.innerHTML. #10324
		if ( jQuery.support.html5Clone && (src.innerHTML && !jQuery.trim(dest.innerHTML)) ) {
			dest.innerHTML = src.innerHTML;
		}

	} else if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		// IE6-8 fails to persist the checked state of a cloned checkbox
		// or radio button. Worse, IE6-7 fail to give the cloned element
		// a checked appearance if the defaultChecked value isn't also set

		dest.defaultChecked = dest.checked = src.checked;

		// IE6-7 get confused and end up setting the value of a cloned
		// checkbox/radio button to an empty string instead of "on"
		if ( dest.value !== src.value ) {
			dest.value = src.value;
		}

	// IE6-8 fails to return the selected option to the default selected
	// state when cloning options
	} else if ( nodeName === "option" ) {
		dest.selected = src.defaultSelected;

	// IE6-8 fails to set the defaultValue to the correct value when
	// cloning other types of input fields
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;

	// IE blanks contents when cloning scripts
	} else if ( nodeName === "script" && dest.text !== src.text ) {
		dest.text = src.text;
	}

	// Event data gets referenced instead of copied if the expando
	// gets copied too
	dest.removeAttribute( jQuery.expando );
}

jQuery.buildFragment = function( args, context, scripts ) {
	var fragment, cacheable, cachehit,
		first = args[ 0 ];

	// Set context from what may come in as undefined or a jQuery collection or a node
	// Updated to fix #12266 where accessing context[0] could throw an exception in IE9/10 &
	// also doubles as fix for #8950 where plain objects caused createDocumentFragment exception
	context = context || document;
	context = !context.nodeType && context[0] || context;
	context = context.ownerDocument || context;

	// Only cache "small" (1/2 KB) HTML strings that are associated with the main document
	// Cloning options loses the selected state, so don't cache them
	// IE 6 doesn't like it when you put <object> or <embed> elements in a fragment
	// Also, WebKit does not clone 'checked' attributes on cloneNode, so don't cache
	// Lastly, IE6,7,8 will not correctly reuse cached fragments that were created from unknown elems #10501
	if ( args.length === 1 && typeof first === "string" && first.length < 512 && context === document &&
		first.charAt(0) === "<" && !rnocache.test( first ) &&
		(jQuery.support.checkClone || !rchecked.test( first )) &&
		(jQuery.support.html5Clone || !rnoshimcache.test( first )) ) {

		// Mark cacheable and look for a hit
		cacheable = true;
		fragment = jQuery.fragments[ first ];
		cachehit = fragment !== undefined;
	}

	if ( !fragment ) {
		fragment = context.createDocumentFragment();
		jQuery.clean( args, context, fragment, scripts );

		// Update the cache, but only store false
		// unless this is a second parsing of the same content
		if ( cacheable ) {
			jQuery.fragments[ first ] = cachehit && fragment;
		}
	}

	return { fragment: fragment, cacheable: cacheable };
};

jQuery.fragments = {};

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			i = 0,
			ret = [],
			insert = jQuery( selector ),
			l = insert.length,
			parent = this.length === 1 && this[0].parentNode;

		if ( (parent == null || parent && parent.nodeType === 11 && parent.childNodes.length === 1) && l === 1 ) {
			insert[ original ]( this[0] );
			return this;
		} else {
			for ( ; i < l; i++ ) {
				elems = ( i > 0 ? this.clone(true) : this ).get();
				jQuery( insert[i] )[ original ]( elems );
				ret = ret.concat( elems );
			}

			return this.pushStack( ret, name, insert.selector );
		}
	};
});

function getAll( elem ) {
	if ( typeof elem.getElementsByTagName !== "undefined" ) {
		return elem.getElementsByTagName( "*" );

	} else if ( typeof elem.querySelectorAll !== "undefined" ) {
		return elem.querySelectorAll( "*" );

	} else {
		return [];
	}
}

// Used in clean, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
	if ( rcheckableType.test( elem.type ) ) {
		elem.defaultChecked = elem.checked;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var srcElements,
			destElements,
			i,
			clone;

		if ( jQuery.support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ) {
			clone = elem.cloneNode( true );

		// IE<=8 does not properly clone detached, unknown element nodes
		} else {
			fragmentDiv.innerHTML = elem.outerHTML;
			fragmentDiv.removeChild( clone = fragmentDiv.firstChild );
		}

		if ( (!jQuery.support.noCloneEvent || !jQuery.support.noCloneChecked) &&
				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {
			// IE copies events bound via attachEvent when using cloneNode.
			// Calling detachEvent on the clone will also remove the events
			// from the original. In order to get around this, we use some
			// proprietary methods to clear the events. Thanks to MooTools
			// guys for this hotness.

			cloneFixAttributes( elem, clone );

			// Using Sizzle here is crazy slow, so we use getElementsByTagName instead
			srcElements = getAll( elem );
			destElements = getAll( clone );

			// Weird iteration because IE will replace the length property
			// with an element if you are cloning the body and one of the
			// elements on the page has a name or id of "length"
			for ( i = 0; srcElements[i]; ++i ) {
				// Ensure that the destination node is not null; Fixes #9587
				if ( destElements[i] ) {
					cloneFixAttributes( srcElements[i], destElements[i] );
				}
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			cloneCopyEvent( elem, clone );

			if ( deepDataAndEvents ) {
				srcElements = getAll( elem );
				destElements = getAll( clone );

				for ( i = 0; srcElements[i]; ++i ) {
					cloneCopyEvent( srcElements[i], destElements[i] );
				}
			}
		}

		srcElements = destElements = null;

		// Return the cloned set
		return clone;
	},

	clean: function( elems, context, fragment, scripts ) {
		var i, j, elem, tag, wrap, depth, div, hasBody, tbody, len, handleScript, jsTags,
			safe = context === document && safeFragment,
			ret = [];

		// Ensure that context is a document
		if ( !context || typeof context.createDocumentFragment === "undefined" ) {
			context = document;
		}

		// Use the already-created safe fragment if context permits
		for ( i = 0; (elem = elems[i]) != null; i++ ) {
			if ( typeof elem === "number" ) {
				elem += "";
			}

			if ( !elem ) {
				continue;
			}

			// Convert html string into DOM nodes
			if ( typeof elem === "string" ) {
				if ( !rhtml.test( elem ) ) {
					elem = context.createTextNode( elem );
				} else {
					// Ensure a safe container in which to render the html
					safe = safe || createSafeFragment( context );
					div = context.createElement("div");
					safe.appendChild( div );

					// Fix "XHTML"-style tags in all browsers
					elem = elem.replace(rxhtmlTag, "<$1></$2>");

					// Go to html and back, then peel off extra wrappers
					tag = ( rtagName.exec( elem ) || ["", ""] )[1].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					depth = wrap[0];
					div.innerHTML = wrap[1] + elem + wrap[2];

					// Move to the right depth
					while ( depth-- ) {
						div = div.lastChild;
					}

					// Remove IE's autoinserted <tbody> from table fragments
					if ( !jQuery.support.tbody ) {

						// String was a <table>, *may* have spurious <tbody>
						hasBody = rtbody.test(elem);
							tbody = tag === "table" && !hasBody ?
								div.firstChild && div.firstChild.childNodes :

								// String was a bare <thead> or <tfoot>
								wrap[1] === "<table>" && !hasBody ?
									div.childNodes :
									[];

						for ( j = tbody.length - 1; j >= 0 ; --j ) {
							if ( jQuery.nodeName( tbody[ j ], "tbody" ) && !tbody[ j ].childNodes.length ) {
								tbody[ j ].parentNode.removeChild( tbody[ j ] );
							}
						}
					}

					// IE completely kills leading whitespace when innerHTML is used
					if ( !jQuery.support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
						div.insertBefore( context.createTextNode( rleadingWhitespace.exec(elem)[0] ), div.firstChild );
					}

					elem = div.childNodes;

					// Take out of fragment container (we need a fresh div each time)
					div.parentNode.removeChild( div );
				}
			}

			if ( elem.nodeType ) {
				ret.push( elem );
			} else {
				jQuery.merge( ret, elem );
			}
		}

		// Fix #11356: Clear elements from safeFragment
		if ( div ) {
			elem = div = safe = null;
		}

		// Reset defaultChecked for any radios and checkboxes
		// about to be appended to the DOM in IE 6/7 (#8060)
		if ( !jQuery.support.appendChecked ) {
			for ( i = 0; (elem = ret[i]) != null; i++ ) {
				if ( jQuery.nodeName( elem, "input" ) ) {
					fixDefaultChecked( elem );
				} else if ( typeof elem.getElementsByTagName !== "undefined" ) {
					jQuery.grep( elem.getElementsByTagName("input"), fixDefaultChecked );
				}
			}
		}

		// Append elements to a provided document fragment
		if ( fragment ) {
			// Special handling of each script element
			handleScript = function( elem ) {
				// Check if we consider it executable
				if ( !elem.type || rscriptType.test( elem.type ) ) {
					// Detach the script and store it in the scripts array (if provided) or the fragment
					// Return truthy to indicate that it has been handled
					return scripts ?
						scripts.push( elem.parentNode ? elem.parentNode.removeChild( elem ) : elem ) :
						fragment.appendChild( elem );
				}
			};

			for ( i = 0; (elem = ret[i]) != null; i++ ) {
				// Check if we're done after handling an executable script
				if ( !( jQuery.nodeName( elem, "script" ) && handleScript( elem ) ) ) {
					// Append to fragment and handle embedded scripts
					fragment.appendChild( elem );
					if ( typeof elem.getElementsByTagName !== "undefined" ) {
						// handleScript alters the DOM, so use jQuery.merge to ensure snapshot iteration
						jsTags = jQuery.grep( jQuery.merge( [], elem.getElementsByTagName("script") ), handleScript );

						// Splice the scripts into ret after their former ancestor and advance our index beyond them
						ret.splice.apply( ret, [i + 1, 0].concat( jsTags ) );
						i += jsTags.length;
					}
				}
			}
		}

		return ret;
	},

	cleanData: function( elems, /* internal */ acceptData ) {
		var data, id, elem, type,
			i = 0,
			internalKey = jQuery.expando,
			cache = jQuery.cache,
			deleteExpando = jQuery.support.deleteExpando,
			special = jQuery.event.special;

		for ( ; (elem = elems[i]) != null; i++ ) {

			if ( acceptData || jQuery.acceptData( elem ) ) {

				id = elem[ internalKey ];
				data = id && cache[ id ];

				if ( data ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Remove cache only if it was not already removed by jQuery.event.remove
					if ( cache[ id ] ) {

						delete cache[ id ];

						// IE does not allow us to delete expando properties from nodes,
						// nor does it have a removeAttribute function on Document nodes;
						// we must handle all of these cases
						if ( deleteExpando ) {
							delete elem[ internalKey ];

						} else if ( elem.removeAttribute ) {
							elem.removeAttribute( internalKey );

						} else {
							elem[ internalKey ] = null;
						}

						jQuery.deletedIds.push( id );
					}
				}
			}
		}
	}
});
// Limit scope pollution from any deprecated API
(function() {

var matched, browser;

// Use of jQuery.browser is frowned upon.
// More details: http://api.jquery.com/jQuery.browser
// jQuery.uaMatch maintained for back-compat
jQuery.uaMatch = function( ua ) {
	ua = ua.toLowerCase();

	var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
		/(webkit)[ \/]([\w.]+)/.exec( ua ) ||
		/(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
		/(msie) ([\w.]+)/.exec( ua ) ||
		ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
		[];

	return {
		browser: match[ 1 ] || "",
		version: match[ 2 ] || "0"
	};
};

matched = jQuery.uaMatch( navigator.userAgent );
browser = {};

if ( matched.browser ) {
	browser[ matched.browser ] = true;
	browser.version = matched.version;
}

// Chrome is Webkit, but Webkit is also Safari.
if ( browser.chrome ) {
	browser.webkit = true;
} else if ( browser.webkit ) {
	browser.safari = true;
}

jQuery.browser = browser;

jQuery.sub = function() {
	function jQuerySub( selector, context ) {
		return new jQuerySub.fn.init( selector, context );
	}
	jQuery.extend( true, jQuerySub, this );
	jQuerySub.superclass = this;
	jQuerySub.fn = jQuerySub.prototype = this();
	jQuerySub.fn.constructor = jQuerySub;
	jQuerySub.sub = this.sub;
	jQuerySub.fn.init = function init( selector, context ) {
		if ( context && context instanceof jQuery && !(context instanceof jQuerySub) ) {
			context = jQuerySub( context );
		}

		return jQuery.fn.init.call( this, selector, context, rootjQuerySub );
	};
	jQuerySub.fn.init.prototype = jQuerySub.fn;
	var rootjQuerySub = jQuerySub(document);
	return jQuerySub;
};

})();
var curCSS, iframe, iframeDoc,
	ralpha = /alpha\([^)]*\)/i,
	ropacity = /opacity=([^)]*)/,
	rposition = /^(top|right|bottom|left)$/,
	// swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rmargin = /^margin/,
	rnumsplit = new RegExp( "^(" + core_pnum + ")(.*)$", "i" ),
	rnumnonpx = new RegExp( "^(" + core_pnum + ")(?!px)[a-z%]+$", "i" ),
	rrelNum = new RegExp( "^([-+])=(" + core_pnum + ")", "i" ),
	elemdisplay = {},

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: 0,
		fontWeight: 400
	},

	cssExpand = [ "Top", "Right", "Bottom", "Left" ],
	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ],

	eventsToggle = jQuery.fn.toggle;

// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// check for vendor prefixed names
	var capName = name.charAt(0).toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function isHidden( elem, el ) {
	elem = el || elem;
	return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
}

function showHide( elements, show ) {
	var elem, display,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		values[ index ] = jQuery._data( elem, "olddisplay" );
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && elem.style.display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = jQuery._data( elem, "olddisplay", css_defaultDisplay(elem.nodeName) );
			}
		} else {
			display = curCSS( elem, "display" );

			if ( !values[ index ] && display !== "none" ) {
				jQuery._data( elem, "olddisplay", display );
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.fn.extend({
	css: function( name, value ) {
		return jQuery.access( this, function( elem, name, value ) {
			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state, fn2 ) {
		var bool = typeof state === "boolean";

		if ( jQuery.isFunction( state ) && jQuery.isFunction( fn2 ) ) {
			return eventsToggle.apply( this, arguments );
		}

		return this.each(function() {
			if ( bool ? state : isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;

				}
			}
		}
	},

	// Exclude the following css properties to add px
	cssNumber: {
		"fillOpacity": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": jQuery.support.cssFloat ? "cssFloat" : "styleFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that NaN and null values aren't set. See: #7116
			if ( value == null || type === "number" && isNaN( value ) ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
				// Wrapped to prevent IE from throwing errors when 'invalid' values are provided
				// Fixes bug #5509
				try {
					style[ name ] = value;
				} catch(e) {}
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, numeric, extra ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name );
		}

		//convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Return, converting to number if forced or a qualifier was provided and val looks numeric
		if ( numeric || extra !== undefined ) {
			num = parseFloat( val );
			return numeric || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	},

	// A method for quickly swapping in/out CSS properties to get correct calculations
	swap: function( elem, options, callback ) {
		var ret, name,
			old = {};

		// Remember the old values, and insert the new ones
		for ( name in options ) {
			old[ name ] = elem.style[ name ];
			elem.style[ name ] = options[ name ];
		}

		ret = callback.call( elem );

		// Revert the old values
		for ( name in options ) {
			elem.style[ name ] = old[ name ];
		}

		return ret;
	}
});

// NOTE: To any future maintainer, we've window.getComputedStyle
// because jsdom on node.js will break without it.
if ( window.getComputedStyle ) {
	curCSS = function( elem, name ) {
		var ret, width, minWidth, maxWidth,
			computed = window.getComputedStyle( elem, null ),
			style = elem.style;

		if ( computed ) {

			ret = computed[ name ];
			if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
				ret = jQuery.style( elem, name );
			}

			// A tribute to the "awesome hack by Dean Edwards"
			// Chrome < 17 and Safari 5.0 uses "computed value" instead of "used value" for margin-right
			// Safari 5.1.7 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
			// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
			if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {
				width = style.width;
				minWidth = style.minWidth;
				maxWidth = style.maxWidth;

				style.minWidth = style.maxWidth = style.width = ret;
				ret = computed.width;

				style.width = width;
				style.minWidth = minWidth;
				style.maxWidth = maxWidth;
			}
		}

		return ret;
	};
} else if ( document.documentElement.currentStyle ) {
	curCSS = function( elem, name ) {
		var left, rsLeft,
			ret = elem.currentStyle && elem.currentStyle[ name ],
			style = elem.style;

		// Avoid setting ret to empty string here
		// so we don't default to auto
		if ( ret == null && style && style[ name ] ) {
			ret = style[ name ];
		}

		// From the awesome hack by Dean Edwards
		// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

		// If we're not dealing with a regular pixel number
		// but a number that has a weird ending, we need to convert it to pixels
		// but not position css attributes, as those are proportional to the parent element instead
		// and we can't measure the parent instead because it might trigger a "stacking dolls" problem
		if ( rnumnonpx.test( ret ) && !rposition.test( name ) ) {

			// Remember the original values
			left = style.left;
			rsLeft = elem.runtimeStyle && elem.runtimeStyle.left;

			// Put in the new values to get a computed value out
			if ( rsLeft ) {
				elem.runtimeStyle.left = elem.currentStyle.left;
			}
			style.left = name === "fontSize" ? "1em" : ret;
			ret = style.pixelLeft + "px";

			// Revert the changed values
			style.left = left;
			if ( rsLeft ) {
				elem.runtimeStyle.left = rsLeft;
			}
		}

		return ret === "" ? "auto" : ret;
	};
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
			Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
			value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			// we use jQuery.css instead of curCSS here
			// because of the reliableMarginRight CSS hook!
			val += jQuery.css( elem, extra + cssExpand[ i ], true );
		}

		// From this point on we use curCSS for maximum performance (relevant in animations)
		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= parseFloat( curCSS( elem, "padding" + cssExpand[ i ] ) ) || 0;
			}

			// at this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= parseFloat( curCSS( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
			}
		} else {
			// at this point, extra isn't content, so add padding
			val += parseFloat( curCSS( elem, "padding" + cssExpand[ i ] ) ) || 0;

			// at this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += parseFloat( curCSS( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		valueIsBorderBox = true,
		isBorderBox = jQuery.support.boxSizing && jQuery.css( elem, "boxSizing" ) === "border-box";

	// some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// we need the check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox && ( jQuery.support.boxSizingReliable || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox
		)
	) + "px";
}


// Try to determine the default display value of an element
function css_defaultDisplay( nodeName ) {
	if ( elemdisplay[ nodeName ] ) {
		return elemdisplay[ nodeName ];
	}

	var elem = jQuery( "<" + nodeName + ">" ).appendTo( document.body ),
		display = elem.css("display");
	elem.remove();

	// If the simple way fails,
	// get element's real default display by attaching it to a temp iframe
	if ( display === "none" || display === "" ) {
		// Use the already-created iframe if possible
		iframe = document.body.appendChild(
			iframe || jQuery.extend( document.createElement("iframe"), {
				frameBorder: 0,
				width: 0,
				height: 0
			})
		);

		// Create a cacheable copy of the iframe document on first call.
		// IE and Opera will allow us to reuse the iframeDoc without re-writing the fake HTML
		// document to it; WebKit & Firefox won't allow reusing the iframe document.
		if ( !iframeDoc || !iframe.createElement ) {
			iframeDoc = ( iframe.contentWindow || iframe.contentDocument ).document;
			iframeDoc.write("<!doctype html><html><body>");
			iframeDoc.close();
		}

		elem = iframeDoc.body.appendChild( iframeDoc.createElement(nodeName) );

		display = curCSS( elem, "display" );
		document.body.removeChild( iframe );
	}

	// Store the correct default display
	elemdisplay[ nodeName ] = display;

	return display;
}

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				// certain elements can have dimension info if we invisibly show them
				// however, it must have a current display style that would benefit from this
				if ( elem.offsetWidth === 0 && rdisplayswap.test( curCSS( elem, "display" ) ) ) {
					return jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					});
				} else {
					return getWidthOrHeight( elem, name, extra );
				}
			}
		},

		set: function( elem, value, extra ) {
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.support.boxSizing && jQuery.css( elem, "boxSizing" ) === "border-box"
				) : 0
			);
		}
	};
});

if ( !jQuery.support.opacity ) {
	jQuery.cssHooks.opacity = {
		get: function( elem, computed ) {
			// IE uses filters for opacity
			return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
				( 0.01 * parseFloat( RegExp.$1 ) ) + "" :
				computed ? "1" : "";
		},

		set: function( elem, value ) {
			var style = elem.style,
				currentStyle = elem.currentStyle,
				opacity = jQuery.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
				filter = currentStyle && currentStyle.filter || style.filter || "";

			// IE has trouble with opacity if it does not have layout
			// Force it by setting the zoom level
			style.zoom = 1;

			// if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
			if ( value >= 1 && jQuery.trim( filter.replace( ralpha, "" ) ) === "" &&
				style.removeAttribute ) {

				// Setting style.filter to null, "" & " " still leave "filter:" in the cssText
				// if "filter:" is present at all, clearType is disabled, we want to avoid this
				// style.removeAttribute is IE Only, but so apparently is this code path...
				style.removeAttribute( "filter" );

				// if there there is no filter style applied in a css rule, we are done
				if ( currentStyle && !currentStyle.filter ) {
					return;
				}
			}

			// otherwise, set new filter values
			style.filter = ralpha.test( filter ) ?
				filter.replace( ralpha, opacity ) :
				filter + " " + opacity;
		}
	};
}

// These hooks cannot be added until DOM ready because the support test
// for it is not run until after DOM ready
jQuery(function() {
	if ( !jQuery.support.reliableMarginRight ) {
		jQuery.cssHooks.marginRight = {
			get: function( elem, computed ) {
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// Work around by temporarily setting element display to inline-block
				return jQuery.swap( elem, { "display": "inline-block" }, function() {
					if ( computed ) {
						return curCSS( elem, "marginRight" );
					}
				});
			}
		};
	}

	// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
	// getComputedStyle returns percent when specified for top/left/bottom/right
	// rather than make the css module depend on the offset module, we just check for it here
	if ( !jQuery.support.pixelPosition && jQuery.fn.position ) {
		jQuery.each( [ "top", "left" ], function( i, prop ) {
			jQuery.cssHooks[ prop ] = {
				get: function( elem, computed ) {
					if ( computed ) {
						var ret = curCSS( elem, prop );
						// if curCSS returns percentage, fallback to offset
						return rnumnonpx.test( ret ) ? jQuery( elem ).position()[ prop ] + "px" : ret;
					}
				}
			};
		});
	}

});

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.hidden = function( elem ) {
		return ( elem.offsetWidth === 0 && elem.offsetHeight === 0 ) || (!jQuery.support.reliableHiddenOffsets && ((elem.style && elem.style.display) || curCSS( elem, "display" )) === "none");
	};

	jQuery.expr.filters.visible = function( elem ) {
		return !jQuery.expr.filters.hidden( elem );
	};
}

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i,

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ],
				expanded = {};

			for ( i = 0; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});
var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
	rselectTextarea = /^(?:select|textarea)/i;

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function(){
			return this.elements ? jQuery.makeArray( this.elements ) : this;
		})
		.filter(function(){
			return this.name && !this.disabled &&
				( this.checked || rselectTextarea.test( this.nodeName ) ||
					rinput.test( this.type ) );
		})
		.map(function( i, elem ){
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val, i ){
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});

//Serialize an array of form elements or a set of
//key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// If array item is non-scalar (array or object), encode its
				// numeric index to resolve deserialization ambiguity issues.
				// Note that rack (as of 1.0.0) can't currently deserialize
				// nested arrays properly, and attempting to do so may cause
				// a server error. Possible fixes are to modify rack's
				// deserialization algorithm or to provide an option or flag
				// to force array serialization to be shallow.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}
var // Document location
	ajaxLocation,
	// Document location segments
	ajaxLocParts,

	rhash = /#.*$/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rquery = /\?/,
	rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
	rts = /([?&])_=[^&]*/,
	rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,

	// Keep a copy of the old load method
	_load = jQuery.fn.load,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = ["*/"] + ["*"];

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType, list, placeBefore,
			dataTypes = dataTypeExpression.toLowerCase().split( core_rspace ),
			i = 0,
			length = dataTypes.length;

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			for ( ; i < length; i++ ) {
				dataType = dataTypes[ i ];
				// We control if we're asked to add before
				// any existing element
				placeBefore = /^\+/.test( dataType );
				if ( placeBefore ) {
					dataType = dataType.substr( 1 ) || "*";
				}
				list = structure[ dataType ] = structure[ dataType ] || [];
				// then we add to the structure accordingly
				list[ placeBefore ? "unshift" : "push" ]( func );
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR,
		dataType /* internal */, inspected /* internal */ ) {

	dataType = dataType || options.dataTypes[ 0 ];
	inspected = inspected || {};

	inspected[ dataType ] = true;

	var selection,
		list = structure[ dataType ],
		i = 0,
		length = list ? list.length : 0,
		executeOnly = ( structure === prefilters );

	for ( ; i < length && ( executeOnly || !selection ); i++ ) {
		selection = list[ i ]( options, originalOptions, jqXHR );
		// If we got redirected to another dataType
		// we try there if executing only and not done already
		if ( typeof selection === "string" ) {
			if ( !executeOnly || inspected[ selection ] ) {
				selection = undefined;
			} else {
				options.dataTypes.unshift( selection );
				selection = inspectPrefiltersOrTransports(
						structure, options, originalOptions, jqXHR, selection, inspected );
			}
		}
	}
	// If we're only executing or nothing was selected
	// we try the catchall dataType if not done already
	if ( ( executeOnly || !selection ) && !inspected[ "*" ] ) {
		selection = inspectPrefiltersOrTransports(
				structure, options, originalOptions, jqXHR, "*", inspected );
	}
	// unnecessary when only executing (prefilters)
	// but it'll be ignored by the caller in that case
	return selection;
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};
	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}
}

jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	// Don't do a request if no elements are being requested
	if ( !this.length ) {
		return this;
	}

	var selector, type, response,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = url.slice( off, url.length );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// Request the remote document
	jQuery.ajax({
		url: url,

		// if "type" variable is undefined, then "GET" method will be used
		type: type,
		dataType: "html",
		data: params,
		complete: function( jqXHR, status ) {
			if ( callback ) {
				self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
			}
		}
	}).done(function( responseText ) {

		// Save response for use in complete callback
		response = arguments;

		// See if a selector was specified
		self.html( selector ?

			// Create a dummy div to hold the results
			jQuery("<div>")

				// inject the contents of the document in, removing the scripts
				// to avoid any 'Permission Denied' errors in IE
				.append( responseText.replace( rscript, "" ) )

				// Locate the specified elements
				.find( selector ) :

			// If not, just inject the full result
			responseText );

	});

	return this;
};

// Attach a bunch of functions for handling common AJAX events
jQuery.each( "ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split( " " ), function( i, o ){
	jQuery.fn[ o ] = function( f ){
		return this.on( o, f );
	};
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			type: method,
			url: url,
			data: data,
			success: callback,
			dataType: type
		});
	};
});

jQuery.extend({

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		if ( settings ) {
			// Building a settings object
			ajaxExtend( target, jQuery.ajaxSettings );
		} else {
			// Extending ajaxSettings
			settings = target;
			target = jQuery.ajaxSettings;
		}
		ajaxExtend( target, settings );
		return target;
	},

	ajaxSettings: {
		url: ajaxLocation,
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		type: "GET",
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		processData: true,
		async: true,
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			xml: "application/xml, text/xml",
			html: "text/html",
			text: "text/plain",
			json: "application/json, text/javascript",
			"*": allTypes
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText"
		},

		// List of data converters
		// 1) key format is "source_type destination_type" (a single space in-between)
		// 2) the catchall symbol "*" can be used for source_type
		converters: {

			// Convert anything to text
			"* text": window.String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			context: true,
			url: true
		}
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var // ifModified key
			ifModifiedKey,
			// Response headers
			responseHeadersString,
			responseHeaders,
			// transport
			transport,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events
			// It's the callbackContext if one was provided in the options
			// and if it's a DOM node or a jQuery collection
			globalEventContext = callbackContext !== s &&
				( callbackContext.nodeType || callbackContext instanceof jQuery ) ?
						jQuery( callbackContext ) : jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {

				readyState: 0,

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( !state ) {
						var lname = name.toLowerCase();
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match === undefined ? null : match;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					statusText = statusText || strAbort;
					if ( transport ) {
						transport.abort( statusText );
					}
					done( 0, statusText );
					return this;
				}
			};

		// Callback for when everything is done
		// It is defined here because jslint complains if it is declared
		// at the end of the function (which would be more logical and readable)
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// If successful, handle type chaining
			if ( status >= 200 && status < 300 || status === 304 ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {

					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ ifModifiedKey ] = modified;
					}
					modified = jqXHR.getResponseHeader("Etag");
					if ( modified ) {
						jQuery.etag[ ifModifiedKey ] = modified;
					}
				}

				// If not modified
				if ( status === 304 ) {

					statusText = "notmodified";
					isSuccess = true;

				// If we have data
				} else {

					isSuccess = ajaxConvert( s, response );
					statusText = isSuccess.state;
					success = isSuccess.data;
					error = isSuccess.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( !statusText || status ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = "" + ( nativeStatusText || statusText );

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajax" + ( isSuccess ? "Success" : "Error" ),
						[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		// Attach deferreds
		deferred.promise( jqXHR );
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;
		jqXHR.complete = completeDeferred.add;

		// Status-dependent callbacks
		jqXHR.statusCode = function( map ) {
			if ( map ) {
				var tmp;
				if ( state < 2 ) {
					for ( tmp in map ) {
						statusCode[ tmp ] = [ statusCode[tmp], map[tmp] ];
					}
				} else {
					tmp = map[ jqXHR.status ];
					jqXHR.always( tmp );
				}
			}
			return this;
		};

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// We also use the url parameter if available
		s.url = ( ( url || s.url ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().split( core_rspace );

		// Determine if a cross-domain request is in order
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] != ajaxLocParts[ 1 ] || parts[ 2 ] != ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? 80 : 443 ) ) !=
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Get ifModifiedKey before adding the anti-cache parameter
			ifModifiedKey = s.url;

			// Add anti-cache in url if needed
			if ( s.cache === false ) {

				var ts = jQuery.now(),
					// try replacing _= if it is there
					ret = s.url.replace( rts, "$1_=" + ts );

				// if nothing was replaced, add timestamp to the end
				s.url = ret + ( ( ret === s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "" );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			ifModifiedKey = ifModifiedKey || s.url;
			if ( jQuery.lastModified[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ ifModifiedKey ] );
			}
			if ( jQuery.etag[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ ifModifiedKey ] );
			}
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
				// Abort if not done already and return
				return jqXHR.abort();

		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;
			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout( function(){
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch (e) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		return jqXHR;
	},

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {}

});

/* Handles responses to an ajax request:
 * - sets all responseXXX fields accordingly
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes,
		responseFields = s.responseFields;

	// Fill responseXXX fields
	for ( type in responseFields ) {
		if ( type in responses ) {
			jqXHR[ responseFields[type] ] = responses[ type ];
		}
	}

	// Remove auto dataType and get content-type in the process
	while( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "content-type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

// Chain conversions given the request and the original response
function ajaxConvert( s, response ) {

	var conv, conv2, current, tmp,
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice(),
		prev = dataTypes[ 0 ],
		converters = {},
		i = 0;

	// Apply the dataFilter if provided
	if ( s.dataFilter ) {
		response = s.dataFilter( response, s.dataType );
	}

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	// Convert to each sequential dataType, tolerating list modification
	for ( ; (current = dataTypes[++i]); ) {

		// There's only work to do if current dataType is non-auto
		if ( current !== "*" ) {

			// Convert response if prev dataType is non-auto and differs from current
			if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split(" ");
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.splice( i--, 0, current );
								}

								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s["throws"] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}

			// Update prev for next iteration
			prev = current;
		}
	}

	return { state: "success", data: response };
}
var oldCallbacks = [],
	rquestion = /\?/,
	rjsonp = /(=)\?(?=&|$)|\?\?/,
	nonce = jQuery.now();

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		data = s.data,
		url = s.url,
		hasCallback = s.jsonp !== false,
		replaceInUrl = hasCallback && rjsonp.test( url ),
		replaceInData = hasCallback && !replaceInUrl && typeof data === "string" &&
			!( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") &&
			rjsonp.test( data );

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( s.dataTypes[ 0 ] === "jsonp" || replaceInUrl || replaceInData ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;
		overwritten = window[ callbackName ];

		// Insert callback into url or form data
		if ( replaceInUrl ) {
			s.url = url.replace( rjsonp, "$1" + callbackName );
		} else if ( replaceInData ) {
			s.data = data.replace( rjsonp, "$1" + callbackName );
		} else if ( hasCallback ) {
			s.url += ( rquestion.test( url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});
// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /javascript|ecmascript/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement( "script" );

				script.async = "async";

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( head && script.parentNode ) {
							head.removeChild( script );
						}

						// Dereference the script
						script = undefined;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};
				// Use insertBefore instead of appendChild  to circumvent an IE6 bug.
				// This arises when a base node is used (#2709 and #4378).
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( 0, 1 );
				}
			}
		};
	}
});
var xhrCallbacks,
	// #5280: Internet Explorer will keep connections alive if we don't abort on unload
	xhrOnUnloadAbort = window.ActiveXObject ? function() {
		// Abort all pending requests
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]( 0, 1 );
		}
	} : false,
	xhrId = 0;

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
	} catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject ?
	/* Microsoft failed to properly
	 * implement the XMLHttpRequest in IE7 (can't request local files),
	 * so we use the ActiveXObject when it is available
	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
	 * we need a fallback.
	 */
	function() {
		return !this.isLocal && createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

// Determine support properties
(function( xhr ) {
	jQuery.extend( jQuery.support, {
		ajax: !!xhr,
		cors: !!xhr && ( "withCredentials" in xhr )
	});
})( jQuery.ajaxSettings.xhr() );

// Create transport if the browser can provide an xhr
if ( jQuery.support.ajax ) {

	jQuery.ajaxTransport(function( s ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !s.crossDomain || jQuery.support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {

					// Get a new xhr
					var handle, i,
						xhr = s.xhr();

					// Open the socket
					// Passing null username, generates a login popup on Opera (#2865)
					if ( s.username ) {
						xhr.open( s.type, s.url, s.async, s.username, s.password );
					} else {
						xhr.open( s.type, s.url, s.async );
					}

					// Apply custom fields if provided
					if ( s.xhrFields ) {
						for ( i in s.xhrFields ) {
							xhr[ i ] = s.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( s.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( s.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
						headers[ "X-Requested-With" ] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {
						for ( i in headers ) {
							xhr.setRequestHeader( i, headers[ i ] );
						}
					} catch( _ ) {}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( s.hasContent && s.data ) || null );

					// Listener
					callback = function( _, isAbort ) {

						var status,
							statusText,
							responseHeaders,
							responses,
							xml;

						// Firefox throws exceptions when accessing properties
						// of an xhr when a network error occurred
						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
						try {

							// Was never called and is aborted or complete
							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

								// Only called once
								callback = undefined;

								// Do not keep as active anymore
								if ( handle ) {
									xhr.onreadystatechange = jQuery.noop;
									if ( xhrOnUnloadAbort ) {
										delete xhrCallbacks[ handle ];
									}
								}

								// If it's an abort
								if ( isAbort ) {
									// Abort it manually if needed
									if ( xhr.readyState !== 4 ) {
										xhr.abort();
									}
								} else {
									status = xhr.status;
									responseHeaders = xhr.getAllResponseHeaders();
									responses = {};
									xml = xhr.responseXML;

									// Construct response list
									if ( xml && xml.documentElement /* #4958 */ ) {
										responses.xml = xml;
									}

									// When requesting binary data, IE6-9 will throw an exception
									// on any attempt to access responseText (#11426)
									try {
										responses.text = xhr.responseText;
									} catch( _ ) {
									}

									// Firefox throws an exception when accessing
									// statusText for faulty cross-domain requests
									try {
										statusText = xhr.statusText;
									} catch( e ) {
										// We normalize with Webkit giving an empty statusText
										statusText = "";
									}

									// Filter status for non standard behaviors

									// If the request is local and we have data: assume a success
									// (success with no data won't get notified, that's the best we
									// can do given current implementations)
									if ( !status && s.isLocal && !s.crossDomain ) {
										status = responses.text ? 200 : 404;
									// IE - #1450: sometimes returns 1223 when it should be 204
									} else if ( status === 1223 ) {
										status = 204;
									}
								}
							}
						} catch( firefoxAccessException ) {
							if ( !isAbort ) {
								complete( -1, firefoxAccessException );
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, responseHeaders );
						}
					};

					if ( !s.async ) {
						// if we're in sync mode we fire the callback
						callback();
					} else if ( xhr.readyState === 4 ) {
						// (IE6 & IE7) if it's in cache and has been
						// retrieved directly we need to fire the callback
						setTimeout( callback, 0 );
					} else {
						handle = ++xhrId;
						if ( xhrOnUnloadAbort ) {
							// Create the active xhrs callbacks list if needed
							// and attach the unload handler
							if ( !xhrCallbacks ) {
								xhrCallbacks = {};
								jQuery( window ).unload( xhrOnUnloadAbort );
							}
							// Add to list of active xhrs callbacks
							xhrCallbacks[ handle ] = callback;
						}
						xhr.onreadystatechange = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback(0,1);
					}
				}
			};
		}
	});
}
var fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([-+])=|)(" + core_pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [function( prop, value ) {
			var end, unit, prevScale,
				tween = this.createTween( prop, value ),
				parts = rfxnum.exec( value ),
				target = tween.cur(),
				start = +target || 0,
				scale = 1;

			if ( parts ) {
				end = +parts[2];
				unit = parts[3] || ( jQuery.cssNumber[ prop ] ? "" : "px" );

				// We need to compute starting value
				if ( unit !== "px" && start ) {
					// Iteratively approximate from a nonzero starting point
					// Prefer the current property, because this process will be trivial if it uses the same units
					// Fallback to end or a simple constant
					start = jQuery.css( tween.elem, prop, true ) || end || 1;

					do {
						// If previous iteration zeroed out, double until we get *something*
						// Use a string for doubling factor so we don't accidentally see scale as unchanged below
						prevScale = scale = scale || ".5";

						// Adjust and apply
						start = start / scale;
						jQuery.style( tween.elem, prop, start + unit );

						// Update scale, tolerating zeroes from tween.cur()
						scale = tween.cur() / target;

					// Stop looping if we've hit the mark or scale is unchanged
					} while ( scale !== 1 && scale !== prevScale );
				}

				tween.unit = unit;
				tween.start = start;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[1] ? start + ( parts[1] + 1 ) * end : end;
			}
			return tween;
		}]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	}, 0 );
	return ( fxNow = jQuery.now() );
}

function createTweens( animation, props ) {
	jQuery.each( props, function( prop, value ) {
		var collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
			index = 0,
			length = collection.length;
		for ( ; index < length; index++ ) {
			if ( collection[ index ].call( animation, prop, value ) ) {

				// we're done with this property
				return;
			}
		}
	});
}

function Animation( elem, properties, options ) {
	var result,
		index = 0,
		tweenerIndex = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				percent = 1 - ( remaining / animation.duration || 0 ),
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end, easing ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;

				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	createTweens( animation, props );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			anim: animation,
			queue: animation.opts.queue,
			elem: elem
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

function defaultPrefilter( elem, props, opts ) {
	var index, prop, value, length, dataShow, tween, hooks, oldfire,
		anim = this,
		style = elem.style,
		orig = {},
		handled = [],
		hidden = elem.nodeType && isHidden( elem );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE does not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		if ( jQuery.css( elem, "display" ) === "inline" &&
				jQuery.css( elem, "float" ) === "none" ) {

			// inline-level elements accept inline-block;
			// block-level elements need to be inline with layout
			if ( !jQuery.support.inlineBlockNeedsLayout || css_defaultDisplay( elem.nodeName ) === "inline" ) {
				style.display = "inline-block";

			} else {
				style.zoom = 1;
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		if ( !jQuery.support.shrinkWrapBlocks ) {
			anim.done(function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			});
		}
	}


	// show/hide pass
	for ( index in props ) {
		value = props[ index ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ index ];
			if ( value === ( hidden ? "hide" : "show" ) ) {
				continue;
			}
			handled.push( index );
		}
	}

	length = handled.length;
	if ( length ) {
		dataShow = jQuery._data( elem, "fxshow" ) || jQuery._data( elem, "fxshow", {} );
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;
			jQuery.removeData( elem, "fxshow", true );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( index = 0 ; index < length ; index++ ) {
			prop = handled[ index ];
			tween = anim.createTween( prop, hidden ? dataShow[ prop ] : 0 );
			orig[ prop ] = dataShow[ prop ] || jQuery.style( elem, prop );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}
	}
}

function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing any value as a 4th parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = jQuery.css( tween.elem, tween.prop, false, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Remove in 2.0 - this supports IE8's panic based approach
// to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ||
			// special check for .toggle( handler, handler, ... )
			( !i && jQuery.isFunction( speed ) && jQuery.isFunction( easing ) ) ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations resolve immediately
				if ( empty ) {
					anim.stop( true );
				}
			};

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = jQuery._data( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	}
});

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		attrs = { height: type },
		i = 0;

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth? 1 : 0;
	for( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p*Math.PI ) / 2;
	}
};

jQuery.timers = [];
jQuery.fx = Tween.prototype.init;
jQuery.fx.tick = function() {
	var timer,
		timers = jQuery.timers,
		i = 0;

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
};

jQuery.fx.timer = function( timer ) {
	if ( timer() && jQuery.timers.push( timer ) && !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.interval = 13;

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};

// Back Compat <1.8 extension point
jQuery.fx.step = {};

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep(jQuery.timers, function( fn ) {
			return elem === fn.elem;
		}).length;
	};
}
var rroot = /^(?:body|html)$/i;

jQuery.fn.offset = function( options ) {
	if ( arguments.length ) {
		return options === undefined ?
			this :
			this.each(function( i ) {
				jQuery.offset.setOffset( this, options, i );
			});
	}

	var box, docElem, body, win, clientTop, clientLeft, scrollTop, scrollLeft, top, left,
		elem = this[ 0 ],
		doc = elem && elem.ownerDocument;

	if ( !doc ) {
		return;
	}

	if ( (body = doc.body) === elem ) {
		return jQuery.offset.bodyOffset( elem );
	}

	docElem = doc.documentElement;

	// Make sure we're not dealing with a disconnected DOM node
	if ( !jQuery.contains( docElem, elem ) ) {
		return { top: 0, left: 0 };
	}

	box = elem.getBoundingClientRect();
	win = getWindow( doc );
	clientTop  = docElem.clientTop  || body.clientTop  || 0;
	clientLeft = docElem.clientLeft || body.clientLeft || 0;
	scrollTop  = win.pageYOffset || docElem.scrollTop;
	scrollLeft = win.pageXOffset || docElem.scrollLeft;
	top  = box.top  + scrollTop  - clientTop;
	left = box.left + scrollLeft - clientLeft;

	return { top: top, left: left };
};

jQuery.offset = {

	bodyOffset: function( body ) {
		var top = body.offsetTop,
			left = body.offsetLeft;

		if ( jQuery.support.doesNotIncludeMarginInBodyOffset ) {
			top  += parseFloat( jQuery.css(body, "marginTop") ) || 0;
			left += parseFloat( jQuery.css(body, "marginLeft") ) || 0;
		}

		return { top: top, left: left };
	},

	setOffset: function( elem, options, i ) {
		var position = jQuery.css( elem, "position" );

		// set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		var curElem = jQuery( elem ),
			curOffset = curElem.offset(),
			curCSSTop = jQuery.css( elem, "top" ),
			curCSSLeft = jQuery.css( elem, "left" ),
			calculatePosition = ( position === "absolute" || position === "fixed" ) && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
			props = {}, curPosition = {}, curTop, curLeft;

		// need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;
		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	}
};


jQuery.fn.extend({

	position: function() {
		if ( !this[0] ) {
			return;
		}

		var elem = this[0],

		// Get *real* offsetParent
		offsetParent = this.offsetParent(),

		// Get correct offsets
		offset       = this.offset(),
		parentOffset = rroot.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset();

		// Subtract element margins
		// note: when an element has margin: auto the offsetLeft and marginLeft
		// are the same in Safari causing offset.left to incorrectly be 0
		offset.top  -= parseFloat( jQuery.css(elem, "marginTop") ) || 0;
		offset.left -= parseFloat( jQuery.css(elem, "marginLeft") ) || 0;

		// Add offsetParent borders
		parentOffset.top  += parseFloat( jQuery.css(offsetParent[0], "borderTopWidth") ) || 0;
		parentOffset.left += parseFloat( jQuery.css(offsetParent[0], "borderLeftWidth") ) || 0;

		// Subtract the two offsets
		return {
			top:  offset.top  - parentOffset.top,
			left: offset.left - parentOffset.left
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || document.body;
			while ( offsetParent && (!rroot.test(offsetParent.nodeName) && jQuery.css(offsetParent, "position") === "static") ) {
				offsetParent = offsetParent.offsetParent;
			}
			return offsetParent || document.body;
		});
	}
});


// Create scrollLeft and scrollTop methods
jQuery.each( {scrollLeft: "pageXOffset", scrollTop: "pageYOffset"}, function( method, prop ) {
	var top = /Y/.test( prop );

	jQuery.fn[ method ] = function( val ) {
		return jQuery.access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? (prop in win) ? win[ prop ] :
					win.document.documentElement[ method ] :
					elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : jQuery( win ).scrollLeft(),
					 top ? val : jQuery( win ).scrollTop()
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

function getWindow( elem ) {
	return jQuery.isWindow( elem ) ?
		elem :
		elem.nodeType === 9 ?
			elem.defaultView || elem.parentWindow :
			false;
}
// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return jQuery.access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height], whichever is greatest
					// unfortunately, this causes bug #3838 in IE6/8 only, but there is currently no good, small way to fix it.
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, value, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});
// Expose jQuery to the global object
window.jQuery = window.$ = jQuery;

// Expose jQuery as an AMD module, but only for AMD loaders that
// understand the issues with loading multiple versions of jQuery
// in a page that all might call define(). The loader will indicate
// they have special allowances for multiple jQuery versions by
// specifying define.amd.jQuery = true. Register as a named module,
// since jQuery can be concatenated with other files that may use define,
// but not use a proper concatenation script that understands anonymous
// AMD modules. A named AMD is safest and most robust way to register.
// Lowercase jquery is used because AMD module names are derived from
// file names, and jQuery is normally delivered in a lowercase file name.
// Do this after creating the global so that if an AMD module wants to call
// noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd && define.amd.jQuery ) {
	define( "jquery", [], function () { return jQuery; } );
}

return jQuery;

})( window ); }));

},{}],"jquery-browserify":[function(require,module,exports){
module.exports=require('UErKnN');
},{}],75:[function(require,module,exports){
var identifierStartTable = [];

for (var i = 0; i < 128; i++) {
  identifierStartTable[i] =
    i === 36 ||           // $
    i >= 65 && i <= 90 || // A-Z
    i === 95 ||           // _
    i >= 97 && i <= 122;  // a-z
}

var identifierPartTable = [];

for (var i = 0; i < 128; i++) {
  identifierPartTable[i] =
    identifierStartTable[i] || // $, _, A-Z, a-z
    i >= 48 && i <= 57;        // 0-9
}

module.exports = {
  asciiIdentifierStartTable: identifierStartTable,
  asciiIdentifierPartTable: identifierPartTable
};

},{}],76:[function(require,module,exports){
module.exports = [
  768,
  769,
  770,
  771,
  772,
  773,
  774,
  775,
  776,
  777,
  778,
  779,
  780,
  781,
  782,
  783,
  784,
  785,
  786,
  787,
  788,
  789,
  790,
  791,
  792,
  793,
  794,
  795,
  796,
  797,
  798,
  799,
  800,
  801,
  802,
  803,
  804,
  805,
  806,
  807,
  808,
  809,
  810,
  811,
  812,
  813,
  814,
  815,
  816,
  817,
  818,
  819,
  820,
  821,
  822,
  823,
  824,
  825,
  826,
  827,
  828,
  829,
  830,
  831,
  832,
  833,
  834,
  835,
  836,
  837,
  838,
  839,
  840,
  841,
  842,
  843,
  844,
  845,
  846,
  847,
  848,
  849,
  850,
  851,
  852,
  853,
  854,
  855,
  856,
  857,
  858,
  859,
  860,
  861,
  862,
  863,
  864,
  865,
  866,
  867,
  868,
  869,
  870,
  871,
  872,
  873,
  874,
  875,
  876,
  877,
  878,
  879,
  1155,
  1156,
  1157,
  1158,
  1159,
  1425,
  1426,
  1427,
  1428,
  1429,
  1430,
  1431,
  1432,
  1433,
  1434,
  1435,
  1436,
  1437,
  1438,
  1439,
  1440,
  1441,
  1442,
  1443,
  1444,
  1445,
  1446,
  1447,
  1448,
  1449,
  1450,
  1451,
  1452,
  1453,
  1454,
  1455,
  1456,
  1457,
  1458,
  1459,
  1460,
  1461,
  1462,
  1463,
  1464,
  1465,
  1466,
  1467,
  1468,
  1469,
  1471,
  1473,
  1474,
  1476,
  1477,
  1479,
  1552,
  1553,
  1554,
  1555,
  1556,
  1557,
  1558,
  1559,
  1560,
  1561,
  1562,
  1611,
  1612,
  1613,
  1614,
  1615,
  1616,
  1617,
  1618,
  1619,
  1620,
  1621,
  1622,
  1623,
  1624,
  1625,
  1626,
  1627,
  1628,
  1629,
  1630,
  1631,
  1632,
  1633,
  1634,
  1635,
  1636,
  1637,
  1638,
  1639,
  1640,
  1641,
  1648,
  1750,
  1751,
  1752,
  1753,
  1754,
  1755,
  1756,
  1759,
  1760,
  1761,
  1762,
  1763,
  1764,
  1767,
  1768,
  1770,
  1771,
  1772,
  1773,
  1776,
  1777,
  1778,
  1779,
  1780,
  1781,
  1782,
  1783,
  1784,
  1785,
  1809,
  1840,
  1841,
  1842,
  1843,
  1844,
  1845,
  1846,
  1847,
  1848,
  1849,
  1850,
  1851,
  1852,
  1853,
  1854,
  1855,
  1856,
  1857,
  1858,
  1859,
  1860,
  1861,
  1862,
  1863,
  1864,
  1865,
  1866,
  1958,
  1959,
  1960,
  1961,
  1962,
  1963,
  1964,
  1965,
  1966,
  1967,
  1968,
  1984,
  1985,
  1986,
  1987,
  1988,
  1989,
  1990,
  1991,
  1992,
  1993,
  2027,
  2028,
  2029,
  2030,
  2031,
  2032,
  2033,
  2034,
  2035,
  2070,
  2071,
  2072,
  2073,
  2075,
  2076,
  2077,
  2078,
  2079,
  2080,
  2081,
  2082,
  2083,
  2085,
  2086,
  2087,
  2089,
  2090,
  2091,
  2092,
  2093,
  2137,
  2138,
  2139,
  2276,
  2277,
  2278,
  2279,
  2280,
  2281,
  2282,
  2283,
  2284,
  2285,
  2286,
  2287,
  2288,
  2289,
  2290,
  2291,
  2292,
  2293,
  2294,
  2295,
  2296,
  2297,
  2298,
  2299,
  2300,
  2301,
  2302,
  2304,
  2305,
  2306,
  2307,
  2362,
  2363,
  2364,
  2366,
  2367,
  2368,
  2369,
  2370,
  2371,
  2372,
  2373,
  2374,
  2375,
  2376,
  2377,
  2378,
  2379,
  2380,
  2381,
  2382,
  2383,
  2385,
  2386,
  2387,
  2388,
  2389,
  2390,
  2391,
  2402,
  2403,
  2406,
  2407,
  2408,
  2409,
  2410,
  2411,
  2412,
  2413,
  2414,
  2415,
  2433,
  2434,
  2435,
  2492,
  2494,
  2495,
  2496,
  2497,
  2498,
  2499,
  2500,
  2503,
  2504,
  2507,
  2508,
  2509,
  2519,
  2530,
  2531,
  2534,
  2535,
  2536,
  2537,
  2538,
  2539,
  2540,
  2541,
  2542,
  2543,
  2561,
  2562,
  2563,
  2620,
  2622,
  2623,
  2624,
  2625,
  2626,
  2631,
  2632,
  2635,
  2636,
  2637,
  2641,
  2662,
  2663,
  2664,
  2665,
  2666,
  2667,
  2668,
  2669,
  2670,
  2671,
  2672,
  2673,
  2677,
  2689,
  2690,
  2691,
  2748,
  2750,
  2751,
  2752,
  2753,
  2754,
  2755,
  2756,
  2757,
  2759,
  2760,
  2761,
  2763,
  2764,
  2765,
  2786,
  2787,
  2790,
  2791,
  2792,
  2793,
  2794,
  2795,
  2796,
  2797,
  2798,
  2799,
  2817,
  2818,
  2819,
  2876,
  2878,
  2879,
  2880,
  2881,
  2882,
  2883,
  2884,
  2887,
  2888,
  2891,
  2892,
  2893,
  2902,
  2903,
  2914,
  2915,
  2918,
  2919,
  2920,
  2921,
  2922,
  2923,
  2924,
  2925,
  2926,
  2927,
  2946,
  3006,
  3007,
  3008,
  3009,
  3010,
  3014,
  3015,
  3016,
  3018,
  3019,
  3020,
  3021,
  3031,
  3046,
  3047,
  3048,
  3049,
  3050,
  3051,
  3052,
  3053,
  3054,
  3055,
  3073,
  3074,
  3075,
  3134,
  3135,
  3136,
  3137,
  3138,
  3139,
  3140,
  3142,
  3143,
  3144,
  3146,
  3147,
  3148,
  3149,
  3157,
  3158,
  3170,
  3171,
  3174,
  3175,
  3176,
  3177,
  3178,
  3179,
  3180,
  3181,
  3182,
  3183,
  3202,
  3203,
  3260,
  3262,
  3263,
  3264,
  3265,
  3266,
  3267,
  3268,
  3270,
  3271,
  3272,
  3274,
  3275,
  3276,
  3277,
  3285,
  3286,
  3298,
  3299,
  3302,
  3303,
  3304,
  3305,
  3306,
  3307,
  3308,
  3309,
  3310,
  3311,
  3330,
  3331,
  3390,
  3391,
  3392,
  3393,
  3394,
  3395,
  3396,
  3398,
  3399,
  3400,
  3402,
  3403,
  3404,
  3405,
  3415,
  3426,
  3427,
  3430,
  3431,
  3432,
  3433,
  3434,
  3435,
  3436,
  3437,
  3438,
  3439,
  3458,
  3459,
  3530,
  3535,
  3536,
  3537,
  3538,
  3539,
  3540,
  3542,
  3544,
  3545,
  3546,
  3547,
  3548,
  3549,
  3550,
  3551,
  3570,
  3571,
  3633,
  3636,
  3637,
  3638,
  3639,
  3640,
  3641,
  3642,
  3655,
  3656,
  3657,
  3658,
  3659,
  3660,
  3661,
  3662,
  3664,
  3665,
  3666,
  3667,
  3668,
  3669,
  3670,
  3671,
  3672,
  3673,
  3761,
  3764,
  3765,
  3766,
  3767,
  3768,
  3769,
  3771,
  3772,
  3784,
  3785,
  3786,
  3787,
  3788,
  3789,
  3792,
  3793,
  3794,
  3795,
  3796,
  3797,
  3798,
  3799,
  3800,
  3801,
  3864,
  3865,
  3872,
  3873,
  3874,
  3875,
  3876,
  3877,
  3878,
  3879,
  3880,
  3881,
  3893,
  3895,
  3897,
  3902,
  3903,
  3953,
  3954,
  3955,
  3956,
  3957,
  3958,
  3959,
  3960,
  3961,
  3962,
  3963,
  3964,
  3965,
  3966,
  3967,
  3968,
  3969,
  3970,
  3971,
  3972,
  3974,
  3975,
  3981,
  3982,
  3983,
  3984,
  3985,
  3986,
  3987,
  3988,
  3989,
  3990,
  3991,
  3993,
  3994,
  3995,
  3996,
  3997,
  3998,
  3999,
  4000,
  4001,
  4002,
  4003,
  4004,
  4005,
  4006,
  4007,
  4008,
  4009,
  4010,
  4011,
  4012,
  4013,
  4014,
  4015,
  4016,
  4017,
  4018,
  4019,
  4020,
  4021,
  4022,
  4023,
  4024,
  4025,
  4026,
  4027,
  4028,
  4038,
  4139,
  4140,
  4141,
  4142,
  4143,
  4144,
  4145,
  4146,
  4147,
  4148,
  4149,
  4150,
  4151,
  4152,
  4153,
  4154,
  4155,
  4156,
  4157,
  4158,
  4160,
  4161,
  4162,
  4163,
  4164,
  4165,
  4166,
  4167,
  4168,
  4169,
  4182,
  4183,
  4184,
  4185,
  4190,
  4191,
  4192,
  4194,
  4195,
  4196,
  4199,
  4200,
  4201,
  4202,
  4203,
  4204,
  4205,
  4209,
  4210,
  4211,
  4212,
  4226,
  4227,
  4228,
  4229,
  4230,
  4231,
  4232,
  4233,
  4234,
  4235,
  4236,
  4237,
  4239,
  4240,
  4241,
  4242,
  4243,
  4244,
  4245,
  4246,
  4247,
  4248,
  4249,
  4250,
  4251,
  4252,
  4253,
  4957,
  4958,
  4959,
  5906,
  5907,
  5908,
  5938,
  5939,
  5940,
  5970,
  5971,
  6002,
  6003,
  6068,
  6069,
  6070,
  6071,
  6072,
  6073,
  6074,
  6075,
  6076,
  6077,
  6078,
  6079,
  6080,
  6081,
  6082,
  6083,
  6084,
  6085,
  6086,
  6087,
  6088,
  6089,
  6090,
  6091,
  6092,
  6093,
  6094,
  6095,
  6096,
  6097,
  6098,
  6099,
  6109,
  6112,
  6113,
  6114,
  6115,
  6116,
  6117,
  6118,
  6119,
  6120,
  6121,
  6155,
  6156,
  6157,
  6160,
  6161,
  6162,
  6163,
  6164,
  6165,
  6166,
  6167,
  6168,
  6169,
  6313,
  6432,
  6433,
  6434,
  6435,
  6436,
  6437,
  6438,
  6439,
  6440,
  6441,
  6442,
  6443,
  6448,
  6449,
  6450,
  6451,
  6452,
  6453,
  6454,
  6455,
  6456,
  6457,
  6458,
  6459,
  6470,
  6471,
  6472,
  6473,
  6474,
  6475,
  6476,
  6477,
  6478,
  6479,
  6576,
  6577,
  6578,
  6579,
  6580,
  6581,
  6582,
  6583,
  6584,
  6585,
  6586,
  6587,
  6588,
  6589,
  6590,
  6591,
  6592,
  6600,
  6601,
  6608,
  6609,
  6610,
  6611,
  6612,
  6613,
  6614,
  6615,
  6616,
  6617,
  6679,
  6680,
  6681,
  6682,
  6683,
  6741,
  6742,
  6743,
  6744,
  6745,
  6746,
  6747,
  6748,
  6749,
  6750,
  6752,
  6753,
  6754,
  6755,
  6756,
  6757,
  6758,
  6759,
  6760,
  6761,
  6762,
  6763,
  6764,
  6765,
  6766,
  6767,
  6768,
  6769,
  6770,
  6771,
  6772,
  6773,
  6774,
  6775,
  6776,
  6777,
  6778,
  6779,
  6780,
  6783,
  6784,
  6785,
  6786,
  6787,
  6788,
  6789,
  6790,
  6791,
  6792,
  6793,
  6800,
  6801,
  6802,
  6803,
  6804,
  6805,
  6806,
  6807,
  6808,
  6809,
  6912,
  6913,
  6914,
  6915,
  6916,
  6964,
  6965,
  6966,
  6967,
  6968,
  6969,
  6970,
  6971,
  6972,
  6973,
  6974,
  6975,
  6976,
  6977,
  6978,
  6979,
  6980,
  6992,
  6993,
  6994,
  6995,
  6996,
  6997,
  6998,
  6999,
  7000,
  7001,
  7019,
  7020,
  7021,
  7022,
  7023,
  7024,
  7025,
  7026,
  7027,
  7040,
  7041,
  7042,
  7073,
  7074,
  7075,
  7076,
  7077,
  7078,
  7079,
  7080,
  7081,
  7082,
  7083,
  7084,
  7085,
  7088,
  7089,
  7090,
  7091,
  7092,
  7093,
  7094,
  7095,
  7096,
  7097,
  7142,
  7143,
  7144,
  7145,
  7146,
  7147,
  7148,
  7149,
  7150,
  7151,
  7152,
  7153,
  7154,
  7155,
  7204,
  7205,
  7206,
  7207,
  7208,
  7209,
  7210,
  7211,
  7212,
  7213,
  7214,
  7215,
  7216,
  7217,
  7218,
  7219,
  7220,
  7221,
  7222,
  7223,
  7232,
  7233,
  7234,
  7235,
  7236,
  7237,
  7238,
  7239,
  7240,
  7241,
  7248,
  7249,
  7250,
  7251,
  7252,
  7253,
  7254,
  7255,
  7256,
  7257,
  7376,
  7377,
  7378,
  7380,
  7381,
  7382,
  7383,
  7384,
  7385,
  7386,
  7387,
  7388,
  7389,
  7390,
  7391,
  7392,
  7393,
  7394,
  7395,
  7396,
  7397,
  7398,
  7399,
  7400,
  7405,
  7410,
  7411,
  7412,
  7616,
  7617,
  7618,
  7619,
  7620,
  7621,
  7622,
  7623,
  7624,
  7625,
  7626,
  7627,
  7628,
  7629,
  7630,
  7631,
  7632,
  7633,
  7634,
  7635,
  7636,
  7637,
  7638,
  7639,
  7640,
  7641,
  7642,
  7643,
  7644,
  7645,
  7646,
  7647,
  7648,
  7649,
  7650,
  7651,
  7652,
  7653,
  7654,
  7676,
  7677,
  7678,
  7679,
  8204,
  8205,
  8255,
  8256,
  8276,
  8400,
  8401,
  8402,
  8403,
  8404,
  8405,
  8406,
  8407,
  8408,
  8409,
  8410,
  8411,
  8412,
  8417,
  8421,
  8422,
  8423,
  8424,
  8425,
  8426,
  8427,
  8428,
  8429,
  8430,
  8431,
  8432,
  11503,
  11504,
  11505,
  11647,
  11744,
  11745,
  11746,
  11747,
  11748,
  11749,
  11750,
  11751,
  11752,
  11753,
  11754,
  11755,
  11756,
  11757,
  11758,
  11759,
  11760,
  11761,
  11762,
  11763,
  11764,
  11765,
  11766,
  11767,
  11768,
  11769,
  11770,
  11771,
  11772,
  11773,
  11774,
  11775,
  12330,
  12331,
  12332,
  12333,
  12334,
  12335,
  12441,
  12442,
  42528,
  42529,
  42530,
  42531,
  42532,
  42533,
  42534,
  42535,
  42536,
  42537,
  42607,
  42612,
  42613,
  42614,
  42615,
  42616,
  42617,
  42618,
  42619,
  42620,
  42621,
  42655,
  42736,
  42737,
  43010,
  43014,
  43019,
  43043,
  43044,
  43045,
  43046,
  43047,
  43136,
  43137,
  43188,
  43189,
  43190,
  43191,
  43192,
  43193,
  43194,
  43195,
  43196,
  43197,
  43198,
  43199,
  43200,
  43201,
  43202,
  43203,
  43204,
  43216,
  43217,
  43218,
  43219,
  43220,
  43221,
  43222,
  43223,
  43224,
  43225,
  43232,
  43233,
  43234,
  43235,
  43236,
  43237,
  43238,
  43239,
  43240,
  43241,
  43242,
  43243,
  43244,
  43245,
  43246,
  43247,
  43248,
  43249,
  43264,
  43265,
  43266,
  43267,
  43268,
  43269,
  43270,
  43271,
  43272,
  43273,
  43302,
  43303,
  43304,
  43305,
  43306,
  43307,
  43308,
  43309,
  43335,
  43336,
  43337,
  43338,
  43339,
  43340,
  43341,
  43342,
  43343,
  43344,
  43345,
  43346,
  43347,
  43392,
  43393,
  43394,
  43395,
  43443,
  43444,
  43445,
  43446,
  43447,
  43448,
  43449,
  43450,
  43451,
  43452,
  43453,
  43454,
  43455,
  43456,
  43472,
  43473,
  43474,
  43475,
  43476,
  43477,
  43478,
  43479,
  43480,
  43481,
  43561,
  43562,
  43563,
  43564,
  43565,
  43566,
  43567,
  43568,
  43569,
  43570,
  43571,
  43572,
  43573,
  43574,
  43587,
  43596,
  43597,
  43600,
  43601,
  43602,
  43603,
  43604,
  43605,
  43606,
  43607,
  43608,
  43609,
  43643,
  43696,
  43698,
  43699,
  43700,
  43703,
  43704,
  43710,
  43711,
  43713,
  43755,
  43756,
  43757,
  43758,
  43759,
  43765,
  43766,
  44003,
  44004,
  44005,
  44006,
  44007,
  44008,
  44009,
  44010,
  44012,
  44013,
  44016,
  44017,
  44018,
  44019,
  44020,
  44021,
  44022,
  44023,
  44024,
  44025,
  64286,
  65024,
  65025,
  65026,
  65027,
  65028,
  65029,
  65030,
  65031,
  65032,
  65033,
  65034,
  65035,
  65036,
  65037,
  65038,
  65039,
  65056,
  65057,
  65058,
  65059,
  65060,
  65061,
  65062,
  65075,
  65076,
  65101,
  65102,
  65103,
  65296,
  65297,
  65298,
  65299,
  65300,
  65301,
  65302,
  65303,
  65304,
  65305,
  65343
];

},{}],77:[function(require,module,exports){
module.exports = [
  170,
  181,
  186,
  192,
  193,
  194,
  195,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  210,
  211,
  212,
  213,
  214,
  216,
  217,
  218,
  219,
  220,
  221,
  222,
  223,
  224,
  225,
  226,
  227,
  228,
  229,
  230,
  231,
  232,
  233,
  234,
  235,
  236,
  237,
  238,
  239,
  240,
  241,
  242,
  243,
  244,
  245,
  246,
  248,
  249,
  250,
  251,
  252,
  253,
  254,
  255,
  256,
  257,
  258,
  259,
  260,
  261,
  262,
  263,
  264,
  265,
  266,
  267,
  268,
  269,
  270,
  271,
  272,
  273,
  274,
  275,
  276,
  277,
  278,
  279,
  280,
  281,
  282,
  283,
  284,
  285,
  286,
  287,
  288,
  289,
  290,
  291,
  292,
  293,
  294,
  295,
  296,
  297,
  298,
  299,
  300,
  301,
  302,
  303,
  304,
  305,
  306,
  307,
  308,
  309,
  310,
  311,
  312,
  313,
  314,
  315,
  316,
  317,
  318,
  319,
  320,
  321,
  322,
  323,
  324,
  325,
  326,
  327,
  328,
  329,
  330,
  331,
  332,
  333,
  334,
  335,
  336,
  337,
  338,
  339,
  340,
  341,
  342,
  343,
  344,
  345,
  346,
  347,
  348,
  349,
  350,
  351,
  352,
  353,
  354,
  355,
  356,
  357,
  358,
  359,
  360,
  361,
  362,
  363,
  364,
  365,
  366,
  367,
  368,
  369,
  370,
  371,
  372,
  373,
  374,
  375,
  376,
  377,
  378,
  379,
  380,
  381,
  382,
  383,
  384,
  385,
  386,
  387,
  388,
  389,
  390,
  391,
  392,
  393,
  394,
  395,
  396,
  397,
  398,
  399,
  400,
  401,
  402,
  403,
  404,
  405,
  406,
  407,
  408,
  409,
  410,
  411,
  412,
  413,
  414,
  415,
  416,
  417,
  418,
  419,
  420,
  421,
  422,
  423,
  424,
  425,
  426,
  427,
  428,
  429,
  430,
  431,
  432,
  433,
  434,
  435,
  436,
  437,
  438,
  439,
  440,
  441,
  442,
  443,
  444,
  445,
  446,
  447,
  448,
  449,
  450,
  451,
  452,
  453,
  454,
  455,
  456,
  457,
  458,
  459,
  460,
  461,
  462,
  463,
  464,
  465,
  466,
  467,
  468,
  469,
  470,
  471,
  472,
  473,
  474,
  475,
  476,
  477,
  478,
  479,
  480,
  481,
  482,
  483,
  484,
  485,
  486,
  487,
  488,
  489,
  490,
  491,
  492,
  493,
  494,
  495,
  496,
  497,
  498,
  499,
  500,
  501,
  502,
  503,
  504,
  505,
  506,
  507,
  508,
  509,
  510,
  511,
  512,
  513,
  514,
  515,
  516,
  517,
  518,
  519,
  520,
  521,
  522,
  523,
  524,
  525,
  526,
  527,
  528,
  529,
  530,
  531,
  532,
  533,
  534,
  535,
  536,
  537,
  538,
  539,
  540,
  541,
  542,
  543,
  544,
  545,
  546,
  547,
  548,
  549,
  550,
  551,
  552,
  553,
  554,
  555,
  556,
  557,
  558,
  559,
  560,
  561,
  562,
  563,
  564,
  565,
  566,
  567,
  568,
  569,
  570,
  571,
  572,
  573,
  574,
  575,
  576,
  577,
  578,
  579,
  580,
  581,
  582,
  583,
  584,
  585,
  586,
  587,
  588,
  589,
  590,
  591,
  592,
  593,
  594,
  595,
  596,
  597,
  598,
  599,
  600,
  601,
  602,
  603,
  604,
  605,
  606,
  607,
  608,
  609,
  610,
  611,
  612,
  613,
  614,
  615,
  616,
  617,
  618,
  619,
  620,
  621,
  622,
  623,
  624,
  625,
  626,
  627,
  628,
  629,
  630,
  631,
  632,
  633,
  634,
  635,
  636,
  637,
  638,
  639,
  640,
  641,
  642,
  643,
  644,
  645,
  646,
  647,
  648,
  649,
  650,
  651,
  652,
  653,
  654,
  655,
  656,
  657,
  658,
  659,
  660,
  661,
  662,
  663,
  664,
  665,
  666,
  667,
  668,
  669,
  670,
  671,
  672,
  673,
  674,
  675,
  676,
  677,
  678,
  679,
  680,
  681,
  682,
  683,
  684,
  685,
  686,
  687,
  688,
  689,
  690,
  691,
  692,
  693,
  694,
  695,
  696,
  697,
  698,
  699,
  700,
  701,
  702,
  703,
  704,
  705,
  710,
  711,
  712,
  713,
  714,
  715,
  716,
  717,
  718,
  719,
  720,
  721,
  736,
  737,
  738,
  739,
  740,
  748,
  750,
  880,
  881,
  882,
  883,
  884,
  886,
  887,
  890,
  891,
  892,
  893,
  902,
  904,
  905,
  906,
  908,
  910,
  911,
  912,
  913,
  914,
  915,
  916,
  917,
  918,
  919,
  920,
  921,
  922,
  923,
  924,
  925,
  926,
  927,
  928,
  929,
  931,
  932,
  933,
  934,
  935,
  936,
  937,
  938,
  939,
  940,
  941,
  942,
  943,
  944,
  945,
  946,
  947,
  948,
  949,
  950,
  951,
  952,
  953,
  954,
  955,
  956,
  957,
  958,
  959,
  960,
  961,
  962,
  963,
  964,
  965,
  966,
  967,
  968,
  969,
  970,
  971,
  972,
  973,
  974,
  975,
  976,
  977,
  978,
  979,
  980,
  981,
  982,
  983,
  984,
  985,
  986,
  987,
  988,
  989,
  990,
  991,
  992,
  993,
  994,
  995,
  996,
  997,
  998,
  999,
  1000,
  1001,
  1002,
  1003,
  1004,
  1005,
  1006,
  1007,
  1008,
  1009,
  1010,
  1011,
  1012,
  1013,
  1015,
  1016,
  1017,
  1018,
  1019,
  1020,
  1021,
  1022,
  1023,
  1024,
  1025,
  1026,
  1027,
  1028,
  1029,
  1030,
  1031,
  1032,
  1033,
  1034,
  1035,
  1036,
  1037,
  1038,
  1039,
  1040,
  1041,
  1042,
  1043,
  1044,
  1045,
  1046,
  1047,
  1048,
  1049,
  1050,
  1051,
  1052,
  1053,
  1054,
  1055,
  1056,
  1057,
  1058,
  1059,
  1060,
  1061,
  1062,
  1063,
  1064,
  1065,
  1066,
  1067,
  1068,
  1069,
  1070,
  1071,
  1072,
  1073,
  1074,
  1075,
  1076,
  1077,
  1078,
  1079,
  1080,
  1081,
  1082,
  1083,
  1084,
  1085,
  1086,
  1087,
  1088,
  1089,
  1090,
  1091,
  1092,
  1093,
  1094,
  1095,
  1096,
  1097,
  1098,
  1099,
  1100,
  1101,
  1102,
  1103,
  1104,
  1105,
  1106,
  1107,
  1108,
  1109,
  1110,
  1111,
  1112,
  1113,
  1114,
  1115,
  1116,
  1117,
  1118,
  1119,
  1120,
  1121,
  1122,
  1123,
  1124,
  1125,
  1126,
  1127,
  1128,
  1129,
  1130,
  1131,
  1132,
  1133,
  1134,
  1135,
  1136,
  1137,
  1138,
  1139,
  1140,
  1141,
  1142,
  1143,
  1144,
  1145,
  1146,
  1147,
  1148,
  1149,
  1150,
  1151,
  1152,
  1153,
  1162,
  1163,
  1164,
  1165,
  1166,
  1167,
  1168,
  1169,
  1170,
  1171,
  1172,
  1173,
  1174,
  1175,
  1176,
  1177,
  1178,
  1179,
  1180,
  1181,
  1182,
  1183,
  1184,
  1185,
  1186,
  1187,
  1188,
  1189,
  1190,
  1191,
  1192,
  1193,
  1194,
  1195,
  1196,
  1197,
  1198,
  1199,
  1200,
  1201,
  1202,
  1203,
  1204,
  1205,
  1206,
  1207,
  1208,
  1209,
  1210,
  1211,
  1212,
  1213,
  1214,
  1215,
  1216,
  1217,
  1218,
  1219,
  1220,
  1221,
  1222,
  1223,
  1224,
  1225,
  1226,
  1227,
  1228,
  1229,
  1230,
  1231,
  1232,
  1233,
  1234,
  1235,
  1236,
  1237,
  1238,
  1239,
  1240,
  1241,
  1242,
  1243,
  1244,
  1245,
  1246,
  1247,
  1248,
  1249,
  1250,
  1251,
  1252,
  1253,
  1254,
  1255,
  1256,
  1257,
  1258,
  1259,
  1260,
  1261,
  1262,
  1263,
  1264,
  1265,
  1266,
  1267,
  1268,
  1269,
  1270,
  1271,
  1272,
  1273,
  1274,
  1275,
  1276,
  1277,
  1278,
  1279,
  1280,
  1281,
  1282,
  1283,
  1284,
  1285,
  1286,
  1287,
  1288,
  1289,
  1290,
  1291,
  1292,
  1293,
  1294,
  1295,
  1296,
  1297,
  1298,
  1299,
  1300,
  1301,
  1302,
  1303,
  1304,
  1305,
  1306,
  1307,
  1308,
  1309,
  1310,
  1311,
  1312,
  1313,
  1314,
  1315,
  1316,
  1317,
  1318,
  1319,
  1329,
  1330,
  1331,
  1332,
  1333,
  1334,
  1335,
  1336,
  1337,
  1338,
  1339,
  1340,
  1341,
  1342,
  1343,
  1344,
  1345,
  1346,
  1347,
  1348,
  1349,
  1350,
  1351,
  1352,
  1353,
  1354,
  1355,
  1356,
  1357,
  1358,
  1359,
  1360,
  1361,
  1362,
  1363,
  1364,
  1365,
  1366,
  1369,
  1377,
  1378,
  1379,
  1380,
  1381,
  1382,
  1383,
  1384,
  1385,
  1386,
  1387,
  1388,
  1389,
  1390,
  1391,
  1392,
  1393,
  1394,
  1395,
  1396,
  1397,
  1398,
  1399,
  1400,
  1401,
  1402,
  1403,
  1404,
  1405,
  1406,
  1407,
  1408,
  1409,
  1410,
  1411,
  1412,
  1413,
  1414,
  1415,
  1488,
  1489,
  1490,
  1491,
  1492,
  1493,
  1494,
  1495,
  1496,
  1497,
  1498,
  1499,
  1500,
  1501,
  1502,
  1503,
  1504,
  1505,
  1506,
  1507,
  1508,
  1509,
  1510,
  1511,
  1512,
  1513,
  1514,
  1520,
  1521,
  1522,
  1568,
  1569,
  1570,
  1571,
  1572,
  1573,
  1574,
  1575,
  1576,
  1577,
  1578,
  1579,
  1580,
  1581,
  1582,
  1583,
  1584,
  1585,
  1586,
  1587,
  1588,
  1589,
  1590,
  1591,
  1592,
  1593,
  1594,
  1595,
  1596,
  1597,
  1598,
  1599,
  1600,
  1601,
  1602,
  1603,
  1604,
  1605,
  1606,
  1607,
  1608,
  1609,
  1610,
  1646,
  1647,
  1649,
  1650,
  1651,
  1652,
  1653,
  1654,
  1655,
  1656,
  1657,
  1658,
  1659,
  1660,
  1661,
  1662,
  1663,
  1664,
  1665,
  1666,
  1667,
  1668,
  1669,
  1670,
  1671,
  1672,
  1673,
  1674,
  1675,
  1676,
  1677,
  1678,
  1679,
  1680,
  1681,
  1682,
  1683,
  1684,
  1685,
  1686,
  1687,
  1688,
  1689,
  1690,
  1691,
  1692,
  1693,
  1694,
  1695,
  1696,
  1697,
  1698,
  1699,
  1700,
  1701,
  1702,
  1703,
  1704,
  1705,
  1706,
  1707,
  1708,
  1709,
  1710,
  1711,
  1712,
  1713,
  1714,
  1715,
  1716,
  1717,
  1718,
  1719,
  1720,
  1721,
  1722,
  1723,
  1724,
  1725,
  1726,
  1727,
  1728,
  1729,
  1730,
  1731,
  1732,
  1733,
  1734,
  1735,
  1736,
  1737,
  1738,
  1739,
  1740,
  1741,
  1742,
  1743,
  1744,
  1745,
  1746,
  1747,
  1749,
  1765,
  1766,
  1774,
  1775,
  1786,
  1787,
  1788,
  1791,
  1808,
  1810,
  1811,
  1812,
  1813,
  1814,
  1815,
  1816,
  1817,
  1818,
  1819,
  1820,
  1821,
  1822,
  1823,
  1824,
  1825,
  1826,
  1827,
  1828,
  1829,
  1830,
  1831,
  1832,
  1833,
  1834,
  1835,
  1836,
  1837,
  1838,
  1839,
  1869,
  1870,
  1871,
  1872,
  1873,
  1874,
  1875,
  1876,
  1877,
  1878,
  1879,
  1880,
  1881,
  1882,
  1883,
  1884,
  1885,
  1886,
  1887,
  1888,
  1889,
  1890,
  1891,
  1892,
  1893,
  1894,
  1895,
  1896,
  1897,
  1898,
  1899,
  1900,
  1901,
  1902,
  1903,
  1904,
  1905,
  1906,
  1907,
  1908,
  1909,
  1910,
  1911,
  1912,
  1913,
  1914,
  1915,
  1916,
  1917,
  1918,
  1919,
  1920,
  1921,
  1922,
  1923,
  1924,
  1925,
  1926,
  1927,
  1928,
  1929,
  1930,
  1931,
  1932,
  1933,
  1934,
  1935,
  1936,
  1937,
  1938,
  1939,
  1940,
  1941,
  1942,
  1943,
  1944,
  1945,
  1946,
  1947,
  1948,
  1949,
  1950,
  1951,
  1952,
  1953,
  1954,
  1955,
  1956,
  1957,
  1969,
  1994,
  1995,
  1996,
  1997,
  1998,
  1999,
  2000,
  2001,
  2002,
  2003,
  2004,
  2005,
  2006,
  2007,
  2008,
  2009,
  2010,
  2011,
  2012,
  2013,
  2014,
  2015,
  2016,
  2017,
  2018,
  2019,
  2020,
  2021,
  2022,
  2023,
  2024,
  2025,
  2026,
  2036,
  2037,
  2042,
  2048,
  2049,
  2050,
  2051,
  2052,
  2053,
  2054,
  2055,
  2056,
  2057,
  2058,
  2059,
  2060,
  2061,
  2062,
  2063,
  2064,
  2065,
  2066,
  2067,
  2068,
  2069,
  2074,
  2084,
  2088,
  2112,
  2113,
  2114,
  2115,
  2116,
  2117,
  2118,
  2119,
  2120,
  2121,
  2122,
  2123,
  2124,
  2125,
  2126,
  2127,
  2128,
  2129,
  2130,
  2131,
  2132,
  2133,
  2134,
  2135,
  2136,
  2208,
  2210,
  2211,
  2212,
  2213,
  2214,
  2215,
  2216,
  2217,
  2218,
  2219,
  2220,
  2308,
  2309,
  2310,
  2311,
  2312,
  2313,
  2314,
  2315,
  2316,
  2317,
  2318,
  2319,
  2320,
  2321,
  2322,
  2323,
  2324,
  2325,
  2326,
  2327,
  2328,
  2329,
  2330,
  2331,
  2332,
  2333,
  2334,
  2335,
  2336,
  2337,
  2338,
  2339,
  2340,
  2341,
  2342,
  2343,
  2344,
  2345,
  2346,
  2347,
  2348,
  2349,
  2350,
  2351,
  2352,
  2353,
  2354,
  2355,
  2356,
  2357,
  2358,
  2359,
  2360,
  2361,
  2365,
  2384,
  2392,
  2393,
  2394,
  2395,
  2396,
  2397,
  2398,
  2399,
  2400,
  2401,
  2417,
  2418,
  2419,
  2420,
  2421,
  2422,
  2423,
  2425,
  2426,
  2427,
  2428,
  2429,
  2430,
  2431,
  2437,
  2438,
  2439,
  2440,
  2441,
  2442,
  2443,
  2444,
  2447,
  2448,
  2451,
  2452,
  2453,
  2454,
  2455,
  2456,
  2457,
  2458,
  2459,
  2460,
  2461,
  2462,
  2463,
  2464,
  2465,
  2466,
  2467,
  2468,
  2469,
  2470,
  2471,
  2472,
  2474,
  2475,
  2476,
  2477,
  2478,
  2479,
  2480,
  2482,
  2486,
  2487,
  2488,
  2489,
  2493,
  2510,
  2524,
  2525,
  2527,
  2528,
  2529,
  2544,
  2545,
  2565,
  2566,
  2567,
  2568,
  2569,
  2570,
  2575,
  2576,
  2579,
  2580,
  2581,
  2582,
  2583,
  2584,
  2585,
  2586,
  2587,
  2588,
  2589,
  2590,
  2591,
  2592,
  2593,
  2594,
  2595,
  2596,
  2597,
  2598,
  2599,
  2600,
  2602,
  2603,
  2604,
  2605,
  2606,
  2607,
  2608,
  2610,
  2611,
  2613,
  2614,
  2616,
  2617,
  2649,
  2650,
  2651,
  2652,
  2654,
  2674,
  2675,
  2676,
  2693,
  2694,
  2695,
  2696,
  2697,
  2698,
  2699,
  2700,
  2701,
  2703,
  2704,
  2705,
  2707,
  2708,
  2709,
  2710,
  2711,
  2712,
  2713,
  2714,
  2715,
  2716,
  2717,
  2718,
  2719,
  2720,
  2721,
  2722,
  2723,
  2724,
  2725,
  2726,
  2727,
  2728,
  2730,
  2731,
  2732,
  2733,
  2734,
  2735,
  2736,
  2738,
  2739,
  2741,
  2742,
  2743,
  2744,
  2745,
  2749,
  2768,
  2784,
  2785,
  2821,
  2822,
  2823,
  2824,
  2825,
  2826,
  2827,
  2828,
  2831,
  2832,
  2835,
  2836,
  2837,
  2838,
  2839,
  2840,
  2841,
  2842,
  2843,
  2844,
  2845,
  2846,
  2847,
  2848,
  2849,
  2850,
  2851,
  2852,
  2853,
  2854,
  2855,
  2856,
  2858,
  2859,
  2860,
  2861,
  2862,
  2863,
  2864,
  2866,
  2867,
  2869,
  2870,
  2871,
  2872,
  2873,
  2877,
  2908,
  2909,
  2911,
  2912,
  2913,
  2929,
  2947,
  2949,
  2950,
  2951,
  2952,
  2953,
  2954,
  2958,
  2959,
  2960,
  2962,
  2963,
  2964,
  2965,
  2969,
  2970,
  2972,
  2974,
  2975,
  2979,
  2980,
  2984,
  2985,
  2986,
  2990,
  2991,
  2992,
  2993,
  2994,
  2995,
  2996,
  2997,
  2998,
  2999,
  3000,
  3001,
  3024,
  3077,
  3078,
  3079,
  3080,
  3081,
  3082,
  3083,
  3084,
  3086,
  3087,
  3088,
  3090,
  3091,
  3092,
  3093,
  3094,
  3095,
  3096,
  3097,
  3098,
  3099,
  3100,
  3101,
  3102,
  3103,
  3104,
  3105,
  3106,
  3107,
  3108,
  3109,
  3110,
  3111,
  3112,
  3114,
  3115,
  3116,
  3117,
  3118,
  3119,
  3120,
  3121,
  3122,
  3123,
  3125,
  3126,
  3127,
  3128,
  3129,
  3133,
  3160,
  3161,
  3168,
  3169,
  3205,
  3206,
  3207,
  3208,
  3209,
  3210,
  3211,
  3212,
  3214,
  3215,
  3216,
  3218,
  3219,
  3220,
  3221,
  3222,
  3223,
  3224,
  3225,
  3226,
  3227,
  3228,
  3229,
  3230,
  3231,
  3232,
  3233,
  3234,
  3235,
  3236,
  3237,
  3238,
  3239,
  3240,
  3242,
  3243,
  3244,
  3245,
  3246,
  3247,
  3248,
  3249,
  3250,
  3251,
  3253,
  3254,
  3255,
  3256,
  3257,
  3261,
  3294,
  3296,
  3297,
  3313,
  3314,
  3333,
  3334,
  3335,
  3336,
  3337,
  3338,
  3339,
  3340,
  3342,
  3343,
  3344,
  3346,
  3347,
  3348,
  3349,
  3350,
  3351,
  3352,
  3353,
  3354,
  3355,
  3356,
  3357,
  3358,
  3359,
  3360,
  3361,
  3362,
  3363,
  3364,
  3365,
  3366,
  3367,
  3368,
  3369,
  3370,
  3371,
  3372,
  3373,
  3374,
  3375,
  3376,
  3377,
  3378,
  3379,
  3380,
  3381,
  3382,
  3383,
  3384,
  3385,
  3386,
  3389,
  3406,
  3424,
  3425,
  3450,
  3451,
  3452,
  3453,
  3454,
  3455,
  3461,
  3462,
  3463,
  3464,
  3465,
  3466,
  3467,
  3468,
  3469,
  3470,
  3471,
  3472,
  3473,
  3474,
  3475,
  3476,
  3477,
  3478,
  3482,
  3483,
  3484,
  3485,
  3486,
  3487,
  3488,
  3489,
  3490,
  3491,
  3492,
  3493,
  3494,
  3495,
  3496,
  3497,
  3498,
  3499,
  3500,
  3501,
  3502,
  3503,
  3504,
  3505,
  3507,
  3508,
  3509,
  3510,
  3511,
  3512,
  3513,
  3514,
  3515,
  3517,
  3520,
  3521,
  3522,
  3523,
  3524,
  3525,
  3526,
  3585,
  3586,
  3587,
  3588,
  3589,
  3590,
  3591,
  3592,
  3593,
  3594,
  3595,
  3596,
  3597,
  3598,
  3599,
  3600,
  3601,
  3602,
  3603,
  3604,
  3605,
  3606,
  3607,
  3608,
  3609,
  3610,
  3611,
  3612,
  3613,
  3614,
  3615,
  3616,
  3617,
  3618,
  3619,
  3620,
  3621,
  3622,
  3623,
  3624,
  3625,
  3626,
  3627,
  3628,
  3629,
  3630,
  3631,
  3632,
  3634,
  3635,
  3648,
  3649,
  3650,
  3651,
  3652,
  3653,
  3654,
  3713,
  3714,
  3716,
  3719,
  3720,
  3722,
  3725,
  3732,
  3733,
  3734,
  3735,
  3737,
  3738,
  3739,
  3740,
  3741,
  3742,
  3743,
  3745,
  3746,
  3747,
  3749,
  3751,
  3754,
  3755,
  3757,
  3758,
  3759,
  3760,
  3762,
  3763,
  3773,
  3776,
  3777,
  3778,
  3779,
  3780,
  3782,
  3804,
  3805,
  3806,
  3807,
  3840,
  3904,
  3905,
  3906,
  3907,
  3908,
  3909,
  3910,
  3911,
  3913,
  3914,
  3915,
  3916,
  3917,
  3918,
  3919,
  3920,
  3921,
  3922,
  3923,
  3924,
  3925,
  3926,
  3927,
  3928,
  3929,
  3930,
  3931,
  3932,
  3933,
  3934,
  3935,
  3936,
  3937,
  3938,
  3939,
  3940,
  3941,
  3942,
  3943,
  3944,
  3945,
  3946,
  3947,
  3948,
  3976,
  3977,
  3978,
  3979,
  3980,
  4096,
  4097,
  4098,
  4099,
  4100,
  4101,
  4102,
  4103,
  4104,
  4105,
  4106,
  4107,
  4108,
  4109,
  4110,
  4111,
  4112,
  4113,
  4114,
  4115,
  4116,
  4117,
  4118,
  4119,
  4120,
  4121,
  4122,
  4123,
  4124,
  4125,
  4126,
  4127,
  4128,
  4129,
  4130,
  4131,
  4132,
  4133,
  4134,
  4135,
  4136,
  4137,
  4138,
  4159,
  4176,
  4177,
  4178,
  4179,
  4180,
  4181,
  4186,
  4187,
  4188,
  4189,
  4193,
  4197,
  4198,
  4206,
  4207,
  4208,
  4213,
  4214,
  4215,
  4216,
  4217,
  4218,
  4219,
  4220,
  4221,
  4222,
  4223,
  4224,
  4225,
  4238,
  4256,
  4257,
  4258,
  4259,
  4260,
  4261,
  4262,
  4263,
  4264,
  4265,
  4266,
  4267,
  4268,
  4269,
  4270,
  4271,
  4272,
  4273,
  4274,
  4275,
  4276,
  4277,
  4278,
  4279,
  4280,
  4281,
  4282,
  4283,
  4284,
  4285,
  4286,
  4287,
  4288,
  4289,
  4290,
  4291,
  4292,
  4293,
  4295,
  4301,
  4304,
  4305,
  4306,
  4307,
  4308,
  4309,
  4310,
  4311,
  4312,
  4313,
  4314,
  4315,
  4316,
  4317,
  4318,
  4319,
  4320,
  4321,
  4322,
  4323,
  4324,
  4325,
  4326,
  4327,
  4328,
  4329,
  4330,
  4331,
  4332,
  4333,
  4334,
  4335,
  4336,
  4337,
  4338,
  4339,
  4340,
  4341,
  4342,
  4343,
  4344,
  4345,
  4346,
  4348,
  4349,
  4350,
  4351,
  4352,
  4353,
  4354,
  4355,
  4356,
  4357,
  4358,
  4359,
  4360,
  4361,
  4362,
  4363,
  4364,
  4365,
  4366,
  4367,
  4368,
  4369,
  4370,
  4371,
  4372,
  4373,
  4374,
  4375,
  4376,
  4377,
  4378,
  4379,
  4380,
  4381,
  4382,
  4383,
  4384,
  4385,
  4386,
  4387,
  4388,
  4389,
  4390,
  4391,
  4392,
  4393,
  4394,
  4395,
  4396,
  4397,
  4398,
  4399,
  4400,
  4401,
  4402,
  4403,
  4404,
  4405,
  4406,
  4407,
  4408,
  4409,
  4410,
  4411,
  4412,
  4413,
  4414,
  4415,
  4416,
  4417,
  4418,
  4419,
  4420,
  4421,
  4422,
  4423,
  4424,
  4425,
  4426,
  4427,
  4428,
  4429,
  4430,
  4431,
  4432,
  4433,
  4434,
  4435,
  4436,
  4437,
  4438,
  4439,
  4440,
  4441,
  4442,
  4443,
  4444,
  4445,
  4446,
  4447,
  4448,
  4449,
  4450,
  4451,
  4452,
  4453,
  4454,
  4455,
  4456,
  4457,
  4458,
  4459,
  4460,
  4461,
  4462,
  4463,
  4464,
  4465,
  4466,
  4467,
  4468,
  4469,
  4470,
  4471,
  4472,
  4473,
  4474,
  4475,
  4476,
  4477,
  4478,
  4479,
  4480,
  4481,
  4482,
  4483,
  4484,
  4485,
  4486,
  4487,
  4488,
  4489,
  4490,
  4491,
  4492,
  4493,
  4494,
  4495,
  4496,
  4497,
  4498,
  4499,
  4500,
  4501,
  4502,
  4503,
  4504,
  4505,
  4506,
  4507,
  4508,
  4509,
  4510,
  4511,
  4512,
  4513,
  4514,
  4515,
  4516,
  4517,
  4518,
  4519,
  4520,
  4521,
  4522,
  4523,
  4524,
  4525,
  4526,
  4527,
  4528,
  4529,
  4530,
  4531,
  4532,
  4533,
  4534,
  4535,
  4536,
  4537,
  4538,
  4539,
  4540,
  4541,
  4542,
  4543,
  4544,
  4545,
  4546,
  4547,
  4548,
  4549,
  4550,
  4551,
  4552,
  4553,
  4554,
  4555,
  4556,
  4557,
  4558,
  4559,
  4560,
  4561,
  4562,
  4563,
  4564,
  4565,
  4566,
  4567,
  4568,
  4569,
  4570,
  4571,
  4572,
  4573,
  4574,
  4575,
  4576,
  4577,
  4578,
  4579,
  4580,
  4581,
  4582,
  4583,
  4584,
  4585,
  4586,
  4587,
  4588,
  4589,
  4590,
  4591,
  4592,
  4593,
  4594,
  4595,
  4596,
  4597,
  4598,
  4599,
  4600,
  4601,
  4602,
  4603,
  4604,
  4605,
  4606,
  4607,
  4608,
  4609,
  4610,
  4611,
  4612,
  4613,
  4614,
  4615,
  4616,
  4617,
  4618,
  4619,
  4620,
  4621,
  4622,
  4623,
  4624,
  4625,
  4626,
  4627,
  4628,
  4629,
  4630,
  4631,
  4632,
  4633,
  4634,
  4635,
  4636,
  4637,
  4638,
  4639,
  4640,
  4641,
  4642,
  4643,
  4644,
  4645,
  4646,
  4647,
  4648,
  4649,
  4650,
  4651,
  4652,
  4653,
  4654,
  4655,
  4656,
  4657,
  4658,
  4659,
  4660,
  4661,
  4662,
  4663,
  4664,
  4665,
  4666,
  4667,
  4668,
  4669,
  4670,
  4671,
  4672,
  4673,
  4674,
  4675,
  4676,
  4677,
  4678,
  4679,
  4680,
  4682,
  4683,
  4684,
  4685,
  4688,
  4689,
  4690,
  4691,
  4692,
  4693,
  4694,
  4696,
  4698,
  4699,
  4700,
  4701,
  4704,
  4705,
  4706,
  4707,
  4708,
  4709,
  4710,
  4711,
  4712,
  4713,
  4714,
  4715,
  4716,
  4717,
  4718,
  4719,
  4720,
  4721,
  4722,
  4723,
  4724,
  4725,
  4726,
  4727,
  4728,
  4729,
  4730,
  4731,
  4732,
  4733,
  4734,
  4735,
  4736,
  4737,
  4738,
  4739,
  4740,
  4741,
  4742,
  4743,
  4744,
  4746,
  4747,
  4748,
  4749,
  4752,
  4753,
  4754,
  4755,
  4756,
  4757,
  4758,
  4759,
  4760,
  4761,
  4762,
  4763,
  4764,
  4765,
  4766,
  4767,
  4768,
  4769,
  4770,
  4771,
  4772,
  4773,
  4774,
  4775,
  4776,
  4777,
  4778,
  4779,
  4780,
  4781,
  4782,
  4783,
  4784,
  4786,
  4787,
  4788,
  4789,
  4792,
  4793,
  4794,
  4795,
  4796,
  4797,
  4798,
  4800,
  4802,
  4803,
  4804,
  4805,
  4808,
  4809,
  4810,
  4811,
  4812,
  4813,
  4814,
  4815,
  4816,
  4817,
  4818,
  4819,
  4820,
  4821,
  4822,
  4824,
  4825,
  4826,
  4827,
  4828,
  4829,
  4830,
  4831,
  4832,
  4833,
  4834,
  4835,
  4836,
  4837,
  4838,
  4839,
  4840,
  4841,
  4842,
  4843,
  4844,
  4845,
  4846,
  4847,
  4848,
  4849,
  4850,
  4851,
  4852,
  4853,
  4854,
  4855,
  4856,
  4857,
  4858,
  4859,
  4860,
  4861,
  4862,
  4863,
  4864,
  4865,
  4866,
  4867,
  4868,
  4869,
  4870,
  4871,
  4872,
  4873,
  4874,
  4875,
  4876,
  4877,
  4878,
  4879,
  4880,
  4882,
  4883,
  4884,
  4885,
  4888,
  4889,
  4890,
  4891,
  4892,
  4893,
  4894,
  4895,
  4896,
  4897,
  4898,
  4899,
  4900,
  4901,
  4902,
  4903,
  4904,
  4905,
  4906,
  4907,
  4908,
  4909,
  4910,
  4911,
  4912,
  4913,
  4914,
  4915,
  4916,
  4917,
  4918,
  4919,
  4920,
  4921,
  4922,
  4923,
  4924,
  4925,
  4926,
  4927,
  4928,
  4929,
  4930,
  4931,
  4932,
  4933,
  4934,
  4935,
  4936,
  4937,
  4938,
  4939,
  4940,
  4941,
  4942,
  4943,
  4944,
  4945,
  4946,
  4947,
  4948,
  4949,
  4950,
  4951,
  4952,
  4953,
  4954,
  4992,
  4993,
  4994,
  4995,
  4996,
  4997,
  4998,
  4999,
  5000,
  5001,
  5002,
  5003,
  5004,
  5005,
  5006,
  5007,
  5024,
  5025,
  5026,
  5027,
  5028,
  5029,
  5030,
  5031,
  5032,
  5033,
  5034,
  5035,
  5036,
  5037,
  5038,
  5039,
  5040,
  5041,
  5042,
  5043,
  5044,
  5045,
  5046,
  5047,
  5048,
  5049,
  5050,
  5051,
  5052,
  5053,
  5054,
  5055,
  5056,
  5057,
  5058,
  5059,
  5060,
  5061,
  5062,
  5063,
  5064,
  5065,
  5066,
  5067,
  5068,
  5069,
  5070,
  5071,
  5072,
  5073,
  5074,
  5075,
  5076,
  5077,
  5078,
  5079,
  5080,
  5081,
  5082,
  5083,
  5084,
  5085,
  5086,
  5087,
  5088,
  5089,
  5090,
  5091,
  5092,
  5093,
  5094,
  5095,
  5096,
  5097,
  5098,
  5099,
  5100,
  5101,
  5102,
  5103,
  5104,
  5105,
  5106,
  5107,
  5108,
  5121,
  5122,
  5123,
  5124,
  5125,
  5126,
  5127,
  5128,
  5129,
  5130,
  5131,
  5132,
  5133,
  5134,
  5135,
  5136,
  5137,
  5138,
  5139,
  5140,
  5141,
  5142,
  5143,
  5144,
  5145,
  5146,
  5147,
  5148,
  5149,
  5150,
  5151,
  5152,
  5153,
  5154,
  5155,
  5156,
  5157,
  5158,
  5159,
  5160,
  5161,
  5162,
  5163,
  5164,
  5165,
  5166,
  5167,
  5168,
  5169,
  5170,
  5171,
  5172,
  5173,
  5174,
  5175,
  5176,
  5177,
  5178,
  5179,
  5180,
  5181,
  5182,
  5183,
  5184,
  5185,
  5186,
  5187,
  5188,
  5189,
  5190,
  5191,
  5192,
  5193,
  5194,
  5195,
  5196,
  5197,
  5198,
  5199,
  5200,
  5201,
  5202,
  5203,
  5204,
  5205,
  5206,
  5207,
  5208,
  5209,
  5210,
  5211,
  5212,
  5213,
  5214,
  5215,
  5216,
  5217,
  5218,
  5219,
  5220,
  5221,
  5222,
  5223,
  5224,
  5225,
  5226,
  5227,
  5228,
  5229,
  5230,
  5231,
  5232,
  5233,
  5234,
  5235,
  5236,
  5237,
  5238,
  5239,
  5240,
  5241,
  5242,
  5243,
  5244,
  5245,
  5246,
  5247,
  5248,
  5249,
  5250,
  5251,
  5252,
  5253,
  5254,
  5255,
  5256,
  5257,
  5258,
  5259,
  5260,
  5261,
  5262,
  5263,
  5264,
  5265,
  5266,
  5267,
  5268,
  5269,
  5270,
  5271,
  5272,
  5273,
  5274,
  5275,
  5276,
  5277,
  5278,
  5279,
  5280,
  5281,
  5282,
  5283,
  5284,
  5285,
  5286,
  5287,
  5288,
  5289,
  5290,
  5291,
  5292,
  5293,
  5294,
  5295,
  5296,
  5297,
  5298,
  5299,
  5300,
  5301,
  5302,
  5303,
  5304,
  5305,
  5306,
  5307,
  5308,
  5309,
  5310,
  5311,
  5312,
  5313,
  5314,
  5315,
  5316,
  5317,
  5318,
  5319,
  5320,
  5321,
  5322,
  5323,
  5324,
  5325,
  5326,
  5327,
  5328,
  5329,
  5330,
  5331,
  5332,
  5333,
  5334,
  5335,
  5336,
  5337,
  5338,
  5339,
  5340,
  5341,
  5342,
  5343,
  5344,
  5345,
  5346,
  5347,
  5348,
  5349,
  5350,
  5351,
  5352,
  5353,
  5354,
  5355,
  5356,
  5357,
  5358,
  5359,
  5360,
  5361,
  5362,
  5363,
  5364,
  5365,
  5366,
  5367,
  5368,
  5369,
  5370,
  5371,
  5372,
  5373,
  5374,
  5375,
  5376,
  5377,
  5378,
  5379,
  5380,
  5381,
  5382,
  5383,
  5384,
  5385,
  5386,
  5387,
  5388,
  5389,
  5390,
  5391,
  5392,
  5393,
  5394,
  5395,
  5396,
  5397,
  5398,
  5399,
  5400,
  5401,
  5402,
  5403,
  5404,
  5405,
  5406,
  5407,
  5408,
  5409,
  5410,
  5411,
  5412,
  5413,
  5414,
  5415,
  5416,
  5417,
  5418,
  5419,
  5420,
  5421,
  5422,
  5423,
  5424,
  5425,
  5426,
  5427,
  5428,
  5429,
  5430,
  5431,
  5432,
  5433,
  5434,
  5435,
  5436,
  5437,
  5438,
  5439,
  5440,
  5441,
  5442,
  5443,
  5444,
  5445,
  5446,
  5447,
  5448,
  5449,
  5450,
  5451,
  5452,
  5453,
  5454,
  5455,
  5456,
  5457,
  5458,
  5459,
  5460,
  5461,
  5462,
  5463,
  5464,
  5465,
  5466,
  5467,
  5468,
  5469,
  5470,
  5471,
  5472,
  5473,
  5474,
  5475,
  5476,
  5477,
  5478,
  5479,
  5480,
  5481,
  5482,
  5483,
  5484,
  5485,
  5486,
  5487,
  5488,
  5489,
  5490,
  5491,
  5492,
  5493,
  5494,
  5495,
  5496,
  5497,
  5498,
  5499,
  5500,
  5501,
  5502,
  5503,
  5504,
  5505,
  5506,
  5507,
  5508,
  5509,
  5510,
  5511,
  5512,
  5513,
  5514,
  5515,
  5516,
  5517,
  5518,
  5519,
  5520,
  5521,
  5522,
  5523,
  5524,
  5525,
  5526,
  5527,
  5528,
  5529,
  5530,
  5531,
  5532,
  5533,
  5534,
  5535,
  5536,
  5537,
  5538,
  5539,
  5540,
  5541,
  5542,
  5543,
  5544,
  5545,
  5546,
  5547,
  5548,
  5549,
  5550,
  5551,
  5552,
  5553,
  5554,
  5555,
  5556,
  5557,
  5558,
  5559,
  5560,
  5561,
  5562,
  5563,
  5564,
  5565,
  5566,
  5567,
  5568,
  5569,
  5570,
  5571,
  5572,
  5573,
  5574,
  5575,
  5576,
  5577,
  5578,
  5579,
  5580,
  5581,
  5582,
  5583,
  5584,
  5585,
  5586,
  5587,
  5588,
  5589,
  5590,
  5591,
  5592,
  5593,
  5594,
  5595,
  5596,
  5597,
  5598,
  5599,
  5600,
  5601,
  5602,
  5603,
  5604,
  5605,
  5606,
  5607,
  5608,
  5609,
  5610,
  5611,
  5612,
  5613,
  5614,
  5615,
  5616,
  5617,
  5618,
  5619,
  5620,
  5621,
  5622,
  5623,
  5624,
  5625,
  5626,
  5627,
  5628,
  5629,
  5630,
  5631,
  5632,
  5633,
  5634,
  5635,
  5636,
  5637,
  5638,
  5639,
  5640,
  5641,
  5642,
  5643,
  5644,
  5645,
  5646,
  5647,
  5648,
  5649,
  5650,
  5651,
  5652,
  5653,
  5654,
  5655,
  5656,
  5657,
  5658,
  5659,
  5660,
  5661,
  5662,
  5663,
  5664,
  5665,
  5666,
  5667,
  5668,
  5669,
  5670,
  5671,
  5672,
  5673,
  5674,
  5675,
  5676,
  5677,
  5678,
  5679,
  5680,
  5681,
  5682,
  5683,
  5684,
  5685,
  5686,
  5687,
  5688,
  5689,
  5690,
  5691,
  5692,
  5693,
  5694,
  5695,
  5696,
  5697,
  5698,
  5699,
  5700,
  5701,
  5702,
  5703,
  5704,
  5705,
  5706,
  5707,
  5708,
  5709,
  5710,
  5711,
  5712,
  5713,
  5714,
  5715,
  5716,
  5717,
  5718,
  5719,
  5720,
  5721,
  5722,
  5723,
  5724,
  5725,
  5726,
  5727,
  5728,
  5729,
  5730,
  5731,
  5732,
  5733,
  5734,
  5735,
  5736,
  5737,
  5738,
  5739,
  5740,
  5743,
  5744,
  5745,
  5746,
  5747,
  5748,
  5749,
  5750,
  5751,
  5752,
  5753,
  5754,
  5755,
  5756,
  5757,
  5758,
  5759,
  5761,
  5762,
  5763,
  5764,
  5765,
  5766,
  5767,
  5768,
  5769,
  5770,
  5771,
  5772,
  5773,
  5774,
  5775,
  5776,
  5777,
  5778,
  5779,
  5780,
  5781,
  5782,
  5783,
  5784,
  5785,
  5786,
  5792,
  5793,
  5794,
  5795,
  5796,
  5797,
  5798,
  5799,
  5800,
  5801,
  5802,
  5803,
  5804,
  5805,
  5806,
  5807,
  5808,
  5809,
  5810,
  5811,
  5812,
  5813,
  5814,
  5815,
  5816,
  5817,
  5818,
  5819,
  5820,
  5821,
  5822,
  5823,
  5824,
  5825,
  5826,
  5827,
  5828,
  5829,
  5830,
  5831,
  5832,
  5833,
  5834,
  5835,
  5836,
  5837,
  5838,
  5839,
  5840,
  5841,
  5842,
  5843,
  5844,
  5845,
  5846,
  5847,
  5848,
  5849,
  5850,
  5851,
  5852,
  5853,
  5854,
  5855,
  5856,
  5857,
  5858,
  5859,
  5860,
  5861,
  5862,
  5863,
  5864,
  5865,
  5866,
  5870,
  5871,
  5872,
  5888,
  5889,
  5890,
  5891,
  5892,
  5893,
  5894,
  5895,
  5896,
  5897,
  5898,
  5899,
  5900,
  5902,
  5903,
  5904,
  5905,
  5920,
  5921,
  5922,
  5923,
  5924,
  5925,
  5926,
  5927,
  5928,
  5929,
  5930,
  5931,
  5932,
  5933,
  5934,
  5935,
  5936,
  5937,
  5952,
  5953,
  5954,
  5955,
  5956,
  5957,
  5958,
  5959,
  5960,
  5961,
  5962,
  5963,
  5964,
  5965,
  5966,
  5967,
  5968,
  5969,
  5984,
  5985,
  5986,
  5987,
  5988,
  5989,
  5990,
  5991,
  5992,
  5993,
  5994,
  5995,
  5996,
  5998,
  5999,
  6000,
  6016,
  6017,
  6018,
  6019,
  6020,
  6021,
  6022,
  6023,
  6024,
  6025,
  6026,
  6027,
  6028,
  6029,
  6030,
  6031,
  6032,
  6033,
  6034,
  6035,
  6036,
  6037,
  6038,
  6039,
  6040,
  6041,
  6042,
  6043,
  6044,
  6045,
  6046,
  6047,
  6048,
  6049,
  6050,
  6051,
  6052,
  6053,
  6054,
  6055,
  6056,
  6057,
  6058,
  6059,
  6060,
  6061,
  6062,
  6063,
  6064,
  6065,
  6066,
  6067,
  6103,
  6108,
  6176,
  6177,
  6178,
  6179,
  6180,
  6181,
  6182,
  6183,
  6184,
  6185,
  6186,
  6187,
  6188,
  6189,
  6190,
  6191,
  6192,
  6193,
  6194,
  6195,
  6196,
  6197,
  6198,
  6199,
  6200,
  6201,
  6202,
  6203,
  6204,
  6205,
  6206,
  6207,
  6208,
  6209,
  6210,
  6211,
  6212,
  6213,
  6214,
  6215,
  6216,
  6217,
  6218,
  6219,
  6220,
  6221,
  6222,
  6223,
  6224,
  6225,
  6226,
  6227,
  6228,
  6229,
  6230,
  6231,
  6232,
  6233,
  6234,
  6235,
  6236,
  6237,
  6238,
  6239,
  6240,
  6241,
  6242,
  6243,
  6244,
  6245,
  6246,
  6247,
  6248,
  6249,
  6250,
  6251,
  6252,
  6253,
  6254,
  6255,
  6256,
  6257,
  6258,
  6259,
  6260,
  6261,
  6262,
  6263,
  6272,
  6273,
  6274,
  6275,
  6276,
  6277,
  6278,
  6279,
  6280,
  6281,
  6282,
  6283,
  6284,
  6285,
  6286,
  6287,
  6288,
  6289,
  6290,
  6291,
  6292,
  6293,
  6294,
  6295,
  6296,
  6297,
  6298,
  6299,
  6300,
  6301,
  6302,
  6303,
  6304,
  6305,
  6306,
  6307,
  6308,
  6309,
  6310,
  6311,
  6312,
  6314,
  6320,
  6321,
  6322,
  6323,
  6324,
  6325,
  6326,
  6327,
  6328,
  6329,
  6330,
  6331,
  6332,
  6333,
  6334,
  6335,
  6336,
  6337,
  6338,
  6339,
  6340,
  6341,
  6342,
  6343,
  6344,
  6345,
  6346,
  6347,
  6348,
  6349,
  6350,
  6351,
  6352,
  6353,
  6354,
  6355,
  6356,
  6357,
  6358,
  6359,
  6360,
  6361,
  6362,
  6363,
  6364,
  6365,
  6366,
  6367,
  6368,
  6369,
  6370,
  6371,
  6372,
  6373,
  6374,
  6375,
  6376,
  6377,
  6378,
  6379,
  6380,
  6381,
  6382,
  6383,
  6384,
  6385,
  6386,
  6387,
  6388,
  6389,
  6400,
  6401,
  6402,
  6403,
  6404,
  6405,
  6406,
  6407,
  6408,
  6409,
  6410,
  6411,
  6412,
  6413,
  6414,
  6415,
  6416,
  6417,
  6418,
  6419,
  6420,
  6421,
  6422,
  6423,
  6424,
  6425,
  6426,
  6427,
  6428,
  6480,
  6481,
  6482,
  6483,
  6484,
  6485,
  6486,
  6487,
  6488,
  6489,
  6490,
  6491,
  6492,
  6493,
  6494,
  6495,
  6496,
  6497,
  6498,
  6499,
  6500,
  6501,
  6502,
  6503,
  6504,
  6505,
  6506,
  6507,
  6508,
  6509,
  6512,
  6513,
  6514,
  6515,
  6516,
  6528,
  6529,
  6530,
  6531,
  6532,
  6533,
  6534,
  6535,
  6536,
  6537,
  6538,
  6539,
  6540,
  6541,
  6542,
  6543,
  6544,
  6545,
  6546,
  6547,
  6548,
  6549,
  6550,
  6551,
  6552,
  6553,
  6554,
  6555,
  6556,
  6557,
  6558,
  6559,
  6560,
  6561,
  6562,
  6563,
  6564,
  6565,
  6566,
  6567,
  6568,
  6569,
  6570,
  6571,
  6593,
  6594,
  6595,
  6596,
  6597,
  6598,
  6599,
  6656,
  6657,
  6658,
  6659,
  6660,
  6661,
  6662,
  6663,
  6664,
  6665,
  6666,
  6667,
  6668,
  6669,
  6670,
  6671,
  6672,
  6673,
  6674,
  6675,
  6676,
  6677,
  6678,
  6688,
  6689,
  6690,
  6691,
  6692,
  6693,
  6694,
  6695,
  6696,
  6697,
  6698,
  6699,
  6700,
  6701,
  6702,
  6703,
  6704,
  6705,
  6706,
  6707,
  6708,
  6709,
  6710,
  6711,
  6712,
  6713,
  6714,
  6715,
  6716,
  6717,
  6718,
  6719,
  6720,
  6721,
  6722,
  6723,
  6724,
  6725,
  6726,
  6727,
  6728,
  6729,
  6730,
  6731,
  6732,
  6733,
  6734,
  6735,
  6736,
  6737,
  6738,
  6739,
  6740,
  6823,
  6917,
  6918,
  6919,
  6920,
  6921,
  6922,
  6923,
  6924,
  6925,
  6926,
  6927,
  6928,
  6929,
  6930,
  6931,
  6932,
  6933,
  6934,
  6935,
  6936,
  6937,
  6938,
  6939,
  6940,
  6941,
  6942,
  6943,
  6944,
  6945,
  6946,
  6947,
  6948,
  6949,
  6950,
  6951,
  6952,
  6953,
  6954,
  6955,
  6956,
  6957,
  6958,
  6959,
  6960,
  6961,
  6962,
  6963,
  6981,
  6982,
  6983,
  6984,
  6985,
  6986,
  6987,
  7043,
  7044,
  7045,
  7046,
  7047,
  7048,
  7049,
  7050,
  7051,
  7052,
  7053,
  7054,
  7055,
  7056,
  7057,
  7058,
  7059,
  7060,
  7061,
  7062,
  7063,
  7064,
  7065,
  7066,
  7067,
  7068,
  7069,
  7070,
  7071,
  7072,
  7086,
  7087,
  7098,
  7099,
  7100,
  7101,
  7102,
  7103,
  7104,
  7105,
  7106,
  7107,
  7108,
  7109,
  7110,
  7111,
  7112,
  7113,
  7114,
  7115,
  7116,
  7117,
  7118,
  7119,
  7120,
  7121,
  7122,
  7123,
  7124,
  7125,
  7126,
  7127,
  7128,
  7129,
  7130,
  7131,
  7132,
  7133,
  7134,
  7135,
  7136,
  7137,
  7138,
  7139,
  7140,
  7141,
  7168,
  7169,
  7170,
  7171,
  7172,
  7173,
  7174,
  7175,
  7176,
  7177,
  7178,
  7179,
  7180,
  7181,
  7182,
  7183,
  7184,
  7185,
  7186,
  7187,
  7188,
  7189,
  7190,
  7191,
  7192,
  7193,
  7194,
  7195,
  7196,
  7197,
  7198,
  7199,
  7200,
  7201,
  7202,
  7203,
  7245,
  7246,
  7247,
  7258,
  7259,
  7260,
  7261,
  7262,
  7263,
  7264,
  7265,
  7266,
  7267,
  7268,
  7269,
  7270,
  7271,
  7272,
  7273,
  7274,
  7275,
  7276,
  7277,
  7278,
  7279,
  7280,
  7281,
  7282,
  7283,
  7284,
  7285,
  7286,
  7287,
  7288,
  7289,
  7290,
  7291,
  7292,
  7293,
  7401,
  7402,
  7403,
  7404,
  7406,
  7407,
  7408,
  7409,
  7413,
  7414,
  7424,
  7425,
  7426,
  7427,
  7428,
  7429,
  7430,
  7431,
  7432,
  7433,
  7434,
  7435,
  7436,
  7437,
  7438,
  7439,
  7440,
  7441,
  7442,
  7443,
  7444,
  7445,
  7446,
  7447,
  7448,
  7449,
  7450,
  7451,
  7452,
  7453,
  7454,
  7455,
  7456,
  7457,
  7458,
  7459,
  7460,
  7461,
  7462,
  7463,
  7464,
  7465,
  7466,
  7467,
  7468,
  7469,
  7470,
  7471,
  7472,
  7473,
  7474,
  7475,
  7476,
  7477,
  7478,
  7479,
  7480,
  7481,
  7482,
  7483,
  7484,
  7485,
  7486,
  7487,
  7488,
  7489,
  7490,
  7491,
  7492,
  7493,
  7494,
  7495,
  7496,
  7497,
  7498,
  7499,
  7500,
  7501,
  7502,
  7503,
  7504,
  7505,
  7506,
  7507,
  7508,
  7509,
  7510,
  7511,
  7512,
  7513,
  7514,
  7515,
  7516,
  7517,
  7518,
  7519,
  7520,
  7521,
  7522,
  7523,
  7524,
  7525,
  7526,
  7527,
  7528,
  7529,
  7530,
  7531,
  7532,
  7533,
  7534,
  7535,
  7536,
  7537,
  7538,
  7539,
  7540,
  7541,
  7542,
  7543,
  7544,
  7545,
  7546,
  7547,
  7548,
  7549,
  7550,
  7551,
  7552,
  7553,
  7554,
  7555,
  7556,
  7557,
  7558,
  7559,
  7560,
  7561,
  7562,
  7563,
  7564,
  7565,
  7566,
  7567,
  7568,
  7569,
  7570,
  7571,
  7572,
  7573,
  7574,
  7575,
  7576,
  7577,
  7578,
  7579,
  7580,
  7581,
  7582,
  7583,
  7584,
  7585,
  7586,
  7587,
  7588,
  7589,
  7590,
  7591,
  7592,
  7593,
  7594,
  7595,
  7596,
  7597,
  7598,
  7599,
  7600,
  7601,
  7602,
  7603,
  7604,
  7605,
  7606,
  7607,
  7608,
  7609,
  7610,
  7611,
  7612,
  7613,
  7614,
  7615,
  7680,
  7681,
  7682,
  7683,
  7684,
  7685,
  7686,
  7687,
  7688,
  7689,
  7690,
  7691,
  7692,
  7693,
  7694,
  7695,
  7696,
  7697,
  7698,
  7699,
  7700,
  7701,
  7702,
  7703,
  7704,
  7705,
  7706,
  7707,
  7708,
  7709,
  7710,
  7711,
  7712,
  7713,
  7714,
  7715,
  7716,
  7717,
  7718,
  7719,
  7720,
  7721,
  7722,
  7723,
  7724,
  7725,
  7726,
  7727,
  7728,
  7729,
  7730,
  7731,
  7732,
  7733,
  7734,
  7735,
  7736,
  7737,
  7738,
  7739,
  7740,
  7741,
  7742,
  7743,
  7744,
  7745,
  7746,
  7747,
  7748,
  7749,
  7750,
  7751,
  7752,
  7753,
  7754,
  7755,
  7756,
  7757,
  7758,
  7759,
  7760,
  7761,
  7762,
  7763,
  7764,
  7765,
  7766,
  7767,
  7768,
  7769,
  7770,
  7771,
  7772,
  7773,
  7774,
  7775,
  7776,
  7777,
  7778,
  7779,
  7780,
  7781,
  7782,
  7783,
  7784,
  7785,
  7786,
  7787,
  7788,
  7789,
  7790,
  7791,
  7792,
  7793,
  7794,
  7795,
  7796,
  7797,
  7798,
  7799,
  7800,
  7801,
  7802,
  7803,
  7804,
  7805,
  7806,
  7807,
  7808,
  7809,
  7810,
  7811,
  7812,
  7813,
  7814,
  7815,
  7816,
  7817,
  7818,
  7819,
  7820,
  7821,
  7822,
  7823,
  7824,
  7825,
  7826,
  7827,
  7828,
  7829,
  7830,
  7831,
  7832,
  7833,
  7834,
  7835,
  7836,
  7837,
  7838,
  7839,
  7840,
  7841,
  7842,
  7843,
  7844,
  7845,
  7846,
  7847,
  7848,
  7849,
  7850,
  7851,
  7852,
  7853,
  7854,
  7855,
  7856,
  7857,
  7858,
  7859,
  7860,
  7861,
  7862,
  7863,
  7864,
  7865,
  7866,
  7867,
  7868,
  7869,
  7870,
  7871,
  7872,
  7873,
  7874,
  7875,
  7876,
  7877,
  7878,
  7879,
  7880,
  7881,
  7882,
  7883,
  7884,
  7885,
  7886,
  7887,
  7888,
  7889,
  7890,
  7891,
  7892,
  7893,
  7894,
  7895,
  7896,
  7897,
  7898,
  7899,
  7900,
  7901,
  7902,
  7903,
  7904,
  7905,
  7906,
  7907,
  7908,
  7909,
  7910,
  7911,
  7912,
  7913,
  7914,
  7915,
  7916,
  7917,
  7918,
  7919,
  7920,
  7921,
  7922,
  7923,
  7924,
  7925,
  7926,
  7927,
  7928,
  7929,
  7930,
  7931,
  7932,
  7933,
  7934,
  7935,
  7936,
  7937,
  7938,
  7939,
  7940,
  7941,
  7942,
  7943,
  7944,
  7945,
  7946,
  7947,
  7948,
  7949,
  7950,
  7951,
  7952,
  7953,
  7954,
  7955,
  7956,
  7957,
  7960,
  7961,
  7962,
  7963,
  7964,
  7965,
  7968,
  7969,
  7970,
  7971,
  7972,
  7973,
  7974,
  7975,
  7976,
  7977,
  7978,
  7979,
  7980,
  7981,
  7982,
  7983,
  7984,
  7985,
  7986,
  7987,
  7988,
  7989,
  7990,
  7991,
  7992,
  7993,
  7994,
  7995,
  7996,
  7997,
  7998,
  7999,
  8000,
  8001,
  8002,
  8003,
  8004,
  8005,
  8008,
  8009,
  8010,
  8011,
  8012,
  8013,
  8016,
  8017,
  8018,
  8019,
  8020,
  8021,
  8022,
  8023,
  8025,
  8027,
  8029,
  8031,
  8032,
  8033,
  8034,
  8035,
  8036,
  8037,
  8038,
  8039,
  8040,
  8041,
  8042,
  8043,
  8044,
  8045,
  8046,
  8047,
  8048,
  8049,
  8050,
  8051,
  8052,
  8053,
  8054,
  8055,
  8056,
  8057,
  8058,
  8059,
  8060,
  8061,
  8064,
  8065,
  8066,
  8067,
  8068,
  8069,
  8070,
  8071,
  8072,
  8073,
  8074,
  8075,
  8076,
  8077,
  8078,
  8079,
  8080,
  8081,
  8082,
  8083,
  8084,
  8085,
  8086,
  8087,
  8088,
  8089,
  8090,
  8091,
  8092,
  8093,
  8094,
  8095,
  8096,
  8097,
  8098,
  8099,
  8100,
  8101,
  8102,
  8103,
  8104,
  8105,
  8106,
  8107,
  8108,
  8109,
  8110,
  8111,
  8112,
  8113,
  8114,
  8115,
  8116,
  8118,
  8119,
  8120,
  8121,
  8122,
  8123,
  8124,
  8126,
  8130,
  8131,
  8132,
  8134,
  8135,
  8136,
  8137,
  8138,
  8139,
  8140,
  8144,
  8145,
  8146,
  8147,
  8150,
  8151,
  8152,
  8153,
  8154,
  8155,
  8160,
  8161,
  8162,
  8163,
  8164,
  8165,
  8166,
  8167,
  8168,
  8169,
  8170,
  8171,
  8172,
  8178,
  8179,
  8180,
  8182,
  8183,
  8184,
  8185,
  8186,
  8187,
  8188,
  8305,
  8319,
  8336,
  8337,
  8338,
  8339,
  8340,
  8341,
  8342,
  8343,
  8344,
  8345,
  8346,
  8347,
  8348,
  8450,
  8455,
  8458,
  8459,
  8460,
  8461,
  8462,
  8463,
  8464,
  8465,
  8466,
  8467,
  8469,
  8473,
  8474,
  8475,
  8476,
  8477,
  8484,
  8486,
  8488,
  8490,
  8491,
  8492,
  8493,
  8495,
  8496,
  8497,
  8498,
  8499,
  8500,
  8501,
  8502,
  8503,
  8504,
  8505,
  8508,
  8509,
  8510,
  8511,
  8517,
  8518,
  8519,
  8520,
  8521,
  8526,
  8544,
  8545,
  8546,
  8547,
  8548,
  8549,
  8550,
  8551,
  8552,
  8553,
  8554,
  8555,
  8556,
  8557,
  8558,
  8559,
  8560,
  8561,
  8562,
  8563,
  8564,
  8565,
  8566,
  8567,
  8568,
  8569,
  8570,
  8571,
  8572,
  8573,
  8574,
  8575,
  8576,
  8577,
  8578,
  8579,
  8580,
  8581,
  8582,
  8583,
  8584,
  11264,
  11265,
  11266,
  11267,
  11268,
  11269,
  11270,
  11271,
  11272,
  11273,
  11274,
  11275,
  11276,
  11277,
  11278,
  11279,
  11280,
  11281,
  11282,
  11283,
  11284,
  11285,
  11286,
  11287,
  11288,
  11289,
  11290,
  11291,
  11292,
  11293,
  11294,
  11295,
  11296,
  11297,
  11298,
  11299,
  11300,
  11301,
  11302,
  11303,
  11304,
  11305,
  11306,
  11307,
  11308,
  11309,
  11310,
  11312,
  11313,
  11314,
  11315,
  11316,
  11317,
  11318,
  11319,
  11320,
  11321,
  11322,
  11323,
  11324,
  11325,
  11326,
  11327,
  11328,
  11329,
  11330,
  11331,
  11332,
  11333,
  11334,
  11335,
  11336,
  11337,
  11338,
  11339,
  11340,
  11341,
  11342,
  11343,
  11344,
  11345,
  11346,
  11347,
  11348,
  11349,
  11350,
  11351,
  11352,
  11353,
  11354,
  11355,
  11356,
  11357,
  11358,
  11360,
  11361,
  11362,
  11363,
  11364,
  11365,
  11366,
  11367,
  11368,
  11369,
  11370,
  11371,
  11372,
  11373,
  11374,
  11375,
  11376,
  11377,
  11378,
  11379,
  11380,
  11381,
  11382,
  11383,
  11384,
  11385,
  11386,
  11387,
  11388,
  11389,
  11390,
  11391,
  11392,
  11393,
  11394,
  11395,
  11396,
  11397,
  11398,
  11399,
  11400,
  11401,
  11402,
  11403,
  11404,
  11405,
  11406,
  11407,
  11408,
  11409,
  11410,
  11411,
  11412,
  11413,
  11414,
  11415,
  11416,
  11417,
  11418,
  11419,
  11420,
  11421,
  11422,
  11423,
  11424,
  11425,
  11426,
  11427,
  11428,
  11429,
  11430,
  11431,
  11432,
  11433,
  11434,
  11435,
  11436,
  11437,
  11438,
  11439,
  11440,
  11441,
  11442,
  11443,
  11444,
  11445,
  11446,
  11447,
  11448,
  11449,
  11450,
  11451,
  11452,
  11453,
  11454,
  11455,
  11456,
  11457,
  11458,
  11459,
  11460,
  11461,
  11462,
  11463,
  11464,
  11465,
  11466,
  11467,
  11468,
  11469,
  11470,
  11471,
  11472,
  11473,
  11474,
  11475,
  11476,
  11477,
  11478,
  11479,
  11480,
  11481,
  11482,
  11483,
  11484,
  11485,
  11486,
  11487,
  11488,
  11489,
  11490,
  11491,
  11492,
  11499,
  11500,
  11501,
  11502,
  11506,
  11507,
  11520,
  11521,
  11522,
  11523,
  11524,
  11525,
  11526,
  11527,
  11528,
  11529,
  11530,
  11531,
  11532,
  11533,
  11534,
  11535,
  11536,
  11537,
  11538,
  11539,
  11540,
  11541,
  11542,
  11543,
  11544,
  11545,
  11546,
  11547,
  11548,
  11549,
  11550,
  11551,
  11552,
  11553,
  11554,
  11555,
  11556,
  11557,
  11559,
  11565,
  11568,
  11569,
  11570,
  11571,
  11572,
  11573,
  11574,
  11575,
  11576,
  11577,
  11578,
  11579,
  11580,
  11581,
  11582,
  11583,
  11584,
  11585,
  11586,
  11587,
  11588,
  11589,
  11590,
  11591,
  11592,
  11593,
  11594,
  11595,
  11596,
  11597,
  11598,
  11599,
  11600,
  11601,
  11602,
  11603,
  11604,
  11605,
  11606,
  11607,
  11608,
  11609,
  11610,
  11611,
  11612,
  11613,
  11614,
  11615,
  11616,
  11617,
  11618,
  11619,
  11620,
  11621,
  11622,
  11623,
  11631,
  11648,
  11649,
  11650,
  11651,
  11652,
  11653,
  11654,
  11655,
  11656,
  11657,
  11658,
  11659,
  11660,
  11661,
  11662,
  11663,
  11664,
  11665,
  11666,
  11667,
  11668,
  11669,
  11670,
  11680,
  11681,
  11682,
  11683,
  11684,
  11685,
  11686,
  11688,
  11689,
  11690,
  11691,
  11692,
  11693,
  11694,
  11696,
  11697,
  11698,
  11699,
  11700,
  11701,
  11702,
  11704,
  11705,
  11706,
  11707,
  11708,
  11709,
  11710,
  11712,
  11713,
  11714,
  11715,
  11716,
  11717,
  11718,
  11720,
  11721,
  11722,
  11723,
  11724,
  11725,
  11726,
  11728,
  11729,
  11730,
  11731,
  11732,
  11733,
  11734,
  11736,
  11737,
  11738,
  11739,
  11740,
  11741,
  11742,
  11823,
  12293,
  12294,
  12295,
  12321,
  12322,
  12323,
  12324,
  12325,
  12326,
  12327,
  12328,
  12329,
  12337,
  12338,
  12339,
  12340,
  12341,
  12344,
  12345,
  12346,
  12347,
  12348,
  12353,
  12354,
  12355,
  12356,
  12357,
  12358,
  12359,
  12360,
  12361,
  12362,
  12363,
  12364,
  12365,
  12366,
  12367,
  12368,
  12369,
  12370,
  12371,
  12372,
  12373,
  12374,
  12375,
  12376,
  12377,
  12378,
  12379,
  12380,
  12381,
  12382,
  12383,
  12384,
  12385,
  12386,
  12387,
  12388,
  12389,
  12390,
  12391,
  12392,
  12393,
  12394,
  12395,
  12396,
  12397,
  12398,
  12399,
  12400,
  12401,
  12402,
  12403,
  12404,
  12405,
  12406,
  12407,
  12408,
  12409,
  12410,
  12411,
  12412,
  12413,
  12414,
  12415,
  12416,
  12417,
  12418,
  12419,
  12420,
  12421,
  12422,
  12423,
  12424,
  12425,
  12426,
  12427,
  12428,
  12429,
  12430,
  12431,
  12432,
  12433,
  12434,
  12435,
  12436,
  12437,
  12438,
  12445,
  12446,
  12447,
  12449,
  12450,
  12451,
  12452,
  12453,
  12454,
  12455,
  12456,
  12457,
  12458,
  12459,
  12460,
  12461,
  12462,
  12463,
  12464,
  12465,
  12466,
  12467,
  12468,
  12469,
  12470,
  12471,
  12472,
  12473,
  12474,
  12475,
  12476,
  12477,
  12478,
  12479,
  12480,
  12481,
  12482,
  12483,
  12484,
  12485,
  12486,
  12487,
  12488,
  12489,
  12490,
  12491,
  12492,
  12493,
  12494,
  12495,
  12496,
  12497,
  12498,
  12499,
  12500,
  12501,
  12502,
  12503,
  12504,
  12505,
  12506,
  12507,
  12508,
  12509,
  12510,
  12511,
  12512,
  12513,
  12514,
  12515,
  12516,
  12517,
  12518,
  12519,
  12520,
  12521,
  12522,
  12523,
  12524,
  12525,
  12526,
  12527,
  12528,
  12529,
  12530,
  12531,
  12532,
  12533,
  12534,
  12535,
  12536,
  12537,
  12538,
  12540,
  12541,
  12542,
  12543,
  12549,
  12550,
  12551,
  12552,
  12553,
  12554,
  12555,
  12556,
  12557,
  12558,
  12559,
  12560,
  12561,
  12562,
  12563,
  12564,
  12565,
  12566,
  12567,
  12568,
  12569,
  12570,
  12571,
  12572,
  12573,
  12574,
  12575,
  12576,
  12577,
  12578,
  12579,
  12580,
  12581,
  12582,
  12583,
  12584,
  12585,
  12586,
  12587,
  12588,
  12589,
  12593,
  12594,
  12595,
  12596,
  12597,
  12598,
  12599,
  12600,
  12601,
  12602,
  12603,
  12604,
  12605,
  12606,
  12607,
  12608,
  12609,
  12610,
  12611,
  12612,
  12613,
  12614,
  12615,
  12616,
  12617,
  12618,
  12619,
  12620,
  12621,
  12622,
  12623,
  12624,
  12625,
  12626,
  12627,
  12628,
  12629,
  12630,
  12631,
  12632,
  12633,
  12634,
  12635,
  12636,
  12637,
  12638,
  12639,
  12640,
  12641,
  12642,
  12643,
  12644,
  12645,
  12646,
  12647,
  12648,
  12649,
  12650,
  12651,
  12652,
  12653,
  12654,
  12655,
  12656,
  12657,
  12658,
  12659,
  12660,
  12661,
  12662,
  12663,
  12664,
  12665,
  12666,
  12667,
  12668,
  12669,
  12670,
  12671,
  12672,
  12673,
  12674,
  12675,
  12676,
  12677,
  12678,
  12679,
  12680,
  12681,
  12682,
  12683,
  12684,
  12685,
  12686,
  12704,
  12705,
  12706,
  12707,
  12708,
  12709,
  12710,
  12711,
  12712,
  12713,
  12714,
  12715,
  12716,
  12717,
  12718,
  12719,
  12720,
  12721,
  12722,
  12723,
  12724,
  12725,
  12726,
  12727,
  12728,
  12729,
  12730,
  12784,
  12785,
  12786,
  12787,
  12788,
  12789,
  12790,
  12791,
  12792,
  12793,
  12794,
  12795,
  12796,
  12797,
  12798,
  12799,
  13312,
  13313,
  13314,
  13315,
  13316,
  13317,
  13318,
  13319,
  13320,
  13321,
  13322,
  13323,
  13324,
  13325,
  13326,
  13327,
  13328,
  13329,
  13330,
  13331,
  13332,
  13333,
  13334,
  13335,
  13336,
  13337,
  13338,
  13339,
  13340,
  13341,
  13342,
  13343,
  13344,
  13345,
  13346,
  13347,
  13348,
  13349,
  13350,
  13351,
  13352,
  13353,
  13354,
  13355,
  13356,
  13357,
  13358,
  13359,
  13360,
  13361,
  13362,
  13363,
  13364,
  13365,
  13366,
  13367,
  13368,
  13369,
  13370,
  13371,
  13372,
  13373,
  13374,
  13375,
  13376,
  13377,
  13378,
  13379,
  13380,
  13381,
  13382,
  13383,
  13384,
  13385,
  13386,
  13387,
  13388,
  13389,
  13390,
  13391,
  13392,
  13393,
  13394,
  13395,
  13396,
  13397,
  13398,
  13399,
  13400,
  13401,
  13402,
  13403,
  13404,
  13405,
  13406,
  13407,
  13408,
  13409,
  13410,
  13411,
  13412,
  13413,
  13414,
  13415,
  13416,
  13417,
  13418,
  13419,
  13420,
  13421,
  13422,
  13423,
  13424,
  13425,
  13426,
  13427,
  13428,
  13429,
  13430,
  13431,
  13432,
  13433,
  13434,
  13435,
  13436,
  13437,
  13438,
  13439,
  13440,
  13441,
  13442,
  13443,
  13444,
  13445,
  13446,
  13447,
  13448,
  13449,
  13450,
  13451,
  13452,
  13453,
  13454,
  13455,
  13456,
  13457,
  13458,
  13459,
  13460,
  13461,
  13462,
  13463,
  13464,
  13465,
  13466,
  13467,
  13468,
  13469,
  13470,
  13471,
  13472,
  13473,
  13474,
  13475,
  13476,
  13477,
  13478,
  13479,
  13480,
  13481,
  13482,
  13483,
  13484,
  13485,
  13486,
  13487,
  13488,
  13489,
  13490,
  13491,
  13492,
  13493,
  13494,
  13495,
  13496,
  13497,
  13498,
  13499,
  13500,
  13501,
  13502,
  13503,
  13504,
  13505,
  13506,
  13507,
  13508,
  13509,
  13510,
  13511,
  13512,
  13513,
  13514,
  13515,
  13516,
  13517,
  13518,
  13519,
  13520,
  13521,
  13522,
  13523,
  13524,
  13525,
  13526,
  13527,
  13528,
  13529,
  13530,
  13531,
  13532,
  13533,
  13534,
  13535,
  13536,
  13537,
  13538,
  13539,
  13540,
  13541,
  13542,
  13543,
  13544,
  13545,
  13546,
  13547,
  13548,
  13549,
  13550,
  13551,
  13552,
  13553,
  13554,
  13555,
  13556,
  13557,
  13558,
  13559,
  13560,
  13561,
  13562,
  13563,
  13564,
  13565,
  13566,
  13567,
  13568,
  13569,
  13570,
  13571,
  13572,
  13573,
  13574,
  13575,
  13576,
  13577,
  13578,
  13579,
  13580,
  13581,
  13582,
  13583,
  13584,
  13585,
  13586,
  13587,
  13588,
  13589,
  13590,
  13591,
  13592,
  13593,
  13594,
  13595,
  13596,
  13597,
  13598,
  13599,
  13600,
  13601,
  13602,
  13603,
  13604,
  13605,
  13606,
  13607,
  13608,
  13609,
  13610,
  13611,
  13612,
  13613,
  13614,
  13615,
  13616,
  13617,
  13618,
  13619,
  13620,
  13621,
  13622,
  13623,
  13624,
  13625,
  13626,
  13627,
  13628,
  13629,
  13630,
  13631,
  13632,
  13633,
  13634,
  13635,
  13636,
  13637,
  13638,
  13639,
  13640,
  13641,
  13642,
  13643,
  13644,
  13645,
  13646,
  13647,
  13648,
  13649,
  13650,
  13651,
  13652,
  13653,
  13654,
  13655,
  13656,
  13657,
  13658,
  13659,
  13660,
  13661,
  13662,
  13663,
  13664,
  13665,
  13666,
  13667,
  13668,
  13669,
  13670,
  13671,
  13672,
  13673,
  13674,
  13675,
  13676,
  13677,
  13678,
  13679,
  13680,
  13681,
  13682,
  13683,
  13684,
  13685,
  13686,
  13687,
  13688,
  13689,
  13690,
  13691,
  13692,
  13693,
  13694,
  13695,
  13696,
  13697,
  13698,
  13699,
  13700,
  13701,
  13702,
  13703,
  13704,
  13705,
  13706,
  13707,
  13708,
  13709,
  13710,
  13711,
  13712,
  13713,
  13714,
  13715,
  13716,
  13717,
  13718,
  13719,
  13720,
  13721,
  13722,
  13723,
  13724,
  13725,
  13726,
  13727,
  13728,
  13729,
  13730,
  13731,
  13732,
  13733,
  13734,
  13735,
  13736,
  13737,
  13738,
  13739,
  13740,
  13741,
  13742,
  13743,
  13744,
  13745,
  13746,
  13747,
  13748,
  13749,
  13750,
  13751,
  13752,
  13753,
  13754,
  13755,
  13756,
  13757,
  13758,
  13759,
  13760,
  13761,
  13762,
  13763,
  13764,
  13765,
  13766,
  13767,
  13768,
  13769,
  13770,
  13771,
  13772,
  13773,
  13774,
  13775,
  13776,
  13777,
  13778,
  13779,
  13780,
  13781,
  13782,
  13783,
  13784,
  13785,
  13786,
  13787,
  13788,
  13789,
  13790,
  13791,
  13792,
  13793,
  13794,
  13795,
  13796,
  13797,
  13798,
  13799,
  13800,
  13801,
  13802,
  13803,
  13804,
  13805,
  13806,
  13807,
  13808,
  13809,
  13810,
  13811,
  13812,
  13813,
  13814,
  13815,
  13816,
  13817,
  13818,
  13819,
  13820,
  13821,
  13822,
  13823,
  13824,
  13825,
  13826,
  13827,
  13828,
  13829,
  13830,
  13831,
  13832,
  13833,
  13834,
  13835,
  13836,
  13837,
  13838,
  13839,
  13840,
  13841,
  13842,
  13843,
  13844,
  13845,
  13846,
  13847,
  13848,
  13849,
  13850,
  13851,
  13852,
  13853,
  13854,
  13855,
  13856,
  13857,
  13858,
  13859,
  13860,
  13861,
  13862,
  13863,
  13864,
  13865,
  13866,
  13867,
  13868,
  13869,
  13870,
  13871,
  13872,
  13873,
  13874,
  13875,
  13876,
  13877,
  13878,
  13879,
  13880,
  13881,
  13882,
  13883,
  13884,
  13885,
  13886,
  13887,
  13888,
  13889,
  13890,
  13891,
  13892,
  13893,
  13894,
  13895,
  13896,
  13897,
  13898,
  13899,
  13900,
  13901,
  13902,
  13903,
  13904,
  13905,
  13906,
  13907,
  13908,
  13909,
  13910,
  13911,
  13912,
  13913,
  13914,
  13915,
  13916,
  13917,
  13918,
  13919,
  13920,
  13921,
  13922,
  13923,
  13924,
  13925,
  13926,
  13927,
  13928,
  13929,
  13930,
  13931,
  13932,
  13933,
  13934,
  13935,
  13936,
  13937,
  13938,
  13939,
  13940,
  13941,
  13942,
  13943,
  13944,
  13945,
  13946,
  13947,
  13948,
  13949,
  13950,
  13951,
  13952,
  13953,
  13954,
  13955,
  13956,
  13957,
  13958,
  13959,
  13960,
  13961,
  13962,
  13963,
  13964,
  13965,
  13966,
  13967,
  13968,
  13969,
  13970,
  13971,
  13972,
  13973,
  13974,
  13975,
  13976,
  13977,
  13978,
  13979,
  13980,
  13981,
  13982,
  13983,
  13984,
  13985,
  13986,
  13987,
  13988,
  13989,
  13990,
  13991,
  13992,
  13993,
  13994,
  13995,
  13996,
  13997,
  13998,
  13999,
  14000,
  14001,
  14002,
  14003,
  14004,
  14005,
  14006,
  14007,
  14008,
  14009,
  14010,
  14011,
  14012,
  14013,
  14014,
  14015,
  14016,
  14017,
  14018,
  14019,
  14020,
  14021,
  14022,
  14023,
  14024,
  14025,
  14026,
  14027,
  14028,
  14029,
  14030,
  14031,
  14032,
  14033,
  14034,
  14035,
  14036,
  14037,
  14038,
  14039,
  14040,
  14041,
  14042,
  14043,
  14044,
  14045,
  14046,
  14047,
  14048,
  14049,
  14050,
  14051,
  14052,
  14053,
  14054,
  14055,
  14056,
  14057,
  14058,
  14059,
  14060,
  14061,
  14062,
  14063,
  14064,
  14065,
  14066,
  14067,
  14068,
  14069,
  14070,
  14071,
  14072,
  14073,
  14074,
  14075,
  14076,
  14077,
  14078,
  14079,
  14080,
  14081,
  14082,
  14083,
  14084,
  14085,
  14086,
  14087,
  14088,
  14089,
  14090,
  14091,
  14092,
  14093,
  14094,
  14095,
  14096,
  14097,
  14098,
  14099,
  14100,
  14101,
  14102,
  14103,
  14104,
  14105,
  14106,
  14107,
  14108,
  14109,
  14110,
  14111,
  14112,
  14113,
  14114,
  14115,
  14116,
  14117,
  14118,
  14119,
  14120,
  14121,
  14122,
  14123,
  14124,
  14125,
  14126,
  14127,
  14128,
  14129,
  14130,
  14131,
  14132,
  14133,
  14134,
  14135,
  14136,
  14137,
  14138,
  14139,
  14140,
  14141,
  14142,
  14143,
  14144,
  14145,
  14146,
  14147,
  14148,
  14149,
  14150,
  14151,
  14152,
  14153,
  14154,
  14155,
  14156,
  14157,
  14158,
  14159,
  14160,
  14161,
  14162,
  14163,
  14164,
  14165,
  14166,
  14167,
  14168,
  14169,
  14170,
  14171,
  14172,
  14173,
  14174,
  14175,
  14176,
  14177,
  14178,
  14179,
  14180,
  14181,
  14182,
  14183,
  14184,
  14185,
  14186,
  14187,
  14188,
  14189,
  14190,
  14191,
  14192,
  14193,
  14194,
  14195,
  14196,
  14197,
  14198,
  14199,
  14200,
  14201,
  14202,
  14203,
  14204,
  14205,
  14206,
  14207,
  14208,
  14209,
  14210,
  14211,
  14212,
  14213,
  14214,
  14215,
  14216,
  14217,
  14218,
  14219,
  14220,
  14221,
  14222,
  14223,
  14224,
  14225,
  14226,
  14227,
  14228,
  14229,
  14230,
  14231,
  14232,
  14233,
  14234,
  14235,
  14236,
  14237,
  14238,
  14239,
  14240,
  14241,
  14242,
  14243,
  14244,
  14245,
  14246,
  14247,
  14248,
  14249,
  14250,
  14251,
  14252,
  14253,
  14254,
  14255,
  14256,
  14257,
  14258,
  14259,
  14260,
  14261,
  14262,
  14263,
  14264,
  14265,
  14266,
  14267,
  14268,
  14269,
  14270,
  14271,
  14272,
  14273,
  14274,
  14275,
  14276,
  14277,
  14278,
  14279,
  14280,
  14281,
  14282,
  14283,
  14284,
  14285,
  14286,
  14287,
  14288,
  14289,
  14290,
  14291,
  14292,
  14293,
  14294,
  14295,
  14296,
  14297,
  14298,
  14299,
  14300,
  14301,
  14302,
  14303,
  14304,
  14305,
  14306,
  14307,
  14308,
  14309,
  14310,
  14311,
  14312,
  14313,
  14314,
  14315,
  14316,
  14317,
  14318,
  14319,
  14320,
  14321,
  14322,
  14323,
  14324,
  14325,
  14326,
  14327,
  14328,
  14329,
  14330,
  14331,
  14332,
  14333,
  14334,
  14335,
  14336,
  14337,
  14338,
  14339,
  14340,
  14341,
  14342,
  14343,
  14344,
  14345,
  14346,
  14347,
  14348,
  14349,
  14350,
  14351,
  14352,
  14353,
  14354,
  14355,
  14356,
  14357,
  14358,
  14359,
  14360,
  14361,
  14362,
  14363,
  14364,
  14365,
  14366,
  14367,
  14368,
  14369,
  14370,
  14371,
  14372,
  14373,
  14374,
  14375,
  14376,
  14377,
  14378,
  14379,
  14380,
  14381,
  14382,
  14383,
  14384,
  14385,
  14386,
  14387,
  14388,
  14389,
  14390,
  14391,
  14392,
  14393,
  14394,
  14395,
  14396,
  14397,
  14398,
  14399,
  14400,
  14401,
  14402,
  14403,
  14404,
  14405,
  14406,
  14407,
  14408,
  14409,
  14410,
  14411,
  14412,
  14413,
  14414,
  14415,
  14416,
  14417,
  14418,
  14419,
  14420,
  14421,
  14422,
  14423,
  14424,
  14425,
  14426,
  14427,
  14428,
  14429,
  14430,
  14431,
  14432,
  14433,
  14434,
  14435,
  14436,
  14437,
  14438,
  14439,
  14440,
  14441,
  14442,
  14443,
  14444,
  14445,
  14446,
  14447,
  14448,
  14449,
  14450,
  14451,
  14452,
  14453,
  14454,
  14455,
  14456,
  14457,
  14458,
  14459,
  14460,
  14461,
  14462,
  14463,
  14464,
  14465,
  14466,
  14467,
  14468,
  14469,
  14470,
  14471,
  14472,
  14473,
  14474,
  14475,
  14476,
  14477,
  14478,
  14479,
  14480,
  14481,
  14482,
  14483,
  14484,
  14485,
  14486,
  14487,
  14488,
  14489,
  14490,
  14491,
  14492,
  14493,
  14494,
  14495,
  14496,
  14497,
  14498,
  14499,
  14500,
  14501,
  14502,
  14503,
  14504,
  14505,
  14506,
  14507,
  14508,
  14509,
  14510,
  14511,
  14512,
  14513,
  14514,
  14515,
  14516,
  14517,
  14518,
  14519,
  14520,
  14521,
  14522,
  14523,
  14524,
  14525,
  14526,
  14527,
  14528,
  14529,
  14530,
  14531,
  14532,
  14533,
  14534,
  14535,
  14536,
  14537,
  14538,
  14539,
  14540,
  14541,
  14542,
  14543,
  14544,
  14545,
  14546,
  14547,
  14548,
  14549,
  14550,
  14551,
  14552,
  14553,
  14554,
  14555,
  14556,
  14557,
  14558,
  14559,
  14560,
  14561,
  14562,
  14563,
  14564,
  14565,
  14566,
  14567,
  14568,
  14569,
  14570,
  14571,
  14572,
  14573,
  14574,
  14575,
  14576,
  14577,
  14578,
  14579,
  14580,
  14581,
  14582,
  14583,
  14584,
  14585,
  14586,
  14587,
  14588,
  14589,
  14590,
  14591,
  14592,
  14593,
  14594,
  14595,
  14596,
  14597,
  14598,
  14599,
  14600,
  14601,
  14602,
  14603,
  14604,
  14605,
  14606,
  14607,
  14608,
  14609,
  14610,
  14611,
  14612,
  14613,
  14614,
  14615,
  14616,
  14617,
  14618,
  14619,
  14620,
  14621,
  14622,
  14623,
  14624,
  14625,
  14626,
  14627,
  14628,
  14629,
  14630,
  14631,
  14632,
  14633,
  14634,
  14635,
  14636,
  14637,
  14638,
  14639,
  14640,
  14641,
  14642,
  14643,
  14644,
  14645,
  14646,
  14647,
  14648,
  14649,
  14650,
  14651,
  14652,
  14653,
  14654,
  14655,
  14656,
  14657,
  14658,
  14659,
  14660,
  14661,
  14662,
  14663,
  14664,
  14665,
  14666,
  14667,
  14668,
  14669,
  14670,
  14671,
  14672,
  14673,
  14674,
  14675,
  14676,
  14677,
  14678,
  14679,
  14680,
  14681,
  14682,
  14683,
  14684,
  14685,
  14686,
  14687,
  14688,
  14689,
  14690,
  14691,
  14692,
  14693,
  14694,
  14695,
  14696,
  14697,
  14698,
  14699,
  14700,
  14701,
  14702,
  14703,
  14704,
  14705,
  14706,
  14707,
  14708,
  14709,
  14710,
  14711,
  14712,
  14713,
  14714,
  14715,
  14716,
  14717,
  14718,
  14719,
  14720,
  14721,
  14722,
  14723,
  14724,
  14725,
  14726,
  14727,
  14728,
  14729,
  14730,
  14731,
  14732,
  14733,
  14734,
  14735,
  14736,
  14737,
  14738,
  14739,
  14740,
  14741,
  14742,
  14743,
  14744,
  14745,
  14746,
  14747,
  14748,
  14749,
  14750,
  14751,
  14752,
  14753,
  14754,
  14755,
  14756,
  14757,
  14758,
  14759,
  14760,
  14761,
  14762,
  14763,
  14764,
  14765,
  14766,
  14767,
  14768,
  14769,
  14770,
  14771,
  14772,
  14773,
  14774,
  14775,
  14776,
  14777,
  14778,
  14779,
  14780,
  14781,
  14782,
  14783,
  14784,
  14785,
  14786,
  14787,
  14788,
  14789,
  14790,
  14791,
  14792,
  14793,
  14794,
  14795,
  14796,
  14797,
  14798,
  14799,
  14800,
  14801,
  14802,
  14803,
  14804,
  14805,
  14806,
  14807,
  14808,
  14809,
  14810,
  14811,
  14812,
  14813,
  14814,
  14815,
  14816,
  14817,
  14818,
  14819,
  14820,
  14821,
  14822,
  14823,
  14824,
  14825,
  14826,
  14827,
  14828,
  14829,
  14830,
  14831,
  14832,
  14833,
  14834,
  14835,
  14836,
  14837,
  14838,
  14839,
  14840,
  14841,
  14842,
  14843,
  14844,
  14845,
  14846,
  14847,
  14848,
  14849,
  14850,
  14851,
  14852,
  14853,
  14854,
  14855,
  14856,
  14857,
  14858,
  14859,
  14860,
  14861,
  14862,
  14863,
  14864,
  14865,
  14866,
  14867,
  14868,
  14869,
  14870,
  14871,
  14872,
  14873,
  14874,
  14875,
  14876,
  14877,
  14878,
  14879,
  14880,
  14881,
  14882,
  14883,
  14884,
  14885,
  14886,
  14887,
  14888,
  14889,
  14890,
  14891,
  14892,
  14893,
  14894,
  14895,
  14896,
  14897,
  14898,
  14899,
  14900,
  14901,
  14902,
  14903,
  14904,
  14905,
  14906,
  14907,
  14908,
  14909,
  14910,
  14911,
  14912,
  14913,
  14914,
  14915,
  14916,
  14917,
  14918,
  14919,
  14920,
  14921,
  14922,
  14923,
  14924,
  14925,
  14926,
  14927,
  14928,
  14929,
  14930,
  14931,
  14932,
  14933,
  14934,
  14935,
  14936,
  14937,
  14938,
  14939,
  14940,
  14941,
  14942,
  14943,
  14944,
  14945,
  14946,
  14947,
  14948,
  14949,
  14950,
  14951,
  14952,
  14953,
  14954,
  14955,
  14956,
  14957,
  14958,
  14959,
  14960,
  14961,
  14962,
  14963,
  14964,
  14965,
  14966,
  14967,
  14968,
  14969,
  14970,
  14971,
  14972,
  14973,
  14974,
  14975,
  14976,
  14977,
  14978,
  14979,
  14980,
  14981,
  14982,
  14983,
  14984,
  14985,
  14986,
  14987,
  14988,
  14989,
  14990,
  14991,
  14992,
  14993,
  14994,
  14995,
  14996,
  14997,
  14998,
  14999,
  15000,
  15001,
  15002,
  15003,
  15004,
  15005,
  15006,
  15007,
  15008,
  15009,
  15010,
  15011,
  15012,
  15013,
  15014,
  15015,
  15016,
  15017,
  15018,
  15019,
  15020,
  15021,
  15022,
  15023,
  15024,
  15025,
  15026,
  15027,
  15028,
  15029,
  15030,
  15031,
  15032,
  15033,
  15034,
  15035,
  15036,
  15037,
  15038,
  15039,
  15040,
  15041,
  15042,
  15043,
  15044,
  15045,
  15046,
  15047,
  15048,
  15049,
  15050,
  15051,
  15052,
  15053,
  15054,
  15055,
  15056,
  15057,
  15058,
  15059,
  15060,
  15061,
  15062,
  15063,
  15064,
  15065,
  15066,
  15067,
  15068,
  15069,
  15070,
  15071,
  15072,
  15073,
  15074,
  15075,
  15076,
  15077,
  15078,
  15079,
  15080,
  15081,
  15082,
  15083,
  15084,
  15085,
  15086,
  15087,
  15088,
  15089,
  15090,
  15091,
  15092,
  15093,
  15094,
  15095,
  15096,
  15097,
  15098,
  15099,
  15100,
  15101,
  15102,
  15103,
  15104,
  15105,
  15106,
  15107,
  15108,
  15109,
  15110,
  15111,
  15112,
  15113,
  15114,
  15115,
  15116,
  15117,
  15118,
  15119,
  15120,
  15121,
  15122,
  15123,
  15124,
  15125,
  15126,
  15127,
  15128,
  15129,
  15130,
  15131,
  15132,
  15133,
  15134,
  15135,
  15136,
  15137,
  15138,
  15139,
  15140,
  15141,
  15142,
  15143,
  15144,
  15145,
  15146,
  15147,
  15148,
  15149,
  15150,
  15151,
  15152,
  15153,
  15154,
  15155,
  15156,
  15157,
  15158,
  15159,
  15160,
  15161,
  15162,
  15163,
  15164,
  15165,
  15166,
  15167,
  15168,
  15169,
  15170,
  15171,
  15172,
  15173,
  15174,
  15175,
  15176,
  15177,
  15178,
  15179,
  15180,
  15181,
  15182,
  15183,
  15184,
  15185,
  15186,
  15187,
  15188,
  15189,
  15190,
  15191,
  15192,
  15193,
  15194,
  15195,
  15196,
  15197,
  15198,
  15199,
  15200,
  15201,
  15202,
  15203,
  15204,
  15205,
  15206,
  15207,
  15208,
  15209,
  15210,
  15211,
  15212,
  15213,
  15214,
  15215,
  15216,
  15217,
  15218,
  15219,
  15220,
  15221,
  15222,
  15223,
  15224,
  15225,
  15226,
  15227,
  15228,
  15229,
  15230,
  15231,
  15232,
  15233,
  15234,
  15235,
  15236,
  15237,
  15238,
  15239,
  15240,
  15241,
  15242,
  15243,
  15244,
  15245,
  15246,
  15247,
  15248,
  15249,
  15250,
  15251,
  15252,
  15253,
  15254,
  15255,
  15256,
  15257,
  15258,
  15259,
  15260,
  15261,
  15262,
  15263,
  15264,
  15265,
  15266,
  15267,
  15268,
  15269,
  15270,
  15271,
  15272,
  15273,
  15274,
  15275,
  15276,
  15277,
  15278,
  15279,
  15280,
  15281,
  15282,
  15283,
  15284,
  15285,
  15286,
  15287,
  15288,
  15289,
  15290,
  15291,
  15292,
  15293,
  15294,
  15295,
  15296,
  15297,
  15298,
  15299,
  15300,
  15301,
  15302,
  15303,
  15304,
  15305,
  15306,
  15307,
  15308,
  15309,
  15310,
  15311,
  15312,
  15313,
  15314,
  15315,
  15316,
  15317,
  15318,
  15319,
  15320,
  15321,
  15322,
  15323,
  15324,
  15325,
  15326,
  15327,
  15328,
  15329,
  15330,
  15331,
  15332,
  15333,
  15334,
  15335,
  15336,
  15337,
  15338,
  15339,
  15340,
  15341,
  15342,
  15343,
  15344,
  15345,
  15346,
  15347,
  15348,
  15349,
  15350,
  15351,
  15352,
  15353,
  15354,
  15355,
  15356,
  15357,
  15358,
  15359,
  15360,
  15361,
  15362,
  15363,
  15364,
  15365,
  15366,
  15367,
  15368,
  15369,
  15370,
  15371,
  15372,
  15373,
  15374,
  15375,
  15376,
  15377,
  15378,
  15379,
  15380,
  15381,
  15382,
  15383,
  15384,
  15385,
  15386,
  15387,
  15388,
  15389,
  15390,
  15391,
  15392,
  15393,
  15394,
  15395,
  15396,
  15397,
  15398,
  15399,
  15400,
  15401,
  15402,
  15403,
  15404,
  15405,
  15406,
  15407,
  15408,
  15409,
  15410,
  15411,
  15412,
  15413,
  15414,
  15415,
  15416,
  15417,
  15418,
  15419,
  15420,
  15421,
  15422,
  15423,
  15424,
  15425,
  15426,
  15427,
  15428,
  15429,
  15430,
  15431,
  15432,
  15433,
  15434,
  15435,
  15436,
  15437,
  15438,
  15439,
  15440,
  15441,
  15442,
  15443,
  15444,
  15445,
  15446,
  15447,
  15448,
  15449,
  15450,
  15451,
  15452,
  15453,
  15454,
  15455,
  15456,
  15457,
  15458,
  15459,
  15460,
  15461,
  15462,
  15463,
  15464,
  15465,
  15466,
  15467,
  15468,
  15469,
  15470,
  15471,
  15472,
  15473,
  15474,
  15475,
  15476,
  15477,
  15478,
  15479,
  15480,
  15481,
  15482,
  15483,
  15484,
  15485,
  15486,
  15487,
  15488,
  15489,
  15490,
  15491,
  15492,
  15493,
  15494,
  15495,
  15496,
  15497,
  15498,
  15499,
  15500,
  15501,
  15502,
  15503,
  15504,
  15505,
  15506,
  15507,
  15508,
  15509,
  15510,
  15511,
  15512,
  15513,
  15514,
  15515,
  15516,
  15517,
  15518,
  15519,
  15520,
  15521,
  15522,
  15523,
  15524,
  15525,
  15526,
  15527,
  15528,
  15529,
  15530,
  15531,
  15532,
  15533,
  15534,
  15535,
  15536,
  15537,
  15538,
  15539,
  15540,
  15541,
  15542,
  15543,
  15544,
  15545,
  15546,
  15547,
  15548,
  15549,
  15550,
  15551,
  15552,
  15553,
  15554,
  15555,
  15556,
  15557,
  15558,
  15559,
  15560,
  15561,
  15562,
  15563,
  15564,
  15565,
  15566,
  15567,
  15568,
  15569,
  15570,
  15571,
  15572,
  15573,
  15574,
  15575,
  15576,
  15577,
  15578,
  15579,
  15580,
  15581,
  15582,
  15583,
  15584,
  15585,
  15586,
  15587,
  15588,
  15589,
  15590,
  15591,
  15592,
  15593,
  15594,
  15595,
  15596,
  15597,
  15598,
  15599,
  15600,
  15601,
  15602,
  15603,
  15604,
  15605,
  15606,
  15607,
  15608,
  15609,
  15610,
  15611,
  15612,
  15613,
  15614,
  15615,
  15616,
  15617,
  15618,
  15619,
  15620,
  15621,
  15622,
  15623,
  15624,
  15625,
  15626,
  15627,
  15628,
  15629,
  15630,
  15631,
  15632,
  15633,
  15634,
  15635,
  15636,
  15637,
  15638,
  15639,
  15640,
  15641,
  15642,
  15643,
  15644,
  15645,
  15646,
  15647,
  15648,
  15649,
  15650,
  15651,
  15652,
  15653,
  15654,
  15655,
  15656,
  15657,
  15658,
  15659,
  15660,
  15661,
  15662,
  15663,
  15664,
  15665,
  15666,
  15667,
  15668,
  15669,
  15670,
  15671,
  15672,
  15673,
  15674,
  15675,
  15676,
  15677,
  15678,
  15679,
  15680,
  15681,
  15682,
  15683,
  15684,
  15685,
  15686,
  15687,
  15688,
  15689,
  15690,
  15691,
  15692,
  15693,
  15694,
  15695,
  15696,
  15697,
  15698,
  15699,
  15700,
  15701,
  15702,
  15703,
  15704,
  15705,
  15706,
  15707,
  15708,
  15709,
  15710,
  15711,
  15712,
  15713,
  15714,
  15715,
  15716,
  15717,
  15718,
  15719,
  15720,
  15721,
  15722,
  15723,
  15724,
  15725,
  15726,
  15727,
  15728,
  15729,
  15730,
  15731,
  15732,
  15733,
  15734,
  15735,
  15736,
  15737,
  15738,
  15739,
  15740,
  15741,
  15742,
  15743,
  15744,
  15745,
  15746,
  15747,
  15748,
  15749,
  15750,
  15751,
  15752,
  15753,
  15754,
  15755,
  15756,
  15757,
  15758,
  15759,
  15760,
  15761,
  15762,
  15763,
  15764,
  15765,
  15766,
  15767,
  15768,
  15769,
  15770,
  15771,
  15772,
  15773,
  15774,
  15775,
  15776,
  15777,
  15778,
  15779,
  15780,
  15781,
  15782,
  15783,
  15784,
  15785,
  15786,
  15787,
  15788,
  15789,
  15790,
  15791,
  15792,
  15793,
  15794,
  15795,
  15796,
  15797,
  15798,
  15799,
  15800,
  15801,
  15802,
  15803,
  15804,
  15805,
  15806,
  15807,
  15808,
  15809,
  15810,
  15811,
  15812,
  15813,
  15814,
  15815,
  15816,
  15817,
  15818,
  15819,
  15820,
  15821,
  15822,
  15823,
  15824,
  15825,
  15826,
  15827,
  15828,
  15829,
  15830,
  15831,
  15832,
  15833,
  15834,
  15835,
  15836,
  15837,
  15838,
  15839,
  15840,
  15841,
  15842,
  15843,
  15844,
  15845,
  15846,
  15847,
  15848,
  15849,
  15850,
  15851,
  15852,
  15853,
  15854,
  15855,
  15856,
  15857,
  15858,
  15859,
  15860,
  15861,
  15862,
  15863,
  15864,
  15865,
  15866,
  15867,
  15868,
  15869,
  15870,
  15871,
  15872,
  15873,
  15874,
  15875,
  15876,
  15877,
  15878,
  15879,
  15880,
  15881,
  15882,
  15883,
  15884,
  15885,
  15886,
  15887,
  15888,
  15889,
  15890,
  15891,
  15892,
  15893,
  15894,
  15895,
  15896,
  15897,
  15898,
  15899,
  15900,
  15901,
  15902,
  15903,
  15904,
  15905,
  15906,
  15907,
  15908,
  15909,
  15910,
  15911,
  15912,
  15913,
  15914,
  15915,
  15916,
  15917,
  15918,
  15919,
  15920,
  15921,
  15922,
  15923,
  15924,
  15925,
  15926,
  15927,
  15928,
  15929,
  15930,
  15931,
  15932,
  15933,
  15934,
  15935,
  15936,
  15937,
  15938,
  15939,
  15940,
  15941,
  15942,
  15943,
  15944,
  15945,
  15946,
  15947,
  15948,
  15949,
  15950,
  15951,
  15952,
  15953,
  15954,
  15955,
  15956,
  15957,
  15958,
  15959,
  15960,
  15961,
  15962,
  15963,
  15964,
  15965,
  15966,
  15967,
  15968,
  15969,
  15970,
  15971,
  15972,
  15973,
  15974,
  15975,
  15976,
  15977,
  15978,
  15979,
  15980,
  15981,
  15982,
  15983,
  15984,
  15985,
  15986,
  15987,
  15988,
  15989,
  15990,
  15991,
  15992,
  15993,
  15994,
  15995,
  15996,
  15997,
  15998,
  15999,
  16000,
  16001,
  16002,
  16003,
  16004,
  16005,
  16006,
  16007,
  16008,
  16009,
  16010,
  16011,
  16012,
  16013,
  16014,
  16015,
  16016,
  16017,
  16018,
  16019,
  16020,
  16021,
  16022,
  16023,
  16024,
  16025,
  16026,
  16027,
  16028,
  16029,
  16030,
  16031,
  16032,
  16033,
  16034,
  16035,
  16036,
  16037,
  16038,
  16039,
  16040,
  16041,
  16042,
  16043,
  16044,
  16045,
  16046,
  16047,
  16048,
  16049,
  16050,
  16051,
  16052,
  16053,
  16054,
  16055,
  16056,
  16057,
  16058,
  16059,
  16060,
  16061,
  16062,
  16063,
  16064,
  16065,
  16066,
  16067,
  16068,
  16069,
  16070,
  16071,
  16072,
  16073,
  16074,
  16075,
  16076,
  16077,
  16078,
  16079,
  16080,
  16081,
  16082,
  16083,
  16084,
  16085,
  16086,
  16087,
  16088,
  16089,
  16090,
  16091,
  16092,
  16093,
  16094,
  16095,
  16096,
  16097,
  16098,
  16099,
  16100,
  16101,
  16102,
  16103,
  16104,
  16105,
  16106,
  16107,
  16108,
  16109,
  16110,
  16111,
  16112,
  16113,
  16114,
  16115,
  16116,
  16117,
  16118,
  16119,
  16120,
  16121,
  16122,
  16123,
  16124,
  16125,
  16126,
  16127,
  16128,
  16129,
  16130,
  16131,
  16132,
  16133,
  16134,
  16135,
  16136,
  16137,
  16138,
  16139,
  16140,
  16141,
  16142,
  16143,
  16144,
  16145,
  16146,
  16147,
  16148,
  16149,
  16150,
  16151,
  16152,
  16153,
  16154,
  16155,
  16156,
  16157,
  16158,
  16159,
  16160,
  16161,
  16162,
  16163,
  16164,
  16165,
  16166,
  16167,
  16168,
  16169,
  16170,
  16171,
  16172,
  16173,
  16174,
  16175,
  16176,
  16177,
  16178,
  16179,
  16180,
  16181,
  16182,
  16183,
  16184,
  16185,
  16186,
  16187,
  16188,
  16189,
  16190,
  16191,
  16192,
  16193,
  16194,
  16195,
  16196,
  16197,
  16198,
  16199,
  16200,
  16201,
  16202,
  16203,
  16204,
  16205,
  16206,
  16207,
  16208,
  16209,
  16210,
  16211,
  16212,
  16213,
  16214,
  16215,
  16216,
  16217,
  16218,
  16219,
  16220,
  16221,
  16222,
  16223,
  16224,
  16225,
  16226,
  16227,
  16228,
  16229,
  16230,
  16231,
  16232,
  16233,
  16234,
  16235,
  16236,
  16237,
  16238,
  16239,
  16240,
  16241,
  16242,
  16243,
  16244,
  16245,
  16246,
  16247,
  16248,
  16249,
  16250,
  16251,
  16252,
  16253,
  16254,
  16255,
  16256,
  16257,
  16258,
  16259,
  16260,
  16261,
  16262,
  16263,
  16264,
  16265,
  16266,
  16267,
  16268,
  16269,
  16270,
  16271,
  16272,
  16273,
  16274,
  16275,
  16276,
  16277,
  16278,
  16279,
  16280,
  16281,
  16282,
  16283,
  16284,
  16285,
  16286,
  16287,
  16288,
  16289,
  16290,
  16291,
  16292,
  16293,
  16294,
  16295,
  16296,
  16297,
  16298,
  16299,
  16300,
  16301,
  16302,
  16303,
  16304,
  16305,
  16306,
  16307,
  16308,
  16309,
  16310,
  16311,
  16312,
  16313,
  16314,
  16315,
  16316,
  16317,
  16318,
  16319,
  16320,
  16321,
  16322,
  16323,
  16324,
  16325,
  16326,
  16327,
  16328,
  16329,
  16330,
  16331,
  16332,
  16333,
  16334,
  16335,
  16336,
  16337,
  16338,
  16339,
  16340,
  16341,
  16342,
  16343,
  16344,
  16345,
  16346,
  16347,
  16348,
  16349,
  16350,
  16351,
  16352,
  16353,
  16354,
  16355,
  16356,
  16357,
  16358,
  16359,
  16360,
  16361,
  16362,
  16363,
  16364,
  16365,
  16366,
  16367,
  16368,
  16369,
  16370,
  16371,
  16372,
  16373,
  16374,
  16375,
  16376,
  16377,
  16378,
  16379,
  16380,
  16381,
  16382,
  16383,
  16384,
  16385,
  16386,
  16387,
  16388,
  16389,
  16390,
  16391,
  16392,
  16393,
  16394,
  16395,
  16396,
  16397,
  16398,
  16399,
  16400,
  16401,
  16402,
  16403,
  16404,
  16405,
  16406,
  16407,
  16408,
  16409,
  16410,
  16411,
  16412,
  16413,
  16414,
  16415,
  16416,
  16417,
  16418,
  16419,
  16420,
  16421,
  16422,
  16423,
  16424,
  16425,
  16426,
  16427,
  16428,
  16429,
  16430,
  16431,
  16432,
  16433,
  16434,
  16435,
  16436,
  16437,
  16438,
  16439,
  16440,
  16441,
  16442,
  16443,
  16444,
  16445,
  16446,
  16447,
  16448,
  16449,
  16450,
  16451,
  16452,
  16453,
  16454,
  16455,
  16456,
  16457,
  16458,
  16459,
  16460,
  16461,
  16462,
  16463,
  16464,
  16465,
  16466,
  16467,
  16468,
  16469,
  16470,
  16471,
  16472,
  16473,
  16474,
  16475,
  16476,
  16477,
  16478,
  16479,
  16480,
  16481,
  16482,
  16483,
  16484,
  16485,
  16486,
  16487,
  16488,
  16489,
  16490,
  16491,
  16492,
  16493,
  16494,
  16495,
  16496,
  16497,
  16498,
  16499,
  16500,
  16501,
  16502,
  16503,
  16504,
  16505,
  16506,
  16507,
  16508,
  16509,
  16510,
  16511,
  16512,
  16513,
  16514,
  16515,
  16516,
  16517,
  16518,
  16519,
  16520,
  16521,
  16522,
  16523,
  16524,
  16525,
  16526,
  16527,
  16528,
  16529,
  16530,
  16531,
  16532,
  16533,
  16534,
  16535,
  16536,
  16537,
  16538,
  16539,
  16540,
  16541,
  16542,
  16543,
  16544,
  16545,
  16546,
  16547,
  16548,
  16549,
  16550,
  16551,
  16552,
  16553,
  16554,
  16555,
  16556,
  16557,
  16558,
  16559,
  16560,
  16561,
  16562,
  16563,
  16564,
  16565,
  16566,
  16567,
  16568,
  16569,
  16570,
  16571,
  16572,
  16573,
  16574,
  16575,
  16576,
  16577,
  16578,
  16579,
  16580,
  16581,
  16582,
  16583,
  16584,
  16585,
  16586,
  16587,
  16588,
  16589,
  16590,
  16591,
  16592,
  16593,
  16594,
  16595,
  16596,
  16597,
  16598,
  16599,
  16600,
  16601,
  16602,
  16603,
  16604,
  16605,
  16606,
  16607,
  16608,
  16609,
  16610,
  16611,
  16612,
  16613,
  16614,
  16615,
  16616,
  16617,
  16618,
  16619,
  16620,
  16621,
  16622,
  16623,
  16624,
  16625,
  16626,
  16627,
  16628,
  16629,
  16630,
  16631,
  16632,
  16633,
  16634,
  16635,
  16636,
  16637,
  16638,
  16639,
  16640,
  16641,
  16642,
  16643,
  16644,
  16645,
  16646,
  16647,
  16648,
  16649,
  16650,
  16651,
  16652,
  16653,
  16654,
  16655,
  16656,
  16657,
  16658,
  16659,
  16660,
  16661,
  16662,
  16663,
  16664,
  16665,
  16666,
  16667,
  16668,
  16669,
  16670,
  16671,
  16672,
  16673,
  16674,
  16675,
  16676,
  16677,
  16678,
  16679,
  16680,
  16681,
  16682,
  16683,
  16684,
  16685,
  16686,
  16687,
  16688,
  16689,
  16690,
  16691,
  16692,
  16693,
  16694,
  16695,
  16696,
  16697,
  16698,
  16699,
  16700,
  16701,
  16702,
  16703,
  16704,
  16705,
  16706,
  16707,
  16708,
  16709,
  16710,
  16711,
  16712,
  16713,
  16714,
  16715,
  16716,
  16717,
  16718,
  16719,
  16720,
  16721,
  16722,
  16723,
  16724,
  16725,
  16726,
  16727,
  16728,
  16729,
  16730,
  16731,
  16732,
  16733,
  16734,
  16735,
  16736,
  16737,
  16738,
  16739,
  16740,
  16741,
  16742,
  16743,
  16744,
  16745,
  16746,
  16747,
  16748,
  16749,
  16750,
  16751,
  16752,
  16753,
  16754,
  16755,
  16756,
  16757,
  16758,
  16759,
  16760,
  16761,
  16762,
  16763,
  16764,
  16765,
  16766,
  16767,
  16768,
  16769,
  16770,
  16771,
  16772,
  16773,
  16774,
  16775,
  16776,
  16777,
  16778,
  16779,
  16780,
  16781,
  16782,
  16783,
  16784,
  16785,
  16786,
  16787,
  16788,
  16789,
  16790,
  16791,
  16792,
  16793,
  16794,
  16795,
  16796,
  16797,
  16798,
  16799,
  16800,
  16801,
  16802,
  16803,
  16804,
  16805,
  16806,
  16807,
  16808,
  16809,
  16810,
  16811,
  16812,
  16813,
  16814,
  16815,
  16816,
  16817,
  16818,
  16819,
  16820,
  16821,
  16822,
  16823,
  16824,
  16825,
  16826,
  16827,
  16828,
  16829,
  16830,
  16831,
  16832,
  16833,
  16834,
  16835,
  16836,
  16837,
  16838,
  16839,
  16840,
  16841,
  16842,
  16843,
  16844,
  16845,
  16846,
  16847,
  16848,
  16849,
  16850,
  16851,
  16852,
  16853,
  16854,
  16855,
  16856,
  16857,
  16858,
  16859,
  16860,
  16861,
  16862,
  16863,
  16864,
  16865,
  16866,
  16867,
  16868,
  16869,
  16870,
  16871,
  16872,
  16873,
  16874,
  16875,
  16876,
  16877,
  16878,
  16879,
  16880,
  16881,
  16882,
  16883,
  16884,
  16885,
  16886,
  16887,
  16888,
  16889,
  16890,
  16891,
  16892,
  16893,
  16894,
  16895,
  16896,
  16897,
  16898,
  16899,
  16900,
  16901,
  16902,
  16903,
  16904,
  16905,
  16906,
  16907,
  16908,
  16909,
  16910,
  16911,
  16912,
  16913,
  16914,
  16915,
  16916,
  16917,
  16918,
  16919,
  16920,
  16921,
  16922,
  16923,
  16924,
  16925,
  16926,
  16927,
  16928,
  16929,
  16930,
  16931,
  16932,
  16933,
  16934,
  16935,
  16936,
  16937,
  16938,
  16939,
  16940,
  16941,
  16942,
  16943,
  16944,
  16945,
  16946,
  16947,
  16948,
  16949,
  16950,
  16951,
  16952,
  16953,
  16954,
  16955,
  16956,
  16957,
  16958,
  16959,
  16960,
  16961,
  16962,
  16963,
  16964,
  16965,
  16966,
  16967,
  16968,
  16969,
  16970,
  16971,
  16972,
  16973,
  16974,
  16975,
  16976,
  16977,
  16978,
  16979,
  16980,
  16981,
  16982,
  16983,
  16984,
  16985,
  16986,
  16987,
  16988,
  16989,
  16990,
  16991,
  16992,
  16993,
  16994,
  16995,
  16996,
  16997,
  16998,
  16999,
  17000,
  17001,
  17002,
  17003,
  17004,
  17005,
  17006,
  17007,
  17008,
  17009,
  17010,
  17011,
  17012,
  17013,
  17014,
  17015,
  17016,
  17017,
  17018,
  17019,
  17020,
  17021,
  17022,
  17023,
  17024,
  17025,
  17026,
  17027,
  17028,
  17029,
  17030,
  17031,
  17032,
  17033,
  17034,
  17035,
  17036,
  17037,
  17038,
  17039,
  17040,
  17041,
  17042,
  17043,
  17044,
  17045,
  17046,
  17047,
  17048,
  17049,
  17050,
  17051,
  17052,
  17053,
  17054,
  17055,
  17056,
  17057,
  17058,
  17059,
  17060,
  17061,
  17062,
  17063,
  17064,
  17065,
  17066,
  17067,
  17068,
  17069,
  17070,
  17071,
  17072,
  17073,
  17074,
  17075,
  17076,
  17077,
  17078,
  17079,
  17080,
  17081,
  17082,
  17083,
  17084,
  17085,
  17086,
  17087,
  17088,
  17089,
  17090,
  17091,
  17092,
  17093,
  17094,
  17095,
  17096,
  17097,
  17098,
  17099,
  17100,
  17101,
  17102,
  17103,
  17104,
  17105,
  17106,
  17107,
  17108,
  17109,
  17110,
  17111,
  17112,
  17113,
  17114,
  17115,
  17116,
  17117,
  17118,
  17119,
  17120,
  17121,
  17122,
  17123,
  17124,
  17125,
  17126,
  17127,
  17128,
  17129,
  17130,
  17131,
  17132,
  17133,
  17134,
  17135,
  17136,
  17137,
  17138,
  17139,
  17140,
  17141,
  17142,
  17143,
  17144,
  17145,
  17146,
  17147,
  17148,
  17149,
  17150,
  17151,
  17152,
  17153,
  17154,
  17155,
  17156,
  17157,
  17158,
  17159,
  17160,
  17161,
  17162,
  17163,
  17164,
  17165,
  17166,
  17167,
  17168,
  17169,
  17170,
  17171,
  17172,
  17173,
  17174,
  17175,
  17176,
  17177,
  17178,
  17179,
  17180,
  17181,
  17182,
  17183,
  17184,
  17185,
  17186,
  17187,
  17188,
  17189,
  17190,
  17191,
  17192,
  17193,
  17194,
  17195,
  17196,
  17197,
  17198,
  17199,
  17200,
  17201,
  17202,
  17203,
  17204,
  17205,
  17206,
  17207,
  17208,
  17209,
  17210,
  17211,
  17212,
  17213,
  17214,
  17215,
  17216,
  17217,
  17218,
  17219,
  17220,
  17221,
  17222,
  17223,
  17224,
  17225,
  17226,
  17227,
  17228,
  17229,
  17230,
  17231,
  17232,
  17233,
  17234,
  17235,
  17236,
  17237,
  17238,
  17239,
  17240,
  17241,
  17242,
  17243,
  17244,
  17245,
  17246,
  17247,
  17248,
  17249,
  17250,
  17251,
  17252,
  17253,
  17254,
  17255,
  17256,
  17257,
  17258,
  17259,
  17260,
  17261,
  17262,
  17263,
  17264,
  17265,
  17266,
  17267,
  17268,
  17269,
  17270,
  17271,
  17272,
  17273,
  17274,
  17275,
  17276,
  17277,
  17278,
  17279,
  17280,
  17281,
  17282,
  17283,
  17284,
  17285,
  17286,
  17287,
  17288,
  17289,
  17290,
  17291,
  17292,
  17293,
  17294,
  17295,
  17296,
  17297,
  17298,
  17299,
  17300,
  17301,
  17302,
  17303,
  17304,
  17305,
  17306,
  17307,
  17308,
  17309,
  17310,
  17311,
  17312,
  17313,
  17314,
  17315,
  17316,
  17317,
  17318,
  17319,
  17320,
  17321,
  17322,
  17323,
  17324,
  17325,
  17326,
  17327,
  17328,
  17329,
  17330,
  17331,
  17332,
  17333,
  17334,
  17335,
  17336,
  17337,
  17338,
  17339,
  17340,
  17341,
  17342,
  17343,
  17344,
  17345,
  17346,
  17347,
  17348,
  17349,
  17350,
  17351,
  17352,
  17353,
  17354,
  17355,
  17356,
  17357,
  17358,
  17359,
  17360,
  17361,
  17362,
  17363,
  17364,
  17365,
  17366,
  17367,
  17368,
  17369,
  17370,
  17371,
  17372,
  17373,
  17374,
  17375,
  17376,
  17377,
  17378,
  17379,
  17380,
  17381,
  17382,
  17383,
  17384,
  17385,
  17386,
  17387,
  17388,
  17389,
  17390,
  17391,
  17392,
  17393,
  17394,
  17395,
  17396,
  17397,
  17398,
  17399,
  17400,
  17401,
  17402,
  17403,
  17404,
  17405,
  17406,
  17407,
  17408,
  17409,
  17410,
  17411,
  17412,
  17413,
  17414,
  17415,
  17416,
  17417,
  17418,
  17419,
  17420,
  17421,
  17422,
  17423,
  17424,
  17425,
  17426,
  17427,
  17428,
  17429,
  17430,
  17431,
  17432,
  17433,
  17434,
  17435,
  17436,
  17437,
  17438,
  17439,
  17440,
  17441,
  17442,
  17443,
  17444,
  17445,
  17446,
  17447,
  17448,
  17449,
  17450,
  17451,
  17452,
  17453,
  17454,
  17455,
  17456,
  17457,
  17458,
  17459,
  17460,
  17461,
  17462,
  17463,
  17464,
  17465,
  17466,
  17467,
  17468,
  17469,
  17470,
  17471,
  17472,
  17473,
  17474,
  17475,
  17476,
  17477,
  17478,
  17479,
  17480,
  17481,
  17482,
  17483,
  17484,
  17485,
  17486,
  17487,
  17488,
  17489,
  17490,
  17491,
  17492,
  17493,
  17494,
  17495,
  17496,
  17497,
  17498,
  17499,
  17500,
  17501,
  17502,
  17503,
  17504,
  17505,
  17506,
  17507,
  17508,
  17509,
  17510,
  17511,
  17512,
  17513,
  17514,
  17515,
  17516,
  17517,
  17518,
  17519,
  17520,
  17521,
  17522,
  17523,
  17524,
  17525,
  17526,
  17527,
  17528,
  17529,
  17530,
  17531,
  17532,
  17533,
  17534,
  17535,
  17536,
  17537,
  17538,
  17539,
  17540,
  17541,
  17542,
  17543,
  17544,
  17545,
  17546,
  17547,
  17548,
  17549,
  17550,
  17551,
  17552,
  17553,
  17554,
  17555,
  17556,
  17557,
  17558,
  17559,
  17560,
  17561,
  17562,
  17563,
  17564,
  17565,
  17566,
  17567,
  17568,
  17569,
  17570,
  17571,
  17572,
  17573,
  17574,
  17575,
  17576,
  17577,
  17578,
  17579,
  17580,
  17581,
  17582,
  17583,
  17584,
  17585,
  17586,
  17587,
  17588,
  17589,
  17590,
  17591,
  17592,
  17593,
  17594,
  17595,
  17596,
  17597,
  17598,
  17599,
  17600,
  17601,
  17602,
  17603,
  17604,
  17605,
  17606,
  17607,
  17608,
  17609,
  17610,
  17611,
  17612,
  17613,
  17614,
  17615,
  17616,
  17617,
  17618,
  17619,
  17620,
  17621,
  17622,
  17623,
  17624,
  17625,
  17626,
  17627,
  17628,
  17629,
  17630,
  17631,
  17632,
  17633,
  17634,
  17635,
  17636,
  17637,
  17638,
  17639,
  17640,
  17641,
  17642,
  17643,
  17644,
  17645,
  17646,
  17647,
  17648,
  17649,
  17650,
  17651,
  17652,
  17653,
  17654,
  17655,
  17656,
  17657,
  17658,
  17659,
  17660,
  17661,
  17662,
  17663,
  17664,
  17665,
  17666,
  17667,
  17668,
  17669,
  17670,
  17671,
  17672,
  17673,
  17674,
  17675,
  17676,
  17677,
  17678,
  17679,
  17680,
  17681,
  17682,
  17683,
  17684,
  17685,
  17686,
  17687,
  17688,
  17689,
  17690,
  17691,
  17692,
  17693,
  17694,
  17695,
  17696,
  17697,
  17698,
  17699,
  17700,
  17701,
  17702,
  17703,
  17704,
  17705,
  17706,
  17707,
  17708,
  17709,
  17710,
  17711,
  17712,
  17713,
  17714,
  17715,
  17716,
  17717,
  17718,
  17719,
  17720,
  17721,
  17722,
  17723,
  17724,
  17725,
  17726,
  17727,
  17728,
  17729,
  17730,
  17731,
  17732,
  17733,
  17734,
  17735,
  17736,
  17737,
  17738,
  17739,
  17740,
  17741,
  17742,
  17743,
  17744,
  17745,
  17746,
  17747,
  17748,
  17749,
  17750,
  17751,
  17752,
  17753,
  17754,
  17755,
  17756,
  17757,
  17758,
  17759,
  17760,
  17761,
  17762,
  17763,
  17764,
  17765,
  17766,
  17767,
  17768,
  17769,
  17770,
  17771,
  17772,
  17773,
  17774,
  17775,
  17776,
  17777,
  17778,
  17779,
  17780,
  17781,
  17782,
  17783,
  17784,
  17785,
  17786,
  17787,
  17788,
  17789,
  17790,
  17791,
  17792,
  17793,
  17794,
  17795,
  17796,
  17797,
  17798,
  17799,
  17800,
  17801,
  17802,
  17803,
  17804,
  17805,
  17806,
  17807,
  17808,
  17809,
  17810,
  17811,
  17812,
  17813,
  17814,
  17815,
  17816,
  17817,
  17818,
  17819,
  17820,
  17821,
  17822,
  17823,
  17824,
  17825,
  17826,
  17827,
  17828,
  17829,
  17830,
  17831,
  17832,
  17833,
  17834,
  17835,
  17836,
  17837,
  17838,
  17839,
  17840,
  17841,
  17842,
  17843,
  17844,
  17845,
  17846,
  17847,
  17848,
  17849,
  17850,
  17851,
  17852,
  17853,
  17854,
  17855,
  17856,
  17857,
  17858,
  17859,
  17860,
  17861,
  17862,
  17863,
  17864,
  17865,
  17866,
  17867,
  17868,
  17869,
  17870,
  17871,
  17872,
  17873,
  17874,
  17875,
  17876,
  17877,
  17878,
  17879,
  17880,
  17881,
  17882,
  17883,
  17884,
  17885,
  17886,
  17887,
  17888,
  17889,
  17890,
  17891,
  17892,
  17893,
  17894,
  17895,
  17896,
  17897,
  17898,
  17899,
  17900,
  17901,
  17902,
  17903,
  17904,
  17905,
  17906,
  17907,
  17908,
  17909,
  17910,
  17911,
  17912,
  17913,
  17914,
  17915,
  17916,
  17917,
  17918,
  17919,
  17920,
  17921,
  17922,
  17923,
  17924,
  17925,
  17926,
  17927,
  17928,
  17929,
  17930,
  17931,
  17932,
  17933,
  17934,
  17935,
  17936,
  17937,
  17938,
  17939,
  17940,
  17941,
  17942,
  17943,
  17944,
  17945,
  17946,
  17947,
  17948,
  17949,
  17950,
  17951,
  17952,
  17953,
  17954,
  17955,
  17956,
  17957,
  17958,
  17959,
  17960,
  17961,
  17962,
  17963,
  17964,
  17965,
  17966,
  17967,
  17968,
  17969,
  17970,
  17971,
  17972,
  17973,
  17974,
  17975,
  17976,
  17977,
  17978,
  17979,
  17980,
  17981,
  17982,
  17983,
  17984,
  17985,
  17986,
  17987,
  17988,
  17989,
  17990,
  17991,
  17992,
  17993,
  17994,
  17995,
  17996,
  17997,
  17998,
  17999,
  18000,
  18001,
  18002,
  18003,
  18004,
  18005,
  18006,
  18007,
  18008,
  18009,
  18010,
  18011,
  18012,
  18013,
  18014,
  18015,
  18016,
  18017,
  18018,
  18019,
  18020,
  18021,
  18022,
  18023,
  18024,
  18025,
  18026,
  18027,
  18028,
  18029,
  18030,
  18031,
  18032,
  18033,
  18034,
  18035,
  18036,
  18037,
  18038,
  18039,
  18040,
  18041,
  18042,
  18043,
  18044,
  18045,
  18046,
  18047,
  18048,
  18049,
  18050,
  18051,
  18052,
  18053,
  18054,
  18055,
  18056,
  18057,
  18058,
  18059,
  18060,
  18061,
  18062,
  18063,
  18064,
  18065,
  18066,
  18067,
  18068,
  18069,
  18070,
  18071,
  18072,
  18073,
  18074,
  18075,
  18076,
  18077,
  18078,
  18079,
  18080,
  18081,
  18082,
  18083,
  18084,
  18085,
  18086,
  18087,
  18088,
  18089,
  18090,
  18091,
  18092,
  18093,
  18094,
  18095,
  18096,
  18097,
  18098,
  18099,
  18100,
  18101,
  18102,
  18103,
  18104,
  18105,
  18106,
  18107,
  18108,
  18109,
  18110,
  18111,
  18112,
  18113,
  18114,
  18115,
  18116,
  18117,
  18118,
  18119,
  18120,
  18121,
  18122,
  18123,
  18124,
  18125,
  18126,
  18127,
  18128,
  18129,
  18130,
  18131,
  18132,
  18133,
  18134,
  18135,
  18136,
  18137,
  18138,
  18139,
  18140,
  18141,
  18142,
  18143,
  18144,
  18145,
  18146,
  18147,
  18148,
  18149,
  18150,
  18151,
  18152,
  18153,
  18154,
  18155,
  18156,
  18157,
  18158,
  18159,
  18160,
  18161,
  18162,
  18163,
  18164,
  18165,
  18166,
  18167,
  18168,
  18169,
  18170,
  18171,
  18172,
  18173,
  18174,
  18175,
  18176,
  18177,
  18178,
  18179,
  18180,
  18181,
  18182,
  18183,
  18184,
  18185,
  18186,
  18187,
  18188,
  18189,
  18190,
  18191,
  18192,
  18193,
  18194,
  18195,
  18196,
  18197,
  18198,
  18199,
  18200,
  18201,
  18202,
  18203,
  18204,
  18205,
  18206,
  18207,
  18208,
  18209,
  18210,
  18211,
  18212,
  18213,
  18214,
  18215,
  18216,
  18217,
  18218,
  18219,
  18220,
  18221,
  18222,
  18223,
  18224,
  18225,
  18226,
  18227,
  18228,
  18229,
  18230,
  18231,
  18232,
  18233,
  18234,
  18235,
  18236,
  18237,
  18238,
  18239,
  18240,
  18241,
  18242,
  18243,
  18244,
  18245,
  18246,
  18247,
  18248,
  18249,
  18250,
  18251,
  18252,
  18253,
  18254,
  18255,
  18256,
  18257,
  18258,
  18259,
  18260,
  18261,
  18262,
  18263,
  18264,
  18265,
  18266,
  18267,
  18268,
  18269,
  18270,
  18271,
  18272,
  18273,
  18274,
  18275,
  18276,
  18277,
  18278,
  18279,
  18280,
  18281,
  18282,
  18283,
  18284,
  18285,
  18286,
  18287,
  18288,
  18289,
  18290,
  18291,
  18292,
  18293,
  18294,
  18295,
  18296,
  18297,
  18298,
  18299,
  18300,
  18301,
  18302,
  18303,
  18304,
  18305,
  18306,
  18307,
  18308,
  18309,
  18310,
  18311,
  18312,
  18313,
  18314,
  18315,
  18316,
  18317,
  18318,
  18319,
  18320,
  18321,
  18322,
  18323,
  18324,
  18325,
  18326,
  18327,
  18328,
  18329,
  18330,
  18331,
  18332,
  18333,
  18334,
  18335,
  18336,
  18337,
  18338,
  18339,
  18340,
  18341,
  18342,
  18343,
  18344,
  18345,
  18346,
  18347,
  18348,
  18349,
  18350,
  18351,
  18352,
  18353,
  18354,
  18355,
  18356,
  18357,
  18358,
  18359,
  18360,
  18361,
  18362,
  18363,
  18364,
  18365,
  18366,
  18367,
  18368,
  18369,
  18370,
  18371,
  18372,
  18373,
  18374,
  18375,
  18376,
  18377,
  18378,
  18379,
  18380,
  18381,
  18382,
  18383,
  18384,
  18385,
  18386,
  18387,
  18388,
  18389,
  18390,
  18391,
  18392,
  18393,
  18394,
  18395,
  18396,
  18397,
  18398,
  18399,
  18400,
  18401,
  18402,
  18403,
  18404,
  18405,
  18406,
  18407,
  18408,
  18409,
  18410,
  18411,
  18412,
  18413,
  18414,
  18415,
  18416,
  18417,
  18418,
  18419,
  18420,
  18421,
  18422,
  18423,
  18424,
  18425,
  18426,
  18427,
  18428,
  18429,
  18430,
  18431,
  18432,
  18433,
  18434,
  18435,
  18436,
  18437,
  18438,
  18439,
  18440,
  18441,
  18442,
  18443,
  18444,
  18445,
  18446,
  18447,
  18448,
  18449,
  18450,
  18451,
  18452,
  18453,
  18454,
  18455,
  18456,
  18457,
  18458,
  18459,
  18460,
  18461,
  18462,
  18463,
  18464,
  18465,
  18466,
  18467,
  18468,
  18469,
  18470,
  18471,
  18472,
  18473,
  18474,
  18475,
  18476,
  18477,
  18478,
  18479,
  18480,
  18481,
  18482,
  18483,
  18484,
  18485,
  18486,
  18487,
  18488,
  18489,
  18490,
  18491,
  18492,
  18493,
  18494,
  18495,
  18496,
  18497,
  18498,
  18499,
  18500,
  18501,
  18502,
  18503,
  18504,
  18505,
  18506,
  18507,
  18508,
  18509,
  18510,
  18511,
  18512,
  18513,
  18514,
  18515,
  18516,
  18517,
  18518,
  18519,
  18520,
  18521,
  18522,
  18523,
  18524,
  18525,
  18526,
  18527,
  18528,
  18529,
  18530,
  18531,
  18532,
  18533,
  18534,
  18535,
  18536,
  18537,
  18538,
  18539,
  18540,
  18541,
  18542,
  18543,
  18544,
  18545,
  18546,
  18547,
  18548,
  18549,
  18550,
  18551,
  18552,
  18553,
  18554,
  18555,
  18556,
  18557,
  18558,
  18559,
  18560,
  18561,
  18562,
  18563,
  18564,
  18565,
  18566,
  18567,
  18568,
  18569,
  18570,
  18571,
  18572,
  18573,
  18574,
  18575,
  18576,
  18577,
  18578,
  18579,
  18580,
  18581,
  18582,
  18583,
  18584,
  18585,
  18586,
  18587,
  18588,
  18589,
  18590,
  18591,
  18592,
  18593,
  18594,
  18595,
  18596,
  18597,
  18598,
  18599,
  18600,
  18601,
  18602,
  18603,
  18604,
  18605,
  18606,
  18607,
  18608,
  18609,
  18610,
  18611,
  18612,
  18613,
  18614,
  18615,
  18616,
  18617,
  18618,
  18619,
  18620,
  18621,
  18622,
  18623,
  18624,
  18625,
  18626,
  18627,
  18628,
  18629,
  18630,
  18631,
  18632,
  18633,
  18634,
  18635,
  18636,
  18637,
  18638,
  18639,
  18640,
  18641,
  18642,
  18643,
  18644,
  18645,
  18646,
  18647,
  18648,
  18649,
  18650,
  18651,
  18652,
  18653,
  18654,
  18655,
  18656,
  18657,
  18658,
  18659,
  18660,
  18661,
  18662,
  18663,
  18664,
  18665,
  18666,
  18667,
  18668,
  18669,
  18670,
  18671,
  18672,
  18673,
  18674,
  18675,
  18676,
  18677,
  18678,
  18679,
  18680,
  18681,
  18682,
  18683,
  18684,
  18685,
  18686,
  18687,
  18688,
  18689,
  18690,
  18691,
  18692,
  18693,
  18694,
  18695,
  18696,
  18697,
  18698,
  18699,
  18700,
  18701,
  18702,
  18703,
  18704,
  18705,
  18706,
  18707,
  18708,
  18709,
  18710,
  18711,
  18712,
  18713,
  18714,
  18715,
  18716,
  18717,
  18718,
  18719,
  18720,
  18721,
  18722,
  18723,
  18724,
  18725,
  18726,
  18727,
  18728,
  18729,
  18730,
  18731,
  18732,
  18733,
  18734,
  18735,
  18736,
  18737,
  18738,
  18739,
  18740,
  18741,
  18742,
  18743,
  18744,
  18745,
  18746,
  18747,
  18748,
  18749,
  18750,
  18751,
  18752,
  18753,
  18754,
  18755,
  18756,
  18757,
  18758,
  18759,
  18760,
  18761,
  18762,
  18763,
  18764,
  18765,
  18766,
  18767,
  18768,
  18769,
  18770,
  18771,
  18772,
  18773,
  18774,
  18775,
  18776,
  18777,
  18778,
  18779,
  18780,
  18781,
  18782,
  18783,
  18784,
  18785,
  18786,
  18787,
  18788,
  18789,
  18790,
  18791,
  18792,
  18793,
  18794,
  18795,
  18796,
  18797,
  18798,
  18799,
  18800,
  18801,
  18802,
  18803,
  18804,
  18805,
  18806,
  18807,
  18808,
  18809,
  18810,
  18811,
  18812,
  18813,
  18814,
  18815,
  18816,
  18817,
  18818,
  18819,
  18820,
  18821,
  18822,
  18823,
  18824,
  18825,
  18826,
  18827,
  18828,
  18829,
  18830,
  18831,
  18832,
  18833,
  18834,
  18835,
  18836,
  18837,
  18838,
  18839,
  18840,
  18841,
  18842,
  18843,
  18844,
  18845,
  18846,
  18847,
  18848,
  18849,
  18850,
  18851,
  18852,
  18853,
  18854,
  18855,
  18856,
  18857,
  18858,
  18859,
  18860,
  18861,
  18862,
  18863,
  18864,
  18865,
  18866,
  18867,
  18868,
  18869,
  18870,
  18871,
  18872,
  18873,
  18874,
  18875,
  18876,
  18877,
  18878,
  18879,
  18880,
  18881,
  18882,
  18883,
  18884,
  18885,
  18886,
  18887,
  18888,
  18889,
  18890,
  18891,
  18892,
  18893,
  18894,
  18895,
  18896,
  18897,
  18898,
  18899,
  18900,
  18901,
  18902,
  18903,
  18904,
  18905,
  18906,
  18907,
  18908,
  18909,
  18910,
  18911,
  18912,
  18913,
  18914,
  18915,
  18916,
  18917,
  18918,
  18919,
  18920,
  18921,
  18922,
  18923,
  18924,
  18925,
  18926,
  18927,
  18928,
  18929,
  18930,
  18931,
  18932,
  18933,
  18934,
  18935,
  18936,
  18937,
  18938,
  18939,
  18940,
  18941,
  18942,
  18943,
  18944,
  18945,
  18946,
  18947,
  18948,
  18949,
  18950,
  18951,
  18952,
  18953,
  18954,
  18955,
  18956,
  18957,
  18958,
  18959,
  18960,
  18961,
  18962,
  18963,
  18964,
  18965,
  18966,
  18967,
  18968,
  18969,
  18970,
  18971,
  18972,
  18973,
  18974,
  18975,
  18976,
  18977,
  18978,
  18979,
  18980,
  18981,
  18982,
  18983,
  18984,
  18985,
  18986,
  18987,
  18988,
  18989,
  18990,
  18991,
  18992,
  18993,
  18994,
  18995,
  18996,
  18997,
  18998,
  18999,
  19000,
  19001,
  19002,
  19003,
  19004,
  19005,
  19006,
  19007,
  19008,
  19009,
  19010,
  19011,
  19012,
  19013,
  19014,
  19015,
  19016,
  19017,
  19018,
  19019,
  19020,
  19021,
  19022,
  19023,
  19024,
  19025,
  19026,
  19027,
  19028,
  19029,
  19030,
  19031,
  19032,
  19033,
  19034,
  19035,
  19036,
  19037,
  19038,
  19039,
  19040,
  19041,
  19042,
  19043,
  19044,
  19045,
  19046,
  19047,
  19048,
  19049,
  19050,
  19051,
  19052,
  19053,
  19054,
  19055,
  19056,
  19057,
  19058,
  19059,
  19060,
  19061,
  19062,
  19063,
  19064,
  19065,
  19066,
  19067,
  19068,
  19069,
  19070,
  19071,
  19072,
  19073,
  19074,
  19075,
  19076,
  19077,
  19078,
  19079,
  19080,
  19081,
  19082,
  19083,
  19084,
  19085,
  19086,
  19087,
  19088,
  19089,
  19090,
  19091,
  19092,
  19093,
  19094,
  19095,
  19096,
  19097,
  19098,
  19099,
  19100,
  19101,
  19102,
  19103,
  19104,
  19105,
  19106,
  19107,
  19108,
  19109,
  19110,
  19111,
  19112,
  19113,
  19114,
  19115,
  19116,
  19117,
  19118,
  19119,
  19120,
  19121,
  19122,
  19123,
  19124,
  19125,
  19126,
  19127,
  19128,
  19129,
  19130,
  19131,
  19132,
  19133,
  19134,
  19135,
  19136,
  19137,
  19138,
  19139,
  19140,
  19141,
  19142,
  19143,
  19144,
  19145,
  19146,
  19147,
  19148,
  19149,
  19150,
  19151,
  19152,
  19153,
  19154,
  19155,
  19156,
  19157,
  19158,
  19159,
  19160,
  19161,
  19162,
  19163,
  19164,
  19165,
  19166,
  19167,
  19168,
  19169,
  19170,
  19171,
  19172,
  19173,
  19174,
  19175,
  19176,
  19177,
  19178,
  19179,
  19180,
  19181,
  19182,
  19183,
  19184,
  19185,
  19186,
  19187,
  19188,
  19189,
  19190,
  19191,
  19192,
  19193,
  19194,
  19195,
  19196,
  19197,
  19198,
  19199,
  19200,
  19201,
  19202,
  19203,
  19204,
  19205,
  19206,
  19207,
  19208,
  19209,
  19210,
  19211,
  19212,
  19213,
  19214,
  19215,
  19216,
  19217,
  19218,
  19219,
  19220,
  19221,
  19222,
  19223,
  19224,
  19225,
  19226,
  19227,
  19228,
  19229,
  19230,
  19231,
  19232,
  19233,
  19234,
  19235,
  19236,
  19237,
  19238,
  19239,
  19240,
  19241,
  19242,
  19243,
  19244,
  19245,
  19246,
  19247,
  19248,
  19249,
  19250,
  19251,
  19252,
  19253,
  19254,
  19255,
  19256,
  19257,
  19258,
  19259,
  19260,
  19261,
  19262,
  19263,
  19264,
  19265,
  19266,
  19267,
  19268,
  19269,
  19270,
  19271,
  19272,
  19273,
  19274,
  19275,
  19276,
  19277,
  19278,
  19279,
  19280,
  19281,
  19282,
  19283,
  19284,
  19285,
  19286,
  19287,
  19288,
  19289,
  19290,
  19291,
  19292,
  19293,
  19294,
  19295,
  19296,
  19297,
  19298,
  19299,
  19300,
  19301,
  19302,
  19303,
  19304,
  19305,
  19306,
  19307,
  19308,
  19309,
  19310,
  19311,
  19312,
  19313,
  19314,
  19315,
  19316,
  19317,
  19318,
  19319,
  19320,
  19321,
  19322,
  19323,
  19324,
  19325,
  19326,
  19327,
  19328,
  19329,
  19330,
  19331,
  19332,
  19333,
  19334,
  19335,
  19336,
  19337,
  19338,
  19339,
  19340,
  19341,
  19342,
  19343,
  19344,
  19345,
  19346,
  19347,
  19348,
  19349,
  19350,
  19351,
  19352,
  19353,
  19354,
  19355,
  19356,
  19357,
  19358,
  19359,
  19360,
  19361,
  19362,
  19363,
  19364,
  19365,
  19366,
  19367,
  19368,
  19369,
  19370,
  19371,
  19372,
  19373,
  19374,
  19375,
  19376,
  19377,
  19378,
  19379,
  19380,
  19381,
  19382,
  19383,
  19384,
  19385,
  19386,
  19387,
  19388,
  19389,
  19390,
  19391,
  19392,
  19393,
  19394,
  19395,
  19396,
  19397,
  19398,
  19399,
  19400,
  19401,
  19402,
  19403,
  19404,
  19405,
  19406,
  19407,
  19408,
  19409,
  19410,
  19411,
  19412,
  19413,
  19414,
  19415,
  19416,
  19417,
  19418,
  19419,
  19420,
  19421,
  19422,
  19423,
  19424,
  19425,
  19426,
  19427,
  19428,
  19429,
  19430,
  19431,
  19432,
  19433,
  19434,
  19435,
  19436,
  19437,
  19438,
  19439,
  19440,
  19441,
  19442,
  19443,
  19444,
  19445,
  19446,
  19447,
  19448,
  19449,
  19450,
  19451,
  19452,
  19453,
  19454,
  19455,
  19456,
  19457,
  19458,
  19459,
  19460,
  19461,
  19462,
  19463,
  19464,
  19465,
  19466,
  19467,
  19468,
  19469,
  19470,
  19471,
  19472,
  19473,
  19474,
  19475,
  19476,
  19477,
  19478,
  19479,
  19480,
  19481,
  19482,
  19483,
  19484,
  19485,
  19486,
  19487,
  19488,
  19489,
  19490,
  19491,
  19492,
  19493,
  19494,
  19495,
  19496,
  19497,
  19498,
  19499,
  19500,
  19501,
  19502,
  19503,
  19504,
  19505,
  19506,
  19507,
  19508,
  19509,
  19510,
  19511,
  19512,
  19513,
  19514,
  19515,
  19516,
  19517,
  19518,
  19519,
  19520,
  19521,
  19522,
  19523,
  19524,
  19525,
  19526,
  19527,
  19528,
  19529,
  19530,
  19531,
  19532,
  19533,
  19534,
  19535,
  19536,
  19537,
  19538,
  19539,
  19540,
  19541,
  19542,
  19543,
  19544,
  19545,
  19546,
  19547,
  19548,
  19549,
  19550,
  19551,
  19552,
  19553,
  19554,
  19555,
  19556,
  19557,
  19558,
  19559,
  19560,
  19561,
  19562,
  19563,
  19564,
  19565,
  19566,
  19567,
  19568,
  19569,
  19570,
  19571,
  19572,
  19573,
  19574,
  19575,
  19576,
  19577,
  19578,
  19579,
  19580,
  19581,
  19582,
  19583,
  19584,
  19585,
  19586,
  19587,
  19588,
  19589,
  19590,
  19591,
  19592,
  19593,
  19594,
  19595,
  19596,
  19597,
  19598,
  19599,
  19600,
  19601,
  19602,
  19603,
  19604,
  19605,
  19606,
  19607,
  19608,
  19609,
  19610,
  19611,
  19612,
  19613,
  19614,
  19615,
  19616,
  19617,
  19618,
  19619,
  19620,
  19621,
  19622,
  19623,
  19624,
  19625,
  19626,
  19627,
  19628,
  19629,
  19630,
  19631,
  19632,
  19633,
  19634,
  19635,
  19636,
  19637,
  19638,
  19639,
  19640,
  19641,
  19642,
  19643,
  19644,
  19645,
  19646,
  19647,
  19648,
  19649,
  19650,
  19651,
  19652,
  19653,
  19654,
  19655,
  19656,
  19657,
  19658,
  19659,
  19660,
  19661,
  19662,
  19663,
  19664,
  19665,
  19666,
  19667,
  19668,
  19669,
  19670,
  19671,
  19672,
  19673,
  19674,
  19675,
  19676,
  19677,
  19678,
  19679,
  19680,
  19681,
  19682,
  19683,
  19684,
  19685,
  19686,
  19687,
  19688,
  19689,
  19690,
  19691,
  19692,
  19693,
  19694,
  19695,
  19696,
  19697,
  19698,
  19699,
  19700,
  19701,
  19702,
  19703,
  19704,
  19705,
  19706,
  19707,
  19708,
  19709,
  19710,
  19711,
  19712,
  19713,
  19714,
  19715,
  19716,
  19717,
  19718,
  19719,
  19720,
  19721,
  19722,
  19723,
  19724,
  19725,
  19726,
  19727,
  19728,
  19729,
  19730,
  19731,
  19732,
  19733,
  19734,
  19735,
  19736,
  19737,
  19738,
  19739,
  19740,
  19741,
  19742,
  19743,
  19744,
  19745,
  19746,
  19747,
  19748,
  19749,
  19750,
  19751,
  19752,
  19753,
  19754,
  19755,
  19756,
  19757,
  19758,
  19759,
  19760,
  19761,
  19762,
  19763,
  19764,
  19765,
  19766,
  19767,
  19768,
  19769,
  19770,
  19771,
  19772,
  19773,
  19774,
  19775,
  19776,
  19777,
  19778,
  19779,
  19780,
  19781,
  19782,
  19783,
  19784,
  19785,
  19786,
  19787,
  19788,
  19789,
  19790,
  19791,
  19792,
  19793,
  19794,
  19795,
  19796,
  19797,
  19798,
  19799,
  19800,
  19801,
  19802,
  19803,
  19804,
  19805,
  19806,
  19807,
  19808,
  19809,
  19810,
  19811,
  19812,
  19813,
  19814,
  19815,
  19816,
  19817,
  19818,
  19819,
  19820,
  19821,
  19822,
  19823,
  19824,
  19825,
  19826,
  19827,
  19828,
  19829,
  19830,
  19831,
  19832,
  19833,
  19834,
  19835,
  19836,
  19837,
  19838,
  19839,
  19840,
  19841,
  19842,
  19843,
  19844,
  19845,
  19846,
  19847,
  19848,
  19849,
  19850,
  19851,
  19852,
  19853,
  19854,
  19855,
  19856,
  19857,
  19858,
  19859,
  19860,
  19861,
  19862,
  19863,
  19864,
  19865,
  19866,
  19867,
  19868,
  19869,
  19870,
  19871,
  19872,
  19873,
  19874,
  19875,
  19876,
  19877,
  19878,
  19879,
  19880,
  19881,
  19882,
  19883,
  19884,
  19885,
  19886,
  19887,
  19888,
  19889,
  19890,
  19891,
  19892,
  19893,
  19968,
  19969,
  19970,
  19971,
  19972,
  19973,
  19974,
  19975,
  19976,
  19977,
  19978,
  19979,
  19980,
  19981,
  19982,
  19983,
  19984,
  19985,
  19986,
  19987,
  19988,
  19989,
  19990,
  19991,
  19992,
  19993,
  19994,
  19995,
  19996,
  19997,
  19998,
  19999,
  20000,
  20001,
  20002,
  20003,
  20004,
  20005,
  20006,
  20007,
  20008,
  20009,
  20010,
  20011,
  20012,
  20013,
  20014,
  20015,
  20016,
  20017,
  20018,
  20019,
  20020,
  20021,
  20022,
  20023,
  20024,
  20025,
  20026,
  20027,
  20028,
  20029,
  20030,
  20031,
  20032,
  20033,
  20034,
  20035,
  20036,
  20037,
  20038,
  20039,
  20040,
  20041,
  20042,
  20043,
  20044,
  20045,
  20046,
  20047,
  20048,
  20049,
  20050,
  20051,
  20052,
  20053,
  20054,
  20055,
  20056,
  20057,
  20058,
  20059,
  20060,
  20061,
  20062,
  20063,
  20064,
  20065,
  20066,
  20067,
  20068,
  20069,
  20070,
  20071,
  20072,
  20073,
  20074,
  20075,
  20076,
  20077,
  20078,
  20079,
  20080,
  20081,
  20082,
  20083,
  20084,
  20085,
  20086,
  20087,
  20088,
  20089,
  20090,
  20091,
  20092,
  20093,
  20094,
  20095,
  20096,
  20097,
  20098,
  20099,
  20100,
  20101,
  20102,
  20103,
  20104,
  20105,
  20106,
  20107,
  20108,
  20109,
  20110,
  20111,
  20112,
  20113,
  20114,
  20115,
  20116,
  20117,
  20118,
  20119,
  20120,
  20121,
  20122,
  20123,
  20124,
  20125,
  20126,
  20127,
  20128,
  20129,
  20130,
  20131,
  20132,
  20133,
  20134,
  20135,
  20136,
  20137,
  20138,
  20139,
  20140,
  20141,
  20142,
  20143,
  20144,
  20145,
  20146,
  20147,
  20148,
  20149,
  20150,
  20151,
  20152,
  20153,
  20154,
  20155,
  20156,
  20157,
  20158,
  20159,
  20160,
  20161,
  20162,
  20163,
  20164,
  20165,
  20166,
  20167,
  20168,
  20169,
  20170,
  20171,
  20172,
  20173,
  20174,
  20175,
  20176,
  20177,
  20178,
  20179,
  20180,
  20181,
  20182,
  20183,
  20184,
  20185,
  20186,
  20187,
  20188,
  20189,
  20190,
  20191,
  20192,
  20193,
  20194,
  20195,
  20196,
  20197,
  20198,
  20199,
  20200,
  20201,
  20202,
  20203,
  20204,
  20205,
  20206,
  20207,
  20208,
  20209,
  20210,
  20211,
  20212,
  20213,
  20214,
  20215,
  20216,
  20217,
  20218,
  20219,
  20220,
  20221,
  20222,
  20223,
  20224,
  20225,
  20226,
  20227,
  20228,
  20229,
  20230,
  20231,
  20232,
  20233,
  20234,
  20235,
  20236,
  20237,
  20238,
  20239,
  20240,
  20241,
  20242,
  20243,
  20244,
  20245,
  20246,
  20247,
  20248,
  20249,
  20250,
  20251,
  20252,
  20253,
  20254,
  20255,
  20256,
  20257,
  20258,
  20259,
  20260,
  20261,
  20262,
  20263,
  20264,
  20265,
  20266,
  20267,
  20268,
  20269,
  20270,
  20271,
  20272,
  20273,
  20274,
  20275,
  20276,
  20277,
  20278,
  20279,
  20280,
  20281,
  20282,
  20283,
  20284,
  20285,
  20286,
  20287,
  20288,
  20289,
  20290,
  20291,
  20292,
  20293,
  20294,
  20295,
  20296,
  20297,
  20298,
  20299,
  20300,
  20301,
  20302,
  20303,
  20304,
  20305,
  20306,
  20307,
  20308,
  20309,
  20310,
  20311,
  20312,
  20313,
  20314,
  20315,
  20316,
  20317,
  20318,
  20319,
  20320,
  20321,
  20322,
  20323,
  20324,
  20325,
  20326,
  20327,
  20328,
  20329,
  20330,
  20331,
  20332,
  20333,
  20334,
  20335,
  20336,
  20337,
  20338,
  20339,
  20340,
  20341,
  20342,
  20343,
  20344,
  20345,
  20346,
  20347,
  20348,
  20349,
  20350,
  20351,
  20352,
  20353,
  20354,
  20355,
  20356,
  20357,
  20358,
  20359,
  20360,
  20361,
  20362,
  20363,
  20364,
  20365,
  20366,
  20367,
  20368,
  20369,
  20370,
  20371,
  20372,
  20373,
  20374,
  20375,
  20376,
  20377,
  20378,
  20379,
  20380,
  20381,
  20382,
  20383,
  20384,
  20385,
  20386,
  20387,
  20388,
  20389,
  20390,
  20391,
  20392,
  20393,
  20394,
  20395,
  20396,
  20397,
  20398,
  20399,
  20400,
  20401,
  20402,
  20403,
  20404,
  20405,
  20406,
  20407,
  20408,
  20409,
  20410,
  20411,
  20412,
  20413,
  20414,
  20415,
  20416,
  20417,
  20418,
  20419,
  20420,
  20421,
  20422,
  20423,
  20424,
  20425,
  20426,
  20427,
  20428,
  20429,
  20430,
  20431,
  20432,
  20433,
  20434,
  20435,
  20436,
  20437,
  20438,
  20439,
  20440,
  20441,
  20442,
  20443,
  20444,
  20445,
  20446,
  20447,
  20448,
  20449,
  20450,
  20451,
  20452,
  20453,
  20454,
  20455,
  20456,
  20457,
  20458,
  20459,
  20460,
  20461,
  20462,
  20463,
  20464,
  20465,
  20466,
  20467,
  20468,
  20469,
  20470,
  20471,
  20472,
  20473,
  20474,
  20475,
  20476,
  20477,
  20478,
  20479,
  20480,
  20481,
  20482,
  20483,
  20484,
  20485,
  20486,
  20487,
  20488,
  20489,
  20490,
  20491,
  20492,
  20493,
  20494,
  20495,
  20496,
  20497,
  20498,
  20499,
  20500,
  20501,
  20502,
  20503,
  20504,
  20505,
  20506,
  20507,
  20508,
  20509,
  20510,
  20511,
  20512,
  20513,
  20514,
  20515,
  20516,
  20517,
  20518,
  20519,
  20520,
  20521,
  20522,
  20523,
  20524,
  20525,
  20526,
  20527,
  20528,
  20529,
  20530,
  20531,
  20532,
  20533,
  20534,
  20535,
  20536,
  20537,
  20538,
  20539,
  20540,
  20541,
  20542,
  20543,
  20544,
  20545,
  20546,
  20547,
  20548,
  20549,
  20550,
  20551,
  20552,
  20553,
  20554,
  20555,
  20556,
  20557,
  20558,
  20559,
  20560,
  20561,
  20562,
  20563,
  20564,
  20565,
  20566,
  20567,
  20568,
  20569,
  20570,
  20571,
  20572,
  20573,
  20574,
  20575,
  20576,
  20577,
  20578,
  20579,
  20580,
  20581,
  20582,
  20583,
  20584,
  20585,
  20586,
  20587,
  20588,
  20589,
  20590,
  20591,
  20592,
  20593,
  20594,
  20595,
  20596,
  20597,
  20598,
  20599,
  20600,
  20601,
  20602,
  20603,
  20604,
  20605,
  20606,
  20607,
  20608,
  20609,
  20610,
  20611,
  20612,
  20613,
  20614,
  20615,
  20616,
  20617,
  20618,
  20619,
  20620,
  20621,
  20622,
  20623,
  20624,
  20625,
  20626,
  20627,
  20628,
  20629,
  20630,
  20631,
  20632,
  20633,
  20634,
  20635,
  20636,
  20637,
  20638,
  20639,
  20640,
  20641,
  20642,
  20643,
  20644,
  20645,
  20646,
  20647,
  20648,
  20649,
  20650,
  20651,
  20652,
  20653,
  20654,
  20655,
  20656,
  20657,
  20658,
  20659,
  20660,
  20661,
  20662,
  20663,
  20664,
  20665,
  20666,
  20667,
  20668,
  20669,
  20670,
  20671,
  20672,
  20673,
  20674,
  20675,
  20676,
  20677,
  20678,
  20679,
  20680,
  20681,
  20682,
  20683,
  20684,
  20685,
  20686,
  20687,
  20688,
  20689,
  20690,
  20691,
  20692,
  20693,
  20694,
  20695,
  20696,
  20697,
  20698,
  20699,
  20700,
  20701,
  20702,
  20703,
  20704,
  20705,
  20706,
  20707,
  20708,
  20709,
  20710,
  20711,
  20712,
  20713,
  20714,
  20715,
  20716,
  20717,
  20718,
  20719,
  20720,
  20721,
  20722,
  20723,
  20724,
  20725,
  20726,
  20727,
  20728,
  20729,
  20730,
  20731,
  20732,
  20733,
  20734,
  20735,
  20736,
  20737,
  20738,
  20739,
  20740,
  20741,
  20742,
  20743,
  20744,
  20745,
  20746,
  20747,
  20748,
  20749,
  20750,
  20751,
  20752,
  20753,
  20754,
  20755,
  20756,
  20757,
  20758,
  20759,
  20760,
  20761,
  20762,
  20763,
  20764,
  20765,
  20766,
  20767,
  20768,
  20769,
  20770,
  20771,
  20772,
  20773,
  20774,
  20775,
  20776,
  20777,
  20778,
  20779,
  20780,
  20781,
  20782,
  20783,
  20784,
  20785,
  20786,
  20787,
  20788,
  20789,
  20790,
  20791,
  20792,
  20793,
  20794,
  20795,
  20796,
  20797,
  20798,
  20799,
  20800,
  20801,
  20802,
  20803,
  20804,
  20805,
  20806,
  20807,
  20808,
  20809,
  20810,
  20811,
  20812,
  20813,
  20814,
  20815,
  20816,
  20817,
  20818,
  20819,
  20820,
  20821,
  20822,
  20823,
  20824,
  20825,
  20826,
  20827,
  20828,
  20829,
  20830,
  20831,
  20832,
  20833,
  20834,
  20835,
  20836,
  20837,
  20838,
  20839,
  20840,
  20841,
  20842,
  20843,
  20844,
  20845,
  20846,
  20847,
  20848,
  20849,
  20850,
  20851,
  20852,
  20853,
  20854,
  20855,
  20856,
  20857,
  20858,
  20859,
  20860,
  20861,
  20862,
  20863,
  20864,
  20865,
  20866,
  20867,
  20868,
  20869,
  20870,
  20871,
  20872,
  20873,
  20874,
  20875,
  20876,
  20877,
  20878,
  20879,
  20880,
  20881,
  20882,
  20883,
  20884,
  20885,
  20886,
  20887,
  20888,
  20889,
  20890,
  20891,
  20892,
  20893,
  20894,
  20895,
  20896,
  20897,
  20898,
  20899,
  20900,
  20901,
  20902,
  20903,
  20904,
  20905,
  20906,
  20907,
  20908,
  20909,
  20910,
  20911,
  20912,
  20913,
  20914,
  20915,
  20916,
  20917,
  20918,
  20919,
  20920,
  20921,
  20922,
  20923,
  20924,
  20925,
  20926,
  20927,
  20928,
  20929,
  20930,
  20931,
  20932,
  20933,
  20934,
  20935,
  20936,
  20937,
  20938,
  20939,
  20940,
  20941,
  20942,
  20943,
  20944,
  20945,
  20946,
  20947,
  20948,
  20949,
  20950,
  20951,
  20952,
  20953,
  20954,
  20955,
  20956,
  20957,
  20958,
  20959,
  20960,
  20961,
  20962,
  20963,
  20964,
  20965,
  20966,
  20967,
  20968,
  20969,
  20970,
  20971,
  20972,
  20973,
  20974,
  20975,
  20976,
  20977,
  20978,
  20979,
  20980,
  20981,
  20982,
  20983,
  20984,
  20985,
  20986,
  20987,
  20988,
  20989,
  20990,
  20991,
  20992,
  20993,
  20994,
  20995,
  20996,
  20997,
  20998,
  20999,
  21000,
  21001,
  21002,
  21003,
  21004,
  21005,
  21006,
  21007,
  21008,
  21009,
  21010,
  21011,
  21012,
  21013,
  21014,
  21015,
  21016,
  21017,
  21018,
  21019,
  21020,
  21021,
  21022,
  21023,
  21024,
  21025,
  21026,
  21027,
  21028,
  21029,
  21030,
  21031,
  21032,
  21033,
  21034,
  21035,
  21036,
  21037,
  21038,
  21039,
  21040,
  21041,
  21042,
  21043,
  21044,
  21045,
  21046,
  21047,
  21048,
  21049,
  21050,
  21051,
  21052,
  21053,
  21054,
  21055,
  21056,
  21057,
  21058,
  21059,
  21060,
  21061,
  21062,
  21063,
  21064,
  21065,
  21066,
  21067,
  21068,
  21069,
  21070,
  21071,
  21072,
  21073,
  21074,
  21075,
  21076,
  21077,
  21078,
  21079,
  21080,
  21081,
  21082,
  21083,
  21084,
  21085,
  21086,
  21087,
  21088,
  21089,
  21090,
  21091,
  21092,
  21093,
  21094,
  21095,
  21096,
  21097,
  21098,
  21099,
  21100,
  21101,
  21102,
  21103,
  21104,
  21105,
  21106,
  21107,
  21108,
  21109,
  21110,
  21111,
  21112,
  21113,
  21114,
  21115,
  21116,
  21117,
  21118,
  21119,
  21120,
  21121,
  21122,
  21123,
  21124,
  21125,
  21126,
  21127,
  21128,
  21129,
  21130,
  21131,
  21132,
  21133,
  21134,
  21135,
  21136,
  21137,
  21138,
  21139,
  21140,
  21141,
  21142,
  21143,
  21144,
  21145,
  21146,
  21147,
  21148,
  21149,
  21150,
  21151,
  21152,
  21153,
  21154,
  21155,
  21156,
  21157,
  21158,
  21159,
  21160,
  21161,
  21162,
  21163,
  21164,
  21165,
  21166,
  21167,
  21168,
  21169,
  21170,
  21171,
  21172,
  21173,
  21174,
  21175,
  21176,
  21177,
  21178,
  21179,
  21180,
  21181,
  21182,
  21183,
  21184,
  21185,
  21186,
  21187,
  21188,
  21189,
  21190,
  21191,
  21192,
  21193,
  21194,
  21195,
  21196,
  21197,
  21198,
  21199,
  21200,
  21201,
  21202,
  21203,
  21204,
  21205,
  21206,
  21207,
  21208,
  21209,
  21210,
  21211,
  21212,
  21213,
  21214,
  21215,
  21216,
  21217,
  21218,
  21219,
  21220,
  21221,
  21222,
  21223,
  21224,
  21225,
  21226,
  21227,
  21228,
  21229,
  21230,
  21231,
  21232,
  21233,
  21234,
  21235,
  21236,
  21237,
  21238,
  21239,
  21240,
  21241,
  21242,
  21243,
  21244,
  21245,
  21246,
  21247,
  21248,
  21249,
  21250,
  21251,
  21252,
  21253,
  21254,
  21255,
  21256,
  21257,
  21258,
  21259,
  21260,
  21261,
  21262,
  21263,
  21264,
  21265,
  21266,
  21267,
  21268,
  21269,
  21270,
  21271,
  21272,
  21273,
  21274,
  21275,
  21276,
  21277,
  21278,
  21279,
  21280,
  21281,
  21282,
  21283,
  21284,
  21285,
  21286,
  21287,
  21288,
  21289,
  21290,
  21291,
  21292,
  21293,
  21294,
  21295,
  21296,
  21297,
  21298,
  21299,
  21300,
  21301,
  21302,
  21303,
  21304,
  21305,
  21306,
  21307,
  21308,
  21309,
  21310,
  21311,
  21312,
  21313,
  21314,
  21315,
  21316,
  21317,
  21318,
  21319,
  21320,
  21321,
  21322,
  21323,
  21324,
  21325,
  21326,
  21327,
  21328,
  21329,
  21330,
  21331,
  21332,
  21333,
  21334,
  21335,
  21336,
  21337,
  21338,
  21339,
  21340,
  21341,
  21342,
  21343,
  21344,
  21345,
  21346,
  21347,
  21348,
  21349,
  21350,
  21351,
  21352,
  21353,
  21354,
  21355,
  21356,
  21357,
  21358,
  21359,
  21360,
  21361,
  21362,
  21363,
  21364,
  21365,
  21366,
  21367,
  21368,
  21369,
  21370,
  21371,
  21372,
  21373,
  21374,
  21375,
  21376,
  21377,
  21378,
  21379,
  21380,
  21381,
  21382,
  21383,
  21384,
  21385,
  21386,
  21387,
  21388,
  21389,
  21390,
  21391,
  21392,
  21393,
  21394,
  21395,
  21396,
  21397,
  21398,
  21399,
  21400,
  21401,
  21402,
  21403,
  21404,
  21405,
  21406,
  21407,
  21408,
  21409,
  21410,
  21411,
  21412,
  21413,
  21414,
  21415,
  21416,
  21417,
  21418,
  21419,
  21420,
  21421,
  21422,
  21423,
  21424,
  21425,
  21426,
  21427,
  21428,
  21429,
  21430,
  21431,
  21432,
  21433,
  21434,
  21435,
  21436,
  21437,
  21438,
  21439,
  21440,
  21441,
  21442,
  21443,
  21444,
  21445,
  21446,
  21447,
  21448,
  21449,
  21450,
  21451,
  21452,
  21453,
  21454,
  21455,
  21456,
  21457,
  21458,
  21459,
  21460,
  21461,
  21462,
  21463,
  21464,
  21465,
  21466,
  21467,
  21468,
  21469,
  21470,
  21471,
  21472,
  21473,
  21474,
  21475,
  21476,
  21477,
  21478,
  21479,
  21480,
  21481,
  21482,
  21483,
  21484,
  21485,
  21486,
  21487,
  21488,
  21489,
  21490,
  21491,
  21492,
  21493,
  21494,
  21495,
  21496,
  21497,
  21498,
  21499,
  21500,
  21501,
  21502,
  21503,
  21504,
  21505,
  21506,
  21507,
  21508,
  21509,
  21510,
  21511,
  21512,
  21513,
  21514,
  21515,
  21516,
  21517,
  21518,
  21519,
  21520,
  21521,
  21522,
  21523,
  21524,
  21525,
  21526,
  21527,
  21528,
  21529,
  21530,
  21531,
  21532,
  21533,
  21534,
  21535,
  21536,
  21537,
  21538,
  21539,
  21540,
  21541,
  21542,
  21543,
  21544,
  21545,
  21546,
  21547,
  21548,
  21549,
  21550,
  21551,
  21552,
  21553,
  21554,
  21555,
  21556,
  21557,
  21558,
  21559,
  21560,
  21561,
  21562,
  21563,
  21564,
  21565,
  21566,
  21567,
  21568,
  21569,
  21570,
  21571,
  21572,
  21573,
  21574,
  21575,
  21576,
  21577,
  21578,
  21579,
  21580,
  21581,
  21582,
  21583,
  21584,
  21585,
  21586,
  21587,
  21588,
  21589,
  21590,
  21591,
  21592,
  21593,
  21594,
  21595,
  21596,
  21597,
  21598,
  21599,
  21600,
  21601,
  21602,
  21603,
  21604,
  21605,
  21606,
  21607,
  21608,
  21609,
  21610,
  21611,
  21612,
  21613,
  21614,
  21615,
  21616,
  21617,
  21618,
  21619,
  21620,
  21621,
  21622,
  21623,
  21624,
  21625,
  21626,
  21627,
  21628,
  21629,
  21630,
  21631,
  21632,
  21633,
  21634,
  21635,
  21636,
  21637,
  21638,
  21639,
  21640,
  21641,
  21642,
  21643,
  21644,
  21645,
  21646,
  21647,
  21648,
  21649,
  21650,
  21651,
  21652,
  21653,
  21654,
  21655,
  21656,
  21657,
  21658,
  21659,
  21660,
  21661,
  21662,
  21663,
  21664,
  21665,
  21666,
  21667,
  21668,
  21669,
  21670,
  21671,
  21672,
  21673,
  21674,
  21675,
  21676,
  21677,
  21678,
  21679,
  21680,
  21681,
  21682,
  21683,
  21684,
  21685,
  21686,
  21687,
  21688,
  21689,
  21690,
  21691,
  21692,
  21693,
  21694,
  21695,
  21696,
  21697,
  21698,
  21699,
  21700,
  21701,
  21702,
  21703,
  21704,
  21705,
  21706,
  21707,
  21708,
  21709,
  21710,
  21711,
  21712,
  21713,
  21714,
  21715,
  21716,
  21717,
  21718,
  21719,
  21720,
  21721,
  21722,
  21723,
  21724,
  21725,
  21726,
  21727,
  21728,
  21729,
  21730,
  21731,
  21732,
  21733,
  21734,
  21735,
  21736,
  21737,
  21738,
  21739,
  21740,
  21741,
  21742,
  21743,
  21744,
  21745,
  21746,
  21747,
  21748,
  21749,
  21750,
  21751,
  21752,
  21753,
  21754,
  21755,
  21756,
  21757,
  21758,
  21759,
  21760,
  21761,
  21762,
  21763,
  21764,
  21765,
  21766,
  21767,
  21768,
  21769,
  21770,
  21771,
  21772,
  21773,
  21774,
  21775,
  21776,
  21777,
  21778,
  21779,
  21780,
  21781,
  21782,
  21783,
  21784,
  21785,
  21786,
  21787,
  21788,
  21789,
  21790,
  21791,
  21792,
  21793,
  21794,
  21795,
  21796,
  21797,
  21798,
  21799,
  21800,
  21801,
  21802,
  21803,
  21804,
  21805,
  21806,
  21807,
  21808,
  21809,
  21810,
  21811,
  21812,
  21813,
  21814,
  21815,
  21816,
  21817,
  21818,
  21819,
  21820,
  21821,
  21822,
  21823,
  21824,
  21825,
  21826,
  21827,
  21828,
  21829,
  21830,
  21831,
  21832,
  21833,
  21834,
  21835,
  21836,
  21837,
  21838,
  21839,
  21840,
  21841,
  21842,
  21843,
  21844,
  21845,
  21846,
  21847,
  21848,
  21849,
  21850,
  21851,
  21852,
  21853,
  21854,
  21855,
  21856,
  21857,
  21858,
  21859,
  21860,
  21861,
  21862,
  21863,
  21864,
  21865,
  21866,
  21867,
  21868,
  21869,
  21870,
  21871,
  21872,
  21873,
  21874,
  21875,
  21876,
  21877,
  21878,
  21879,
  21880,
  21881,
  21882,
  21883,
  21884,
  21885,
  21886,
  21887,
  21888,
  21889,
  21890,
  21891,
  21892,
  21893,
  21894,
  21895,
  21896,
  21897,
  21898,
  21899,
  21900,
  21901,
  21902,
  21903,
  21904,
  21905,
  21906,
  21907,
  21908,
  21909,
  21910,
  21911,
  21912,
  21913,
  21914,
  21915,
  21916,
  21917,
  21918,
  21919,
  21920,
  21921,
  21922,
  21923,
  21924,
  21925,
  21926,
  21927,
  21928,
  21929,
  21930,
  21931,
  21932,
  21933,
  21934,
  21935,
  21936,
  21937,
  21938,
  21939,
  21940,
  21941,
  21942,
  21943,
  21944,
  21945,
  21946,
  21947,
  21948,
  21949,
  21950,
  21951,
  21952,
  21953,
  21954,
  21955,
  21956,
  21957,
  21958,
  21959,
  21960,
  21961,
  21962,
  21963,
  21964,
  21965,
  21966,
  21967,
  21968,
  21969,
  21970,
  21971,
  21972,
  21973,
  21974,
  21975,
  21976,
  21977,
  21978,
  21979,
  21980,
  21981,
  21982,
  21983,
  21984,
  21985,
  21986,
  21987,
  21988,
  21989,
  21990,
  21991,
  21992,
  21993,
  21994,
  21995,
  21996,
  21997,
  21998,
  21999,
  22000,
  22001,
  22002,
  22003,
  22004,
  22005,
  22006,
  22007,
  22008,
  22009,
  22010,
  22011,
  22012,
  22013,
  22014,
  22015,
  22016,
  22017,
  22018,
  22019,
  22020,
  22021,
  22022,
  22023,
  22024,
  22025,
  22026,
  22027,
  22028,
  22029,
  22030,
  22031,
  22032,
  22033,
  22034,
  22035,
  22036,
  22037,
  22038,
  22039,
  22040,
  22041,
  22042,
  22043,
  22044,
  22045,
  22046,
  22047,
  22048,
  22049,
  22050,
  22051,
  22052,
  22053,
  22054,
  22055,
  22056,
  22057,
  22058,
  22059,
  22060,
  22061,
  22062,
  22063,
  22064,
  22065,
  22066,
  22067,
  22068,
  22069,
  22070,
  22071,
  22072,
  22073,
  22074,
  22075,
  22076,
  22077,
  22078,
  22079,
  22080,
  22081,
  22082,
  22083,
  22084,
  22085,
  22086,
  22087,
  22088,
  22089,
  22090,
  22091,
  22092,
  22093,
  22094,
  22095,
  22096,
  22097,
  22098,
  22099,
  22100,
  22101,
  22102,
  22103,
  22104,
  22105,
  22106,
  22107,
  22108,
  22109,
  22110,
  22111,
  22112,
  22113,
  22114,
  22115,
  22116,
  22117,
  22118,
  22119,
  22120,
  22121,
  22122,
  22123,
  22124,
  22125,
  22126,
  22127,
  22128,
  22129,
  22130,
  22131,
  22132,
  22133,
  22134,
  22135,
  22136,
  22137,
  22138,
  22139,
  22140,
  22141,
  22142,
  22143,
  22144,
  22145,
  22146,
  22147,
  22148,
  22149,
  22150,
  22151,
  22152,
  22153,
  22154,
  22155,
  22156,
  22157,
  22158,
  22159,
  22160,
  22161,
  22162,
  22163,
  22164,
  22165,
  22166,
  22167,
  22168,
  22169,
  22170,
  22171,
  22172,
  22173,
  22174,
  22175,
  22176,
  22177,
  22178,
  22179,
  22180,
  22181,
  22182,
  22183,
  22184,
  22185,
  22186,
  22187,
  22188,
  22189,
  22190,
  22191,
  22192,
  22193,
  22194,
  22195,
  22196,
  22197,
  22198,
  22199,
  22200,
  22201,
  22202,
  22203,
  22204,
  22205,
  22206,
  22207,
  22208,
  22209,
  22210,
  22211,
  22212,
  22213,
  22214,
  22215,
  22216,
  22217,
  22218,
  22219,
  22220,
  22221,
  22222,
  22223,
  22224,
  22225,
  22226,
  22227,
  22228,
  22229,
  22230,
  22231,
  22232,
  22233,
  22234,
  22235,
  22236,
  22237,
  22238,
  22239,
  22240,
  22241,
  22242,
  22243,
  22244,
  22245,
  22246,
  22247,
  22248,
  22249,
  22250,
  22251,
  22252,
  22253,
  22254,
  22255,
  22256,
  22257,
  22258,
  22259,
  22260,
  22261,
  22262,
  22263,
  22264,
  22265,
  22266,
  22267,
  22268,
  22269,
  22270,
  22271,
  22272,
  22273,
  22274,
  22275,
  22276,
  22277,
  22278,
  22279,
  22280,
  22281,
  22282,
  22283,
  22284,
  22285,
  22286,
  22287,
  22288,
  22289,
  22290,
  22291,
  22292,
  22293,
  22294,
  22295,
  22296,
  22297,
  22298,
  22299,
  22300,
  22301,
  22302,
  22303,
  22304,
  22305,
  22306,
  22307,
  22308,
  22309,
  22310,
  22311,
  22312,
  22313,
  22314,
  22315,
  22316,
  22317,
  22318,
  22319,
  22320,
  22321,
  22322,
  22323,
  22324,
  22325,
  22326,
  22327,
  22328,
  22329,
  22330,
  22331,
  22332,
  22333,
  22334,
  22335,
  22336,
  22337,
  22338,
  22339,
  22340,
  22341,
  22342,
  22343,
  22344,
  22345,
  22346,
  22347,
  22348,
  22349,
  22350,
  22351,
  22352,
  22353,
  22354,
  22355,
  22356,
  22357,
  22358,
  22359,
  22360,
  22361,
  22362,
  22363,
  22364,
  22365,
  22366,
  22367,
  22368,
  22369,
  22370,
  22371,
  22372,
  22373,
  22374,
  22375,
  22376,
  22377,
  22378,
  22379,
  22380,
  22381,
  22382,
  22383,
  22384,
  22385,
  22386,
  22387,
  22388,
  22389,
  22390,
  22391,
  22392,
  22393,
  22394,
  22395,
  22396,
  22397,
  22398,
  22399,
  22400,
  22401,
  22402,
  22403,
  22404,
  22405,
  22406,
  22407,
  22408,
  22409,
  22410,
  22411,
  22412,
  22413,
  22414,
  22415,
  22416,
  22417,
  22418,
  22419,
  22420,
  22421,
  22422,
  22423,
  22424,
  22425,
  22426,
  22427,
  22428,
  22429,
  22430,
  22431,
  22432,
  22433,
  22434,
  22435,
  22436,
  22437,
  22438,
  22439,
  22440,
  22441,
  22442,
  22443,
  22444,
  22445,
  22446,
  22447,
  22448,
  22449,
  22450,
  22451,
  22452,
  22453,
  22454,
  22455,
  22456,
  22457,
  22458,
  22459,
  22460,
  22461,
  22462,
  22463,
  22464,
  22465,
  22466,
  22467,
  22468,
  22469,
  22470,
  22471,
  22472,
  22473,
  22474,
  22475,
  22476,
  22477,
  22478,
  22479,
  22480,
  22481,
  22482,
  22483,
  22484,
  22485,
  22486,
  22487,
  22488,
  22489,
  22490,
  22491,
  22492,
  22493,
  22494,
  22495,
  22496,
  22497,
  22498,
  22499,
  22500,
  22501,
  22502,
  22503,
  22504,
  22505,
  22506,
  22507,
  22508,
  22509,
  22510,
  22511,
  22512,
  22513,
  22514,
  22515,
  22516,
  22517,
  22518,
  22519,
  22520,
  22521,
  22522,
  22523,
  22524,
  22525,
  22526,
  22527,
  22528,
  22529,
  22530,
  22531,
  22532,
  22533,
  22534,
  22535,
  22536,
  22537,
  22538,
  22539,
  22540,
  22541,
  22542,
  22543,
  22544,
  22545,
  22546,
  22547,
  22548,
  22549,
  22550,
  22551,
  22552,
  22553,
  22554,
  22555,
  22556,
  22557,
  22558,
  22559,
  22560,
  22561,
  22562,
  22563,
  22564,
  22565,
  22566,
  22567,
  22568,
  22569,
  22570,
  22571,
  22572,
  22573,
  22574,
  22575,
  22576,
  22577,
  22578,
  22579,
  22580,
  22581,
  22582,
  22583,
  22584,
  22585,
  22586,
  22587,
  22588,
  22589,
  22590,
  22591,
  22592,
  22593,
  22594,
  22595,
  22596,
  22597,
  22598,
  22599,
  22600,
  22601,
  22602,
  22603,
  22604,
  22605,
  22606,
  22607,
  22608,
  22609,
  22610,
  22611,
  22612,
  22613,
  22614,
  22615,
  22616,
  22617,
  22618,
  22619,
  22620,
  22621,
  22622,
  22623,
  22624,
  22625,
  22626,
  22627,
  22628,
  22629,
  22630,
  22631,
  22632,
  22633,
  22634,
  22635,
  22636,
  22637,
  22638,
  22639,
  22640,
  22641,
  22642,
  22643,
  22644,
  22645,
  22646,
  22647,
  22648,
  22649,
  22650,
  22651,
  22652,
  22653,
  22654,
  22655,
  22656,
  22657,
  22658,
  22659,
  22660,
  22661,
  22662,
  22663,
  22664,
  22665,
  22666,
  22667,
  22668,
  22669,
  22670,
  22671,
  22672,
  22673,
  22674,
  22675,
  22676,
  22677,
  22678,
  22679,
  22680,
  22681,
  22682,
  22683,
  22684,
  22685,
  22686,
  22687,
  22688,
  22689,
  22690,
  22691,
  22692,
  22693,
  22694,
  22695,
  22696,
  22697,
  22698,
  22699,
  22700,
  22701,
  22702,
  22703,
  22704,
  22705,
  22706,
  22707,
  22708,
  22709,
  22710,
  22711,
  22712,
  22713,
  22714,
  22715,
  22716,
  22717,
  22718,
  22719,
  22720,
  22721,
  22722,
  22723,
  22724,
  22725,
  22726,
  22727,
  22728,
  22729,
  22730,
  22731,
  22732,
  22733,
  22734,
  22735,
  22736,
  22737,
  22738,
  22739,
  22740,
  22741,
  22742,
  22743,
  22744,
  22745,
  22746,
  22747,
  22748,
  22749,
  22750,
  22751,
  22752,
  22753,
  22754,
  22755,
  22756,
  22757,
  22758,
  22759,
  22760,
  22761,
  22762,
  22763,
  22764,
  22765,
  22766,
  22767,
  22768,
  22769,
  22770,
  22771,
  22772,
  22773,
  22774,
  22775,
  22776,
  22777,
  22778,
  22779,
  22780,
  22781,
  22782,
  22783,
  22784,
  22785,
  22786,
  22787,
  22788,
  22789,
  22790,
  22791,
  22792,
  22793,
  22794,
  22795,
  22796,
  22797,
  22798,
  22799,
  22800,
  22801,
  22802,
  22803,
  22804,
  22805,
  22806,
  22807,
  22808,
  22809,
  22810,
  22811,
  22812,
  22813,
  22814,
  22815,
  22816,
  22817,
  22818,
  22819,
  22820,
  22821,
  22822,
  22823,
  22824,
  22825,
  22826,
  22827,
  22828,
  22829,
  22830,
  22831,
  22832,
  22833,
  22834,
  22835,
  22836,
  22837,
  22838,
  22839,
  22840,
  22841,
  22842,
  22843,
  22844,
  22845,
  22846,
  22847,
  22848,
  22849,
  22850,
  22851,
  22852,
  22853,
  22854,
  22855,
  22856,
  22857,
  22858,
  22859,
  22860,
  22861,
  22862,
  22863,
  22864,
  22865,
  22866,
  22867,
  22868,
  22869,
  22870,
  22871,
  22872,
  22873,
  22874,
  22875,
  22876,
  22877,
  22878,
  22879,
  22880,
  22881,
  22882,
  22883,
  22884,
  22885,
  22886,
  22887,
  22888,
  22889,
  22890,
  22891,
  22892,
  22893,
  22894,
  22895,
  22896,
  22897,
  22898,
  22899,
  22900,
  22901,
  22902,
  22903,
  22904,
  22905,
  22906,
  22907,
  22908,
  22909,
  22910,
  22911,
  22912,
  22913,
  22914,
  22915,
  22916,
  22917,
  22918,
  22919,
  22920,
  22921,
  22922,
  22923,
  22924,
  22925,
  22926,
  22927,
  22928,
  22929,
  22930,
  22931,
  22932,
  22933,
  22934,
  22935,
  22936,
  22937,
  22938,
  22939,
  22940,
  22941,
  22942,
  22943,
  22944,
  22945,
  22946,
  22947,
  22948,
  22949,
  22950,
  22951,
  22952,
  22953,
  22954,
  22955,
  22956,
  22957,
  22958,
  22959,
  22960,
  22961,
  22962,
  22963,
  22964,
  22965,
  22966,
  22967,
  22968,
  22969,
  22970,
  22971,
  22972,
  22973,
  22974,
  22975,
  22976,
  22977,
  22978,
  22979,
  22980,
  22981,
  22982,
  22983,
  22984,
  22985,
  22986,
  22987,
  22988,
  22989,
  22990,
  22991,
  22992,
  22993,
  22994,
  22995,
  22996,
  22997,
  22998,
  22999,
  23000,
  23001,
  23002,
  23003,
  23004,
  23005,
  23006,
  23007,
  23008,
  23009,
  23010,
  23011,
  23012,
  23013,
  23014,
  23015,
  23016,
  23017,
  23018,
  23019,
  23020,
  23021,
  23022,
  23023,
  23024,
  23025,
  23026,
  23027,
  23028,
  23029,
  23030,
  23031,
  23032,
  23033,
  23034,
  23035,
  23036,
  23037,
  23038,
  23039,
  23040,
  23041,
  23042,
  23043,
  23044,
  23045,
  23046,
  23047,
  23048,
  23049,
  23050,
  23051,
  23052,
  23053,
  23054,
  23055,
  23056,
  23057,
  23058,
  23059,
  23060,
  23061,
  23062,
  23063,
  23064,
  23065,
  23066,
  23067,
  23068,
  23069,
  23070,
  23071,
  23072,
  23073,
  23074,
  23075,
  23076,
  23077,
  23078,
  23079,
  23080,
  23081,
  23082,
  23083,
  23084,
  23085,
  23086,
  23087,
  23088,
  23089,
  23090,
  23091,
  23092,
  23093,
  23094,
  23095,
  23096,
  23097,
  23098,
  23099,
  23100,
  23101,
  23102,
  23103,
  23104,
  23105,
  23106,
  23107,
  23108,
  23109,
  23110,
  23111,
  23112,
  23113,
  23114,
  23115,
  23116,
  23117,
  23118,
  23119,
  23120,
  23121,
  23122,
  23123,
  23124,
  23125,
  23126,
  23127,
  23128,
  23129,
  23130,
  23131,
  23132,
  23133,
  23134,
  23135,
  23136,
  23137,
  23138,
  23139,
  23140,
  23141,
  23142,
  23143,
  23144,
  23145,
  23146,
  23147,
  23148,
  23149,
  23150,
  23151,
  23152,
  23153,
  23154,
  23155,
  23156,
  23157,
  23158,
  23159,
  23160,
  23161,
  23162,
  23163,
  23164,
  23165,
  23166,
  23167,
  23168,
  23169,
  23170,
  23171,
  23172,
  23173,
  23174,
  23175,
  23176,
  23177,
  23178,
  23179,
  23180,
  23181,
  23182,
  23183,
  23184,
  23185,
  23186,
  23187,
  23188,
  23189,
  23190,
  23191,
  23192,
  23193,
  23194,
  23195,
  23196,
  23197,
  23198,
  23199,
  23200,
  23201,
  23202,
  23203,
  23204,
  23205,
  23206,
  23207,
  23208,
  23209,
  23210,
  23211,
  23212,
  23213,
  23214,
  23215,
  23216,
  23217,
  23218,
  23219,
  23220,
  23221,
  23222,
  23223,
  23224,
  23225,
  23226,
  23227,
  23228,
  23229,
  23230,
  23231,
  23232,
  23233,
  23234,
  23235,
  23236,
  23237,
  23238,
  23239,
  23240,
  23241,
  23242,
  23243,
  23244,
  23245,
  23246,
  23247,
  23248,
  23249,
  23250,
  23251,
  23252,
  23253,
  23254,
  23255,
  23256,
  23257,
  23258,
  23259,
  23260,
  23261,
  23262,
  23263,
  23264,
  23265,
  23266,
  23267,
  23268,
  23269,
  23270,
  23271,
  23272,
  23273,
  23274,
  23275,
  23276,
  23277,
  23278,
  23279,
  23280,
  23281,
  23282,
  23283,
  23284,
  23285,
  23286,
  23287,
  23288,
  23289,
  23290,
  23291,
  23292,
  23293,
  23294,
  23295,
  23296,
  23297,
  23298,
  23299,
  23300,
  23301,
  23302,
  23303,
  23304,
  23305,
  23306,
  23307,
  23308,
  23309,
  23310,
  23311,
  23312,
  23313,
  23314,
  23315,
  23316,
  23317,
  23318,
  23319,
  23320,
  23321,
  23322,
  23323,
  23324,
  23325,
  23326,
  23327,
  23328,
  23329,
  23330,
  23331,
  23332,
  23333,
  23334,
  23335,
  23336,
  23337,
  23338,
  23339,
  23340,
  23341,
  23342,
  23343,
  23344,
  23345,
  23346,
  23347,
  23348,
  23349,
  23350,
  23351,
  23352,
  23353,
  23354,
  23355,
  23356,
  23357,
  23358,
  23359,
  23360,
  23361,
  23362,
  23363,
  23364,
  23365,
  23366,
  23367,
  23368,
  23369,
  23370,
  23371,
  23372,
  23373,
  23374,
  23375,
  23376,
  23377,
  23378,
  23379,
  23380,
  23381,
  23382,
  23383,
  23384,
  23385,
  23386,
  23387,
  23388,
  23389,
  23390,
  23391,
  23392,
  23393,
  23394,
  23395,
  23396,
  23397,
  23398,
  23399,
  23400,
  23401,
  23402,
  23403,
  23404,
  23405,
  23406,
  23407,
  23408,
  23409,
  23410,
  23411,
  23412,
  23413,
  23414,
  23415,
  23416,
  23417,
  23418,
  23419,
  23420,
  23421,
  23422,
  23423,
  23424,
  23425,
  23426,
  23427,
  23428,
  23429,
  23430,
  23431,
  23432,
  23433,
  23434,
  23435,
  23436,
  23437,
  23438,
  23439,
  23440,
  23441,
  23442,
  23443,
  23444,
  23445,
  23446,
  23447,
  23448,
  23449,
  23450,
  23451,
  23452,
  23453,
  23454,
  23455,
  23456,
  23457,
  23458,
  23459,
  23460,
  23461,
  23462,
  23463,
  23464,
  23465,
  23466,
  23467,
  23468,
  23469,
  23470,
  23471,
  23472,
  23473,
  23474,
  23475,
  23476,
  23477,
  23478,
  23479,
  23480,
  23481,
  23482,
  23483,
  23484,
  23485,
  23486,
  23487,
  23488,
  23489,
  23490,
  23491,
  23492,
  23493,
  23494,
  23495,
  23496,
  23497,
  23498,
  23499,
  23500,
  23501,
  23502,
  23503,
  23504,
  23505,
  23506,
  23507,
  23508,
  23509,
  23510,
  23511,
  23512,
  23513,
  23514,
  23515,
  23516,
  23517,
  23518,
  23519,
  23520,
  23521,
  23522,
  23523,
  23524,
  23525,
  23526,
  23527,
  23528,
  23529,
  23530,
  23531,
  23532,
  23533,
  23534,
  23535,
  23536,
  23537,
  23538,
  23539,
  23540,
  23541,
  23542,
  23543,
  23544,
  23545,
  23546,
  23547,
  23548,
  23549,
  23550,
  23551,
  23552,
  23553,
  23554,
  23555,
  23556,
  23557,
  23558,
  23559,
  23560,
  23561,
  23562,
  23563,
  23564,
  23565,
  23566,
  23567,
  23568,
  23569,
  23570,
  23571,
  23572,
  23573,
  23574,
  23575,
  23576,
  23577,
  23578,
  23579,
  23580,
  23581,
  23582,
  23583,
  23584,
  23585,
  23586,
  23587,
  23588,
  23589,
  23590,
  23591,
  23592,
  23593,
  23594,
  23595,
  23596,
  23597,
  23598,
  23599,
  23600,
  23601,
  23602,
  23603,
  23604,
  23605,
  23606,
  23607,
  23608,
  23609,
  23610,
  23611,
  23612,
  23613,
  23614,
  23615,
  23616,
  23617,
  23618,
  23619,
  23620,
  23621,
  23622,
  23623,
  23624,
  23625,
  23626,
  23627,
  23628,
  23629,
  23630,
  23631,
  23632,
  23633,
  23634,
  23635,
  23636,
  23637,
  23638,
  23639,
  23640,
  23641,
  23642,
  23643,
  23644,
  23645,
  23646,
  23647,
  23648,
  23649,
  23650,
  23651,
  23652,
  23653,
  23654,
  23655,
  23656,
  23657,
  23658,
  23659,
  23660,
  23661,
  23662,
  23663,
  23664,
  23665,
  23666,
  23667,
  23668,
  23669,
  23670,
  23671,
  23672,
  23673,
  23674,
  23675,
  23676,
  23677,
  23678,
  23679,
  23680,
  23681,
  23682,
  23683,
  23684,
  23685,
  23686,
  23687,
  23688,
  23689,
  23690,
  23691,
  23692,
  23693,
  23694,
  23695,
  23696,
  23697,
  23698,
  23699,
  23700,
  23701,
  23702,
  23703,
  23704,
  23705,
  23706,
  23707,
  23708,
  23709,
  23710,
  23711,
  23712,
  23713,
  23714,
  23715,
  23716,
  23717,
  23718,
  23719,
  23720,
  23721,
  23722,
  23723,
  23724,
  23725,
  23726,
  23727,
  23728,
  23729,
  23730,
  23731,
  23732,
  23733,
  23734,
  23735,
  23736,
  23737,
  23738,
  23739,
  23740,
  23741,
  23742,
  23743,
  23744,
  23745,
  23746,
  23747,
  23748,
  23749,
  23750,
  23751,
  23752,
  23753,
  23754,
  23755,
  23756,
  23757,
  23758,
  23759,
  23760,
  23761,
  23762,
  23763,
  23764,
  23765,
  23766,
  23767,
  23768,
  23769,
  23770,
  23771,
  23772,
  23773,
  23774,
  23775,
  23776,
  23777,
  23778,
  23779,
  23780,
  23781,
  23782,
  23783,
  23784,
  23785,
  23786,
  23787,
  23788,
  23789,
  23790,
  23791,
  23792,
  23793,
  23794,
  23795,
  23796,
  23797,
  23798,
  23799,
  23800,
  23801,
  23802,
  23803,
  23804,
  23805,
  23806,
  23807,
  23808,
  23809,
  23810,
  23811,
  23812,
  23813,
  23814,
  23815,
  23816,
  23817,
  23818,
  23819,
  23820,
  23821,
  23822,
  23823,
  23824,
  23825,
  23826,
  23827,
  23828,
  23829,
  23830,
  23831,
  23832,
  23833,
  23834,
  23835,
  23836,
  23837,
  23838,
  23839,
  23840,
  23841,
  23842,
  23843,
  23844,
  23845,
  23846,
  23847,
  23848,
  23849,
  23850,
  23851,
  23852,
  23853,
  23854,
  23855,
  23856,
  23857,
  23858,
  23859,
  23860,
  23861,
  23862,
  23863,
  23864,
  23865,
  23866,
  23867,
  23868,
  23869,
  23870,
  23871,
  23872,
  23873,
  23874,
  23875,
  23876,
  23877,
  23878,
  23879,
  23880,
  23881,
  23882,
  23883,
  23884,
  23885,
  23886,
  23887,
  23888,
  23889,
  23890,
  23891,
  23892,
  23893,
  23894,
  23895,
  23896,
  23897,
  23898,
  23899,
  23900,
  23901,
  23902,
  23903,
  23904,
  23905,
  23906,
  23907,
  23908,
  23909,
  23910,
  23911,
  23912,
  23913,
  23914,
  23915,
  23916,
  23917,
  23918,
  23919,
  23920,
  23921,
  23922,
  23923,
  23924,
  23925,
  23926,
  23927,
  23928,
  23929,
  23930,
  23931,
  23932,
  23933,
  23934,
  23935,
  23936,
  23937,
  23938,
  23939,
  23940,
  23941,
  23942,
  23943,
  23944,
  23945,
  23946,
  23947,
  23948,
  23949,
  23950,
  23951,
  23952,
  23953,
  23954,
  23955,
  23956,
  23957,
  23958,
  23959,
  23960,
  23961,
  23962,
  23963,
  23964,
  23965,
  23966,
  23967,
  23968,
  23969,
  23970,
  23971,
  23972,
  23973,
  23974,
  23975,
  23976,
  23977,
  23978,
  23979,
  23980,
  23981,
  23982,
  23983,
  23984,
  23985,
  23986,
  23987,
  23988,
  23989,
  23990,
  23991,
  23992,
  23993,
  23994,
  23995,
  23996,
  23997,
  23998,
  23999,
  24000,
  24001,
  24002,
  24003,
  24004,
  24005,
  24006,
  24007,
  24008,
  24009,
  24010,
  24011,
  24012,
  24013,
  24014,
  24015,
  24016,
  24017,
  24018,
  24019,
  24020,
  24021,
  24022,
  24023,
  24024,
  24025,
  24026,
  24027,
  24028,
  24029,
  24030,
  24031,
  24032,
  24033,
  24034,
  24035,
  24036,
  24037,
  24038,
  24039,
  24040,
  24041,
  24042,
  24043,
  24044,
  24045,
  24046,
  24047,
  24048,
  24049,
  24050,
  24051,
  24052,
  24053,
  24054,
  24055,
  24056,
  24057,
  24058,
  24059,
  24060,
  24061,
  24062,
  24063,
  24064,
  24065,
  24066,
  24067,
  24068,
  24069,
  24070,
  24071,
  24072,
  24073,
  24074,
  24075,
  24076,
  24077,
  24078,
  24079,
  24080,
  24081,
  24082,
  24083,
  24084,
  24085,
  24086,
  24087,
  24088,
  24089,
  24090,
  24091,
  24092,
  24093,
  24094,
  24095,
  24096,
  24097,
  24098,
  24099,
  24100,
  24101,
  24102,
  24103,
  24104,
  24105,
  24106,
  24107,
  24108,
  24109,
  24110,
  24111,
  24112,
  24113,
  24114,
  24115,
  24116,
  24117,
  24118,
  24119,
  24120,
  24121,
  24122,
  24123,
  24124,
  24125,
  24126,
  24127,
  24128,
  24129,
  24130,
  24131,
  24132,
  24133,
  24134,
  24135,
  24136,
  24137,
  24138,
  24139,
  24140,
  24141,
  24142,
  24143,
  24144,
  24145,
  24146,
  24147,
  24148,
  24149,
  24150,
  24151,
  24152,
  24153,
  24154,
  24155,
  24156,
  24157,
  24158,
  24159,
  24160,
  24161,
  24162,
  24163,
  24164,
  24165,
  24166,
  24167,
  24168,
  24169,
  24170,
  24171,
  24172,
  24173,
  24174,
  24175,
  24176,
  24177,
  24178,
  24179,
  24180,
  24181,
  24182,
  24183,
  24184,
  24185,
  24186,
  24187,
  24188,
  24189,
  24190,
  24191,
  24192,
  24193,
  24194,
  24195,
  24196,
  24197,
  24198,
  24199,
  24200,
  24201,
  24202,
  24203,
  24204,
  24205,
  24206,
  24207,
  24208,
  24209,
  24210,
  24211,
  24212,
  24213,
  24214,
  24215,
  24216,
  24217,
  24218,
  24219,
  24220,
  24221,
  24222,
  24223,
  24224,
  24225,
  24226,
  24227,
  24228,
  24229,
  24230,
  24231,
  24232,
  24233,
  24234,
  24235,
  24236,
  24237,
  24238,
  24239,
  24240,
  24241,
  24242,
  24243,
  24244,
  24245,
  24246,
  24247,
  24248,
  24249,
  24250,
  24251,
  24252,
  24253,
  24254,
  24255,
  24256,
  24257,
  24258,
  24259,
  24260,
  24261,
  24262,
  24263,
  24264,
  24265,
  24266,
  24267,
  24268,
  24269,
  24270,
  24271,
  24272,
  24273,
  24274,
  24275,
  24276,
  24277,
  24278,
  24279,
  24280,
  24281,
  24282,
  24283,
  24284,
  24285,
  24286,
  24287,
  24288,
  24289,
  24290,
  24291,
  24292,
  24293,
  24294,
  24295,
  24296,
  24297,
  24298,
  24299,
  24300,
  24301,
  24302,
  24303,
  24304,
  24305,
  24306,
  24307,
  24308,
  24309,
  24310,
  24311,
  24312,
  24313,
  24314,
  24315,
  24316,
  24317,
  24318,
  24319,
  24320,
  24321,
  24322,
  24323,
  24324,
  24325,
  24326,
  24327,
  24328,
  24329,
  24330,
  24331,
  24332,
  24333,
  24334,
  24335,
  24336,
  24337,
  24338,
  24339,
  24340,
  24341,
  24342,
  24343,
  24344,
  24345,
  24346,
  24347,
  24348,
  24349,
  24350,
  24351,
  24352,
  24353,
  24354,
  24355,
  24356,
  24357,
  24358,
  24359,
  24360,
  24361,
  24362,
  24363,
  24364,
  24365,
  24366,
  24367,
  24368,
  24369,
  24370,
  24371,
  24372,
  24373,
  24374,
  24375,
  24376,
  24377,
  24378,
  24379,
  24380,
  24381,
  24382,
  24383,
  24384,
  24385,
  24386,
  24387,
  24388,
  24389,
  24390,
  24391,
  24392,
  24393,
  24394,
  24395,
  24396,
  24397,
  24398,
  24399,
  24400,
  24401,
  24402,
  24403,
  24404,
  24405,
  24406,
  24407,
  24408,
  24409,
  24410,
  24411,
  24412,
  24413,
  24414,
  24415,
  24416,
  24417,
  24418,
  24419,
  24420,
  24421,
  24422,
  24423,
  24424,
  24425,
  24426,
  24427,
  24428,
  24429,
  24430,
  24431,
  24432,
  24433,
  24434,
  24435,
  24436,
  24437,
  24438,
  24439,
  24440,
  24441,
  24442,
  24443,
  24444,
  24445,
  24446,
  24447,
  24448,
  24449,
  24450,
  24451,
  24452,
  24453,
  24454,
  24455,
  24456,
  24457,
  24458,
  24459,
  24460,
  24461,
  24462,
  24463,
  24464,
  24465,
  24466,
  24467,
  24468,
  24469,
  24470,
  24471,
  24472,
  24473,
  24474,
  24475,
  24476,
  24477,
  24478,
  24479,
  24480,
  24481,
  24482,
  24483,
  24484,
  24485,
  24486,
  24487,
  24488,
  24489,
  24490,
  24491,
  24492,
  24493,
  24494,
  24495,
  24496,
  24497,
  24498,
  24499,
  24500,
  24501,
  24502,
  24503,
  24504,
  24505,
  24506,
  24507,
  24508,
  24509,
  24510,
  24511,
  24512,
  24513,
  24514,
  24515,
  24516,
  24517,
  24518,
  24519,
  24520,
  24521,
  24522,
  24523,
  24524,
  24525,
  24526,
  24527,
  24528,
  24529,
  24530,
  24531,
  24532,
  24533,
  24534,
  24535,
  24536,
  24537,
  24538,
  24539,
  24540,
  24541,
  24542,
  24543,
  24544,
  24545,
  24546,
  24547,
  24548,
  24549,
  24550,
  24551,
  24552,
  24553,
  24554,
  24555,
  24556,
  24557,
  24558,
  24559,
  24560,
  24561,
  24562,
  24563,
  24564,
  24565,
  24566,
  24567,
  24568,
  24569,
  24570,
  24571,
  24572,
  24573,
  24574,
  24575,
  24576,
  24577,
  24578,
  24579,
  24580,
  24581,
  24582,
  24583,
  24584,
  24585,
  24586,
  24587,
  24588,
  24589,
  24590,
  24591,
  24592,
  24593,
  24594,
  24595,
  24596,
  24597,
  24598,
  24599,
  24600,
  24601,
  24602,
  24603,
  24604,
  24605,
  24606,
  24607,
  24608,
  24609,
  24610,
  24611,
  24612,
  24613,
  24614,
  24615,
  24616,
  24617,
  24618,
  24619,
  24620,
  24621,
  24622,
  24623,
  24624,
  24625,
  24626,
  24627,
  24628,
  24629,
  24630,
  24631,
  24632,
  24633,
  24634,
  24635,
  24636,
  24637,
  24638,
  24639,
  24640,
  24641,
  24642,
  24643,
  24644,
  24645,
  24646,
  24647,
  24648,
  24649,
  24650,
  24651,
  24652,
  24653,
  24654,
  24655,
  24656,
  24657,
  24658,
  24659,
  24660,
  24661,
  24662,
  24663,
  24664,
  24665,
  24666,
  24667,
  24668,
  24669,
  24670,
  24671,
  24672,
  24673,
  24674,
  24675,
  24676,
  24677,
  24678,
  24679,
  24680,
  24681,
  24682,
  24683,
  24684,
  24685,
  24686,
  24687,
  24688,
  24689,
  24690,
  24691,
  24692,
  24693,
  24694,
  24695,
  24696,
  24697,
  24698,
  24699,
  24700,
  24701,
  24702,
  24703,
  24704,
  24705,
  24706,
  24707,
  24708,
  24709,
  24710,
  24711,
  24712,
  24713,
  24714,
  24715,
  24716,
  24717,
  24718,
  24719,
  24720,
  24721,
  24722,
  24723,
  24724,
  24725,
  24726,
  24727,
  24728,
  24729,
  24730,
  24731,
  24732,
  24733,
  24734,
  24735,
  24736,
  24737,
  24738,
  24739,
  24740,
  24741,
  24742,
  24743,
  24744,
  24745,
  24746,
  24747,
  24748,
  24749,
  24750,
  24751,
  24752,
  24753,
  24754,
  24755,
  24756,
  24757,
  24758,
  24759,
  24760,
  24761,
  24762,
  24763,
  24764,
  24765,
  24766,
  24767,
  24768,
  24769,
  24770,
  24771,
  24772,
  24773,
  24774,
  24775,
  24776,
  24777,
  24778,
  24779,
  24780,
  24781,
  24782,
  24783,
  24784,
  24785,
  24786,
  24787,
  24788,
  24789,
  24790,
  24791,
  24792,
  24793,
  24794,
  24795,
  24796,
  24797,
  24798,
  24799,
  24800,
  24801,
  24802,
  24803,
  24804,
  24805,
  24806,
  24807,
  24808,
  24809,
  24810,
  24811,
  24812,
  24813,
  24814,
  24815,
  24816,
  24817,
  24818,
  24819,
  24820,
  24821,
  24822,
  24823,
  24824,
  24825,
  24826,
  24827,
  24828,
  24829,
  24830,
  24831,
  24832,
  24833,
  24834,
  24835,
  24836,
  24837,
  24838,
  24839,
  24840,
  24841,
  24842,
  24843,
  24844,
  24845,
  24846,
  24847,
  24848,
  24849,
  24850,
  24851,
  24852,
  24853,
  24854,
  24855,
  24856,
  24857,
  24858,
  24859,
  24860,
  24861,
  24862,
  24863,
  24864,
  24865,
  24866,
  24867,
  24868,
  24869,
  24870,
  24871,
  24872,
  24873,
  24874,
  24875,
  24876,
  24877,
  24878,
  24879,
  24880,
  24881,
  24882,
  24883,
  24884,
  24885,
  24886,
  24887,
  24888,
  24889,
  24890,
  24891,
  24892,
  24893,
  24894,
  24895,
  24896,
  24897,
  24898,
  24899,
  24900,
  24901,
  24902,
  24903,
  24904,
  24905,
  24906,
  24907,
  24908,
  24909,
  24910,
  24911,
  24912,
  24913,
  24914,
  24915,
  24916,
  24917,
  24918,
  24919,
  24920,
  24921,
  24922,
  24923,
  24924,
  24925,
  24926,
  24927,
  24928,
  24929,
  24930,
  24931,
  24932,
  24933,
  24934,
  24935,
  24936,
  24937,
  24938,
  24939,
  24940,
  24941,
  24942,
  24943,
  24944,
  24945,
  24946,
  24947,
  24948,
  24949,
  24950,
  24951,
  24952,
  24953,
  24954,
  24955,
  24956,
  24957,
  24958,
  24959,
  24960,
  24961,
  24962,
  24963,
  24964,
  24965,
  24966,
  24967,
  24968,
  24969,
  24970,
  24971,
  24972,
  24973,
  24974,
  24975,
  24976,
  24977,
  24978,
  24979,
  24980,
  24981,
  24982,
  24983,
  24984,
  24985,
  24986,
  24987,
  24988,
  24989,
  24990,
  24991,
  24992,
  24993,
  24994,
  24995,
  24996,
  24997,
  24998,
  24999,
  25000,
  25001,
  25002,
  25003,
  25004,
  25005,
  25006,
  25007,
  25008,
  25009,
  25010,
  25011,
  25012,
  25013,
  25014,
  25015,
  25016,
  25017,
  25018,
  25019,
  25020,
  25021,
  25022,
  25023,
  25024,
  25025,
  25026,
  25027,
  25028,
  25029,
  25030,
  25031,
  25032,
  25033,
  25034,
  25035,
  25036,
  25037,
  25038,
  25039,
  25040,
  25041,
  25042,
  25043,
  25044,
  25045,
  25046,
  25047,
  25048,
  25049,
  25050,
  25051,
  25052,
  25053,
  25054,
  25055,
  25056,
  25057,
  25058,
  25059,
  25060,
  25061,
  25062,
  25063,
  25064,
  25065,
  25066,
  25067,
  25068,
  25069,
  25070,
  25071,
  25072,
  25073,
  25074,
  25075,
  25076,
  25077,
  25078,
  25079,
  25080,
  25081,
  25082,
  25083,
  25084,
  25085,
  25086,
  25087,
  25088,
  25089,
  25090,
  25091,
  25092,
  25093,
  25094,
  25095,
  25096,
  25097,
  25098,
  25099,
  25100,
  25101,
  25102,
  25103,
  25104,
  25105,
  25106,
  25107,
  25108,
  25109,
  25110,
  25111,
  25112,
  25113,
  25114,
  25115,
  25116,
  25117,
  25118,
  25119,
  25120,
  25121,
  25122,
  25123,
  25124,
  25125,
  25126,
  25127,
  25128,
  25129,
  25130,
  25131,
  25132,
  25133,
  25134,
  25135,
  25136,
  25137,
  25138,
  25139,
  25140,
  25141,
  25142,
  25143,
  25144,
  25145,
  25146,
  25147,
  25148,
  25149,
  25150,
  25151,
  25152,
  25153,
  25154,
  25155,
  25156,
  25157,
  25158,
  25159,
  25160,
  25161,
  25162,
  25163,
  25164,
  25165,
  25166,
  25167,
  25168,
  25169,
  25170,
  25171,
  25172,
  25173,
  25174,
  25175,
  25176,
  25177,
  25178,
  25179,
  25180,
  25181,
  25182,
  25183,
  25184,
  25185,
  25186,
  25187,
  25188,
  25189,
  25190,
  25191,
  25192,
  25193,
  25194,
  25195,
  25196,
  25197,
  25198,
  25199,
  25200,
  25201,
  25202,
  25203,
  25204,
  25205,
  25206,
  25207,
  25208,
  25209,
  25210,
  25211,
  25212,
  25213,
  25214,
  25215,
  25216,
  25217,
  25218,
  25219,
  25220,
  25221,
  25222,
  25223,
  25224,
  25225,
  25226,
  25227,
  25228,
  25229,
  25230,
  25231,
  25232,
  25233,
  25234,
  25235,
  25236,
  25237,
  25238,
  25239,
  25240,
  25241,
  25242,
  25243,
  25244,
  25245,
  25246,
  25247,
  25248,
  25249,
  25250,
  25251,
  25252,
  25253,
  25254,
  25255,
  25256,
  25257,
  25258,
  25259,
  25260,
  25261,
  25262,
  25263,
  25264,
  25265,
  25266,
  25267,
  25268,
  25269,
  25270,
  25271,
  25272,
  25273,
  25274,
  25275,
  25276,
  25277,
  25278,
  25279,
  25280,
  25281,
  25282,
  25283,
  25284,
  25285,
  25286,
  25287,
  25288,
  25289,
  25290,
  25291,
  25292,
  25293,
  25294,
  25295,
  25296,
  25297,
  25298,
  25299,
  25300,
  25301,
  25302,
  25303,
  25304,
  25305,
  25306,
  25307,
  25308,
  25309,
  25310,
  25311,
  25312,
  25313,
  25314,
  25315,
  25316,
  25317,
  25318,
  25319,
  25320,
  25321,
  25322,
  25323,
  25324,
  25325,
  25326,
  25327,
  25328,
  25329,
  25330,
  25331,
  25332,
  25333,
  25334,
  25335,
  25336,
  25337,
  25338,
  25339,
  25340,
  25341,
  25342,
  25343,
  25344,
  25345,
  25346,
  25347,
  25348,
  25349,
  25350,
  25351,
  25352,
  25353,
  25354,
  25355,
  25356,
  25357,
  25358,
  25359,
  25360,
  25361,
  25362,
  25363,
  25364,
  25365,
  25366,
  25367,
  25368,
  25369,
  25370,
  25371,
  25372,
  25373,
  25374,
  25375,
  25376,
  25377,
  25378,
  25379,
  25380,
  25381,
  25382,
  25383,
  25384,
  25385,
  25386,
  25387,
  25388,
  25389,
  25390,
  25391,
  25392,
  25393,
  25394,
  25395,
  25396,
  25397,
  25398,
  25399,
  25400,
  25401,
  25402,
  25403,
  25404,
  25405,
  25406,
  25407,
  25408,
  25409,
  25410,
  25411,
  25412,
  25413,
  25414,
  25415,
  25416,
  25417,
  25418,
  25419,
  25420,
  25421,
  25422,
  25423,
  25424,
  25425,
  25426,
  25427,
  25428,
  25429,
  25430,
  25431,
  25432,
  25433,
  25434,
  25435,
  25436,
  25437,
  25438,
  25439,
  25440,
  25441,
  25442,
  25443,
  25444,
  25445,
  25446,
  25447,
  25448,
  25449,
  25450,
  25451,
  25452,
  25453,
  25454,
  25455,
  25456,
  25457,
  25458,
  25459,
  25460,
  25461,
  25462,
  25463,
  25464,
  25465,
  25466,
  25467,
  25468,
  25469,
  25470,
  25471,
  25472,
  25473,
  25474,
  25475,
  25476,
  25477,
  25478,
  25479,
  25480,
  25481,
  25482,
  25483,
  25484,
  25485,
  25486,
  25487,
  25488,
  25489,
  25490,
  25491,
  25492,
  25493,
  25494,
  25495,
  25496,
  25497,
  25498,
  25499,
  25500,
  25501,
  25502,
  25503,
  25504,
  25505,
  25506,
  25507,
  25508,
  25509,
  25510,
  25511,
  25512,
  25513,
  25514,
  25515,
  25516,
  25517,
  25518,
  25519,
  25520,
  25521,
  25522,
  25523,
  25524,
  25525,
  25526,
  25527,
  25528,
  25529,
  25530,
  25531,
  25532,
  25533,
  25534,
  25535,
  25536,
  25537,
  25538,
  25539,
  25540,
  25541,
  25542,
  25543,
  25544,
  25545,
  25546,
  25547,
  25548,
  25549,
  25550,
  25551,
  25552,
  25553,
  25554,
  25555,
  25556,
  25557,
  25558,
  25559,
  25560,
  25561,
  25562,
  25563,
  25564,
  25565,
  25566,
  25567,
  25568,
  25569,
  25570,
  25571,
  25572,
  25573,
  25574,
  25575,
  25576,
  25577,
  25578,
  25579,
  25580,
  25581,
  25582,
  25583,
  25584,
  25585,
  25586,
  25587,
  25588,
  25589,
  25590,
  25591,
  25592,
  25593,
  25594,
  25595,
  25596,
  25597,
  25598,
  25599,
  25600,
  25601,
  25602,
  25603,
  25604,
  25605,
  25606,
  25607,
  25608,
  25609,
  25610,
  25611,
  25612,
  25613,
  25614,
  25615,
  25616,
  25617,
  25618,
  25619,
  25620,
  25621,
  25622,
  25623,
  25624,
  25625,
  25626,
  25627,
  25628,
  25629,
  25630,
  25631,
  25632,
  25633,
  25634,
  25635,
  25636,
  25637,
  25638,
  25639,
  25640,
  25641,
  25642,
  25643,
  25644,
  25645,
  25646,
  25647,
  25648,
  25649,
  25650,
  25651,
  25652,
  25653,
  25654,
  25655,
  25656,
  25657,
  25658,
  25659,
  25660,
  25661,
  25662,
  25663,
  25664,
  25665,
  25666,
  25667,
  25668,
  25669,
  25670,
  25671,
  25672,
  25673,
  25674,
  25675,
  25676,
  25677,
  25678,
  25679,
  25680,
  25681,
  25682,
  25683,
  25684,
  25685,
  25686,
  25687,
  25688,
  25689,
  25690,
  25691,
  25692,
  25693,
  25694,
  25695,
  25696,
  25697,
  25698,
  25699,
  25700,
  25701,
  25702,
  25703,
  25704,
  25705,
  25706,
  25707,
  25708,
  25709,
  25710,
  25711,
  25712,
  25713,
  25714,
  25715,
  25716,
  25717,
  25718,
  25719,
  25720,
  25721,
  25722,
  25723,
  25724,
  25725,
  25726,
  25727,
  25728,
  25729,
  25730,
  25731,
  25732,
  25733,
  25734,
  25735,
  25736,
  25737,
  25738,
  25739,
  25740,
  25741,
  25742,
  25743,
  25744,
  25745,
  25746,
  25747,
  25748,
  25749,
  25750,
  25751,
  25752,
  25753,
  25754,
  25755,
  25756,
  25757,
  25758,
  25759,
  25760,
  25761,
  25762,
  25763,
  25764,
  25765,
  25766,
  25767,
  25768,
  25769,
  25770,
  25771,
  25772,
  25773,
  25774,
  25775,
  25776,
  25777,
  25778,
  25779,
  25780,
  25781,
  25782,
  25783,
  25784,
  25785,
  25786,
  25787,
  25788,
  25789,
  25790,
  25791,
  25792,
  25793,
  25794,
  25795,
  25796,
  25797,
  25798,
  25799,
  25800,
  25801,
  25802,
  25803,
  25804,
  25805,
  25806,
  25807,
  25808,
  25809,
  25810,
  25811,
  25812,
  25813,
  25814,
  25815,
  25816,
  25817,
  25818,
  25819,
  25820,
  25821,
  25822,
  25823,
  25824,
  25825,
  25826,
  25827,
  25828,
  25829,
  25830,
  25831,
  25832,
  25833,
  25834,
  25835,
  25836,
  25837,
  25838,
  25839,
  25840,
  25841,
  25842,
  25843,
  25844,
  25845,
  25846,
  25847,
  25848,
  25849,
  25850,
  25851,
  25852,
  25853,
  25854,
  25855,
  25856,
  25857,
  25858,
  25859,
  25860,
  25861,
  25862,
  25863,
  25864,
  25865,
  25866,
  25867,
  25868,
  25869,
  25870,
  25871,
  25872,
  25873,
  25874,
  25875,
  25876,
  25877,
  25878,
  25879,
  25880,
  25881,
  25882,
  25883,
  25884,
  25885,
  25886,
  25887,
  25888,
  25889,
  25890,
  25891,
  25892,
  25893,
  25894,
  25895,
  25896,
  25897,
  25898,
  25899,
  25900,
  25901,
  25902,
  25903,
  25904,
  25905,
  25906,
  25907,
  25908,
  25909,
  25910,
  25911,
  25912,
  25913,
  25914,
  25915,
  25916,
  25917,
  25918,
  25919,
  25920,
  25921,
  25922,
  25923,
  25924,
  25925,
  25926,
  25927,
  25928,
  25929,
  25930,
  25931,
  25932,
  25933,
  25934,
  25935,
  25936,
  25937,
  25938,
  25939,
  25940,
  25941,
  25942,
  25943,
  25944,
  25945,
  25946,
  25947,
  25948,
  25949,
  25950,
  25951,
  25952,
  25953,
  25954,
  25955,
  25956,
  25957,
  25958,
  25959,
  25960,
  25961,
  25962,
  25963,
  25964,
  25965,
  25966,
  25967,
  25968,
  25969,
  25970,
  25971,
  25972,
  25973,
  25974,
  25975,
  25976,
  25977,
  25978,
  25979,
  25980,
  25981,
  25982,
  25983,
  25984,
  25985,
  25986,
  25987,
  25988,
  25989,
  25990,
  25991,
  25992,
  25993,
  25994,
  25995,
  25996,
  25997,
  25998,
  25999,
  26000,
  26001,
  26002,
  26003,
  26004,
  26005,
  26006,
  26007,
  26008,
  26009,
  26010,
  26011,
  26012,
  26013,
  26014,
  26015,
  26016,
  26017,
  26018,
  26019,
  26020,
  26021,
  26022,
  26023,
  26024,
  26025,
  26026,
  26027,
  26028,
  26029,
  26030,
  26031,
  26032,
  26033,
  26034,
  26035,
  26036,
  26037,
  26038,
  26039,
  26040,
  26041,
  26042,
  26043,
  26044,
  26045,
  26046,
  26047,
  26048,
  26049,
  26050,
  26051,
  26052,
  26053,
  26054,
  26055,
  26056,
  26057,
  26058,
  26059,
  26060,
  26061,
  26062,
  26063,
  26064,
  26065,
  26066,
  26067,
  26068,
  26069,
  26070,
  26071,
  26072,
  26073,
  26074,
  26075,
  26076,
  26077,
  26078,
  26079,
  26080,
  26081,
  26082,
  26083,
  26084,
  26085,
  26086,
  26087,
  26088,
  26089,
  26090,
  26091,
  26092,
  26093,
  26094,
  26095,
  26096,
  26097,
  26098,
  26099,
  26100,
  26101,
  26102,
  26103,
  26104,
  26105,
  26106,
  26107,
  26108,
  26109,
  26110,
  26111,
  26112,
  26113,
  26114,
  26115,
  26116,
  26117,
  26118,
  26119,
  26120,
  26121,
  26122,
  26123,
  26124,
  26125,
  26126,
  26127,
  26128,
  26129,
  26130,
  26131,
  26132,
  26133,
  26134,
  26135,
  26136,
  26137,
  26138,
  26139,
  26140,
  26141,
  26142,
  26143,
  26144,
  26145,
  26146,
  26147,
  26148,
  26149,
  26150,
  26151,
  26152,
  26153,
  26154,
  26155,
  26156,
  26157,
  26158,
  26159,
  26160,
  26161,
  26162,
  26163,
  26164,
  26165,
  26166,
  26167,
  26168,
  26169,
  26170,
  26171,
  26172,
  26173,
  26174,
  26175,
  26176,
  26177,
  26178,
  26179,
  26180,
  26181,
  26182,
  26183,
  26184,
  26185,
  26186,
  26187,
  26188,
  26189,
  26190,
  26191,
  26192,
  26193,
  26194,
  26195,
  26196,
  26197,
  26198,
  26199,
  26200,
  26201,
  26202,
  26203,
  26204,
  26205,
  26206,
  26207,
  26208,
  26209,
  26210,
  26211,
  26212,
  26213,
  26214,
  26215,
  26216,
  26217,
  26218,
  26219,
  26220,
  26221,
  26222,
  26223,
  26224,
  26225,
  26226,
  26227,
  26228,
  26229,
  26230,
  26231,
  26232,
  26233,
  26234,
  26235,
  26236,
  26237,
  26238,
  26239,
  26240,
  26241,
  26242,
  26243,
  26244,
  26245,
  26246,
  26247,
  26248,
  26249,
  26250,
  26251,
  26252,
  26253,
  26254,
  26255,
  26256,
  26257,
  26258,
  26259,
  26260,
  26261,
  26262,
  26263,
  26264,
  26265,
  26266,
  26267,
  26268,
  26269,
  26270,
  26271,
  26272,
  26273,
  26274,
  26275,
  26276,
  26277,
  26278,
  26279,
  26280,
  26281,
  26282,
  26283,
  26284,
  26285,
  26286,
  26287,
  26288,
  26289,
  26290,
  26291,
  26292,
  26293,
  26294,
  26295,
  26296,
  26297,
  26298,
  26299,
  26300,
  26301,
  26302,
  26303,
  26304,
  26305,
  26306,
  26307,
  26308,
  26309,
  26310,
  26311,
  26312,
  26313,
  26314,
  26315,
  26316,
  26317,
  26318,
  26319,
  26320,
  26321,
  26322,
  26323,
  26324,
  26325,
  26326,
  26327,
  26328,
  26329,
  26330,
  26331,
  26332,
  26333,
  26334,
  26335,
  26336,
  26337,
  26338,
  26339,
  26340,
  26341,
  26342,
  26343,
  26344,
  26345,
  26346,
  26347,
  26348,
  26349,
  26350,
  26351,
  26352,
  26353,
  26354,
  26355,
  26356,
  26357,
  26358,
  26359,
  26360,
  26361,
  26362,
  26363,
  26364,
  26365,
  26366,
  26367,
  26368,
  26369,
  26370,
  26371,
  26372,
  26373,
  26374,
  26375,
  26376,
  26377,
  26378,
  26379,
  26380,
  26381,
  26382,
  26383,
  26384,
  26385,
  26386,
  26387,
  26388,
  26389,
  26390,
  26391,
  26392,
  26393,
  26394,
  26395,
  26396,
  26397,
  26398,
  26399,
  26400,
  26401,
  26402,
  26403,
  26404,
  26405,
  26406,
  26407,
  26408,
  26409,
  26410,
  26411,
  26412,
  26413,
  26414,
  26415,
  26416,
  26417,
  26418,
  26419,
  26420,
  26421,
  26422,
  26423,
  26424,
  26425,
  26426,
  26427,
  26428,
  26429,
  26430,
  26431,
  26432,
  26433,
  26434,
  26435,
  26436,
  26437,
  26438,
  26439,
  26440,
  26441,
  26442,
  26443,
  26444,
  26445,
  26446,
  26447,
  26448,
  26449,
  26450,
  26451,
  26452,
  26453,
  26454,
  26455,
  26456,
  26457,
  26458,
  26459,
  26460,
  26461,
  26462,
  26463,
  26464,
  26465,
  26466,
  26467,
  26468,
  26469,
  26470,
  26471,
  26472,
  26473,
  26474,
  26475,
  26476,
  26477,
  26478,
  26479,
  26480,
  26481,
  26482,
  26483,
  26484,
  26485,
  26486,
  26487,
  26488,
  26489,
  26490,
  26491,
  26492,
  26493,
  26494,
  26495,
  26496,
  26497,
  26498,
  26499,
  26500,
  26501,
  26502,
  26503,
  26504,
  26505,
  26506,
  26507,
  26508,
  26509,
  26510,
  26511,
  26512,
  26513,
  26514,
  26515,
  26516,
  26517,
  26518,
  26519,
  26520,
  26521,
  26522,
  26523,
  26524,
  26525,
  26526,
  26527,
  26528,
  26529,
  26530,
  26531,
  26532,
  26533,
  26534,
  26535,
  26536,
  26537,
  26538,
  26539,
  26540,
  26541,
  26542,
  26543,
  26544,
  26545,
  26546,
  26547,
  26548,
  26549,
  26550,
  26551,
  26552,
  26553,
  26554,
  26555,
  26556,
  26557,
  26558,
  26559,
  26560,
  26561,
  26562,
  26563,
  26564,
  26565,
  26566,
  26567,
  26568,
  26569,
  26570,
  26571,
  26572,
  26573,
  26574,
  26575,
  26576,
  26577,
  26578,
  26579,
  26580,
  26581,
  26582,
  26583,
  26584,
  26585,
  26586,
  26587,
  26588,
  26589,
  26590,
  26591,
  26592,
  26593,
  26594,
  26595,
  26596,
  26597,
  26598,
  26599,
  26600,
  26601,
  26602,
  26603,
  26604,
  26605,
  26606,
  26607,
  26608,
  26609,
  26610,
  26611,
  26612,
  26613,
  26614,
  26615,
  26616,
  26617,
  26618,
  26619,
  26620,
  26621,
  26622,
  26623,
  26624,
  26625,
  26626,
  26627,
  26628,
  26629,
  26630,
  26631,
  26632,
  26633,
  26634,
  26635,
  26636,
  26637,
  26638,
  26639,
  26640,
  26641,
  26642,
  26643,
  26644,
  26645,
  26646,
  26647,
  26648,
  26649,
  26650,
  26651,
  26652,
  26653,
  26654,
  26655,
  26656,
  26657,
  26658,
  26659,
  26660,
  26661,
  26662,
  26663,
  26664,
  26665,
  26666,
  26667,
  26668,
  26669,
  26670,
  26671,
  26672,
  26673,
  26674,
  26675,
  26676,
  26677,
  26678,
  26679,
  26680,
  26681,
  26682,
  26683,
  26684,
  26685,
  26686,
  26687,
  26688,
  26689,
  26690,
  26691,
  26692,
  26693,
  26694,
  26695,
  26696,
  26697,
  26698,
  26699,
  26700,
  26701,
  26702,
  26703,
  26704,
  26705,
  26706,
  26707,
  26708,
  26709,
  26710,
  26711,
  26712,
  26713,
  26714,
  26715,
  26716,
  26717,
  26718,
  26719,
  26720,
  26721,
  26722,
  26723,
  26724,
  26725,
  26726,
  26727,
  26728,
  26729,
  26730,
  26731,
  26732,
  26733,
  26734,
  26735,
  26736,
  26737,
  26738,
  26739,
  26740,
  26741,
  26742,
  26743,
  26744,
  26745,
  26746,
  26747,
  26748,
  26749,
  26750,
  26751,
  26752,
  26753,
  26754,
  26755,
  26756,
  26757,
  26758,
  26759,
  26760,
  26761,
  26762,
  26763,
  26764,
  26765,
  26766,
  26767,
  26768,
  26769,
  26770,
  26771,
  26772,
  26773,
  26774,
  26775,
  26776,
  26777,
  26778,
  26779,
  26780,
  26781,
  26782,
  26783,
  26784,
  26785,
  26786,
  26787,
  26788,
  26789,
  26790,
  26791,
  26792,
  26793,
  26794,
  26795,
  26796,
  26797,
  26798,
  26799,
  26800,
  26801,
  26802,
  26803,
  26804,
  26805,
  26806,
  26807,
  26808,
  26809,
  26810,
  26811,
  26812,
  26813,
  26814,
  26815,
  26816,
  26817,
  26818,
  26819,
  26820,
  26821,
  26822,
  26823,
  26824,
  26825,
  26826,
  26827,
  26828,
  26829,
  26830,
  26831,
  26832,
  26833,
  26834,
  26835,
  26836,
  26837,
  26838,
  26839,
  26840,
  26841,
  26842,
  26843,
  26844,
  26845,
  26846,
  26847,
  26848,
  26849,
  26850,
  26851,
  26852,
  26853,
  26854,
  26855,
  26856,
  26857,
  26858,
  26859,
  26860,
  26861,
  26862,
  26863,
  26864,
  26865,
  26866,
  26867,
  26868,
  26869,
  26870,
  26871,
  26872,
  26873,
  26874,
  26875,
  26876,
  26877,
  26878,
  26879,
  26880,
  26881,
  26882,
  26883,
  26884,
  26885,
  26886,
  26887,
  26888,
  26889,
  26890,
  26891,
  26892,
  26893,
  26894,
  26895,
  26896,
  26897,
  26898,
  26899,
  26900,
  26901,
  26902,
  26903,
  26904,
  26905,
  26906,
  26907,
  26908,
  26909,
  26910,
  26911,
  26912,
  26913,
  26914,
  26915,
  26916,
  26917,
  26918,
  26919,
  26920,
  26921,
  26922,
  26923,
  26924,
  26925,
  26926,
  26927,
  26928,
  26929,
  26930,
  26931,
  26932,
  26933,
  26934,
  26935,
  26936,
  26937,
  26938,
  26939,
  26940,
  26941,
  26942,
  26943,
  26944,
  26945,
  26946,
  26947,
  26948,
  26949,
  26950,
  26951,
  26952,
  26953,
  26954,
  26955,
  26956,
  26957,
  26958,
  26959,
  26960,
  26961,
  26962,
  26963,
  26964,
  26965,
  26966,
  26967,
  26968,
  26969,
  26970,
  26971,
  26972,
  26973,
  26974,
  26975,
  26976,
  26977,
  26978,
  26979,
  26980,
  26981,
  26982,
  26983,
  26984,
  26985,
  26986,
  26987,
  26988,
  26989,
  26990,
  26991,
  26992,
  26993,
  26994,
  26995,
  26996,
  26997,
  26998,
  26999,
  27000,
  27001,
  27002,
  27003,
  27004,
  27005,
  27006,
  27007,
  27008,
  27009,
  27010,
  27011,
  27012,
  27013,
  27014,
  27015,
  27016,
  27017,
  27018,
  27019,
  27020,
  27021,
  27022,
  27023,
  27024,
  27025,
  27026,
  27027,
  27028,
  27029,
  27030,
  27031,
  27032,
  27033,
  27034,
  27035,
  27036,
  27037,
  27038,
  27039,
  27040,
  27041,
  27042,
  27043,
  27044,
  27045,
  27046,
  27047,
  27048,
  27049,
  27050,
  27051,
  27052,
  27053,
  27054,
  27055,
  27056,
  27057,
  27058,
  27059,
  27060,
  27061,
  27062,
  27063,
  27064,
  27065,
  27066,
  27067,
  27068,
  27069,
  27070,
  27071,
  27072,
  27073,
  27074,
  27075,
  27076,
  27077,
  27078,
  27079,
  27080,
  27081,
  27082,
  27083,
  27084,
  27085,
  27086,
  27087,
  27088,
  27089,
  27090,
  27091,
  27092,
  27093,
  27094,
  27095,
  27096,
  27097,
  27098,
  27099,
  27100,
  27101,
  27102,
  27103,
  27104,
  27105,
  27106,
  27107,
  27108,
  27109,
  27110,
  27111,
  27112,
  27113,
  27114,
  27115,
  27116,
  27117,
  27118,
  27119,
  27120,
  27121,
  27122,
  27123,
  27124,
  27125,
  27126,
  27127,
  27128,
  27129,
  27130,
  27131,
  27132,
  27133,
  27134,
  27135,
  27136,
  27137,
  27138,
  27139,
  27140,
  27141,
  27142,
  27143,
  27144,
  27145,
  27146,
  27147,
  27148,
  27149,
  27150,
  27151,
  27152,
  27153,
  27154,
  27155,
  27156,
  27157,
  27158,
  27159,
  27160,
  27161,
  27162,
  27163,
  27164,
  27165,
  27166,
  27167,
  27168,
  27169,
  27170,
  27171,
  27172,
  27173,
  27174,
  27175,
  27176,
  27177,
  27178,
  27179,
  27180,
  27181,
  27182,
  27183,
  27184,
  27185,
  27186,
  27187,
  27188,
  27189,
  27190,
  27191,
  27192,
  27193,
  27194,
  27195,
  27196,
  27197,
  27198,
  27199,
  27200,
  27201,
  27202,
  27203,
  27204,
  27205,
  27206,
  27207,
  27208,
  27209,
  27210,
  27211,
  27212,
  27213,
  27214,
  27215,
  27216,
  27217,
  27218,
  27219,
  27220,
  27221,
  27222,
  27223,
  27224,
  27225,
  27226,
  27227,
  27228,
  27229,
  27230,
  27231,
  27232,
  27233,
  27234,
  27235,
  27236,
  27237,
  27238,
  27239,
  27240,
  27241,
  27242,
  27243,
  27244,
  27245,
  27246,
  27247,
  27248,
  27249,
  27250,
  27251,
  27252,
  27253,
  27254,
  27255,
  27256,
  27257,
  27258,
  27259,
  27260,
  27261,
  27262,
  27263,
  27264,
  27265,
  27266,
  27267,
  27268,
  27269,
  27270,
  27271,
  27272,
  27273,
  27274,
  27275,
  27276,
  27277,
  27278,
  27279,
  27280,
  27281,
  27282,
  27283,
  27284,
  27285,
  27286,
  27287,
  27288,
  27289,
  27290,
  27291,
  27292,
  27293,
  27294,
  27295,
  27296,
  27297,
  27298,
  27299,
  27300,
  27301,
  27302,
  27303,
  27304,
  27305,
  27306,
  27307,
  27308,
  27309,
  27310,
  27311,
  27312,
  27313,
  27314,
  27315,
  27316,
  27317,
  27318,
  27319,
  27320,
  27321,
  27322,
  27323,
  27324,
  27325,
  27326,
  27327,
  27328,
  27329,
  27330,
  27331,
  27332,
  27333,
  27334,
  27335,
  27336,
  27337,
  27338,
  27339,
  27340,
  27341,
  27342,
  27343,
  27344,
  27345,
  27346,
  27347,
  27348,
  27349,
  27350,
  27351,
  27352,
  27353,
  27354,
  27355,
  27356,
  27357,
  27358,
  27359,
  27360,
  27361,
  27362,
  27363,
  27364,
  27365,
  27366,
  27367,
  27368,
  27369,
  27370,
  27371,
  27372,
  27373,
  27374,
  27375,
  27376,
  27377,
  27378,
  27379,
  27380,
  27381,
  27382,
  27383,
  27384,
  27385,
  27386,
  27387,
  27388,
  27389,
  27390,
  27391,
  27392,
  27393,
  27394,
  27395,
  27396,
  27397,
  27398,
  27399,
  27400,
  27401,
  27402,
  27403,
  27404,
  27405,
  27406,
  27407,
  27408,
  27409,
  27410,
  27411,
  27412,
  27413,
  27414,
  27415,
  27416,
  27417,
  27418,
  27419,
  27420,
  27421,
  27422,
  27423,
  27424,
  27425,
  27426,
  27427,
  27428,
  27429,
  27430,
  27431,
  27432,
  27433,
  27434,
  27435,
  27436,
  27437,
  27438,
  27439,
  27440,
  27441,
  27442,
  27443,
  27444,
  27445,
  27446,
  27447,
  27448,
  27449,
  27450,
  27451,
  27452,
  27453,
  27454,
  27455,
  27456,
  27457,
  27458,
  27459,
  27460,
  27461,
  27462,
  27463,
  27464,
  27465,
  27466,
  27467,
  27468,
  27469,
  27470,
  27471,
  27472,
  27473,
  27474,
  27475,
  27476,
  27477,
  27478,
  27479,
  27480,
  27481,
  27482,
  27483,
  27484,
  27485,
  27486,
  27487,
  27488,
  27489,
  27490,
  27491,
  27492,
  27493,
  27494,
  27495,
  27496,
  27497,
  27498,
  27499,
  27500,
  27501,
  27502,
  27503,
  27504,
  27505,
  27506,
  27507,
  27508,
  27509,
  27510,
  27511,
  27512,
  27513,
  27514,
  27515,
  27516,
  27517,
  27518,
  27519,
  27520,
  27521,
  27522,
  27523,
  27524,
  27525,
  27526,
  27527,
  27528,
  27529,
  27530,
  27531,
  27532,
  27533,
  27534,
  27535,
  27536,
  27537,
  27538,
  27539,
  27540,
  27541,
  27542,
  27543,
  27544,
  27545,
  27546,
  27547,
  27548,
  27549,
  27550,
  27551,
  27552,
  27553,
  27554,
  27555,
  27556,
  27557,
  27558,
  27559,
  27560,
  27561,
  27562,
  27563,
  27564,
  27565,
  27566,
  27567,
  27568,
  27569,
  27570,
  27571,
  27572,
  27573,
  27574,
  27575,
  27576,
  27577,
  27578,
  27579,
  27580,
  27581,
  27582,
  27583,
  27584,
  27585,
  27586,
  27587,
  27588,
  27589,
  27590,
  27591,
  27592,
  27593,
  27594,
  27595,
  27596,
  27597,
  27598,
  27599,
  27600,
  27601,
  27602,
  27603,
  27604,
  27605,
  27606,
  27607,
  27608,
  27609,
  27610,
  27611,
  27612,
  27613,
  27614,
  27615,
  27616,
  27617,
  27618,
  27619,
  27620,
  27621,
  27622,
  27623,
  27624,
  27625,
  27626,
  27627,
  27628,
  27629,
  27630,
  27631,
  27632,
  27633,
  27634,
  27635,
  27636,
  27637,
  27638,
  27639,
  27640,
  27641,
  27642,
  27643,
  27644,
  27645,
  27646,
  27647,
  27648,
  27649,
  27650,
  27651,
  27652,
  27653,
  27654,
  27655,
  27656,
  27657,
  27658,
  27659,
  27660,
  27661,
  27662,
  27663,
  27664,
  27665,
  27666,
  27667,
  27668,
  27669,
  27670,
  27671,
  27672,
  27673,
  27674,
  27675,
  27676,
  27677,
  27678,
  27679,
  27680,
  27681,
  27682,
  27683,
  27684,
  27685,
  27686,
  27687,
  27688,
  27689,
  27690,
  27691,
  27692,
  27693,
  27694,
  27695,
  27696,
  27697,
  27698,
  27699,
  27700,
  27701,
  27702,
  27703,
  27704,
  27705,
  27706,
  27707,
  27708,
  27709,
  27710,
  27711,
  27712,
  27713,
  27714,
  27715,
  27716,
  27717,
  27718,
  27719,
  27720,
  27721,
  27722,
  27723,
  27724,
  27725,
  27726,
  27727,
  27728,
  27729,
  27730,
  27731,
  27732,
  27733,
  27734,
  27735,
  27736,
  27737,
  27738,
  27739,
  27740,
  27741,
  27742,
  27743,
  27744,
  27745,
  27746,
  27747,
  27748,
  27749,
  27750,
  27751,
  27752,
  27753,
  27754,
  27755,
  27756,
  27757,
  27758,
  27759,
  27760,
  27761,
  27762,
  27763,
  27764,
  27765,
  27766,
  27767,
  27768,
  27769,
  27770,
  27771,
  27772,
  27773,
  27774,
  27775,
  27776,
  27777,
  27778,
  27779,
  27780,
  27781,
  27782,
  27783,
  27784,
  27785,
  27786,
  27787,
  27788,
  27789,
  27790,
  27791,
  27792,
  27793,
  27794,
  27795,
  27796,
  27797,
  27798,
  27799,
  27800,
  27801,
  27802,
  27803,
  27804,
  27805,
  27806,
  27807,
  27808,
  27809,
  27810,
  27811,
  27812,
  27813,
  27814,
  27815,
  27816,
  27817,
  27818,
  27819,
  27820,
  27821,
  27822,
  27823,
  27824,
  27825,
  27826,
  27827,
  27828,
  27829,
  27830,
  27831,
  27832,
  27833,
  27834,
  27835,
  27836,
  27837,
  27838,
  27839,
  27840,
  27841,
  27842,
  27843,
  27844,
  27845,
  27846,
  27847,
  27848,
  27849,
  27850,
  27851,
  27852,
  27853,
  27854,
  27855,
  27856,
  27857,
  27858,
  27859,
  27860,
  27861,
  27862,
  27863,
  27864,
  27865,
  27866,
  27867,
  27868,
  27869,
  27870,
  27871,
  27872,
  27873,
  27874,
  27875,
  27876,
  27877,
  27878,
  27879,
  27880,
  27881,
  27882,
  27883,
  27884,
  27885,
  27886,
  27887,
  27888,
  27889,
  27890,
  27891,
  27892,
  27893,
  27894,
  27895,
  27896,
  27897,
  27898,
  27899,
  27900,
  27901,
  27902,
  27903,
  27904,
  27905,
  27906,
  27907,
  27908,
  27909,
  27910,
  27911,
  27912,
  27913,
  27914,
  27915,
  27916,
  27917,
  27918,
  27919,
  27920,
  27921,
  27922,
  27923,
  27924,
  27925,
  27926,
  27927,
  27928,
  27929,
  27930,
  27931,
  27932,
  27933,
  27934,
  27935,
  27936,
  27937,
  27938,
  27939,
  27940,
  27941,
  27942,
  27943,
  27944,
  27945,
  27946,
  27947,
  27948,
  27949,
  27950,
  27951,
  27952,
  27953,
  27954,
  27955,
  27956,
  27957,
  27958,
  27959,
  27960,
  27961,
  27962,
  27963,
  27964,
  27965,
  27966,
  27967,
  27968,
  27969,
  27970,
  27971,
  27972,
  27973,
  27974,
  27975,
  27976,
  27977,
  27978,
  27979,
  27980,
  27981,
  27982,
  27983,
  27984,
  27985,
  27986,
  27987,
  27988,
  27989,
  27990,
  27991,
  27992,
  27993,
  27994,
  27995,
  27996,
  27997,
  27998,
  27999,
  28000,
  28001,
  28002,
  28003,
  28004,
  28005,
  28006,
  28007,
  28008,
  28009,
  28010,
  28011,
  28012,
  28013,
  28014,
  28015,
  28016,
  28017,
  28018,
  28019,
  28020,
  28021,
  28022,
  28023,
  28024,
  28025,
  28026,
  28027,
  28028,
  28029,
  28030,
  28031,
  28032,
  28033,
  28034,
  28035,
  28036,
  28037,
  28038,
  28039,
  28040,
  28041,
  28042,
  28043,
  28044,
  28045,
  28046,
  28047,
  28048,
  28049,
  28050,
  28051,
  28052,
  28053,
  28054,
  28055,
  28056,
  28057,
  28058,
  28059,
  28060,
  28061,
  28062,
  28063,
  28064,
  28065,
  28066,
  28067,
  28068,
  28069,
  28070,
  28071,
  28072,
  28073,
  28074,
  28075,
  28076,
  28077,
  28078,
  28079,
  28080,
  28081,
  28082,
  28083,
  28084,
  28085,
  28086,
  28087,
  28088,
  28089,
  28090,
  28091,
  28092,
  28093,
  28094,
  28095,
  28096,
  28097,
  28098,
  28099,
  28100,
  28101,
  28102,
  28103,
  28104,
  28105,
  28106,
  28107,
  28108,
  28109,
  28110,
  28111,
  28112,
  28113,
  28114,
  28115,
  28116,
  28117,
  28118,
  28119,
  28120,
  28121,
  28122,
  28123,
  28124,
  28125,
  28126,
  28127,
  28128,
  28129,
  28130,
  28131,
  28132,
  28133,
  28134,
  28135,
  28136,
  28137,
  28138,
  28139,
  28140,
  28141,
  28142,
  28143,
  28144,
  28145,
  28146,
  28147,
  28148,
  28149,
  28150,
  28151,
  28152,
  28153,
  28154,
  28155,
  28156,
  28157,
  28158,
  28159,
  28160,
  28161,
  28162,
  28163,
  28164,
  28165,
  28166,
  28167,
  28168,
  28169,
  28170,
  28171,
  28172,
  28173,
  28174,
  28175,
  28176,
  28177,
  28178,
  28179,
  28180,
  28181,
  28182,
  28183,
  28184,
  28185,
  28186,
  28187,
  28188,
  28189,
  28190,
  28191,
  28192,
  28193,
  28194,
  28195,
  28196,
  28197,
  28198,
  28199,
  28200,
  28201,
  28202,
  28203,
  28204,
  28205,
  28206,
  28207,
  28208,
  28209,
  28210,
  28211,
  28212,
  28213,
  28214,
  28215,
  28216,
  28217,
  28218,
  28219,
  28220,
  28221,
  28222,
  28223,
  28224,
  28225,
  28226,
  28227,
  28228,
  28229,
  28230,
  28231,
  28232,
  28233,
  28234,
  28235,
  28236,
  28237,
  28238,
  28239,
  28240,
  28241,
  28242,
  28243,
  28244,
  28245,
  28246,
  28247,
  28248,
  28249,
  28250,
  28251,
  28252,
  28253,
  28254,
  28255,
  28256,
  28257,
  28258,
  28259,
  28260,
  28261,
  28262,
  28263,
  28264,
  28265,
  28266,
  28267,
  28268,
  28269,
  28270,
  28271,
  28272,
  28273,
  28274,
  28275,
  28276,
  28277,
  28278,
  28279,
  28280,
  28281,
  28282,
  28283,
  28284,
  28285,
  28286,
  28287,
  28288,
  28289,
  28290,
  28291,
  28292,
  28293,
  28294,
  28295,
  28296,
  28297,
  28298,
  28299,
  28300,
  28301,
  28302,
  28303,
  28304,
  28305,
  28306,
  28307,
  28308,
  28309,
  28310,
  28311,
  28312,
  28313,
  28314,
  28315,
  28316,
  28317,
  28318,
  28319,
  28320,
  28321,
  28322,
  28323,
  28324,
  28325,
  28326,
  28327,
  28328,
  28329,
  28330,
  28331,
  28332,
  28333,
  28334,
  28335,
  28336,
  28337,
  28338,
  28339,
  28340,
  28341,
  28342,
  28343,
  28344,
  28345,
  28346,
  28347,
  28348,
  28349,
  28350,
  28351,
  28352,
  28353,
  28354,
  28355,
  28356,
  28357,
  28358,
  28359,
  28360,
  28361,
  28362,
  28363,
  28364,
  28365,
  28366,
  28367,
  28368,
  28369,
  28370,
  28371,
  28372,
  28373,
  28374,
  28375,
  28376,
  28377,
  28378,
  28379,
  28380,
  28381,
  28382,
  28383,
  28384,
  28385,
  28386,
  28387,
  28388,
  28389,
  28390,
  28391,
  28392,
  28393,
  28394,
  28395,
  28396,
  28397,
  28398,
  28399,
  28400,
  28401,
  28402,
  28403,
  28404,
  28405,
  28406,
  28407,
  28408,
  28409,
  28410,
  28411,
  28412,
  28413,
  28414,
  28415,
  28416,
  28417,
  28418,
  28419,
  28420,
  28421,
  28422,
  28423,
  28424,
  28425,
  28426,
  28427,
  28428,
  28429,
  28430,
  28431,
  28432,
  28433,
  28434,
  28435,
  28436,
  28437,
  28438,
  28439,
  28440,
  28441,
  28442,
  28443,
  28444,
  28445,
  28446,
  28447,
  28448,
  28449,
  28450,
  28451,
  28452,
  28453,
  28454,
  28455,
  28456,
  28457,
  28458,
  28459,
  28460,
  28461,
  28462,
  28463,
  28464,
  28465,
  28466,
  28467,
  28468,
  28469,
  28470,
  28471,
  28472,
  28473,
  28474,
  28475,
  28476,
  28477,
  28478,
  28479,
  28480,
  28481,
  28482,
  28483,
  28484,
  28485,
  28486,
  28487,
  28488,
  28489,
  28490,
  28491,
  28492,
  28493,
  28494,
  28495,
  28496,
  28497,
  28498,
  28499,
  28500,
  28501,
  28502,
  28503,
  28504,
  28505,
  28506,
  28507,
  28508,
  28509,
  28510,
  28511,
  28512,
  28513,
  28514,
  28515,
  28516,
  28517,
  28518,
  28519,
  28520,
  28521,
  28522,
  28523,
  28524,
  28525,
  28526,
  28527,
  28528,
  28529,
  28530,
  28531,
  28532,
  28533,
  28534,
  28535,
  28536,
  28537,
  28538,
  28539,
  28540,
  28541,
  28542,
  28543,
  28544,
  28545,
  28546,
  28547,
  28548,
  28549,
  28550,
  28551,
  28552,
  28553,
  28554,
  28555,
  28556,
  28557,
  28558,
  28559,
  28560,
  28561,
  28562,
  28563,
  28564,
  28565,
  28566,
  28567,
  28568,
  28569,
  28570,
  28571,
  28572,
  28573,
  28574,
  28575,
  28576,
  28577,
  28578,
  28579,
  28580,
  28581,
  28582,
  28583,
  28584,
  28585,
  28586,
  28587,
  28588,
  28589,
  28590,
  28591,
  28592,
  28593,
  28594,
  28595,
  28596,
  28597,
  28598,
  28599,
  28600,
  28601,
  28602,
  28603,
  28604,
  28605,
  28606,
  28607,
  28608,
  28609,
  28610,
  28611,
  28612,
  28613,
  28614,
  28615,
  28616,
  28617,
  28618,
  28619,
  28620,
  28621,
  28622,
  28623,
  28624,
  28625,
  28626,
  28627,
  28628,
  28629,
  28630,
  28631,
  28632,
  28633,
  28634,
  28635,
  28636,
  28637,
  28638,
  28639,
  28640,
  28641,
  28642,
  28643,
  28644,
  28645,
  28646,
  28647,
  28648,
  28649,
  28650,
  28651,
  28652,
  28653,
  28654,
  28655,
  28656,
  28657,
  28658,
  28659,
  28660,
  28661,
  28662,
  28663,
  28664,
  28665,
  28666,
  28667,
  28668,
  28669,
  28670,
  28671,
  28672,
  28673,
  28674,
  28675,
  28676,
  28677,
  28678,
  28679,
  28680,
  28681,
  28682,
  28683,
  28684,
  28685,
  28686,
  28687,
  28688,
  28689,
  28690,
  28691,
  28692,
  28693,
  28694,
  28695,
  28696,
  28697,
  28698,
  28699,
  28700,
  28701,
  28702,
  28703,
  28704,
  28705,
  28706,
  28707,
  28708,
  28709,
  28710,
  28711,
  28712,
  28713,
  28714,
  28715,
  28716,
  28717,
  28718,
  28719,
  28720,
  28721,
  28722,
  28723,
  28724,
  28725,
  28726,
  28727,
  28728,
  28729,
  28730,
  28731,
  28732,
  28733,
  28734,
  28735,
  28736,
  28737,
  28738,
  28739,
  28740,
  28741,
  28742,
  28743,
  28744,
  28745,
  28746,
  28747,
  28748,
  28749,
  28750,
  28751,
  28752,
  28753,
  28754,
  28755,
  28756,
  28757,
  28758,
  28759,
  28760,
  28761,
  28762,
  28763,
  28764,
  28765,
  28766,
  28767,
  28768,
  28769,
  28770,
  28771,
  28772,
  28773,
  28774,
  28775,
  28776,
  28777,
  28778,
  28779,
  28780,
  28781,
  28782,
  28783,
  28784,
  28785,
  28786,
  28787,
  28788,
  28789,
  28790,
  28791,
  28792,
  28793,
  28794,
  28795,
  28796,
  28797,
  28798,
  28799,
  28800,
  28801,
  28802,
  28803,
  28804,
  28805,
  28806,
  28807,
  28808,
  28809,
  28810,
  28811,
  28812,
  28813,
  28814,
  28815,
  28816,
  28817,
  28818,
  28819,
  28820,
  28821,
  28822,
  28823,
  28824,
  28825,
  28826,
  28827,
  28828,
  28829,
  28830,
  28831,
  28832,
  28833,
  28834,
  28835,
  28836,
  28837,
  28838,
  28839,
  28840,
  28841,
  28842,
  28843,
  28844,
  28845,
  28846,
  28847,
  28848,
  28849,
  28850,
  28851,
  28852,
  28853,
  28854,
  28855,
  28856,
  28857,
  28858,
  28859,
  28860,
  28861,
  28862,
  28863,
  28864,
  28865,
  28866,
  28867,
  28868,
  28869,
  28870,
  28871,
  28872,
  28873,
  28874,
  28875,
  28876,
  28877,
  28878,
  28879,
  28880,
  28881,
  28882,
  28883,
  28884,
  28885,
  28886,
  28887,
  28888,
  28889,
  28890,
  28891,
  28892,
  28893,
  28894,
  28895,
  28896,
  28897,
  28898,
  28899,
  28900,
  28901,
  28902,
  28903,
  28904,
  28905,
  28906,
  28907,
  28908,
  28909,
  28910,
  28911,
  28912,
  28913,
  28914,
  28915,
  28916,
  28917,
  28918,
  28919,
  28920,
  28921,
  28922,
  28923,
  28924,
  28925,
  28926,
  28927,
  28928,
  28929,
  28930,
  28931,
  28932,
  28933,
  28934,
  28935,
  28936,
  28937,
  28938,
  28939,
  28940,
  28941,
  28942,
  28943,
  28944,
  28945,
  28946,
  28947,
  28948,
  28949,
  28950,
  28951,
  28952,
  28953,
  28954,
  28955,
  28956,
  28957,
  28958,
  28959,
  28960,
  28961,
  28962,
  28963,
  28964,
  28965,
  28966,
  28967,
  28968,
  28969,
  28970,
  28971,
  28972,
  28973,
  28974,
  28975,
  28976,
  28977,
  28978,
  28979,
  28980,
  28981,
  28982,
  28983,
  28984,
  28985,
  28986,
  28987,
  28988,
  28989,
  28990,
  28991,
  28992,
  28993,
  28994,
  28995,
  28996,
  28997,
  28998,
  28999,
  29000,
  29001,
  29002,
  29003,
  29004,
  29005,
  29006,
  29007,
  29008,
  29009,
  29010,
  29011,
  29012,
  29013,
  29014,
  29015,
  29016,
  29017,
  29018,
  29019,
  29020,
  29021,
  29022,
  29023,
  29024,
  29025,
  29026,
  29027,
  29028,
  29029,
  29030,
  29031,
  29032,
  29033,
  29034,
  29035,
  29036,
  29037,
  29038,
  29039,
  29040,
  29041,
  29042,
  29043,
  29044,
  29045,
  29046,
  29047,
  29048,
  29049,
  29050,
  29051,
  29052,
  29053,
  29054,
  29055,
  29056,
  29057,
  29058,
  29059,
  29060,
  29061,
  29062,
  29063,
  29064,
  29065,
  29066,
  29067,
  29068,
  29069,
  29070,
  29071,
  29072,
  29073,
  29074,
  29075,
  29076,
  29077,
  29078,
  29079,
  29080,
  29081,
  29082,
  29083,
  29084,
  29085,
  29086,
  29087,
  29088,
  29089,
  29090,
  29091,
  29092,
  29093,
  29094,
  29095,
  29096,
  29097,
  29098,
  29099,
  29100,
  29101,
  29102,
  29103,
  29104,
  29105,
  29106,
  29107,
  29108,
  29109,
  29110,
  29111,
  29112,
  29113,
  29114,
  29115,
  29116,
  29117,
  29118,
  29119,
  29120,
  29121,
  29122,
  29123,
  29124,
  29125,
  29126,
  29127,
  29128,
  29129,
  29130,
  29131,
  29132,
  29133,
  29134,
  29135,
  29136,
  29137,
  29138,
  29139,
  29140,
  29141,
  29142,
  29143,
  29144,
  29145,
  29146,
  29147,
  29148,
  29149,
  29150,
  29151,
  29152,
  29153,
  29154,
  29155,
  29156,
  29157,
  29158,
  29159,
  29160,
  29161,
  29162,
  29163,
  29164,
  29165,
  29166,
  29167,
  29168,
  29169,
  29170,
  29171,
  29172,
  29173,
  29174,
  29175,
  29176,
  29177,
  29178,
  29179,
  29180,
  29181,
  29182,
  29183,
  29184,
  29185,
  29186,
  29187,
  29188,
  29189,
  29190,
  29191,
  29192,
  29193,
  29194,
  29195,
  29196,
  29197,
  29198,
  29199,
  29200,
  29201,
  29202,
  29203,
  29204,
  29205,
  29206,
  29207,
  29208,
  29209,
  29210,
  29211,
  29212,
  29213,
  29214,
  29215,
  29216,
  29217,
  29218,
  29219,
  29220,
  29221,
  29222,
  29223,
  29224,
  29225,
  29226,
  29227,
  29228,
  29229,
  29230,
  29231,
  29232,
  29233,
  29234,
  29235,
  29236,
  29237,
  29238,
  29239,
  29240,
  29241,
  29242,
  29243,
  29244,
  29245,
  29246,
  29247,
  29248,
  29249,
  29250,
  29251,
  29252,
  29253,
  29254,
  29255,
  29256,
  29257,
  29258,
  29259,
  29260,
  29261,
  29262,
  29263,
  29264,
  29265,
  29266,
  29267,
  29268,
  29269,
  29270,
  29271,
  29272,
  29273,
  29274,
  29275,
  29276,
  29277,
  29278,
  29279,
  29280,
  29281,
  29282,
  29283,
  29284,
  29285,
  29286,
  29287,
  29288,
  29289,
  29290,
  29291,
  29292,
  29293,
  29294,
  29295,
  29296,
  29297,
  29298,
  29299,
  29300,
  29301,
  29302,
  29303,
  29304,
  29305,
  29306,
  29307,
  29308,
  29309,
  29310,
  29311,
  29312,
  29313,
  29314,
  29315,
  29316,
  29317,
  29318,
  29319,
  29320,
  29321,
  29322,
  29323,
  29324,
  29325,
  29326,
  29327,
  29328,
  29329,
  29330,
  29331,
  29332,
  29333,
  29334,
  29335,
  29336,
  29337,
  29338,
  29339,
  29340,
  29341,
  29342,
  29343,
  29344,
  29345,
  29346,
  29347,
  29348,
  29349,
  29350,
  29351,
  29352,
  29353,
  29354,
  29355,
  29356,
  29357,
  29358,
  29359,
  29360,
  29361,
  29362,
  29363,
  29364,
  29365,
  29366,
  29367,
  29368,
  29369,
  29370,
  29371,
  29372,
  29373,
  29374,
  29375,
  29376,
  29377,
  29378,
  29379,
  29380,
  29381,
  29382,
  29383,
  29384,
  29385,
  29386,
  29387,
  29388,
  29389,
  29390,
  29391,
  29392,
  29393,
  29394,
  29395,
  29396,
  29397,
  29398,
  29399,
  29400,
  29401,
  29402,
  29403,
  29404,
  29405,
  29406,
  29407,
  29408,
  29409,
  29410,
  29411,
  29412,
  29413,
  29414,
  29415,
  29416,
  29417,
  29418,
  29419,
  29420,
  29421,
  29422,
  29423,
  29424,
  29425,
  29426,
  29427,
  29428,
  29429,
  29430,
  29431,
  29432,
  29433,
  29434,
  29435,
  29436,
  29437,
  29438,
  29439,
  29440,
  29441,
  29442,
  29443,
  29444,
  29445,
  29446,
  29447,
  29448,
  29449,
  29450,
  29451,
  29452,
  29453,
  29454,
  29455,
  29456,
  29457,
  29458,
  29459,
  29460,
  29461,
  29462,
  29463,
  29464,
  29465,
  29466,
  29467,
  29468,
  29469,
  29470,
  29471,
  29472,
  29473,
  29474,
  29475,
  29476,
  29477,
  29478,
  29479,
  29480,
  29481,
  29482,
  29483,
  29484,
  29485,
  29486,
  29487,
  29488,
  29489,
  29490,
  29491,
  29492,
  29493,
  29494,
  29495,
  29496,
  29497,
  29498,
  29499,
  29500,
  29501,
  29502,
  29503,
  29504,
  29505,
  29506,
  29507,
  29508,
  29509,
  29510,
  29511,
  29512,
  29513,
  29514,
  29515,
  29516,
  29517,
  29518,
  29519,
  29520,
  29521,
  29522,
  29523,
  29524,
  29525,
  29526,
  29527,
  29528,
  29529,
  29530,
  29531,
  29532,
  29533,
  29534,
  29535,
  29536,
  29537,
  29538,
  29539,
  29540,
  29541,
  29542,
  29543,
  29544,
  29545,
  29546,
  29547,
  29548,
  29549,
  29550,
  29551,
  29552,
  29553,
  29554,
  29555,
  29556,
  29557,
  29558,
  29559,
  29560,
  29561,
  29562,
  29563,
  29564,
  29565,
  29566,
  29567,
  29568,
  29569,
  29570,
  29571,
  29572,
  29573,
  29574,
  29575,
  29576,
  29577,
  29578,
  29579,
  29580,
  29581,
  29582,
  29583,
  29584,
  29585,
  29586,
  29587,
  29588,
  29589,
  29590,
  29591,
  29592,
  29593,
  29594,
  29595,
  29596,
  29597,
  29598,
  29599,
  29600,
  29601,
  29602,
  29603,
  29604,
  29605,
  29606,
  29607,
  29608,
  29609,
  29610,
  29611,
  29612,
  29613,
  29614,
  29615,
  29616,
  29617,
  29618,
  29619,
  29620,
  29621,
  29622,
  29623,
  29624,
  29625,
  29626,
  29627,
  29628,
  29629,
  29630,
  29631,
  29632,
  29633,
  29634,
  29635,
  29636,
  29637,
  29638,
  29639,
  29640,
  29641,
  29642,
  29643,
  29644,
  29645,
  29646,
  29647,
  29648,
  29649,
  29650,
  29651,
  29652,
  29653,
  29654,
  29655,
  29656,
  29657,
  29658,
  29659,
  29660,
  29661,
  29662,
  29663,
  29664,
  29665,
  29666,
  29667,
  29668,
  29669,
  29670,
  29671,
  29672,
  29673,
  29674,
  29675,
  29676,
  29677,
  29678,
  29679,
  29680,
  29681,
  29682,
  29683,
  29684,
  29685,
  29686,
  29687,
  29688,
  29689,
  29690,
  29691,
  29692,
  29693,
  29694,
  29695,
  29696,
  29697,
  29698,
  29699,
  29700,
  29701,
  29702,
  29703,
  29704,
  29705,
  29706,
  29707,
  29708,
  29709,
  29710,
  29711,
  29712,
  29713,
  29714,
  29715,
  29716,
  29717,
  29718,
  29719,
  29720,
  29721,
  29722,
  29723,
  29724,
  29725,
  29726,
  29727,
  29728,
  29729,
  29730,
  29731,
  29732,
  29733,
  29734,
  29735,
  29736,
  29737,
  29738,
  29739,
  29740,
  29741,
  29742,
  29743,
  29744,
  29745,
  29746,
  29747,
  29748,
  29749,
  29750,
  29751,
  29752,
  29753,
  29754,
  29755,
  29756,
  29757,
  29758,
  29759,
  29760,
  29761,
  29762,
  29763,
  29764,
  29765,
  29766,
  29767,
  29768,
  29769,
  29770,
  29771,
  29772,
  29773,
  29774,
  29775,
  29776,
  29777,
  29778,
  29779,
  29780,
  29781,
  29782,
  29783,
  29784,
  29785,
  29786,
  29787,
  29788,
  29789,
  29790,
  29791,
  29792,
  29793,
  29794,
  29795,
  29796,
  29797,
  29798,
  29799,
  29800,
  29801,
  29802,
  29803,
  29804,
  29805,
  29806,
  29807,
  29808,
  29809,
  29810,
  29811,
  29812,
  29813,
  29814,
  29815,
  29816,
  29817,
  29818,
  29819,
  29820,
  29821,
  29822,
  29823,
  29824,
  29825,
  29826,
  29827,
  29828,
  29829,
  29830,
  29831,
  29832,
  29833,
  29834,
  29835,
  29836,
  29837,
  29838,
  29839,
  29840,
  29841,
  29842,
  29843,
  29844,
  29845,
  29846,
  29847,
  29848,
  29849,
  29850,
  29851,
  29852,
  29853,
  29854,
  29855,
  29856,
  29857,
  29858,
  29859,
  29860,
  29861,
  29862,
  29863,
  29864,
  29865,
  29866,
  29867,
  29868,
  29869,
  29870,
  29871,
  29872,
  29873,
  29874,
  29875,
  29876,
  29877,
  29878,
  29879,
  29880,
  29881,
  29882,
  29883,
  29884,
  29885,
  29886,
  29887,
  29888,
  29889,
  29890,
  29891,
  29892,
  29893,
  29894,
  29895,
  29896,
  29897,
  29898,
  29899,
  29900,
  29901,
  29902,
  29903,
  29904,
  29905,
  29906,
  29907,
  29908,
  29909,
  29910,
  29911,
  29912,
  29913,
  29914,
  29915,
  29916,
  29917,
  29918,
  29919,
  29920,
  29921,
  29922,
  29923,
  29924,
  29925,
  29926,
  29927,
  29928,
  29929,
  29930,
  29931,
  29932,
  29933,
  29934,
  29935,
  29936,
  29937,
  29938,
  29939,
  29940,
  29941,
  29942,
  29943,
  29944,
  29945,
  29946,
  29947,
  29948,
  29949,
  29950,
  29951,
  29952,
  29953,
  29954,
  29955,
  29956,
  29957,
  29958,
  29959,
  29960,
  29961,
  29962,
  29963,
  29964,
  29965,
  29966,
  29967,
  29968,
  29969,
  29970,
  29971,
  29972,
  29973,
  29974,
  29975,
  29976,
  29977,
  29978,
  29979,
  29980,
  29981,
  29982,
  29983,
  29984,
  29985,
  29986,
  29987,
  29988,
  29989,
  29990,
  29991,
  29992,
  29993,
  29994,
  29995,
  29996,
  29997,
  29998,
  29999,
  30000,
  30001,
  30002,
  30003,
  30004,
  30005,
  30006,
  30007,
  30008,
  30009,
  30010,
  30011,
  30012,
  30013,
  30014,
  30015,
  30016,
  30017,
  30018,
  30019,
  30020,
  30021,
  30022,
  30023,
  30024,
  30025,
  30026,
  30027,
  30028,
  30029,
  30030,
  30031,
  30032,
  30033,
  30034,
  30035,
  30036,
  30037,
  30038,
  30039,
  30040,
  30041,
  30042,
  30043,
  30044,
  30045,
  30046,
  30047,
  30048,
  30049,
  30050,
  30051,
  30052,
  30053,
  30054,
  30055,
  30056,
  30057,
  30058,
  30059,
  30060,
  30061,
  30062,
  30063,
  30064,
  30065,
  30066,
  30067,
  30068,
  30069,
  30070,
  30071,
  30072,
  30073,
  30074,
  30075,
  30076,
  30077,
  30078,
  30079,
  30080,
  30081,
  30082,
  30083,
  30084,
  30085,
  30086,
  30087,
  30088,
  30089,
  30090,
  30091,
  30092,
  30093,
  30094,
  30095,
  30096,
  30097,
  30098,
  30099,
  30100,
  30101,
  30102,
  30103,
  30104,
  30105,
  30106,
  30107,
  30108,
  30109,
  30110,
  30111,
  30112,
  30113,
  30114,
  30115,
  30116,
  30117,
  30118,
  30119,
  30120,
  30121,
  30122,
  30123,
  30124,
  30125,
  30126,
  30127,
  30128,
  30129,
  30130,
  30131,
  30132,
  30133,
  30134,
  30135,
  30136,
  30137,
  30138,
  30139,
  30140,
  30141,
  30142,
  30143,
  30144,
  30145,
  30146,
  30147,
  30148,
  30149,
  30150,
  30151,
  30152,
  30153,
  30154,
  30155,
  30156,
  30157,
  30158,
  30159,
  30160,
  30161,
  30162,
  30163,
  30164,
  30165,
  30166,
  30167,
  30168,
  30169,
  30170,
  30171,
  30172,
  30173,
  30174,
  30175,
  30176,
  30177,
  30178,
  30179,
  30180,
  30181,
  30182,
  30183,
  30184,
  30185,
  30186,
  30187,
  30188,
  30189,
  30190,
  30191,
  30192,
  30193,
  30194,
  30195,
  30196,
  30197,
  30198,
  30199,
  30200,
  30201,
  30202,
  30203,
  30204,
  30205,
  30206,
  30207,
  30208,
  30209,
  30210,
  30211,
  30212,
  30213,
  30214,
  30215,
  30216,
  30217,
  30218,
  30219,
  30220,
  30221,
  30222,
  30223,
  30224,
  30225,
  30226,
  30227,
  30228,
  30229,
  30230,
  30231,
  30232,
  30233,
  30234,
  30235,
  30236,
  30237,
  30238,
  30239,
  30240,
  30241,
  30242,
  30243,
  30244,
  30245,
  30246,
  30247,
  30248,
  30249,
  30250,
  30251,
  30252,
  30253,
  30254,
  30255,
  30256,
  30257,
  30258,
  30259,
  30260,
  30261,
  30262,
  30263,
  30264,
  30265,
  30266,
  30267,
  30268,
  30269,
  30270,
  30271,
  30272,
  30273,
  30274,
  30275,
  30276,
  30277,
  30278,
  30279,
  30280,
  30281,
  30282,
  30283,
  30284,
  30285,
  30286,
  30287,
  30288,
  30289,
  30290,
  30291,
  30292,
  30293,
  30294,
  30295,
  30296,
  30297,
  30298,
  30299,
  30300,
  30301,
  30302,
  30303,
  30304,
  30305,
  30306,
  30307,
  30308,
  30309,
  30310,
  30311,
  30312,
  30313,
  30314,
  30315,
  30316,
  30317,
  30318,
  30319,
  30320,
  30321,
  30322,
  30323,
  30324,
  30325,
  30326,
  30327,
  30328,
  30329,
  30330,
  30331,
  30332,
  30333,
  30334,
  30335,
  30336,
  30337,
  30338,
  30339,
  30340,
  30341,
  30342,
  30343,
  30344,
  30345,
  30346,
  30347,
  30348,
  30349,
  30350,
  30351,
  30352,
  30353,
  30354,
  30355,
  30356,
  30357,
  30358,
  30359,
  30360,
  30361,
  30362,
  30363,
  30364,
  30365,
  30366,
  30367,
  30368,
  30369,
  30370,
  30371,
  30372,
  30373,
  30374,
  30375,
  30376,
  30377,
  30378,
  30379,
  30380,
  30381,
  30382,
  30383,
  30384,
  30385,
  30386,
  30387,
  30388,
  30389,
  30390,
  30391,
  30392,
  30393,
  30394,
  30395,
  30396,
  30397,
  30398,
  30399,
  30400,
  30401,
  30402,
  30403,
  30404,
  30405,
  30406,
  30407,
  30408,
  30409,
  30410,
  30411,
  30412,
  30413,
  30414,
  30415,
  30416,
  30417,
  30418,
  30419,
  30420,
  30421,
  30422,
  30423,
  30424,
  30425,
  30426,
  30427,
  30428,
  30429,
  30430,
  30431,
  30432,
  30433,
  30434,
  30435,
  30436,
  30437,
  30438,
  30439,
  30440,
  30441,
  30442,
  30443,
  30444,
  30445,
  30446,
  30447,
  30448,
  30449,
  30450,
  30451,
  30452,
  30453,
  30454,
  30455,
  30456,
  30457,
  30458,
  30459,
  30460,
  30461,
  30462,
  30463,
  30464,
  30465,
  30466,
  30467,
  30468,
  30469,
  30470,
  30471,
  30472,
  30473,
  30474,
  30475,
  30476,
  30477,
  30478,
  30479,
  30480,
  30481,
  30482,
  30483,
  30484,
  30485,
  30486,
  30487,
  30488,
  30489,
  30490,
  30491,
  30492,
  30493,
  30494,
  30495,
  30496,
  30497,
  30498,
  30499,
  30500,
  30501,
  30502,
  30503,
  30504,
  30505,
  30506,
  30507,
  30508,
  30509,
  30510,
  30511,
  30512,
  30513,
  30514,
  30515,
  30516,
  30517,
  30518,
  30519,
  30520,
  30521,
  30522,
  30523,
  30524,
  30525,
  30526,
  30527,
  30528,
  30529,
  30530,
  30531,
  30532,
  30533,
  30534,
  30535,
  30536,
  30537,
  30538,
  30539,
  30540,
  30541,
  30542,
  30543,
  30544,
  30545,
  30546,
  30547,
  30548,
  30549,
  30550,
  30551,
  30552,
  30553,
  30554,
  30555,
  30556,
  30557,
  30558,
  30559,
  30560,
  30561,
  30562,
  30563,
  30564,
  30565,
  30566,
  30567,
  30568,
  30569,
  30570,
  30571,
  30572,
  30573,
  30574,
  30575,
  30576,
  30577,
  30578,
  30579,
  30580,
  30581,
  30582,
  30583,
  30584,
  30585,
  30586,
  30587,
  30588,
  30589,
  30590,
  30591,
  30592,
  30593,
  30594,
  30595,
  30596,
  30597,
  30598,
  30599,
  30600,
  30601,
  30602,
  30603,
  30604,
  30605,
  30606,
  30607,
  30608,
  30609,
  30610,
  30611,
  30612,
  30613,
  30614,
  30615,
  30616,
  30617,
  30618,
  30619,
  30620,
  30621,
  30622,
  30623,
  30624,
  30625,
  30626,
  30627,
  30628,
  30629,
  30630,
  30631,
  30632,
  30633,
  30634,
  30635,
  30636,
  30637,
  30638,
  30639,
  30640,
  30641,
  30642,
  30643,
  30644,
  30645,
  30646,
  30647,
  30648,
  30649,
  30650,
  30651,
  30652,
  30653,
  30654,
  30655,
  30656,
  30657,
  30658,
  30659,
  30660,
  30661,
  30662,
  30663,
  30664,
  30665,
  30666,
  30667,
  30668,
  30669,
  30670,
  30671,
  30672,
  30673,
  30674,
  30675,
  30676,
  30677,
  30678,
  30679,
  30680,
  30681,
  30682,
  30683,
  30684,
  30685,
  30686,
  30687,
  30688,
  30689,
  30690,
  30691,
  30692,
  30693,
  30694,
  30695,
  30696,
  30697,
  30698,
  30699,
  30700,
  30701,
  30702,
  30703,
  30704,
  30705,
  30706,
  30707,
  30708,
  30709,
  30710,
  30711,
  30712,
  30713,
  30714,
  30715,
  30716,
  30717,
  30718,
  30719,
  30720,
  30721,
  30722,
  30723,
  30724,
  30725,
  30726,
  30727,
  30728,
  30729,
  30730,
  30731,
  30732,
  30733,
  30734,
  30735,
  30736,
  30737,
  30738,
  30739,
  30740,
  30741,
  30742,
  30743,
  30744,
  30745,
  30746,
  30747,
  30748,
  30749,
  30750,
  30751,
  30752,
  30753,
  30754,
  30755,
  30756,
  30757,
  30758,
  30759,
  30760,
  30761,
  30762,
  30763,
  30764,
  30765,
  30766,
  30767,
  30768,
  30769,
  30770,
  30771,
  30772,
  30773,
  30774,
  30775,
  30776,
  30777,
  30778,
  30779,
  30780,
  30781,
  30782,
  30783,
  30784,
  30785,
  30786,
  30787,
  30788,
  30789,
  30790,
  30791,
  30792,
  30793,
  30794,
  30795,
  30796,
  30797,
  30798,
  30799,
  30800,
  30801,
  30802,
  30803,
  30804,
  30805,
  30806,
  30807,
  30808,
  30809,
  30810,
  30811,
  30812,
  30813,
  30814,
  30815,
  30816,
  30817,
  30818,
  30819,
  30820,
  30821,
  30822,
  30823,
  30824,
  30825,
  30826,
  30827,
  30828,
  30829,
  30830,
  30831,
  30832,
  30833,
  30834,
  30835,
  30836,
  30837,
  30838,
  30839,
  30840,
  30841,
  30842,
  30843,
  30844,
  30845,
  30846,
  30847,
  30848,
  30849,
  30850,
  30851,
  30852,
  30853,
  30854,
  30855,
  30856,
  30857,
  30858,
  30859,
  30860,
  30861,
  30862,
  30863,
  30864,
  30865,
  30866,
  30867,
  30868,
  30869,
  30870,
  30871,
  30872,
  30873,
  30874,
  30875,
  30876,
  30877,
  30878,
  30879,
  30880,
  30881,
  30882,
  30883,
  30884,
  30885,
  30886,
  30887,
  30888,
  30889,
  30890,
  30891,
  30892,
  30893,
  30894,
  30895,
  30896,
  30897,
  30898,
  30899,
  30900,
  30901,
  30902,
  30903,
  30904,
  30905,
  30906,
  30907,
  30908,
  30909,
  30910,
  30911,
  30912,
  30913,
  30914,
  30915,
  30916,
  30917,
  30918,
  30919,
  30920,
  30921,
  30922,
  30923,
  30924,
  30925,
  30926,
  30927,
  30928,
  30929,
  30930,
  30931,
  30932,
  30933,
  30934,
  30935,
  30936,
  30937,
  30938,
  30939,
  30940,
  30941,
  30942,
  30943,
  30944,
  30945,
  30946,
  30947,
  30948,
  30949,
  30950,
  30951,
  30952,
  30953,
  30954,
  30955,
  30956,
  30957,
  30958,
  30959,
  30960,
  30961,
  30962,
  30963,
  30964,
  30965,
  30966,
  30967,
  30968,
  30969,
  30970,
  30971,
  30972,
  30973,
  30974,
  30975,
  30976,
  30977,
  30978,
  30979,
  30980,
  30981,
  30982,
  30983,
  30984,
  30985,
  30986,
  30987,
  30988,
  30989,
  30990,
  30991,
  30992,
  30993,
  30994,
  30995,
  30996,
  30997,
  30998,
  30999,
  31000,
  31001,
  31002,
  31003,
  31004,
  31005,
  31006,
  31007,
  31008,
  31009,
  31010,
  31011,
  31012,
  31013,
  31014,
  31015,
  31016,
  31017,
  31018,
  31019,
  31020,
  31021,
  31022,
  31023,
  31024,
  31025,
  31026,
  31027,
  31028,
  31029,
  31030,
  31031,
  31032,
  31033,
  31034,
  31035,
  31036,
  31037,
  31038,
  31039,
  31040,
  31041,
  31042,
  31043,
  31044,
  31045,
  31046,
  31047,
  31048,
  31049,
  31050,
  31051,
  31052,
  31053,
  31054,
  31055,
  31056,
  31057,
  31058,
  31059,
  31060,
  31061,
  31062,
  31063,
  31064,
  31065,
  31066,
  31067,
  31068,
  31069,
  31070,
  31071,
  31072,
  31073,
  31074,
  31075,
  31076,
  31077,
  31078,
  31079,
  31080,
  31081,
  31082,
  31083,
  31084,
  31085,
  31086,
  31087,
  31088,
  31089,
  31090,
  31091,
  31092,
  31093,
  31094,
  31095,
  31096,
  31097,
  31098,
  31099,
  31100,
  31101,
  31102,
  31103,
  31104,
  31105,
  31106,
  31107,
  31108,
  31109,
  31110,
  31111,
  31112,
  31113,
  31114,
  31115,
  31116,
  31117,
  31118,
  31119,
  31120,
  31121,
  31122,
  31123,
  31124,
  31125,
  31126,
  31127,
  31128,
  31129,
  31130,
  31131,
  31132,
  31133,
  31134,
  31135,
  31136,
  31137,
  31138,
  31139,
  31140,
  31141,
  31142,
  31143,
  31144,
  31145,
  31146,
  31147,
  31148,
  31149,
  31150,
  31151,
  31152,
  31153,
  31154,
  31155,
  31156,
  31157,
  31158,
  31159,
  31160,
  31161,
  31162,
  31163,
  31164,
  31165,
  31166,
  31167,
  31168,
  31169,
  31170,
  31171,
  31172,
  31173,
  31174,
  31175,
  31176,
  31177,
  31178,
  31179,
  31180,
  31181,
  31182,
  31183,
  31184,
  31185,
  31186,
  31187,
  31188,
  31189,
  31190,
  31191,
  31192,
  31193,
  31194,
  31195,
  31196,
  31197,
  31198,
  31199,
  31200,
  31201,
  31202,
  31203,
  31204,
  31205,
  31206,
  31207,
  31208,
  31209,
  31210,
  31211,
  31212,
  31213,
  31214,
  31215,
  31216,
  31217,
  31218,
  31219,
  31220,
  31221,
  31222,
  31223,
  31224,
  31225,
  31226,
  31227,
  31228,
  31229,
  31230,
  31231,
  31232,
  31233,
  31234,
  31235,
  31236,
  31237,
  31238,
  31239,
  31240,
  31241,
  31242,
  31243,
  31244,
  31245,
  31246,
  31247,
  31248,
  31249,
  31250,
  31251,
  31252,
  31253,
  31254,
  31255,
  31256,
  31257,
  31258,
  31259,
  31260,
  31261,
  31262,
  31263,
  31264,
  31265,
  31266,
  31267,
  31268,
  31269,
  31270,
  31271,
  31272,
  31273,
  31274,
  31275,
  31276,
  31277,
  31278,
  31279,
  31280,
  31281,
  31282,
  31283,
  31284,
  31285,
  31286,
  31287,
  31288,
  31289,
  31290,
  31291,
  31292,
  31293,
  31294,
  31295,
  31296,
  31297,
  31298,
  31299,
  31300,
  31301,
  31302,
  31303,
  31304,
  31305,
  31306,
  31307,
  31308,
  31309,
  31310,
  31311,
  31312,
  31313,
  31314,
  31315,
  31316,
  31317,
  31318,
  31319,
  31320,
  31321,
  31322,
  31323,
  31324,
  31325,
  31326,
  31327,
  31328,
  31329,
  31330,
  31331,
  31332,
  31333,
  31334,
  31335,
  31336,
  31337,
  31338,
  31339,
  31340,
  31341,
  31342,
  31343,
  31344,
  31345,
  31346,
  31347,
  31348,
  31349,
  31350,
  31351,
  31352,
  31353,
  31354,
  31355,
  31356,
  31357,
  31358,
  31359,
  31360,
  31361,
  31362,
  31363,
  31364,
  31365,
  31366,
  31367,
  31368,
  31369,
  31370,
  31371,
  31372,
  31373,
  31374,
  31375,
  31376,
  31377,
  31378,
  31379,
  31380,
  31381,
  31382,
  31383,
  31384,
  31385,
  31386,
  31387,
  31388,
  31389,
  31390,
  31391,
  31392,
  31393,
  31394,
  31395,
  31396,
  31397,
  31398,
  31399,
  31400,
  31401,
  31402,
  31403,
  31404,
  31405,
  31406,
  31407,
  31408,
  31409,
  31410,
  31411,
  31412,
  31413,
  31414,
  31415,
  31416,
  31417,
  31418,
  31419,
  31420,
  31421,
  31422,
  31423,
  31424,
  31425,
  31426,
  31427,
  31428,
  31429,
  31430,
  31431,
  31432,
  31433,
  31434,
  31435,
  31436,
  31437,
  31438,
  31439,
  31440,
  31441,
  31442,
  31443,
  31444,
  31445,
  31446,
  31447,
  31448,
  31449,
  31450,
  31451,
  31452,
  31453,
  31454,
  31455,
  31456,
  31457,
  31458,
  31459,
  31460,
  31461,
  31462,
  31463,
  31464,
  31465,
  31466,
  31467,
  31468,
  31469,
  31470,
  31471,
  31472,
  31473,
  31474,
  31475,
  31476,
  31477,
  31478,
  31479,
  31480,
  31481,
  31482,
  31483,
  31484,
  31485,
  31486,
  31487,
  31488,
  31489,
  31490,
  31491,
  31492,
  31493,
  31494,
  31495,
  31496,
  31497,
  31498,
  31499,
  31500,
  31501,
  31502,
  31503,
  31504,
  31505,
  31506,
  31507,
  31508,
  31509,
  31510,
  31511,
  31512,
  31513,
  31514,
  31515,
  31516,
  31517,
  31518,
  31519,
  31520,
  31521,
  31522,
  31523,
  31524,
  31525,
  31526,
  31527,
  31528,
  31529,
  31530,
  31531,
  31532,
  31533,
  31534,
  31535,
  31536,
  31537,
  31538,
  31539,
  31540,
  31541,
  31542,
  31543,
  31544,
  31545,
  31546,
  31547,
  31548,
  31549,
  31550,
  31551,
  31552,
  31553,
  31554,
  31555,
  31556,
  31557,
  31558,
  31559,
  31560,
  31561,
  31562,
  31563,
  31564,
  31565,
  31566,
  31567,
  31568,
  31569,
  31570,
  31571,
  31572,
  31573,
  31574,
  31575,
  31576,
  31577,
  31578,
  31579,
  31580,
  31581,
  31582,
  31583,
  31584,
  31585,
  31586,
  31587,
  31588,
  31589,
  31590,
  31591,
  31592,
  31593,
  31594,
  31595,
  31596,
  31597,
  31598,
  31599,
  31600,
  31601,
  31602,
  31603,
  31604,
  31605,
  31606,
  31607,
  31608,
  31609,
  31610,
  31611,
  31612,
  31613,
  31614,
  31615,
  31616,
  31617,
  31618,
  31619,
  31620,
  31621,
  31622,
  31623,
  31624,
  31625,
  31626,
  31627,
  31628,
  31629,
  31630,
  31631,
  31632,
  31633,
  31634,
  31635,
  31636,
  31637,
  31638,
  31639,
  31640,
  31641,
  31642,
  31643,
  31644,
  31645,
  31646,
  31647,
  31648,
  31649,
  31650,
  31651,
  31652,
  31653,
  31654,
  31655,
  31656,
  31657,
  31658,
  31659,
  31660,
  31661,
  31662,
  31663,
  31664,
  31665,
  31666,
  31667,
  31668,
  31669,
  31670,
  31671,
  31672,
  31673,
  31674,
  31675,
  31676,
  31677,
  31678,
  31679,
  31680,
  31681,
  31682,
  31683,
  31684,
  31685,
  31686,
  31687,
  31688,
  31689,
  31690,
  31691,
  31692,
  31693,
  31694,
  31695,
  31696,
  31697,
  31698,
  31699,
  31700,
  31701,
  31702,
  31703,
  31704,
  31705,
  31706,
  31707,
  31708,
  31709,
  31710,
  31711,
  31712,
  31713,
  31714,
  31715,
  31716,
  31717,
  31718,
  31719,
  31720,
  31721,
  31722,
  31723,
  31724,
  31725,
  31726,
  31727,
  31728,
  31729,
  31730,
  31731,
  31732,
  31733,
  31734,
  31735,
  31736,
  31737,
  31738,
  31739,
  31740,
  31741,
  31742,
  31743,
  31744,
  31745,
  31746,
  31747,
  31748,
  31749,
  31750,
  31751,
  31752,
  31753,
  31754,
  31755,
  31756,
  31757,
  31758,
  31759,
  31760,
  31761,
  31762,
  31763,
  31764,
  31765,
  31766,
  31767,
  31768,
  31769,
  31770,
  31771,
  31772,
  31773,
  31774,
  31775,
  31776,
  31777,
  31778,
  31779,
  31780,
  31781,
  31782,
  31783,
  31784,
  31785,
  31786,
  31787,
  31788,
  31789,
  31790,
  31791,
  31792,
  31793,
  31794,
  31795,
  31796,
  31797,
  31798,
  31799,
  31800,
  31801,
  31802,
  31803,
  31804,
  31805,
  31806,
  31807,
  31808,
  31809,
  31810,
  31811,
  31812,
  31813,
  31814,
  31815,
  31816,
  31817,
  31818,
  31819,
  31820,
  31821,
  31822,
  31823,
  31824,
  31825,
  31826,
  31827,
  31828,
  31829,
  31830,
  31831,
  31832,
  31833,
  31834,
  31835,
  31836,
  31837,
  31838,
  31839,
  31840,
  31841,
  31842,
  31843,
  31844,
  31845,
  31846,
  31847,
  31848,
  31849,
  31850,
  31851,
  31852,
  31853,
  31854,
  31855,
  31856,
  31857,
  31858,
  31859,
  31860,
  31861,
  31862,
  31863,
  31864,
  31865,
  31866,
  31867,
  31868,
  31869,
  31870,
  31871,
  31872,
  31873,
  31874,
  31875,
  31876,
  31877,
  31878,
  31879,
  31880,
  31881,
  31882,
  31883,
  31884,
  31885,
  31886,
  31887,
  31888,
  31889,
  31890,
  31891,
  31892,
  31893,
  31894,
  31895,
  31896,
  31897,
  31898,
  31899,
  31900,
  31901,
  31902,
  31903,
  31904,
  31905,
  31906,
  31907,
  31908,
  31909,
  31910,
  31911,
  31912,
  31913,
  31914,
  31915,
  31916,
  31917,
  31918,
  31919,
  31920,
  31921,
  31922,
  31923,
  31924,
  31925,
  31926,
  31927,
  31928,
  31929,
  31930,
  31931,
  31932,
  31933,
  31934,
  31935,
  31936,
  31937,
  31938,
  31939,
  31940,
  31941,
  31942,
  31943,
  31944,
  31945,
  31946,
  31947,
  31948,
  31949,
  31950,
  31951,
  31952,
  31953,
  31954,
  31955,
  31956,
  31957,
  31958,
  31959,
  31960,
  31961,
  31962,
  31963,
  31964,
  31965,
  31966,
  31967,
  31968,
  31969,
  31970,
  31971,
  31972,
  31973,
  31974,
  31975,
  31976,
  31977,
  31978,
  31979,
  31980,
  31981,
  31982,
  31983,
  31984,
  31985,
  31986,
  31987,
  31988,
  31989,
  31990,
  31991,
  31992,
  31993,
  31994,
  31995,
  31996,
  31997,
  31998,
  31999,
  32000,
  32001,
  32002,
  32003,
  32004,
  32005,
  32006,
  32007,
  32008,
  32009,
  32010,
  32011,
  32012,
  32013,
  32014,
  32015,
  32016,
  32017,
  32018,
  32019,
  32020,
  32021,
  32022,
  32023,
  32024,
  32025,
  32026,
  32027,
  32028,
  32029,
  32030,
  32031,
  32032,
  32033,
  32034,
  32035,
  32036,
  32037,
  32038,
  32039,
  32040,
  32041,
  32042,
  32043,
  32044,
  32045,
  32046,
  32047,
  32048,
  32049,
  32050,
  32051,
  32052,
  32053,
  32054,
  32055,
  32056,
  32057,
  32058,
  32059,
  32060,
  32061,
  32062,
  32063,
  32064,
  32065,
  32066,
  32067,
  32068,
  32069,
  32070,
  32071,
  32072,
  32073,
  32074,
  32075,
  32076,
  32077,
  32078,
  32079,
  32080,
  32081,
  32082,
  32083,
  32084,
  32085,
  32086,
  32087,
  32088,
  32089,
  32090,
  32091,
  32092,
  32093,
  32094,
  32095,
  32096,
  32097,
  32098,
  32099,
  32100,
  32101,
  32102,
  32103,
  32104,
  32105,
  32106,
  32107,
  32108,
  32109,
  32110,
  32111,
  32112,
  32113,
  32114,
  32115,
  32116,
  32117,
  32118,
  32119,
  32120,
  32121,
  32122,
  32123,
  32124,
  32125,
  32126,
  32127,
  32128,
  32129,
  32130,
  32131,
  32132,
  32133,
  32134,
  32135,
  32136,
  32137,
  32138,
  32139,
  32140,
  32141,
  32142,
  32143,
  32144,
  32145,
  32146,
  32147,
  32148,
  32149,
  32150,
  32151,
  32152,
  32153,
  32154,
  32155,
  32156,
  32157,
  32158,
  32159,
  32160,
  32161,
  32162,
  32163,
  32164,
  32165,
  32166,
  32167,
  32168,
  32169,
  32170,
  32171,
  32172,
  32173,
  32174,
  32175,
  32176,
  32177,
  32178,
  32179,
  32180,
  32181,
  32182,
  32183,
  32184,
  32185,
  32186,
  32187,
  32188,
  32189,
  32190,
  32191,
  32192,
  32193,
  32194,
  32195,
  32196,
  32197,
  32198,
  32199,
  32200,
  32201,
  32202,
  32203,
  32204,
  32205,
  32206,
  32207,
  32208,
  32209,
  32210,
  32211,
  32212,
  32213,
  32214,
  32215,
  32216,
  32217,
  32218,
  32219,
  32220,
  32221,
  32222,
  32223,
  32224,
  32225,
  32226,
  32227,
  32228,
  32229,
  32230,
  32231,
  32232,
  32233,
  32234,
  32235,
  32236,
  32237,
  32238,
  32239,
  32240,
  32241,
  32242,
  32243,
  32244,
  32245,
  32246,
  32247,
  32248,
  32249,
  32250,
  32251,
  32252,
  32253,
  32254,
  32255,
  32256,
  32257,
  32258,
  32259,
  32260,
  32261,
  32262,
  32263,
  32264,
  32265,
  32266,
  32267,
  32268,
  32269,
  32270,
  32271,
  32272,
  32273,
  32274,
  32275,
  32276,
  32277,
  32278,
  32279,
  32280,
  32281,
  32282,
  32283,
  32284,
  32285,
  32286,
  32287,
  32288,
  32289,
  32290,
  32291,
  32292,
  32293,
  32294,
  32295,
  32296,
  32297,
  32298,
  32299,
  32300,
  32301,
  32302,
  32303,
  32304,
  32305,
  32306,
  32307,
  32308,
  32309,
  32310,
  32311,
  32312,
  32313,
  32314,
  32315,
  32316,
  32317,
  32318,
  32319,
  32320,
  32321,
  32322,
  32323,
  32324,
  32325,
  32326,
  32327,
  32328,
  32329,
  32330,
  32331,
  32332,
  32333,
  32334,
  32335,
  32336,
  32337,
  32338,
  32339,
  32340,
  32341,
  32342,
  32343,
  32344,
  32345,
  32346,
  32347,
  32348,
  32349,
  32350,
  32351,
  32352,
  32353,
  32354,
  32355,
  32356,
  32357,
  32358,
  32359,
  32360,
  32361,
  32362,
  32363,
  32364,
  32365,
  32366,
  32367,
  32368,
  32369,
  32370,
  32371,
  32372,
  32373,
  32374,
  32375,
  32376,
  32377,
  32378,
  32379,
  32380,
  32381,
  32382,
  32383,
  32384,
  32385,
  32386,
  32387,
  32388,
  32389,
  32390,
  32391,
  32392,
  32393,
  32394,
  32395,
  32396,
  32397,
  32398,
  32399,
  32400,
  32401,
  32402,
  32403,
  32404,
  32405,
  32406,
  32407,
  32408,
  32409,
  32410,
  32411,
  32412,
  32413,
  32414,
  32415,
  32416,
  32417,
  32418,
  32419,
  32420,
  32421,
  32422,
  32423,
  32424,
  32425,
  32426,
  32427,
  32428,
  32429,
  32430,
  32431,
  32432,
  32433,
  32434,
  32435,
  32436,
  32437,
  32438,
  32439,
  32440,
  32441,
  32442,
  32443,
  32444,
  32445,
  32446,
  32447,
  32448,
  32449,
  32450,
  32451,
  32452,
  32453,
  32454,
  32455,
  32456,
  32457,
  32458,
  32459,
  32460,
  32461,
  32462,
  32463,
  32464,
  32465,
  32466,
  32467,
  32468,
  32469,
  32470,
  32471,
  32472,
  32473,
  32474,
  32475,
  32476,
  32477,
  32478,
  32479,
  32480,
  32481,
  32482,
  32483,
  32484,
  32485,
  32486,
  32487,
  32488,
  32489,
  32490,
  32491,
  32492,
  32493,
  32494,
  32495,
  32496,
  32497,
  32498,
  32499,
  32500,
  32501,
  32502,
  32503,
  32504,
  32505,
  32506,
  32507,
  32508,
  32509,
  32510,
  32511,
  32512,
  32513,
  32514,
  32515,
  32516,
  32517,
  32518,
  32519,
  32520,
  32521,
  32522,
  32523,
  32524,
  32525,
  32526,
  32527,
  32528,
  32529,
  32530,
  32531,
  32532,
  32533,
  32534,
  32535,
  32536,
  32537,
  32538,
  32539,
  32540,
  32541,
  32542,
  32543,
  32544,
  32545,
  32546,
  32547,
  32548,
  32549,
  32550,
  32551,
  32552,
  32553,
  32554,
  32555,
  32556,
  32557,
  32558,
  32559,
  32560,
  32561,
  32562,
  32563,
  32564,
  32565,
  32566,
  32567,
  32568,
  32569,
  32570,
  32571,
  32572,
  32573,
  32574,
  32575,
  32576,
  32577,
  32578,
  32579,
  32580,
  32581,
  32582,
  32583,
  32584,
  32585,
  32586,
  32587,
  32588,
  32589,
  32590,
  32591,
  32592,
  32593,
  32594,
  32595,
  32596,
  32597,
  32598,
  32599,
  32600,
  32601,
  32602,
  32603,
  32604,
  32605,
  32606,
  32607,
  32608,
  32609,
  32610,
  32611,
  32612,
  32613,
  32614,
  32615,
  32616,
  32617,
  32618,
  32619,
  32620,
  32621,
  32622,
  32623,
  32624,
  32625,
  32626,
  32627,
  32628,
  32629,
  32630,
  32631,
  32632,
  32633,
  32634,
  32635,
  32636,
  32637,
  32638,
  32639,
  32640,
  32641,
  32642,
  32643,
  32644,
  32645,
  32646,
  32647,
  32648,
  32649,
  32650,
  32651,
  32652,
  32653,
  32654,
  32655,
  32656,
  32657,
  32658,
  32659,
  32660,
  32661,
  32662,
  32663,
  32664,
  32665,
  32666,
  32667,
  32668,
  32669,
  32670,
  32671,
  32672,
  32673,
  32674,
  32675,
  32676,
  32677,
  32678,
  32679,
  32680,
  32681,
  32682,
  32683,
  32684,
  32685,
  32686,
  32687,
  32688,
  32689,
  32690,
  32691,
  32692,
  32693,
  32694,
  32695,
  32696,
  32697,
  32698,
  32699,
  32700,
  32701,
  32702,
  32703,
  32704,
  32705,
  32706,
  32707,
  32708,
  32709,
  32710,
  32711,
  32712,
  32713,
  32714,
  32715,
  32716,
  32717,
  32718,
  32719,
  32720,
  32721,
  32722,
  32723,
  32724,
  32725,
  32726,
  32727,
  32728,
  32729,
  32730,
  32731,
  32732,
  32733,
  32734,
  32735,
  32736,
  32737,
  32738,
  32739,
  32740,
  32741,
  32742,
  32743,
  32744,
  32745,
  32746,
  32747,
  32748,
  32749,
  32750,
  32751,
  32752,
  32753,
  32754,
  32755,
  32756,
  32757,
  32758,
  32759,
  32760,
  32761,
  32762,
  32763,
  32764,
  32765,
  32766,
  32767,
  32768,
  32769,
  32770,
  32771,
  32772,
  32773,
  32774,
  32775,
  32776,
  32777,
  32778,
  32779,
  32780,
  32781,
  32782,
  32783,
  32784,
  32785,
  32786,
  32787,
  32788,
  32789,
  32790,
  32791,
  32792,
  32793,
  32794,
  32795,
  32796,
  32797,
  32798,
  32799,
  32800,
  32801,
  32802,
  32803,
  32804,
  32805,
  32806,
  32807,
  32808,
  32809,
  32810,
  32811,
  32812,
  32813,
  32814,
  32815,
  32816,
  32817,
  32818,
  32819,
  32820,
  32821,
  32822,
  32823,
  32824,
  32825,
  32826,
  32827,
  32828,
  32829,
  32830,
  32831,
  32832,
  32833,
  32834,
  32835,
  32836,
  32837,
  32838,
  32839,
  32840,
  32841,
  32842,
  32843,
  32844,
  32845,
  32846,
  32847,
  32848,
  32849,
  32850,
  32851,
  32852,
  32853,
  32854,
  32855,
  32856,
  32857,
  32858,
  32859,
  32860,
  32861,
  32862,
  32863,
  32864,
  32865,
  32866,
  32867,
  32868,
  32869,
  32870,
  32871,
  32872,
  32873,
  32874,
  32875,
  32876,
  32877,
  32878,
  32879,
  32880,
  32881,
  32882,
  32883,
  32884,
  32885,
  32886,
  32887,
  32888,
  32889,
  32890,
  32891,
  32892,
  32893,
  32894,
  32895,
  32896,
  32897,
  32898,
  32899,
  32900,
  32901,
  32902,
  32903,
  32904,
  32905,
  32906,
  32907,
  32908,
  32909,
  32910,
  32911,
  32912,
  32913,
  32914,
  32915,
  32916,
  32917,
  32918,
  32919,
  32920,
  32921,
  32922,
  32923,
  32924,
  32925,
  32926,
  32927,
  32928,
  32929,
  32930,
  32931,
  32932,
  32933,
  32934,
  32935,
  32936,
  32937,
  32938,
  32939,
  32940,
  32941,
  32942,
  32943,
  32944,
  32945,
  32946,
  32947,
  32948,
  32949,
  32950,
  32951,
  32952,
  32953,
  32954,
  32955,
  32956,
  32957,
  32958,
  32959,
  32960,
  32961,
  32962,
  32963,
  32964,
  32965,
  32966,
  32967,
  32968,
  32969,
  32970,
  32971,
  32972,
  32973,
  32974,
  32975,
  32976,
  32977,
  32978,
  32979,
  32980,
  32981,
  32982,
  32983,
  32984,
  32985,
  32986,
  32987,
  32988,
  32989,
  32990,
  32991,
  32992,
  32993,
  32994,
  32995,
  32996,
  32997,
  32998,
  32999,
  33000,
  33001,
  33002,
  33003,
  33004,
  33005,
  33006,
  33007,
  33008,
  33009,
  33010,
  33011,
  33012,
  33013,
  33014,
  33015,
  33016,
  33017,
  33018,
  33019,
  33020,
  33021,
  33022,
  33023,
  33024,
  33025,
  33026,
  33027,
  33028,
  33029,
  33030,
  33031,
  33032,
  33033,
  33034,
  33035,
  33036,
  33037,
  33038,
  33039,
  33040,
  33041,
  33042,
  33043,
  33044,
  33045,
  33046,
  33047,
  33048,
  33049,
  33050,
  33051,
  33052,
  33053,
  33054,
  33055,
  33056,
  33057,
  33058,
  33059,
  33060,
  33061,
  33062,
  33063,
  33064,
  33065,
  33066,
  33067,
  33068,
  33069,
  33070,
  33071,
  33072,
  33073,
  33074,
  33075,
  33076,
  33077,
  33078,
  33079,
  33080,
  33081,
  33082,
  33083,
  33084,
  33085,
  33086,
  33087,
  33088,
  33089,
  33090,
  33091,
  33092,
  33093,
  33094,
  33095,
  33096,
  33097,
  33098,
  33099,
  33100,
  33101,
  33102,
  33103,
  33104,
  33105,
  33106,
  33107,
  33108,
  33109,
  33110,
  33111,
  33112,
  33113,
  33114,
  33115,
  33116,
  33117,
  33118,
  33119,
  33120,
  33121,
  33122,
  33123,
  33124,
  33125,
  33126,
  33127,
  33128,
  33129,
  33130,
  33131,
  33132,
  33133,
  33134,
  33135,
  33136,
  33137,
  33138,
  33139,
  33140,
  33141,
  33142,
  33143,
  33144,
  33145,
  33146,
  33147,
  33148,
  33149,
  33150,
  33151,
  33152,
  33153,
  33154,
  33155,
  33156,
  33157,
  33158,
  33159,
  33160,
  33161,
  33162,
  33163,
  33164,
  33165,
  33166,
  33167,
  33168,
  33169,
  33170,
  33171,
  33172,
  33173,
  33174,
  33175,
  33176,
  33177,
  33178,
  33179,
  33180,
  33181,
  33182,
  33183,
  33184,
  33185,
  33186,
  33187,
  33188,
  33189,
  33190,
  33191,
  33192,
  33193,
  33194,
  33195,
  33196,
  33197,
  33198,
  33199,
  33200,
  33201,
  33202,
  33203,
  33204,
  33205,
  33206,
  33207,
  33208,
  33209,
  33210,
  33211,
  33212,
  33213,
  33214,
  33215,
  33216,
  33217,
  33218,
  33219,
  33220,
  33221,
  33222,
  33223,
  33224,
  33225,
  33226,
  33227,
  33228,
  33229,
  33230,
  33231,
  33232,
  33233,
  33234,
  33235,
  33236,
  33237,
  33238,
  33239,
  33240,
  33241,
  33242,
  33243,
  33244,
  33245,
  33246,
  33247,
  33248,
  33249,
  33250,
  33251,
  33252,
  33253,
  33254,
  33255,
  33256,
  33257,
  33258,
  33259,
  33260,
  33261,
  33262,
  33263,
  33264,
  33265,
  33266,
  33267,
  33268,
  33269,
  33270,
  33271,
  33272,
  33273,
  33274,
  33275,
  33276,
  33277,
  33278,
  33279,
  33280,
  33281,
  33282,
  33283,
  33284,
  33285,
  33286,
  33287,
  33288,
  33289,
  33290,
  33291,
  33292,
  33293,
  33294,
  33295,
  33296,
  33297,
  33298,
  33299,
  33300,
  33301,
  33302,
  33303,
  33304,
  33305,
  33306,
  33307,
  33308,
  33309,
  33310,
  33311,
  33312,
  33313,
  33314,
  33315,
  33316,
  33317,
  33318,
  33319,
  33320,
  33321,
  33322,
  33323,
  33324,
  33325,
  33326,
  33327,
  33328,
  33329,
  33330,
  33331,
  33332,
  33333,
  33334,
  33335,
  33336,
  33337,
  33338,
  33339,
  33340,
  33341,
  33342,
  33343,
  33344,
  33345,
  33346,
  33347,
  33348,
  33349,
  33350,
  33351,
  33352,
  33353,
  33354,
  33355,
  33356,
  33357,
  33358,
  33359,
  33360,
  33361,
  33362,
  33363,
  33364,
  33365,
  33366,
  33367,
  33368,
  33369,
  33370,
  33371,
  33372,
  33373,
  33374,
  33375,
  33376,
  33377,
  33378,
  33379,
  33380,
  33381,
  33382,
  33383,
  33384,
  33385,
  33386,
  33387,
  33388,
  33389,
  33390,
  33391,
  33392,
  33393,
  33394,
  33395,
  33396,
  33397,
  33398,
  33399,
  33400,
  33401,
  33402,
  33403,
  33404,
  33405,
  33406,
  33407,
  33408,
  33409,
  33410,
  33411,
  33412,
  33413,
  33414,
  33415,
  33416,
  33417,
  33418,
  33419,
  33420,
  33421,
  33422,
  33423,
  33424,
  33425,
  33426,
  33427,
  33428,
  33429,
  33430,
  33431,
  33432,
  33433,
  33434,
  33435,
  33436,
  33437,
  33438,
  33439,
  33440,
  33441,
  33442,
  33443,
  33444,
  33445,
  33446,
  33447,
  33448,
  33449,
  33450,
  33451,
  33452,
  33453,
  33454,
  33455,
  33456,
  33457,
  33458,
  33459,
  33460,
  33461,
  33462,
  33463,
  33464,
  33465,
  33466,
  33467,
  33468,
  33469,
  33470,
  33471,
  33472,
  33473,
  33474,
  33475,
  33476,
  33477,
  33478,
  33479,
  33480,
  33481,
  33482,
  33483,
  33484,
  33485,
  33486,
  33487,
  33488,
  33489,
  33490,
  33491,
  33492,
  33493,
  33494,
  33495,
  33496,
  33497,
  33498,
  33499,
  33500,
  33501,
  33502,
  33503,
  33504,
  33505,
  33506,
  33507,
  33508,
  33509,
  33510,
  33511,
  33512,
  33513,
  33514,
  33515,
  33516,
  33517,
  33518,
  33519,
  33520,
  33521,
  33522,
  33523,
  33524,
  33525,
  33526,
  33527,
  33528,
  33529,
  33530,
  33531,
  33532,
  33533,
  33534,
  33535,
  33536,
  33537,
  33538,
  33539,
  33540,
  33541,
  33542,
  33543,
  33544,
  33545,
  33546,
  33547,
  33548,
  33549,
  33550,
  33551,
  33552,
  33553,
  33554,
  33555,
  33556,
  33557,
  33558,
  33559,
  33560,
  33561,
  33562,
  33563,
  33564,
  33565,
  33566,
  33567,
  33568,
  33569,
  33570,
  33571,
  33572,
  33573,
  33574,
  33575,
  33576,
  33577,
  33578,
  33579,
  33580,
  33581,
  33582,
  33583,
  33584,
  33585,
  33586,
  33587,
  33588,
  33589,
  33590,
  33591,
  33592,
  33593,
  33594,
  33595,
  33596,
  33597,
  33598,
  33599,
  33600,
  33601,
  33602,
  33603,
  33604,
  33605,
  33606,
  33607,
  33608,
  33609,
  33610,
  33611,
  33612,
  33613,
  33614,
  33615,
  33616,
  33617,
  33618,
  33619,
  33620,
  33621,
  33622,
  33623,
  33624,
  33625,
  33626,
  33627,
  33628,
  33629,
  33630,
  33631,
  33632,
  33633,
  33634,
  33635,
  33636,
  33637,
  33638,
  33639,
  33640,
  33641,
  33642,
  33643,
  33644,
  33645,
  33646,
  33647,
  33648,
  33649,
  33650,
  33651,
  33652,
  33653,
  33654,
  33655,
  33656,
  33657,
  33658,
  33659,
  33660,
  33661,
  33662,
  33663,
  33664,
  33665,
  33666,
  33667,
  33668,
  33669,
  33670,
  33671,
  33672,
  33673,
  33674,
  33675,
  33676,
  33677,
  33678,
  33679,
  33680,
  33681,
  33682,
  33683,
  33684,
  33685,
  33686,
  33687,
  33688,
  33689,
  33690,
  33691,
  33692,
  33693,
  33694,
  33695,
  33696,
  33697,
  33698,
  33699,
  33700,
  33701,
  33702,
  33703,
  33704,
  33705,
  33706,
  33707,
  33708,
  33709,
  33710,
  33711,
  33712,
  33713,
  33714,
  33715,
  33716,
  33717,
  33718,
  33719,
  33720,
  33721,
  33722,
  33723,
  33724,
  33725,
  33726,
  33727,
  33728,
  33729,
  33730,
  33731,
  33732,
  33733,
  33734,
  33735,
  33736,
  33737,
  33738,
  33739,
  33740,
  33741,
  33742,
  33743,
  33744,
  33745,
  33746,
  33747,
  33748,
  33749,
  33750,
  33751,
  33752,
  33753,
  33754,
  33755,
  33756,
  33757,
  33758,
  33759,
  33760,
  33761,
  33762,
  33763,
  33764,
  33765,
  33766,
  33767,
  33768,
  33769,
  33770,
  33771,
  33772,
  33773,
  33774,
  33775,
  33776,
  33777,
  33778,
  33779,
  33780,
  33781,
  33782,
  33783,
  33784,
  33785,
  33786,
  33787,
  33788,
  33789,
  33790,
  33791,
  33792,
  33793,
  33794,
  33795,
  33796,
  33797,
  33798,
  33799,
  33800,
  33801,
  33802,
  33803,
  33804,
  33805,
  33806,
  33807,
  33808,
  33809,
  33810,
  33811,
  33812,
  33813,
  33814,
  33815,
  33816,
  33817,
  33818,
  33819,
  33820,
  33821,
  33822,
  33823,
  33824,
  33825,
  33826,
  33827,
  33828,
  33829,
  33830,
  33831,
  33832,
  33833,
  33834,
  33835,
  33836,
  33837,
  33838,
  33839,
  33840,
  33841,
  33842,
  33843,
  33844,
  33845,
  33846,
  33847,
  33848,
  33849,
  33850,
  33851,
  33852,
  33853,
  33854,
  33855,
  33856,
  33857,
  33858,
  33859,
  33860,
  33861,
  33862,
  33863,
  33864,
  33865,
  33866,
  33867,
  33868,
  33869,
  33870,
  33871,
  33872,
  33873,
  33874,
  33875,
  33876,
  33877,
  33878,
  33879,
  33880,
  33881,
  33882,
  33883,
  33884,
  33885,
  33886,
  33887,
  33888,
  33889,
  33890,
  33891,
  33892,
  33893,
  33894,
  33895,
  33896,
  33897,
  33898,
  33899,
  33900,
  33901,
  33902,
  33903,
  33904,
  33905,
  33906,
  33907,
  33908,
  33909,
  33910,
  33911,
  33912,
  33913,
  33914,
  33915,
  33916,
  33917,
  33918,
  33919,
  33920,
  33921,
  33922,
  33923,
  33924,
  33925,
  33926,
  33927,
  33928,
  33929,
  33930,
  33931,
  33932,
  33933,
  33934,
  33935,
  33936,
  33937,
  33938,
  33939,
  33940,
  33941,
  33942,
  33943,
  33944,
  33945,
  33946,
  33947,
  33948,
  33949,
  33950,
  33951,
  33952,
  33953,
  33954,
  33955,
  33956,
  33957,
  33958,
  33959,
  33960,
  33961,
  33962,
  33963,
  33964,
  33965,
  33966,
  33967,
  33968,
  33969,
  33970,
  33971,
  33972,
  33973,
  33974,
  33975,
  33976,
  33977,
  33978,
  33979,
  33980,
  33981,
  33982,
  33983,
  33984,
  33985,
  33986,
  33987,
  33988,
  33989,
  33990,
  33991,
  33992,
  33993,
  33994,
  33995,
  33996,
  33997,
  33998,
  33999,
  34000,
  34001,
  34002,
  34003,
  34004,
  34005,
  34006,
  34007,
  34008,
  34009,
  34010,
  34011,
  34012,
  34013,
  34014,
  34015,
  34016,
  34017,
  34018,
  34019,
  34020,
  34021,
  34022,
  34023,
  34024,
  34025,
  34026,
  34027,
  34028,
  34029,
  34030,
  34031,
  34032,
  34033,
  34034,
  34035,
  34036,
  34037,
  34038,
  34039,
  34040,
  34041,
  34042,
  34043,
  34044,
  34045,
  34046,
  34047,
  34048,
  34049,
  34050,
  34051,
  34052,
  34053,
  34054,
  34055,
  34056,
  34057,
  34058,
  34059,
  34060,
  34061,
  34062,
  34063,
  34064,
  34065,
  34066,
  34067,
  34068,
  34069,
  34070,
  34071,
  34072,
  34073,
  34074,
  34075,
  34076,
  34077,
  34078,
  34079,
  34080,
  34081,
  34082,
  34083,
  34084,
  34085,
  34086,
  34087,
  34088,
  34089,
  34090,
  34091,
  34092,
  34093,
  34094,
  34095,
  34096,
  34097,
  34098,
  34099,
  34100,
  34101,
  34102,
  34103,
  34104,
  34105,
  34106,
  34107,
  34108,
  34109,
  34110,
  34111,
  34112,
  34113,
  34114,
  34115,
  34116,
  34117,
  34118,
  34119,
  34120,
  34121,
  34122,
  34123,
  34124,
  34125,
  34126,
  34127,
  34128,
  34129,
  34130,
  34131,
  34132,
  34133,
  34134,
  34135,
  34136,
  34137,
  34138,
  34139,
  34140,
  34141,
  34142,
  34143,
  34144,
  34145,
  34146,
  34147,
  34148,
  34149,
  34150,
  34151,
  34152,
  34153,
  34154,
  34155,
  34156,
  34157,
  34158,
  34159,
  34160,
  34161,
  34162,
  34163,
  34164,
  34165,
  34166,
  34167,
  34168,
  34169,
  34170,
  34171,
  34172,
  34173,
  34174,
  34175,
  34176,
  34177,
  34178,
  34179,
  34180,
  34181,
  34182,
  34183,
  34184,
  34185,
  34186,
  34187,
  34188,
  34189,
  34190,
  34191,
  34192,
  34193,
  34194,
  34195,
  34196,
  34197,
  34198,
  34199,
  34200,
  34201,
  34202,
  34203,
  34204,
  34205,
  34206,
  34207,
  34208,
  34209,
  34210,
  34211,
  34212,
  34213,
  34214,
  34215,
  34216,
  34217,
  34218,
  34219,
  34220,
  34221,
  34222,
  34223,
  34224,
  34225,
  34226,
  34227,
  34228,
  34229,
  34230,
  34231,
  34232,
  34233,
  34234,
  34235,
  34236,
  34237,
  34238,
  34239,
  34240,
  34241,
  34242,
  34243,
  34244,
  34245,
  34246,
  34247,
  34248,
  34249,
  34250,
  34251,
  34252,
  34253,
  34254,
  34255,
  34256,
  34257,
  34258,
  34259,
  34260,
  34261,
  34262,
  34263,
  34264,
  34265,
  34266,
  34267,
  34268,
  34269,
  34270,
  34271,
  34272,
  34273,
  34274,
  34275,
  34276,
  34277,
  34278,
  34279,
  34280,
  34281,
  34282,
  34283,
  34284,
  34285,
  34286,
  34287,
  34288,
  34289,
  34290,
  34291,
  34292,
  34293,
  34294,
  34295,
  34296,
  34297,
  34298,
  34299,
  34300,
  34301,
  34302,
  34303,
  34304,
  34305,
  34306,
  34307,
  34308,
  34309,
  34310,
  34311,
  34312,
  34313,
  34314,
  34315,
  34316,
  34317,
  34318,
  34319,
  34320,
  34321,
  34322,
  34323,
  34324,
  34325,
  34326,
  34327,
  34328,
  34329,
  34330,
  34331,
  34332,
  34333,
  34334,
  34335,
  34336,
  34337,
  34338,
  34339,
  34340,
  34341,
  34342,
  34343,
  34344,
  34345,
  34346,
  34347,
  34348,
  34349,
  34350,
  34351,
  34352,
  34353,
  34354,
  34355,
  34356,
  34357,
  34358,
  34359,
  34360,
  34361,
  34362,
  34363,
  34364,
  34365,
  34366,
  34367,
  34368,
  34369,
  34370,
  34371,
  34372,
  34373,
  34374,
  34375,
  34376,
  34377,
  34378,
  34379,
  34380,
  34381,
  34382,
  34383,
  34384,
  34385,
  34386,
  34387,
  34388,
  34389,
  34390,
  34391,
  34392,
  34393,
  34394,
  34395,
  34396,
  34397,
  34398,
  34399,
  34400,
  34401,
  34402,
  34403,
  34404,
  34405,
  34406,
  34407,
  34408,
  34409,
  34410,
  34411,
  34412,
  34413,
  34414,
  34415,
  34416,
  34417,
  34418,
  34419,
  34420,
  34421,
  34422,
  34423,
  34424,
  34425,
  34426,
  34427,
  34428,
  34429,
  34430,
  34431,
  34432,
  34433,
  34434,
  34435,
  34436,
  34437,
  34438,
  34439,
  34440,
  34441,
  34442,
  34443,
  34444,
  34445,
  34446,
  34447,
  34448,
  34449,
  34450,
  34451,
  34452,
  34453,
  34454,
  34455,
  34456,
  34457,
  34458,
  34459,
  34460,
  34461,
  34462,
  34463,
  34464,
  34465,
  34466,
  34467,
  34468,
  34469,
  34470,
  34471,
  34472,
  34473,
  34474,
  34475,
  34476,
  34477,
  34478,
  34479,
  34480,
  34481,
  34482,
  34483,
  34484,
  34485,
  34486,
  34487,
  34488,
  34489,
  34490,
  34491,
  34492,
  34493,
  34494,
  34495,
  34496,
  34497,
  34498,
  34499,
  34500,
  34501,
  34502,
  34503,
  34504,
  34505,
  34506,
  34507,
  34508,
  34509,
  34510,
  34511,
  34512,
  34513,
  34514,
  34515,
  34516,
  34517,
  34518,
  34519,
  34520,
  34521,
  34522,
  34523,
  34524,
  34525,
  34526,
  34527,
  34528,
  34529,
  34530,
  34531,
  34532,
  34533,
  34534,
  34535,
  34536,
  34537,
  34538,
  34539,
  34540,
  34541,
  34542,
  34543,
  34544,
  34545,
  34546,
  34547,
  34548,
  34549,
  34550,
  34551,
  34552,
  34553,
  34554,
  34555,
  34556,
  34557,
  34558,
  34559,
  34560,
  34561,
  34562,
  34563,
  34564,
  34565,
  34566,
  34567,
  34568,
  34569,
  34570,
  34571,
  34572,
  34573,
  34574,
  34575,
  34576,
  34577,
  34578,
  34579,
  34580,
  34581,
  34582,
  34583,
  34584,
  34585,
  34586,
  34587,
  34588,
  34589,
  34590,
  34591,
  34592,
  34593,
  34594,
  34595,
  34596,
  34597,
  34598,
  34599,
  34600,
  34601,
  34602,
  34603,
  34604,
  34605,
  34606,
  34607,
  34608,
  34609,
  34610,
  34611,
  34612,
  34613,
  34614,
  34615,
  34616,
  34617,
  34618,
  34619,
  34620,
  34621,
  34622,
  34623,
  34624,
  34625,
  34626,
  34627,
  34628,
  34629,
  34630,
  34631,
  34632,
  34633,
  34634,
  34635,
  34636,
  34637,
  34638,
  34639,
  34640,
  34641,
  34642,
  34643,
  34644,
  34645,
  34646,
  34647,
  34648,
  34649,
  34650,
  34651,
  34652,
  34653,
  34654,
  34655,
  34656,
  34657,
  34658,
  34659,
  34660,
  34661,
  34662,
  34663,
  34664,
  34665,
  34666,
  34667,
  34668,
  34669,
  34670,
  34671,
  34672,
  34673,
  34674,
  34675,
  34676,
  34677,
  34678,
  34679,
  34680,
  34681,
  34682,
  34683,
  34684,
  34685,
  34686,
  34687,
  34688,
  34689,
  34690,
  34691,
  34692,
  34693,
  34694,
  34695,
  34696,
  34697,
  34698,
  34699,
  34700,
  34701,
  34702,
  34703,
  34704,
  34705,
  34706,
  34707,
  34708,
  34709,
  34710,
  34711,
  34712,
  34713,
  34714,
  34715,
  34716,
  34717,
  34718,
  34719,
  34720,
  34721,
  34722,
  34723,
  34724,
  34725,
  34726,
  34727,
  34728,
  34729,
  34730,
  34731,
  34732,
  34733,
  34734,
  34735,
  34736,
  34737,
  34738,
  34739,
  34740,
  34741,
  34742,
  34743,
  34744,
  34745,
  34746,
  34747,
  34748,
  34749,
  34750,
  34751,
  34752,
  34753,
  34754,
  34755,
  34756,
  34757,
  34758,
  34759,
  34760,
  34761,
  34762,
  34763,
  34764,
  34765,
  34766,
  34767,
  34768,
  34769,
  34770,
  34771,
  34772,
  34773,
  34774,
  34775,
  34776,
  34777,
  34778,
  34779,
  34780,
  34781,
  34782,
  34783,
  34784,
  34785,
  34786,
  34787,
  34788,
  34789,
  34790,
  34791,
  34792,
  34793,
  34794,
  34795,
  34796,
  34797,
  34798,
  34799,
  34800,
  34801,
  34802,
  34803,
  34804,
  34805,
  34806,
  34807,
  34808,
  34809,
  34810,
  34811,
  34812,
  34813,
  34814,
  34815,
  34816,
  34817,
  34818,
  34819,
  34820,
  34821,
  34822,
  34823,
  34824,
  34825,
  34826,
  34827,
  34828,
  34829,
  34830,
  34831,
  34832,
  34833,
  34834,
  34835,
  34836,
  34837,
  34838,
  34839,
  34840,
  34841,
  34842,
  34843,
  34844,
  34845,
  34846,
  34847,
  34848,
  34849,
  34850,
  34851,
  34852,
  34853,
  34854,
  34855,
  34856,
  34857,
  34858,
  34859,
  34860,
  34861,
  34862,
  34863,
  34864,
  34865,
  34866,
  34867,
  34868,
  34869,
  34870,
  34871,
  34872,
  34873,
  34874,
  34875,
  34876,
  34877,
  34878,
  34879,
  34880,
  34881,
  34882,
  34883,
  34884,
  34885,
  34886,
  34887,
  34888,
  34889,
  34890,
  34891,
  34892,
  34893,
  34894,
  34895,
  34896,
  34897,
  34898,
  34899,
  34900,
  34901,
  34902,
  34903,
  34904,
  34905,
  34906,
  34907,
  34908,
  34909,
  34910,
  34911,
  34912,
  34913,
  34914,
  34915,
  34916,
  34917,
  34918,
  34919,
  34920,
  34921,
  34922,
  34923,
  34924,
  34925,
  34926,
  34927,
  34928,
  34929,
  34930,
  34931,
  34932,
  34933,
  34934,
  34935,
  34936,
  34937,
  34938,
  34939,
  34940,
  34941,
  34942,
  34943,
  34944,
  34945,
  34946,
  34947,
  34948,
  34949,
  34950,
  34951,
  34952,
  34953,
  34954,
  34955,
  34956,
  34957,
  34958,
  34959,
  34960,
  34961,
  34962,
  34963,
  34964,
  34965,
  34966,
  34967,
  34968,
  34969,
  34970,
  34971,
  34972,
  34973,
  34974,
  34975,
  34976,
  34977,
  34978,
  34979,
  34980,
  34981,
  34982,
  34983,
  34984,
  34985,
  34986,
  34987,
  34988,
  34989,
  34990,
  34991,
  34992,
  34993,
  34994,
  34995,
  34996,
  34997,
  34998,
  34999,
  35000,
  35001,
  35002,
  35003,
  35004,
  35005,
  35006,
  35007,
  35008,
  35009,
  35010,
  35011,
  35012,
  35013,
  35014,
  35015,
  35016,
  35017,
  35018,
  35019,
  35020,
  35021,
  35022,
  35023,
  35024,
  35025,
  35026,
  35027,
  35028,
  35029,
  35030,
  35031,
  35032,
  35033,
  35034,
  35035,
  35036,
  35037,
  35038,
  35039,
  35040,
  35041,
  35042,
  35043,
  35044,
  35045,
  35046,
  35047,
  35048,
  35049,
  35050,
  35051,
  35052,
  35053,
  35054,
  35055,
  35056,
  35057,
  35058,
  35059,
  35060,
  35061,
  35062,
  35063,
  35064,
  35065,
  35066,
  35067,
  35068,
  35069,
  35070,
  35071,
  35072,
  35073,
  35074,
  35075,
  35076,
  35077,
  35078,
  35079,
  35080,
  35081,
  35082,
  35083,
  35084,
  35085,
  35086,
  35087,
  35088,
  35089,
  35090,
  35091,
  35092,
  35093,
  35094,
  35095,
  35096,
  35097,
  35098,
  35099,
  35100,
  35101,
  35102,
  35103,
  35104,
  35105,
  35106,
  35107,
  35108,
  35109,
  35110,
  35111,
  35112,
  35113,
  35114,
  35115,
  35116,
  35117,
  35118,
  35119,
  35120,
  35121,
  35122,
  35123,
  35124,
  35125,
  35126,
  35127,
  35128,
  35129,
  35130,
  35131,
  35132,
  35133,
  35134,
  35135,
  35136,
  35137,
  35138,
  35139,
  35140,
  35141,
  35142,
  35143,
  35144,
  35145,
  35146,
  35147,
  35148,
  35149,
  35150,
  35151,
  35152,
  35153,
  35154,
  35155,
  35156,
  35157,
  35158,
  35159,
  35160,
  35161,
  35162,
  35163,
  35164,
  35165,
  35166,
  35167,
  35168,
  35169,
  35170,
  35171,
  35172,
  35173,
  35174,
  35175,
  35176,
  35177,
  35178,
  35179,
  35180,
  35181,
  35182,
  35183,
  35184,
  35185,
  35186,
  35187,
  35188,
  35189,
  35190,
  35191,
  35192,
  35193,
  35194,
  35195,
  35196,
  35197,
  35198,
  35199,
  35200,
  35201,
  35202,
  35203,
  35204,
  35205,
  35206,
  35207,
  35208,
  35209,
  35210,
  35211,
  35212,
  35213,
  35214,
  35215,
  35216,
  35217,
  35218,
  35219,
  35220,
  35221,
  35222,
  35223,
  35224,
  35225,
  35226,
  35227,
  35228,
  35229,
  35230,
  35231,
  35232,
  35233,
  35234,
  35235,
  35236,
  35237,
  35238,
  35239,
  35240,
  35241,
  35242,
  35243,
  35244,
  35245,
  35246,
  35247,
  35248,
  35249,
  35250,
  35251,
  35252,
  35253,
  35254,
  35255,
  35256,
  35257,
  35258,
  35259,
  35260,
  35261,
  35262,
  35263,
  35264,
  35265,
  35266,
  35267,
  35268,
  35269,
  35270,
  35271,
  35272,
  35273,
  35274,
  35275,
  35276,
  35277,
  35278,
  35279,
  35280,
  35281,
  35282,
  35283,
  35284,
  35285,
  35286,
  35287,
  35288,
  35289,
  35290,
  35291,
  35292,
  35293,
  35294,
  35295,
  35296,
  35297,
  35298,
  35299,
  35300,
  35301,
  35302,
  35303,
  35304,
  35305,
  35306,
  35307,
  35308,
  35309,
  35310,
  35311,
  35312,
  35313,
  35314,
  35315,
  35316,
  35317,
  35318,
  35319,
  35320,
  35321,
  35322,
  35323,
  35324,
  35325,
  35326,
  35327,
  35328,
  35329,
  35330,
  35331,
  35332,
  35333,
  35334,
  35335,
  35336,
  35337,
  35338,
  35339,
  35340,
  35341,
  35342,
  35343,
  35344,
  35345,
  35346,
  35347,
  35348,
  35349,
  35350,
  35351,
  35352,
  35353,
  35354,
  35355,
  35356,
  35357,
  35358,
  35359,
  35360,
  35361,
  35362,
  35363,
  35364,
  35365,
  35366,
  35367,
  35368,
  35369,
  35370,
  35371,
  35372,
  35373,
  35374,
  35375,
  35376,
  35377,
  35378,
  35379,
  35380,
  35381,
  35382,
  35383,
  35384,
  35385,
  35386,
  35387,
  35388,
  35389,
  35390,
  35391,
  35392,
  35393,
  35394,
  35395,
  35396,
  35397,
  35398,
  35399,
  35400,
  35401,
  35402,
  35403,
  35404,
  35405,
  35406,
  35407,
  35408,
  35409,
  35410,
  35411,
  35412,
  35413,
  35414,
  35415,
  35416,
  35417,
  35418,
  35419,
  35420,
  35421,
  35422,
  35423,
  35424,
  35425,
  35426,
  35427,
  35428,
  35429,
  35430,
  35431,
  35432,
  35433,
  35434,
  35435,
  35436,
  35437,
  35438,
  35439,
  35440,
  35441,
  35442,
  35443,
  35444,
  35445,
  35446,
  35447,
  35448,
  35449,
  35450,
  35451,
  35452,
  35453,
  35454,
  35455,
  35456,
  35457,
  35458,
  35459,
  35460,
  35461,
  35462,
  35463,
  35464,
  35465,
  35466,
  35467,
  35468,
  35469,
  35470,
  35471,
  35472,
  35473,
  35474,
  35475,
  35476,
  35477,
  35478,
  35479,
  35480,
  35481,
  35482,
  35483,
  35484,
  35485,
  35486,
  35487,
  35488,
  35489,
  35490,
  35491,
  35492,
  35493,
  35494,
  35495,
  35496,
  35497,
  35498,
  35499,
  35500,
  35501,
  35502,
  35503,
  35504,
  35505,
  35506,
  35507,
  35508,
  35509,
  35510,
  35511,
  35512,
  35513,
  35514,
  35515,
  35516,
  35517,
  35518,
  35519,
  35520,
  35521,
  35522,
  35523,
  35524,
  35525,
  35526,
  35527,
  35528,
  35529,
  35530,
  35531,
  35532,
  35533,
  35534,
  35535,
  35536,
  35537,
  35538,
  35539,
  35540,
  35541,
  35542,
  35543,
  35544,
  35545,
  35546,
  35547,
  35548,
  35549,
  35550,
  35551,
  35552,
  35553,
  35554,
  35555,
  35556,
  35557,
  35558,
  35559,
  35560,
  35561,
  35562,
  35563,
  35564,
  35565,
  35566,
  35567,
  35568,
  35569,
  35570,
  35571,
  35572,
  35573,
  35574,
  35575,
  35576,
  35577,
  35578,
  35579,
  35580,
  35581,
  35582,
  35583,
  35584,
  35585,
  35586,
  35587,
  35588,
  35589,
  35590,
  35591,
  35592,
  35593,
  35594,
  35595,
  35596,
  35597,
  35598,
  35599,
  35600,
  35601,
  35602,
  35603,
  35604,
  35605,
  35606,
  35607,
  35608,
  35609,
  35610,
  35611,
  35612,
  35613,
  35614,
  35615,
  35616,
  35617,
  35618,
  35619,
  35620,
  35621,
  35622,
  35623,
  35624,
  35625,
  35626,
  35627,
  35628,
  35629,
  35630,
  35631,
  35632,
  35633,
  35634,
  35635,
  35636,
  35637,
  35638,
  35639,
  35640,
  35641,
  35642,
  35643,
  35644,
  35645,
  35646,
  35647,
  35648,
  35649,
  35650,
  35651,
  35652,
  35653,
  35654,
  35655,
  35656,
  35657,
  35658,
  35659,
  35660,
  35661,
  35662,
  35663,
  35664,
  35665,
  35666,
  35667,
  35668,
  35669,
  35670,
  35671,
  35672,
  35673,
  35674,
  35675,
  35676,
  35677,
  35678,
  35679,
  35680,
  35681,
  35682,
  35683,
  35684,
  35685,
  35686,
  35687,
  35688,
  35689,
  35690,
  35691,
  35692,
  35693,
  35694,
  35695,
  35696,
  35697,
  35698,
  35699,
  35700,
  35701,
  35702,
  35703,
  35704,
  35705,
  35706,
  35707,
  35708,
  35709,
  35710,
  35711,
  35712,
  35713,
  35714,
  35715,
  35716,
  35717,
  35718,
  35719,
  35720,
  35721,
  35722,
  35723,
  35724,
  35725,
  35726,
  35727,
  35728,
  35729,
  35730,
  35731,
  35732,
  35733,
  35734,
  35735,
  35736,
  35737,
  35738,
  35739,
  35740,
  35741,
  35742,
  35743,
  35744,
  35745,
  35746,
  35747,
  35748,
  35749,
  35750,
  35751,
  35752,
  35753,
  35754,
  35755,
  35756,
  35757,
  35758,
  35759,
  35760,
  35761,
  35762,
  35763,
  35764,
  35765,
  35766,
  35767,
  35768,
  35769,
  35770,
  35771,
  35772,
  35773,
  35774,
  35775,
  35776,
  35777,
  35778,
  35779,
  35780,
  35781,
  35782,
  35783,
  35784,
  35785,
  35786,
  35787,
  35788,
  35789,
  35790,
  35791,
  35792,
  35793,
  35794,
  35795,
  35796,
  35797,
  35798,
  35799,
  35800,
  35801,
  35802,
  35803,
  35804,
  35805,
  35806,
  35807,
  35808,
  35809,
  35810,
  35811,
  35812,
  35813,
  35814,
  35815,
  35816,
  35817,
  35818,
  35819,
  35820,
  35821,
  35822,
  35823,
  35824,
  35825,
  35826,
  35827,
  35828,
  35829,
  35830,
  35831,
  35832,
  35833,
  35834,
  35835,
  35836,
  35837,
  35838,
  35839,
  35840,
  35841,
  35842,
  35843,
  35844,
  35845,
  35846,
  35847,
  35848,
  35849,
  35850,
  35851,
  35852,
  35853,
  35854,
  35855,
  35856,
  35857,
  35858,
  35859,
  35860,
  35861,
  35862,
  35863,
  35864,
  35865,
  35866,
  35867,
  35868,
  35869,
  35870,
  35871,
  35872,
  35873,
  35874,
  35875,
  35876,
  35877,
  35878,
  35879,
  35880,
  35881,
  35882,
  35883,
  35884,
  35885,
  35886,
  35887,
  35888,
  35889,
  35890,
  35891,
  35892,
  35893,
  35894,
  35895,
  35896,
  35897,
  35898,
  35899,
  35900,
  35901,
  35902,
  35903,
  35904,
  35905,
  35906,
  35907,
  35908,
  35909,
  35910,
  35911,
  35912,
  35913,
  35914,
  35915,
  35916,
  35917,
  35918,
  35919,
  35920,
  35921,
  35922,
  35923,
  35924,
  35925,
  35926,
  35927,
  35928,
  35929,
  35930,
  35931,
  35932,
  35933,
  35934,
  35935,
  35936,
  35937,
  35938,
  35939,
  35940,
  35941,
  35942,
  35943,
  35944,
  35945,
  35946,
  35947,
  35948,
  35949,
  35950,
  35951,
  35952,
  35953,
  35954,
  35955,
  35956,
  35957,
  35958,
  35959,
  35960,
  35961,
  35962,
  35963,
  35964,
  35965,
  35966,
  35967,
  35968,
  35969,
  35970,
  35971,
  35972,
  35973,
  35974,
  35975,
  35976,
  35977,
  35978,
  35979,
  35980,
  35981,
  35982,
  35983,
  35984,
  35985,
  35986,
  35987,
  35988,
  35989,
  35990,
  35991,
  35992,
  35993,
  35994,
  35995,
  35996,
  35997,
  35998,
  35999,
  36000,
  36001,
  36002,
  36003,
  36004,
  36005,
  36006,
  36007,
  36008,
  36009,
  36010,
  36011,
  36012,
  36013,
  36014,
  36015,
  36016,
  36017,
  36018,
  36019,
  36020,
  36021,
  36022,
  36023,
  36024,
  36025,
  36026,
  36027,
  36028,
  36029,
  36030,
  36031,
  36032,
  36033,
  36034,
  36035,
  36036,
  36037,
  36038,
  36039,
  36040,
  36041,
  36042,
  36043,
  36044,
  36045,
  36046,
  36047,
  36048,
  36049,
  36050,
  36051,
  36052,
  36053,
  36054,
  36055,
  36056,
  36057,
  36058,
  36059,
  36060,
  36061,
  36062,
  36063,
  36064,
  36065,
  36066,
  36067,
  36068,
  36069,
  36070,
  36071,
  36072,
  36073,
  36074,
  36075,
  36076,
  36077,
  36078,
  36079,
  36080,
  36081,
  36082,
  36083,
  36084,
  36085,
  36086,
  36087,
  36088,
  36089,
  36090,
  36091,
  36092,
  36093,
  36094,
  36095,
  36096,
  36097,
  36098,
  36099,
  36100,
  36101,
  36102,
  36103,
  36104,
  36105,
  36106,
  36107,
  36108,
  36109,
  36110,
  36111,
  36112,
  36113,
  36114,
  36115,
  36116,
  36117,
  36118,
  36119,
  36120,
  36121,
  36122,
  36123,
  36124,
  36125,
  36126,
  36127,
  36128,
  36129,
  36130,
  36131,
  36132,
  36133,
  36134,
  36135,
  36136,
  36137,
  36138,
  36139,
  36140,
  36141,
  36142,
  36143,
  36144,
  36145,
  36146,
  36147,
  36148,
  36149,
  36150,
  36151,
  36152,
  36153,
  36154,
  36155,
  36156,
  36157,
  36158,
  36159,
  36160,
  36161,
  36162,
  36163,
  36164,
  36165,
  36166,
  36167,
  36168,
  36169,
  36170,
  36171,
  36172,
  36173,
  36174,
  36175,
  36176,
  36177,
  36178,
  36179,
  36180,
  36181,
  36182,
  36183,
  36184,
  36185,
  36186,
  36187,
  36188,
  36189,
  36190,
  36191,
  36192,
  36193,
  36194,
  36195,
  36196,
  36197,
  36198,
  36199,
  36200,
  36201,
  36202,
  36203,
  36204,
  36205,
  36206,
  36207,
  36208,
  36209,
  36210,
  36211,
  36212,
  36213,
  36214,
  36215,
  36216,
  36217,
  36218,
  36219,
  36220,
  36221,
  36222,
  36223,
  36224,
  36225,
  36226,
  36227,
  36228,
  36229,
  36230,
  36231,
  36232,
  36233,
  36234,
  36235,
  36236,
  36237,
  36238,
  36239,
  36240,
  36241,
  36242,
  36243,
  36244,
  36245,
  36246,
  36247,
  36248,
  36249,
  36250,
  36251,
  36252,
  36253,
  36254,
  36255,
  36256,
  36257,
  36258,
  36259,
  36260,
  36261,
  36262,
  36263,
  36264,
  36265,
  36266,
  36267,
  36268,
  36269,
  36270,
  36271,
  36272,
  36273,
  36274,
  36275,
  36276,
  36277,
  36278,
  36279,
  36280,
  36281,
  36282,
  36283,
  36284,
  36285,
  36286,
  36287,
  36288,
  36289,
  36290,
  36291,
  36292,
  36293,
  36294,
  36295,
  36296,
  36297,
  36298,
  36299,
  36300,
  36301,
  36302,
  36303,
  36304,
  36305,
  36306,
  36307,
  36308,
  36309,
  36310,
  36311,
  36312,
  36313,
  36314,
  36315,
  36316,
  36317,
  36318,
  36319,
  36320,
  36321,
  36322,
  36323,
  36324,
  36325,
  36326,
  36327,
  36328,
  36329,
  36330,
  36331,
  36332,
  36333,
  36334,
  36335,
  36336,
  36337,
  36338,
  36339,
  36340,
  36341,
  36342,
  36343,
  36344,
  36345,
  36346,
  36347,
  36348,
  36349,
  36350,
  36351,
  36352,
  36353,
  36354,
  36355,
  36356,
  36357,
  36358,
  36359,
  36360,
  36361,
  36362,
  36363,
  36364,
  36365,
  36366,
  36367,
  36368,
  36369,
  36370,
  36371,
  36372,
  36373,
  36374,
  36375,
  36376,
  36377,
  36378,
  36379,
  36380,
  36381,
  36382,
  36383,
  36384,
  36385,
  36386,
  36387,
  36388,
  36389,
  36390,
  36391,
  36392,
  36393,
  36394,
  36395,
  36396,
  36397,
  36398,
  36399,
  36400,
  36401,
  36402,
  36403,
  36404,
  36405,
  36406,
  36407,
  36408,
  36409,
  36410,
  36411,
  36412,
  36413,
  36414,
  36415,
  36416,
  36417,
  36418,
  36419,
  36420,
  36421,
  36422,
  36423,
  36424,
  36425,
  36426,
  36427,
  36428,
  36429,
  36430,
  36431,
  36432,
  36433,
  36434,
  36435,
  36436,
  36437,
  36438,
  36439,
  36440,
  36441,
  36442,
  36443,
  36444,
  36445,
  36446,
  36447,
  36448,
  36449,
  36450,
  36451,
  36452,
  36453,
  36454,
  36455,
  36456,
  36457,
  36458,
  36459,
  36460,
  36461,
  36462,
  36463,
  36464,
  36465,
  36466,
  36467,
  36468,
  36469,
  36470,
  36471,
  36472,
  36473,
  36474,
  36475,
  36476,
  36477,
  36478,
  36479,
  36480,
  36481,
  36482,
  36483,
  36484,
  36485,
  36486,
  36487,
  36488,
  36489,
  36490,
  36491,
  36492,
  36493,
  36494,
  36495,
  36496,
  36497,
  36498,
  36499,
  36500,
  36501,
  36502,
  36503,
  36504,
  36505,
  36506,
  36507,
  36508,
  36509,
  36510,
  36511,
  36512,
  36513,
  36514,
  36515,
  36516,
  36517,
  36518,
  36519,
  36520,
  36521,
  36522,
  36523,
  36524,
  36525,
  36526,
  36527,
  36528,
  36529,
  36530,
  36531,
  36532,
  36533,
  36534,
  36535,
  36536,
  36537,
  36538,
  36539,
  36540,
  36541,
  36542,
  36543,
  36544,
  36545,
  36546,
  36547,
  36548,
  36549,
  36550,
  36551,
  36552,
  36553,
  36554,
  36555,
  36556,
  36557,
  36558,
  36559,
  36560,
  36561,
  36562,
  36563,
  36564,
  36565,
  36566,
  36567,
  36568,
  36569,
  36570,
  36571,
  36572,
  36573,
  36574,
  36575,
  36576,
  36577,
  36578,
  36579,
  36580,
  36581,
  36582,
  36583,
  36584,
  36585,
  36586,
  36587,
  36588,
  36589,
  36590,
  36591,
  36592,
  36593,
  36594,
  36595,
  36596,
  36597,
  36598,
  36599,
  36600,
  36601,
  36602,
  36603,
  36604,
  36605,
  36606,
  36607,
  36608,
  36609,
  36610,
  36611,
  36612,
  36613,
  36614,
  36615,
  36616,
  36617,
  36618,
  36619,
  36620,
  36621,
  36622,
  36623,
  36624,
  36625,
  36626,
  36627,
  36628,
  36629,
  36630,
  36631,
  36632,
  36633,
  36634,
  36635,
  36636,
  36637,
  36638,
  36639,
  36640,
  36641,
  36642,
  36643,
  36644,
  36645,
  36646,
  36647,
  36648,
  36649,
  36650,
  36651,
  36652,
  36653,
  36654,
  36655,
  36656,
  36657,
  36658,
  36659,
  36660,
  36661,
  36662,
  36663,
  36664,
  36665,
  36666,
  36667,
  36668,
  36669,
  36670,
  36671,
  36672,
  36673,
  36674,
  36675,
  36676,
  36677,
  36678,
  36679,
  36680,
  36681,
  36682,
  36683,
  36684,
  36685,
  36686,
  36687,
  36688,
  36689,
  36690,
  36691,
  36692,
  36693,
  36694,
  36695,
  36696,
  36697,
  36698,
  36699,
  36700,
  36701,
  36702,
  36703,
  36704,
  36705,
  36706,
  36707,
  36708,
  36709,
  36710,
  36711,
  36712,
  36713,
  36714,
  36715,
  36716,
  36717,
  36718,
  36719,
  36720,
  36721,
  36722,
  36723,
  36724,
  36725,
  36726,
  36727,
  36728,
  36729,
  36730,
  36731,
  36732,
  36733,
  36734,
  36735,
  36736,
  36737,
  36738,
  36739,
  36740,
  36741,
  36742,
  36743,
  36744,
  36745,
  36746,
  36747,
  36748,
  36749,
  36750,
  36751,
  36752,
  36753,
  36754,
  36755,
  36756,
  36757,
  36758,
  36759,
  36760,
  36761,
  36762,
  36763,
  36764,
  36765,
  36766,
  36767,
  36768,
  36769,
  36770,
  36771,
  36772,
  36773,
  36774,
  36775,
  36776,
  36777,
  36778,
  36779,
  36780,
  36781,
  36782,
  36783,
  36784,
  36785,
  36786,
  36787,
  36788,
  36789,
  36790,
  36791,
  36792,
  36793,
  36794,
  36795,
  36796,
  36797,
  36798,
  36799,
  36800,
  36801,
  36802,
  36803,
  36804,
  36805,
  36806,
  36807,
  36808,
  36809,
  36810,
  36811,
  36812,
  36813,
  36814,
  36815,
  36816,
  36817,
  36818,
  36819,
  36820,
  36821,
  36822,
  36823,
  36824,
  36825,
  36826,
  36827,
  36828,
  36829,
  36830,
  36831,
  36832,
  36833,
  36834,
  36835,
  36836,
  36837,
  36838,
  36839,
  36840,
  36841,
  36842,
  36843,
  36844,
  36845,
  36846,
  36847,
  36848,
  36849,
  36850,
  36851,
  36852,
  36853,
  36854,
  36855,
  36856,
  36857,
  36858,
  36859,
  36860,
  36861,
  36862,
  36863,
  36864,
  36865,
  36866,
  36867,
  36868,
  36869,
  36870,
  36871,
  36872,
  36873,
  36874,
  36875,
  36876,
  36877,
  36878,
  36879,
  36880,
  36881,
  36882,
  36883,
  36884,
  36885,
  36886,
  36887,
  36888,
  36889,
  36890,
  36891,
  36892,
  36893,
  36894,
  36895,
  36896,
  36897,
  36898,
  36899,
  36900,
  36901,
  36902,
  36903,
  36904,
  36905,
  36906,
  36907,
  36908,
  36909,
  36910,
  36911,
  36912,
  36913,
  36914,
  36915,
  36916,
  36917,
  36918,
  36919,
  36920,
  36921,
  36922,
  36923,
  36924,
  36925,
  36926,
  36927,
  36928,
  36929,
  36930,
  36931,
  36932,
  36933,
  36934,
  36935,
  36936,
  36937,
  36938,
  36939,
  36940,
  36941,
  36942,
  36943,
  36944,
  36945,
  36946,
  36947,
  36948,
  36949,
  36950,
  36951,
  36952,
  36953,
  36954,
  36955,
  36956,
  36957,
  36958,
  36959,
  36960,
  36961,
  36962,
  36963,
  36964,
  36965,
  36966,
  36967,
  36968,
  36969,
  36970,
  36971,
  36972,
  36973,
  36974,
  36975,
  36976,
  36977,
  36978,
  36979,
  36980,
  36981,
  36982,
  36983,
  36984,
  36985,
  36986,
  36987,
  36988,
  36989,
  36990,
  36991,
  36992,
  36993,
  36994,
  36995,
  36996,
  36997,
  36998,
  36999,
  37000,
  37001,
  37002,
  37003,
  37004,
  37005,
  37006,
  37007,
  37008,
  37009,
  37010,
  37011,
  37012,
  37013,
  37014,
  37015,
  37016,
  37017,
  37018,
  37019,
  37020,
  37021,
  37022,
  37023,
  37024,
  37025,
  37026,
  37027,
  37028,
  37029,
  37030,
  37031,
  37032,
  37033,
  37034,
  37035,
  37036,
  37037,
  37038,
  37039,
  37040,
  37041,
  37042,
  37043,
  37044,
  37045,
  37046,
  37047,
  37048,
  37049,
  37050,
  37051,
  37052,
  37053,
  37054,
  37055,
  37056,
  37057,
  37058,
  37059,
  37060,
  37061,
  37062,
  37063,
  37064,
  37065,
  37066,
  37067,
  37068,
  37069,
  37070,
  37071,
  37072,
  37073,
  37074,
  37075,
  37076,
  37077,
  37078,
  37079,
  37080,
  37081,
  37082,
  37083,
  37084,
  37085,
  37086,
  37087,
  37088,
  37089,
  37090,
  37091,
  37092,
  37093,
  37094,
  37095,
  37096,
  37097,
  37098,
  37099,
  37100,
  37101,
  37102,
  37103,
  37104,
  37105,
  37106,
  37107,
  37108,
  37109,
  37110,
  37111,
  37112,
  37113,
  37114,
  37115,
  37116,
  37117,
  37118,
  37119,
  37120,
  37121,
  37122,
  37123,
  37124,
  37125,
  37126,
  37127,
  37128,
  37129,
  37130,
  37131,
  37132,
  37133,
  37134,
  37135,
  37136,
  37137,
  37138,
  37139,
  37140,
  37141,
  37142,
  37143,
  37144,
  37145,
  37146,
  37147,
  37148,
  37149,
  37150,
  37151,
  37152,
  37153,
  37154,
  37155,
  37156,
  37157,
  37158,
  37159,
  37160,
  37161,
  37162,
  37163,
  37164,
  37165,
  37166,
  37167,
  37168,
  37169,
  37170,
  37171,
  37172,
  37173,
  37174,
  37175,
  37176,
  37177,
  37178,
  37179,
  37180,
  37181,
  37182,
  37183,
  37184,
  37185,
  37186,
  37187,
  37188,
  37189,
  37190,
  37191,
  37192,
  37193,
  37194,
  37195,
  37196,
  37197,
  37198,
  37199,
  37200,
  37201,
  37202,
  37203,
  37204,
  37205,
  37206,
  37207,
  37208,
  37209,
  37210,
  37211,
  37212,
  37213,
  37214,
  37215,
  37216,
  37217,
  37218,
  37219,
  37220,
  37221,
  37222,
  37223,
  37224,
  37225,
  37226,
  37227,
  37228,
  37229,
  37230,
  37231,
  37232,
  37233,
  37234,
  37235,
  37236,
  37237,
  37238,
  37239,
  37240,
  37241,
  37242,
  37243,
  37244,
  37245,
  37246,
  37247,
  37248,
  37249,
  37250,
  37251,
  37252,
  37253,
  37254,
  37255,
  37256,
  37257,
  37258,
  37259,
  37260,
  37261,
  37262,
  37263,
  37264,
  37265,
  37266,
  37267,
  37268,
  37269,
  37270,
  37271,
  37272,
  37273,
  37274,
  37275,
  37276,
  37277,
  37278,
  37279,
  37280,
  37281,
  37282,
  37283,
  37284,
  37285,
  37286,
  37287,
  37288,
  37289,
  37290,
  37291,
  37292,
  37293,
  37294,
  37295,
  37296,
  37297,
  37298,
  37299,
  37300,
  37301,
  37302,
  37303,
  37304,
  37305,
  37306,
  37307,
  37308,
  37309,
  37310,
  37311,
  37312,
  37313,
  37314,
  37315,
  37316,
  37317,
  37318,
  37319,
  37320,
  37321,
  37322,
  37323,
  37324,
  37325,
  37326,
  37327,
  37328,
  37329,
  37330,
  37331,
  37332,
  37333,
  37334,
  37335,
  37336,
  37337,
  37338,
  37339,
  37340,
  37341,
  37342,
  37343,
  37344,
  37345,
  37346,
  37347,
  37348,
  37349,
  37350,
  37351,
  37352,
  37353,
  37354,
  37355,
  37356,
  37357,
  37358,
  37359,
  37360,
  37361,
  37362,
  37363,
  37364,
  37365,
  37366,
  37367,
  37368,
  37369,
  37370,
  37371,
  37372,
  37373,
  37374,
  37375,
  37376,
  37377,
  37378,
  37379,
  37380,
  37381,
  37382,
  37383,
  37384,
  37385,
  37386,
  37387,
  37388,
  37389,
  37390,
  37391,
  37392,
  37393,
  37394,
  37395,
  37396,
  37397,
  37398,
  37399,
  37400,
  37401,
  37402,
  37403,
  37404,
  37405,
  37406,
  37407,
  37408,
  37409,
  37410,
  37411,
  37412,
  37413,
  37414,
  37415,
  37416,
  37417,
  37418,
  37419,
  37420,
  37421,
  37422,
  37423,
  37424,
  37425,
  37426,
  37427,
  37428,
  37429,
  37430,
  37431,
  37432,
  37433,
  37434,
  37435,
  37436,
  37437,
  37438,
  37439,
  37440,
  37441,
  37442,
  37443,
  37444,
  37445,
  37446,
  37447,
  37448,
  37449,
  37450,
  37451,
  37452,
  37453,
  37454,
  37455,
  37456,
  37457,
  37458,
  37459,
  37460,
  37461,
  37462,
  37463,
  37464,
  37465,
  37466,
  37467,
  37468,
  37469,
  37470,
  37471,
  37472,
  37473,
  37474,
  37475,
  37476,
  37477,
  37478,
  37479,
  37480,
  37481,
  37482,
  37483,
  37484,
  37485,
  37486,
  37487,
  37488,
  37489,
  37490,
  37491,
  37492,
  37493,
  37494,
  37495,
  37496,
  37497,
  37498,
  37499,
  37500,
  37501,
  37502,
  37503,
  37504,
  37505,
  37506,
  37507,
  37508,
  37509,
  37510,
  37511,
  37512,
  37513,
  37514,
  37515,
  37516,
  37517,
  37518,
  37519,
  37520,
  37521,
  37522,
  37523,
  37524,
  37525,
  37526,
  37527,
  37528,
  37529,
  37530,
  37531,
  37532,
  37533,
  37534,
  37535,
  37536,
  37537,
  37538,
  37539,
  37540,
  37541,
  37542,
  37543,
  37544,
  37545,
  37546,
  37547,
  37548,
  37549,
  37550,
  37551,
  37552,
  37553,
  37554,
  37555,
  37556,
  37557,
  37558,
  37559,
  37560,
  37561,
  37562,
  37563,
  37564,
  37565,
  37566,
  37567,
  37568,
  37569,
  37570,
  37571,
  37572,
  37573,
  37574,
  37575,
  37576,
  37577,
  37578,
  37579,
  37580,
  37581,
  37582,
  37583,
  37584,
  37585,
  37586,
  37587,
  37588,
  37589,
  37590,
  37591,
  37592,
  37593,
  37594,
  37595,
  37596,
  37597,
  37598,
  37599,
  37600,
  37601,
  37602,
  37603,
  37604,
  37605,
  37606,
  37607,
  37608,
  37609,
  37610,
  37611,
  37612,
  37613,
  37614,
  37615,
  37616,
  37617,
  37618,
  37619,
  37620,
  37621,
  37622,
  37623,
  37624,
  37625,
  37626,
  37627,
  37628,
  37629,
  37630,
  37631,
  37632,
  37633,
  37634,
  37635,
  37636,
  37637,
  37638,
  37639,
  37640,
  37641,
  37642,
  37643,
  37644,
  37645,
  37646,
  37647,
  37648,
  37649,
  37650,
  37651,
  37652,
  37653,
  37654,
  37655,
  37656,
  37657,
  37658,
  37659,
  37660,
  37661,
  37662,
  37663,
  37664,
  37665,
  37666,
  37667,
  37668,
  37669,
  37670,
  37671,
  37672,
  37673,
  37674,
  37675,
  37676,
  37677,
  37678,
  37679,
  37680,
  37681,
  37682,
  37683,
  37684,
  37685,
  37686,
  37687,
  37688,
  37689,
  37690,
  37691,
  37692,
  37693,
  37694,
  37695,
  37696,
  37697,
  37698,
  37699,
  37700,
  37701,
  37702,
  37703,
  37704,
  37705,
  37706,
  37707,
  37708,
  37709,
  37710,
  37711,
  37712,
  37713,
  37714,
  37715,
  37716,
  37717,
  37718,
  37719,
  37720,
  37721,
  37722,
  37723,
  37724,
  37725,
  37726,
  37727,
  37728,
  37729,
  37730,
  37731,
  37732,
  37733,
  37734,
  37735,
  37736,
  37737,
  37738,
  37739,
  37740,
  37741,
  37742,
  37743,
  37744,
  37745,
  37746,
  37747,
  37748,
  37749,
  37750,
  37751,
  37752,
  37753,
  37754,
  37755,
  37756,
  37757,
  37758,
  37759,
  37760,
  37761,
  37762,
  37763,
  37764,
  37765,
  37766,
  37767,
  37768,
  37769,
  37770,
  37771,
  37772,
  37773,
  37774,
  37775,
  37776,
  37777,
  37778,
  37779,
  37780,
  37781,
  37782,
  37783,
  37784,
  37785,
  37786,
  37787,
  37788,
  37789,
  37790,
  37791,
  37792,
  37793,
  37794,
  37795,
  37796,
  37797,
  37798,
  37799,
  37800,
  37801,
  37802,
  37803,
  37804,
  37805,
  37806,
  37807,
  37808,
  37809,
  37810,
  37811,
  37812,
  37813,
  37814,
  37815,
  37816,
  37817,
  37818,
  37819,
  37820,
  37821,
  37822,
  37823,
  37824,
  37825,
  37826,
  37827,
  37828,
  37829,
  37830,
  37831,
  37832,
  37833,
  37834,
  37835,
  37836,
  37837,
  37838,
  37839,
  37840,
  37841,
  37842,
  37843,
  37844,
  37845,
  37846,
  37847,
  37848,
  37849,
  37850,
  37851,
  37852,
  37853,
  37854,
  37855,
  37856,
  37857,
  37858,
  37859,
  37860,
  37861,
  37862,
  37863,
  37864,
  37865,
  37866,
  37867,
  37868,
  37869,
  37870,
  37871,
  37872,
  37873,
  37874,
  37875,
  37876,
  37877,
  37878,
  37879,
  37880,
  37881,
  37882,
  37883,
  37884,
  37885,
  37886,
  37887,
  37888,
  37889,
  37890,
  37891,
  37892,
  37893,
  37894,
  37895,
  37896,
  37897,
  37898,
  37899,
  37900,
  37901,
  37902,
  37903,
  37904,
  37905,
  37906,
  37907,
  37908,
  37909,
  37910,
  37911,
  37912,
  37913,
  37914,
  37915,
  37916,
  37917,
  37918,
  37919,
  37920,
  37921,
  37922,
  37923,
  37924,
  37925,
  37926,
  37927,
  37928,
  37929,
  37930,
  37931,
  37932,
  37933,
  37934,
  37935,
  37936,
  37937,
  37938,
  37939,
  37940,
  37941,
  37942,
  37943,
  37944,
  37945,
  37946,
  37947,
  37948,
  37949,
  37950,
  37951,
  37952,
  37953,
  37954,
  37955,
  37956,
  37957,
  37958,
  37959,
  37960,
  37961,
  37962,
  37963,
  37964,
  37965,
  37966,
  37967,
  37968,
  37969,
  37970,
  37971,
  37972,
  37973,
  37974,
  37975,
  37976,
  37977,
  37978,
  37979,
  37980,
  37981,
  37982,
  37983,
  37984,
  37985,
  37986,
  37987,
  37988,
  37989,
  37990,
  37991,
  37992,
  37993,
  37994,
  37995,
  37996,
  37997,
  37998,
  37999,
  38000,
  38001,
  38002,
  38003,
  38004,
  38005,
  38006,
  38007,
  38008,
  38009,
  38010,
  38011,
  38012,
  38013,
  38014,
  38015,
  38016,
  38017,
  38018,
  38019,
  38020,
  38021,
  38022,
  38023,
  38024,
  38025,
  38026,
  38027,
  38028,
  38029,
  38030,
  38031,
  38032,
  38033,
  38034,
  38035,
  38036,
  38037,
  38038,
  38039,
  38040,
  38041,
  38042,
  38043,
  38044,
  38045,
  38046,
  38047,
  38048,
  38049,
  38050,
  38051,
  38052,
  38053,
  38054,
  38055,
  38056,
  38057,
  38058,
  38059,
  38060,
  38061,
  38062,
  38063,
  38064,
  38065,
  38066,
  38067,
  38068,
  38069,
  38070,
  38071,
  38072,
  38073,
  38074,
  38075,
  38076,
  38077,
  38078,
  38079,
  38080,
  38081,
  38082,
  38083,
  38084,
  38085,
  38086,
  38087,
  38088,
  38089,
  38090,
  38091,
  38092,
  38093,
  38094,
  38095,
  38096,
  38097,
  38098,
  38099,
  38100,
  38101,
  38102,
  38103,
  38104,
  38105,
  38106,
  38107,
  38108,
  38109,
  38110,
  38111,
  38112,
  38113,
  38114,
  38115,
  38116,
  38117,
  38118,
  38119,
  38120,
  38121,
  38122,
  38123,
  38124,
  38125,
  38126,
  38127,
  38128,
  38129,
  38130,
  38131,
  38132,
  38133,
  38134,
  38135,
  38136,
  38137,
  38138,
  38139,
  38140,
  38141,
  38142,
  38143,
  38144,
  38145,
  38146,
  38147,
  38148,
  38149,
  38150,
  38151,
  38152,
  38153,
  38154,
  38155,
  38156,
  38157,
  38158,
  38159,
  38160,
  38161,
  38162,
  38163,
  38164,
  38165,
  38166,
  38167,
  38168,
  38169,
  38170,
  38171,
  38172,
  38173,
  38174,
  38175,
  38176,
  38177,
  38178,
  38179,
  38180,
  38181,
  38182,
  38183,
  38184,
  38185,
  38186,
  38187,
  38188,
  38189,
  38190,
  38191,
  38192,
  38193,
  38194,
  38195,
  38196,
  38197,
  38198,
  38199,
  38200,
  38201,
  38202,
  38203,
  38204,
  38205,
  38206,
  38207,
  38208,
  38209,
  38210,
  38211,
  38212,
  38213,
  38214,
  38215,
  38216,
  38217,
  38218,
  38219,
  38220,
  38221,
  38222,
  38223,
  38224,
  38225,
  38226,
  38227,
  38228,
  38229,
  38230,
  38231,
  38232,
  38233,
  38234,
  38235,
  38236,
  38237,
  38238,
  38239,
  38240,
  38241,
  38242,
  38243,
  38244,
  38245,
  38246,
  38247,
  38248,
  38249,
  38250,
  38251,
  38252,
  38253,
  38254,
  38255,
  38256,
  38257,
  38258,
  38259,
  38260,
  38261,
  38262,
  38263,
  38264,
  38265,
  38266,
  38267,
  38268,
  38269,
  38270,
  38271,
  38272,
  38273,
  38274,
  38275,
  38276,
  38277,
  38278,
  38279,
  38280,
  38281,
  38282,
  38283,
  38284,
  38285,
  38286,
  38287,
  38288,
  38289,
  38290,
  38291,
  38292,
  38293,
  38294,
  38295,
  38296,
  38297,
  38298,
  38299,
  38300,
  38301,
  38302,
  38303,
  38304,
  38305,
  38306,
  38307,
  38308,
  38309,
  38310,
  38311,
  38312,
  38313,
  38314,
  38315,
  38316,
  38317,
  38318,
  38319,
  38320,
  38321,
  38322,
  38323,
  38324,
  38325,
  38326,
  38327,
  38328,
  38329,
  38330,
  38331,
  38332,
  38333,
  38334,
  38335,
  38336,
  38337,
  38338,
  38339,
  38340,
  38341,
  38342,
  38343,
  38344,
  38345,
  38346,
  38347,
  38348,
  38349,
  38350,
  38351,
  38352,
  38353,
  38354,
  38355,
  38356,
  38357,
  38358,
  38359,
  38360,
  38361,
  38362,
  38363,
  38364,
  38365,
  38366,
  38367,
  38368,
  38369,
  38370,
  38371,
  38372,
  38373,
  38374,
  38375,
  38376,
  38377,
  38378,
  38379,
  38380,
  38381,
  38382,
  38383,
  38384,
  38385,
  38386,
  38387,
  38388,
  38389,
  38390,
  38391,
  38392,
  38393,
  38394,
  38395,
  38396,
  38397,
  38398,
  38399,
  38400,
  38401,
  38402,
  38403,
  38404,
  38405,
  38406,
  38407,
  38408,
  38409,
  38410,
  38411,
  38412,
  38413,
  38414,
  38415,
  38416,
  38417,
  38418,
  38419,
  38420,
  38421,
  38422,
  38423,
  38424,
  38425,
  38426,
  38427,
  38428,
  38429,
  38430,
  38431,
  38432,
  38433,
  38434,
  38435,
  38436,
  38437,
  38438,
  38439,
  38440,
  38441,
  38442,
  38443,
  38444,
  38445,
  38446,
  38447,
  38448,
  38449,
  38450,
  38451,
  38452,
  38453,
  38454,
  38455,
  38456,
  38457,
  38458,
  38459,
  38460,
  38461,
  38462,
  38463,
  38464,
  38465,
  38466,
  38467,
  38468,
  38469,
  38470,
  38471,
  38472,
  38473,
  38474,
  38475,
  38476,
  38477,
  38478,
  38479,
  38480,
  38481,
  38482,
  38483,
  38484,
  38485,
  38486,
  38487,
  38488,
  38489,
  38490,
  38491,
  38492,
  38493,
  38494,
  38495,
  38496,
  38497,
  38498,
  38499,
  38500,
  38501,
  38502,
  38503,
  38504,
  38505,
  38506,
  38507,
  38508,
  38509,
  38510,
  38511,
  38512,
  38513,
  38514,
  38515,
  38516,
  38517,
  38518,
  38519,
  38520,
  38521,
  38522,
  38523,
  38524,
  38525,
  38526,
  38527,
  38528,
  38529,
  38530,
  38531,
  38532,
  38533,
  38534,
  38535,
  38536,
  38537,
  38538,
  38539,
  38540,
  38541,
  38542,
  38543,
  38544,
  38545,
  38546,
  38547,
  38548,
  38549,
  38550,
  38551,
  38552,
  38553,
  38554,
  38555,
  38556,
  38557,
  38558,
  38559,
  38560,
  38561,
  38562,
  38563,
  38564,
  38565,
  38566,
  38567,
  38568,
  38569,
  38570,
  38571,
  38572,
  38573,
  38574,
  38575,
  38576,
  38577,
  38578,
  38579,
  38580,
  38581,
  38582,
  38583,
  38584,
  38585,
  38586,
  38587,
  38588,
  38589,
  38590,
  38591,
  38592,
  38593,
  38594,
  38595,
  38596,
  38597,
  38598,
  38599,
  38600,
  38601,
  38602,
  38603,
  38604,
  38605,
  38606,
  38607,
  38608,
  38609,
  38610,
  38611,
  38612,
  38613,
  38614,
  38615,
  38616,
  38617,
  38618,
  38619,
  38620,
  38621,
  38622,
  38623,
  38624,
  38625,
  38626,
  38627,
  38628,
  38629,
  38630,
  38631,
  38632,
  38633,
  38634,
  38635,
  38636,
  38637,
  38638,
  38639,
  38640,
  38641,
  38642,
  38643,
  38644,
  38645,
  38646,
  38647,
  38648,
  38649,
  38650,
  38651,
  38652,
  38653,
  38654,
  38655,
  38656,
  38657,
  38658,
  38659,
  38660,
  38661,
  38662,
  38663,
  38664,
  38665,
  38666,
  38667,
  38668,
  38669,
  38670,
  38671,
  38672,
  38673,
  38674,
  38675,
  38676,
  38677,
  38678,
  38679,
  38680,
  38681,
  38682,
  38683,
  38684,
  38685,
  38686,
  38687,
  38688,
  38689,
  38690,
  38691,
  38692,
  38693,
  38694,
  38695,
  38696,
  38697,
  38698,
  38699,
  38700,
  38701,
  38702,
  38703,
  38704,
  38705,
  38706,
  38707,
  38708,
  38709,
  38710,
  38711,
  38712,
  38713,
  38714,
  38715,
  38716,
  38717,
  38718,
  38719,
  38720,
  38721,
  38722,
  38723,
  38724,
  38725,
  38726,
  38727,
  38728,
  38729,
  38730,
  38731,
  38732,
  38733,
  38734,
  38735,
  38736,
  38737,
  38738,
  38739,
  38740,
  38741,
  38742,
  38743,
  38744,
  38745,
  38746,
  38747,
  38748,
  38749,
  38750,
  38751,
  38752,
  38753,
  38754,
  38755,
  38756,
  38757,
  38758,
  38759,
  38760,
  38761,
  38762,
  38763,
  38764,
  38765,
  38766,
  38767,
  38768,
  38769,
  38770,
  38771,
  38772,
  38773,
  38774,
  38775,
  38776,
  38777,
  38778,
  38779,
  38780,
  38781,
  38782,
  38783,
  38784,
  38785,
  38786,
  38787,
  38788,
  38789,
  38790,
  38791,
  38792,
  38793,
  38794,
  38795,
  38796,
  38797,
  38798,
  38799,
  38800,
  38801,
  38802,
  38803,
  38804,
  38805,
  38806,
  38807,
  38808,
  38809,
  38810,
  38811,
  38812,
  38813,
  38814,
  38815,
  38816,
  38817,
  38818,
  38819,
  38820,
  38821,
  38822,
  38823,
  38824,
  38825,
  38826,
  38827,
  38828,
  38829,
  38830,
  38831,
  38832,
  38833,
  38834,
  38835,
  38836,
  38837,
  38838,
  38839,
  38840,
  38841,
  38842,
  38843,
  38844,
  38845,
  38846,
  38847,
  38848,
  38849,
  38850,
  38851,
  38852,
  38853,
  38854,
  38855,
  38856,
  38857,
  38858,
  38859,
  38860,
  38861,
  38862,
  38863,
  38864,
  38865,
  38866,
  38867,
  38868,
  38869,
  38870,
  38871,
  38872,
  38873,
  38874,
  38875,
  38876,
  38877,
  38878,
  38879,
  38880,
  38881,
  38882,
  38883,
  38884,
  38885,
  38886,
  38887,
  38888,
  38889,
  38890,
  38891,
  38892,
  38893,
  38894,
  38895,
  38896,
  38897,
  38898,
  38899,
  38900,
  38901,
  38902,
  38903,
  38904,
  38905,
  38906,
  38907,
  38908,
  38909,
  38910,
  38911,
  38912,
  38913,
  38914,
  38915,
  38916,
  38917,
  38918,
  38919,
  38920,
  38921,
  38922,
  38923,
  38924,
  38925,
  38926,
  38927,
  38928,
  38929,
  38930,
  38931,
  38932,
  38933,
  38934,
  38935,
  38936,
  38937,
  38938,
  38939,
  38940,
  38941,
  38942,
  38943,
  38944,
  38945,
  38946,
  38947,
  38948,
  38949,
  38950,
  38951,
  38952,
  38953,
  38954,
  38955,
  38956,
  38957,
  38958,
  38959,
  38960,
  38961,
  38962,
  38963,
  38964,
  38965,
  38966,
  38967,
  38968,
  38969,
  38970,
  38971,
  38972,
  38973,
  38974,
  38975,
  38976,
  38977,
  38978,
  38979,
  38980,
  38981,
  38982,
  38983,
  38984,
  38985,
  38986,
  38987,
  38988,
  38989,
  38990,
  38991,
  38992,
  38993,
  38994,
  38995,
  38996,
  38997,
  38998,
  38999,
  39000,
  39001,
  39002,
  39003,
  39004,
  39005,
  39006,
  39007,
  39008,
  39009,
  39010,
  39011,
  39012,
  39013,
  39014,
  39015,
  39016,
  39017,
  39018,
  39019,
  39020,
  39021,
  39022,
  39023,
  39024,
  39025,
  39026,
  39027,
  39028,
  39029,
  39030,
  39031,
  39032,
  39033,
  39034,
  39035,
  39036,
  39037,
  39038,
  39039,
  39040,
  39041,
  39042,
  39043,
  39044,
  39045,
  39046,
  39047,
  39048,
  39049,
  39050,
  39051,
  39052,
  39053,
  39054,
  39055,
  39056,
  39057,
  39058,
  39059,
  39060,
  39061,
  39062,
  39063,
  39064,
  39065,
  39066,
  39067,
  39068,
  39069,
  39070,
  39071,
  39072,
  39073,
  39074,
  39075,
  39076,
  39077,
  39078,
  39079,
  39080,
  39081,
  39082,
  39083,
  39084,
  39085,
  39086,
  39087,
  39088,
  39089,
  39090,
  39091,
  39092,
  39093,
  39094,
  39095,
  39096,
  39097,
  39098,
  39099,
  39100,
  39101,
  39102,
  39103,
  39104,
  39105,
  39106,
  39107,
  39108,
  39109,
  39110,
  39111,
  39112,
  39113,
  39114,
  39115,
  39116,
  39117,
  39118,
  39119,
  39120,
  39121,
  39122,
  39123,
  39124,
  39125,
  39126,
  39127,
  39128,
  39129,
  39130,
  39131,
  39132,
  39133,
  39134,
  39135,
  39136,
  39137,
  39138,
  39139,
  39140,
  39141,
  39142,
  39143,
  39144,
  39145,
  39146,
  39147,
  39148,
  39149,
  39150,
  39151,
  39152,
  39153,
  39154,
  39155,
  39156,
  39157,
  39158,
  39159,
  39160,
  39161,
  39162,
  39163,
  39164,
  39165,
  39166,
  39167,
  39168,
  39169,
  39170,
  39171,
  39172,
  39173,
  39174,
  39175,
  39176,
  39177,
  39178,
  39179,
  39180,
  39181,
  39182,
  39183,
  39184,
  39185,
  39186,
  39187,
  39188,
  39189,
  39190,
  39191,
  39192,
  39193,
  39194,
  39195,
  39196,
  39197,
  39198,
  39199,
  39200,
  39201,
  39202,
  39203,
  39204,
  39205,
  39206,
  39207,
  39208,
  39209,
  39210,
  39211,
  39212,
  39213,
  39214,
  39215,
  39216,
  39217,
  39218,
  39219,
  39220,
  39221,
  39222,
  39223,
  39224,
  39225,
  39226,
  39227,
  39228,
  39229,
  39230,
  39231,
  39232,
  39233,
  39234,
  39235,
  39236,
  39237,
  39238,
  39239,
  39240,
  39241,
  39242,
  39243,
  39244,
  39245,
  39246,
  39247,
  39248,
  39249,
  39250,
  39251,
  39252,
  39253,
  39254,
  39255,
  39256,
  39257,
  39258,
  39259,
  39260,
  39261,
  39262,
  39263,
  39264,
  39265,
  39266,
  39267,
  39268,
  39269,
  39270,
  39271,
  39272,
  39273,
  39274,
  39275,
  39276,
  39277,
  39278,
  39279,
  39280,
  39281,
  39282,
  39283,
  39284,
  39285,
  39286,
  39287,
  39288,
  39289,
  39290,
  39291,
  39292,
  39293,
  39294,
  39295,
  39296,
  39297,
  39298,
  39299,
  39300,
  39301,
  39302,
  39303,
  39304,
  39305,
  39306,
  39307,
  39308,
  39309,
  39310,
  39311,
  39312,
  39313,
  39314,
  39315,
  39316,
  39317,
  39318,
  39319,
  39320,
  39321,
  39322,
  39323,
  39324,
  39325,
  39326,
  39327,
  39328,
  39329,
  39330,
  39331,
  39332,
  39333,
  39334,
  39335,
  39336,
  39337,
  39338,
  39339,
  39340,
  39341,
  39342,
  39343,
  39344,
  39345,
  39346,
  39347,
  39348,
  39349,
  39350,
  39351,
  39352,
  39353,
  39354,
  39355,
  39356,
  39357,
  39358,
  39359,
  39360,
  39361,
  39362,
  39363,
  39364,
  39365,
  39366,
  39367,
  39368,
  39369,
  39370,
  39371,
  39372,
  39373,
  39374,
  39375,
  39376,
  39377,
  39378,
  39379,
  39380,
  39381,
  39382,
  39383,
  39384,
  39385,
  39386,
  39387,
  39388,
  39389,
  39390,
  39391,
  39392,
  39393,
  39394,
  39395,
  39396,
  39397,
  39398,
  39399,
  39400,
  39401,
  39402,
  39403,
  39404,
  39405,
  39406,
  39407,
  39408,
  39409,
  39410,
  39411,
  39412,
  39413,
  39414,
  39415,
  39416,
  39417,
  39418,
  39419,
  39420,
  39421,
  39422,
  39423,
  39424,
  39425,
  39426,
  39427,
  39428,
  39429,
  39430,
  39431,
  39432,
  39433,
  39434,
  39435,
  39436,
  39437,
  39438,
  39439,
  39440,
  39441,
  39442,
  39443,
  39444,
  39445,
  39446,
  39447,
  39448,
  39449,
  39450,
  39451,
  39452,
  39453,
  39454,
  39455,
  39456,
  39457,
  39458,
  39459,
  39460,
  39461,
  39462,
  39463,
  39464,
  39465,
  39466,
  39467,
  39468,
  39469,
  39470,
  39471,
  39472,
  39473,
  39474,
  39475,
  39476,
  39477,
  39478,
  39479,
  39480,
  39481,
  39482,
  39483,
  39484,
  39485,
  39486,
  39487,
  39488,
  39489,
  39490,
  39491,
  39492,
  39493,
  39494,
  39495,
  39496,
  39497,
  39498,
  39499,
  39500,
  39501,
  39502,
  39503,
  39504,
  39505,
  39506,
  39507,
  39508,
  39509,
  39510,
  39511,
  39512,
  39513,
  39514,
  39515,
  39516,
  39517,
  39518,
  39519,
  39520,
  39521,
  39522,
  39523,
  39524,
  39525,
  39526,
  39527,
  39528,
  39529,
  39530,
  39531,
  39532,
  39533,
  39534,
  39535,
  39536,
  39537,
  39538,
  39539,
  39540,
  39541,
  39542,
  39543,
  39544,
  39545,
  39546,
  39547,
  39548,
  39549,
  39550,
  39551,
  39552,
  39553,
  39554,
  39555,
  39556,
  39557,
  39558,
  39559,
  39560,
  39561,
  39562,
  39563,
  39564,
  39565,
  39566,
  39567,
  39568,
  39569,
  39570,
  39571,
  39572,
  39573,
  39574,
  39575,
  39576,
  39577,
  39578,
  39579,
  39580,
  39581,
  39582,
  39583,
  39584,
  39585,
  39586,
  39587,
  39588,
  39589,
  39590,
  39591,
  39592,
  39593,
  39594,
  39595,
  39596,
  39597,
  39598,
  39599,
  39600,
  39601,
  39602,
  39603,
  39604,
  39605,
  39606,
  39607,
  39608,
  39609,
  39610,
  39611,
  39612,
  39613,
  39614,
  39615,
  39616,
  39617,
  39618,
  39619,
  39620,
  39621,
  39622,
  39623,
  39624,
  39625,
  39626,
  39627,
  39628,
  39629,
  39630,
  39631,
  39632,
  39633,
  39634,
  39635,
  39636,
  39637,
  39638,
  39639,
  39640,
  39641,
  39642,
  39643,
  39644,
  39645,
  39646,
  39647,
  39648,
  39649,
  39650,
  39651,
  39652,
  39653,
  39654,
  39655,
  39656,
  39657,
  39658,
  39659,
  39660,
  39661,
  39662,
  39663,
  39664,
  39665,
  39666,
  39667,
  39668,
  39669,
  39670,
  39671,
  39672,
  39673,
  39674,
  39675,
  39676,
  39677,
  39678,
  39679,
  39680,
  39681,
  39682,
  39683,
  39684,
  39685,
  39686,
  39687,
  39688,
  39689,
  39690,
  39691,
  39692,
  39693,
  39694,
  39695,
  39696,
  39697,
  39698,
  39699,
  39700,
  39701,
  39702,
  39703,
  39704,
  39705,
  39706,
  39707,
  39708,
  39709,
  39710,
  39711,
  39712,
  39713,
  39714,
  39715,
  39716,
  39717,
  39718,
  39719,
  39720,
  39721,
  39722,
  39723,
  39724,
  39725,
  39726,
  39727,
  39728,
  39729,
  39730,
  39731,
  39732,
  39733,
  39734,
  39735,
  39736,
  39737,
  39738,
  39739,
  39740,
  39741,
  39742,
  39743,
  39744,
  39745,
  39746,
  39747,
  39748,
  39749,
  39750,
  39751,
  39752,
  39753,
  39754,
  39755,
  39756,
  39757,
  39758,
  39759,
  39760,
  39761,
  39762,
  39763,
  39764,
  39765,
  39766,
  39767,
  39768,
  39769,
  39770,
  39771,
  39772,
  39773,
  39774,
  39775,
  39776,
  39777,
  39778,
  39779,
  39780,
  39781,
  39782,
  39783,
  39784,
  39785,
  39786,
  39787,
  39788,
  39789,
  39790,
  39791,
  39792,
  39793,
  39794,
  39795,
  39796,
  39797,
  39798,
  39799,
  39800,
  39801,
  39802,
  39803,
  39804,
  39805,
  39806,
  39807,
  39808,
  39809,
  39810,
  39811,
  39812,
  39813,
  39814,
  39815,
  39816,
  39817,
  39818,
  39819,
  39820,
  39821,
  39822,
  39823,
  39824,
  39825,
  39826,
  39827,
  39828,
  39829,
  39830,
  39831,
  39832,
  39833,
  39834,
  39835,
  39836,
  39837,
  39838,
  39839,
  39840,
  39841,
  39842,
  39843,
  39844,
  39845,
  39846,
  39847,
  39848,
  39849,
  39850,
  39851,
  39852,
  39853,
  39854,
  39855,
  39856,
  39857,
  39858,
  39859,
  39860,
  39861,
  39862,
  39863,
  39864,
  39865,
  39866,
  39867,
  39868,
  39869,
  39870,
  39871,
  39872,
  39873,
  39874,
  39875,
  39876,
  39877,
  39878,
  39879,
  39880,
  39881,
  39882,
  39883,
  39884,
  39885,
  39886,
  39887,
  39888,
  39889,
  39890,
  39891,
  39892,
  39893,
  39894,
  39895,
  39896,
  39897,
  39898,
  39899,
  39900,
  39901,
  39902,
  39903,
  39904,
  39905,
  39906,
  39907,
  39908,
  39909,
  39910,
  39911,
  39912,
  39913,
  39914,
  39915,
  39916,
  39917,
  39918,
  39919,
  39920,
  39921,
  39922,
  39923,
  39924,
  39925,
  39926,
  39927,
  39928,
  39929,
  39930,
  39931,
  39932,
  39933,
  39934,
  39935,
  39936,
  39937,
  39938,
  39939,
  39940,
  39941,
  39942,
  39943,
  39944,
  39945,
  39946,
  39947,
  39948,
  39949,
  39950,
  39951,
  39952,
  39953,
  39954,
  39955,
  39956,
  39957,
  39958,
  39959,
  39960,
  39961,
  39962,
  39963,
  39964,
  39965,
  39966,
  39967,
  39968,
  39969,
  39970,
  39971,
  39972,
  39973,
  39974,
  39975,
  39976,
  39977,
  39978,
  39979,
  39980,
  39981,
  39982,
  39983,
  39984,
  39985,
  39986,
  39987,
  39988,
  39989,
  39990,
  39991,
  39992,
  39993,
  39994,
  39995,
  39996,
  39997,
  39998,
  39999,
  40000,
  40001,
  40002,
  40003,
  40004,
  40005,
  40006,
  40007,
  40008,
  40009,
  40010,
  40011,
  40012,
  40013,
  40014,
  40015,
  40016,
  40017,
  40018,
  40019,
  40020,
  40021,
  40022,
  40023,
  40024,
  40025,
  40026,
  40027,
  40028,
  40029,
  40030,
  40031,
  40032,
  40033,
  40034,
  40035,
  40036,
  40037,
  40038,
  40039,
  40040,
  40041,
  40042,
  40043,
  40044,
  40045,
  40046,
  40047,
  40048,
  40049,
  40050,
  40051,
  40052,
  40053,
  40054,
  40055,
  40056,
  40057,
  40058,
  40059,
  40060,
  40061,
  40062,
  40063,
  40064,
  40065,
  40066,
  40067,
  40068,
  40069,
  40070,
  40071,
  40072,
  40073,
  40074,
  40075,
  40076,
  40077,
  40078,
  40079,
  40080,
  40081,
  40082,
  40083,
  40084,
  40085,
  40086,
  40087,
  40088,
  40089,
  40090,
  40091,
  40092,
  40093,
  40094,
  40095,
  40096,
  40097,
  40098,
  40099,
  40100,
  40101,
  40102,
  40103,
  40104,
  40105,
  40106,
  40107,
  40108,
  40109,
  40110,
  40111,
  40112,
  40113,
  40114,
  40115,
  40116,
  40117,
  40118,
  40119,
  40120,
  40121,
  40122,
  40123,
  40124,
  40125,
  40126,
  40127,
  40128,
  40129,
  40130,
  40131,
  40132,
  40133,
  40134,
  40135,
  40136,
  40137,
  40138,
  40139,
  40140,
  40141,
  40142,
  40143,
  40144,
  40145,
  40146,
  40147,
  40148,
  40149,
  40150,
  40151,
  40152,
  40153,
  40154,
  40155,
  40156,
  40157,
  40158,
  40159,
  40160,
  40161,
  40162,
  40163,
  40164,
  40165,
  40166,
  40167,
  40168,
  40169,
  40170,
  40171,
  40172,
  40173,
  40174,
  40175,
  40176,
  40177,
  40178,
  40179,
  40180,
  40181,
  40182,
  40183,
  40184,
  40185,
  40186,
  40187,
  40188,
  40189,
  40190,
  40191,
  40192,
  40193,
  40194,
  40195,
  40196,
  40197,
  40198,
  40199,
  40200,
  40201,
  40202,
  40203,
  40204,
  40205,
  40206,
  40207,
  40208,
  40209,
  40210,
  40211,
  40212,
  40213,
  40214,
  40215,
  40216,
  40217,
  40218,
  40219,
  40220,
  40221,
  40222,
  40223,
  40224,
  40225,
  40226,
  40227,
  40228,
  40229,
  40230,
  40231,
  40232,
  40233,
  40234,
  40235,
  40236,
  40237,
  40238,
  40239,
  40240,
  40241,
  40242,
  40243,
  40244,
  40245,
  40246,
  40247,
  40248,
  40249,
  40250,
  40251,
  40252,
  40253,
  40254,
  40255,
  40256,
  40257,
  40258,
  40259,
  40260,
  40261,
  40262,
  40263,
  40264,
  40265,
  40266,
  40267,
  40268,
  40269,
  40270,
  40271,
  40272,
  40273,
  40274,
  40275,
  40276,
  40277,
  40278,
  40279,
  40280,
  40281,
  40282,
  40283,
  40284,
  40285,
  40286,
  40287,
  40288,
  40289,
  40290,
  40291,
  40292,
  40293,
  40294,
  40295,
  40296,
  40297,
  40298,
  40299,
  40300,
  40301,
  40302,
  40303,
  40304,
  40305,
  40306,
  40307,
  40308,
  40309,
  40310,
  40311,
  40312,
  40313,
  40314,
  40315,
  40316,
  40317,
  40318,
  40319,
  40320,
  40321,
  40322,
  40323,
  40324,
  40325,
  40326,
  40327,
  40328,
  40329,
  40330,
  40331,
  40332,
  40333,
  40334,
  40335,
  40336,
  40337,
  40338,
  40339,
  40340,
  40341,
  40342,
  40343,
  40344,
  40345,
  40346,
  40347,
  40348,
  40349,
  40350,
  40351,
  40352,
  40353,
  40354,
  40355,
  40356,
  40357,
  40358,
  40359,
  40360,
  40361,
  40362,
  40363,
  40364,
  40365,
  40366,
  40367,
  40368,
  40369,
  40370,
  40371,
  40372,
  40373,
  40374,
  40375,
  40376,
  40377,
  40378,
  40379,
  40380,
  40381,
  40382,
  40383,
  40384,
  40385,
  40386,
  40387,
  40388,
  40389,
  40390,
  40391,
  40392,
  40393,
  40394,
  40395,
  40396,
  40397,
  40398,
  40399,
  40400,
  40401,
  40402,
  40403,
  40404,
  40405,
  40406,
  40407,
  40408,
  40409,
  40410,
  40411,
  40412,
  40413,
  40414,
  40415,
  40416,
  40417,
  40418,
  40419,
  40420,
  40421,
  40422,
  40423,
  40424,
  40425,
  40426,
  40427,
  40428,
  40429,
  40430,
  40431,
  40432,
  40433,
  40434,
  40435,
  40436,
  40437,
  40438,
  40439,
  40440,
  40441,
  40442,
  40443,
  40444,
  40445,
  40446,
  40447,
  40448,
  40449,
  40450,
  40451,
  40452,
  40453,
  40454,
  40455,
  40456,
  40457,
  40458,
  40459,
  40460,
  40461,
  40462,
  40463,
  40464,
  40465,
  40466,
  40467,
  40468,
  40469,
  40470,
  40471,
  40472,
  40473,
  40474,
  40475,
  40476,
  40477,
  40478,
  40479,
  40480,
  40481,
  40482,
  40483,
  40484,
  40485,
  40486,
  40487,
  40488,
  40489,
  40490,
  40491,
  40492,
  40493,
  40494,
  40495,
  40496,
  40497,
  40498,
  40499,
  40500,
  40501,
  40502,
  40503,
  40504,
  40505,
  40506,
  40507,
  40508,
  40509,
  40510,
  40511,
  40512,
  40513,
  40514,
  40515,
  40516,
  40517,
  40518,
  40519,
  40520,
  40521,
  40522,
  40523,
  40524,
  40525,
  40526,
  40527,
  40528,
  40529,
  40530,
  40531,
  40532,
  40533,
  40534,
  40535,
  40536,
  40537,
  40538,
  40539,
  40540,
  40541,
  40542,
  40543,
  40544,
  40545,
  40546,
  40547,
  40548,
  40549,
  40550,
  40551,
  40552,
  40553,
  40554,
  40555,
  40556,
  40557,
  40558,
  40559,
  40560,
  40561,
  40562,
  40563,
  40564,
  40565,
  40566,
  40567,
  40568,
  40569,
  40570,
  40571,
  40572,
  40573,
  40574,
  40575,
  40576,
  40577,
  40578,
  40579,
  40580,
  40581,
  40582,
  40583,
  40584,
  40585,
  40586,
  40587,
  40588,
  40589,
  40590,
  40591,
  40592,
  40593,
  40594,
  40595,
  40596,
  40597,
  40598,
  40599,
  40600,
  40601,
  40602,
  40603,
  40604,
  40605,
  40606,
  40607,
  40608,
  40609,
  40610,
  40611,
  40612,
  40613,
  40614,
  40615,
  40616,
  40617,
  40618,
  40619,
  40620,
  40621,
  40622,
  40623,
  40624,
  40625,
  40626,
  40627,
  40628,
  40629,
  40630,
  40631,
  40632,
  40633,
  40634,
  40635,
  40636,
  40637,
  40638,
  40639,
  40640,
  40641,
  40642,
  40643,
  40644,
  40645,
  40646,
  40647,
  40648,
  40649,
  40650,
  40651,
  40652,
  40653,
  40654,
  40655,
  40656,
  40657,
  40658,
  40659,
  40660,
  40661,
  40662,
  40663,
  40664,
  40665,
  40666,
  40667,
  40668,
  40669,
  40670,
  40671,
  40672,
  40673,
  40674,
  40675,
  40676,
  40677,
  40678,
  40679,
  40680,
  40681,
  40682,
  40683,
  40684,
  40685,
  40686,
  40687,
  40688,
  40689,
  40690,
  40691,
  40692,
  40693,
  40694,
  40695,
  40696,
  40697,
  40698,
  40699,
  40700,
  40701,
  40702,
  40703,
  40704,
  40705,
  40706,
  40707,
  40708,
  40709,
  40710,
  40711,
  40712,
  40713,
  40714,
  40715,
  40716,
  40717,
  40718,
  40719,
  40720,
  40721,
  40722,
  40723,
  40724,
  40725,
  40726,
  40727,
  40728,
  40729,
  40730,
  40731,
  40732,
  40733,
  40734,
  40735,
  40736,
  40737,
  40738,
  40739,
  40740,
  40741,
  40742,
  40743,
  40744,
  40745,
  40746,
  40747,
  40748,
  40749,
  40750,
  40751,
  40752,
  40753,
  40754,
  40755,
  40756,
  40757,
  40758,
  40759,
  40760,
  40761,
  40762,
  40763,
  40764,
  40765,
  40766,
  40767,
  40768,
  40769,
  40770,
  40771,
  40772,
  40773,
  40774,
  40775,
  40776,
  40777,
  40778,
  40779,
  40780,
  40781,
  40782,
  40783,
  40784,
  40785,
  40786,
  40787,
  40788,
  40789,
  40790,
  40791,
  40792,
  40793,
  40794,
  40795,
  40796,
  40797,
  40798,
  40799,
  40800,
  40801,
  40802,
  40803,
  40804,
  40805,
  40806,
  40807,
  40808,
  40809,
  40810,
  40811,
  40812,
  40813,
  40814,
  40815,
  40816,
  40817,
  40818,
  40819,
  40820,
  40821,
  40822,
  40823,
  40824,
  40825,
  40826,
  40827,
  40828,
  40829,
  40830,
  40831,
  40832,
  40833,
  40834,
  40835,
  40836,
  40837,
  40838,
  40839,
  40840,
  40841,
  40842,
  40843,
  40844,
  40845,
  40846,
  40847,
  40848,
  40849,
  40850,
  40851,
  40852,
  40853,
  40854,
  40855,
  40856,
  40857,
  40858,
  40859,
  40860,
  40861,
  40862,
  40863,
  40864,
  40865,
  40866,
  40867,
  40868,
  40869,
  40870,
  40871,
  40872,
  40873,
  40874,
  40875,
  40876,
  40877,
  40878,
  40879,
  40880,
  40881,
  40882,
  40883,
  40884,
  40885,
  40886,
  40887,
  40888,
  40889,
  40890,
  40891,
  40892,
  40893,
  40894,
  40895,
  40896,
  40897,
  40898,
  40899,
  40900,
  40901,
  40902,
  40903,
  40904,
  40905,
  40906,
  40907,
  40908,
  40960,
  40961,
  40962,
  40963,
  40964,
  40965,
  40966,
  40967,
  40968,
  40969,
  40970,
  40971,
  40972,
  40973,
  40974,
  40975,
  40976,
  40977,
  40978,
  40979,
  40980,
  40981,
  40982,
  40983,
  40984,
  40985,
  40986,
  40987,
  40988,
  40989,
  40990,
  40991,
  40992,
  40993,
  40994,
  40995,
  40996,
  40997,
  40998,
  40999,
  41000,
  41001,
  41002,
  41003,
  41004,
  41005,
  41006,
  41007,
  41008,
  41009,
  41010,
  41011,
  41012,
  41013,
  41014,
  41015,
  41016,
  41017,
  41018,
  41019,
  41020,
  41021,
  41022,
  41023,
  41024,
  41025,
  41026,
  41027,
  41028,
  41029,
  41030,
  41031,
  41032,
  41033,
  41034,
  41035,
  41036,
  41037,
  41038,
  41039,
  41040,
  41041,
  41042,
  41043,
  41044,
  41045,
  41046,
  41047,
  41048,
  41049,
  41050,
  41051,
  41052,
  41053,
  41054,
  41055,
  41056,
  41057,
  41058,
  41059,
  41060,
  41061,
  41062,
  41063,
  41064,
  41065,
  41066,
  41067,
  41068,
  41069,
  41070,
  41071,
  41072,
  41073,
  41074,
  41075,
  41076,
  41077,
  41078,
  41079,
  41080,
  41081,
  41082,
  41083,
  41084,
  41085,
  41086,
  41087,
  41088,
  41089,
  41090,
  41091,
  41092,
  41093,
  41094,
  41095,
  41096,
  41097,
  41098,
  41099,
  41100,
  41101,
  41102,
  41103,
  41104,
  41105,
  41106,
  41107,
  41108,
  41109,
  41110,
  41111,
  41112,
  41113,
  41114,
  41115,
  41116,
  41117,
  41118,
  41119,
  41120,
  41121,
  41122,
  41123,
  41124,
  41125,
  41126,
  41127,
  41128,
  41129,
  41130,
  41131,
  41132,
  41133,
  41134,
  41135,
  41136,
  41137,
  41138,
  41139,
  41140,
  41141,
  41142,
  41143,
  41144,
  41145,
  41146,
  41147,
  41148,
  41149,
  41150,
  41151,
  41152,
  41153,
  41154,
  41155,
  41156,
  41157,
  41158,
  41159,
  41160,
  41161,
  41162,
  41163,
  41164,
  41165,
  41166,
  41167,
  41168,
  41169,
  41170,
  41171,
  41172,
  41173,
  41174,
  41175,
  41176,
  41177,
  41178,
  41179,
  41180,
  41181,
  41182,
  41183,
  41184,
  41185,
  41186,
  41187,
  41188,
  41189,
  41190,
  41191,
  41192,
  41193,
  41194,
  41195,
  41196,
  41197,
  41198,
  41199,
  41200,
  41201,
  41202,
  41203,
  41204,
  41205,
  41206,
  41207,
  41208,
  41209,
  41210,
  41211,
  41212,
  41213,
  41214,
  41215,
  41216,
  41217,
  41218,
  41219,
  41220,
  41221,
  41222,
  41223,
  41224,
  41225,
  41226,
  41227,
  41228,
  41229,
  41230,
  41231,
  41232,
  41233,
  41234,
  41235,
  41236,
  41237,
  41238,
  41239,
  41240,
  41241,
  41242,
  41243,
  41244,
  41245,
  41246,
  41247,
  41248,
  41249,
  41250,
  41251,
  41252,
  41253,
  41254,
  41255,
  41256,
  41257,
  41258,
  41259,
  41260,
  41261,
  41262,
  41263,
  41264,
  41265,
  41266,
  41267,
  41268,
  41269,
  41270,
  41271,
  41272,
  41273,
  41274,
  41275,
  41276,
  41277,
  41278,
  41279,
  41280,
  41281,
  41282,
  41283,
  41284,
  41285,
  41286,
  41287,
  41288,
  41289,
  41290,
  41291,
  41292,
  41293,
  41294,
  41295,
  41296,
  41297,
  41298,
  41299,
  41300,
  41301,
  41302,
  41303,
  41304,
  41305,
  41306,
  41307,
  41308,
  41309,
  41310,
  41311,
  41312,
  41313,
  41314,
  41315,
  41316,
  41317,
  41318,
  41319,
  41320,
  41321,
  41322,
  41323,
  41324,
  41325,
  41326,
  41327,
  41328,
  41329,
  41330,
  41331,
  41332,
  41333,
  41334,
  41335,
  41336,
  41337,
  41338,
  41339,
  41340,
  41341,
  41342,
  41343,
  41344,
  41345,
  41346,
  41347,
  41348,
  41349,
  41350,
  41351,
  41352,
  41353,
  41354,
  41355,
  41356,
  41357,
  41358,
  41359,
  41360,
  41361,
  41362,
  41363,
  41364,
  41365,
  41366,
  41367,
  41368,
  41369,
  41370,
  41371,
  41372,
  41373,
  41374,
  41375,
  41376,
  41377,
  41378,
  41379,
  41380,
  41381,
  41382,
  41383,
  41384,
  41385,
  41386,
  41387,
  41388,
  41389,
  41390,
  41391,
  41392,
  41393,
  41394,
  41395,
  41396,
  41397,
  41398,
  41399,
  41400,
  41401,
  41402,
  41403,
  41404,
  41405,
  41406,
  41407,
  41408,
  41409,
  41410,
  41411,
  41412,
  41413,
  41414,
  41415,
  41416,
  41417,
  41418,
  41419,
  41420,
  41421,
  41422,
  41423,
  41424,
  41425,
  41426,
  41427,
  41428,
  41429,
  41430,
  41431,
  41432,
  41433,
  41434,
  41435,
  41436,
  41437,
  41438,
  41439,
  41440,
  41441,
  41442,
  41443,
  41444,
  41445,
  41446,
  41447,
  41448,
  41449,
  41450,
  41451,
  41452,
  41453,
  41454,
  41455,
  41456,
  41457,
  41458,
  41459,
  41460,
  41461,
  41462,
  41463,
  41464,
  41465,
  41466,
  41467,
  41468,
  41469,
  41470,
  41471,
  41472,
  41473,
  41474,
  41475,
  41476,
  41477,
  41478,
  41479,
  41480,
  41481,
  41482,
  41483,
  41484,
  41485,
  41486,
  41487,
  41488,
  41489,
  41490,
  41491,
  41492,
  41493,
  41494,
  41495,
  41496,
  41497,
  41498,
  41499,
  41500,
  41501,
  41502,
  41503,
  41504,
  41505,
  41506,
  41507,
  41508,
  41509,
  41510,
  41511,
  41512,
  41513,
  41514,
  41515,
  41516,
  41517,
  41518,
  41519,
  41520,
  41521,
  41522,
  41523,
  41524,
  41525,
  41526,
  41527,
  41528,
  41529,
  41530,
  41531,
  41532,
  41533,
  41534,
  41535,
  41536,
  41537,
  41538,
  41539,
  41540,
  41541,
  41542,
  41543,
  41544,
  41545,
  41546,
  41547,
  41548,
  41549,
  41550,
  41551,
  41552,
  41553,
  41554,
  41555,
  41556,
  41557,
  41558,
  41559,
  41560,
  41561,
  41562,
  41563,
  41564,
  41565,
  41566,
  41567,
  41568,
  41569,
  41570,
  41571,
  41572,
  41573,
  41574,
  41575,
  41576,
  41577,
  41578,
  41579,
  41580,
  41581,
  41582,
  41583,
  41584,
  41585,
  41586,
  41587,
  41588,
  41589,
  41590,
  41591,
  41592,
  41593,
  41594,
  41595,
  41596,
  41597,
  41598,
  41599,
  41600,
  41601,
  41602,
  41603,
  41604,
  41605,
  41606,
  41607,
  41608,
  41609,
  41610,
  41611,
  41612,
  41613,
  41614,
  41615,
  41616,
  41617,
  41618,
  41619,
  41620,
  41621,
  41622,
  41623,
  41624,
  41625,
  41626,
  41627,
  41628,
  41629,
  41630,
  41631,
  41632,
  41633,
  41634,
  41635,
  41636,
  41637,
  41638,
  41639,
  41640,
  41641,
  41642,
  41643,
  41644,
  41645,
  41646,
  41647,
  41648,
  41649,
  41650,
  41651,
  41652,
  41653,
  41654,
  41655,
  41656,
  41657,
  41658,
  41659,
  41660,
  41661,
  41662,
  41663,
  41664,
  41665,
  41666,
  41667,
  41668,
  41669,
  41670,
  41671,
  41672,
  41673,
  41674,
  41675,
  41676,
  41677,
  41678,
  41679,
  41680,
  41681,
  41682,
  41683,
  41684,
  41685,
  41686,
  41687,
  41688,
  41689,
  41690,
  41691,
  41692,
  41693,
  41694,
  41695,
  41696,
  41697,
  41698,
  41699,
  41700,
  41701,
  41702,
  41703,
  41704,
  41705,
  41706,
  41707,
  41708,
  41709,
  41710,
  41711,
  41712,
  41713,
  41714,
  41715,
  41716,
  41717,
  41718,
  41719,
  41720,
  41721,
  41722,
  41723,
  41724,
  41725,
  41726,
  41727,
  41728,
  41729,
  41730,
  41731,
  41732,
  41733,
  41734,
  41735,
  41736,
  41737,
  41738,
  41739,
  41740,
  41741,
  41742,
  41743,
  41744,
  41745,
  41746,
  41747,
  41748,
  41749,
  41750,
  41751,
  41752,
  41753,
  41754,
  41755,
  41756,
  41757,
  41758,
  41759,
  41760,
  41761,
  41762,
  41763,
  41764,
  41765,
  41766,
  41767,
  41768,
  41769,
  41770,
  41771,
  41772,
  41773,
  41774,
  41775,
  41776,
  41777,
  41778,
  41779,
  41780,
  41781,
  41782,
  41783,
  41784,
  41785,
  41786,
  41787,
  41788,
  41789,
  41790,
  41791,
  41792,
  41793,
  41794,
  41795,
  41796,
  41797,
  41798,
  41799,
  41800,
  41801,
  41802,
  41803,
  41804,
  41805,
  41806,
  41807,
  41808,
  41809,
  41810,
  41811,
  41812,
  41813,
  41814,
  41815,
  41816,
  41817,
  41818,
  41819,
  41820,
  41821,
  41822,
  41823,
  41824,
  41825,
  41826,
  41827,
  41828,
  41829,
  41830,
  41831,
  41832,
  41833,
  41834,
  41835,
  41836,
  41837,
  41838,
  41839,
  41840,
  41841,
  41842,
  41843,
  41844,
  41845,
  41846,
  41847,
  41848,
  41849,
  41850,
  41851,
  41852,
  41853,
  41854,
  41855,
  41856,
  41857,
  41858,
  41859,
  41860,
  41861,
  41862,
  41863,
  41864,
  41865,
  41866,
  41867,
  41868,
  41869,
  41870,
  41871,
  41872,
  41873,
  41874,
  41875,
  41876,
  41877,
  41878,
  41879,
  41880,
  41881,
  41882,
  41883,
  41884,
  41885,
  41886,
  41887,
  41888,
  41889,
  41890,
  41891,
  41892,
  41893,
  41894,
  41895,
  41896,
  41897,
  41898,
  41899,
  41900,
  41901,
  41902,
  41903,
  41904,
  41905,
  41906,
  41907,
  41908,
  41909,
  41910,
  41911,
  41912,
  41913,
  41914,
  41915,
  41916,
  41917,
  41918,
  41919,
  41920,
  41921,
  41922,
  41923,
  41924,
  41925,
  41926,
  41927,
  41928,
  41929,
  41930,
  41931,
  41932,
  41933,
  41934,
  41935,
  41936,
  41937,
  41938,
  41939,
  41940,
  41941,
  41942,
  41943,
  41944,
  41945,
  41946,
  41947,
  41948,
  41949,
  41950,
  41951,
  41952,
  41953,
  41954,
  41955,
  41956,
  41957,
  41958,
  41959,
  41960,
  41961,
  41962,
  41963,
  41964,
  41965,
  41966,
  41967,
  41968,
  41969,
  41970,
  41971,
  41972,
  41973,
  41974,
  41975,
  41976,
  41977,
  41978,
  41979,
  41980,
  41981,
  41982,
  41983,
  41984,
  41985,
  41986,
  41987,
  41988,
  41989,
  41990,
  41991,
  41992,
  41993,
  41994,
  41995,
  41996,
  41997,
  41998,
  41999,
  42000,
  42001,
  42002,
  42003,
  42004,
  42005,
  42006,
  42007,
  42008,
  42009,
  42010,
  42011,
  42012,
  42013,
  42014,
  42015,
  42016,
  42017,
  42018,
  42019,
  42020,
  42021,
  42022,
  42023,
  42024,
  42025,
  42026,
  42027,
  42028,
  42029,
  42030,
  42031,
  42032,
  42033,
  42034,
  42035,
  42036,
  42037,
  42038,
  42039,
  42040,
  42041,
  42042,
  42043,
  42044,
  42045,
  42046,
  42047,
  42048,
  42049,
  42050,
  42051,
  42052,
  42053,
  42054,
  42055,
  42056,
  42057,
  42058,
  42059,
  42060,
  42061,
  42062,
  42063,
  42064,
  42065,
  42066,
  42067,
  42068,
  42069,
  42070,
  42071,
  42072,
  42073,
  42074,
  42075,
  42076,
  42077,
  42078,
  42079,
  42080,
  42081,
  42082,
  42083,
  42084,
  42085,
  42086,
  42087,
  42088,
  42089,
  42090,
  42091,
  42092,
  42093,
  42094,
  42095,
  42096,
  42097,
  42098,
  42099,
  42100,
  42101,
  42102,
  42103,
  42104,
  42105,
  42106,
  42107,
  42108,
  42109,
  42110,
  42111,
  42112,
  42113,
  42114,
  42115,
  42116,
  42117,
  42118,
  42119,
  42120,
  42121,
  42122,
  42123,
  42124,
  42192,
  42193,
  42194,
  42195,
  42196,
  42197,
  42198,
  42199,
  42200,
  42201,
  42202,
  42203,
  42204,
  42205,
  42206,
  42207,
  42208,
  42209,
  42210,
  42211,
  42212,
  42213,
  42214,
  42215,
  42216,
  42217,
  42218,
  42219,
  42220,
  42221,
  42222,
  42223,
  42224,
  42225,
  42226,
  42227,
  42228,
  42229,
  42230,
  42231,
  42232,
  42233,
  42234,
  42235,
  42236,
  42237,
  42240,
  42241,
  42242,
  42243,
  42244,
  42245,
  42246,
  42247,
  42248,
  42249,
  42250,
  42251,
  42252,
  42253,
  42254,
  42255,
  42256,
  42257,
  42258,
  42259,
  42260,
  42261,
  42262,
  42263,
  42264,
  42265,
  42266,
  42267,
  42268,
  42269,
  42270,
  42271,
];

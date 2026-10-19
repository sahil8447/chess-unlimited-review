(() => {
  // node_modules/chess.js/dist/esm/chess.js
  function rootNode(comment) {
    return comment !== null ? { comment, variations: [] } : { variations: [] };
  }
  function node(move, suffix, nag, comment, variations) {
    const node2 = { move, variations };
    if (suffix) {
      node2.suffix = suffix;
    }
    if (nag) {
      node2.nag = nag;
    }
    if (comment !== null) {
      node2.comment = comment;
    }
    return node2;
  }
  function lineToTree(...nodes) {
    const [root, ...rest] = nodes;
    let parent = root;
    for (const child of rest) {
      if (child !== null) {
        parent.variations = [child, ...child.variations];
        child.variations = [];
        parent = child;
      }
    }
    return root;
  }
  function pgn(headers, game) {
    if (game.marker && game.marker.comment) {
      let node2 = game.root;
      while (true) {
        const next = node2.variations[0];
        if (!next) {
          node2.comment = game.marker.comment;
          break;
        }
        node2 = next;
      }
    }
    return {
      headers,
      root: game.root,
      result: (game.marker && game.marker.result) ?? void 0
    };
  }
  function peg$subclass(child, parent) {
    function C() {
      this.constructor = child;
    }
    C.prototype = parent.prototype;
    child.prototype = new C();
  }
  function peg$SyntaxError(message, expected, found, location2) {
    var self = Error.call(this, message);
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(self, peg$SyntaxError.prototype);
    }
    self.expected = expected;
    self.found = found;
    self.location = location2;
    self.name = "SyntaxError";
    return self;
  }
  peg$subclass(peg$SyntaxError, Error);
  function peg$padEnd(str, targetLength, padString) {
    padString = padString || " ";
    if (str.length > targetLength) {
      return str;
    }
    targetLength -= str.length;
    padString += padString.repeat(targetLength);
    return str + padString.slice(0, targetLength);
  }
  peg$SyntaxError.prototype.format = function(sources) {
    var str = "Error: " + this.message;
    if (this.location) {
      var src = null;
      var k;
      for (k = 0; k < sources.length; k++) {
        if (sources[k].source === this.location.source) {
          src = sources[k].text.split(/\r\n|\n|\r/g);
          break;
        }
      }
      var s = this.location.start;
      var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
      var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
      if (src) {
        var e = this.location.end;
        var filler = peg$padEnd("", offset_s.line.toString().length, " ");
        var line = src[s.line - 1];
        var last = s.line === e.line ? e.column : line.length + 1;
        var hatLen = last - s.column || 1;
        str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
      } else {
        str += "\n at " + loc;
      }
    }
    return str;
  };
  peg$SyntaxError.buildMessage = function(expected, found) {
    var DESCRIBE_EXPECTATION_FNS = {
      literal: function(expectation) {
        return '"' + literalEscape(expectation.text) + '"';
      },
      class: function(expectation) {
        var escapedParts = expectation.parts.map(function(part) {
          return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
        });
        return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
      },
      any: function() {
        return "any character";
      },
      end: function() {
        return "end of input";
      },
      other: function(expectation) {
        return expectation.description;
      }
    };
    function hex(ch) {
      return ch.charCodeAt(0).toString(16).toUpperCase();
    }
    function literalEscape(s) {
      return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
        return "\\x0" + hex(ch);
      }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
        return "\\x" + hex(ch);
      });
    }
    function classEscape(s) {
      return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
        return "\\x0" + hex(ch);
      }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
        return "\\x" + hex(ch);
      });
    }
    function describeExpectation(expectation) {
      return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
    }
    function describeExpected(expected2) {
      var descriptions = expected2.map(describeExpectation);
      var i, j;
      descriptions.sort();
      if (descriptions.length > 0) {
        for (i = 1, j = 1; i < descriptions.length; i++) {
          if (descriptions[i - 1] !== descriptions[i]) {
            descriptions[j] = descriptions[i];
            j++;
          }
        }
        descriptions.length = j;
      }
      switch (descriptions.length) {
        case 1:
          return descriptions[0];
        case 2:
          return descriptions[0] + " or " + descriptions[1];
        default:
          return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
      }
    }
    function describeFound(found2) {
      return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
    }
    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
  };
  function peg$parse(input, options) {
    options = options !== void 0 ? options : {};
    var peg$FAILED = {};
    var peg$source = options.grammarSource;
    var peg$startRuleFunctions = { pgn: peg$parsepgn };
    var peg$startRuleFunction = peg$parsepgn;
    var peg$c0 = "[";
    var peg$c1 = '"';
    var peg$c2 = "]";
    var peg$c3 = ".";
    var peg$c4 = "O-O-O";
    var peg$c5 = "O-O";
    var peg$c6 = "0-0-0";
    var peg$c7 = "0-0";
    var peg$c8 = "$";
    var peg$c9 = "{";
    var peg$c10 = "}";
    var peg$c11 = ";";
    var peg$c12 = "(";
    var peg$c13 = ")";
    var peg$c14 = "1-0";
    var peg$c15 = "0-1";
    var peg$c16 = "1/2-1/2";
    var peg$c17 = "*";
    var peg$r0 = /^[a-zA-Z]/;
    var peg$r1 = /^[^"]/;
    var peg$r2 = /^[0-9]/;
    var peg$r3 = /^[.]/;
    var peg$r4 = /^[a-zA-Z1-8\-=]/;
    var peg$r5 = /^[+#]/;
    var peg$r6 = /^[!?]/;
    var peg$r7 = /^[^}]/;
    var peg$r8 = /^[^\r\n]/;
    var peg$r9 = /^[ \t\r\n]/;
    var peg$e0 = peg$otherExpectation("tag pair");
    var peg$e1 = peg$literalExpectation("[", false);
    var peg$e2 = peg$literalExpectation('"', false);
    var peg$e3 = peg$literalExpectation("]", false);
    var peg$e4 = peg$otherExpectation("tag name");
    var peg$e5 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
    var peg$e6 = peg$otherExpectation("tag value");
    var peg$e7 = peg$classExpectation(['"'], true, false);
    var peg$e8 = peg$otherExpectation("move number");
    var peg$e9 = peg$classExpectation([["0", "9"]], false, false);
    var peg$e10 = peg$literalExpectation(".", false);
    var peg$e11 = peg$classExpectation(["."], false, false);
    var peg$e12 = peg$otherExpectation("standard algebraic notation");
    var peg$e13 = peg$literalExpectation("O-O-O", false);
    var peg$e14 = peg$literalExpectation("O-O", false);
    var peg$e15 = peg$literalExpectation("0-0-0", false);
    var peg$e16 = peg$literalExpectation("0-0", false);
    var peg$e17 = peg$classExpectation([["a", "z"], ["A", "Z"], ["1", "8"], "-", "="], false, false);
    var peg$e18 = peg$classExpectation(["+", "#"], false, false);
    var peg$e19 = peg$otherExpectation("suffix annotation");
    var peg$e20 = peg$classExpectation(["!", "?"], false, false);
    var peg$e21 = peg$otherExpectation("NAG");
    var peg$e22 = peg$literalExpectation("$", false);
    var peg$e23 = peg$otherExpectation("brace comment");
    var peg$e24 = peg$literalExpectation("{", false);
    var peg$e25 = peg$classExpectation(["}"], true, false);
    var peg$e26 = peg$literalExpectation("}", false);
    var peg$e27 = peg$otherExpectation("rest of line comment");
    var peg$e28 = peg$literalExpectation(";", false);
    var peg$e29 = peg$classExpectation(["\r", "\n"], true, false);
    var peg$e30 = peg$otherExpectation("variation");
    var peg$e31 = peg$literalExpectation("(", false);
    var peg$e32 = peg$literalExpectation(")", false);
    var peg$e33 = peg$otherExpectation("game termination marker");
    var peg$e34 = peg$literalExpectation("1-0", false);
    var peg$e35 = peg$literalExpectation("0-1", false);
    var peg$e36 = peg$literalExpectation("1/2-1/2", false);
    var peg$e37 = peg$literalExpectation("*", false);
    var peg$e38 = peg$otherExpectation("whitespace");
    var peg$e39 = peg$classExpectation([" ", "	", "\r", "\n"], false, false);
    var peg$f0 = function(headers, game) {
      return pgn(headers, game);
    };
    var peg$f1 = function(tagPairs) {
      return Object.fromEntries(tagPairs);
    };
    var peg$f2 = function(tagName, tagValue) {
      return [tagName, tagValue];
    };
    var peg$f3 = function(root, marker) {
      return { root, marker };
    };
    var peg$f4 = function(comment, moves) {
      return lineToTree(rootNode(comment), ...moves.flat());
    };
    var peg$f5 = function(san, suffix, nag, comment, variations) {
      return node(san, suffix, nag, comment, variations);
    };
    var peg$f6 = function(nag) {
      return nag;
    };
    var peg$f7 = function(comment) {
      return comment.replace(/[\r\n]+/g, " ");
    };
    var peg$f8 = function(comment) {
      return comment.trim();
    };
    var peg$f9 = function(line) {
      return line;
    };
    var peg$f10 = function(result, comment) {
      return { result, comment };
    };
    var peg$currPos = options.peg$currPos | 0;
    var peg$posDetailsCache = [{ line: 1, column: 1 }];
    var peg$maxFailPos = peg$currPos;
    var peg$maxFailExpected = options.peg$maxFailExpected || [];
    var peg$silentFails = options.peg$silentFails | 0;
    var peg$result;
    if (options.startRule) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
      }
      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }
    function peg$literalExpectation(text, ignoreCase) {
      return { type: "literal", text, ignoreCase };
    }
    function peg$classExpectation(parts, inverted, ignoreCase) {
      return { type: "class", parts, inverted, ignoreCase };
    }
    function peg$endExpectation() {
      return { type: "end" };
    }
    function peg$otherExpectation(description) {
      return { type: "other", description };
    }
    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos];
      var p;
      if (details) {
        return details;
      } else {
        if (pos >= peg$posDetailsCache.length) {
          p = peg$posDetailsCache.length - 1;
        } else {
          p = pos;
          while (!peg$posDetailsCache[--p]) {
          }
        }
        details = peg$posDetailsCache[p];
        details = {
          line: details.line,
          column: details.column
        };
        while (p < pos) {
          if (input.charCodeAt(p) === 10) {
            details.line++;
            details.column = 1;
          } else {
            details.column++;
          }
          p++;
        }
        peg$posDetailsCache[pos] = details;
        return details;
      }
    }
    function peg$computeLocation(startPos, endPos, offset) {
      var startPosDetails = peg$computePosDetails(startPos);
      var endPosDetails = peg$computePosDetails(endPos);
      var res = {
        source: peg$source,
        start: {
          offset: startPos,
          line: startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line: endPosDetails.line,
          column: endPosDetails.column
        }
      };
      return res;
    }
    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) {
        return;
      }
      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }
      peg$maxFailExpected.push(expected);
    }
    function peg$buildStructuredError(expected, found, location2) {
      return new peg$SyntaxError(
        peg$SyntaxError.buildMessage(expected, found),
        expected,
        found,
        location2
      );
    }
    function peg$parsepgn() {
      var s0, s1, s2;
      s0 = peg$currPos;
      s1 = peg$parsetagPairSection();
      s2 = peg$parsemoveTextSection();
      s0 = peg$f0(s1, s2);
      return s0;
    }
    function peg$parsetagPairSection() {
      var s0, s1, s2;
      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsetagPair();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsetagPair();
      }
      s2 = peg$parse_();
      s0 = peg$f1(s1);
      return s0;
    }
    function peg$parsetagPair() {
      var s0, s2, s4, s6, s7, s8, s10;
      peg$silentFails++;
      s0 = peg$currPos;
      peg$parse_();
      if (input.charCodeAt(peg$currPos) === 91) {
        s2 = peg$c0;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e1);
        }
      }
      if (s2 !== peg$FAILED) {
        peg$parse_();
        s4 = peg$parsetagName();
        if (s4 !== peg$FAILED) {
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 34) {
            s6 = peg$c1;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$parsetagValue();
            if (input.charCodeAt(peg$currPos) === 34) {
              s8 = peg$c1;
              peg$currPos++;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e2);
              }
            }
            if (s8 !== peg$FAILED) {
              peg$parse_();
              if (input.charCodeAt(peg$currPos) === 93) {
                s10 = peg$c2;
                peg$currPos++;
              } else {
                s10 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e3);
                }
              }
              if (s10 !== peg$FAILED) {
                s0 = peg$f2(s4, s7);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        if (peg$silentFails === 0) {
          peg$fail(peg$e0);
        }
      }
      return s0;
    }
    function peg$parsetagName() {
      var s0, s1, s2;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = input.charAt(peg$currPos);
      if (peg$r0.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e5);
        }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = input.charAt(peg$currPos);
          if (peg$r0.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e5);
            }
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      return s0;
    }
    function peg$parsetagValue() {
      var s0, s1, s2;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e7);
        }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r1.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e7);
          }
        }
      }
      s0 = input.substring(s0, peg$currPos);
      peg$silentFails--;
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e6);
      }
      return s0;
    }
    function peg$parsemoveTextSection() {
      var s0, s1, s3;
      s0 = peg$currPos;
      s1 = peg$parseline();
      peg$parse_();
      s3 = peg$parsegameTerminationMarker();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      peg$parse_();
      s0 = peg$f3(s1, s3);
      return s0;
    }
    function peg$parseline() {
      var s0, s1, s2, s3;
      s0 = peg$currPos;
      s1 = peg$parsecomment();
      if (s1 === peg$FAILED) {
        s1 = null;
      }
      s2 = [];
      s3 = peg$parsemove();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsemove();
      }
      s0 = peg$f4(s1, s2);
      return s0;
    }
    function peg$parsemove() {
      var s0, s4, s5, s6, s7, s8, s9, s10;
      s0 = peg$currPos;
      peg$parse_();
      peg$parsemoveNumber();
      peg$parse_();
      s4 = peg$parsesan();
      if (s4 !== peg$FAILED) {
        s5 = peg$parsesuffixAnnotation();
        if (s5 === peg$FAILED) {
          s5 = null;
        }
        s6 = [];
        s7 = peg$parsenag();
        while (s7 !== peg$FAILED) {
          s6.push(s7);
          s7 = peg$parsenag();
        }
        s7 = peg$parse_();
        s8 = peg$parsecomment();
        if (s8 === peg$FAILED) {
          s8 = null;
        }
        s9 = [];
        s10 = peg$parsevariation();
        while (s10 !== peg$FAILED) {
          s9.push(s10);
          s10 = peg$parsevariation();
        }
        s0 = peg$f5(s4, s5, s6, s8, s9);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      return s0;
    }
    function peg$parsemoveNumber() {
      var s0, s1, s2, s3, s4, s5;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = input.charAt(peg$currPos);
      if (peg$r2.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r2.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
      }
      if (input.charCodeAt(peg$currPos) === 46) {
        s2 = peg$c3;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e10);
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        s4 = [];
        s5 = input.charAt(peg$currPos);
        if (peg$r3.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = input.charAt(peg$currPos);
          if (peg$r3.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e11);
            }
          }
        }
        s1 = [s1, s2, s3, s4];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e8);
        }
      }
      return s0;
    }
    function peg$parsesan() {
      var s0, s1, s2, s3, s4, s5;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c4) {
        s2 = peg$c4;
        peg$currPos += 5;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e13);
        }
      }
      if (s2 === peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c5) {
          s2 = peg$c5;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c6) {
            s2 = peg$c6;
            peg$currPos += 5;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e15);
            }
          }
          if (s2 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c7) {
              s2 = peg$c7;
              peg$currPos += 3;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e16);
              }
            }
            if (s2 === peg$FAILED) {
              s2 = peg$currPos;
              s3 = input.charAt(peg$currPos);
              if (peg$r0.test(s3)) {
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e5);
                }
              }
              if (s3 !== peg$FAILED) {
                s4 = [];
                s5 = input.charAt(peg$currPos);
                if (peg$r4.test(s5)) {
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e17);
                  }
                }
                if (s5 !== peg$FAILED) {
                  while (s5 !== peg$FAILED) {
                    s4.push(s5);
                    s5 = input.charAt(peg$currPos);
                    if (peg$r4.test(s5)) {
                      peg$currPos++;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e17);
                      }
                    }
                  }
                } else {
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  s3 = [s3, s4];
                  s2 = s3;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            }
          }
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = input.charAt(peg$currPos);
        if (peg$r5.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e18);
          }
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e12);
        }
      }
      return s0;
    }
    function peg$parsesuffixAnnotation() {
      var s0, s1, s2;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = input.charAt(peg$currPos);
      if (peg$r6.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e20);
        }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (s1.length >= 2) {
          s2 = peg$FAILED;
        } else {
          s2 = input.charAt(peg$currPos);
          if (peg$r6.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e20);
            }
          }
        }
      }
      if (s1.length < 1) {
        peg$currPos = s0;
        s0 = peg$FAILED;
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e19);
        }
      }
      return s0;
    }
    function peg$parsenag() {
      var s0, s2, s3, s4, s5;
      peg$silentFails++;
      s0 = peg$currPos;
      peg$parse_();
      if (input.charCodeAt(peg$currPos) === 36) {
        s2 = peg$c8;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e22);
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = [];
        s5 = input.charAt(peg$currPos);
        if (peg$r2.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        if (s5 !== peg$FAILED) {
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = input.charAt(peg$currPos);
            if (peg$r2.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e9);
              }
            }
          }
        } else {
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s3 = input.substring(s3, peg$currPos);
        } else {
          s3 = s4;
        }
        if (s3 !== peg$FAILED) {
          s0 = peg$f6(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        if (peg$silentFails === 0) {
          peg$fail(peg$e21);
        }
      }
      return s0;
    }
    function peg$parsecomment() {
      var s0;
      s0 = peg$parsebraceComment();
      if (s0 === peg$FAILED) {
        s0 = peg$parserestOfLineComment();
      }
      return s0;
    }
    function peg$parsebraceComment() {
      var s0, s1, s2, s3, s4;
      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c9;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e24);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        s4 = input.charAt(peg$currPos);
        if (peg$r7.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e25);
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = input.charAt(peg$currPos);
          if (peg$r7.test(s4)) {
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e25);
            }
          }
        }
        s2 = input.substring(s2, peg$currPos);
        if (input.charCodeAt(peg$currPos) === 125) {
          s3 = peg$c10;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e26);
          }
        }
        if (s3 !== peg$FAILED) {
          s0 = peg$f7(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e23);
        }
      }
      return s0;
    }
    function peg$parserestOfLineComment() {
      var s0, s1, s2, s3, s4;
      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 59) {
        s1 = peg$c11;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e28);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        s4 = input.charAt(peg$currPos);
        if (peg$r8.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e29);
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = input.charAt(peg$currPos);
          if (peg$r8.test(s4)) {
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e29);
            }
          }
        }
        s2 = input.substring(s2, peg$currPos);
        s0 = peg$f8(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e27);
        }
      }
      return s0;
    }
    function peg$parsevariation() {
      var s0, s2, s3, s5;
      peg$silentFails++;
      s0 = peg$currPos;
      peg$parse_();
      if (input.charCodeAt(peg$currPos) === 40) {
        s2 = peg$c12;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e31);
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseline();
        if (s3 !== peg$FAILED) {
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 41) {
            s5 = peg$c13;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e32);
            }
          }
          if (s5 !== peg$FAILED) {
            s0 = peg$f9(s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        if (peg$silentFails === 0) {
          peg$fail(peg$e30);
        }
      }
      return s0;
    }
    function peg$parsegameTerminationMarker() {
      var s0, s1, s3;
      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c14) {
        s1 = peg$c14;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e34);
        }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c15) {
          s1 = peg$c15;
          peg$currPos += 3;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e35);
          }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 7) === peg$c16) {
            s1 = peg$c16;
            peg$currPos += 7;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e36);
            }
          }
          if (s1 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 42) {
              s1 = peg$c17;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e37);
              }
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$parse_();
        s3 = peg$parsecomment();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s0 = peg$f10(s1, s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e33);
        }
      }
      return s0;
    }
    function peg$parse_() {
      var s0, s1;
      peg$silentFails++;
      s0 = [];
      s1 = input.charAt(peg$currPos);
      if (peg$r9.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e39);
        }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = input.charAt(peg$currPos);
        if (peg$r9.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e39);
          }
        }
      }
      peg$silentFails--;
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e38);
      }
      return s0;
    }
    peg$result = peg$startRuleFunction();
    if (options.peg$library) {
      return (
        /** @type {any} */
        {
          peg$result,
          peg$currPos,
          peg$FAILED,
          peg$maxFailExpected,
          peg$maxFailPos
        }
      );
    }
    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail(peg$endExpectation());
      }
      throw peg$buildStructuredError(
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }
  var MASK64 = 0xffffffffffffffffn;
  function rotl(x, k) {
    return (x << k | x >> 64n - k) & 0xffffffffffffffffn;
  }
  function wrappingMul(x, y) {
    return x * y & MASK64;
  }
  function xoroshiro128(state) {
    return function() {
      let s0 = BigInt(state & MASK64);
      let s1 = BigInt(state >> 64n & MASK64);
      const result = wrappingMul(rotl(wrappingMul(s0, 5n), 7n), 9n);
      s1 ^= s0;
      s0 = (rotl(s0, 24n) ^ s1 ^ s1 << 16n) & MASK64;
      s1 = rotl(s1, 37n);
      state = s1 << 64n | s0;
      return result;
    };
  }
  var rand = xoroshiro128(0xa187eb39cdcaed8f31c4b365b102e01en);
  var PIECE_KEYS = Array.from({ length: 2 }, () => Array.from({ length: 6 }, () => Array.from({ length: 128 }, () => rand())));
  var EP_KEYS = Array.from({ length: 8 }, () => rand());
  var CASTLING_KEYS = Array.from({ length: 16 }, () => rand());
  var SIDE_KEY = rand();
  var WHITE = "w";
  var BLACK = "b";
  var PAWN = "p";
  var KNIGHT = "n";
  var BISHOP = "b";
  var ROOK = "r";
  var QUEEN = "q";
  var KING = "k";
  var DEFAULT_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var Move = class {
    color;
    from;
    to;
    piece;
    captured;
    promotion;
    /**
     * @deprecated This field is deprecated and will be removed in version 2.0.0.
     * Please use move descriptor functions instead: `isCapture`, `isPromotion`,
     * `isEnPassant`, `isKingsideCastle`, `isQueensideCastle`, `isCastle`, and
     * `isBigPawn`
     */
    flags;
    san;
    lan;
    before;
    after;
    constructor(chess, internal) {
      const { color, piece, from, to, flags, captured, promotion } = internal;
      const fromAlgebraic = algebraic(from);
      const toAlgebraic = algebraic(to);
      this.color = color;
      this.piece = piece;
      this.from = fromAlgebraic;
      this.to = toAlgebraic;
      this.san = chess["_moveToSan"](internal, chess["_moves"]({ legal: true }));
      this.lan = fromAlgebraic + toAlgebraic;
      this.before = chess.fen();
      chess["_makeMove"](internal);
      this.after = chess.fen();
      chess["_undoMove"]();
      this.flags = "";
      for (const flag in BITS) {
        if (BITS[flag] & flags) {
          this.flags += FLAGS[flag];
        }
      }
      if (captured) {
        this.captured = captured;
      }
      if (promotion) {
        this.promotion = promotion;
        this.lan += promotion;
      }
    }
    isCapture() {
      return this.flags.indexOf(FLAGS["CAPTURE"]) > -1;
    }
    isPromotion() {
      return this.flags.indexOf(FLAGS["PROMOTION"]) > -1;
    }
    isEnPassant() {
      return this.flags.indexOf(FLAGS["EP_CAPTURE"]) > -1;
    }
    isKingsideCastle() {
      return this.flags.indexOf(FLAGS["KSIDE_CASTLE"]) > -1;
    }
    isQueensideCastle() {
      return this.flags.indexOf(FLAGS["QSIDE_CASTLE"]) > -1;
    }
    isBigPawn() {
      return this.flags.indexOf(FLAGS["BIG_PAWN"]) > -1;
    }
  };
  var EMPTY = -1;
  var FLAGS = {
    NORMAL: "n",
    CAPTURE: "c",
    BIG_PAWN: "b",
    EP_CAPTURE: "e",
    PROMOTION: "p",
    KSIDE_CASTLE: "k",
    QSIDE_CASTLE: "q",
    NULL_MOVE: "-"
  };
  var BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64,
    NULL_MOVE: 128
  };
  var SEVEN_TAG_ROSTER = {
    Event: "?",
    Site: "?",
    Date: "????.??.??",
    Round: "?",
    White: "?",
    Black: "?",
    Result: "*"
  };
  var SUPLEMENTAL_TAGS = {
    WhiteTitle: null,
    BlackTitle: null,
    WhiteElo: null,
    BlackElo: null,
    WhiteUSCF: null,
    BlackUSCF: null,
    WhiteNA: null,
    BlackNA: null,
    WhiteType: null,
    BlackType: null,
    EventDate: null,
    EventSponsor: null,
    Section: null,
    Stage: null,
    Board: null,
    Opening: null,
    Variation: null,
    SubVariation: null,
    ECO: null,
    NIC: null,
    Time: null,
    UTCTime: null,
    UTCDate: null,
    TimeControl: null,
    SetUp: null,
    FEN: null,
    Termination: null,
    Annotator: null,
    Mode: null,
    PlyCount: null
  };
  var HEADER_TEMPLATE = {
    ...SEVEN_TAG_ROSTER,
    ...SUPLEMENTAL_TAGS
  };
  var Ox88 = {
    a8: 0,
    b8: 1,
    c8: 2,
    d8: 3,
    e8: 4,
    f8: 5,
    g8: 6,
    h8: 7,
    a7: 16,
    b7: 17,
    c7: 18,
    d7: 19,
    e7: 20,
    f7: 21,
    g7: 22,
    h7: 23,
    a6: 32,
    b6: 33,
    c6: 34,
    d6: 35,
    e6: 36,
    f6: 37,
    g6: 38,
    h6: 39,
    a5: 48,
    b5: 49,
    c5: 50,
    d5: 51,
    e5: 52,
    f5: 53,
    g5: 54,
    h5: 55,
    a4: 64,
    b4: 65,
    c4: 66,
    d4: 67,
    e4: 68,
    f4: 69,
    g4: 70,
    h4: 71,
    a3: 80,
    b3: 81,
    c3: 82,
    d3: 83,
    e3: 84,
    f3: 85,
    g3: 86,
    h3: 87,
    a2: 96,
    b2: 97,
    c2: 98,
    d2: 99,
    e2: 100,
    f2: 101,
    g2: 102,
    h2: 103,
    a1: 112,
    b1: 113,
    c1: 114,
    d1: 115,
    e1: 116,
    f1: 117,
    g1: 118,
    h1: 119
  };
  var PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15]
  };
  var PIECE_OFFSETS = {
    n: [-18, -33, -31, -14, 18, 33, 31, 14],
    b: [-17, -15, 17, 15],
    r: [-16, 1, 16, -1],
    q: [-17, -16, -15, 1, 17, 16, 15, -1],
    k: [-17, -16, -15, 1, 17, 16, 15, -1]
  };
  var ATTACKS = [
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    24,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    2,
    24,
    2,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    2,
    53,
    56,
    53,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    24,
    24,
    24,
    24,
    24,
    56,
    0,
    56,
    24,
    24,
    24,
    24,
    24,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    2,
    53,
    56,
    53,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    2,
    24,
    2,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    24,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    20
  ];
  var RAYS = [
    17,
    0,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    17,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    16,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    16,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    16,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    -16,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    -16,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    -16,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    0,
    -17,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    0,
    0,
    -17
  ];
  var PIECE_MASKS = { p: 1, n: 2, b: 4, r: 8, q: 16, k: 32 };
  var SYMBOLS = "pnbrqkPNBRQK";
  var PROMOTIONS = [KNIGHT, BISHOP, ROOK, QUEEN];
  var RANK_1 = 7;
  var RANK_2 = 6;
  var RANK_7 = 1;
  var RANK_8 = 0;
  var SIDES = {
    [KING]: BITS.KSIDE_CASTLE,
    [QUEEN]: BITS.QSIDE_CASTLE
  };
  var ROOKS = {
    w: [
      { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
      { square: Ox88.h1, flag: BITS.KSIDE_CASTLE }
    ],
    b: [
      { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
      { square: Ox88.h8, flag: BITS.KSIDE_CASTLE }
    ]
  };
  var SECOND_RANK = { b: RANK_7, w: RANK_2 };
  var SAN_NULLMOVE = "--";
  function rank(square) {
    return square >> 4;
  }
  function file(square) {
    return square & 15;
  }
  function isDigit(c) {
    return "0123456789".indexOf(c) !== -1;
  }
  function algebraic(square) {
    const f = file(square);
    const r = rank(square);
    return "abcdefgh".substring(f, f + 1) + "87654321".substring(r, r + 1);
  }
  function swapColor(color) {
    return color === WHITE ? BLACK : WHITE;
  }
  function validateFen(fen) {
    const tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
      return {
        ok: false,
        error: "Invalid FEN: must contain six space-delimited fields"
      };
    }
    const moveNumber = parseInt(tokens[5], 10);
    if (isNaN(moveNumber) || moveNumber <= 0) {
      return {
        ok: false,
        error: "Invalid FEN: move number must be a positive integer"
      };
    }
    const halfMoves = parseInt(tokens[4], 10);
    if (isNaN(halfMoves) || halfMoves < 0) {
      return {
        ok: false,
        error: "Invalid FEN: half move counter number must be a non-negative integer"
      };
    }
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
      return { ok: false, error: "Invalid FEN: en-passant square is invalid" };
    }
    if (/[^kKqQ-]/.test(tokens[2])) {
      return { ok: false, error: "Invalid FEN: castling availability is invalid" };
    }
    if (!/^(w|b)$/.test(tokens[1])) {
      return { ok: false, error: "Invalid FEN: side-to-move is invalid" };
    }
    const rows = tokens[0].split("/");
    if (rows.length !== 8) {
      return {
        ok: false,
        error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows"
      };
    }
    for (let i = 0; i < rows.length; i++) {
      let sumFields = 0;
      let previousWasNumber = false;
      for (let k = 0; k < rows[i].length; k++) {
        if (isDigit(rows[i][k])) {
          if (previousWasNumber) {
            return {
              ok: false,
              error: "Invalid FEN: piece data is invalid (consecutive number)"
            };
          }
          sumFields += parseInt(rows[i][k], 10);
          previousWasNumber = true;
        } else {
          if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
            return {
              ok: false,
              error: "Invalid FEN: piece data is invalid (invalid piece)"
            };
          }
          sumFields += 1;
          previousWasNumber = false;
        }
      }
      if (sumFields !== 8) {
        return {
          ok: false,
          error: "Invalid FEN: piece data is invalid (too many squares in rank)"
        };
      }
    }
    if (tokens[3][1] == "3" && tokens[1] == "w" || tokens[3][1] == "6" && tokens[1] == "b") {
      return { ok: false, error: "Invalid FEN: illegal en-passant square" };
    }
    const kings = [
      { color: "white", regex: /K/g },
      { color: "black", regex: /k/g }
    ];
    for (const { color, regex } of kings) {
      if (!regex.test(tokens[0])) {
        return { ok: false, error: `Invalid FEN: missing ${color} king` };
      }
      if ((tokens[0].match(regex) || []).length > 1) {
        return { ok: false, error: `Invalid FEN: too many ${color} kings` };
      }
    }
    if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === "P")) {
      return {
        ok: false,
        error: "Invalid FEN: some pawns are on the edge rows"
      };
    }
    return { ok: true };
  }
  function getDisambiguator(move, moves) {
    const from = move.from;
    const to = move.to;
    const piece = move.piece;
    let ambiguities = 0;
    let sameRank = 0;
    let sameFile = 0;
    for (let i = 0, len = moves.length; i < len; i++) {
      const ambigFrom = moves[i].from;
      const ambigTo = moves[i].to;
      const ambigPiece = moves[i].piece;
      if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
        ambiguities++;
        if (rank(from) === rank(ambigFrom)) {
          sameRank++;
        }
        if (file(from) === file(ambigFrom)) {
          sameFile++;
        }
      }
    }
    if (ambiguities > 0) {
      if (sameRank > 0 && sameFile > 0) {
        return algebraic(from);
      } else if (sameFile > 0) {
        return algebraic(from).charAt(1);
      } else {
        return algebraic(from).charAt(0);
      }
    }
    return "";
  }
  function addMove(moves, color, from, to, piece, captured = void 0, flags = BITS.NORMAL) {
    const r = rank(to);
    if (piece === PAWN && (r === RANK_1 || r === RANK_8)) {
      for (let i = 0; i < PROMOTIONS.length; i++) {
        const promotion = PROMOTIONS[i];
        moves.push({
          color,
          from,
          to,
          piece,
          captured,
          promotion,
          flags: flags | BITS.PROMOTION
        });
      }
    } else {
      moves.push({
        color,
        from,
        to,
        piece,
        captured,
        flags
      });
    }
  }
  function inferPieceType(san) {
    let pieceType = san.charAt(0);
    if (pieceType >= "a" && pieceType <= "h") {
      const matches = san.match(/[a-h]\d.*[a-h]\d/);
      if (matches) {
        return void 0;
      }
      return PAWN;
    }
    pieceType = pieceType.toLowerCase();
    if (pieceType === "o") {
      return KING;
    }
    return pieceType;
  }
  function strippedSan(move) {
    return move.replace(/=/, "").replace(/[+#]?[?!]*$/, "");
  }
  var Chess = class {
    _board = new Array(128);
    _turn = WHITE;
    _header = {};
    _kings = { w: EMPTY, b: EMPTY };
    _epSquare = -1;
    _halfMoves = 0;
    _moveNumber = 0;
    _history = [];
    _comments = {};
    _castling = { w: 0, b: 0 };
    _hash = 0n;
    // tracks number of times a position has been seen for repetition checking
    _positionCount = /* @__PURE__ */ new Map();
    constructor(fen = DEFAULT_POSITION, { skipValidation = false } = {}) {
      this.load(fen, { skipValidation });
    }
    clear({ preserveHeaders = false } = {}) {
      this._board = new Array(128);
      this._kings = { w: EMPTY, b: EMPTY };
      this._turn = WHITE;
      this._castling = { w: 0, b: 0 };
      this._epSquare = EMPTY;
      this._halfMoves = 0;
      this._moveNumber = 1;
      this._history = [];
      this._comments = {};
      this._header = preserveHeaders ? this._header : { ...HEADER_TEMPLATE };
      this._hash = this._computeHash();
      this._positionCount = /* @__PURE__ */ new Map();
      this._header["SetUp"] = null;
      this._header["FEN"] = null;
    }
    load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
      let tokens = fen.split(/\s+/);
      if (tokens.length >= 2 && tokens.length < 6) {
        const adjustments = ["-", "-", "0", "1"];
        fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(" ");
      }
      tokens = fen.split(/\s+/);
      if (!skipValidation) {
        const { ok, error } = validateFen(fen);
        if (!ok) {
          throw new Error(error);
        }
      }
      const position = tokens[0];
      let square = 0;
      this.clear({ preserveHeaders });
      for (let i = 0; i < position.length; i++) {
        const piece = position.charAt(i);
        if (piece === "/") {
          square += 8;
        } else if (isDigit(piece)) {
          square += parseInt(piece, 10);
        } else {
          const color = piece < "a" ? WHITE : BLACK;
          this._put({ type: piece.toLowerCase(), color }, algebraic(square));
          square++;
        }
      }
      this._turn = tokens[1];
      if (tokens[2].indexOf("K") > -1) {
        this._castling.w |= BITS.KSIDE_CASTLE;
      }
      if (tokens[2].indexOf("Q") > -1) {
        this._castling.w |= BITS.QSIDE_CASTLE;
      }
      if (tokens[2].indexOf("k") > -1) {
        this._castling.b |= BITS.KSIDE_CASTLE;
      }
      if (tokens[2].indexOf("q") > -1) {
        this._castling.b |= BITS.QSIDE_CASTLE;
      }
      this._epSquare = tokens[3] === "-" ? EMPTY : Ox88[tokens[3]];
      this._halfMoves = parseInt(tokens[4], 10);
      this._moveNumber = parseInt(tokens[5], 10);
      this._hash = this._computeHash();
      this._updateSetup(fen);
      this._incPositionCount();
    }
    fen({ forceEnpassantSquare = false } = {}) {
      let empty = 0;
      let fen = "";
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (this._board[i]) {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          const { color, type: piece } = this._board[i];
          fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
        } else {
          empty++;
        }
        if (i + 1 & 136) {
          if (empty > 0) {
            fen += empty;
          }
          if (i !== Ox88.h1) {
            fen += "/";
          }
          empty = 0;
          i += 8;
        }
      }
      let castling = "";
      if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
        castling += "K";
      }
      if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
        castling += "Q";
      }
      if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
        castling += "k";
      }
      if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
        castling += "q";
      }
      castling = castling || "-";
      let epSquare = "-";
      if (this._epSquare !== EMPTY) {
        if (forceEnpassantSquare) {
          epSquare = algebraic(this._epSquare);
        } else {
          const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
          const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
          for (const square of squares) {
            if (square & 136) {
              continue;
            }
            const color = this._turn;
            if (this._board[square]?.color === color && this._board[square]?.type === PAWN) {
              this._makeMove({
                color,
                from: square,
                to: this._epSquare,
                piece: PAWN,
                captured: PAWN,
                flags: BITS.EP_CAPTURE
              });
              const isLegal = !this._isKingAttacked(color);
              this._undoMove();
              if (isLegal) {
                epSquare = algebraic(this._epSquare);
                break;
              }
            }
          }
        }
      }
      return [
        fen,
        this._turn,
        castling,
        epSquare,
        this._halfMoves,
        this._moveNumber
      ].join(" ");
    }
    _pieceKey(i) {
      if (!this._board[i]) {
        return 0n;
      }
      const { color, type } = this._board[i];
      const colorIndex = {
        w: 0,
        b: 1
      }[color];
      const typeIndex = {
        p: 0,
        n: 1,
        b: 2,
        r: 3,
        q: 4,
        k: 5
      }[type];
      return PIECE_KEYS[colorIndex][typeIndex][i];
    }
    _epKey() {
      return this._epSquare === EMPTY ? 0n : EP_KEYS[this._epSquare & 7];
    }
    _castlingKey() {
      const index = this._castling.w >> 5 | this._castling.b >> 3;
      return CASTLING_KEYS[index];
    }
    _computeHash() {
      let hash = 0n;
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (i & 136) {
          i += 7;
          continue;
        }
        if (this._board[i]) {
          hash ^= this._pieceKey(i);
        }
      }
      hash ^= this._epKey();
      hash ^= this._castlingKey();
      if (this._turn === "b") {
        hash ^= SIDE_KEY;
      }
      return hash;
    }
    /*
     * Called when the initial board setup is changed with put() or remove().
     * modifies the SetUp and FEN properties of the header object. If the FEN
     * is equal to the default position, the SetUp and FEN are deleted the setup
     * is only updated if history.length is zero, ie moves haven't been made.
     */
    _updateSetup(fen) {
      if (this._history.length > 0)
        return;
      if (fen !== DEFAULT_POSITION) {
        this._header["SetUp"] = "1";
        this._header["FEN"] = fen;
      } else {
        this._header["SetUp"] = null;
        this._header["FEN"] = null;
      }
    }
    reset() {
      this.load(DEFAULT_POSITION);
    }
    get(square) {
      return this._board[Ox88[square]];
    }
    findPiece(piece) {
      const squares = [];
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (i & 136) {
          i += 7;
          continue;
        }
        if (!this._board[i] || this._board[i]?.color !== piece.color) {
          continue;
        }
        if (this._board[i].color === piece.color && this._board[i].type === piece.type) {
          squares.push(algebraic(i));
        }
      }
      return squares;
    }
    put({ type, color }, square) {
      if (this._put({ type, color }, square)) {
        this._updateCastlingRights();
        this._updateEnPassantSquare();
        this._updateSetup(this.fen());
        return true;
      }
      return false;
    }
    _set(sq, piece) {
      this._hash ^= this._pieceKey(sq);
      this._board[sq] = piece;
      this._hash ^= this._pieceKey(sq);
    }
    _put({ type, color }, square) {
      if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
        return false;
      }
      if (!(square in Ox88)) {
        return false;
      }
      const sq = Ox88[square];
      if (type == KING && !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
        return false;
      }
      const currentPieceOnSquare = this._board[sq];
      if (currentPieceOnSquare && currentPieceOnSquare.type === KING) {
        this._kings[currentPieceOnSquare.color] = EMPTY;
      }
      this._set(sq, { type, color });
      if (type === KING) {
        this._kings[color] = sq;
      }
      return true;
    }
    _clear(sq) {
      this._hash ^= this._pieceKey(sq);
      delete this._board[sq];
    }
    remove(square) {
      const piece = this.get(square);
      this._clear(Ox88[square]);
      if (piece && piece.type === KING) {
        this._kings[piece.color] = EMPTY;
      }
      this._updateCastlingRights();
      this._updateEnPassantSquare();
      this._updateSetup(this.fen());
      return piece;
    }
    _updateCastlingRights() {
      this._hash ^= this._castlingKey();
      const whiteKingInPlace = this._board[Ox88.e1]?.type === KING && this._board[Ox88.e1]?.color === WHITE;
      const blackKingInPlace = this._board[Ox88.e8]?.type === KING && this._board[Ox88.e8]?.color === BLACK;
      if (!whiteKingInPlace || this._board[Ox88.a1]?.type !== ROOK || this._board[Ox88.a1]?.color !== WHITE) {
        this._castling.w &= -65;
      }
      if (!whiteKingInPlace || this._board[Ox88.h1]?.type !== ROOK || this._board[Ox88.h1]?.color !== WHITE) {
        this._castling.w &= -33;
      }
      if (!blackKingInPlace || this._board[Ox88.a8]?.type !== ROOK || this._board[Ox88.a8]?.color !== BLACK) {
        this._castling.b &= -65;
      }
      if (!blackKingInPlace || this._board[Ox88.h8]?.type !== ROOK || this._board[Ox88.h8]?.color !== BLACK) {
        this._castling.b &= -33;
      }
      this._hash ^= this._castlingKey();
    }
    _updateEnPassantSquare() {
      if (this._epSquare === EMPTY) {
        return;
      }
      const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16);
      const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
      const attackers = [currentSquare + 1, currentSquare - 1];
      if (this._board[startSquare] !== null || this._board[this._epSquare] !== null || this._board[currentSquare]?.color !== swapColor(this._turn) || this._board[currentSquare]?.type !== PAWN) {
        this._hash ^= this._epKey();
        this._epSquare = EMPTY;
        return;
      }
      const canCapture = (square) => !(square & 136) && this._board[square]?.color === this._turn && this._board[square]?.type === PAWN;
      if (!attackers.some(canCapture)) {
        this._hash ^= this._epKey();
        this._epSquare = EMPTY;
      }
    }
    _attacked(color, square, verbose) {
      const attackers = [];
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (i & 136) {
          i += 7;
          continue;
        }
        if (this._board[i] === void 0 || this._board[i].color !== color) {
          continue;
        }
        const piece = this._board[i];
        const difference = i - square;
        if (difference === 0) {
          continue;
        }
        const index = difference + 119;
        if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
          if (piece.type === PAWN) {
            if (difference > 0 && piece.color === WHITE || difference <= 0 && piece.color === BLACK) {
              if (!verbose) {
                return true;
              } else {
                attackers.push(algebraic(i));
              }
            }
            continue;
          }
          if (piece.type === "n" || piece.type === "k") {
            if (!verbose) {
              return true;
            } else {
              attackers.push(algebraic(i));
              continue;
            }
          }
          const offset = RAYS[index];
          let j = i + offset;
          let blocked = false;
          while (j !== square) {
            if (this._board[j] != null) {
              blocked = true;
              break;
            }
            j += offset;
          }
          if (!blocked) {
            if (!verbose) {
              return true;
            } else {
              attackers.push(algebraic(i));
              continue;
            }
          }
        }
      }
      if (verbose) {
        return attackers;
      } else {
        return false;
      }
    }
    attackers(square, attackedBy) {
      if (!attackedBy) {
        return this._attacked(this._turn, Ox88[square], true);
      } else {
        return this._attacked(attackedBy, Ox88[square], true);
      }
    }
    _isKingAttacked(color) {
      const square = this._kings[color];
      return square === -1 ? false : this._attacked(swapColor(color), square);
    }
    hash() {
      return this._hash.toString(16);
    }
    isAttacked(square, attackedBy) {
      return this._attacked(attackedBy, Ox88[square]);
    }
    isCheck() {
      return this._isKingAttacked(this._turn);
    }
    inCheck() {
      return this.isCheck();
    }
    isCheckmate() {
      return this.isCheck() && this._moves().length === 0;
    }
    isStalemate() {
      return !this.isCheck() && this._moves().length === 0;
    }
    isInsufficientMaterial() {
      const pieces = {
        b: 0,
        n: 0,
        r: 0,
        q: 0,
        k: 0,
        p: 0
      };
      const bishops = [];
      let numPieces = 0;
      let squareColor = 0;
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        squareColor = (squareColor + 1) % 2;
        if (i & 136) {
          i += 7;
          continue;
        }
        const piece = this._board[i];
        if (piece) {
          pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
          if (piece.type === BISHOP) {
            bishops.push(squareColor);
          }
          numPieces++;
        }
      }
      if (numPieces === 2) {
        return true;
      } else if (
        // k vs. kn .... or .... k vs. kb
        numPieces === 3 && (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)
      ) {
        return true;
      } else if (numPieces === pieces[BISHOP] + 2) {
        let sum = 0;
        const len = bishops.length;
        for (let i = 0; i < len; i++) {
          sum += bishops[i];
        }
        if (sum === 0 || sum === len) {
          return true;
        }
      }
      return false;
    }
    isThreefoldRepetition() {
      return this._getPositionCount(this._hash) >= 3;
    }
    isDrawByFiftyMoves() {
      return this._halfMoves >= 100;
    }
    isDraw() {
      return this.isDrawByFiftyMoves() || this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition();
    }
    isGameOver() {
      return this.isCheckmate() || this.isDraw();
    }
    moves({ verbose = false, square = void 0, piece = void 0 } = {}) {
      const moves = this._moves({ square, piece });
      if (verbose) {
        return moves.map((move) => new Move(this, move));
      } else {
        return moves.map((move) => this._moveToSan(move, moves));
      }
    }
    _moves({ legal = true, piece = void 0, square = void 0 } = {}) {
      const forSquare = square ? square.toLowerCase() : void 0;
      const forPiece = piece?.toLowerCase();
      const moves = [];
      const us = this._turn;
      const them = swapColor(us);
      let firstSquare = Ox88.a8;
      let lastSquare = Ox88.h1;
      let singleSquare = false;
      if (forSquare) {
        if (!(forSquare in Ox88)) {
          return [];
        } else {
          firstSquare = lastSquare = Ox88[forSquare];
          singleSquare = true;
        }
      }
      for (let from = firstSquare; from <= lastSquare; from++) {
        if (from & 136) {
          from += 7;
          continue;
        }
        if (!this._board[from] || this._board[from].color === them) {
          continue;
        }
        const { type } = this._board[from];
        let to;
        if (type === PAWN) {
          if (forPiece && forPiece !== type)
            continue;
          to = from + PAWN_OFFSETS[us][0];
          if (!this._board[to]) {
            addMove(moves, us, from, to, PAWN);
            to = from + PAWN_OFFSETS[us][1];
            if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
              addMove(moves, us, from, to, PAWN, void 0, BITS.BIG_PAWN);
            }
          }
          for (let j = 2; j < 4; j++) {
            to = from + PAWN_OFFSETS[us][j];
            if (to & 136)
              continue;
            if (this._board[to]?.color === them) {
              addMove(moves, us, from, to, PAWN, this._board[to].type, BITS.CAPTURE);
            } else if (to === this._epSquare) {
              addMove(moves, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE);
            }
          }
        } else {
          if (forPiece && forPiece !== type)
            continue;
          for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
            const offset = PIECE_OFFSETS[type][j];
            to = from;
            while (true) {
              to += offset;
              if (to & 136)
                break;
              if (!this._board[to]) {
                addMove(moves, us, from, to, type);
              } else {
                if (this._board[to].color === us)
                  break;
                addMove(moves, us, from, to, type, this._board[to].type, BITS.CAPTURE);
                break;
              }
              if (type === KNIGHT || type === KING)
                break;
            }
          }
        }
      }
      if (forPiece === void 0 || forPiece === KING) {
        if (!singleSquare || lastSquare === this._kings[us]) {
          if (this._castling[us] & BITS.KSIDE_CASTLE) {
            const castlingFrom = this._kings[us];
            const castlingTo = castlingFrom + 2;
            if (!this._board[castlingFrom + 1] && !this._board[castlingTo] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom + 1) && !this._attacked(them, castlingTo)) {
              addMove(moves, us, this._kings[us], castlingTo, KING, void 0, BITS.KSIDE_CASTLE);
            }
          }
          if (this._castling[us] & BITS.QSIDE_CASTLE) {
            const castlingFrom = this._kings[us];
            const castlingTo = castlingFrom - 2;
            if (!this._board[castlingFrom - 1] && !this._board[castlingFrom - 2] && !this._board[castlingFrom - 3] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom - 1) && !this._attacked(them, castlingTo)) {
              addMove(moves, us, this._kings[us], castlingTo, KING, void 0, BITS.QSIDE_CASTLE);
            }
          }
        }
      }
      if (!legal || this._kings[us] === -1) {
        return moves;
      }
      const legalMoves = [];
      for (let i = 0, len = moves.length; i < len; i++) {
        this._makeMove(moves[i]);
        if (!this._isKingAttacked(us)) {
          legalMoves.push(moves[i]);
        }
        this._undoMove();
      }
      return legalMoves;
    }
    move(move, { strict = false } = {}) {
      let moveObj = null;
      if (typeof move === "string") {
        moveObj = this._moveFromSan(move, strict);
      } else if (move === null) {
        moveObj = this._moveFromSan(SAN_NULLMOVE, strict);
      } else if (typeof move === "object") {
        const moves = this._moves();
        for (let i = 0, len = moves.length; i < len; i++) {
          if (move.from === algebraic(moves[i].from) && move.to === algebraic(moves[i].to) && (!("promotion" in moves[i]) || move.promotion === moves[i].promotion)) {
            moveObj = moves[i];
            break;
          }
        }
      }
      if (!moveObj) {
        if (typeof move === "string") {
          throw new Error(`Invalid move: ${move}`);
        } else {
          throw new Error(`Invalid move: ${JSON.stringify(move)}`);
        }
      }
      if (this.isCheck() && moveObj.flags & BITS.NULL_MOVE) {
        throw new Error("Null move not allowed when in check");
      }
      const prettyMove = new Move(this, moveObj);
      this._makeMove(moveObj);
      this._incPositionCount();
      return prettyMove;
    }
    _push(move) {
      this._history.push({
        move,
        kings: { b: this._kings.b, w: this._kings.w },
        turn: this._turn,
        castling: { b: this._castling.b, w: this._castling.w },
        epSquare: this._epSquare,
        halfMoves: this._halfMoves,
        moveNumber: this._moveNumber
      });
    }
    _movePiece(from, to) {
      this._hash ^= this._pieceKey(from);
      this._board[to] = this._board[from];
      delete this._board[from];
      this._hash ^= this._pieceKey(to);
    }
    _makeMove(move) {
      const us = this._turn;
      const them = swapColor(us);
      this._push(move);
      if (move.flags & BITS.NULL_MOVE) {
        if (us === BLACK) {
          this._moveNumber++;
        }
        this._halfMoves++;
        this._turn = them;
        this._epSquare = EMPTY;
        return;
      }
      this._hash ^= this._epKey();
      this._hash ^= this._castlingKey();
      if (move.captured) {
        this._hash ^= this._pieceKey(move.to);
      }
      this._movePiece(move.from, move.to);
      if (move.flags & BITS.EP_CAPTURE) {
        if (this._turn === BLACK) {
          this._clear(move.to - 16);
        } else {
          this._clear(move.to + 16);
        }
      }
      if (move.promotion) {
        this._clear(move.to);
        this._set(move.to, { type: move.promotion, color: us });
      }
      if (this._board[move.to].type === KING) {
        this._kings[us] = move.to;
        if (move.flags & BITS.KSIDE_CASTLE) {
          const castlingTo = move.to - 1;
          const castlingFrom = move.to + 1;
          this._movePiece(castlingFrom, castlingTo);
        } else if (move.flags & BITS.QSIDE_CASTLE) {
          const castlingTo = move.to + 1;
          const castlingFrom = move.to - 2;
          this._movePiece(castlingFrom, castlingTo);
        }
        this._castling[us] = 0;
      }
      if (this._castling[us]) {
        for (let i = 0, len = ROOKS[us].length; i < len; i++) {
          if (move.from === ROOKS[us][i].square && this._castling[us] & ROOKS[us][i].flag) {
            this._castling[us] ^= ROOKS[us][i].flag;
            break;
          }
        }
      }
      if (this._castling[them]) {
        for (let i = 0, len = ROOKS[them].length; i < len; i++) {
          if (move.to === ROOKS[them][i].square && this._castling[them] & ROOKS[them][i].flag) {
            this._castling[them] ^= ROOKS[them][i].flag;
            break;
          }
        }
      }
      this._hash ^= this._castlingKey();
      if (move.flags & BITS.BIG_PAWN) {
        let epSquare;
        if (us === BLACK) {
          epSquare = move.to - 16;
        } else {
          epSquare = move.to + 16;
        }
        if (!(move.to - 1 & 136) && this._board[move.to - 1]?.type === PAWN && this._board[move.to - 1]?.color === them || !(move.to + 1 & 136) && this._board[move.to + 1]?.type === PAWN && this._board[move.to + 1]?.color === them) {
          this._epSquare = epSquare;
          this._hash ^= this._epKey();
        } else {
          this._epSquare = EMPTY;
        }
      } else {
        this._epSquare = EMPTY;
      }
      if (move.piece === PAWN) {
        this._halfMoves = 0;
      } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        this._halfMoves = 0;
      } else {
        this._halfMoves++;
      }
      if (us === BLACK) {
        this._moveNumber++;
      }
      this._turn = them;
      this._hash ^= SIDE_KEY;
    }
    undo() {
      const hash = this._hash;
      const move = this._undoMove();
      if (move) {
        const prettyMove = new Move(this, move);
        this._decPositionCount(hash);
        return prettyMove;
      }
      return null;
    }
    _undoMove() {
      const old = this._history.pop();
      if (old === void 0) {
        return null;
      }
      this._hash ^= this._epKey();
      this._hash ^= this._castlingKey();
      const move = old.move;
      this._kings = old.kings;
      this._turn = old.turn;
      this._castling = old.castling;
      this._epSquare = old.epSquare;
      this._halfMoves = old.halfMoves;
      this._moveNumber = old.moveNumber;
      this._hash ^= this._epKey();
      this._hash ^= this._castlingKey();
      this._hash ^= SIDE_KEY;
      const us = this._turn;
      const them = swapColor(us);
      if (move.flags & BITS.NULL_MOVE) {
        return move;
      }
      this._movePiece(move.to, move.from);
      if (move.piece) {
        this._clear(move.from);
        this._set(move.from, { type: move.piece, color: us });
      }
      if (move.captured) {
        if (move.flags & BITS.EP_CAPTURE) {
          let index;
          if (us === BLACK) {
            index = move.to - 16;
          } else {
            index = move.to + 16;
          }
          this._set(index, { type: PAWN, color: them });
        } else {
          this._set(move.to, { type: move.captured, color: them });
        }
      }
      if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
        let castlingTo, castlingFrom;
        if (move.flags & BITS.KSIDE_CASTLE) {
          castlingTo = move.to + 1;
          castlingFrom = move.to - 1;
        } else {
          castlingTo = move.to - 2;
          castlingFrom = move.to + 1;
        }
        this._movePiece(castlingFrom, castlingTo);
      }
      return move;
    }
    pgn({ newline = "\n", maxWidth = 0 } = {}) {
      const result = [];
      let headerExists = false;
      for (const i in this._header) {
        const headerTag = this._header[i];
        if (headerTag)
          result.push(`[${i} "${this._header[i]}"]` + newline);
        headerExists = true;
      }
      if (headerExists && this._history.length) {
        result.push(newline);
      }
      const appendComment = (moveString2) => {
        const comment = this._comments[this.fen()];
        if (typeof comment !== "undefined") {
          const delimiter = moveString2.length > 0 ? " " : "";
          moveString2 = `${moveString2}${delimiter}{${comment}}`;
        }
        return moveString2;
      };
      const reversedHistory = [];
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      const moves = [];
      let moveString = "";
      if (reversedHistory.length === 0) {
        moves.push(appendComment(""));
      }
      while (reversedHistory.length > 0) {
        moveString = appendComment(moveString);
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        if (!this._history.length && move.color === "b") {
          const prefix = `${this._moveNumber}. ...`;
          moveString = moveString ? `${moveString} ${prefix}` : prefix;
        } else if (move.color === "w") {
          if (moveString.length) {
            moves.push(moveString);
          }
          moveString = this._moveNumber + ".";
        }
        moveString = moveString + " " + this._moveToSan(move, this._moves({ legal: true }));
        this._makeMove(move);
      }
      if (moveString.length) {
        moves.push(appendComment(moveString));
      }
      moves.push(this._header.Result || "*");
      if (maxWidth === 0) {
        return result.join("") + moves.join(" ");
      }
      const strip = function() {
        if (result.length > 0 && result[result.length - 1] === " ") {
          result.pop();
          return true;
        }
        return false;
      };
      const wrapComment = function(width, move) {
        for (const token of move.split(" ")) {
          if (!token) {
            continue;
          }
          if (width + token.length > maxWidth) {
            while (strip()) {
              width--;
            }
            result.push(newline);
            width = 0;
          }
          result.push(token);
          width += token.length;
          result.push(" ");
          width++;
        }
        if (strip()) {
          width--;
        }
        return width;
      };
      let currentWidth = 0;
      for (let i = 0; i < moves.length; i++) {
        if (currentWidth + moves[i].length > maxWidth) {
          if (moves[i].includes("{")) {
            currentWidth = wrapComment(currentWidth, moves[i]);
            continue;
          }
        }
        if (currentWidth + moves[i].length > maxWidth && i !== 0) {
          if (result[result.length - 1] === " ") {
            result.pop();
          }
          result.push(newline);
          currentWidth = 0;
        } else if (i !== 0) {
          result.push(" ");
          currentWidth++;
        }
        result.push(moves[i]);
        currentWidth += moves[i].length;
      }
      return result.join("");
    }
    /**
     * @deprecated Use `setHeader` and `getHeaders` instead. This method will return null header tags (which is not what you want)
     */
    header(...args) {
      for (let i = 0; i < args.length; i += 2) {
        if (typeof args[i] === "string" && typeof args[i + 1] === "string") {
          this._header[args[i]] = args[i + 1];
        }
      }
      return this._header;
    }
    // TODO: value validation per spec
    setHeader(key, value) {
      this._header[key] = value ?? SEVEN_TAG_ROSTER[key] ?? null;
      return this.getHeaders();
    }
    removeHeader(key) {
      if (key in this._header) {
        this._header[key] = SEVEN_TAG_ROSTER[key] || null;
        return true;
      }
      return false;
    }
    // return only non-null headers (omit placemarker nulls)
    getHeaders() {
      const nonNullHeaders = {};
      for (const [key, value] of Object.entries(this._header)) {
        if (value !== null) {
          nonNullHeaders[key] = value;
        }
      }
      return nonNullHeaders;
    }
    loadPgn(pgn2, { strict = false, newlineChar = "\r?\n" } = {}) {
      if (newlineChar !== "\r?\n") {
        pgn2 = pgn2.replace(new RegExp(newlineChar, "g"), "\n");
      }
      const parsedPgn = peg$parse(pgn2);
      this.reset();
      const headers = parsedPgn.headers;
      let fen = "";
      for (const key in headers) {
        if (key.toLowerCase() === "fen") {
          fen = headers[key];
        }
        this.header(key, headers[key]);
      }
      if (!strict) {
        if (fen) {
          this.load(fen, { preserveHeaders: true });
        }
      } else {
        if (headers["SetUp"] === "1") {
          if (!("FEN" in headers)) {
            throw new Error("Invalid PGN: FEN tag must be supplied with SetUp tag");
          }
          this.load(headers["FEN"], { preserveHeaders: true });
        }
      }
      let node2 = parsedPgn.root;
      while (node2) {
        if (node2.move) {
          const move = this._moveFromSan(node2.move, strict);
          if (move == null) {
            throw new Error(`Invalid move in PGN: ${node2.move}`);
          } else {
            this._makeMove(move);
            this._incPositionCount();
          }
        }
        if (node2.comment !== void 0) {
          this._comments[this.fen()] = node2.comment;
        }
        node2 = node2.variations[0];
      }
      const result = parsedPgn.result;
      if (result && Object.keys(this._header).length && this._header["Result"] !== result) {
        this.setHeader("Result", result);
      }
    }
    /*
     * Convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} strict Use the strict SAN parser. It will throw errors
     * on overly disambiguated moves (see below):
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */
    _moveToSan(move, moves) {
      let output = "";
      if (move.flags & BITS.KSIDE_CASTLE) {
        output = "O-O";
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        output = "O-O-O";
      } else if (move.flags & BITS.NULL_MOVE) {
        return SAN_NULLMOVE;
      } else {
        if (move.piece !== PAWN) {
          const disambiguator = getDisambiguator(move, moves);
          output += move.piece.toUpperCase() + disambiguator;
        }
        if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
          if (move.piece === PAWN) {
            output += algebraic(move.from)[0];
          }
          output += "x";
        }
        output += algebraic(move.to);
        if (move.promotion) {
          output += "=" + move.promotion.toUpperCase();
        }
      }
      this._makeMove(move);
      if (this.isCheck()) {
        if (this.isCheckmate()) {
          output += "#";
        } else {
          output += "+";
        }
      }
      this._undoMove();
      return output;
    }
    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    _moveFromSan(move, strict = false) {
      let cleanMove = strippedSan(move);
      if (!strict) {
        if (cleanMove === "0-0") {
          cleanMove = "O-O";
        } else if (cleanMove === "0-0-0") {
          cleanMove = "O-O-O";
        }
      }
      if (cleanMove == SAN_NULLMOVE) {
        const res = {
          color: this._turn,
          from: 0,
          to: 0,
          piece: "k",
          flags: BITS.NULL_MOVE
        };
        return res;
      }
      let pieceType = inferPieceType(cleanMove);
      let moves = this._moves({ legal: true, piece: pieceType });
      for (let i = 0, len = moves.length; i < len; i++) {
        if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
          return moves[i];
        }
      }
      if (strict) {
        return null;
      }
      let piece = void 0;
      let matches = void 0;
      let from = void 0;
      let to = void 0;
      let promotion = void 0;
      let overlyDisambiguated = false;
      matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
      if (matches) {
        piece = matches[1];
        from = matches[2];
        to = matches[3];
        promotion = matches[4];
        if (from.length == 1) {
          overlyDisambiguated = true;
        }
      } else {
        matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
        if (matches) {
          piece = matches[1];
          from = matches[2];
          to = matches[3];
          promotion = matches[4];
          if (from.length == 1) {
            overlyDisambiguated = true;
          }
        }
      }
      pieceType = inferPieceType(cleanMove);
      moves = this._moves({
        legal: true,
        piece: piece ? piece : pieceType
      });
      if (!to) {
        return null;
      }
      for (let i = 0, len = moves.length; i < len; i++) {
        if (!from) {
          if (cleanMove === strippedSan(this._moveToSan(moves[i], moves)).replace("x", "")) {
            return moves[i];
          }
        } else if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[from] == moves[i].from && Ox88[to] == moves[i].to && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
          return moves[i];
        } else if (overlyDisambiguated) {
          const square = algebraic(moves[i].from);
          if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[to] == moves[i].to && (from == square[0] || from == square[1]) && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
            return moves[i];
          }
        }
      }
      return null;
    }
    ascii() {
      let s = "   +------------------------+\n";
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (file(i) === 0) {
          s += " " + "87654321"[rank(i)] + " |";
        }
        if (this._board[i]) {
          const piece = this._board[i].type;
          const color = this._board[i].color;
          const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
          s += " " + symbol + " ";
        } else {
          s += " . ";
        }
        if (i + 1 & 136) {
          s += "|\n";
          i += 8;
        }
      }
      s += "   +------------------------+\n";
      s += "     a  b  c  d  e  f  g  h";
      return s;
    }
    perft(depth) {
      const moves = this._moves({ legal: false });
      let nodes = 0;
      const color = this._turn;
      for (let i = 0, len = moves.length; i < len; i++) {
        this._makeMove(moves[i]);
        if (!this._isKingAttacked(color)) {
          if (depth - 1 > 0) {
            nodes += this.perft(depth - 1);
          } else {
            nodes++;
          }
        }
        this._undoMove();
      }
      return nodes;
    }
    setTurn(color) {
      if (this._turn == color) {
        return false;
      }
      this.move("--");
      return true;
    }
    turn() {
      return this._turn;
    }
    board() {
      const output = [];
      let row = [];
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (this._board[i] == null) {
          row.push(null);
        } else {
          row.push({
            square: algebraic(i),
            type: this._board[i].type,
            color: this._board[i].color
          });
        }
        if (i + 1 & 136) {
          output.push(row);
          row = [];
          i += 8;
        }
      }
      return output;
    }
    squareColor(square) {
      if (square in Ox88) {
        const sq = Ox88[square];
        return (rank(sq) + file(sq)) % 2 === 0 ? "light" : "dark";
      }
      return null;
    }
    history({ verbose = false } = {}) {
      const reversedHistory = [];
      const moveHistory = [];
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      while (true) {
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        if (verbose) {
          moveHistory.push(new Move(this, move));
        } else {
          moveHistory.push(this._moveToSan(move, this._moves()));
        }
        this._makeMove(move);
      }
      return moveHistory;
    }
    /*
     * Keeps track of position occurrence counts for the purpose of repetition
     * checking. Old positions are removed from the map if their counts are reduced to 0.
     */
    _getPositionCount(hash) {
      return this._positionCount.get(hash) ?? 0;
    }
    _incPositionCount() {
      this._positionCount.set(this._hash, (this._positionCount.get(this._hash) ?? 0) + 1);
    }
    _decPositionCount(hash) {
      const currentCount = this._positionCount.get(hash) ?? 0;
      if (currentCount === 1) {
        this._positionCount.delete(hash);
      } else {
        this._positionCount.set(hash, currentCount - 1);
      }
    }
    _pruneComments() {
      const reversedHistory = [];
      const currentComments = {};
      const copyComment = (fen) => {
        if (fen in this._comments) {
          currentComments[fen] = this._comments[fen];
        }
      };
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      copyComment(this.fen());
      while (true) {
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        this._makeMove(move);
        copyComment(this.fen());
      }
      this._comments = currentComments;
    }
    getComment() {
      return this._comments[this.fen()];
    }
    setComment(comment) {
      this._comments[this.fen()] = comment.replace("{", "[").replace("}", "]");
    }
    /**
     * @deprecated Renamed to `removeComment` for consistency
     */
    deleteComment() {
      return this.removeComment();
    }
    removeComment() {
      const comment = this._comments[this.fen()];
      delete this._comments[this.fen()];
      return comment;
    }
    getComments() {
      this._pruneComments();
      return Object.keys(this._comments).map((fen) => {
        return { fen, comment: this._comments[fen] };
      });
    }
    /**
     * @deprecated Renamed to `removeComments` for consistency
     */
    deleteComments() {
      return this.removeComments();
    }
    removeComments() {
      this._pruneComments();
      return Object.keys(this._comments).map((fen) => {
        const comment = this._comments[fen];
        delete this._comments[fen];
        return { fen, comment };
      });
    }
    setCastlingRights(color, rights) {
      for (const side of [KING, QUEEN]) {
        if (rights[side] !== void 0) {
          if (rights[side]) {
            this._castling[color] |= SIDES[side];
          } else {
            this._castling[color] &= ~SIDES[side];
          }
        }
      }
      this._updateCastlingRights();
      const result = this.getCastlingRights(color);
      return (rights[KING] === void 0 || rights[KING] === result[KING]) && (rights[QUEEN] === void 0 || rights[QUEEN] === result[QUEEN]);
    }
    getCastlingRights(color) {
      return {
        [KING]: (this._castling[color] & SIDES[KING]) !== 0,
        [QUEEN]: (this._castling[color] & SIDES[QUEEN]) !== 0
      };
    }
    moveNumber() {
      return this._moveNumber;
    }
  };

  // src/chesscomPgn.js
  var TCN_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++=";
  var PROMOTION_PIECES = "qnrbkp";
  var FILES = "abcdefgh";
  function squareFromIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index > 63) {
      throw new Error("Invalid square in Chess.com move data");
    }
    return FILES[index % 8] + (Math.floor(index / 8) + 1);
  }
  function decodeTcnMove(encoded) {
    const fromIndex = TCN_CHARS.indexOf(encoded[0]);
    let toIndex = TCN_CHARS.indexOf(encoded[1]);
    if (fromIndex < 0 || toIndex < 0) {
      throw new Error("Unknown Chess.com move encoding");
    }
    if (fromIndex > 75) {
      throw new Error("Drop-move variants are not supported yet");
    }
    let promotion;
    if (toIndex > 63) {
      promotion = PROMOTION_PIECES[Math.floor((toIndex - 64) / 3)];
      toIndex = fromIndex + (fromIndex < 16 ? -8 : 8) + (toIndex - 1) % 3 - 1;
    }
    return {
      from: squareFromIndex(fromIndex),
      to: squareFromIndex(toIndex),
      ...promotion ? { promotion } : {}
    };
  }
  async function fetchCurrentChessComPgn({ signal } = {}) {
    const match = location.pathname.match(
      /^\/(?:analysis\/)?game\/(live|daily)\/(\d+)(?:\/|$)/
    );
    if (!match) {
      throw new Error(
        "Open a completed Chess.com game page to fetch its PGN."
      );
    }
    const [, gameType, gameId] = match;
    const response = await fetch(
      `/callback/${gameType}/game/${gameId}`,
      {
        signal,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }
    );
    if (!response.ok) {
      throw new Error(
        `Chess.com returned HTTP ${response.status}`
      );
    }
    const data = await response.json();
    const gameData = data?.game;
    if (!gameData) {
      throw new Error("Chess.com returned no game data");
    }
    const headers = gameData.pgnHeaders || gameData.pgnheader || {};
    const result = headers.Result;
    if (!["1-0", "0-1", "1/2-1/2"].includes(result)) {
      throw new Error(
        "A completed-game result is not available yet."
      );
    }
    const moveList = gameData.moveList;
    if (typeof moveList !== "string" || moveList.length === 0 || moveList.length % 2 !== 0) {
      throw new Error("Chess.com returned an invalid move list");
    }
    const chess = new Chess();
    if (headers.FEN) {
      chess.load(headers.FEN);
    }
    for (let i = 0; i < moveList.length; i += 2) {
      const move = decodeTcnMove(
        moveList.slice(i, i + 2)
      );
      const sourcePiece = chess.get(move.from);
      const targetPiece = chess.get(move.to);
      if (sourcePiece?.type === "k" && targetPiece?.type === "r" && sourcePiece.color === targetPiece.color) {
        const kingside = FILES.indexOf(move.to[0]) > FILES.indexOf(move.from[0]);
        move.to = `${kingside ? "g" : "c"}${move.from[1]}`;
      }
      try {
        chess.move(move);
      } catch {
        throw new Error(
          `Could not reconstruct move ${i / 2 + 1}. This game may use an unsupported variant.`
        );
      }
    }
    const supportedHeaders = [
      "Event",
      "Site",
      "Date",
      "Round",
      "White",
      "Black",
      "Result",
      "WhiteElo",
      "BlackElo",
      "TimeControl",
      "Termination",
      "SetUp",
      "FEN"
    ];
    for (const key of supportedHeaders) {
      if (headers[key] != null) {
        chess.header(key, String(headers[key]));
      }
    }
    return chess.pgn();
  }

  // src/missDetection.js
  var VALUES = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
  };
  function materialAdvantage(chess, color) {
    let own = 0;
    let opponent = 0;
    for (const row of chess.board()) {
      for (const piece of row) {
        if (!piece) continue;
        const value = VALUES[piece.type] ?? 0;
        if (piece.color === color) {
          own += value;
        } else {
          opponent += value;
        }
      }
    }
    return own - opponent;
  }
  function detectMissedOpportunity({
    beforeFen,
    bestVariation,
    bestMovePlayed,
    beforePlayerCp,
    afterPlayerCp,
    color
  }) {
    if (bestMovePlayed) return null;
    if (!beforeFen || !Array.isArray(bestVariation) || bestVariation.length < 3 || !["w", "b"].includes(color)) {
      return null;
    }
    if (!Number.isFinite(beforePlayerCp) || !Number.isFinite(afterPlayerCp)) {
      return null;
    }
    const evaluationLoss = beforePlayerCp - afterPlayerCp;
    if (evaluationLoss < 150) return null;
    try {
      const chess = new Chess(beforeFen);
      if (chess.turn() !== color) return null;
      const startingAdvantage = materialAdvantage(chess, color);
      let captures = 0;
      let playedMoves = 0;
      for (const uci of bestVariation.slice(0, 10)) {
        if (typeof uci !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
          return null;
        }
        let move;
        try {
          move = chess.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci[4] || void 0
          });
        } catch {
          return null;
        }
        if (!move) return null;
        playedMoves++;
        if (move.captured) captures++;
      }
      if (playedMoves < 3 || captures === 0) {
        return null;
      }
      const endingAdvantage = materialAdvantage(chess, color);
      const materialGain = endingAdvantage - startingAdvantage;
      if (materialGain < 1) return null;
      return {
        grade: "miss",
        materialGain,
        evaluationLoss,
        explanation: `Stockfish found a continuation that gains approximately ${materialGain.toFixed(1)} pawn-equivalents of material. The played move missed that opportunity.`
      };
    } catch (error) {
      console.warn("[Miss Detection]", error.message);
      return null;
    }
  }

  // src/brilliantRules.js
  function approximateWinChance(cp) {
    return Number.isFinite(cp) ? 1 / (1 + Math.exp(-cp / 220)) : null;
  }
  function classifyBrilliantMove({ baseGrade, verification: v, rating }) {
    const ratingUsed = Number.isFinite(rating) && rating > 0 ? rating : 1500;
    const tolerance = ratingUsed < 1200 ? 35 : 22;
    const beforeCp = v?.beforeCp ?? null, playedCp = v?.playedCp ?? null;
    const cpGap = v?.deepCpGap ?? null;
    const beforeChance = approximateWinChance(beforeCp);
    const playedChance = approximateWinChance(playedCp);
    const winChanceGap = beforeChance == null || playedChance == null ? null : Math.max(0, beforeChance - playedChance);
    const counterfactual = v?.counterfactual;
    const counterfactualVerified = counterfactual?.verified === true && typeof counterfactual.alreadyCompletelyWinning === "boolean" && counterfactual.depth === v?.analysisDepth && counterfactual.allAlternativesCovered === true;
    const alreadyCompletelyWinning = counterfactualVerified ? counterfactual.alreadyCompletelyWinning : null;
    const evidence = {
      eligible: false,
      reason: "",
      isSacrifice: Boolean(v?.isSacrifice),
      sacrificeType: v?.sacrificeType ?? "unknown",
      bestMovePlayed: Boolean(v?.deepBestMovePlayed),
      nearBest: Number.isFinite(cpGap) && cpGap <= tolerance && winChanceGap <= 0.04,
      depth: v?.analysisDepth ?? null,
      playedMove: v?.playedUci ?? null,
      bestMove: v?.rootBestMove ?? null,
      beforeCp,
      playedCp,
      cpGap,
      winChanceGap,
      compensationVerified: Boolean(v?.verified && v?.worstAcceptedCp >= -100),
      alreadyCompletelyWinning,
      counterfactualVerified,
      bestNonSacrificingCp: counterfactual?.bestNonSacrificingCp ?? null,
      alternativeUpperBoundCp: counterfactual?.alternativeUpperBoundCp ?? null,
      ratingUsed
    };
    const reject = (reason) => ({ grade: baseGrade, ...evidence, reason });
    if (!v?.verified) return reject(v?.reason || "Sacrifice verification missing");
    if (!evidence.isSacrifice) return reject("No meaningful material or forcing temporary sacrifice");
    if (!v.qualityVerified || ![beforeCp, playedCp, cpGap, v.deepAfter, v.worstAcceptedCp].every(Number.isFinite))
      return reject("Incomplete equal-depth root MultiPV evidence");
    if (!evidence.nearBest) return reject("Played move is not near-best in the same root search");
    if (!counterfactualVerified) return reject("Incomplete counterfactual evidence: " + (counterfactual?.reason || "alternatives not verified"));
    if (alreadyCompletelyWinning) return reject("Already completely winning with a non-sacrificing alternative");
    if (playedCp < -100 || v.deepAfter < -100 || v.worstAcceptedCp < -100)
      return reject("Sacrifice leaves a bad position or lacks compensation");
    return {
      grade: baseGrade,
      ...evidence,
      eligible: true,
      reason: "Verified candidate; automatic Brilliant awards remain disabled"
    };
  }

  // src/moveExplanation.js
  var PIECE_NAMES = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king"
  };
  var PIECE_VALUES = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9
  };
  function getBestMoveSan(fen, uci) {
    if (!uci || uci.length < 4) return null;
    try {
      const chess = new Chess(fen);
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] || void 0
      });
      return move?.san || null;
    } catch {
      return null;
    }
  }
  function generateMoveExplanation({
    move,
    grade,
    beforeFen,
    afterFen,
    bestMove,
    bestMovePlayed,
    beforePlayerCp,
    afterPlayerCp
  }) {
    const after2 = new Chess(afterFen);
    const player = move.color === "w" ? "White" : "Black";
    const opponent = move.color === "w" ? "Black" : "White";
    const bestSan = getBestMoveSan(beforeFen, bestMove);
    if (after2.isCheckmate()) {
      return `${move.san} delivers checkmate and ends the game.`;
    }
    if (["blunder", "mistake"].includes(grade)) {
      const replies = after2.moves({ verbose: true });
      for (const reply of replies) {
        const test = new Chess(afterFen);
        test.move(reply);
        if (test.isCheckmate()) {
          const betterMove2 = bestSan ? ` Stockfish preferred ${bestSan}.` : "";
          return `${opponent} has checkmate in one with ${reply.san}.${betterMove2}`;
        }
      }
    }
    if (["blunder", "mistake"].includes(grade)) {
      const captures = after2.moves({ verbose: true });
      const valuableCaptures = captures.filter((reply) => {
        if (!reply.captured) return false;
        const target = after2.get(reply.to);
        return target && target.color === move.color && (PIECE_VALUES[target.type] || 0) >= 5;
      }).sort(
        (a, b) => (PIECE_VALUES[b.captured] || 0) - (PIECE_VALUES[a.captured] || 0)
      );
      if (valuableCaptures.length > 0) {
        const capture = valuableCaptures[0];
        const pieceName = PIECE_NAMES[capture.captured];
        const betterMove2 = bestSan ? ` Stockfish preferred ${bestSan}.` : "";
        return `${opponent} can immediately capture your ${pieceName} on ${capture.to} with ${capture.san}.${betterMove2}`;
      }
    }
    const evaluationDrop = beforePlayerCp - afterPlayerCp;
    if (["blunder", "mistake", "inaccuracy"].includes(grade) && Number.isFinite(evaluationDrop) && evaluationDrop > 0 && Math.abs(beforePlayerCp) < 3e3 && Math.abs(afterPlayerCp) < 3e3) {
      const lostPawns = (evaluationDrop / 100).toFixed(2);
      const betterMove2 = bestSan ? ` Stockfish preferred ${bestSan}.` : "";
      return `This move worsened ${player}'s engine evaluation by approximately ${lostPawns} pawns.${betterMove2}`;
    }
    if (grade === "brilliant") {
      return "This move passed the extension's sacrifice-verification checks while maintaining a strong evaluation.";
    }
    if (grade === "great") {
      return "This was a critical engine-preferred move. The next-best analyzed alternative was significantly weaker.";
    }
    const features = [];
    if (move.captured) {
      features.push(
        `captures a ${PIECE_NAMES[move.captured]}`
      );
    }
    if (move.promotion) {
      features.push(
        `promotes a pawn to a ${PIECE_NAMES[move.promotion]}`
      );
    }
    if (after2.isCheck()) {
      features.push("gives check");
    }
    if (features.length > 0) {
      const action = features.join(" and ");
      if (bestMovePlayed) {
        return `This ${action} and matches Stockfish's preferred move.`;
      }
      return `This ${action}. The engine classified it as ${grade}.`;
    }
    if (bestMovePlayed) {
      return "This matches Stockfish's preferred move and preserves the engine's expected result.";
    }
    if (grade === "excellent" || grade === "good") {
      return "A reasonable continuation that keeps the position relatively stable.";
    }
    const betterMove = bestSan ? ` Stockfish preferred ${bestSan}.` : "";
    return `The engine classified this move as ${grade}.${betterMove}`;
  }

  // src/graph.js
  function createEvaluationGraph(graphData, reviewedMoves, onSelectMove) {
    const NS = "http://www.w3.org/2000/svg";
    const container = document.createElement("div");
    container.className = "chess-evaluation-graph";
    const heading = document.createElement("h3");
    heading.textContent = "Evaluation Graph";
    const selectedLabel = document.createElement("div");
    selectedLabel.className = "chess-graph-selection";
    selectedLabel.textContent = "Select a move on the graph";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 600 220");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      "Chess position evaluation graph"
    );
    const width = 600;
    const height = 220;
    const padding = 20;
    function normalize(cp) {
      return Math.tanh(cp / 500);
    }
    const x = (ply) => padding + ply / Math.max(1, graphData.length - 1) * (width - padding * 2);
    const y = (cp) => height / 2 - normalize(cp) * (height / 2 - padding);
    function addSvgElement(tag, attributes, parent = svg) {
      const element = document.createElementNS(NS, tag);
      for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, String(value));
      }
      parent.appendChild(element);
      return element;
    }
    for (const cp of [-500, -200, 0, 200, 500]) {
      addSvgElement("line", {
        x1: padding,
        x2: width - padding,
        y1: y(cp),
        y2: y(cp),
        stroke: cp === 0 ? "#999" : "#484641",
        "stroke-width": cp === 0 ? 1.5 : 1,
        "stroke-dasharray": cp === 0 ? "none" : "4 4"
      });
    }
    const points = graphData.map((point) => ({
      x: x(point.ply),
      y: y(point.whiteCp),
      ply: point.ply,
      cp: point.whiteCp
    }));
    const pathData = points.map(
      (point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    ).join(" ");
    addSvgElement("path", {
      d: pathData,
      fill: "none",
      stroke: "#81b64c",
      "stroke-width": 3,
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    });
    const circles = [];
    for (const point of points) {
      const move = reviewedMoves[point.ply - 1];
      const gradeColors = {
        best: "#81b64c",
        excellent: "#81b64c",
        good: "#96af8b",
        inaccuracy: "#f0c15c",
        mistake: "#e69b50",
        blunder: "#e05252",
        brilliant: "#1baca6",
        great: "#5c8bb0"
      };
      const circle = addSvgElement("circle", {
        cx: point.x,
        cy: point.y,
        r: point.ply === 0 ? 3 : 5,
        fill: move ? gradeColors[move.grade] || "#81b64c" : "#aaa",
        stroke: "#242320",
        "stroke-width": 2,
        tabindex: 0,
        role: "button",
        "aria-label": point.ply === 0 ? "Starting position" : `Move ${point.ply}, evaluation ${(point.cp / 100).toFixed(2)}`
      });
      const select = () => {
        circles.forEach(
          (c) => c.setAttribute("stroke", "#242320")
        );
        circle.setAttribute("stroke", "#ffffff");
        selectedLabel.textContent = point.ply === 0 ? "Starting position" : `Move ${point.ply}: ${move.san} | Evaluation: ${point.cp >= 0 ? "+" : ""}${(point.cp / 100).toFixed(2)}`;
        onSelectMove?.(point.ply);
      };
      circle.addEventListener("click", select);
      circle.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });
      circles.push(circle);
    }
    container.append(heading, svg, selectedLabel);
    return container;
  }

  // src/grading.js
  var GRADES = {
    best: {
      label: "Best",
      symbol: "\u2605",
      color: "#81b64c"
    },
    excellent: {
      label: "Excellent",
      symbol: "!",
      color: "#81b64c"
    },
    good: {
      label: "Good",
      symbol: "",
      color: "#96af8b"
    },
    inaccuracy: {
      label: "Inaccuracy",
      symbol: "?!",
      color: "#f0c15c"
    },
    miss: {
      label: "Miss",
      symbol: "\u2715",
      color: "#f16b6b"
    },
    mistake: {
      label: "Mistake",
      symbol: "?",
      color: "#e69b50"
    },
    blunder: {
      label: "Blunder",
      symbol: "??",
      color: "#e05252"
    },
    brilliant: {
      label: "Brilliant",
      symbol: "!!",
      color: "#1baca6"
    },
    great: {
      label: "Great",
      symbol: "!",
      color: "#5c8bb0"
    }
  };
  var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function winChance(cp) {
    if (!Number.isFinite(cp)) return 0.5;
    const score = clamp(cp, -1e4, 1e4);
    return 1 / (1 + Math.exp(-368208e-8 * score));
  }
  function classifyMove({
    beforeCp,
    afterCp,
    bestMovePlayed
  }) {
    if (!Number.isFinite(beforeCp) || !Number.isFinite(afterCp)) {
      return { grade: "good", loss: 0 };
    }
    const loss = clamp(
      winChance(beforeCp) - winChance(afterCp),
      0,
      1
    );
    if (loss >= 0.2) {
      return { grade: "blunder", loss };
    }
    if (loss >= 0.1) {
      return { grade: "mistake", loss };
    }
    if (loss >= 0.05) {
      return { grade: "inaccuracy", loss };
    }
    if (bestMovePlayed) {
      return { grade: "best", loss };
    }
    if (loss <= 5e-3) {
      return { grade: "excellent", loss };
    }
    return { grade: "good", loss };
  }
  function moveAccuracyFromWinLoss(winLoss) {
    if (!Number.isFinite(winLoss)) return null;
    const loss = Math.max(0, winLoss);
    const accuracy = 103.1668100711649 * Math.exp(-0.04354415386753951 * loss) - 3.166924740191411;
    return clamp(accuracy, 0, 100);
  }
  function calculateMoveAccuracy(beforeCp, afterCp) {
    if (!Number.isFinite(beforeCp) || !Number.isFinite(afterCp)) {
      return null;
    }
    const beforeWin = winChance(beforeCp) * 100;
    const afterWin = winChance(afterCp) * 100;
    const loss = Math.max(0, beforeWin - afterWin);
    return moveAccuracyFromWinLoss(loss);
  }
  function standardDeviation(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, n) => sum + n, 0) / values.length;
    const variance = values.reduce(
      (sum, n) => sum + (n - mean) ** 2,
      0
    ) / values.length;
    return Math.sqrt(variance);
  }
  function calculateAccuracy(reviewedMoves, color) {
    if (!Array.isArray(reviewedMoves) || reviewedMoves.length === 0 || !["w", "b"].includes(color)) {
      return null;
    }
    if (reviewedMoves.some(
      (move) => !Number.isFinite(move.beforePlayerCp) || !Number.isFinite(move.afterPlayerCp)
    )) {
      console.warn(
        "[Accuracy] Missing evaluation data"
      );
      return null;
    }
    const first = reviewedMoves[0];
    const initialWhiteCp = first.color === "w" ? first.beforePlayerCp : -first.beforePlayerCp;
    const whiteCps = [
      initialWhiteCp,
      ...reviewedMoves.map(
        (move) => move.color === "w" ? move.afterPlayerCp : -move.afterPlayerCp
      )
    ];
    const winPercents = whiteCps.map((cp) => winChance(cp) * 100);
    const windowSize = clamp(
      Math.floor(reviewedMoves.length / 10),
      2,
      8
    );
    const weights = reviewedMoves.map((_, index) => {
      const start = Math.max(
        0,
        Math.min(
          index - Math.floor(windowSize / 2),
          winPercents.length - windowSize
        )
      );
      const values = winPercents.slice(
        start,
        start + windowSize
      );
      return clamp(
        standardDeviation(values),
        0.5,
        12
      );
    });
    let weightedSum = 0;
    let totalWeight = 0;
    const accuracies = [];
    for (let i = 0; i < reviewedMoves.length; i++) {
      const move = reviewedMoves[i];
      if (move.color !== color) continue;
      const accuracy = calculateMoveAccuracy(
        move.beforePlayerCp,
        move.afterPlayerCp
      );
      if (accuracy === null) return null;
      accuracies.push(accuracy);
      weightedSum += accuracy * weights[i];
      totalWeight += weights[i];
    }
    if (accuracies.length === 0) return null;
    const weightedMean = weightedSum / totalWeight;
    const harmonicMean = accuracies.some((value) => value === 0) ? 0 : accuracies.length / accuracies.reduce(
      (sum, value) => sum + 1 / value,
      0
    );
    const finalAccuracy = (weightedMean + harmonicMean) / 2;
    console.log("[Accuracy]", {
      color,
      moves: accuracies.length,
      weightedMean: weightedMean.toFixed(2),
      harmonicMean: harmonicMean.toFixed(2),
      finalAccuracy: finalAccuracy.toFixed(2)
    });
    return clamp(finalAccuracy, 0, 100);
  }
  function classifyTacticalMove({
    baseGrade,
    bestMovePlayed,
    beforeCp,
    afterCp,
    materialBefore,
    materialAfter,
    isCapture,
    isCheck,
    alternativeLoss = null
  }) {
    if (!bestMovePlayed) return baseGrade;
    const loss = Math.max(
      0,
      winChance(beforeCp) - winChance(afterCp)
    );
    const criticalPosition = Number.isFinite(beforeCp) && Number.isFinite(afterCp) && beforeCp < 300 && afterCp > -100;
    if (criticalPosition && alternativeLoss !== null && alternativeLoss >= 0.1 && loss < 0.02) {
      return "great";
    }
    return baseGrade;
  }
  function calculateAlternativeLoss(candidates) {
    if (!Array.isArray(candidates)) return null;
    const best = candidates.find((c) => c.rank === 1);
    const second = candidates.find((c) => c.rank === 2);
    if (!best || !second) return null;
    if (!Number.isInteger(best.depth) || best.depth < 1 || best.depth !== second.depth || best.bound || second.bound) return null;
    function score(candidate) {
      if (candidate.mate !== null && candidate.mate !== void 0) {
        return Number.isFinite(candidate.mate) && candidate.mate !== 0 ? Math.sign(candidate.mate) * 1e4 : null;
      }
      return candidate.scoreCp;
    }
    const bestCp = score(best);
    const secondCp = score(second);
    if (!Number.isFinite(bestCp) || !Number.isFinite(secondCp)) {
      return null;
    }
    return Math.max(
      0,
      winChance(bestCp) - winChance(secondCp)
    );
  }

  // src/board.js
  function createReviewBoard(pgn2, reviewedMoves, graphData, onMoveChange, evaluateLivePosition) {
    const game = new Chess();
    game.loadPgn(pgn2);
    const moves = game.history({ verbose: true });
    const replay = new Chess();
    if (game.header().FEN) replay.load(game.header().FEN);
    const positions = [replay.fen()];
    for (const move of moves) {
      replay.move(move.san);
      positions.push(replay.fen());
    }
    let destroyed = false;
    let currentPly = positions.length - 1;
    let flipped = false;
    let selectedSquare = null;
    let legalDestinations = [];
    let variationFens = [];
    let variationMoves = [];
    let engineVariationReturnPly = null;
    const liveEvaluationCache = /* @__PURE__ */ new Map();
    let liveEvaluation = null;
    let liveEvaluationPending = false;
    let liveEvaluationError = "";
    let liveRequestVersion = 0;
    let liveDebounceTimer = null;
    let lastShownWhiteCp = graphData[currentPly]?.whiteCp ?? 0;
    function invalidateLiveEvaluation() {
      liveRequestVersion++;
      if (liveDebounceTimer !== null) {
        clearTimeout(liveDebounceTimer);
        liveDebounceTimer = null;
      }
      liveEvaluation = null;
      liveEvaluationPending = false;
      liveEvaluationError = "";
    }
    function formatEvaluation(whiteCp, mate = null) {
      if (mate !== null && mate !== void 0) {
        return `${whiteCp >= 0 ? "+" : "-"}M${Math.abs(mate)}`;
      }
      if (!Number.isFinite(whiteCp)) return "\u2014";
      return `${whiteCp >= 0 ? "+" : ""}${(whiteCp / 100).toFixed(2)}`;
    }
    function setEvaluationBar(whiteCp) {
      if (!Number.isFinite(whiteCp)) return;
      lastShownWhiteCp = whiteCp;
      evalWhite.style.height = `${100 / (1 + Math.exp(-whiteCp / 250))}%`;
      evalText.textContent = formatEvaluation(whiteCp);
    }
    function requestLiveEvaluation() {
      invalidateLiveEvaluation();
      if (destroyed || !container.isConnected || !isExploring()) return;
      const fen = currentFen();
      const requestVersion = liveRequestVersion;
      const cached = liveEvaluationCache.get(fen);
      if (cached) {
        liveEvaluation = cached;
        render(false);
        return;
      }
      const position = new Chess(fen);
      if (position.isGameOver()) {
        const whiteCp = position.isCheckmate() ? position.turn() === "w" ? -1e4 : 1e4 : 0;
        liveEvaluation = {
          fen,
          whiteCp,
          mate: position.isCheckmate() ? 0 : null,
          bestMove: null
        };
        liveEvaluationCache.set(fen, liveEvaluation);
        if (liveEvaluationCache.size > 128) liveEvaluationCache.delete(liveEvaluationCache.keys().next().value);
        render(false);
        return;
      }
      if (typeof evaluateLivePosition !== "function") {
        liveEvaluationError = "Live engine not connected";
        render(false);
        return;
      }
      liveEvaluationPending = true;
      render(false);
      liveDebounceTimer = setTimeout(async () => {
        liveDebounceTimer = null;
        try {
          const result = await evaluateLivePosition(fen, 12);
          if (destroyed || requestVersion !== liveRequestVersion || currentFen() !== fen || !isExploring()) return;
          const positionTurn = fen.split(" ")[1];
          let whiteCp;
          if (result.mate !== null && result.mate !== void 0) {
            whiteCp = Math.sign(result.mate) * 1e4;
          } else if (Number.isFinite(result.score)) {
            whiteCp = result.score;
          } else {
            throw new Error("Engine returned no position evaluation");
          }
          if (positionTurn === "b") whiteCp = -whiteCp;
          const evaluation = {
            fen,
            whiteCp,
            mate: result.mate ?? null,
            bestMove: result.bestMove ?? null
          };
          liveEvaluationCache.set(fen, evaluation);
          if (liveEvaluationCache.size > 128) liveEvaluationCache.delete(liveEvaluationCache.keys().next().value);
          liveEvaluation = evaluation;
          liveEvaluationPending = false;
          liveEvaluationError = "";
          render(false);
        } catch (error) {
          if (destroyed || requestVersion !== liveRequestVersion || !isExploring() || currentFen() !== fen) return;
          liveEvaluationPending = false;
          liveEvaluationError = error?.message || "Engine request failed";
          console.error("[Chess Review] Live evaluation:", error);
          render(false);
        }
      }, 220);
    }
    const container = document.createElement("div");
    container.className = "chess-review-board-section";
    container.tabIndex = 0;
    container.setAttribute("aria-label", "Interactive chess review board");
    const info = document.createElement("div");
    info.className = "chess-board-info";
    const board = document.createElement("div");
    board.className = "chess-review-board";
    const boardWithEval = document.createElement("div");
    boardWithEval.className = "chess-board-with-eval";
    const evalBar = document.createElement("div");
    evalBar.className = "chess-eval-bar";
    const evalWhite = document.createElement("div");
    evalWhite.className = "chess-eval-white";
    const evalText = document.createElement("span");
    evalText.className = "chess-eval-text";
    evalBar.append(evalWhite, evalText);
    boardWithEval.append(evalBar, board);
    const controls = document.createElement("div");
    controls.className = "chess-board-controls";
    const variationControls = document.createElement("div");
    variationControls.className = "chess-variation-controls";
    function makeButton(label, title, parent, handler) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.title = title;
      button.addEventListener("click", handler);
      parent.appendChild(button);
      return button;
    }
    const first = makeButton("\u23EE", "First game position", controls, () => goToMove(0));
    const previous = makeButton("\u25C0", "Previous move / undo exploration", controls, () => {
      if (variationMoves.length) undoVariation();
      else goToMove(currentPly - 1);
    });
    const next = makeButton("\u25B6", "Next game move", controls, () => goToMove(currentPly + 1));
    const last = makeButton("\u23ED", "Final game position", controls, () => goToMove(moves.length));
    makeButton("\u21C5", "Flip board", controls, () => {
      flipped = !flipped;
      render(false);
    });
    const undoButton = makeButton("\u21B6 Undo custom move", "Undo last exploratory move", variationControls, undoVariation);
    const resetButton = makeButton("Return to game", "Discard exploratory moves", variationControls, resetVariation);
    const promotionPicker = document.createElement("div");
    promotionPicker.className = "chess-promotion-picker";
    promotionPicker.hidden = true;
    const hint = document.createElement("div");
    hint.className = "chess-interaction-hint";
    hint.textContent = "Click a piece to see legal moves, then click a square. You can also drag pieces.";
    container.append(info, boardWithEval, controls, variationControls, hint, promotionPicker);
    function isExploring() {
      return variationMoves.length > 0;
    }
    function currentFen() {
      return isExploring() ? variationFens[variationFens.length - 1] : positions[currentPly];
    }
    function clearSelection() {
      selectedSquare = null;
      legalDestinations = [];
    }
    function resetVariation() {
      invalidateLiveEvaluation();
      if (engineVariationReturnPly !== null) {
        currentPly = engineVariationReturnPly;
      }
      engineVariationReturnPly = null;
      variationFens = [];
      variationMoves = [];
      clearSelection();
      promotionPicker.hidden = true;
      promotionPicker.replaceChildren();
      render();
    }
    function undoVariation() {
      if (!variationMoves.length) return;
      variationMoves.pop();
      variationFens.pop();
      if (!variationMoves.length) {
        variationFens = [];
        if (engineVariationReturnPly !== null) {
          currentPly = engineVariationReturnPly;
          engineVariationReturnPly = null;
        }
      }
      clearSelection();
      promotionPicker.hidden = true;
      promotionPicker.replaceChildren();
      render();
      requestLiveEvaluation();
    }
    function goToMove(ply) {
      engineVariationReturnPly = null;
      invalidateLiveEvaluation();
      currentPly = Math.max(0, Math.min(moves.length, Math.trunc(Number(ply) || 0)));
      variationFens = [];
      variationMoves = [];
      clearSelection();
      promotionPicker.hidden = true;
      promotionPicker.replaceChildren();
      render();
    }
    function showEngineVariation(reviewPly, pv, count = 1) {
      const movePly = Number(reviewPly);
      if (!Number.isInteger(movePly) || movePly < 1 || movePly > moves.length || !Array.isArray(pv) || !pv.length || !Number.isInteger(count) || count < 1 || count > pv.length) {
        return false;
      }
      const basePly = movePly - 1;
      const preview = new Chess(positions[basePly]);
      const nextFens = [preview.fen()];
      const nextMoves = [];
      for (const uci of pv.slice(0, count)) {
        if (typeof uci !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return false;
        try {
          const played = preview.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            ...uci[4] ? { promotion: uci[4] } : {}
          });
          if (!played) return false;
          nextMoves.push(played);
          nextFens.push(preview.fen());
        } catch {
          return false;
        }
      }
      invalidateLiveEvaluation();
      currentPly = basePly;
      engineVariationReturnPly = movePly;
      variationFens = nextFens;
      variationMoves = nextMoves;
      clearSelection();
      promotionPicker.hidden = true;
      promotionPicker.replaceChildren();
      render(false);
      requestLiveEvaluation();
      return true;
    }
    function chooseSquare(squareName) {
      if (!promotionPicker.hidden) return;
      const chess = new Chess(currentFen());
      const piece = chess.get(squareName);
      if (selectedSquare && selectedSquare !== squareName) {
        const allowed = chess.moves({ square: selectedSquare, verbose: true }).filter((move) => move.to === squareName);
        if (allowed.length) {
          if (allowed.some((move) => move.promotion)) {
            showPromotionPicker(selectedSquare, squareName, allowed);
          } else {
            makeCustomMove(selectedSquare, squareName);
          }
          return;
        }
      }
      if (selectedSquare === squareName) {
        clearSelection();
      } else if (piece && piece.color === chess.turn()) {
        selectedSquare = squareName;
        legalDestinations = chess.moves({ square: squareName, verbose: true }).map((move) => move.to);
      } else {
        clearSelection();
      }
      render(false);
    }
    function showPromotionPicker(from, to, allowedMoves) {
      promotionPicker.replaceChildren();
      promotionPicker.hidden = false;
      const heading = document.createElement("span");
      heading.textContent = "Promote pawn to:";
      promotionPicker.appendChild(heading);
      for (const [piece, label] of [["q", "Queen"], ["r", "Rook"], ["b", "Bishop"], ["n", "Knight"]]) {
        if (!allowedMoves.some((move) => move.promotion === piece)) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", () => {
          promotionPicker.hidden = true;
          makeCustomMove(from, to, piece);
        });
        promotionPicker.appendChild(button);
      }
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", () => {
        promotionPicker.hidden = true;
        render(false);
      });
      promotionPicker.appendChild(cancel);
    }
    function makeCustomMove(from, to, promotion) {
      const chess = new Chess(currentFen());
      try {
        const details = { from, to };
        if (promotion) details.promotion = promotion;
        const played = chess.move(details);
        if (!played) return;
        if (!variationMoves.length) variationFens = [positions[currentPly]];
        variationMoves.push(played);
        variationFens.push(chess.fen());
        clearSelection();
        render(false);
        requestLiveEvaluation();
      } catch {
        clearSelection();
        render(false);
      }
    }
    function drawBestMoveArrow(uci) {
      if (!uci || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return;
      const files = "abcdefgh";
      let fromFile = files.indexOf(uci[0]);
      let fromRank = 8 - Number(uci[1]);
      let toFile = files.indexOf(uci[2]);
      let toRank = 8 - Number(uci[3]);
      if (flipped) {
        fromFile = 7 - fromFile;
        fromRank = 7 - fromRank;
        toFile = 7 - toFile;
        toRank = 7 - toRank;
      }
      const ns = "http://www.w3.org/2000/svg";
      const overlay = document.createElementNS(ns, "svg");
      overlay.classList.add("chess-best-move-overlay");
      overlay.setAttribute("viewBox", "0 0 800 800");
      overlay.setAttribute("preserveAspectRatio", "none");
      const markerId = "chess-review-arrowhead";
      const defs = document.createElementNS(ns, "defs");
      const marker = document.createElementNS(ns, "marker");
      marker.setAttribute("id", markerId);
      marker.setAttribute("markerWidth", "5");
      marker.setAttribute("markerHeight", "5");
      marker.setAttribute("refX", "3");
      marker.setAttribute("refY", "2.5");
      marker.setAttribute("orient", "auto");
      const head = document.createElementNS(ns, "path");
      head.setAttribute("d", "M0 0 L5 2.5 L0 5 Z");
      head.setAttribute("fill", "#81b64c");
      marker.appendChild(head);
      defs.appendChild(marker);
      overlay.appendChild(defs);
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", fromFile * 100 + 50);
      line.setAttribute("y1", fromRank * 100 + 50);
      line.setAttribute("x2", toFile * 100 + 50);
      line.setAttribute("y2", toRank * 100 + 50);
      line.setAttribute("stroke", "#81b64c");
      line.setAttribute("stroke-width", "15");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0.85");
      line.setAttribute("marker-end", `url(#${markerId})`);
      overlay.appendChild(line);
      board.appendChild(overlay);
    }
    function createMovePointBadge(reviewMove) {
      const gradeInfo = reviewMove && GRADES[reviewMove.grade];
      if (!gradeInfo) return null;
      const badge = document.createElement("div");
      badge.className = `chess-move-point-badge chess-grade-${reviewMove.grade}`;
      badge.title = gradeInfo.label;
      const symbol = document.createElement("span");
      symbol.className = "chess-move-point-symbol";
      symbol.textContent = gradeInfo.symbol || "\u2022";
      const label = document.createElement("span");
      label.className = "chess-move-point-text";
      label.textContent = gradeInfo.label;
      badge.append(symbol, label);
      return badge;
    }
    function render(notify = true) {
      if (destroyed) return;
      const chess = new Chess(currentFen());
      const squares = chess.board();
      const exploring = isExploring();
      const lastMove = exploring ? variationMoves[variationMoves.length - 1] : currentPly > 0 ? moves[currentPly - 1] : null;
      const currentReview = !exploring && currentPly > 0 ? reviewedMoves[currentPly - 1] : null;
      board.replaceChildren();
      board.style.position = "relative";
      for (let displayRank = 0; displayRank < 8; displayRank++) {
        for (let displayFile = 0; displayFile < 8; displayFile++) {
          const actualRank = flipped ? 7 - displayRank : displayRank;
          const actualFile = flipped ? 7 - displayFile : displayFile;
          const squareName = "abcdefgh"[actualFile] + (8 - actualRank);
          const piece = squares[actualRank][actualFile];
          const square = document.createElement("div");
          square.className = "chess-board-square";
          square.dataset.square = squareName;
          square.classList.add((actualRank + actualFile) % 2 === 0 ? "light" : "dark");
          if (lastMove && (squareName === lastMove.from || squareName === lastMove.to)) {
            square.classList.add("last-move");
          }
          if (squareName === selectedSquare) square.classList.add("chess-square-selected");
          if (legalDestinations.includes(squareName)) {
            square.classList.add(piece ? "chess-square-legal-capture" : "chess-square-legal");
          }
          if (piece) {
            const img = document.createElement("img");
            img.src = chrome.runtime.getURL(`pieces/${piece.color}${piece.type.toUpperCase()}.svg`);
            img.alt = `${piece.color === "w" ? "White" : "Black"} ${piece.type}`;
            img.className = "chess-piece-image";
            img.draggable = piece.color === chess.turn();
            if (img.draggable) {
              img.addEventListener("dragstart", (event) => {
                selectedSquare = squareName;
                legalDestinations = chess.moves({ square: squareName, verbose: true }).map((move) => move.to);
                event.dataTransfer.setData("text/plain", squareName);
                event.dataTransfer.effectAllowed = "move";
              });
            }
            square.appendChild(img);
          }
          if (!exploring && lastMove && squareName === lastMove.to) {
            const badge = createMovePointBadge(currentReview);
            if (badge) square.appendChild(badge);
          }
          square.addEventListener("click", () => chooseSquare(squareName));
          square.addEventListener("dragover", (event) => event.preventDefault());
          square.addEventListener("drop", (event) => {
            event.preventDefault();
            const from = event.dataTransfer.getData("text/plain");
            if (!/^[a-h][1-8]$/.test(from)) return;
            const dragChess = new Chess(currentFen());
            const allowed = dragChess.moves({ square: from, verbose: true }).filter((move) => move.to === squareName);
            if (!allowed.length) {
              clearSelection();
              render(false);
            } else if (allowed.some((move) => move.promotion)) {
              showPromotionPicker(from, squareName, allowed);
            } else {
              makeCustomMove(from, squareName);
            }
          });
          board.appendChild(square);
        }
      }
      if (exploring) {
        const last2 = variationMoves[variationMoves.length - 1];
        const currentLive = liveEvaluation?.fen === currentFen() ? liveEvaluation : null;
        info.textContent = `Exploring variation: ${last2.san} \xB7 ${variationMoves.length} custom move(s)`;
        if (currentLive) {
          const evalLabel = formatEvaluation(currentLive.whiteCp, currentLive.mate);
          info.textContent += ` | Live eval: ${evalLabel}`;
          setEvaluationBar(currentLive.whiteCp);
          if (currentLive.mate !== null) evalText.textContent = evalLabel;
          if (!selectedSquare) drawBestMoveArrow(currentLive.bestMove);
        } else if (liveEvaluationPending) {
          info.textContent += " | Stockfish analyzing...";
          setEvaluationBar(lastShownWhiteCp);
          evalText.textContent = "...";
        } else if (liveEvaluationError) {
          info.textContent += ` | Live analysis unavailable: ${liveEvaluationError}`;
          setEvaluationBar(lastShownWhiteCp);
          evalText.textContent = "!";
        } else {
          info.textContent += " | Waiting for Stockfish...";
          setEvaluationBar(lastShownWhiteCp);
          evalText.textContent = "...";
        }
      } else {
        const gradeInfo = currentReview && GRADES[currentReview.grade];
        const moveTitle = currentPly === 0 ? "Starting Position" : `${moves[currentPly - 1].before.split(" ")[5]}${moves[currentPly - 1].color === "w" ? "." : "..."} ${moves[currentPly - 1].san}`;
        const evalCp = graphData[currentPly]?.whiteCp;
        const evalLabel = Number.isFinite(evalCp) ? `${evalCp >= 0 ? "+" : ""}${(evalCp / 100).toFixed(2)}` : "N/A";
        info.textContent = `${moveTitle}${gradeInfo ? ` \xB7 ${gradeInfo.symbol} ${gradeInfo.label}` : ""} | Eval: ${evalLabel}`;
        if (Number.isFinite(evalCp)) {
          setEvaluationBar(evalCp);
        } else {
          evalWhite.style.height = "50%";
          evalText.textContent = "\u2014";
        }
        if (currentPly > 0 && !selectedSquare) {
          drawBestMoveArrow(reviewedMoves[currentPly]?.bestMove);
        }
      }
      first.disabled = !exploring && currentPly === 0;
      previous.disabled = !exploring && currentPly === 0;
      next.disabled = exploring || currentPly === moves.length;
      last.disabled = !exploring && currentPly === moves.length;
      undoButton.disabled = !exploring;
      resetButton.disabled = !exploring;
      if (notify && !exploring) onMoveChange?.(currentPly);
    }
    container.addEventListener("keydown", (event) => {
      if (event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "Escape") {
        promotionPicker.hidden = true;
        clearSelection();
        render(false);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (isExploring()) undoVariation();
        else goToMove(currentPly - 1);
      } else if (event.key === "ArrowRight" && !isExploring()) {
        event.preventDefault();
        goToMove(currentPly + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToMove(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToMove(moves.length);
      }
    });
    render();
    function destroy() {
      destroyed = true;
      invalidateLiveEvaluation();
      liveEvaluationCache.clear();
    }
    return { element: container, goToMove, showEngineVariation, destroy };
  }

  // src/sacrificeMaterial.js
  var VALUES2 = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  var MATERIAL_LIMITS = Object.freeze({ minimumCost: 75, maxCaptures: 4, maxExchangePlies: 8, maxExchangeNodes: 256 });
  function materialBalance(chess, color) {
    let cp = 0;
    for (const row of chess.board()) for (const piece of row) {
      if (piece) cp += (piece.color === color ? 1 : -1) * VALUES2[piece.type];
    }
    return cp / 100;
  }
  var materialCp = (chess, color) => Math.round(materialBalance(chess, color) * 100);
  var uciOf = (move) => move.from + move.to + (move.promotion || "");
  function playUci(chess, uci) {
    if (typeof uci !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error("Invalid PV move");
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }
  function after(chess, move) {
    const copy = new Chess(chess.fen());
    playUci(copy, uciOf(move));
    return copy;
  }
  function findMaterialOffers(chess, move, beforeFen = move?.before) {
    if (!chess || !move || !beforeFen || chess.isGameOver() || chess.turn() === move.color) return [];
    const baseline = materialCp(new Chess(beforeFen), move.color);
    return chess.moves({ verbose: true }).filter((capture) => capture.captured && baseline - materialCp(after(chess, capture), move.color) >= MATERIAL_LIMITS.minimumCost);
  }
  function inspectMaterialOffer({ before, chess, move, capture }) {
    const mover = move.color, baseline = materialCp(before, mover), taken = after(chess, capture);
    let nodes = 0, complete = true;
    const leaf = (position) => ({ cp: materialCp(position, mover), line: [], trace: [] });
    function choose(position, options2) {
      const maximize = position.turn() === mover;
      return options2.reduce((best, item) => {
        if (!best || (maximize ? item.cp > best.cp : item.cp < best.cp) || item.cp === best.cp && item.line.length > best.line.length) return item;
        return best;
      }, null);
    }
    function descend(position, reply, next) {
      const copy = after(position, reply), result = next(copy);
      return { cp: result.cp, line: [uciOf(reply), ...result.line], trace: [{ san: reply.san, fen: copy.fen(), materialCp: materialCp(copy, mover) }, ...result.trace] };
    }
    function exchange(position, target, plies) {
      if (nodes >= MATERIAL_LIMITS.maxExchangeNodes) {
        complete = false;
        return leaf(position);
      }
      nodes++;
      if (position.isGameOver()) return leaf(position);
      const legal = position.moves({ verbose: true });
      const captures = legal.filter((reply) => reply.captured && reply.to === target);
      if (plies === 0) {
        if (captures.length || position.isCheck()) complete = false;
        return leaf(position);
      }
      const options2 = [];
      if (!position.isCheck()) options2.push(leaf(position));
      else for (const reply of legal.filter((reply2) => !reply2.captured || reply2.to !== target)) {
        options2.push(descend(position, reply, leaf));
      }
      for (const reply of captures) options2.push(descend(position, reply, (copy) => exchange(copy, target, plies - 1)));
      return choose(position, options2) || leaf(position);
    }
    function opponentExchange(position) {
      const options2 = [];
      if (!position.isCheck()) options2.push(leaf(position));
      const legal = position.moves({ verbose: true });
      for (const reply of legal) {
        if (reply.captured) options2.push(descend(position, reply, (copy) => exchange(copy, reply.to, MATERIAL_LIMITS.maxExchangePlies - 2)));
        else if (position.isCheck()) options2.push(descend(position, reply, leaf));
        if (nodes > MATERIAL_LIMITS.maxExchangeNodes) break;
      }
      return choose(position, options2) || leaf(position);
    }
    let bestImmediate = materialCp(taken, mover);
    const recaptures = taken.moves({ verbose: true }).filter((reply) => reply.captured && reply.to === capture.to);
    const options = taken.isCheck() ? taken.moves({ verbose: true }).filter((reply) => !reply.captured || reply.to !== capture.to).map((reply) => descend(taken, reply, leaf)) : [leaf(taken)];
    for (const reply of recaptures) {
      bestImmediate = Math.max(bestImmediate, materialCp(after(taken, reply), mover));
      options.push(descend(taken, reply, opponentExchange));
    }
    const settled = choose(taken, options) || leaf(taken);
    const immediateCostCp = Math.max(0, baseline - bestImmediate);
    const delayedCostCp = complete ? Math.max(0, baseline - settled.cp) : null;
    const materialCostCp = Math.max(immediateCostCp, delayedCostCp ?? 0);
    const tacticalReplies = [];
    for (const reply of taken.moves({ verbose: true }).filter((reply2) => reply2.captured && reply2.to !== capture.to && VALUES2[reply2.captured] >= VALUES2.r)) {
      const next = after(taken, reply);
      if (next.isCheck()) tacticalReplies.push({ san: reply.san, captured: reply.captured, check: true });
    }
    const offeredSquare = capture.flags.includes("e") ? capture.to[0] + (mover === "w" ? "4" : "5") : capture.to;
    return {
      capture: capture.san,
      captureUci: uciOf(capture),
      offeredSquare,
      newlyExposed: !before.isAttacked(offeredSquare, mover === "w" ? "b" : "w"),
      offeredPiece: capture.captured,
      discovered: capture.to !== move.to,
      immediateCostCp,
      delayedCostCp,
      materialCostCp,
      materialTraceComplete: complete,
      exchangeNodes: nodes,
      materialContinuation: settled.line,
      materialTrace: settled.trace,
      tacticalReplies,
      ordinaryRecaptures: recaptures.map((reply) => ({ san: reply.san, captured: reply.captured })),
      forcingCompensation: tacticalReplies.length > 0,
      isSacrifice: materialCostCp >= MATERIAL_LIMITS.minimumCost || tacticalReplies.length > 0
    };
  }

  // src/tactics.js
  function detectSacrificeCandidate(chess, move) {
    try {
      const before = new Chess(move.before), offers = findMaterialOffers(chess, move);
      if (offers.length > MATERIAL_LIMITS.maxCaptures) return false;
      return offers.some((capture) => inspectMaterialOffer({ before, chess, move, capture }).isSacrifice);
    } catch {
      return false;
    }
  }
  function scoreForMover(e, turn, mover) {
    if (!e) return null;
    let cp;
    if (Number.isFinite(e.mate) && e.mate !== 0) cp = e.mate > 0 ? 1e4 : -1e4;
    else if (Number.isFinite(e.score)) cp = e.score;
    else return null;
    return turn === mover ? cp : -cp;
  }
  async function engineScore(chess, mover, engine, depth) {
    if (chess.isCheckmate()) return chess.turn() === mover ? -1e4 : 1e4;
    if (chess.isGameOver()) return 0;
    const result = await engine(chess.fen(), depth);
    if (result?.success === false || result?.error) throw new Error(result.error || "Engine rejected search");
    return result?.depth === depth ? scoreForMover(result, chess.turn(), mover) : null;
  }
  async function rootEvaluation(chess, mover, engine, depth, options) {
    const result = await engine(chess.fen(), depth, options);
    if (result?.success === false || result?.error) throw new Error(result.error || "Engine rejected search");
    return {
      scoreCp: scoreForMover(result, chess.turn(), mover),
      bestMove: result?.bestMove || null,
      depth: result?.depth,
      candidates: result?.candidates || []
    };
  }
  function completeRootLine(line, fen, depth) {
    if (!line || line.depth !== depth || line.bound || !Number.isInteger(line.rank) || line.rank < 1 || line.mate != null && (!Number.isFinite(line.mate) || line.mate === 0 || line.scoreCp != null) || !Number.isFinite(line.scoreCp) && !(Number.isFinite(line.mate) && line.mate !== 0) || !Array.isArray(line.pv) || !line.pv.length || line.pv.length > 128 || line.pv[0] !== line.move) return false;
    try {
      const position = new Chess(fen);
      for (const uci of line.pv) playUci(position, uci);
      return true;
    } catch {
      return false;
    }
  }
  var lineScore = (line) => scoreForMover({ score: line.scoreCp, mate: line.mate }, "w", "w");
  async function auditCaptureResponses({ before, chess, move, evaluatePosition, depth }) {
    const captures = findMaterialOffers(chess, move, before.fen());
    if (!captures.length) return { verified: true, isSacrifice: false, reason: "No legal net material offer", acceptedLines: [], materialCostCp: 0, offeredCaptureCount: 0 };
    if (captures.length > MATERIAL_LIMITS.maxCaptures) return { verified: false, reason: "Capture audit budget exceeded" };
    const acceptedLines = [];
    for (const capture of captures) {
      const evidence = inspectMaterialOffer({ before, chess, move, capture });
      const taken = new Chess(chess.fen());
      playUci(taken, uciOf(capture));
      const score = await engineScore(taken, move.color, evaluatePosition, depth);
      if (!Number.isFinite(score)) return { verified: false, reason: "Capture evaluation missing" };
      acceptedLines.push({ ...evidence, scoreCp: score, approximateMaterialCostCp: evidence.materialCostCp });
    }
    const materialCostCp = Math.max(...acceptedLines.map((line) => line.materialCostCp));
    const primaryOffer = acceptedLines.filter((line) => line.isSacrifice).sort((a, b) => b.materialCostCp - a.materialCostCp || Number(a.discovered) - Number(b.discovered))[0];
    const delayed = primaryOffer?.immediateCostCp < 75 && primaryOffer?.delayedCostCp >= 75;
    const forcingCompensation = acceptedLines.some((line) => line.forcingCompensation);
    return {
      verified: true,
      reason: "Audited legal offers and bounded material continuations",
      acceptedLines,
      isSacrifice: acceptedLines.some((line) => line.isSacrifice),
      materialCostCp,
      sacrificeType: primaryOffer?.forcingCompensation ? "forcing-temporary" : primaryOffer?.discovered ? "discovered-material" : delayed ? "delayed-material" : materialCostCp >= 75 ? "material" : "equal-exchange",
      materialTraceComplete: acceptedLines.every((line) => line.materialTraceComplete),
      opponentCanGainMaterial: materialCostCp >= 75,
      forcingCompensation,
      worstAcceptedCp: Math.min(...acceptedLines.map((line) => line.scoreCp)),
      offeredCaptureCount: acceptedLines.length
    };
  }
  async function analyzeCounterfactual({ before, move, root, evaluatePosition, depth }) {
    const fail = (reason) => ({ verified: false, alreadyCompletelyWinning: null, reason, depth, examined, excludedSacrifices: excluded, allAlternativesCovered: false });
    const examined = [], excluded = [];
    const playedUci = uciOf(move), fen = before.fen();
    let remaining = before.moves({ verbose: true }).map(uciOf).filter((uci) => uci !== playedUci);
    const finish = (winning, reason, line = null, nonSacrificing = false) => ({
      verified: true,
      alreadyCompletelyWinning: winning,
      reason,
      depth,
      allAlternativesCovered: true,
      alternativeUpperBoundCp: line ? lineScore(line) : null,
      bestNonSacrificingMove: nonSacrificing ? line.move : null,
      bestNonSacrificingCp: nonSacrificing ? lineScore(line) : null,
      examined,
      excludedSacrifices: excluded
    });
    if (!remaining.length) return finish(false, "No other legal move; all other eligibility gates still apply");
    const primary = root.candidates.find((line) => line.rank === 1);
    if (root.depth !== depth || primary?.move !== root.bestMove || !completeRootLine(primary, fen, depth)) return fail("Incomplete unrestricted root evidence");
    const rank2 = primary.move === playedUci ? 2 : 1;
    let alternative = root.candidates.find((line) => line.rank === rank2);
    if (!completeRootLine(alternative, fen, depth)) return fail("Missing same-depth best-alternative PV");
    for (let iteration = 0; iteration <= 2; iteration++) {
      if (!alternative || !remaining.includes(alternative.move) || !completeRootLine(alternative, fen, depth)) return fail("Incomplete remaining-alternative search");
      const cp = lineScore(alternative), position = new Chess(fen), altMove = playUci(position, alternative.move);
      const offers = findMaterialOffers(position, altMove, fen);
      const entry = { move: alternative.move, cp, mate: alternative.mate ?? null, depth };
      examined.push(entry);
      if (cp < 450) {
        entry.nonSacrificing = offers.length === 0;
        return finish(false, "All remaining alternatives fall below the decisive threshold", alternative, entry.nonSacrificing);
      }
      if (!offers.length) {
        entry.nonSacrificing = true;
        return finish(true, "A non-sacrificing alternative already maintains a decisive advantage", alternative, true);
      }
      if (iteration === 2) return fail("Counterfactual sacrifice-exclusion budget exceeded");
      const audit = await auditCaptureResponses({ before, chess: position, move: altMove, evaluatePosition, depth });
      if (!audit.verified || !audit.materialTraceComplete) return fail("Alternative material evidence incomplete or budget exhausted");
      if (!audit.isSacrifice) {
        entry.nonSacrificing = true;
        return finish(true, "An alternative recovers its material and maintains a decisive advantage", alternative, true);
      }
      if (audit.worstAcceptedCp < -100) return fail("Alternative sacrifice soundness is inconsistent; cannot exclude it");
      if (!audit.acceptedLines.some((line) => line.isSacrifice && (!line.discovered || line.newlyExposed)))
        return fail("Winning alternative only leaves a persistent unrelated offer; exclusion is ambiguous");
      entry.nonSacrificing = false;
      entry.materialCostCp = audit.materialCostCp;
      excluded.push(alternative.move);
      remaining = remaining.filter((uci) => uci !== alternative.move);
      if (!remaining.length) return finish(false, "All alternatives were verified sacrifices");
      const restricted = await rootEvaluation(before, move.color, evaluatePosition, depth, { searchmoves: remaining, multiPV: 1 });
      if (restricted.depth !== depth) return fail("Remaining-alternative search did not reach requested depth");
      alternative = restricted.candidates.find((line) => line.rank === 1 && line.move === restricted.bestMove);
    }
    return fail("Counterfactual evidence unavailable");
  }
  async function verifyBrilliantCandidate({ chess, beforeFen, move, evaluatePosition, depth = 18 }) {
    const reject = (reason, data = {}) => ({ verified: false, reason, ...data });
    if (!chess || !beforeFen || !move || typeof evaluatePosition !== "function") return reject("Missing position or engine");
    let before;
    try {
      before = new Chess(beforeFen);
      const replay = new Chess(beforeFen);
      playUci(replay, uciOf(move));
      if (replay.fen() !== chess.fen() || before.turn() !== move.color) return reject("Move and position do not match");
      const offers = findMaterialOffers(chess, move, beforeFen);
      if (!offers.length) return reject("No legal net material offer");
      if (offers.length > MATERIAL_LIMITS.maxCaptures) return reject("Capture audit budget exceeded");
    } catch (error) {
      return reject(`Invalid position: ${error.message}`);
    }
    try {
      const mover = move.color, playedUci = uciOf(move);
      const unrestricted = await rootEvaluation(before, mover, evaluatePosition, depth);
      let root = unrestricted;
      if (!root.candidates.some((line) => line.move === playedUci) && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(root.bestMove || "")) {
        root = await rootEvaluation(before, mover, evaluatePosition, depth, { searchmoves: [root.bestMove, playedUci] });
      }
      const deepAfter = await engineScore(chess, mover, evaluatePosition, depth);
      if (![root.scoreCp, deepAfter].every(Number.isFinite)) return reject("Missing depth-matched root/played evaluations");
      const rootLines = root.depth === depth ? root.candidates.filter((line) => completeRootLine(line, beforeFen, depth)) : [];
      const bestLine = rootLines.find((line) => line.rank === 1 && line.move === root.bestMove), playedLine = rootLines.find((line) => line.move === playedUci);
      const mateCompatible = bestLine?.mate == null ? playedLine?.mate == null : bestLine.mate > 0 && playedLine?.mate > 0 && playedLine.mate <= bestLine.mate + 1;
      const qualityVerified = Boolean(bestLine && playedLine && mateCompatible);
      const playedCp = qualityVerified ? lineScore(playedLine) : null, beforeCp = qualityVerified ? lineScore(bestLine) : null;
      const audit = await auditCaptureResponses({ before, chess, move, evaluatePosition, depth });
      if (!audit.verified) return reject(audit.reason);
      const counterfactual = qualityVerified && audit.isSacrifice && playedCp >= -100 && deepAfter >= -100 && audit.worstAcceptedCp >= -100 ? await analyzeCounterfactual({ before, move, root: unrestricted, evaluatePosition, depth }) : { verified: false, alreadyCompletelyWinning: null, reason: "Sacrifice or quality/soundness gates not established" };
      return {
        ...audit,
        deepBefore: root.scoreCp,
        deepAfter,
        bestAlternativeCp: root.scoreCp,
        rootBestMove: root.bestMove,
        playedUci,
        deepBestMovePlayed: root.bestMove === playedUci,
        deepCpGap: qualityVerified ? Math.max(0, beforeCp - playedCp) : null,
        analysisDepth: depth,
        rootCandidates: root.candidates,
        qualityVerified,
        playedCp,
        beforeCp,
        unrestrictedBeforeCp: unrestricted.scoreCp,
        unrestrictedCandidates: unrestricted.candidates,
        counterfactual,
        bestAlternativeMethod: "same-root MultiPV comparison with bounded paired fallback"
      };
    } catch (error) {
      return reject(`Deep analysis failed: ${error.message}`);
    }
  }

  // src/content.js
  (() => {
    const BUTTON_ID = "chess-unlimited-review-btn";
    const PANEL_ID = "chess-unlimited-review-panel";
    const panelSessions = /* @__PURE__ */ new WeakMap();
    function closePanel(panel) {
      const session = panelSessions.get(panel);
      session?.controller.abort();
      session?.review?.abort();
      session?.board?.destroy();
      panelSessions.delete(panel);
      panel.remove();
    }
    function isGamePage() {
      return /^\/(game|analysis|games)(?:\/|$)/.test(
        location.pathname
      );
    }
    function createButton() {
      if (!isGamePage()) return;
      if (document.getElementById(BUTTON_ID)) return;
      const button = document.createElement("button");
      button.id = BUTTON_ID;
      button.textContent = "\u265F Unlimited Review";
      button.onclick = openPanel;
      document.body.appendChild(button);
    }
    async function autoFetchAndReview(panel) {
      const input = panel.querySelector("#chess-review-pgn");
      const result = panel.querySelector("#chess-review-result");
      const button = panel.querySelector("#chess-review-import");
      button.disabled = true;
      result.textContent = "Fetching game from Chess.com...";
      try {
        const pgn2 = await fetchCurrentChessComPgn({ signal: panelSessions.get(panel)?.controller.signal });
        if (!panel.isConnected) return;
        const testGame = new Chess();
        testGame.loadPgn(pgn2);
        if (!testGame.history().length) {
          throw new Error("No moves found in fetched game");
        }
        input.value = pgn2;
        const details = panel.querySelector(".chess-pgn-details");
        if (details) {
          details.open = false;
        }
        button.disabled = false;
        await analyzeGame();
      } catch (error) {
        if (!panel.isConnected) return;
        console.error("[Chess Review Auto Fetch]", error);
        result.textContent = "Automatic import unavailable: " + error.message + "\n\nYou can still paste a PGN and click Analyze Game.";
        const details = panel.querySelector(".chess-pgn-details");
        if (details) {
          details.open = true;
        }
      } finally {
        if (panel.isConnected) {
          button.disabled = false;
        }
      }
    }
    function openPanel() {
      const existing = document.getElementById(PANEL_ID);
      if (existing) {
        closePanel(existing);
        return;
      }
      const panel = document.createElement("div");
      panel.id = PANEL_ID;
      panelSessions.set(panel, { controller: new AbortController(), review: null, board: null });
      panel.innerHTML = `
    <h2>\u265F Unlimited Review</h2>
    <textarea
      id="chess-review-pgn"
      placeholder="Paste your completed game's PGN..."
      rows="7"
    ></textarea>
    <button id="chess-review-import">
      Analyze Game
    </button>
    <div id="chess-review-result"></div>
  `;
      const closeButton = document.createElement("button");
      closeButton.className = "chess-review-close";
      closeButton.textContent = "\u2715";
      closeButton.title = "Close Review";
      closeButton.setAttribute("aria-label", "Close Review");
      closeButton.addEventListener("click", () => {
        closePanel(panel);
      });
      panel.prepend(closeButton);
      panel.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closePanel(panel);
        }
      });
      const pgnInput = panel.querySelector("#chess-review-pgn");
      const pgnDetails = document.createElement("details");
      pgnDetails.className = "chess-pgn-details";
      pgnDetails.open = true;
      const pgnSummary = document.createElement("summary");
      pgnSummary.textContent = "Import Game PGN";
      pgnInput.before(pgnDetails);
      pgnDetails.append(pgnSummary, pgnInput);
      document.body.appendChild(panel);
      const analyzeButton = panel.querySelector(
        "#chess-review-import"
      );
      analyzeButton.addEventListener("click", () => {
        if (!analyzeButton.disabled) {
          void analyzeGame();
        }
      });
      if (/^\/(?:analysis\/)?game\/(live|daily)\/\d+(?:\/|$)/.test(location.pathname)) {
        void autoFetchAndReview(panel);
      }
    }
    function log(message) {
      const result = document.getElementById(
        "chess-review-result"
      );
      if (result) {
        result.textContent += message + "\n";
        result.scrollTop = result.scrollHeight;
      }
    }
    async function evaluatePosition(fen, depth = 12, options = {}) {
      options.signal?.throwIfAborted();
      const result = await chrome.runtime.sendMessage({
        type: "ANALYZE_POSITION",
        fen,
        depth,
        searchmoves: options.searchmoves,
        multiPV: options.multiPV
      });
      options.signal?.throwIfAborted();
      if (!result?.success) {
        throw new Error(
          result?.error || "Stockfish analysis failed"
        );
      }
      return {
        depth: result.depth,
        bestMove: result.bestMove,
        score: result.scoreCp,
        mate: result.mate,
        pv: result.pv || [],
        candidates: result.candidates || []
      };
    }
    async function analyzeGame() {
      const input = document.getElementById("chess-review-pgn");
      const result = document.getElementById("chess-review-result");
      const button = document.getElementById("chess-review-import");
      if (!input || !result || !button) return;
      if (button.disabled) return;
      const panel = input.closest(`#${PANEL_ID}`);
      const session = panelSessions.get(panel);
      if (!session) return;
      session.review?.abort();
      session.board?.destroy();
      session.board = null;
      const controller = new AbortController();
      session.review = controller;
      const signal = AbortSignal.any([session.controller.signal, controller.signal]);
      const assertActive = () => {
        if (!result.isConnected || session.review !== controller) controller.abort();
        signal.throwIfAborted();
      };
      const evaluateReviewPosition = async (fen, depth, options = {}) => {
        assertActive();
        return evaluatePosition(fen, depth, { ...options, signal });
      };
      const pgn2 = input.value.trim();
      result.replaceChildren();
      const chess = new Chess();
      try {
        chess.loadPgn(pgn2);
      } catch (error) {
        result.textContent = "Invalid PGN: " + error.message;
        return;
      }
      const moves = chess.history({ verbose: true });
      if (!moves.length) {
        result.textContent = "No moves found.";
        return;
      }
      const replay = new Chess();
      const initialFen = chess.header().FEN;
      if (initialFen) {
        replay.load(initialFen);
      }
      const reviewedMoves = [];
      const graphData = [];
      const MAX_DEEP_VERIFICATIONS = 12;
      function toWhiteCp(evaluation, turn) {
        if (evaluation.mate !== null && evaluation.mate !== void 0) {
          return (turn === "w" ? 1 : -1) * Math.sign(evaluation.mate) * 1e4;
        }
        if (!Number.isFinite(evaluation.score)) {
          throw new Error("Stockfish returned no evaluation");
        }
        return turn === "w" ? evaluation.score : -evaluation.score;
      }
      function uciOf2(move) {
        return move.from + move.to + (move.promotion || "");
      }
      function terminalEvaluation(position) {
        if (position.isCheckmate()) {
          return { bestMove: null, score: null, mate: -1, candidates: [] };
        }
        if (position.isGameOver()) {
          return { bestMove: null, score: 0, mate: null, candidates: [] };
        }
        return null;
      }
      button.disabled = true;
      button.textContent = "Analyzing...";
      try {
        let formatBestMove = function(uci, ply) {
          if (!uci || uci.length < 4) return "Not available";
          try {
            const fen = moves[ply - 1]?.before;
            if (fen) {
              const position = new Chess(fen);
              const best = position.move({
                from: uci.slice(0, 2),
                to: uci.slice(2, 4),
                promotion: uci[4] || void 0
              });
              if (best) return best.san;
            }
          } catch (error) {
          }
          return `${uci.slice(0, 2)} \u2192 ${uci.slice(2, 4)}`;
        }, formatEngineVariation = function(fen, pv, maxMoves = 10) {
          if (!fen || !Array.isArray(pv)) return [];
          try {
            const position = new Chess(fen);
            const formatted = [];
            for (const uci of pv.slice(0, maxMoves)) {
              if (typeof uci !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
                break;
              }
              const moveNumber = position.moveNumber();
              const side = position.turn();
              let played;
              try {
                played = position.move({
                  from: uci.slice(0, 2),
                  to: uci.slice(2, 4),
                  promotion: uci[4] || void 0
                });
              } catch {
                break;
              }
              if (!played) break;
              const prefix = side === "w" ? `${moveNumber}.` : `${moveNumber}...`;
              formatted.push(`${prefix} ${played.san}`);
            }
            return formatted;
          } catch (error) {
            console.warn(
              "[Chess Review] PV conversion failed:",
              error.message
            );
            return [];
          }
        }, updateMoveInfo = function(ply) {
          moveInfoCard.replaceChildren();
          if (ply === 0) {
            moveInfoCard.textContent = "Starting position \u2014 select a move to view its analysis.";
            return;
          }
          const move = reviewedMoves[ply - 1];
          if (!move) return;
          const gradeInfo = GRADES[move.grade];
          const header = document.createElement("div");
          header.className = "chess-info-header";
          const title = document.createElement("div");
          title.className = "chess-info-title";
          const badge = document.createElement("span");
          badge.className = `chess-info-badge chess-grade-${move.grade}`;
          badge.textContent = gradeInfo?.symbol || "\u2022";
          const name = document.createElement("div");
          const moveNumber = `${move.number}${move.color === "w" ? "." : "..."}`;
          name.textContent = `${moveNumber} ${move.san}`;
          const gradeName = document.createElement("small");
          gradeName.textContent = gradeInfo?.label || move.grade;
          gradeName.style.color = gradeInfo?.color || "#ffffff";
          title.append(badge, name, gradeName);
          const evaluation = document.createElement("strong");
          evaluation.className = "chess-info-evaluation";
          const value = move.evaluation;
          evaluation.textContent = Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}` : "N/A";
          header.append(title, evaluation);
          const explanation = document.createElement("p");
          explanation.className = "chess-info-explanation";
          explanation.textContent = move.explanation || explanations[move.grade] || "Move analyzed by Stockfish.";
          const recommendation = document.createElement("div");
          recommendation.className = "chess-info-recommendation";
          const recommendationLabel = document.createElement("span");
          recommendationLabel.textContent = "Stockfish recommended";
          const recommendationMove = document.createElement("strong");
          recommendationMove.textContent = formatBestMove(move.bestMove, ply);
          recommendation.append(
            recommendationLabel,
            recommendationMove
          );
          const footer = document.createElement("div");
          footer.className = "chess-info-footer";
          footer.textContent = move.bestMovePlayed ? "\u2713 You played Stockfish's preferred move." : "The recommendation shows the engine's choice before your move.";
          moveInfoCard.append(
            header,
            explanation,
            recommendation,
            footer
          );
          const variation = formatEngineVariation(
            move.beforeFen,
            move.bestVariation
          );
          const variationSection = document.createElement("div");
          variationSection.className = "chess-pv-section";
          const variationTitle = document.createElement("h4");
          variationTitle.textContent = "Stockfish Recommended Continuation";
          variationSection.appendChild(variationTitle);
          if (variation.length > 0) {
            const variationMoves = document.createElement("div");
            variationMoves.className = "chess-pv-moves";
            variation.forEach((san, index) => {
              const moveElement = document.createElement("button");
              moveElement.type = "button";
              moveElement.className = "chess-pv-move chess-pv-clickable";
              moveElement.textContent = san;
              moveElement.title = `Preview Stockfish line through ${san}`;
              moveElement.setAttribute("aria-label", `Preview variation through ${san}`);
              moveElement.addEventListener("click", () => {
                const success = reviewBoard.showEngineVariation(
                  ply,
                  move.bestVariation,
                  index + 1
                );
                if (success) {
                  variationMoves.querySelectorAll(".chess-pv-move").forEach((element, i) => {
                    element.classList.toggle("chess-pv-active", i <= index);
                    element.setAttribute("aria-pressed", String(i === index));
                  });
                } else {
                  console.warn("[Chess Review] Could not preview selected PV move", san);
                }
              });
              variationMoves.appendChild(moveElement);
            });
            variationSection.appendChild(variationMoves);
          } else {
            const empty = document.createElement("p");
            empty.textContent = "No engine continuation available for this position.";
            variationSection.appendChild(empty);
          }
          moveInfoCard.appendChild(variationSection);
        };
        const positionFens = [replay.fen()];
        const positionTurns = [replay.turn()];
        for (const move of moves) {
          replay.move(move.san);
          positionFens.push(replay.fen());
          positionTurns.push(replay.turn());
        }
        const evaluations = [];
        for (let i = 0; i < positionFens.length; i++) {
          const position = new Chess(positionFens[i]);
          try {
            evaluations.push(
              terminalEvaluation(position) || await evaluateReviewPosition(positionFens[i], 12)
            );
          } catch (error) {
            if (signal.aborted) throw error;
            throw new Error(
              `Initial analysis failed at position ${i}/${moves.length}: ${error.message}`
            );
          }
          if (result.isConnected) {
            result.textContent = `Analyzing positions ${i + 1}/${positionFens.length}...`;
          }
        }
        const beforeVerification = evaluations.map(
          (evaluation, i) => toWhiteCp(evaluation, positionTurns[i])
        );
        const suspicious = moves.map((move, i) => ({
          index: i,
          jump: Math.abs(beforeVerification[i + 1] - beforeVerification[i])
        })).filter(
          ({ index, jump }) => jump >= 100 && !new Chess(positionFens[index + 1]).isGameOver()
        ).sort((a, b) => b.jump - a.jump).slice(0, MAX_DEEP_VERIFICATIONS).sort((a, b) => a.index - b.index);
        const verifiedIndices = /* @__PURE__ */ new Set();
        for (const { index } of suspicious) {
          for (const positionIndex of [index, index + 1]) {
            if (verifiedIndices.has(positionIndex)) continue;
            verifiedIndices.add(positionIndex);
            const position = new Chess(positionFens[positionIndex]);
            if (position.isGameOver()) continue;
            try {
              const deeper = await evaluateReviewPosition(positionFens[positionIndex], 18);
              if (Number.isFinite(deeper.score) || deeper.mate != null) {
                evaluations[positionIndex] = deeper;
              }
            } catch (error) {
              if (signal.aborted) throw error;
              console.warn(
                `[Deep Verification] Position ${positionIndex}: ${error.message}`
              );
            }
            if (result.isConnected) {
              result.textContent = `Verifying critical positions ${verifiedIndices.size}/${suspicious.length * 2}...`;
            }
          }
        }
        replay.load(positionFens[0]);
        const whiteCps = evaluations.map(
          (evaluation, i) => toWhiteCp(evaluation, positionTurns[i])
        );
        graphData.push(...whiteCps.map((whiteCp, ply) => ({ ply, whiteCp })));
        let brilliantAuditCount = 0;
        for (let i = 0; i < moves.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          assertActive();
          const move = moves[i];
          const player = move.color;
          const before = evaluations[i];
          const after2 = evaluations[i + 1];
          const beforeFen = positionFens[i];
          const beforePlayerCp = player === "w" ? whiteCps[i] : -whiteCps[i];
          const afterWhiteCp = whiteCps[i + 1];
          const afterPlayerCp = player === "w" ? afterWhiteCp : -afterWhiteCp;
          const bestMovePlayed = before.bestMove?.toLowerCase() === uciOf2(move).toLowerCase();
          replay.move(move.san);
          const sacrificeCandidate = detectSacrificeCandidate(replay, move);
          const classification = classifyMove({
            beforeCp: beforePlayerCp,
            afterCp: afterPlayerCp,
            bestMovePlayed
          });
          const alternativeLoss = calculateAlternativeLoss(before.candidates);
          classification.grade = classifyTacticalMove({
            baseGrade: classification.grade,
            bestMovePlayed,
            beforeCp: beforePlayerCp,
            afterCp: afterPlayerCp,
            materialBefore: 0,
            materialAfter: 0,
            isCapture: Boolean(move.captured),
            isCheck: replay.isCheck(),
            alternativeLoss
          });
          let brilliantDiagnostic = null;
          if (sacrificeCandidate && brilliantAuditCount >= 12) brilliantDiagnostic = "Audit budget exceeded; no promotion";
          if (sacrificeCandidate && !replay.isGameOver() && brilliantAuditCount < 12) {
            brilliantAuditCount++;
            const eloKey = player === "w" ? "WhiteElo" : "BlackElo";
            const elo = Number(chess.header()[eloKey]);
            const rating = Number.isFinite(elo) && elo > 0 ? elo : null;
            try {
              const verification = await verifyBrilliantCandidate({
                chess: replay,
                beforeFen,
                move,
                beforeCp: beforePlayerCp,
                afterCp: afterPlayerCp,
                bestMovePlayed,
                evaluatePosition: evaluateReviewPosition,
                depth: 18
              });
              assertActive();
              const decision = classifyBrilliantMove({
                baseGrade: classification.grade,
                verification,
                rating,
                bestMovePlayed,
                alternatives: before.candidates || []
              });
              brilliantDiagnostic = decision.reason;
              console.info(`[Brilliant audit] ${Number(beforeFen.split(" ")[5])}${player === "w" ? "." : "..."} ${move.san}: ${decision.reason}`, { verification, decision });
            } catch (error) {
              if (signal.aborted) throw error;
              brilliantDiagnostic = `Verification error: ${error.message}`;
              console.warn(`[Brilliant verification] ${move.san}:`, error);
            }
          }
          const missedOpportunity = detectMissedOpportunity({
            beforeFen,
            bestVariation: before.pv || [],
            bestMovePlayed,
            beforePlayerCp,
            afterPlayerCp,
            color: player
          });
          if (missedOpportunity && ["inaccuracy", "mistake", "blunder"].includes(classification.grade)) {
            classification.grade = "miss";
          }
          reviewedMoves.push({
            number: Number(beforeFen.split(" ")[5]),
            color: player,
            san: move.san,
            grade: classification.grade,
            loss: classification.loss,
            bestMove: before.bestMove,
            bestMovePlayed,
            brilliantDiagnostic,
            evaluation: afterWhiteCp / 100,
            beforeFen,
            bestVariation: before.pv || [],
            beforePlayerCp,
            afterPlayerCp,
            explanation: classification.grade === "miss" && missedOpportunity ? missedOpportunity.explanation : generateMoveExplanation({
              move,
              grade: classification.grade,
              beforeFen,
              afterFen: positionFens[i + 1],
              bestMove: before.bestMove,
              bestMovePlayed,
              beforePlayerCp,
              afterPlayerCp
            })
          });
          if (result.isConnected) {
            result.textContent = `Classifying ${i + 1}/${moves.length} moves...`;
          }
        }
        assertActive();
        const whiteAccuracy = calculateAccuracy(reviewedMoves, "w");
        const blackAccuracy = calculateAccuracy(reviewedMoves, "b");
        const gradeCounts = {
          White: {},
          Black: {}
        };
        for (const move of reviewedMoves) {
          const player = move.color === "w" ? "White" : "Black";
          gradeCounts[player][move.grade] = (gradeCounts[player][move.grade] || 0) + 1;
        }
        console.log("[Chess Review Grade Counts]");
        console.table(gradeCounts);
        window.chessReviewResults = {
          reviewedMoves,
          graphData,
          whiteAccuracy,
          blackAccuracy
        };
        const heading = document.createElement("h3");
        heading.textContent = "Game Review Complete";
        const accuracy = document.createElement("div");
        accuracy.className = "chess-accuracy-summary";
        accuracy.textContent = `White Estimated Accuracy: ${whiteAccuracy?.toFixed(1) ?? "N/A"}%
Black Estimated Accuracy: ${blackAccuracy?.toFixed(1) ?? "N/A"}%`;
        result.replaceChildren(heading, accuracy);
        {
          const counts = {
            w: {},
            b: {}
          };
          for (const reviewedMove of reviewedMoves) {
            const playerCounts = counts[reviewedMove.color];
            if (!playerCounts) continue;
            playerCounts[reviewedMove.grade] = (playerCounts[reviewedMove.grade] ?? 0) + 1;
          }
          const summary = document.createElement("div");
          summary.className = "chess-grade-summary";
          const title = document.createElement("h3");
          title.textContent = "Move Classification Summary";
          summary.appendChild(title);
          const table = document.createElement("table");
          table.className = "chess-grade-table";
          const header = table.insertRow();
          ["Classification", "White", "Black"].forEach((label) => {
            const cell = document.createElement("th");
            cell.textContent = label;
            header.appendChild(cell);
          });
          const gradeNames = [
            "brilliant",
            "great",
            "best",
            "excellent",
            "good",
            "inaccuracy",
            "mistake",
            "miss",
            "blunder"
          ];
          for (const gradeName of gradeNames) {
            const row = table.insertRow();
            const label = row.insertCell();
            label.textContent = GRADES[gradeName].label;
            label.style.color = GRADES[gradeName].color;
            row.insertCell().textContent = counts.w[gradeName] ?? 0;
            row.insertCell().textContent = counts.b[gradeName] ?? 0;
          }
          summary.appendChild(table);
          result.appendChild(summary);
        }
        const debugSection = document.createElement("details");
        debugSection.className = "chess-debug-section";
        const debugTitle = document.createElement("summary");
        debugTitle.textContent = "Detailed Move Analysis";
        debugSection.appendChild(debugTitle);
        const debugTable = document.createElement("table");
        debugTable.className = "chess-debug-table";
        const debugHeader = document.createElement("tr");
        for (const name of [
          "Move",
          "Grade",
          "Before",
          "After",
          "Win Loss",
          "Brilliant check"
        ]) {
          const th = document.createElement("th");
          th.textContent = name;
          debugHeader.appendChild(th);
        }
        debugTable.appendChild(debugHeader);
        for (const move of reviewedMoves) {
          const row = document.createElement("tr");
          const cells = [
            `${move.number}${move.color === "w" ? "." : "..."} ${move.san}`,
            GRADES[move.grade]?.label || move.grade,
            Number.isFinite(move.beforePlayerCp) ? (move.beforePlayerCp / 100).toFixed(2) : "N/A",
            Number.isFinite(move.afterPlayerCp) ? (move.afterPlayerCp / 100).toFixed(2) : "N/A",
            Number.isFinite(move.loss) ? `${(move.loss * 100).toFixed(1)}%` : "N/A",
            move.brilliantDiagnostic || "\u2014"
          ];
          for (const value of cells) {
            const td = document.createElement("td");
            td.textContent = value;
            row.appendChild(td);
          }
          debugTable.appendChild(row);
        }
        debugSection.appendChild(debugTable);
        result.appendChild(debugSection);
        const moveInfoCard = document.createElement("section");
        moveInfoCard.className = "chess-move-info-card";
        const explanations = {
          brilliant: "A sacrifice that passed the engine's tactical verification.",
          great: "A critical move with significantly weaker alternatives.",
          best: "This matches Stockfish's preferred move.",
          excellent: "A strong move that preserves nearly all winning chances.",
          good: "A reasonable move that maintains the position.",
          inaccuracy: "This move slightly reduced your winning chances.",
          mistake: "This move significantly worsened your position.",
          miss: "You missed a significant tactical opportunity.",
          blunder: "This move caused a major loss of winning chances."
        };
        const reviewBoard = createReviewBoard(
          pgn2,
          reviewedMoves,
          graphData,
          (ply) => {
            updateMoveInfo(ply);
            const rows = result.querySelectorAll(".chess-move-row");
            rows.forEach((row, index) => {
              row.classList.toggle(
                "chess-move-selected",
                index === ply - 1
              );
            });
          },
          evaluatePosition
        );
        session.board = reviewBoard;
        result.appendChild(reviewBoard.element);
        const graph = createEvaluationGraph(
          graphData,
          reviewedMoves,
          (ply) => {
            reviewBoard.goToMove(ply);
            const rows = result.querySelectorAll(
              ".chess-move-row"
            );
            rows.forEach((row) => {
              row.classList.remove("chess-move-selected");
            });
            if (ply > 0 && rows[ply - 1]) {
              const selected = rows[ply - 1];
              selected.classList.add("chess-move-selected");
              selected.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
              });
            }
          }
        );
        result.appendChild(graph);
        const dashboard = document.createElement("div");
        dashboard.className = "chess-review-dashboard";
        const leftColumn = document.createElement("div");
        leftColumn.className = "chess-dashboard-left";
        const rightColumn = document.createElement("div");
        rightColumn.className = "chess-dashboard-right";
        const moveList = document.createElement("div");
        moveList.className = "chess-move-list";
        leftColumn.append(
          reviewBoard.element,
          moveInfoCard
        );
        rightColumn.append(graph, moveList);
        dashboard.append(leftColumn, rightColumn);
        result.appendChild(dashboard);
        for (const move of reviewedMoves) {
          const gradeInfo = GRADES[move.grade];
          const row = document.createElement("div");
          row.className = "chess-move-row";
          const moveName = document.createElement("span");
          moveName.textContent = `${move.number}${move.color === "w" ? "." : "..."} ${move.san}`;
          const grade = document.createElement("span");
          grade.textContent = `${gradeInfo.symbol} ${gradeInfo.label}`;
          grade.style.color = gradeInfo.color;
          grade.style.fontWeight = "bold";
          row.append(moveName, grade);
          const selectedPly = reviewedMoves.indexOf(move) + 1;
          row.addEventListener("click", () => {
            reviewBoard.goToMove(selectedPly);
          });
          moveList.appendChild(row);
        }
        updateMoveInfo(reviewedMoves.length);
      } catch (error) {
        if (signal.aborted) return;
        console.error("[Chess Review]", error);
        result.textContent = "Analysis failed: " + error.message;
      } finally {
        if (session.review === controller && button.isConnected) {
          button.disabled = false;
          button.textContent = "Analyze Game";
        }
      }
    }
    function update() {
      if (!isGamePage()) {
        document.getElementById(BUTTON_ID)?.remove();
        const panel = document.getElementById(PANEL_ID);
        if (panel) closePanel(panel);
        return;
      }
      createButton();
    }
    new MutationObserver(update).observe(
      document.documentElement,
      { childList: true, subtree: true }
    );
    update();
  })();
})();
/*! Bundled license information:

chess.js/dist/esm/chess.js:
  (**
   * @license
   * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice,
   *    this list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the documentation
   *    and/or other materials provided with the distribution.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
   * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   * POSSIBILITY OF SUCH DAMAGE.
   *)
*/

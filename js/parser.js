define(['require', 'exports'], function(require, exports) {
	var quoteStartRegEx = /^(?:'|")/; // Find the start of a string
	var strRegEx = /^[\w\d\-_]+$/; // Safe character
	var $CmdRegExp = /(\\\\|[^\\]|^)\$\(/g; // Find $(
	var backTickRegEx = /(\\\\|[^\\]|^)`/g; // Find `
	var quoteRegExp = /(\\\\|[^\\]|^)('|")/g;
	//(?:[^\\]|^)

	RegExp.escape = function(text) { // Escape characters for a RegExp
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	};

	var Parser = (function() {
		function Parser(options) {
			this.history = [];
		}

		Parser.prototype.parseEnvCMD = function parseEnvCMD(str, env, execCmd) { // Replace $(<cmd>) `<cmd>`
			var curMatch, endIndex, cmd, re, cmdOutput; // Variables

			$CmdRegExp.lastIndex = 0; // Make sure we start at the start

			while(curMatch = $CmdRegExp.exec(str)) { // Loop through occurences of $(
				endIndex = this.claimCMDLine(str, { startIndex: curMatch.index + curMatch[1].length + 2 }); // Get the end of command

				cmd = str.slice(curMatch.index + curMatch[1].length + 2, endIndex + 1); // Get the command

				cmdOutput = execCmd(cmd, env, execCmd) + '';

				$CmdRegExp.lastIndex = curMatch.index + curMatch[1].length + 2 + cmdOutput.length; // Search from here
				
				// Replace
				re = new RegExp('(' + RegExp.escape(str.substring(0, curMatch.index + curMatch[1].length)) + ')' + RegExp.escape(str.substring(curMatch.index + curMatch[1].length, endIndex + 2)) + '(' + RegExp.escape(str.substring(endIndex + 2)) + ')'); // Create a RegExp for it it finds whats before it (capture), it, and whats after it (capture)

				str = str.replace(re, function($A, $1, $2) { // Use that RegExp to replace the command with the output of the command
					return $1 + cmdOutput + $2; // Whats before it + the output of the command + whats after it
				});
			}

			backTickRegEx.lastIndex = 0; // Make sure we start at the start
		
			while(curMatch = backTickRegEx.exec(str)) { // Loop through occurences of `
				endIndex = this.claimCMDLine(str, { startIndex: curMatch.index + ( curMatch.index == 0 ? 1 : 2 ), startedWith: '`' }); // Get the end of command

				cmd = str.slice(curMatch.index + ( curMatch.index == 0 ? 1 : 2 ), endIndex + 1); // Get the command

				backTickRegEx.lastIndex = endIndex; // Search from here TODO: Make this get the end of the output

				cmdOutput = execCmd(cmd, env, execCmd);

				// Replace
				re = new RegExp('(' + RegExp.escape(str.substring(0, curMatch.index + ( curMatch.index == 0 ? 0 : 1 ))) + ')' + RegExp.escape(str.substring(curMatch.index + ( curMatch.index == 0 ? 0 : 1 ), endIndex + 2)) + '(' + RegExp.escape(str.substring(endIndex + 2)) + ')'); // Create a RegExp for it it finds whats before it (capture), it, and whats after it (capture)

				str = str.replace(re, function($A, $1, $2) { // Use that RegExp to replace the command with the output of the command
					return $1 + cmdOutput + $2; // Whats before it + the output of the command + whats after it
				});
			}
		
			return str; // Return the new string
		};

		Parser.prototype.claimCMDLine = function claimCMDLine(str, options) { // Get the end of a command
			var index, curChar, $parens, $found, inStr, backTick, backSlash, bang, startedWith, startIndex; // Variablea

			options = options || {}; // Make sure we have options
			startIndex = options.startIndex || 0; // Make sure we have an index to start at
			startedWith = options.startedWith || undefined; // Make sure we know what this command was started with
			$parens = 0; // Number of parenthesies that this is current nested in
			backTick = false; // If the last character was a backTick `
			backSlash = false; // If the last character was a backSlash
			bang = false; // If the last character was a bang !
	
			for(index = startIndex; index < str.length; index++) { // Loop through characters
				curChar = str[index]; // Get the current character

				if(backSlash) backSlash = false; // If the last character was a backSlash make it not a backslash anymore
		
				if(curChar == '$') { // If its a $
					$found = true; // Say we found a $
				} else if(curChar == '(') { // If its a (
					if($found) { // If we just found a $
						$parens++; // We're nesting
						$found = false; // We have not found any $
					}
				} else if(curChar == ')') { // If its a )
					if($parens > 0) { // If we are nested
						$parens--; // Un-Nest one level
					} else if(!inStr) { // We're not nested nor are we inside a string
						return index - 1; // End of command
					}
				} else if(curChar == '"' || curChar == "'") { // If we're starting a string
					inStr = curChar; // Save the character that started it
				} else if(inStr /* We do need be in a string to get out of a string */ && curChar == inStr /* Make sure it both starts and ends with the same character */) { // If we're closeing a string
					inStr = undefined; // No more saved character
				} else if(strRegEx.test(curChar)) { // Is just a safe character
					if($found) { // Have we just found a $
						$found = false; // Not anymore
					}
				} else if(curChar == '`') { // Is this a backtick
					if(startedWith == '`') { // Did this command start with a backtick
						return index - 1; // End of command
					} else {
						if(backTick) backTick = false; // In a backtick so outof a backtick
						else backTick = true; // Not in a backtick so in a backtick
					}
				} else if(curChar == '\\') { // Is this a backSlash
					index++; // Skip the next character
					backSlash = true; // We just found a backslash
				} else if(curChar == '!') { // Is this a bang !
					if(bang) {
						// We alread found a bang
					} else {
						bang = true; // We just found a bang
					} 
				}
			}
	
			return index - 1; // End of command (definitly)
		};

		Parser.prototype.toCMDLine = function toCMDLine(arr) { // Create a command from the parsed version AKA Reverse the parse
			return '"' + arr.map(function(v) {return v.replace(/("|')/g, '\\$1')}).join('" "') + '"';
		};

		function getMatches(re, str, changeLastIndexBy) {
			var matches = [], match;

			while(match = re.exec(str)) {
				matches.push(match);
				re.lastIndex += changeLastIndexBy;
				re.lastIndex = re.lastIndex >= 1 ? re.lastIndex : 1;
			}

			return matches;
		}
	
		Parser.prototype.parse = function parse(str, env, execCmd) { // Parse a command
			var split, curStart, inQuote, curStr, self, origStr, openQuoteMatch, closeQuoteMatch, tmpRe; // Variable definitions
		
			self = this; // Save this
			origStr = str; // Save the original string
			env = env || {}; // Make sure we have an enviorment
			execCmd = execCmd || console.log.bind(console); // Make sure we have a command executer
			str = this.parseEnvCMD(str, env, execCmd).replace(/(\\\\|[^\\]|^)\$([\w\d_\-\?]+)/g, function($A, $1, $2) { // Replace enviorment variables and embedded commands
				return $1 + env[$2]; // Return the character before it and the enviorment variables value
			}).replace(/(\\\\|[^\\]|^)!(\d+|[\$!])/g, function($a, $1, $2) { // Replace history such as !! !$ and !<num>
				var tmpHistory; // Temporary variable
			
				if($2 == '$') { // If this is !$
					tmpHistory = self.history[0].split; // Get the last command that was parsed
				
					return $1 + tmpHistory[tmpHistory.length - 1]; // Return the last argument of it
				}

				return $1 + self.history[parseInt($2.replace('!', 0))].text; // Get an integer from $1 replacing ! with 0 and get that whole commands text
			});
			split = str.split(' '); // Split it up by spaces

			/*str = ;

			str = str.;*/

			for(var i = 0; i < split.length; i++) { // Join them back together as needed
				curStr = split[i]; // Get the current String
				
				if(curStr[curStr.length - 1] == '\\' && curStr[curStr.length - 2] != '\\') { // Join up with the next arg if this one ends in a backslash and that backslash is not escaped
					var tmpArr = split.splice(i, 2); // Take the two to be joined out
					var tmpArr2 = tmpArr[0].split(''); // Split this string up into its characters
					tmpArr2.splice(curStr.length - 1); // Get rid of the last character
					tmpArr[0] = tmpArr2.join(''); // Put that back into tmpArr
					split.splice(i, 0, tmpArr.join(' ')); // Add them into the args array
				}
				
				var matches = getMatches(quoteRegExp, curStr, -1), curMatch; // Get all the quotes and maybe also define some variables
				// (?:[^\\\\]|^)
				if(!!inQuote && (new RegExp('([^\\\\]|^)(' + RegExp.escape(inQuote) + ')')).test(curStr)) { // Make sure we in a string and that there is a quote of the same type as the on that started the string
					split.splice(curStart, 0, split.splice(curStart, (i - curStart) + 1).join(' ')); // Join the string together and add it back into the args array
					inQuote = undefined; // Clear the start character
					curStart = undefined; // Clear the start index
					matches.shift(); // Remove the first match (this match here)
				}
				
				if(!inQuote) { // Are we already in a string
					for(var index = 0; index < matches.length; index++) { // Loop through the quotes
						curMatch = matches[index]; // Cache the current match
						
						if(!inQuote) { // Are we in a string
							inQuote = curMatch[2]; // Save character that started the string
							curStart = i; // Save the start index of the string for if the string spans multiple arguments
						} else if(inQuote == curMatch[2]) { // End of string
							inQuote = undefined; // Clear the start character
							curStart = undefined; // Clear the start index
						}
					}
				}
				
				/*for(var i = 0; i < matches.length; i++) {
					quoteRegExp.lastIndex = matches[i].index - 2; // Make sure we start at the start
					openQuoteMatch = quoteRegExp.exec(curStr); // Find start quote
					tmpRe = new RegExp('([^\\\\]|^)(' + RegExp.escape(openQuoteMatch[2]) + ')', 'g'); // Create RegExp to match just that on type of quote
					tmpRe.lastIndex = quoteRegExp.lastIndex + 1; // Make sure we don't get the first match again
					closeQuoteMatch = tmpRe.exec(curStr); // Find a close quote (maybe?)
					if(!closeQuoteMatch) { // Did we find a close quote
						inQuote = openQuoteMatch[2]; // Save the character that started it so then it can only be ended by the quote that started it
						curStart = i; // Save the start index of it
					}
				}*/
			}

			/* this.parseEnvCMD(str, env, execCmd).replace(/\$([\w\d_\-]+)/g, function($A, $1) {
				return env[$1];
			})*/

			if(inQuote) { // Throw an error if its still in a quote
				throw "Unclosed quotation at: end";
			}

			/*for(var i = 0; i < split.length; i++) {
				curStr = split[i]; // Get the currentString

				if(quoteStartRegEx.test(curStr) && curStr[curStr.length - 1] == curStr[0]) { // Check if this string starts and ends with the same quote
					split[i] = curStr.replace(quoteStartRegEx, ''); // Get rid of the start quote
					split[i] = split[i].replace(new RegExp(RegExp.escape(curStr[0]) + '$'), ''); // No more end quote, creates a regexp that selects the quote that the string was started with and add on to the end a $
				}
			}*/

			for(var i = 0; i < split.length; i++) {
				curStr = split[i]; // Get the currentString

				split[i] = curStr.replace(/(\\\\|[^\\]|^)(?:\\n|\\r)/g, '\n') // Replace escaped newlines with actual new lines
					.replace(/(\\\\|[^\\]|^)(?:"|')/g, '$1') // Replace rogue quotes in the middle of strings
					.replace(/(\\\\|[^\\]|^)(?:"|')/g, '$1') // Replace the ones the above statement missed eg ones right after one another
					.replace(/(\\\\|[^\\]|^)\\(["'$])/g, '$1$2') // Replace escaped quotes and $ signs with unescaped ones
					.replace(/\\\\/g, '\\');
			}

			split.text = origStr; // Return text also

			this.history.unshift({ // Add it into history for use with !$ !! !<num>
				split: split,
				text: origStr
			});

			return split; // Return the arguments such that 0 is usually the command and ones after that are arguments to the command
		};

		return Parser;
	})();

	exports.Parser = Parser;
});

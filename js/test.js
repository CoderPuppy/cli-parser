define(['require', 'exports', 'parser'], function(require, exports, parserJS) {
	var Parser = parserJS.Parser;
	var tests = exports.tests = [
		function basicParse1(parser) { // Test very basic parsing
			return assert(parser.parse('echo hello'), ['echo', 'hello']);
		},
		function basicParse2(parser) { // Some more basic parsing
			return assert(parser.parse('edit websites/WebCLIOS/index.html'), ['edit', 'websites/WebCLIOS/index.html']);
		},
		function basicParse3(parser) { // And even some more almost identical to above
			return assert(parser.parse('show websites/WebCLIOS/index.html'), ['show', 'websites/WebCLIOS/index.html']);
		},
		function history1(parser) { // Test to see if !! to get the whole last parse
			parser.parse('hello');

			return assert(parser.parse('!!'), ['hello']);
		},
		function history2(parser) { // Test to see if !$ correctly gets the last argument of the last command
			parser.parse('echo hello world');

			return assert(parser.parse('echo !$'), ['echo', 'world']);
		},
		function history3(parser) { // Test to see if !<num> works correctly basicly the same as !! but a different index (other than 0)
			parser.history[33] = { split: ['show', '~/code/cliParser/parser.html'], text: 'show ~/code/cliParser/parser.html' };

			return assert(parser.parse('!33'), ['show', '~/code/cliParser/parser.html']);
		},
		function history4(parser) { // Test !$ again this time more realistic
			parser.parse('ls /media');
			
			return assert(parser.parse('cd !$'), ['cd', '/media']);
		},
		function history5(parser) { // And again another realistic test
			parser.parse('ls /media');
			
			return assert(parser.parse('ls -lha !$'), ['ls', '-lha', '/media']);
		},
		function toCMDLine1(parser) { // Test to see if the toCMDLine will correctly create a command from a parsed array
			return assert(parser.toCMDLine(parser.parse('echo hello world')), '"echo" "hello" "world"');
		},
		function toCMDLine2(parser) { // Test it again now seeing if parsing it after running it through toCMDLine returns the correct result
			return assert(parser.parse(parser.toCMDLine(['echo', 'hello', 'world'])), ['echo', 'hello', 'world']);
		},
		function toCMDLine3(parser) { // Test to see if the reparsed is == to just parsed
			return assert(parser.parse(parser.toCMDLine(['cat', '/etc/httpd.conf'])), parser.parse('cat /etc/httpd.conf'));
		},
		function enviormentVariables1(parser) { // Test to see if variable subsitution works correctly
			return assert(parser.parse('echo $variable', { variable: "hello world" }), ['echo', 'hello', 'world']);
		},
		function enviormentVariables2(parser) { // Test it again
			return assert(parser.parse('$vim_path', { vim_path: '/usr/bin/vim' }), ['/usr/bin/vim']);
		},
		function embeddedCmd1(parser) { // Test embedded commands with the $(<cmd>) syntax
			return assert(parser.parse('echo $(pwd)', {}, function(cmd, env, execCmd) {
				return 'cmd';
			}), ['echo', 'cmd']);
		},
		function embeddedCmd2(parser) { // Test it again but with variable subsitution and backtick syntax mixed in
			return assert(parser.parse('echo $(echo `pwd`/$filename.$filetype)', { filename: 'hello', filetype: 'txt' }, function(cmd, env, execCMD) {
				return parser.toCMDLine(parser.parse(cmd, env, execCMD));
			}), ['echo', 'echo', 'pwd/hello.txt']);
		},
		function embeddedCmd3(parser) { // Test to see if escaping backslashes works
			return assert(parser.parse('\\\\$(pwd)', {}, function(cmd, env, execCMD) {
				return parser.parse(cmd, env, execCMD).join(' ');
			}), ['\\pwd']);
		},
		function string1(parser) { // Test strings to see if they correctly split the command
			return assert(parser.parse('echo "hello world"'), ['echo', 'hello world']);
		},
		function string2(parser) { // Test multiple strings
			return assert(parser.parse('"hi""hello "'), ['hihello ']);
		},
		function string3(parser) { // Test string now with single-quote
			return assert(parser.parse("echo 'hello world'"), ['echo', 'hello world'])
		},
		function string4(parser) {
			return assert(parser.parse("echo 'hello 'hi''"), ['echo', 'hello hi']);
		},
		function escape1(parser) { // Test to see if we can escape quotes
			return assert(parser.parse('echo "hi \\""'), ['echo', 'hi "']);
		},
		function escape2(parser) { // And now testing with $
			return assert(parser.parse('echo \\$filename'), ['echo', '$filename']);
		},
		function escape3(parser) { // Test for a bug i found where escaping backslashes doesn't work (problably because i hadn't implemented it yet)
			return assert(parser.parse('\\\\"hi "'), ['\\hi ']);
		}
	];

	function type(o) {
		var oType = typeof(o);
		
		switch(oType) {
			case 'object':
				if(o === null) oType = 'null';
				else if(o.constructor == String) oType = 'string';
				else if(o.constructor == Number) oType = 'number';
				else if(type(o.length) == 'number') oType = 'array';
				break;
		}
		
		return oType;
	}

	function equal(first, second) {
		var fType = type(first), sType = type(first);
		if(fType == 'array' && sType == 'array') { // Array
			var good = true;

			for(var i = 0; i < got.length; i++) {
				if(!equal(first[i], second[i])) good = false;
			}

			return good;
		} else if(fType == 'string' && sType == 'string') { // String
			return first.toString() == second.toString();
		} else {
			return false;
		}
	}

	function assert(got, expected) {
		return { value: got, expected: expected, good: equal(got, expected) };
	}
	
	exports.run = function run(printer) {
		var good = true, goods = [], tmp;

		printer = printer || ( !!window.puts ? function(str) { return puts(str + '\n'); } : console.log.bind(console)) || window.alert.bind(window);

		for(var i = 0; i < tests.length; i++) {
			try {
				if(!(tmp = tests[i](new Parser())).good) {
					good = false;
					goods[i] = false;
					printer('BAD: ' + tests[i].name + ' ' + tmp.value + ' ' + tmp.expected);
				} else {
					goods[i] = true;
					printer('GOOD: ' + tests[i].name);
				}
			} catch(ex) {
				printer('BAD: ' + tests[i].name + ' EX: ' + ex + ' ' + ex.stack + ' ' + ex.message);
			}
		}

		printer(good ? 'GOOD' : 'BAD');

		return good;
	};
});

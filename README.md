This is a parser.
Yeah you problably already guessed that.

This is a parser to parse a commandline into arguments 0 generally being the command.
It uses the AMD module format. (or what ever it's called).
And in my example is load by require.js.
But could be loaded by any AMD-module-format-compatible loader.

## Directory Structure
*js*

`parser.js` contains the main parser, a Class named Parser.

`test.js` conatains the test suite which you can run using the function run in this module.

## Parser Class
Some functions `parse`, `parseEnvCMD`, `claimCMDLine` and `toCMDLine`.

`parse`: Parses the commandline `<Parser>.parse(<cmd>, <env>, <execCMD>)`.

Args:

+ `cmd`: the command to parser such as `echo hello world`.
+ `env`: an object that contains all the enviorment variables.
+ `execCMD`: a function to run if it finds an embedded cmd. Args: `<cmd>,<env>,<execCMD>`

Return: an array of arguments

`parseEnvCMD`: Runs embedded commands such as `$(<cmd>)` and backTick <cmd> backTick. Args: same as parse. Return: a string with the embedded commands replaced

`claimCMDLine`: Finds the end of a command. Return: index at which the command ends

Args:

+ `cmd`: the command to find the end of
+ `options`: `startIndex`: the index to start look through the command at, `startedWith`: what character started this command such as back tick or $(

`toCMDLine`: Creates a commandline that should be equivilant to what you parsed. Args: `parsed`: an array of arguments Return: a commandline that should be parsed to get what was passed in here
apigee-jsc-debug
================

A  library providing utility methods to support the execution and debugging of Apigee Edge JSC callout policies on your local machine.

This library requires no additional code in your javascript, and it executes outside the core framework of Edge.

## Installation

The only prerequisites not handled during the installation are a functional Node environment and the availability of npm. 
	
Clone this repository to your local machine:

	ApigeeCorporation$ git clone https://github.com/apigeecs/apigee-jsc-debug.git

Navigate to the package directory:

	cd path/to/apigee-jsc-debug/package/

Install globally:

	sudo npm install . -g

Or to install into a project tests/debug directory:

	cd ../project/gateway/apiproxy/tests/debug/
	sudo install /path/to/apigee-jsc-debug/package/

Installation from git coming soon...

## Usage

Within a folder off your tests directory called debug (for example: /Users/ApigeeCorporation/Projects/apigee-jsc-debug/sampleProxy/tests/debug) you create scripts as follows:

	context = require("apigee-jsc-debug");

	var config = {	
    	policy: "jsPolicyToDebug",
    	traceFile: "./trace-files/trace.json"
	};

	context.debug(config);

These scripts can be executed within your IDE or from a command prompt as follows: 

	ApigeeCorporation$ node ./debug-foo.js

Advanced features include:
* jshint of the code "bundle" that comprises the callout (includeURL in the policy definition and any resources included via the resourceURL entries)
* diff of MP produced outputs and local produced outputs useful for regression testing changes to ensure they are not breaking existing functionality
* monitors - set two monitor points (one before a function or code block and one after) anywhere in your code (monitor("foo");) and the framework will report time to execute and difference in avail memory (consumed memory roughly)
* inputs - the variables consumed by the callout when executed on the message processor
* outputs - variables written back to context while executing
* accesses - the variables the callout made while executing locally
* errors - the raw error and a translated version of the error - the translated version "unclumps" the includes and resource files so you can better identify where your error


You may also specify that a particular transaction from the trace file be used for the test run. Alternatively you can specify that the test run against all transactions in the trace file. Again useful when doing regression testing.

The onFinish element of the config block gives you the opportunity to call any post execution validation logic you might want. The example below dumps the response.content variable to the console.

When used with node-debug you can instantiate an interactive debugger to walk through your callout, set break points, invoke the debugger conditionally, introspect variables, etc.

An advanced debug configuration script looks like this:

	context = require("debugContext.js");

	var config = {
	    policy: "jsCalculate",
	    traceFile: "./trace-files/trace-1234.xml",
	    traceIndex:"all",
	    //all,monitors,inputs,outputs,accesses,monitors,jshint,errors,diff
	    results: "monitors,outputs,errors,jshint",
	    diff: "all",
	    onFinish: function() {
        	context.echoJson("response.content");
    	}
	};

	context.debug(config);

Output from the script includes a JSON results object of the form:
	
	{
	    "policy": "jsCalculate",
	    "traceIndex": 0,
	    "monitors": {
	        "mpExecutionTime": "55 milliseconds",
	        "jsCalculate": {
	            "time": "126 milliseconds",
	            "memory": "6.92 mb"
	        }
	    },
	    "outputs": {
	        "response.content": "{\"numbers\":\"1,2,4,6\",\"count\":20,\"answers\":[\"(2-1)*4*6\",\"(2-1)*(4*6)\",\"(2-1)*6*4\",\"(2-1)*(6*4)\",\"(2+6)*(4-1)\",\"(4-1)*(2+6)\",\"(4-1)*(6+2)\",\"4*(2-1)*6\",\"4/(2-1)*6\",\"(4*6)*(2-1)\",\"4*6*(2-1)\",\"(4*6)/(2-1)\",\"4*6/(2-1)\",\"6*(2-1)*4\",\"6/(2-1)*4\",\"(6+2)*(4-1)\",\"(6*4)*(2-1)\",\"6*4*(2-1)\",\"(6*4)/(2-1)\",\"6*4/(2-1)\"]}"
	    },
	    "jshint": {
	        "errors": [{
	            "id": "(error)",
	            "evidence": "    var result = eval(candidate);",
	            "line": "../../apiproxy/resources/jsc/jsCalculate.js:54:18",
	            "reason": "eval can be harmful."
	        }]
	    }
	}
	[Finished in 0.6s]

As you can see, this particular callout is doing an eval - typically not a good idea. JSHint makes sure we know that!

## Tests

  none yet

## Samples

You will find sample debug configuration, trace file, and JSC callout in the sampleProxy folder.

## IDE Integration

Our team has successfully integrated this tool with Sublime and Webstorm IDEs - the two most popular options for off-line development of Edge artifacts.

For invoking an interactive debugger from sublime via the build command add the following custom build policy to your configuration:
	
	{
		"cmd": ["node-debug", "--hidden", "", "$file"],
		"selector": "source.js"
	}

For a simpler build use:
	
	{
		"cmd": ["node", "$file"],
		"selector": "source.js"
	}

Both custom build policies can be copied from the sublime folder in this repo to your Packages/User directory in sublime for your use.

Webstorm does not require a custom build, simply invoke the built in node executor for the debug script.

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release
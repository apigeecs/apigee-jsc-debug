debugContext
============

A  library providing utility methods to support the execution and debugging of Apigee Edge JSC callout policies on your local machine.

## Installation

The only prerequisites not handled during the installation are a functional Node environment and the availabilty of npm. 
	
	Clone this repository to your local machine.
	
	cd path/to/apigee-jsc-debug/package/
	sudo npm install . -g

	to install into a project tests/debug directory
	cd ../project/gateway/apiproxy/tests/debug/
	sudo install /path/to/apigee-jsc-debug/package/

	Installation from git coming soon...

## Usage

	context = require("apigee-jsc-debug");

	var config = {	
    	policy: "jsPolicyToDebug",
    	traceFile: "./trace-files/trace.json"
	};

	context.debug(config);

Advanced features inlcude:
* jshint of the code "bundle" that comprises the callout (includeURL in the policy defintion and any resources included via the resourceURL entries)
* diff of MP produced outputs and local produced outputs useful for regression testing changes to ensure they are not breaking existing functionality
* monitors - set a two monitor points anywhere in your code (monitor("foo")) and the framework will report time to execute and difference in avail memory (consumed memory roughly)
* inputs - the variables consumed by the callout when executed on the message processor
* outputs - variables written back to context while executing
* accesses - the variables the callout made while executing locally
* errors - the raw error and a translated version of the error - the translated version "unclumps" the includes and resource files so you can better identify where your error


You may also specify that a particular transaction from the trace file be used for the test run. Alternatively you can specify that the test run against all transactions in the trace file. Again useful when doing regression testing.

The onFinish element of the config block gives you the opportunity to call any post execution validation logic you might want. The example below dumps the response.content variable to the console.

An advanced configuration looks like this:

	context = require("debugContext.js");

	var config = {
	    policy: "jsMediationTest",
	    traceFile: "./trace-files/trace-1234.xml",
	    traceIndex:"all",
	    //all,monitors,inputs,outputs,accesses,monitors,jshint,errors,diff
	    results: "monitors,errors,diff",
	    diff: "all",
	    onFinish: function() {
        	context.echoJson("response.content");
    	}
	};

	context.debug(config);

## Tests

  none yet

## Samples

You will find sample debug configuration, trace file, and JSC Callout in the sampleProxy folder.

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release
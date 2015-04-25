context = require("apigee-jsc-debug");

var config = {
    policy: "jsCalculate",
    traceFile: "./trace-files/trace-1429993197148.xml",
    //all,monitors,inputs,outputs,accesses,monitors
    results: "monitors,outputs,errors,jshint",
    traceIndex: "all",
    onFinish: function() {
        context.echoJson("response.content");
    }
};

context.debug(config);

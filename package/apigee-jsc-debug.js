var variables = {},
    proxyResponse,
    jsdiff,
    results = {},
    monitors = {},
    traceSets = [],
    fs = require('fs'),
    xml2js = require('xml2js');

var setVariable = function(n, v, m) {
    if (n.indexOf("[") > -1 || n.indexOf("]") > -1)
        throw new Error("Context Error: Array notation is not persisted in setVariable");
    if (n === "target.url") {
        var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        if (!regexp.test(v))
            console.log("Context Error: setVariable(target.url) requires a valid URL. Attempt to set: " + v);
    }
    variables[n] = v;

    if (m === "init") {
        if (!results.inputs) results.inputs = {};
        results.inputs[n] = v;
    } else {
        if (!results.outputs) results.outputs = {};
        results.outputs[n] = v;
    }
};

var getVariable = function(n) {
    //if n has dot notation then we need to treat it as json
    if (n.indexOf("[") > -1 || n.indexOf("]") > -1)
        throw new Error("Context Error: Array notation is not retrievable from getVariable");

    var v = variables[n];
    if (v === "false") v = false;
    else if (v === "true") v = true;

    if (!results.accesses) results.accesses = {};
    if (v === undefined) results.accesses[n] = "";
    else results.accesses[n] = v;

    return v;
};

print = function(msg) {
    console.log(msg);
};

var echo = function(n) {
    console.log("\"" + n + "\" = \"" + getVariable(n) + "\"");
};

var echoJson = function(n) {
    if (typeof n === "object") console.log("\n" + JSON.stringify(n));
    else {
        var o = getVariable(n);
        if (!o) console.log(n);
        if (typeof o === "object") console.log("\n" + JSON.stringify(o));
        else console.log("\n" + o);
    }
};

var debugPolicy = function(policyName) {
    var config = {
        policy: policyName,
        //all,monitors,inputs,outputs,accesses,errors
        results: "all"
    };
    return debug(config);
};

var debug = function(config, cb) {
    //callback based path through
    //the process routines pass control to runControl
    if (config.mode === "cacheHit") {
        //we are doing a cacheHit analysis
        //iterate through the trace file and gather all of the request URLs, sequence number
        if (config.debug) print("loading xml tracefile for cache hit");
        processXMLTraceFileCacheHit(config);

    } else {
        if (config.debug) print("loading script code");
        config.code = getScriptCode(config.policy);
        if (config.traceFile) {
            if (!config.traceIndex) config.traceIndex = 0;
            if (config.traceFile.indexOf(".xml") > -1) {
                if (config.debug) print("loading xml tracefile");
                processXMLTraceFile(config);
            } else {
                if (config.debug) print("loading json tracefile");
                processJSONTraceFile(config);
            }
        } else {
            //we can call runControl directly as we don't have a trace file
            runControl(config);
        }
    }
};

var runControl = function(config) {
    //traceSet contains one or more sets of variables for execution
    //if traceSet is empty we execute without presetting any variables
    //presumable the caller has already done so

    //parse out which we want
    //if traceIndex is all then we execute all that exist in the traceSet
    //otherwise we accept a single value
    if (config.traceIndex === "all") {
        //in the execution loop we need to clear the following
        for (var i = 0; i < traceSets.length; i++) {
            monitors = {};
            results = {};
            results.policy = config.policy;
            results.traceIndex = i;
            if (config.debug) print("executing applyTraceSet");
            applyTraceSet(traceSets[i]);
            execute(config);
            if (config.silent !== true) echoJson(results);
        }
    } else if (!config.done) {
        //load variables if we are using a traceFile
        if (config.traceFile) {
            if (config.debug) print("executing applyTraceSet");
            applyTraceSet(traceSets[0]);
        }
        execute(config);
        if (config.silent !== true) echoJson(results);
        config.done = true;
    }
};

var execute = function(config) {
    if (config.debug) print("calling execute");
    monitor(config.policy);
    try {
        if (config.debug) print("executing policy code");
        eval(config.code);
        if (config.debug) print("completed policy code");
    } catch (e) {
        if (!results.errors) results.errors = {};
        results.errors.original = {};
        results.errors.original.message = e.stack;
        results.errors.translated = translateStack(e.stack);
    }
    monitor(config.policy);

    if (config.testFile) {
        if (config.debug) print("executing tests");
        var tests = require(config.testFile);
        results.tests = [];
        //        var ctx = this;
        config.tests.split(",").forEach(function(test) {
            results.tests.push(tests[test](context));
        });
    }

    if (config.results) {
        if (config.results === "all" || config.results.indexOf("jshint") != -1) {
            if (config.debug) print("jshinting");
            var jshint = require('jshint');
            if (!jshint.JSHINT(config.code)) {
                results.jshint = {};
                var errors = jshint.JSHINT.errors;
                results.jshint.errors = [];
                //now walk through each error
                errors.forEach(function(error) {
                    if (error.code !== "W087") {
                        error.line = getFileLineDescription(error.line) + ":" + error.character;
                        delete error.character;
                        delete error.scope;
                        delete error.raw;
                        delete error.code;
                        results.jshint.errors.push(error);
                    }
                });
                if (results.jshint.errors.length === 0) delete results.jshint;
            }
        }

        if (config.diff) _diff(config, results);
    }
    if (config.onFinish) config.onFinish();
    if (config.results) {
        //all,monitors,inputs,outputs,accesses,monitors
        if (config.results != "all") {
            if (config.results.indexOf("monitors") == -1) delete results.monitors;
            if (config.results.indexOf("inputs") == -1) delete results.inputs;
            if (config.results.indexOf("outputs") == -1) delete results.outputs;
            if (config.results.indexOf("errors") == -1) delete results.errors;
            if (config.results.indexOf("accesses") == -1) delete results.accesses;
            if (config.results.indexOf("tests") == -1) delete results.tests;
            if (config.results.indexOf("diff") == -1) delete results.diff;
            if (config.results.indexOf("mpOutputs") == -1) delete results.mpOutputs;
        }
    }
};

var applyTraceSet = function(traceSet) {
    variables = {};
    var key;
    for (key in traceSet.variables)
        setVariable(key, traceSet.variables[key], "init");
    if (!results.mpOutputs) results.mpOutputs = {};
    for (key in traceSet.mpOutputs)
        results.mpOutputs[key] = traceSet.mpOutputs[key];
    if (!results.monitor) results.monitors = {};
    results.monitors.mpExecutionTime = traceSet.mpExecutionTime;
};

var dump = function() {
    echoJson(this);
};

var monitor = function(n) {
    if (!n) n = "default";
    if (monitors[n]) {
        var elapsed = Date.now() - monitors[n].startTime;
        var mem = (process.memoryUsage().heapUsed - monitors[n].startMem);
        var label = " bytes";
        if (mem > 1024) {
            mem = mem / 1024;
            label = " kb";
        }
        if (mem > 1024) {
            mem = mem / 1024;
            label = " mb";
        }
        if (mem > 1024) {
            mem = mem / 1024;
            label = " gb";
        }
        if (!results.monitors) results.monitors = {};
        results.monitors[n] = {
            time: elapsed + " milliseconds",
            memory: mem.toFixed(2) + label
        };
    } else {
        monitors[n] = {
            startTime: Date.now(),
            startMem: process.memoryUsage().heapUsed
        };
    }
};

function _diff(config, results) {
    if (config.debug) print("starting diffing");
    var res;
    for (var key in results.outputs) {
        if (config.diff === "all" || config.diff.indexOf(key) > -1) {
            if (config.debug) print("diffing " + key + " object type " + typeof results.outputs[key] + " with content size " + results.outputs[key].length);
            res = diff(results.outputs[key], results.mpOutputs[key]);
            if (res) {
                var diffNote = "";
                if (res.forEach) {
                    res.forEach(function(part) {
                        // green for additions, red for deletions
                        // grey for common parts
                        var note = part.added ? ">>>added:" :
                            part.removed ? ">>>removed:" : "<<<";
                        if (diffNote === "" && note === "<<<") diffNote += part.value;
                        else diffNote += (note + part.value);
                    });
                } else diffNote = res;
                if (!results.diff) results.diff = {};
                results.diff[key] = diffNote;
            }
        }
    }
    if (config.debug) print("finished diffing");
}

function diff(a, b) {
    //handle different types of things differnetly
    if (a != b) {
        if (typeof a === "number") {
            return {
                error: "numbers do not match " + a + ":" + b
            };
        }
        if (!jsdiff) jsdiff = require('diff');
        return jsdiff.diffWords(a, b);
    }
}

function translateStack(stk) {
    //we need to get the line number out of the stack
    //then translate that into our list of files that were loaded
    //then create an abbreviated stack trace
    //if the line starts with "at eval" we will take it
    //lets start by breaking into lines
    var lines = stk.split("\n"),
        result = {
            line: []
        },
        transLine = "",
        end, start, lineNumber, colEnd, colNumber;

    lines.some(function(line) {
        if (line.indexOf("    at eval ") > -1 || line.indexOf("(eval at <anonymous> ") > -1) {
            if (line.indexOf("(eval at <anonymous> ") > -1) {
                end = line.indexOf("(eval at <anonymous>");
                transLine = line.substr(0, end);
            }
            start = line.indexOf("<anonymous>:") + 12;
            end = line.lastIndexOf(":");
            lineNumber = parseInt(line.substr(start, end - start));
            colEnd = line.lastIndexOf(")") - 1;
            colNumber = line.substr(end + 1, colEnd);
            result.line.push(transLine + "(" + getFileLineDescription(lineNumber) + ":" + colNumber);
        } else result.line.push(line);
    });

    result.message = result.line.join('\n');
    delete result.line;
    return result;
}

function getFileLineDescription(lineNumber) {
    //from the lineNumber figure out which file
    var fpath;
    var lineCount = 0;
    scripts.some(function(script) {
        lineCount += script.numLines;
        if (lineNumber < lineCount) {
            fpath = script.path;
            lineNumber = lineNumber - (lineCount - script.numLines);
            return true;
        }
    });

    return fpath + ":" + lineNumber;
}

function processXMLTraceFile(config) {
    var XmlStream = require('xml-stream'),
        stream = fs.createReadStream(config.traceFile),
        xml = new XmlStream(stream),
        count = 0;

    xml.preserve('Point', true);
    xml.preserve('DebugInfo', true);
    xml.preserve('Properties', true);
    xml.preserve('Property', true);
    xml.collect('Property');
    xml.collect('Get');
    xml.collect('Set');

    xml.on('endElement: Point', function(point) {
        var process = false;
        if (point.$.id === "Execution") {
            if (point.DebugInfo) {
                point.DebugInfo.Properties.Property.some(function(property) {
                    if ((property.$.name === "stepDefinition-name") && property.$text === config.policy) {
                        process = true;
                        return true;
                    }
                });
            }

            if (process) {
                if (config.debug) print("examining " + config.policy + " point at " + count);
                if (count == config.traceIndex || config.traceIndex === "all") {
                    if (config.debug) print("processing " + config.policy + " point at " + count);

                    var traceSet = {
                        variables: {},
                        mpOutputs: {}
                    };
                    if (config.debug) print("examining properties to get mpExecutionTime");
                    point.DebugInfo.Properties.Property.some(function(property) {
                        if (property.$.name === "javascript-executionTime") {
                            traceSet.mpExecutionTime = property.$text + " milliseconds";
                            return true;
                        }
                    });

                    if (point.VariableAccess) {
                        if (config.debug) print("processing variables");
                        if (point.VariableAccess.Get)
                            point.VariableAccess.Get.forEach(function(variable) {
                                traceSet.variables[variable.$.name] = variable.$.value;
                            });
                        if (point.VariableAccess.Set) {
                            point.VariableAccess.Set.forEach(function(variable) {
                                traceSet.mpOutputs[variable.$.name] = variable.$.value;
                            });
                        }
                    }

                    traceSets.push(traceSet);
                    count++;
                    if (count > config.traceIndex) {
                        if (config.debug) print("closing file stream to tracefile");
                        stream.close();
                        //end may not get called when the underlying stream closes
                        runControl(config);
                    }
                } else {
                    if (config.debug) print("skipping " + config.policy + " point at " + count);
                    count++;
                }
            }
        }
    });

    xml.on('end', function() {
        if (config.debug) print("calling runControl from end of parsing, trace file entirely read");
        runControl(config);
    });
}

function processJSONTraceFile(config) {
    var traceString = fs.readFileSync(config.traceFile, 'utf-8');
    var step, trace = eval(traceString);

    //has to be refactored to populate a traceSet array

    trace.some(function(call) {
        if (call.point)
            if (call.point.some(function(entry) {
                if (entry.id === "Execution") {
                    if (entry.results)
                        if (entry.results.some(function(execution) {
                            if (execution.ActionResult && execution.ActionResult === "DebugInfo") {
                                //now we need to check if this one matches our policyName in the property array
                                execution.properties.property.some(function(prop) {
                                    if (prop.name === "stepDefinition-name" && prop.value === config.policy) {
                                        step = entry;
                                        return true;
                                    } else if (!step && prop.name === "javascript-executionTime") {
                                        if (!results.monitors) results.monitors = {};
                                        results.monitors.mpExecutionTime = prop.value + " milliseconds";
                                    }
                                });
                            }
                        })) return true;
                }
            })) return true;
    });

    if (step && step.results) {
        step.results.some(function(result) {
            if (result.ActionResult === "VariableAccess") {
                if (result.accessList) {
                    result.accessList.some(function(access) {
                        if (access.Get) {
                            setVariable(access.Get.name, access.Get.value, "init");
                        } else if (access.Set) {
                            if (!results.mpOutputs) results.mpOutputs = {};
                            results.mpOutputs[access.Set.name] = access.Set.value;
                        }
                    });
                }
                return true;
            }
        });
    }
}

function getScriptCode(policyName) {
    //build the script to execute
    var data, script, code = "",
        includeFiles = [],
        baseDir = require('path').resolve("../../apiproxy/policies/"),
        files = fs.readdirSync(baseDir),
        parser = new xml2js.Parser();

    //initialize scripts - required for regression loops
    scripts = [];
    //extract the resources
    files.some(function(policy) {
        //read the policy file
        if (policy.indexOf(".xml") != -1) {
            data = fs.readFileSync(baseDir + "/" + policy, 'utf8');
            if (parser.parseString(data, function(err, result) {
                if (result.Javascript && result.Javascript.$.name === policyName) {
                    if (result.Javascript.IncludeURL) {
                        result.Javascript.IncludeURL.forEach(function(includeURL) {
                            script = {};
                            script.path = "../../apiproxy/resources/jsc/" + includeURL.substring(6);
                            script.code = fs.readFileSync(script.path, 'utf-8');
                            script.numLines = script.code.split("\n").length - 1;
                            scripts.push(script);
                        });
                    }

                    script = {};
                    script.path = "../../apiproxy/resources/jsc/" + result.Javascript.ResourceURL[0].substring(6);
                    script.code = "debugger;" + fs.readFileSync(script.path, 'utf-8');
                    script.numLines = script.code.split("\n").length - 1;
                    scripts.push(script);

                    scripts.forEach(function(script) {
                        code += script.code;
                    });
                }
            }));
            if (code) return true;
        }
    });
    return code;
}

function processXMLTraceFileCacheHit(config) {
    var XmlStream = require('xml-stream'),
        stream = fs.createReadStream(config.traceFile),
        xml = new XmlStream(stream),
        count = 0;

    xml.preserve('Point', true);
    xml.preserve('DebugInfo', true);
    xml.preserve('Properties', true);
    xml.preserve('Property', true);
    xml.collect('Property');
    xml.collect('Get');
    xml.collect('Set');

    var req = {},
        step = {};

    xml.on('endElement: Point', function(point) {
        if (point.$.id === "StateChange" && point.RequestMessage) {
            //<Property name="From">REQ_START</Property>
            var props = {};
            point.DebugInfo.Properties.Property.forEach(function(property) {
                props[property.$.name] = property.$text;
            });
            if (step.timeStamp) {
                if (!req.responseCache) req.responseCache = [];
                if (step.enforcement === "response" && step.l1Count.length > 1) {
                    step.added = step.l1Count[0] !== step.l1Count[1];
                }
                step.previouslySeen = false;
                if (results.requests) {
                    debugger;
                    //scan previous entries in requests
                    //look at response side
                    //see if we get a cacheKey match
                    //and see if we added that one
                    //if so set step.previouslySeen=true;
                    results.requests.some(function(prevReq) {
                        if (prevReq.responseCache.some(function(prevStep) {
                            if (prevStep.cacheKey === step.cacheKey) {
                                step.previouslySeen = true;
                                step.previouslySeenAt=prevStep.timeStamp;
                                if (prevStep.added)
                                    step.previouslyAdded = true;
                                return true;
                            }
                        })) return true;
                    });
                }
                req.responseCache.push(step);
                step = {};
            }

            if (props.From === "REQ_START") {
                if (!results.requests) results.requests = [];
                if (req.responseCache) results.requests.push(req);
                req = {};
                req.uri = point.RequestMessage.URI.$text;
                req.verb = point.RequestMessage.Verb.$text;
            }
        } else if (point.DebugInfo && point.DebugInfo.Properties && point.DebugInfo.Properties.Property) {
            var props = {};
            props.timeStamp = point.DebugInfo.Timestamp.$text;
            point.DebugInfo.Properties.Property.forEach(function(property) {
                props[property.$.name] = property.$text;
            });

            if (props["responsecache.cacheResponse.cachekey"]) {
                step.cacheKey = props["responsecache.cacheResponse.cachekey"];
                step.cacheHit = props["responsecache.cacheResponse.cachehit"];
            }

            if (props["stepDefinition-type"] === "responsecache" && props.expressionResult === "true") {
                //we want to store this step and these props
                step.expression = props.expression;
                step.expressionResult = props.expressionResult;
                step.enforcement = props.enforcement;
                step.stepDefinitionName = props["stepDefinition-name"];
                step.timeStamp = props.timeStamp;
            }
            if (!req.uri && point.RequestMessage) {
                req.uri = point.RequestMessage.URI.$text;
                req.verb = point.RequestMessage.Verb.$text;
            };
        }
        if (point.VariableAccess && point.VariableAccess.Set) {
            var vars = {};
            point.VariableAccess.Set.forEach(function(varAccess) {
                var key = vars[varAccess.$.name];
                if (vars[varAccess.$.name]) {
                    vars[varAccess.$.name] = [vars[varAccess.$.name]];
                }
                if (vars[varAccess.$.name] && vars[varAccess.$.name].length)
                    vars[varAccess.$.name].push(varAccess.$.value);
                else vars[varAccess.$.name] = varAccess.$.value;
            });
            if (vars["responsecache.cachekey"]) step.cacheKey = vars["responsecache.cachekey"];
            if (vars["responsecache.l1.count"]) step.l1Count = vars["responsecache.l1.count"];
            if (vars["responsecache.l1.count_2"]) step.l1CountAfter = vars["responsecache.l1.count_2"];
        }
    });

    xml.on('end', function() {
        if (!results.requests) results.requests = [];
        results.requests.push(req);
        if (config.silent !== true) echoJson(results);

        //analyzeCacheHit(config);
    });
}

module.exports = {
    setVariable: setVariable,
    getVariable: getVariable,
    echo: echo,
    echoJson: echoJson,
    debug: debug,
    dump: dump,
    monitor: monitor,
    debugPolicy: debugPolicy,
    proxyResponse: proxyResponse,
    print: print,
    diff: diff
};

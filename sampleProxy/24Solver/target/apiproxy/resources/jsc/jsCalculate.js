var nums = permutator(context.getVariable("numArray"));
var ops = combinator(3, ['+', '-', '*', '/']);
var candidates = [];
var answers = [];

//ops need to be expanded out to the permutations
var permutatedOps = [];
ops.forEach(function(op) {
    var addOps = [];
    var candOps = permutator(op);
    candOps.forEach(function(candOp) {
        var add = true;
        if (addOps.length > 0) {
            addOps.some(function(addOp) {
                if (addOp.join('') === candOp.join('')) {
                    add = false;
                    return;
                }
            });
            if (add) addOps.push(candOp);
        } else addOps.push(candOp);
    });
    permutatedOps.push(addOps);
});

//for each set of nums
//apply each of the ops sequences
//until we get a 24

nums.forEach(function(numArray) {
    permutatedOps.forEach(function(oopsArray) {
        oopsArray.forEach(function(opsArray) {
            //case 1: (a+b)*c/d
            //case 2: (a+b)*(c/d)
            //case 3: (a+b*c)/d
            //case 4: a+b*(c/d)
            //case 5: a+(b*c/d)
            //case 6: a+(b*c)/d
            //case 7: a+b*c/d

            candidates.push("(" + numArray[0] + opsArray[0] + numArray[1] + ")" + opsArray[1] + numArray[2] + opsArray[2] + numArray[3]);
            candidates.push("(" + numArray[0] + opsArray[0] + numArray[1] + ")" + opsArray[1] + "(" + numArray[2] + opsArray[2] + numArray[3] + ")");
            candidates.push("(" + numArray[0] + opsArray[0] + numArray[1] + opsArray[1] + numArray[2] + ")" + opsArray[2] + numArray[3]);
            candidates.push(numArray[0] + opsArray[0] + numArray[1] + opsArray[1] + "(" + numArray[2] + opsArray[2] + numArray[3] + ")");
            candidates.push(numArray[0] + opsArray[0] + "(" + numArray[1] + opsArray[1] + numArray[2] + opsArray[2] + numArray[3] + ")");
            candidates.push(numArray[0] + opsArray[0] + "(" + numArray[1] + opsArray[1] + numArray[2] + ")" + opsArray[2] + numArray[3]);
            candidates.push(numArray[0] + opsArray[0] + numArray[1] + opsArray[1] + numArray[2] + opsArray[2] + numArray[3]);
        });
    });
});

candidates.forEach(function(candidate) {
    var result = eval(candidate);
    print(candidate + "=" + result);
    if (result == 24) answers.push(candidate);
});

//summarize
print("Candidate results: " + candidates.length);
print("Possible answers: " + answers.length);

answers.forEach(function(answer) {
    print(answer + "=24");
});

context.setVariable("response.content",JSON.stringify(answers));


function permutator(input) {
    var set = [];
    return permute(input);

    function permute(arr, data) {
        debugger;
        var cur, memo = data || [];
        if (!arr.splice) arr=arr.slice(",");

        for (var i = 0; i < arr.length; i++) {
            cur = arr.splice(i, 1)[0];
            if (arr.length === 0) set.push(memo.concat([cur]));
            permute(arr.slice(), memo.concat([cur]));
            arr.splice(i, 0, cur);
        }
        return set;
    }
}

function uniquePermutator(input) {
    var set = [];
    return permute(input);

    function permute(arr, data) {
        var cur, memo = data || [];

        for (var i = 0; i < arr.length; i++) {
            cur = arr.splice(i, 1)[0];
            if (arr.length === 0) set.push(memo.concat([cur]));
            permute(arr.slice(), memo.concat([cur]));
            arr.splice(i, 0, cur);
        }
        return set;
    }
}

function combinator(n, from) {
    var set = [];
    pick(n, [], 0, from, false, set);
    return set;

    function pick(n, got, pos, from, show, result) {
        var cnt = 0;
        if (got.length == n) {
            if (show) print(got.join(' '));
            result.push(got.join('').split(''));
            return 1;
        }
        for (var i = pos; i < from.length; i++) {
            got.push(from[i]);
            cnt += pick(n, got, i, from, show, result);
            got.pop();
        }
        return cnt;
    }
}

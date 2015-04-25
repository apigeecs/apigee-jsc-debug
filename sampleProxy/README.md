24Solver
========

A very simple no target proxy useful for demonstrating simple javascript callout debugging practices. 24Solver takes 4 numbers as input and returns a list of possible formulas using each and every number to arrive at the result of 24. 

More info about the game can be found here:
http://en.wikipedia.org/wiki/24_Game

## Installation

Their is a zip bundle in the targets directory that can be uploaded to edge. Through the UI console.

As well, you can edit the POM files and use Maven to deploy. More information on using Maven to deploy edge proxies can be found at: 
https://github.com/apigee/apigee-deploy-maven-plugin

Alternatively, you can simply hit the API at http://davidwallen2014-test.apigee.net/24solver?numbers=1,1,24,24 if you want to play with it.

## Tests

  none

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release
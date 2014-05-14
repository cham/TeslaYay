The short Yayapp tutorial
=========================

## app.js
Mostly configuration for the app, runs express etc

## public/
Files used by the front end of the app, a GET of /textfile.txt corresponds to public/textfile.txt
Contains css, images, client side js, and the current title / title history.

## routes/
The HTTP routes that the app responds to, split into separate files and loaded via index.js
Each route has access to the API and calls methods on it, passing query params or the POSTed body, and handles the response.
The response can either be passed on to the HTTP request, or passed to a rendering function in order to display a page.

## src/api.js
A lightweight API that performs calls to the TeslaAPI and returns the response.
TeslaAPI does not perform any validation on the data it is given, therefore any applications that communicate with it *must clean and validate* the data that they send.

## src/renderGenerator.js
Generates rendering functions in order to decorate API responses with a view.
For example, threadsListingHandler takes a /threads response from the API and passes the data to the 'index' template.

## src/stressTester.js
Stress testing for use with nodeload. Set app.get('/stresstarget' to the method you would like to test and run /stresstest in your browser. Remember to set stresstest to true in routes/index.js, and to false again when finished.

## src/xsswrapper.js
Cleans strings with node-validator-sanitizer, but preserves any style attributes.

## views/
Hogan templates used by rendering methods in order to build pages. See renderGenerator for the template values passed, otherwise these are just HTML. Partials are defined in app.js - any templates listed here can be included in your own templates via the > operator e.g.: {{>head}}

## package.json
if you npm install a new module, remember to add it here, or --save it

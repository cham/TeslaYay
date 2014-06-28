var api = require('./api'),
    renderGenerator = require('./renderGenerator'),
    errorDungeon = [
        [5, 1, 1, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 1, 1, 2],
        [4, 1, 1, 1, 0],
        [0, 3, 0, 1, 1]
    ],
    tileDescriptions = [
        'You have somehow found yourself in the void. You found an error in the error reporting page. Well done. I hope you\'re happy now.',
        'You are in a dark forest.',
        'You enter a clearing. There is a small shrine to the Jakes here.',
        'You find a strange box with flashing lights. The box is in a very poor state indeed. It has \'Yayhooray.net\' written on the side.',
        'You find a small cave. This is where matty comes to cry.',
        'You have found the exit! This will have rebooted the server and fixed the error. Just kidding, you\'re still in the forest. A bird flies past and poos on your shoulder.'
    ];

function getTile(x, y){
    if(!errorDungeon[y]){
        return 0;
    }
    if(!errorDungeon[y][x]){
        return 0;
    }
    return errorDungeon[y][x];
}

function isWalkable(x,y){
    return getTile(x, y) !== 0;
}

function getExits(position){
    var exits = [];

    if(isWalkable(position.x, position.y-1)){
        exits.push('North');
    }
    if(getTile(position.x, position.y+1) !== 0){
        exits.push('South');
    }
    if(getTile(position.x-1, position.y) !== 0){
        exits.push('West');
    }
    if(getTile(position.x+1, position.y) !== 0){
        exits.push('East');
    }

    return exits;
}

function getGameStateForPosition(position){
    var exits = getExits(position),
        tileDescription = tileDescriptions[getTile(position.x, position.y)],
        stuck = !isWalkable(position.x, position.y);

    if(!stuck && exits.length){
        tileDescription += ' There are exits ' + exits.join(', ') + '.';
    }

    return {
        exitNorth: !stuck && isWalkable(position.x, position.y-1),
        exitSouth: !stuck && isWalkable(position.x, position.y+1),
        exitWest: !stuck && isWalkable(position.x-1, position.y),
        exitEast: !stuck && isWalkable(position.x+1, position.y),
        tileDescription: tileDescription,
        x: position.x,
        y: position.y
    };
}

function renderError(req, res, next, errorMessage){
    var position = {x:4,y:4},
        gameData;

    if(req.query.x){
        position.x = parseInt(req.query.x, 10);
    }
    if(req.query.y){
        position.y = parseInt(req.query.y, 10);
    }

    gameData = getGameStateForPosition(position);

    api.getTitle(function(err, titlejson){
        if(err){
            errorMessage += ' Title data could not be read!';
        }

        renderGenerator.errorPageHandler(req, res, {
            titledata: titlejson,
            errorMessage: errorMessage,
            gameData: gameData
        }, next);
    });
}

module.exports = function(error, req, res, next){
    if(error.code === 'ECONNREFUSED'){
        return renderError(req, res, next, 'Could not connect to the API!');
    }

    renderError(req, res, next, 'A very mysterious error. Has the following abilities: ' + error.toString());
};

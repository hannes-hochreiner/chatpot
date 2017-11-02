require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, [
    function (session, results) {
        session.privateConversationData = {};
        session.beginDialog('cooking');
      },
      function (session) {
        session.endConversation();
    }
]);

var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

var recipeData = {
  "soup": {
    ingredients: [
      'water',
      'vegetables'
    ],
    steps: [
      'boil water',
      'cut vegetables',
      'add vegetables',
      'cook',
      'serve'
    ]
  },
  "scrambled eggs": {
    ingredients: [
      'eggs',
      'oil',
      'salt'
    ],
    steps: [
      'heat pan',
      'break eggs',
      'stir',
      'serve'
    ]
  }
};

bot.dialog('cooking', [
  function(session) {
    session.send('Hello!');
    session.beginDialog('getRecipeSelection');
  },
  function(session) {
    session.send(`There are ${session.privateConversationData.recipe.steps.length} steps.`);
    builder.Prompts.confirm(session, 'Are you ready to start?');
  },
  function(session, results) {
    if (results.response) {
      session.privateConversationData.currentStep = 0;
      session.beginDialog('steps');
    } else {
      session.endConversation('Maybe later. Bye!');
    }
  },
  function(session) {
    session.endConversation('Bye!');
  }
]).endConversationAction(
  'endCooking', 'Ok. Goodbye.',
  {
    matches: /^cancel$|^bye$/
  }
)

bot.dialog('getRecipeSelection', [
    function (session) {
        builder.Prompts.choice(session, 'What would you like to cook?', recipeData);
    },
    function (session, results) {
        if (results.response) {
            session.privateConversationData.recipe = recipeData[results.response.entity];
            session.send('You will need: %(str)s.', {str: session.privateConversationData.recipe.ingredients.join(', ')});
        } else {
            session.send("OK");
        }
        session.endDialog();
    }
]);

bot.dialog('steps', [
  function (session, args) {
    if (session.privateConversationData.currentStep === 0) {
      builder.Prompts.text(session, `The first step is: ${session.privateConversationData.recipe.steps[session.privateConversationData.currentStep]}`);
    } else if (session.privateConversationData.currentStep === session.privateConversationData.recipe.steps.length - 1) {
      builder.Prompts.text(session, `The last step is: ${session.privateConversationData.recipe.steps[session.privateConversationData.currentStep]}`);
    } else {
      builder.Prompts.text(session, `${session.privateConversationData.recipe.steps[session.privateConversationData.currentStep]}`);
    }
  },
  function(session, args, next) {
    session.privateConversationData.currentStep += 1;

    if (session.privateConversationData.currentStep === session.privateConversationData.recipe.steps.length) {
      session.endDialog();
    } else {
      session.replaceDialog('steps');
    }
  }
]);

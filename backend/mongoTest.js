const askGroq = require("./groqClient");

askGroq("What is the mass of the earth?")
  .then(console.log)
  .catch(console.error);

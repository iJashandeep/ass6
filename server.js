/********************************************************************************
* WEB322 – Assignment 06
* 
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
* 
* https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
* 
* Name: Jashandeep Singh   Student ID: 145936225   Date: 11/08/2024
*
* Published URL: 
*
********************************************************************************/

const authData = require("./modules/auth-service.js");
const clientSessions = require("client-sessions");
const legoData = require("./modules/legoSets");
const path = require("path");
const express = require('express');
const app = express();
require('pg'); // explicitly require the "pg" module

const HTTP_PORT = process.env.PORT || 8080;

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(clientSessions({
  cookieName: "session",
  secret: "fsefwo6LjQ5EVNC28Zg8ScpFQretregfdgbrshrth", 
  duration: 2 * 60 * 1000, // 2 minutes
  activeDuration: 1000 * 60 // 1 minute
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Initialize LEGO data
legoData.initialize()
  .then(() => {
    console.log("LEGO data initialized successfully");
  })
  .catch((err) => {
    console.error("Error initializing LEGO data:", err);
  });

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    console.log("User not logged in, redirecting to /login");
    res.redirect("/login");
  } else {
    next();
  }
}

// Routes

app.get('/', (req, res) => {
  res.render("home")
});

app.get('/about', (req, res) => {
  res.render("about");
});

app.get("/lego/sets", async (req, res) => {
  let sets = [];
  try {    
    if (req.query.theme) {
      sets = await legoData.getSetsByTheme(req.query.theme);
    } else {
      sets = await legoData.getAllSets();
    }
    res.render("sets", { sets });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.get("/lego/sets/:num", async (req, res) => {
  try {
    let set = await legoData.getSetByNum(req.params.num);
    res.render("set", { set });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.get('/lego/addSet', ensureLogin, (req, res) => {
  legoData.getAllThemes()
    .then((themes) => {
      res.render('addSet', { themes: themes });
    })
    .catch((err) => {
      res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
    });
});

app.post('/lego/addSet', ensureLogin, (req, res) => {
  const setData = req.body;
  legoData.addSet(setData)
    .then(() => {
      res.redirect('/lego/sets');
    })
    .catch((err) => {
      res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
    });
});

app.get('/lego/editSet/:num', ensureLogin, async (req, res) => {
  try {
    let setData = await legoData.getSetByNum(req.params.num);
    let themeData = await legoData.getAllThemes();
    res.render("editSet", { "themes": themeData, "set": setData });
  } catch (err) {
    res.status(404).render('404', { message: err });
  }
});

app.post('/lego/editSet', ensureLogin, async (req, res) => {
  try {
    const setNum = req.body.set_num;
    const setData = req.body;
    await legoData.editSet(setNum, setData);
    res.redirect('/lego/sets');
  } catch (err) {
    res.render('500', { message: `I'm sorry, but we have encountered the error: ${err}` });
  }
});

app.get("/lego/deleteSet/:num", ensureLogin, (req, res) => {
  legoData.deleteSet(req.params.num)
    .then(() => {
      res.redirect("/lego/sets");
    })
    .catch((err) => {
      res.render("500", { message: `I'm sorry, but we have encountered the error: ${err}` });
    });
});

app.get("/login", function(req, res) {
  res.render("login", { 
    errorMessage: ""
  });
});

app.get("/register", function(req, res) { 
  res.render('register', { 
    errorMessage: "",
    successMessage: ""
  });
});

app.post("/register", function(req, res) {
  authData.registerUser(req.body)
    .then(() => {
      res.render('register', { successMessage: "User created!" });
    })
    .catch((err) => {
      res.render('register', { errorMessage: err, userName: req.body.userName, successMessage: "" });
    });
});

app.post("/login", function(req, res) {
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body)
    .then(function(user) {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory
      }
      res.redirect('/lego/sets');
    })  
    .catch(function(err) {
      res.render('login', { errorMessage: err, userName: req.body.userName });
    });
});

app.get("/logout", function(req, res) {
  req.session.reset();
  res.redirect('/');
});

app.get("/userHistory", ensureLogin, function (req, res) {
  res.render('userHistory');
}); 

app.use((req, res, next) => {
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for" });
});

/*legoData.initialize()
  .then(authData.initialize)
  .then(function() {
    app.listen(HTTP_PORT, function() {
      console.log(`app listening on: ${HTTP_PORT}`);
    });
  })
  .catch(function(err) {
    console.log(`unable to start server: ${err}`);
  });*/

  legoData.initialize()
  .then(() => {
    console.log("LEGO data initialized successfully");
  })
  .catch((err) => {
    console.error("Error initializing LEGO data:", err);
  });
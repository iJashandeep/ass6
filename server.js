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

// Setting the "views" Application Setting
app.set('views', path.join(__dirname, 'views'));

// Updating your "express.static()" Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Configure client sessions
app.use(clientSessions({
  cookieName: "session",
  secret: process.env.SESSION_SECRET || "fsefwo6LjQ5EVNC28Zg8ScpFQretregfdgbrshrth", // Use environment variable for security
  duration: 2 * 60 * 1000, // 2 minutes
  activeDuration: 1000 * 60 // 1 minute
}));

app.use((req, res, next) => {
  console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
  res.locals.session = req.session;
  next();
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
  console.log("GET / - Rendering home");
  res.render("home");
});

app.get('/about', (req, res) => {
  console.log("GET /about - Rendering about");
  res.render("about");
});

app.get("/lego/sets", async (req, res) => {
  console.log("GET /lego/sets - Fetching LEGO sets");
  let sets = [];
  try {
    if (req.query.theme) {
      sets = await legoData.getSetsByTheme(req.query.theme);
    } else {
      sets = await legoData.getAllSets();
    }
    console.log("Sets fetched successfully");
    res.render("sets", { sets });
  } catch (err) {
    console.error("Error fetching sets:", err);
    res.status(404).render("404", { message: err });
  }
});

app.get("/lego/sets/:num", async (req, res) => {
  console.log(`GET /lego/sets/${req.params.num} - Fetching set details`);
  try {
    let set = await legoData.getSetByNum(req.params.num);
    console.log("Set details fetched successfully");
    res.render("set", { set });
  } catch (err) {
    console.error("Error fetching set details:", err);
    res.status(404).render("404", { message: err });
  }
});

app.get('/lego/addSet', ensureLogin, (req, res) => {
  console.log("GET /lego/addSet - Rendering addSet form");
  legoData.getAllThemes()
      .then((themes) => {
          res.render('addSet', { themes: themes });
      })
      .catch((err) => {
          console.error("Error fetching themes:", err);
          res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
      });
});

app.post('/lego/addSet', ensureLogin, (req, res) => {
  console.log("POST /lego/addSet - Adding new set");
  const setData = req.body;
  legoData.addSet(setData)
      .then(() => {
          res.redirect('/lego/sets');
      })
      .catch((err) => {
          console.error("Error adding set:", err);
          res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
      });
});

app.get('/lego/editSet/:num', ensureLogin, async (req, res) => {
  console.log(`GET /lego/editSet/${req.params.num} - Rendering editSet form`);
  try {
    let setData = await legoData.getSetByNum(req.params.num);
    let themeData = await legoData.getAllThemes();
    res.render("editSet", { "themes": themeData, "set": setData });
  } catch (err) {
    console.error("Error fetching set data for edit:", err);
    res.status(404).render('404', { message: err });
  }
});

app.post('/lego/editSet', ensureLogin, async (req, res) => {
  console.log("POST /lego/editSet - Updating set");
  try {
    const setNum = req.body.set_num;
    const setData = req.body;
    await legoData.editSet(setNum, setData);
    res.redirect('/lego/sets');
  } catch (err) {
    console.error("Error updating set:", err);
    res.render('500', { message: `I'm sorry, but we have encountered the error: ${err}` });
  }
});

app.get("/lego/deleteSet/:num", ensureLogin, (req, res) => {
  console.log(`GET /lego/deleteSet/${req.params.num} - Deleting set`);
  legoData.deleteSet(req.params.num).then(() => {
    res.redirect("/lego/sets");
  })
  .catch((err) => {
    console.error("Error deleting set:", err);
    res.render("500", { message: `I'm sorry, but we have encountered the error: ${err}` });
  });
});

app.get("/login", (req, res) => {
  console.log("GET /login - Rendering login page");
  res.render("login", { 
    errorMessage: ""
  });
});

app.get("/register", (req, res) => { 
  console.log("GET /register - Rendering register page");
  res.render('register', { 
    errorMessage: "",
    successMessage: ""
  });
});

app.post("/register", (req, res) => {
  console.log("POST /register - Registering new user");
  authData.registerUser(req.body)
  .then(() => {
      res.render('register', { successMessage: "User created!" });
  })
  .catch((err) => {
      console.error("Error registering user:", err);
      res.render('register', { errorMessage: err, userName: req.body.userName, successMessage: "" });
  });
});

app.post("/login", (req, res) => {
  console.log("POST /login - Logging in user");
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body)
  .then((user) => {
      req.session.user = {
          userName: user.userName,
          email: user.email,
          loginHistory: user.loginHistory
      };
      res.redirect('/lego/sets');
  })
  .catch((err) => {
      console.error("Error logging in user:", err);
      res.render('login', { errorMessage: err, userName: req.body.userName });
  });
});

app.get("/logout", (req, res) => {
  console.log("GET /logout - Logging out user");
  req.session.reset();
  res.redirect('/');
});

app.get("/userHistory", ensureLogin, (req, res) => {
  console.log("GET /userHistory - Rendering user history");
  res.render('userHistory');
}); 

app.use((req, res, next) => {
  console.log("404 - Page not found");
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for" });
});

// Start server
console.log("Starting server initialization...");
legoData.initialize()
  .then(() => {
    console.log("LEGO data initialized successfully.");
    console.log("Starting authentication data initialization...");
    return authData.initialize();
  })
  .then(() => {
    console.log("Authentication data initialized successfully.");
    console.log("Initialization complete, starting the server...");
    app.listen(HTTP_PORT, () => {
      console.log(`App listening on port ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.error("Initialization error:", err);
  });

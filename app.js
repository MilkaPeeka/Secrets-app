require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require('mongoose-findorcreate');


mongoose.connect("mongodb+srv://Yuval:Test-123@cluster0.dcwwtsq.mongodb.net/secretDB");

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
  }));
  
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema ({
    username: String,
    password: String,
    googleId: String
  });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id}, function (err, user) {
      return done(err, user);
    });
  }
));

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
app.get('/sign_up', (req, res) => {
    res.render('sign-up');
});

app.post('/sign_up', (req, res) => {
    User.register({username: req.body.username}, req.body.password)
    .then((user) => {
        console.log("sign up successful, but user isnt authenticated yet");
        res.redirect('/sign_in');
    })
    .catch(err => {
        console.log(err);
        res.redirect('/sign_up');
    });
});

app.get('/sign_in', (req, res) => {
    res.render('sign-in');
});

app.post('/sign_in', (req, res) => {
    console.log(req.body);
    req.logIn(new User(req.body), () => {
        passport.authenticate("local", (err, user, info) => {
            if (err) {
                console.log(err);
                res.redirect('/sign_in');
            } else {
                if (!user) {
                    console.log("Authentication failed");
                    res.redirect('/sign_in');
                } else {
                    console.log("Authentication successful");
                    res.redirect('/secrets');
                }
            }
        })(req, res);
    });
    });


app.get('/secrets', (req, res) => {
    console.log(req.isAuthenticated());
    if (req.isAuthenticated()) 
        res.render('secrets');
    else 
        res.redirect('/sign_in');
});

app.get('/sign_out', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.log(err);
      }
      res.redirect('/secrets');
    });
  });



app.get("/auth/google",
passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/sign_in" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });


app.listen('3000', () => console.log('listening on 3000'));
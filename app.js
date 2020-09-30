require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const ejs = require("ejs");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";


const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: 'Oue little secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-blog-v1:1234@cluster0-oavgc.mongodb.net/blogDB", {useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const postSchema = new mongoose.Schema({
  name: String,
  title: String,
  content: String,
  photo: String
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  googleId: String,
  photo: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Post = mongoose.model("Post", postSchema);
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: "1084205183841-v91m8jkk4dg9ga0ginf1pud5irbchta1.apps.googleusercontent.com",
    clientSecret: "k7RdqeRJ2BOfvzosT_gaYq7q",
    callbackURL: "https://daily-journalblog.herokuapp.com/auth/google/compose",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, name: profile.displayName, photo: profile.photos[0].value }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/compose",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/compose");
  });



app.get("/",function(req,res){

  if(req.isAuthenticated()){
  Post.find({}, function(err, posts){
    res.render("homeout", {
     startingContent: homeStartingContent,
     posts: posts
     });
 })
}else{
  Post.find({}, function(err, posts){
    res.render("home", {
     startingContent: homeStartingContent,
     posts: posts
     });
 })
}

});

app.get("/about",function(req,res){
    if(req.isAuthenticated()){
  res.render("aboutout",{about:aboutContent});
}else{
  res.render("about",{about:aboutContent});
}
});

app.get("/contact",function(req,res){
  if(req.isAuthenticated()){
  res.render("contactout");
}else{
  res.render("contact");
}
});

app.get("/compose",function(req,res){
  if(req.isAuthenticated()){
  res.render("composeout");
  }else{
  res.redirect("/login");
  }
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.post("/compose", function(req,res){
  var name1 = "";

  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        name1 = foundUser.name;
        const post = new Post ({
          title: req.body.postTitle,
          content: req.body.postBody,
          name: name1,
          photo: foundUser.photo
        });
        post.save(function(err){
        if (!err){

          res.redirect("/");
        }
      });
      }
    }
  });


});






app.get("/posts/:postId", function(req,res){
    const requestedPostId = req.params.postId;

    Post.findOne({_id: requestedPostId}, function(err,post){
      res.render("post",{postsTitle:post.title,postsBody:post.content});
    });

});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});


app.post("/register", function(req,res){
  User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else {
      passport.authenticate("local")(req, res, function(){
        const displayName = req.body.displayname;

        User.findById(req.user.id, function(err, foundUser){
          if(err){
            console.log(err);
          }else{
            if(foundUser){
              foundUser.name = displayName;
              foundUser.save(function(){
                console.log("sucess");
              });
            }
          }
        });


        res.redirect("/compose");
      });
    }
  });

});

app.post("/login", function(req,res){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(user, function(err){
      if(err){
        console.log(err);
        res.redirect("/login");
      }else{
        passport.authenticate("local", {successRedirect: "/compose", failureRedirect: "/login",failureFlash: true})(req, res, function(){
          res.redirect("/compose");
        });
      }
    });
});





app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});

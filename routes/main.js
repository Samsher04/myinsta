var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const passport = require('passport');
const localStrategy = require("passport-local") 
const upload = require("./multer")


passport.use(new localStrategy(userModel.authenticate()))

router.get('/', function(req, res) {
  res.render('index', {footer: false});
});

router.get('/login', function(req, res) {
  res.render('login', {footer: false});
});

router.get('/feed', async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const posts = await postModel.find().populate("user")
  if (req.isAuthenticated()){
    res.render('feed', { footer: true,posts,user });
  } else {
    res.redirect('/login');
  }
});


router.get('/profile',async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user}).populate("posts")
  if (req.isAuthenticated()){
    res.render('profile', {footer: true,user});
  }
  else{
    res.redirect('/login');
  }
});

router.get('/search', function(req, res) {
  if (req.isAuthenticated()){
    res.render('search', {footer: true});
  }
  else{
    res.redirect('/login');
  }
});

router.get('/username/:username', async function(req, res) {
  if (req.isAuthenticated()){
    const regex = new  RegExp(`^${req.params.username}`, "i")
    const users = await userModel.find({username: regex})
    res.json(users)
  }
  else{
    res.redirect('/login');
  }
});

router.get('/edit', async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user})
  if (req.isAuthenticated()){
    res.render('edit', {footer: true , user});
  }
  else{
    res.redirect('/login');
  }
});

router.get('/upload', function(req, res) {
  if (req.isAuthenticated()){
    res.render('upload', {footer: true});
  }
  else{
    res.redirect('/login');
  }
});

router.get('/like/post/:id', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.findOne({_id: req.params.id});

  // Check if the user has not liked the post
  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
  } else {
    // If the user has already liked the post, remove the like
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }

  await post.save();
  res.redirect("/feed");
});




router.post("/register",function(req,res){
  userData = new userModel({
    username:req.body.username,
    name:req.body.name,
    email:req.body.email,
  })
  userModel.register(userData,req.body.password)
  .then(function(){
    passport.authenticate("local")(req, res, function(){
      res.redirect("/profile")
    })
  })
})


router.post('/login', passport.authenticate("local",{
  successRedirect:"/profile",
  failureRedirect:"/login"
}), function(req, res) {
});

router.post("/update", isLoggedIn,  upload.single("image"), async function(req, res) {
  try {
    const user = await userModel.findOneAndUpdate(
      { username: req.session.passport.user },
      { username: req.body.username, name: req.body.name, bio: req.body.bio },
      { new: true }
    );

    if (req.file) {
      user.profileImage = req.file.filename;
      await user.save();
    }

    res.redirect("/profile");
  } catch (error) {
    // Handle error, e.g., log it or send an error response
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    const post = await postModel.create({
      caption: req.body.caption,
      picture: req.file.filename,
      user: user._id
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/feed");
  } catch (error) {
    // Handle error, e.g., log it or send an error response
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get('/logout', function(req, res) {
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    // User is authenticated, proceed to the next middleware
    return next();
  } else {
    // User is not authenticated, redirect to the login route
    res.redirect('/login');
  }
}

module.exports = router;

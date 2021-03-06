// TALK / server.js
// By Daniel R. (sadasant.com)
// License: http://opensource.org/licenses/mit-license.php

var express = require('express')
  , Markdown = require('node-markdown').Markdown
  , talk = module.exports = express.createServer()
  , TODAY = (new Date()).getDay()
  , CHATS = {}
  , COUNT = { chats: 0, users: 0 }
  , FORBIDDEN = ['new','join']

// Reset Main Variables
function reset(req, res, next) {
  if ((new Date()).getDay() !== TODAY) {
    TODAY = (new Date()).getDay()
    CHATS = {}
    COUNT = { chats: 0, users: 0 }
  }
  return next()
}

// conf
talk.configure(function() {
  talk.set('views', __dirname + '/views')
  talk.set('view engine', 'jade')
  talk.use(express.bodyParser())
  talk.use(express.methodOverride())
  talk.use(require('stylus').middleware({ src: __dirname + '/public' }))
  talk.use(express.cookieParser())
  talk.use(express.session({ secret : "1337" }))
  talk.use(talk.router)
  talk.use(express.static(__dirname + '/public'))
  //talk.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
  talk.use(express.errorHandler())
})

// Index
talk.get('/', reset, function(req, res) {
  if (!req.session.user) {
    var date = new Date()
    req.session.user = {
      chats : []
    , id : COUNT.users
    , name : "User_"+COUNT.users++
    , date : date
    }
  }
  res.render('index')
})

// New Chat
talk.post('/new', function(req, res) {
  var name = req.body.name
    , pass = req.body.password
    , user_name = req.body.user_name
    , user = req.session.user
  // Must be in
  if (!user || ~FORBIDDEN.indexOf(name)) {
    return res.render('error', { ERROR: 'FORBIDDEN' })
  } else
  // This chat exists
  if (CHATS[name]) {
    return res.render('error', { ERROR: ':/ I have a chat with that name...' })
  }
  // Invalid characters
  if (~name.indexOf('/')) {
    return res.render('error', { ERROR: 'Invalid characters in the chat name!!!' })
  }
  // Chat Scheme
  var chat = {
    id : COUNT.chats++
  , name : name
  , pass : pass
  , users : [user.id]
  , posts : []
  , date : new Date()
  }
  CHATS[name] = chat
  if (user_name) user.name = user_name
  user.chats.push(chat.id)
  res.redirect("/"+name)
})

// Join Chat
talk.post('/join', reset, function(req, res) {
  var name = req.body.name
    , pass = req.body.password
    , user_name = req.body.user_name
    , user = req.session.user
    , chat = CHATS[name]
  if (!(user && chat)) {
    return res.render('error', { ERROR: 'FORBIDDEN' })
  } else
  if (~user.chats.indexOf(chat.id)) {
    return res.redirect("/"+name)
  } else
  if (chat.pass === pass) {
    user.chats.push(chat.id)
    if (user_name) user.name = user_name
    chat.users.push(user.id)
    res.redirect("/"+name)
  } else {
    return res.render('error', { ERROR: 'FORBIDDEN' })
  }
})

// Show Chat
talk.get('/:name', function(req, res) {
  var chat = CHATS[req.params.name]
    , user = req.session.user
  if (chat) {
    if (user && ~chat.users.indexOf(user.id) && ~user.chats.indexOf(chat.id)) {
      return res.render('chat', { title : 'talk '+chat.name, chat : chat, user : user })
    } else {
      if (!user) {
        var date = new Date()
        req.session.user = {
          chats : []
        , id : COUNT.users
        , name : "User_"+COUNT.users++
        , date : date
        }
      }
      return res.render('join', { chat : chat })
    }
  } else {
    return res.render('error', { ERROR: 'NOT FOUND' })
  }
})

// New Post
talk.post('/:name/post', reset, function(req, res) {
  var chat = CHATS[req.params.name]
    , user = req.session.user
    , new_post = req.body.post
    , date = req.body.date
  if (chat && user && ~chat.users.indexOf(user.id) && ~user.chats.indexOf(chat.id) && new_post) {
    // Limit posts lenght
    if (new_post.length > 512) {
      return res.send({ error: 'too long'})
    }
    // Post Schema
    var post = {
      date : new Date(date)
    , post : Markdown(new_post.replace(/</g,'&#60;')).replace(/&amp;#60;/g,'&#60;')
    , user : user
    , pos  : chat.posts.length
    }
    // Pushing new post
    chat.posts.push(post)
    // removing too old posts
    var removable = chat.posts.length - 6
    if (removable > 0) delete chat.posts[removable-1]
    res.send('ok')
  } else {
    return res.render('error', { ERROR: 'FORBIDDEN' })
  }
})

// Load Posts
talk.post('/:name/load', function(req, res) {
  var chat = CHATS[req.params.name]
    , user = req.session.user
    , last = req.body.last
    , I    = req.body.I == "true"
  if (chat && user && ~chat.users.indexOf(user.id) && ~user.chats.indexOf(chat.id)) {
    slicePosts()
    function slicePosts() {
      if (last == 0 && chat.posts.length > 5) {
        last += chat.posts.length - 5
      }
      var posts = chat.posts.slice(last)
      if (posts.length || !I) {
        return res.send(posts)
      } else {
        setTimeout(slicePosts, 1000)
      }
    }
  } else {
    return res.render('error', { ERROR: 'FORBIDDEN' })
  }
})

// Remove Chat
talk.get('/:name/remo', function(req, res) {
  var chat = CHATS[req.params.name]
    , user = req.session.user
  if (chat && user && ~chat.users.indexOf(user.id) && ~user.chats.indexOf(chat.id)) {
    delete CHATS[req.params.name]
    delete user.chats[user.chats.indexOf(chat.id)]
    user.chats.filter(function(e) { return e })
    return res.send('ok')
  } else {
    return res.render('error', { ERROR: 'FORBIDDEN' })
  }
})

// 404
talk.error(function(req, res) {
  return res.render('error', { ERROR: 'FORBIDDEN' })
})

talk.listen(14774);

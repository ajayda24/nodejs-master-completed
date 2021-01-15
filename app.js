const path = require('path')
const fs = require('fs')

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session)
const flash = require('connect-flash')
require('dotenv').config()

const errorController = require('./controllers/error')
const indexController = require('./controllers/index')
const Tutor = require('./models/tutor')
const Student = require('./models/student')


// const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.l53kc.mongodb.net/${process.env.MONGO_DATABASE}classroomDB`

const MONGODB_URI = process.env.DATABASE_URL

const app = express()
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',
})

app.set('view engine', 'ejs')
app.set('views', 'views')

const studentRoutes = require('./routes/student')
const tutorRoutes = require('./routes/tutor')

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store,
  })
)

app.use(flash())

app.use(bodyParser.urlencoded({ extended: false }))
// app.use(multer({ storage: fileStorage }).single('files'))

app.use(express.static(path.join(__dirname, 'public')))
app.use('/tutorFiles', express.static(path.join(__dirname, 'tutorFiles')))
app.use('/studentFiles', express.static(path.join(__dirname, 'studentFiles')))

const studentController = require('./controllers/student')
const tutorController = require('./controllers/tutor')

app.use((req, res, next) => {
  if (!req.session.tutor) {
    return next()
  }

  Tutor.findById(req.session.tutor._id)
    .then((tutor) => {
      req.tutor = tutor
      next()
    })
    .catch((err) => {
      next(new Error(err))
    })
})

app.use((req, res, next) => {
  if (!req.session.student) {
    return next()
  }
  Student.findById(req.session.student._id)
    .then((student) => {
      req.student = student
      next()
    })
    .catch((err) => {
      next(new Error(err))
    })
})

// app.use('/admin', adminRoutes);

app.use('/studentPaytmCallback', studentController.postEventPaymentPaytmVerify)
app.use('/tutorPaytmCallback', tutorController.postEventPaymentPaytmVerify)

// app.get('/chat/video/:videoId', tutorController.getVideoChat)
// app.get('/chat/video/:videoId', studentController.getVideoChat)

// app.get('/chat/video', function (req, res, next) {
//   if(req.session.isStudentLoggedIn){
//     res.redirect('/chat/video/:videoId')
//   } else if (req.session.isTutorLoggedIn){

//   }
// })

app.use('/tutor', tutorRoutes)
app.use('/student', studentRoutes)
app.get('/', indexController.getIndex)

app.get('/500', errorController.get500)

app.use(errorController.get404)

app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn,
  })
})

let port = process.env.PORT
if (port == null || port == '') {
  port = 3000
}

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then((result) => {
    const server = app.listen(port, function () {
      console.log('Server started at port 3000')
    })
    const io = require('./socket').init(server)
    let clients = 0

    io.on('connection', (socket) => {
      console.log('Client Connected')

      socket.on('NewClient', function () {
        if (clients < 2) {
          if (clients == 1) {
            this.emit('CreatePeer')
          }
        } else {
          this.emit('SessionActive')
        }
        clients++
      })
      socket.on('Offer', SendOffer)
      socket.on('Answer', SendAnswer)
      socket.on('disconnect', Disconnect)
    })

    function Disconnect() {
      if (clients > 0) {
        if (clients <= 2) this.broadcast.emit('Disconnect')
        clients--
      }
    }

    function SendOffer(offer) {
      this.broadcast.emit('BackOffer', offer)
    }

    function SendAnswer(data) {
      this.broadcast.emit('BackAnswer', data)
    }
  })
  .catch((err) => {
    console.log(err)
  })
